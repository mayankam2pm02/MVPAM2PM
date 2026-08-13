import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchJobs, createCandidate, createApplication } from '../lib/supabase.js'
import { CheckCircle, Briefcase, Mail, Phone, MapPin, Sparkles, FileText, Send } from 'lucide-react'

export default function ApplyPage() {
  const [params] = useSearchParams()
  const jobId = params.get('jobId')
  const source = params.get('source') || 'direct'

  const [job, setJob] = useState(null)
  const [loadingJob, setLoadingJob] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')
  const [location, setLocation] = useState('')
  const [experience, setExperience] = useState('')
  const [skills, setSkills] = useState('')
  const [cvText, setCvText] = useState('')

  useEffect(() => {
    if (!jobId) {
      setLoadingJob(false)
      return
    }
    fetchJobs()
      .then(list => {
        const found = list.find(j => j.id === jobId)
        setJob(found || null)
      })
      .catch(err => {
        console.error('Failed to load job details:', err)
      })
      .finally(() => {
        setLoadingJob(false)
      })
  }, [jobId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !email) {
      alert('Please fill out all required fields.')
      return
    }

    setSubmitting(true)
    try {
      // 1. Create candidate record
      const candidatePayload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role: role.trim() || null,
        experience: parseInt(experience) || 0,
        location: location.trim() || null,
        skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        cv_text: cvText.trim() || `Candidate Profile: ${name}\nDesignation: ${role}\nSkills: ${skills}`,
        source: ['linkedin', 'indeed', 'naukri', 'glassdoor'].includes(source.toLowerCase()) ? source.toLowerCase() : 'portal',
        status: 'available',
        rating: 4.0
      }

      const newCand = await createCandidate(candidatePayload)

      // 2. Link candidate to application
      if (jobId) {
        await createApplication({
          job_id: jobId,
          candidate_id: newCand.id,
          status: 'applied',
          consent_status: 'not_sent'
        })
      }

      setSubmitted(true)
    } catch (err) {
      console.error('Failed to submit application:', err)
      alert('Something went wrong during submission: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    background: '#F8FAFC',
    fontFamily: 'var(--font-body), system-ui, sans-serif',
    color: '#1E293B',
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }

  const cardStyle = {
    background: '#FFFFFF',
    borderRadius: '16px',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
    border: '1px solid #E2E8F0',
    width: '100%',
    maxWidth: '640px',
    padding: '32px'
  }

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '28px',
    borderBottom: '1px solid #F1F5F9',
    paddingBottom: '20px'
  }

  const formGroupStyle = {
    marginBottom: '18px'
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '6px'
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #CBD5E1',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease'
  }

  const textareaStyle = {
    ...inputStyle,
    resize: 'vertical',
    minHeight: '120px',
    fontFamily: 'inherit'
  }

  if (loadingJob) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px', width: 32, height: 32 }} />
          <p style={{ color: '#64748B', fontSize: '14px' }}>Loading job details…</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 32px' }}>
          <CheckCircle size={56} color="#10B981" style={{ display: 'block', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>Application Submitted!</h2>
          <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.6', margin: '0 auto 24px', maxWidth: '460px' }}>
            Thank you for applying to the <strong>{job?.title || 'Job Listing'}</strong> role. Your application has been logged directly into our system, and our hiring team will review your profile shortly.
          </p>
          <div style={{ fontSize: '12px', color: '#94A3B8' }}>
            Source: <span style={{ textTransform: 'capitalize', fontWeight: '600' }}>{source}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#EFF6FF', color: '#2563EB', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>
            <Sparkles size={12} /> Cosphere Careers
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', margin: '0 0 6px' }}>
            {job ? `Apply for ${job.title}` : 'Submit Your Application'}
          </h1>
          {job && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
              {job.department && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Briefcase size={12} /> {job.department}</span>}
              {job.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {job.location}</span>}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Full Name *</label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Email Address *</label>
              <input
                type="email"
                required
                placeholder="john.doe@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Current Designation / Role</label>
              <input
                type="text"
                placeholder="e.g. Software Engineer"
                value={role}
                onChange={e => setRole(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Location</label>
              <input
                type="text"
                placeholder="e.g. San Francisco, CA"
                value={location}
                onChange={e => setLocation(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={formGroupStyle}>
              <label style={labelStyle}>Years of Experience</label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 3"
                value={experience}
                onChange={e => setExperience(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Key Skills (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. React, Node.js, TypeScript"
              value={skills}
              onChange={e => setSkills(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Paste CV / Resume details below *</label>
            <textarea
              required
              placeholder="Paste the full text of your resume or CV here for screening..."
              value={cvText}
              onChange={e => setCvText(e.target.value)}
              style={textareaStyle}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              background: '#2563EB',
              color: '#FFFFFF',
              border: 'none',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: '10px',
              opacity: submitting ? 0.7 : 1,
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => { if(!submitting) e.currentTarget.style.background = '#1D4ED8' }}
            onMouseLeave={e => { if(!submitting) e.currentTarget.style.background = '#2563EB' }}
          >
            {submitting ? 'Submitting…' : <><Send size={15} /> Submit Application</>}
          </button>
        </form>
      </div>
    </div>
  )
}
