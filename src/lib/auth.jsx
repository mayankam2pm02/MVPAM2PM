import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, signIn, signOut, getProfile } from './supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user)
        loadProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
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

  // Combined user object for easy access
  const currentUser = profile ? {
    ...profile,
    email: user?.email,
    supabaseId: user?.id
  } : null

  return (
    <AuthContext.Provider value={{ user: currentUser, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
