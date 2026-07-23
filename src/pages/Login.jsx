import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { LogIn, Eye, EyeOff } from 'lucide-react'

const DEMO_USERS = [
  { label: 'Admin (CEO)',  email: 'priya@acme.com',  password: 'admin123' },
  { label: 'HR Manager',  email: 'rahul@acme.com',  password: 'hr123456' },
  { label: 'Manager',     email: 'anita@acme.com',  password: 'mgr12345' },
  { label: 'Interviewer', email: 'karan@acme.com',  password: 'int12345' },
]

export default function Login() {
  const { login, error } = useAuth()
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await login(email, password)
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-2)',
      padding: '2rem'
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52, height: 52,
            background: 'var(--brand)',
            borderRadius: 14,
            marginBottom: '1rem'
          }}>
            <span style={{ color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22 }}>T</span>
          </div>
          <h1 style={{ fontSize: 26, marginBottom: 6 }}>Mr. Manager</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 14 }}>Sign in to your workspace</p>
        </div>

        {/* Form */}
        <div className="card" style={{ padding: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoFocus
              />
            </div>
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Password</label>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: 10, top: 32, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: 4 }}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
              {loading ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Signing in…</> : <><LogIn size={16} /> Sign in</>}
            </button>
          </form>
        </div>

        {/* Demo accounts */}
        <div className="card" style={{ marginTop: 12, padding: '1.25rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Demo accounts
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {DEMO_USERS.map(u => (
              <button
                key={u.email}
                className="btn btn-secondary btn-sm"
                onClick={() => { setEmail(u.email); setPassword(u.password) }}
                style={{ fontSize: 11, justifyContent: 'flex-start' }}
              >
                {u.label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10, textAlign: 'center' }}>
            ℹ️ Create these users in Supabase Auth first — see README
          </p>
        </div>
      </div>
    </div>
  )
}
