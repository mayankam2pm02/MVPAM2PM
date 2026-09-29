import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  supabase, signIn, signOut, getProfile, isConfigured, signUp, updateProfile,
  fetchCompanies, createCompany, updateCompanyStatus
} from './supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Multi-Tenancy & Company Switcher State
  const [companies, setCompanies] = useState([])
  const [impersonatedCompany, setImpersonatedCompany] = useState(() => {
    try {
      const stored = localStorage.getItem('impersonated_company')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const loadCompanies = useCallback(async () => {
    try {
      const list = await fetchCompanies()
      setCompanies(list || [])
    } catch (e) {
      console.warn('Failed to load companies:', e)
    }
  }, [])

  useEffect(() => {
    loadCompanies()
  }, [loadCompanies])

  useEffect(() => {
    // Get initial session
    const fetchSession = async () => {
      try {
        let session = null
        if (!isConfigured) {
          const stored = localStorage.getItem('mock_user')
          if (stored) {
            const mockUser = JSON.parse(stored)
            session = { user: { id: mockUser.id, email: mockUser.email } }
          }
        } else {
          const res = await supabase.auth.getSession()
          session = res?.data?.session
        }

        if (session?.user) {
          setUser(session.user)
          loadProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (err) {
        console.warn('Failed to get initial session:', err)
        setLoading(false)
      }
    }

    fetchSession()

    // Listen for auth changes
    let subscription
    if (isConfigured) {
      try {
        const res = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser(session.user)
            loadProfile(session.user.id)
          } else {
            setUser(null)
            setProfile(null)
            setLoading(false)
          }
        })
        subscription = res?.data?.subscription
      } catch (err) {
        console.warn('Failed to subscribe to auth state changes:', err)
      }
    } else {
      const handleStorageChange = () => {
        const stored = localStorage.getItem('mock_user')
        if (stored) {
          const mockUser = JSON.parse(stored)
          setUser({ id: mockUser.id, email: mockUser.email })
          setProfile(mockUser)
          setLoading(false)
        } else {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
      window.addEventListener('storage', handleStorageChange)
      window.addEventListener('mock-auth-change', handleStorageChange)
      
      // Trigger initial checks
      handleStorageChange()

      return () => {
        window.removeEventListener('storage', handleStorageChange)
        window.removeEventListener('mock-auth-change', handleStorageChange)
      }
    }

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    try {
      const p = await getProfile(userId)
      if (p?.role !== 'superadmin' && p?.company_id) {
        const companiesList = await fetchCompanies()
        const userComp = companiesList.find(c => c.id === p.company_id)
        if (userComp && (userComp.status === 'locked' || userComp.status === 'suspended')) {
          setError(`Access Denied: The workspace for "${userComp.name}" has been locked by the Super Administrator.`)
          await signOut()
          setUser(null)
          setProfile(null)
          return
        }
      }
      setProfile(p)
    } catch (e) {
      console.error('Failed to load profile:', e)
    } finally {
      setLoading(false)
    }
  }

  async function login(email, password) {
    setError('')
    try {
      const data = await signIn(email, password)
      await loadCompanies()
      return data
    } catch (e) {
      const msg = e.message || 'Invalid email or password'
      if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Email not confirmed. Please click the confirmation link sent to your email, or run the SQL in supabase/fix_auth_trigger.sql to auto-confirm.')
      } else {
        setError(msg)
      }
      throw e
    }
  }

  async function logout() {
    try {
      localStorage.removeItem('impersonated_company')
      setImpersonatedCompany(null)
      await signOut()
    } catch (e) {
      console.error('Logout error:', e)
    }
  }

  async function register(email, password, name, role, title) {
    setError('')
    try {
      const data = await signUp(email, password, { name, role, title })
      const uId = data?.user?.id
      if (uId) {
        try {
          await updateProfile(uId, { title })
        } catch (e) {
          console.warn('Failed to set profile title during signup:', e)
        }
      }
      return data
    } catch (e) {
      const msg = e.message || 'Registration failed'
      if (msg.toLowerCase().includes('database error saving new user')) {
        setError('Database error saving new user: The Supabase profiles table is missing the permissions column. Run the SQL script in supabase/fix_auth_trigger.sql in your Supabase SQL Editor.')
      } else {
        setError(msg)
      }
      throw e
    }
  }

  // Company switching functions
  const switchCompany = useCallback((company) => {
    if (!company) {
      localStorage.removeItem('impersonated_company')
      setImpersonatedCompany(null)
    } else {
      localStorage.setItem('impersonated_company', JSON.stringify(company))
      setImpersonatedCompany(company)
    }
    window.dispatchEvent(new Event('company-switched'))
  }, [])

  const exitCompanyView = useCallback(() => {
    localStorage.removeItem('impersonated_company')
    setImpersonatedCompany(null)
    window.dispatchEvent(new Event('company-switched'))
  }, [])

  const addCompany = useCallback(async (companyData) => {
    const created = await createCompany(companyData)
    await loadCompanies()
    return created
  }, [loadCompanies])

  const toggleCompanyLock = useCallback(async (companyId, newStatus) => {
    await updateCompanyStatus(companyId, newStatus)
    await loadCompanies()
  }, [loadCompanies])

  // Base user
  const emailLower = (profile?.email || user?.email || '').toLowerCase()
  const isSuperAdminEmail = emailLower === 'mayank@am2pmsupport.com'
  const baseRole = isSuperAdminEmail ? 'superadmin' : (profile?.role || user?.user_metadata?.role || 'employee')

  const baseUser = (user || profile) ? {
    ...(profile || {}),
    id: profile?.id || user?.id,
    name: profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User',
    email: profile?.email || user?.email,
    role: baseRole,
    title: baseRole === 'superadmin' ? 'Super Administrator' : (profile?.title || user?.user_metadata?.title || 'Team Member'),
    company_id: profile?.company_id || user?.user_metadata?.company_id || null,
    company_name: profile?.company_name || null,
    supabaseId: user?.id
  } : null

  const isSuperAdmin = baseUser?.role === 'superadmin'
  const isImpersonating = isSuperAdmin && !!impersonatedCompany

  // Effective user: if superadmin is viewing as a client company, adjust role & company_id
  const effectiveUser = baseUser ? {
    ...baseUser,
    role: isImpersonating ? 'admin' : baseUser.role,
    title: isImpersonating ? `Client Admin (${impersonatedCompany.name})` : baseUser.title,
    company_id: isImpersonating ? impersonatedCompany.id : baseUser.company_id,
    company_name: isImpersonating ? impersonatedCompany.name : baseUser.company_name,
    isImpersonating,
    impersonatedCompany: isImpersonating ? impersonatedCompany : null,
    realRole: baseUser.role
  } : null

  return (
    <AuthContext.Provider value={{
      user: effectiveUser,
      realUser: baseUser,
      isSuperAdmin,
      isImpersonating,
      impersonatedCompany,
      companies,
      switchCompany,
      exitCompanyView,
      addCompany,
      toggleCompanyLock,
      refreshCompanies: loadCompanies,
      loading,
      error,
      setError,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
