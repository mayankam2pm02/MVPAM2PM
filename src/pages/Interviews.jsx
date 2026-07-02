import { useState, useEffect } from 'react'
import { fetchInterviewApplications, updateApplication } from '../lib/supabase.js'
import { Calendar, Video, FileText, Phone, Mail, MessageCircle, CheckCircle, Copy, X, User, Search, Briefcase } from 'lucide-react'

// ─── Schedule Modal ────────────────────────────────────────────
function ScheduleModal({ app, onClose, onScheduled }) {
  const candidate = app.candidates || {}
  const job       = app.jobs       || {}
  const isVideo   = app.status === 'video_interview'
  const typeName  = isVideo ? 'AI Video Interview' : 'Manual Interview'

  const [date, setDate]               = useState('')
  const [time, setTime]               = useState('')
  const [meetingLink, setMeetingLink] = useState('')
  const [notes, setNotes]             = useState('')
  const [saving, setSaving]           = useState(false)
  const [copied, setCopied]           = useState(false)
  const [error, setError]             = useState('')

  // Interviewer details
  const [ivrName,  setIvrName]  = useState('')
  const [ivrEmail, setIvrEmail] = useState('')
  const [ivrPhone, setIvrPhone] = useState('')

  // Interviewee details (pre-filled from candidate, editable)
  const [iveeEmail, setIveeEmail] = useState(candidate.email || '')
  const [iveePhone, setIveePhone] = useState(candidate.phone || '')

  // WhatsApp notification checkbox
  const [sendWA, setSendWA] = useState(false)

  const dateDisplay = date ? new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const timeDisplay = time ? (() => { const [h, m] = time.split(':'); const hr = +h; return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}` })() : ''

  const clientMessage = date && time
    ? `Dear Team,

We are pleased to inform you that ${candidate.name || 'the candidate'} has been scheduled for a ${typeName} for the ${job.title || 'position'} role${job.department ? ` (${job.department})` : ''}.

Interview Details:
• Type: ${typeName}
• Date: ${dateDisplay}
• Time: ${timeDisplay}${meetingLink ? `\n• Meeting Link: ${meetingLink}` : ''}${ivrName ? `\n• Interviewer: ${ivrName}` : ''}${notes ? `\n\nNotes: ${notes}` : ''}

Please feel free to reach out if you have any questions.

Best regards,
TalentOS Team`
    : ''

  function buildWAMessage(toRole) {
    const greeting = toRole === 'interviewer'
      ? `Dear ${ivrName || 'Team'},`
      : `Dear ${candidate.name || 'Candidate'},`
    const body = toRole === 'interviewer'
      ? `You have been scheduled to interview *${candidate.name || 'the candidate'}* for the *${job.title || 'position'}* role${job.department ? ` (${job.department})` : ''}.`
      : `Your interview for the *${job.title || 'position'}* role${job.department ? ` (${job.department})` : ''} has been scheduled.`
    return `${greeting}\n\n${body}\n\n*Interview Details:*\n• Type: ${typeName}\n• Date: ${dateDisplay}\n• Time: ${timeDisplay}${meetingLink ? `\n• Link: ${meetingLink}` : ''}${notes ? `\n\nNotes: ${notes}` : ''}\n\nBest regards,\nTalentOS Team`
  }

  async function handleSchedule() {
    if (!date || !time) { setError('Please select both date and time.'); return }
    setSaving(true)
    setError('')
    try {
      const dateStr = `${dateDisplay} at ${timeDisplay}${meetingLink ? ` | ${meetingLink}` : ''}`
      const updated = await updateApplication(app.id, {
        interview_date: dateStr,
        interview_scheduled_at: new Date().toISOString(),
        interviewer_name:  ivrName  || null,
        interviewer_email: ivrEmail || null,
        interviewer_phone: ivrPhone || null,
      })
      onScheduled({ ...app, ...updated })

      // Open WhatsApp tabs after saving if checkbox was checked
      if (sendWA && date && time) {
        const ivrNum  = ivrPhone.replace(/[^0-9]/g, '')
        const iveeNum = iveePhone.replace(/[^0-9]/g, '')
        if (ivrNum)  window.open(`https://wa.me/${ivrNum}?text=${encodeURIComponent(buildWAMessage('interviewer'))}`, '_blank')
        if (iveeNum) window.open(`https://wa.me/${iveeNum}?text=${encodeURIComponent(buildWAMessage('candidate'))}`, '_blank')
        if (!ivrNum && !iveeNum) alert('No phone numbers provided — WhatsApp notifications skipped.')
      }

      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function copyMessage() {
    navigator.clipboard.writeText(clientMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sectionLabel = { fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }
  const divider      = { gridColumn: '1/-1', height: 1, background: 'var(--border)', margin: '4px 0' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#ffffff', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 600, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={16} style={{ color: 'var(--brand)' }} />
              Schedule Interview
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
              {candidate.name} · {job.title} · <strong>{typeName}</strong>
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>

          {/* ── Date / Time / Link ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px', marginBottom: 18 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Interview Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Interview Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>
            {isVideo && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Meeting Link</label>
                <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            )}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions, topics, panel members…" style={{ width: '100%', boxSizing: 'border-box', minHeight: 52, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
            </div>
          </div>

          {/* ── Interviewer ── */}
          <div style={{ marginBottom: 16 }}>
            <div style={sectionLabel}><User size={12} /> Interviewer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 12px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Name</label>
                <input value={ivrName} onChange={e => setIvrName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Email</label>
                <input type="email" value={ivrEmail} onChange={e => setIvrEmail(e.target.value)} placeholder="interviewer@company.com" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Phone <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(for WhatsApp)</span></label>
                <input type="tel" value={ivrPhone} onChange={e => setIvrPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* ── Interviewee (Candidate) ── */}
          <div style={{ marginBottom: 18 }}>
            <div style={sectionLabel}><User size={12} /> Interviewee <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'var(--text-3)' }}>— {candidate.name}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Email</label>
                <input type="email" value={iveeEmail} onChange={e => setIveeEmail(e.target.value)} placeholder="candidate@email.com" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Phone <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>(for WhatsApp)</span></label>
                <input type="tel" value={iveePhone} onChange={e => setIveePhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>
          </div>

          {/* ── WhatsApp notification checkbox ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 10,
            background: sendWA ? 'rgba(37,211,102,0.06)' : 'var(--bg-2)',
            border: `1px solid ${sendWA ? '#25d366' : 'var(--border)'}`,
            marginBottom: 16, cursor: 'pointer', transition: 'all 0.15s'
          }} onClick={() => setSendWA(v => !v)}>
            <input type="checkbox" checked={sendWA} onChange={e => setSendWA(e.target.checked)}
              onClick={e => e.stopPropagation()}
              style={{ marginTop: 2, accentColor: '#25d366', width: 15, height: 15, flexShrink: 0, cursor: 'pointer' }} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: sendWA ? '#128c3e' : 'var(--text-2)' }}>
                <MessageCircle size={14} style={{ color: '#25d366' }} />
                Send WhatsApp notifications to both parties
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                Opens WhatsApp with pre-filled messages for the interviewer and candidate after scheduling.
                {!ivrPhone && !iveePhone && <span style={{ color: 'var(--warning)', marginLeft: 4 }}>⚠ Enter at least one phone number above.</span>}
              </div>
            </div>
          </div>

          {/* Client message preview */}
          {clientMessage && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Message Preview</span>
                <button className="btn btn-ghost btn-sm" onClick={copyMessage} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {copied ? <CheckCircle size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre style={{
                background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8,
                padding: '12px 14px', fontSize: 12, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-2)', margin: 0
              }}>{clientMessage}</pre>
            </div>
          )}

          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSchedule} disabled={saving || !date || !time}>
            {saving ? 'Saving…' : <><Calendar size={13} style={{ marginRight: 5 }} />Confirm Schedule{sendWA ? ' & Notify' : ''}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function Interviews() {
  const [apps, setApps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState('ai')
  const [scheduling, setScheduling] = useState(null)

  // Filters
  const [fName,    setFName]    = useState('')
  const [fProfile, setFProfile] = useState('all')

  useEffect(() => {
    fetchInterviewApplications()
      .then(setApps)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function onScheduled(updated) {
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  const aiApps     = apps.filter(a => a.status === 'video_interview')
  const manualApps = apps.filter(a => a.status === 'manual_round')
  const tabApps    = activeTab === 'ai' ? aiApps : manualApps

  // Unique job profiles for the dropdown
  const profileOptions = [...new Map(
    tabApps.map(a => a.jobs).filter(Boolean).map(j => [j.id, j])
  ).values()]

  // Apply filters
  const displayed = tabApps.filter(app => {
    const c = app.candidates || {}
    const j = app.jobs || {}
    if (fName.trim() && !(c.name || '').toLowerCase().includes(fName.trim().toLowerCase())) return false
    if (fProfile !== 'all' && j.id !== fProfile) return false
    return true
  })

  const hasFilters = fName.trim() || fProfile !== 'all'
  function clearFilters() { setFName(''); setFProfile('all') }

  return (
    <div>
      <div className="page-header">
        <h1>Interviews</h1>
        <p>{aiApps.length} AI video · {manualApps.length} manual round</p>
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => { setActiveTab('ai'); clearFilters() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Video size={13} /> AI Video Interview ({aiApps.length})
        </button>
        <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => { setActiveTab('manual'); clearFilters() }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <FileText size={13} /> Manual Interview ({manualApps.length})
        </button>
      </div>

      {/* ── Filter bar ── */}
      {!loading && tabApps.length > 0 && (
        <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

            {/* Name search */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <input value={fName} onChange={e => setFName(e.target.value)}
                placeholder="Search candidate name…"
                style={{ paddingLeft: 30, fontSize: 13, height: 36, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Job profile dropdown */}
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
              <Briefcase size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
              <select value={fProfile} onChange={e => setFProfile(e.target.value)}
                style={{ paddingLeft: 30, fontSize: 13, height: 36, width: '100%', boxSizing: 'border-box' }}>
                <option value="all">Job Profile</option>
                {profileOptions.map(j => (
                  <option key={j.id} value={j.id}>{j.title}{j.department ? ` (${j.department})` : ''}</option>
                ))}
              </select>
            </div>

            {hasFilters && (
              <button onClick={clearFilters} className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--brand)', whiteSpace: 'nowrap' }}>
                <X size={13} /> Clear filters
              </button>
            )}
          </div>

          {hasFilters && (
            <div style={{ marginTop: 7, fontSize: 12, color: 'var(--text-3)' }}>
              Showing <strong style={{ color: 'var(--text-1)' }}>{displayed.length}</strong> of <strong style={{ color: 'var(--text-1)' }}>{tabApps.length}</strong> interviews
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="card"><p style={{ color: 'var(--text-3)' }}>Loading candidates…</p></div>
      ) : tabApps.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">{activeTab === 'ai' ? '🎥' : '📋'}</div>
          <h3>No candidates here yet</h3>
          <p>Transfer candidates to &ldquo;{activeTab === 'ai' ? 'Transfer to Video Interview' : 'Selected for Manual Round'}&rdquo; from the Hiring pipeline.</p>
        </div>
      ) : displayed.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">🔍</div>
          <h3>No matches found</h3>
          <p style={{ marginBottom: 12 }}>Try adjusting your filters.</p>
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}><X size={13} /> Clear filters</button>
        </div>
      ) : displayed.map(app => {
        const candidate  = app.candidates || {}
        const job        = app.jobs       || {}
        const phone      = candidate.phone
        const email      = candidate.email
        const name       = candidate.name || ''
        const waNumber   = phone?.replace(/[^0-9]/g, '')
        const isScheduled = !!app.interview_date

        return (
          <div key={app.id} className="card" style={{ marginBottom: 10, padding: '1rem 1.25rem' }}>

            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>
                {name.split(' ').map(w => w[0]).join('').slice(0, 2)}
              </div>

              <div style={{ flex: 1, minWidth: 140 }}>
                {/* Name */}
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{name}</div>

                {/* Profile pill — shown separately and prominently */}
                {job.title && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <Briefcase size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--brand)',
                      background: 'var(--brand-light)', padding: '2px 10px', borderRadius: 20
                    }}>
                      {job.title}
                    </span>
                    {job.department && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{job.department}</span>
                    )}
                  </div>
                )}

                {/* Email */}
                {email && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{email}</div>
                )}
              </div>

              {/* Right-side badges */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                {isScheduled && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    background: 'rgba(34,197,94,0.08)', border: '1px solid var(--success)',
                    borderRadius: 20, fontSize: 11, color: 'var(--success)', whiteSpace: 'nowrap'
                  }}>
                    <CheckCircle size={11} /> Scheduled
                  </div>
                )}
                <span className={`badge badge-${app.status === 'video_interview' ? 'purple' : 'brand'}`}>
                  {app.status === 'video_interview' ? 'AI Video' : 'Manual Round'}
                </span>
              </div>
            </div>

            {/* Scheduled date display */}
            {isScheduled && (
              <div style={{
                marginTop: 10, padding: '8px 12px',
                background: 'var(--bg-2)', borderRadius: 8,
                fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6
              }}>
                <Calendar size={12} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                <span><strong>Scheduled:</strong> {app.interview_date}</span>
              </div>
            )}

            {/* Action bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</span>

              <a href={phone ? `tel:${phone}` : undefined}
                onClick={!phone ? e => { e.preventDefault(); alert('No phone number on file for this candidate.') } : undefined}
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}>
                <Phone size={13} style={{ color: 'var(--success)' }} /> Call
              </a>

              <a href={email ? `mailto:${email}?subject=Regarding your interview` : undefined}
                onClick={!email ? e => { e.preventDefault(); alert('No email on file for this candidate.') } : undefined}
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}>
                <Mail size={13} style={{ color: 'var(--brand)' }} /> Email
              </a>

              <a href={waNumber ? `https://wa.me/${waNumber}?text=Hi ${encodeURIComponent(name)}, we'd like to confirm your interview schedule.` : undefined}
                onClick={!waNumber ? e => { e.preventDefault(); alert('No phone number on file for this candidate.') } : undefined}
                target="_blank" rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}>
                <MessageCircle size={13} style={{ color: '#25d366' }} /> WhatsApp
              </a>

              <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

              <button className="btn btn-primary btn-sm" onClick={() => setScheduling(app)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Calendar size={13} />
                {isScheduled ? 'Reschedule' : 'Schedule'}
              </button>
            </div>
          </div>
        )
      })}

      {scheduling && (
        <ScheduleModal
          app={scheduling}
          onClose={() => setScheduling(null)}
          onScheduled={onScheduled}
        />
      )}
    </div>
  )
}
