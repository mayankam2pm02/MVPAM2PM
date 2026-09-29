import { useState } from 'react'
import { useAuth } from '../../lib/auth.jsx'
import { Building2, User, Mail, Lock, Check, Copy, ArrowRight, X, Sparkles } from 'lucide-react'

export default function AddCompanyModal({ isOpen, onClose, onCreated }) {
  const { addCompany, switchCompany } = useAuth()
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('client123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdResult, setCreatedResult] = useState(null)
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleReset = () => {
    setName('')
    setAdminName('')
    setAdminEmail('')
    setAdminPassword('client123')
    setError('')
    setCreatedResult(null)
    setCopied(false)
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !adminEmail.trim()) {
      setError('Please fill in Company Name and Admin Email.')
      return
    }

    setLoading(true)
    setError('')
    try {
      const created = await addCompany({
        name: name.trim(),
        admin_name: adminName.trim() || `${name.trim()} Admin`,
        admin_email: adminEmail.trim(),
        admin_password: adminPassword || 'client123'
      })

      const creds = {
        company: created,
        adminName: adminName.trim() || `${name.trim()} Admin`,
        adminEmail: adminEmail.trim(),
        adminPassword: adminPassword || 'client123'
      }

      setCreatedResult(creds)
      if (onCreated) onCreated(creds)
    } catch (err) {
      setError(err.message || 'Failed to create client company.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCredentials = () => {
    if (!createdResult) return
    const text = `🏢 *${createdResult.company.name} Admin Login Credentials*\n\nPortal URL: ${window.location.origin}/login\nEmail: ${createdResult.adminEmail}\nPassword: ${createdResult.adminPassword}\n\nPlease keep these credentials secure.`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSwitchImmediately = () => {
    if (createdResult?.company) {
      switchCompany(createdResult.company)
      handleReset()
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: '#0F172A',
        border: '1px solid #334155',
        borderRadius: 20,
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        color: '#F8FAFC',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 1.75rem',
          borderBottom: '1px solid #1E293B',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(15, 23, 42, 0) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 42,
              height: 42,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
            }}>
              <Building2 size={22} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>
                {createdResult ? 'Client Company Created!' : 'Add New Client Company'}
              </h2>
              <p style={{ fontSize: 12, color: '#94A3B8', margin: '2px 0 0 0' }}>
                {createdResult ? 'Credentials ready to share with the client.' : 'Set up workspace and auto-generate client admin profile.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.75rem' }}>
          {createdResult ? (
            <div>
              <div style={{
                background: '#1E293B',
                border: '1px solid #334155',
                borderRadius: 14,
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#A5B4FC' }}>
                    🏢 {createdResult.company.name}
                  </span>
                  <span style={{
                    fontSize: 11,
                    background: '#064E3B',
                    color: '#34D399',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontWeight: 600
                  }}>
                    Active Account
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Admin Name: </span>
                    <strong style={{ color: '#F1F5F9' }}>{createdResult.adminName}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Login Email: </span>
                    <strong style={{ color: '#F1F5F9' }}>{createdResult.adminEmail}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#94A3B8' }}>Temporary Password: </span>
                    <code style={{
                      background: '#0F172A',
                      padding: '2px 8px',
                      borderRadius: 6,
                      color: '#FCD34D',
                      fontWeight: 600,
                      fontFamily: 'monospace'
                    }}>
                      {createdResult.adminPassword}
                    </code>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginBottom: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: copied ? '#059669' : '#334155',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 16px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                </button>

                <button
                  type="button"
                  onClick={handleSwitchImmediately}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 16px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  <span>View as Client</span>
                  <ArrowRight size={16} />
                </button>
              </div>

              <button
                type="button"
                onClick={handleReset}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: '1px solid #334155',
                  color: '#94A3B8',
                  padding: '10px',
                  borderRadius: 10,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  color: '#FCA5A5',
                  fontSize: 13,
                  marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Company Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Company Name *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Building2 size={16} color="#64748B" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      placeholder="e.g. Acme Corporation"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Admin Full Name */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Client Admin Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User size={16} color="#64748B" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Admin Email */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Client Admin Login Email *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#64748B" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="email"
                      placeholder="e.g. admin@acmecorp.com"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Admin Password */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#CBD5E1', marginBottom: 6 }}>
                    Initial Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={16} color="#64748B" style={{ position: 'absolute', left: 12, top: 12 }} />
                    <input
                      type="text"
                      placeholder="client123"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 38px',
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: 10,
                        color: '#fff',
                        fontSize: 14,
                        outline: 'none',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 11, color: '#64748B', marginTop: 4, display: 'block' }}>
                    You can share this with the client. They can change it upon logging in.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    flex: 1,
                    background: '#1E293B',
                    border: '1px solid #334155',
                    color: '#CBD5E1',
                    padding: '11px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                    color: '#fff',
                    border: 'none',
                    padding: '11px 16px',
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)'
                  }}
                >
                  {loading ? 'Creating Company...' : 'Create Company Workspace'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
