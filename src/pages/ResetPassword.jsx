import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase, isConfigured, updateOwnPassword } from '../lib/supabase.js'

/**
 * Opened from the "Reset password" email link (/reset-password#access_token=...&type=recovery).
 * supabase-js reads the token from the URL and creates a temporary recovery session,
 * which lets the user choose a new password.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady]       = useState(false)   // recovery session found
  const [checking, setChecking] = useState(true)
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  useEffect(() => {
    if (!isConfigured) {
      setLinkError('Password reset links need the live database connection.')
      setChecking(false)
      return
    }

    // The link itself can carry an error (expired / already used)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const urlError = hashParams.get('error_description') || new URLSearchParams(window.location.search).get('error_description')
    if (urlError) {
      setLinkError(urlError.replace(/\+/g, ' '))
      setChecking(false)
      return
    }

    let cancelled = false
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
        setReady(true)
        setChecking(false)
      }
    })

    // Session may already have been created before this component mounted
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      if (data?.session) setReady(true)
      setChecking(false)
    }).catch(() => !cancelled && setChecking(false))

    return () => {
      cancelled = true
      sub?.subscription?.unsubscribe()
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setSaving(true)
    try {
      await updateOwnPassword(password)
      setDone(true)
      // End the recovery session so they sign in fresh with the new password
      await supabase.auth.signOut().catch(() => {})
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      const msg = err?.message || 'Could not update password.'
      setError(/same as the old|different from the old/i.test(msg) ? 'Please choose a password you have not used before.' : msg)
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', height: 48, borderRadius: 12,
    border: '1px solid #e2e8f0', background: '#fff', color: '#0f172a',
    padding: '12px 42px 12px 14px', fontSize: 14, outline: 'none'
  }

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: '#1b3d36', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: '2rem', boxSizing: 'border-box',
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif'
    }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#000', borderRadius: 28, padding: '2.25rem 2.25rem 2rem', color: '#fff', boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: '1.75rem', fontFamily: 'Outfit, sans-serif' }}>AM2PM's Mr.Manager</div>

        {checking && <p style={{ color: '#94a3b8', fontSize: 14 }}>Verifying your reset link…</p>}

        {!checking && done && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <CheckCircle2 size={44} color="#3cb27f" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Password updated</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Redirecting you to sign in…</p>
          </div>
        )}

        {!checking && !done && !ready && (
          <div>
            <AlertCircle size={36} color="#f59e0b" style={{ marginBottom: 12 }} />
            <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px' }}>Reset link not valid</h2>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5, margin: '0 0 20px' }}>
              {linkError || 'This reset link is invalid or has expired.'} Request a new one from the sign-in page, or ask your administrator to reset your password.
            </p>
            <button onClick={() => navigate('/login', { replace: true })}
              style={{ background: '#3cb27f', color: '#fff', border: 'none', borderRadius: 12, height: 46, width: '100%', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
              Back to sign in
            </button>
          </div>
        )}

        {!checking && !done && ready && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 20, fontWeight: 500, color: '#e2e8f0', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={18} color="#3cb27f" /> Choose a new password
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '0 0 1.5rem' }}>Use at least 6 characters.</p>

            <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>New password</label>
            <div style={{ position: 'relative', marginBottom: '1.1rem' }}>
              <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                style={inputStyle} autoFocus required minLength={6} autoComplete="new-password" />
              <button type="button" onClick={() => setShowPass(s => !s)} aria-label={showPass ? 'Hide password' : 'Show password'}
                style={{ position: 'absolute', right: 12, top: 14, background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <label style={{ display: 'block', fontSize: 13, color: '#cbd5e1', marginBottom: 8 }}>Confirm password</label>
            <input type={showPass ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)}
              style={{ ...inputStyle, marginBottom: '1.1rem' }} required minLength={6} autoComplete="new-password" />

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={saving}
              style={{ background: '#3cb27f', color: '#fff', border: 'none', borderRadius: 12, height: 48, width: '100%', fontWeight: 600, fontSize: 15, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

