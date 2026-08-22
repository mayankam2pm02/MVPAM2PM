import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { LogIn, Eye, EyeOff, Star, ArrowLeft, ArrowRight } from 'lucide-react'
import { isConfigured } from '../lib/supabase.js'

const DEMO_USERS = [
  { label: 'Admin (CEO)',  email: 'priya@acme.com',  password: 'admin123' },
  { label: 'HR Manager',  email: 'rahul@acme.com',  password: 'hr123456' },
  { label: 'Manager',     email: 'anita@acme.com',  password: 'mgr12345' },
  { label: 'Interviewer', email: 'karan@acme.com',  password: 'int12345' },
]
const INITIAL_ROLES = [
  { value: 'interviewer',        label: 'Interviewer',        authRole: 'interviewer' },
  { value: 'hr_manager',         label: 'HR Manager',         authRole: 'hr' },
  { value: 'general_manager',    label: 'General Manager',    authRole: 'manager' },
  { value: 'onboarding_employee',label: 'Onboarding Employee',authRole: 'employee' },
  { value: 'sales_rep',          label: 'Sales Representative',authRole: 'employee' },
  { value: 'software_engineer',  label: 'Software Engineer',  authRole: 'employee' },
  { value: 'product_manager',    label: 'Product Manager',    authRole: 'employee' },
  { value: 'operations_lead',    label: 'Operations Lead',    authRole: 'employee' }
]
const TESTIMONIALS = [
  {
    text: "Search and find your dream job is now easier than ever. Just browse a job and apply if you need to.",
    author: "Mas Parjono",
    role: "UI Designer at Google"
  },
  {
    text: "Closing Rs 2Cr+ in ARR last year was possible because Cosphere streamlined our pipeline. Simple, fast, and secure.",
    author: "Sneha Iyer",
    role: "Sales Lead at Acme"
  },
  {
    text: "Managing a workforce of 300+ people is simple and stress-free. The automated training and compliance screens work like magic.",
    author: "Priya Sharma",
    role: "CEO / Admin at Acme"
  }
]

