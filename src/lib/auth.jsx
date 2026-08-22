import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, signIn, signOut, getProfile, isConfigured, signUp, updateProfile } from './supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

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
      await signIn(email, password)
      // onAuthStateChange will update state
    } catch (e) {
      setError(e.message || 'Invalid email or password')
    }
  }

  async function logout() {
    try {
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
    } catch (e) {
      setError(e.message || 'Registration failed')
      throw e
    }
  }

  // Combined user object for easy access
  const currentUser = profile ? {
    ...profile,
    email: user?.email,
    supabaseId: user?.id
  } : null

  return (
    <AuthContext.Provider value={{ user: currentUser, loading, error, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
