import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchApplicationByToken, updateApplication } from '../lib/supabase.js'

export default function ConsentPage() {
  const [params] = useSearchParams()
  const token  = params.get('token')
  const action = params.get('action')

  const [status, setStatus] = useState('loading') // loading | success | error | already_done
  const [app,    setApp]    = useState(null)

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    handleConsent()
  }, [token, action])

  async function handleConsent() {
    try {
      const application = await fetchApplicationByToken(token)
      setApp(application)

      if (application.consent_status !== 'pending' && application.consent_status !== 'not_sent') {
        setStatus('already_done')
        return
      }

      const consentStatus = action === 'accept' ? 'accepted' : 'declined'
      const appStatus     = action === 'accept' ? 'consent_accepted' : 'consent_declined'

      await updateApplication(application.id, {
        consent_status: consentStatus,
        status: appStatus
      })

      setStatus(action === 'accept' ? 'accepted' : 'declined')
    } catch (e) {
      console.error('Consent error:', e)
      setStatus('error')
    }
  }

  const cardStyle = {
    maxWidth: 480,
    margin: '80px auto',
    padding: '3rem 2rem',
    background: '#fff',
    borderRadius: 16,
    textAlign: 'center',
    border: '1px solid #E4E7EF',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)'
  }

  if (status === 'loading') return (
    <div style={cardStyle}>
      <div className="spinner" style={{ margin: '0 auto 1rem', width: 28, height: 28 }} />
      <p style={{ color: 'var(--text-3)' }}>Processing your response…</p>
    </div>
  )

  if (status === 'accepted') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>🎉</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>Great, we'll be in touch!</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        Thank you for your interest in the <strong>{app?.jobs?.title}</strong> role. 
        Our hiring team will contact you shortly to schedule an interview.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You can close this window.</p>
    </div>
  )

  if (status === 'declined') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>👍</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>No problem at all</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        We appreciate your response. We'll keep your profile on file for future opportunities that might be a better fit.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You can close this window.</p>
    </div>
  )

  if (status === 'already_done') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>ℹ️</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>Already responded</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
        Your response ({app?.consent_status}) has already been recorded. No action needed.
      </p>
    </div>
  )

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>⚠️</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>Link not valid</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
        This consent link is invalid or has expired. Please contact the hiring team directly.
      </p>
    </div>
  )
}