export default function Login() {
  const { login, register, error } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  
  // Fields
  const [email,     setEmail]     = useState('')
  const [password,  setPassword]  = useState('')
  const [name,      setName]      = useState('')
  const [role,      setRole]      = useState('interviewer')

  const [workspaceRoles, setWorkspaceRoles] = useState(() => {
    const stored = localStorage.getItem('workspace_roles')
    if (stored) {
      try { return JSON.parse(stored) } catch(e) {}
    }
    return INITIAL_ROLES
  })

  const [showNewRoleInput, setShowNewRoleInput] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')

  useEffect(() => {
    localStorage.setItem('workspace_roles', JSON.stringify(workspaceRoles))
  }, [workspaceRoles])

  function saveNewRole() {
    if (!newRoleName.trim()) return
    const label = newRoleName.trim()
    const value = label.toLowerCase().replace(/[^a-z0-9]/g, '_')
    
    if (workspaceRoles.some(r => r.value === value)) {
      setError('Role already exists.')
      return
    }

    const newRole = { value, label, authRole: 'employee' }
    const updated = [...workspaceRoles, newRole]
    setWorkspaceRoles(updated)
    setRole(value)
    setShowNewRoleInput(false)
  }

  const [showPass,  setShowPass]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [success,   setSuccess]   = useState('')

  // Testimonial rotation state
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const handlePrevTestimonial = () => {
    setCurrentTestimonial(prev => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1))
  }

  const handleNextTestimonial = () => {
    setCurrentTestimonial(prev => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setSuccess('')
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        const roleObj = workspaceRoles.find(r => r.value === role) || { authRole: 'employee', label: 'Employee' }
        await register(email, password, name, roleObj.authRole, roleObj.label)
        setSuccess('Account created successfully! Logging you in...')
        setTimeout(() => {
          login(email, password)
        }, 1500)
      }
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#1b3d36', // Teal outer background as shown in screen shot
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Plus Jakarta Sans", "Inter", sans-serif',
      padding: '2rem',
      boxSizing: 'border-box'
    }}>
      <style>{`
        .habu-container-card {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
          width: 100%;
          max-width: 1000px;
          min-height: 620px;
          background: #000000; /* Pure black container box */
          border-radius: 28px;
          padding: 1.25rem; /* Margins around the inner cards */
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.4);
          position: relative;
          box-sizing: border-box;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .habu-container-card {
            grid-template-columns: 1fr;
            max-width: 480px;
          }
          .right-testimonials-pane {
            display: none !important;
          }
        }
        .left-auth-pane {
          padding: 2rem 2.5rem;
          color: #ffffff;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .brand-name {
          font-size: 18px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 2.5rem;
          font-family: "Outfit", sans-serif;
        }
        .welcome-heading {
          font-size: 20px;
          font-weight: 500;
          color: #e2e8f0;
          margin-bottom: 1.5rem;
          letter-spacing: -0.01em;
        }
        .input-label-tag {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .habu-input {
          background: #ffffff !important;
          border: 1px solid #e2e8f0 !important;
          color: #0f172a !important;
          border-radius: 12px !important;
          padding: 12px 14px !important;
          font-size: 14px !important;
          height: 48px !important;
          width: 100% !important;
          outline: none !important;
          box-sizing: border-box !important;
          transition: border-color 0.2s ease !important;
        }
        .habu-input:focus {
          border-color: #3cb27f !important;
        }
        .habu-input::placeholder {
          color: #94a3b8 !important;
        }
        .forgot-pass-link {
          display: block;
          text-align: right;
          font-size: 12px;
          color: #94a3b8;
          margin-top: 6px;
          margin-bottom: 1.5rem;
          cursor: pointer;
          transition: color 0.15s;
          text-decoration: underline;
        }
        .forgot-pass-link:hover {
          color: #ffffff;
        }
        .habu-submit-btn {
          background: #3cb27f !important; /* Flat emerald green button */
          color: #ffffff !important;
          font-weight: 600 !important;
          font-size: 15px !important;
          border-radius: 12px !important;
          border: none !important;
          padding: 12px !important;
          cursor: pointer;
          width: 100%;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.2s ease !important;
        }
        .habu-submit-btn:hover:not(:disabled) {
          background: #349c6f !important;
        }
        .toggle-section {
          text-align: center;
          font-size: 13px;
          color: #94a3b8;
          margin-top: 1.5rem;
          margin-bottom: 1.5rem;
        }
        .toggle-btn {
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
          margin-left: 5px;
          text-decoration: underline;
        }
        .toggle-btn:hover {
          color: #3cb27f;
        }
        .demo-login-box {
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid rgba(255, 255, 255, 0.06) !important;
          border-radius: 14px !important;
          padding: 1rem !important;
          margin-top: auto;
        }
        .demo-btn-pill {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          color: #cbd5e1 !important;
          border-radius: 8px !important;
          font-size: 11px !important;
          padding: 6px 12px !important;
          cursor: pointer;
          transition: all 0.2s ease !important;
          font-weight: 500;
        }
        .demo-btn-pill:hover {
          background: rgba(60, 178, 127, 0.15) !important;
          border-color: rgba(60, 178, 127, 0.3) !important;
          color: #3cb27f !important;
        }
        .right-testimonials-pane {
          background: #3cb27f; /* Flat emerald green right card */
          border-radius: 20px;
          padding: 2.5rem 2.25rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          color: #ffffff;
          overflow: hidden;
        }
        .testimonial-top {
          margin-top: 1.5rem;
        }
        .testimonial-heading {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.15;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }
        .quote-symbol {
          font-size: 40px;
          color: #ffffff;
          font-family: Georgia, serif;
          line-height: 0.1;
          margin-bottom: 1rem;
          font-weight: 900;
        }
        .testimonial-text {
          font-size: 15px;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        .testimonial-author-name {
          font-size: 14.5px;
          font-weight: 700;
          color: #ffffff;
        }
        .testimonial-author-role {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7);
        }
        .navigation-arrow-row {
          display: flex;
          gap: 8px;
          margin-top: 1.5rem;
        }
        .nav-arrow-btn-left {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3cb27f;
          background: #ffffff;
          cursor: pointer;
        }
        .nav-arrow-btn-right {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: #0d3826;
          cursor: pointer;
        }
        .right-bottom-promo-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 1.5rem 1.5rem;
          color: #0f172a;
          margin-top: auto;
          position: relative;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
        }
        .star-floating-badge {
          position: absolute;
          right: -12px;
          top: -12px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #000000;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
        }
        .promo-title {
          font-size: 17px;
          font-weight: 800;
          color: #0f172a;
          line-height: 1.25;
          margin-bottom: 8px;
          max-width: 250px;
        }
        .promo-desc {
          font-size: 11.5px;
          color: #64748b;
          line-height: 1.5;
          max-width: 260px;
        }
        .avatar-pile {
          display: flex;
          align-items: center;
          margin-top: 14px;
        }
        .pile-avatar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          background: #3cb27f;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 700;
          margin-left: -6px;
        }
        .pile-avatar:first-child {
          margin-left: 0;
        }
        .pile-avatar-more {
          background: #000000;
          color: #ffffff;
        }
        .glass-warning-banner {
          background: rgba(245, 158, 11, 0.08) !important;
          border: 1px solid rgba(245, 158, 11, 0.2) !important;
          border-radius: 10px !important;
          color: #fbbf24 !important;
          padding: 10px 12px !important;
          margin-bottom: 1rem !important;
          font-size: 11px !important;
          line-height: 1.4 !important;
        }
      `}</style>

      <div className="habu-container-card">
        {/* Left Side: Dark-themed Sign In Pane */}
        <div className="left-auth-pane">
          <div>
            <div className="brand-name">Cosphere</div>
            
            {/* Warning Banner if Supabase not configured */}
            {!isConfigured && (
              <div className="glass-warning-banner">
                ⚠️ Running in preview mode. Set Supabase keys in <code>.env</code> file.
              </div>
            )}

            <h2 className="welcome-heading">
              {mode === 'login' ? 'Please Enter your Account details' : 'Please fill in details to register'}
            </h2>

            <form onSubmit={handleSubmit}>
              {/* Full Name field (Register only) */}
              {mode === 'register' && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="input-label-tag">Full Name</label>
                  <input
                    type="text"
                    className="habu-input"
                    placeholder="John Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              )}

              {/* Email field */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label className="input-label-tag">Email</label>
                <input
                  type="email"
                  className="habu-input"
                  placeholder="Johndoe@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* Password field */}
              <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
                <label className="input-label-tag">Password</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="habu-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: 36,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Workspace Role field (Register only) */}
              {mode === 'register' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label className="input-label-tag">Workspace Role</label>
                  {showNewRoleInput ? (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input
                        type="text"
                        placeholder="Enter custom role..."
                        value={newRoleName}
                        onChange={e => setNewRoleName(e.target.value)}
                        className="habu-input"
                        style={{ flex: 1, height: 38, background: '#ffffff', color: '#0f172a' }}
                      />
                      <button
                        type="button"
                        onClick={saveNewRole}
                        style={{
                          background: '#3cb27f',
                          border: 'none',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '0 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowNewRoleInput(false); setRole(workspaceRoles[0].value) }}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: 'none',
                          color: '#fff',
                          borderRadius: 8,
                          padding: '0 12px',
                          fontSize: 12,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <select
                      className="habu-input"
                      value={role}
                      onChange={e => {
                        if (e.target.value === '__add_new__') {
                          setShowNewRoleInput(true)
                          setNewRoleName('')
                        } else {
                          setRole(e.target.value)
                        }
                      }}
                      style={{ background: '#ffffff', color: '#0f172a' }}
                    >
                      {workspaceRoles.map(r => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                      <option value="__add_new__" style={{ color: '#3cb27f', fontWeight: 'bold' }}>+ Add Custom Role</option>
                    </select>
                  )}
                </div>
              )}

              {/* Forgot Password link (Login mode only) */}
              {mode === 'login' && (
                <span className="forgot-pass-link" onClick={() => alert('Demo Feature: Forgot password clicked!')}>
                  Forgot Password
                </span>
              )}

              {/* Status Feedbacks */}
              {error && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#3cb27f',
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16
                }}>
                  {success}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="habu-submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: '#ffffff' }} />
                ) : (
                  <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
                )}
              </button>
            </form>

            {/* Toggle Link */}
            <div className="toggle-section">
              {mode === 'login' ? (
                <>
                  Don't have an account?
                  <span className="toggle-btn" onClick={() => { setMode('register'); setError(''); setSuccess('') }}>
                    Create an account
                  </span>
                </>
              ) : (
                <>
                  Already have an account?
                  <span className="toggle-btn" onClick={() => { setMode('login'); setError(''); setSuccess('') }}>
                    Sign in
                  </span>
                </>
              )}
            </div>
          </div>


        </div>

        {/* Right Side: Emerald-green Card (Mockup style) */}
        <div className="right-testimonials-pane">
          {/* Quote Block */}
          <div className="testimonial-top">
            <h3 className="testimonial-heading">What’s our</h3>
            <h3 className="testimonial-heading" style={{ marginBottom: '1rem' }}>Jobseekers Said.</h3>
            
            <div className="quote-symbol">“</div>
            
            <p className="testimonial-text">
              "{TESTIMONIALS[currentTestimonial].text}"
            </p>
            
            <div>
              <div className="testimonial-author-name">
                {TESTIMONIALS[currentTestimonial].author}
              </div>
              <div className="testimonial-author-role">
                {TESTIMONIALS[currentTestimonial].role}
              </div>
            </div>

            {/* Nav Arrows */}
            <div className="navigation-arrow-row">
              <button className="nav-arrow-btn-left" onClick={handlePrevTestimonial}>
                <ArrowLeft size={16} />
              </button>
              <button className="nav-arrow-btn-right" onClick={handleNextTestimonial}>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Bottom Card inside the Green Container */}
          <div className="right-bottom-promo-card">
            {/* Star Circle Badge floating top right */}
            <div className="star-floating-badge">
              <Star size={16} fill="#ffffff" stroke="#ffffff" />
            </div>

            <h4 className="promo-title">Get your right job and right place apply now</h4>
            <p className="promo-desc">
              Be among the first founders to experience the easiest way to start run a business.
            </p>

            {/* Avatars pile */}
            <div className="avatar-pile">
              <div className="pile-avatar">PS</div>
              <div className="pile-avatar" style={{ background: '#7c3aed' }}>RV</div>
              <div className="pile-avatar" style={{ background: '#2563eb' }}>AD</div>
              <div className="pile-avatar" style={{ background: '#eab308' }}>KS</div>
              <div className="pile-avatar pile-avatar-more">+2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
