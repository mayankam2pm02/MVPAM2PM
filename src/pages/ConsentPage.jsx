import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchApplicationByToken, updateApplication, createConsentAuditLog } from '../lib/supabase.js'

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

      // IP detection via standard lightweight json call
      let ipAddress = 'Unknown'
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json')
        const ipData = await ipRes.json()
        ipAddress = ipData.ip
      } catch (err) {
        console.warn('IP fetch failed, logging as Unknown:', err)
      }

      // Save GDPR Audit Log
      await createConsentAuditLog({
        application_id: application.id,
        candidate_email: application.candidates?.email || 'unknown@email.local',
        candidate_name: application.candidates?.name || 'Unknown Candidate',
        job_title: application.jobs?.title || 'Unknown Job',
        consent_status: consentStatus,
        ip_address: ipAddress,
        terms_version: 'v1.0 - GDPR Consent Policy',
        timestamp: new Date().toISOString()
      })

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

  const schedulerUrl = localStorage.getItem('company_scheduler_url') || 'https://cal.com/cosphere-hiring/interview'

  if (status === 'loading') return (
    <div style={cardStyle}>
      <div className="spinner" style={{ margin: '0 auto 1rem', width: 28, height: 28 }} />
      <p style={{ color: 'var(--text-3)' }}>Processing your response…</p>
    </div>
  )

  if (status === 'accepted') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>🎉</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>Consent recorded successfully!</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        Thank you for consenting to proceed with your application for the <strong>{app?.jobs?.title}</strong> role.
      </p>
      
      <div style={{
        background: '#EFF6FF',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid #BFDBFE',
        marginBottom: '1.5rem',
        textAlign: 'left'
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 700, color: '#1E40AF', margin: '0 0 8px' }}>📅 Book your interview slot</h4>
        <p style={{ fontSize: 12, color: '#1E3A8A', margin: '0 0 12px', lineHeight: 1.5 }}>
          To expedite the process, please select an interview slot that works for you on our live calendar booking page.
        </p>
        <a 
          href={schedulerUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#2563EB',
            color: '#FFF',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: 6,
            boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#1D4ED8'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#2563EB'}
        >
          Select slot on Cal.com
        </a>
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-3)' }}>Logged under terms version: v1.0 - GDPR Consent Policy</p>
    </div>
  )

  if (status === 'declined') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>👍</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>No problem at all</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        We appreciate your response. We've recorded your decline, and your data is protected under GDPR requirements.
      </p>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>You can close this window.</p>
    </div>
  )

  if (status === 'already_done') return (
    <div style={cardStyle}>
      <div style={{ fontSize: 52, marginBottom: '1rem' }}>ℹ️</div>
      <h2 style={{ fontSize: 22, marginBottom: '0.75rem' }}>Already responded</h2>
      <p style={{ color: 'var(--text-2)', lineHeight: 1.7 }}>
        Your response ({app?.consent_status}) has already been logged. No further action is required.
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
