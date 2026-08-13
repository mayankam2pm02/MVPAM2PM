import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, Lock, AlertCircle } from 'lucide-react'

export default function OAuthLoginPage() {
  const [params] = useSearchParams()
  const platform = params.get('platform') || 'linkedin'
  const displayName = params.get('name') || 'LinkedIn Recruiter'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter your credentials.')
      return
    }

    setLoading(true)
    setError('')

    setTimeout(() => {
      // Send token/auth success back to parent window
      if (window.opener) {
        window.opener.postMessage({
          type: 'oauth-success',
          platform,
          username: email
        }, window.location.origin)
        window.close()
      } else {
        setLoading(false)
        setError('Authentication callback failed: Parent window closed.')
      }
    }, 1500)
  }

  // Brand color scheme configuration
  const brandColors = {
    linkedin: { primary: '#0A66C2', hover: '#004182', bg: '#F3F6F9', logo: 'L' },
    indeed: { primary: '#2164E3', hover: '#1245A8', bg: '#F4F7FC', logo: 'I' },
    naukri: { primary: '#FF7555', hover: '#E05D3D', bg: '#FFF7F5', logo: 'N' },
    glassdoor: { primary: '#0CAA41', hover: '#098C33', bg: '#F0FAF2', logo: 'G' }
  }

  const brand = brandColors[platform] || brandColors.linkedin

  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: brand.bg,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '20px',
    boxSizing: 'border-box'
  }

  const cardStyle = {
    background: '#FFF',
    border: '1px solid #E2E8F0',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    padding: '32px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
    boxSizing: 'border-box'
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        {/* Brand Icon Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 8,
            background: brand.primary, color: '#FFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: '800'
          }}>
            {brand.logo}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>Link {displayName}</h2>
            <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Shield size={12} color="#10B981" /> Secure OAuth 2.0 Connection
            </div>
          </div>
        </div>

        <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginBottom: 20 }}>
          Grant <strong>TalentOS</strong> access to synchronize active board listings and fetch applicant profiles automatically.
        </p>

        {error && (
          <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: 10, borderRadius: 6, fontSize: 12, marginBottom: 16 }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              {displayName} Account Email *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. recruitment@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 6,
                border: '1px solid #CBD5E1', fontSize: 14, outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Password *
            </label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 6,
                border: '1px solid #CBD5E1', fontSize: 14, outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px', borderRadius: 6,
              border: 'none', background: brand.primary, color: '#FFF',
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: loading ? 0.7 : 1, transition: 'background 0.2s',
              marginTop: 10
            }}
            onMouseEnter={e => { if(!loading) e.currentTarget.style.background = brand.hover }}
            onMouseLeave={e => { if(!loading) e.currentTarget.style.background = brand.primary }}
          >
            {loading ? 'Connecting Account…' : 'Sign In & Connect'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'center', gap: 6, fontSize: 11, color: '#64748B' }}>
          <Lock size={12} /> Encrypted credential transport
        </div>
      </div>
    </div>
  )
}
