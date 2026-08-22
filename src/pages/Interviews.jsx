import { useState, useEffect } from 'react'
import { fetchInterviewApplications, updateApplication, fetchAllApplications, fetchConsentAuditLogs } from '../lib/supabase.js'
import NotificationBell from '../components/layout/NotificationBell.jsx'
import {
  Calendar, Video, FileText, Phone, Mail, MessageCircle,
  CheckCircle, Copy, X, User, Users, Search, Briefcase, ChevronDown,
  Clock, ChevronLeft, ChevronRight, ListFilter, HelpCircle, ArrowRight
} from 'lucide-react'
import { buildEmailDraft } from '../lib/emailUtils.js'

function openInterviewEmail(email, name, jobTitle) {
  if (!email) {
    alert('No email on file for this candidate.')
    return
  }

  const draft = buildEmailDraft({ type: 'interview', recipientEmail: email, name, jobTitle })
  const mailtoUrl = `mailto:${encodeURIComponent(draft.to)}?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
  const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(draft.to)}&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`
  const outlookUrl = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(draft.to)}&subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`

  const opened = window.open(mailtoUrl, '_blank', 'noopener,noreferrer')
  if (!opened) {
    const useGmail = window.confirm('Your mail app did not open. Would you like to continue with Gmail webmail?')
    window.open(useGmail ? gmailUrl : outlookUrl, '_blank', 'noopener,noreferrer')
  }
}

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

  // Interviewee details
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
Mr. Manager Team`
    : ''

  function buildWAMessage(toRole) {
    const greeting = toRole === 'interviewer'
      ? `Dear ${ivrName || 'Team'},`
      : `Dear ${candidate.name || 'Candidate'},`
    const body = toRole === 'interviewer'
      ? `You have been scheduled to interview *${candidate.name || 'the candidate'}* for the *${job.title || 'position'}* role${job.department ? ` (${job.department})` : ''}.`
      : `Your interview for the *${job.title || 'position'}* role${job.department ? ` (${job.department})` : ''} has been scheduled.`
    return `${greeting}\n\n${body}\n\n*Interview Details:*\n• Type: ${typeName}\n• Date: ${dateDisplay}\n• Time: ${timeDisplay}${meetingLink ? `\n• Link: ${meetingLink}` : ''}${notes ? `\n\nNotes: ${notes}` : ''}\n\nBest regards,\nMr. Manager Team`
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
        if (ivrNum) {
          window.open(`https://wa.me/${ivrNum}?text=${encodeURIComponent(buildWAMessage('interviewer'))}`, '_blank')
        }
        if (iveeNum) {
          if (ivrNum) {
            setTimeout(() => {
              if (confirm('Interviewer notification tab opened. Click OK to open the Candidate notification tab.')) {
                window.open(`https://wa.me/${iveeNum}?text=${encodeURIComponent(buildWAMessage('candidate'))}`, '_blank')
              }
            }, 500)
          } else {
            window.open(`https://wa.me/${iveeNum}?text=${encodeURIComponent(buildWAMessage('candidate'))}`, '_blank')
          }
        }
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={{ background: '#ffffff', borderRadius: 16, padding: '24px', width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
              <Calendar size={18} style={{ color: '#4F46E5' }} />
              Schedule Interview
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
              {candidate.name} · {job.title} · <strong>{typeName}</strong>
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}><X size={18} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }}>

          {/* Date & Time fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Interview Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', borderRadius: 8, height: 38 }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Interview Time *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: '100%', borderRadius: 8, height: 38 }} />
            </div>
            {isVideo && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Meeting Link</label>
                <input type="url" value={meetingLink} onChange={e => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." style={{ width: '100%', borderRadius: 8, height: 38 }} />
              </div>
            )}
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Notes (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions, topics, panel members…" style={{ width: '100%', borderRadius: 8, minHeight: 60, resize: 'vertical', fontSize: 13 }} />
            </div>
          </div>

          {/* Interviewer detail fields */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}><User size={12} /> Interviewer</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Name</label>
                <input value={ivrName} onChange={e => setIvrName(e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', borderRadius: 8, height: 38 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
                <input type="email" value={ivrEmail} onChange={e => setIvrEmail(e.target.value)} placeholder="interviewer@company.com" style={{ width: '100%', borderRadius: 8, height: 38 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Phone (for WhatsApp)</label>
                <input type="tel" value={ivrPhone} onChange={e => setIvrPhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', borderRadius: 8, height: 38 }} />
              </div>
            </div>
          </div>

          {/* Interviewee details */}
          <div style={{ marginBottom: 20 }}>
            <div style={sectionLabel}><User size={12} /> Interviewee — <span style={{ color: 'var(--text-2)' }}>{candidate.name}</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px' }}>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Email</label>
                <input type="email" value={iveeEmail} onChange={e => setIveeEmail(e.target.value)} placeholder="candidate@email.com" style={{ width: '100%', borderRadius: 8, height: 38 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6, fontWeight: 500 }}>Phone (for WhatsApp)</label>
                <input type="tel" value={iveePhone} onChange={e => setIveePhone(e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', borderRadius: 8, height: 38 }} />
              </div>
            </div>
          </div>

          {/* WhatsApp switch toggle */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px', borderRadius: 10,
            background: sendWA ? 'rgba(37,211,102,0.06)' : '#F8F9FC',
            border: `1px solid ${sendWA ? '#25d366' : 'var(--border)'}`,
            marginBottom: 20, cursor: 'pointer', transition: 'all 0.15s'
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
              </div>
            </div>
          </div>

          {/* Message Preview */}
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
                background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 8,
                padding: '12px 14px', fontSize: 12, lineHeight: 1.6,
                whiteSpace: 'pre-wrap', fontFamily: 'inherit', color: 'var(--text-2)', margin: 0
              }}>{clientMessage}</pre>
            </div>
          )}

          {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 4 }}>{error}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, flexShrink: 0, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSchedule} disabled={saving || !date || !time}>
            {saving ? 'Saving…' : <><Calendar size={13} style={{ marginRight: 5 }} />Confirm Schedule</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dynamic Calendar Component ───
function SimpleCalendar({ scheduledDates }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 24)) // Defaults to May 2026 matching screenshot

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const firstDayIndex = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()
  
  const prevMonthTotalDays = new Date(year, month, 0).getDate()

  const daysGrid = []

  // Fill padding days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    daysGrid.push({ day: prevMonthTotalDays - i, isCurrentMonth: false })
  }

  // Fill current month days
  for (let i = 1; i <= totalDays; i++) {
    const formattedDateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    daysGrid.push({
      day: i,
      isCurrentMonth: true,
      hasInterviews: scheduledDates.includes(formattedDateKey),
      isToday: year === 2026 && month === 4 && i === 24 // May 24, 2026 selected
    })
  }

  // Fill padding days for next month to complete the grid (usually 42 boxes)
  const remaining = 42 - daysGrid.length
  for (let i = 1; i <= remaining; i++) {
    daysGrid.push({ day: i, isCurrentMonth: false })
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const nextDate = new Date(prev)
      nextDate.setMonth(prev.getMonth() + direction)
      return nextDate
    })
  }

  return (
    <div style={{
      background: '#FFF',
      border: '1px solid var(--border)',
      borderRadius: 16,
      padding: 16,
      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
          {monthNames[month]} {year}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => navigateMonth(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
            <ChevronLeft size={16} color="var(--text-3)" />
          </button>
          <button onClick={() => navigateMonth(1)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
            <ChevronRight size={16} color="var(--text-3)" />
          </button>
        </div>
      </div>

      {/* Week Header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center', marginBottom: 8 }}>
        {daysOfWeek.map(d => (
          <span key={d} style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>{d}</span>
        ))}
      </div>

      {/* Days Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, textAlign: 'center' }}>
        {daysGrid.map((item, idx) => {
          const activeStyle = item.isToday ? {
            background: '#4F46E5',
            color: '#FFF',
            fontWeight: 700,
            borderRadius: '50%'
          } : {}
          return (
            <div key={idx} style={{
              height: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              color: item.isCurrentMonth ? (item.isToday ? '#FFF' : 'var(--text-1)') : 'rgba(0,0,0,0.15)',
              position: 'relative',
              cursor: item.isCurrentMonth ? 'pointer' : 'default',
              ...activeStyle
            }}>
              {item.day}
              {/* Highlight dot if there are interviews scheduled on this day */}
              {item.isCurrentMonth && item.hasInterviews && !item.isToday && (
                <span style={{
                  position: 'absolute',
                  bottom: 2,
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: '#4F46E5'
                }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────
export default function Interviews() {
  const [apps, setApps]             = useState([])
  const [allApps, setAllApps]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState('ai') // 'ai' | 'manual' | 'scheduler' | 'consent_logs'
  const [scheduling, setScheduling] = useState(null)

  const [schedulerUrl, setSchedulerUrl] = useState(localStorage.getItem('company_scheduler_url') || 'https://cal.com/cosphere-hiring/interview')
  const [auditLogs, setAuditLogs] = useState([])
  const [msg, setMsg] = useState('')

  // Filters State
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [jobFilter, setJobFilter]   = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [sortBy, setSortBy]         = useState('newest')

  useEffect(() => {
    Promise.all([fetchInterviewApplications(), fetchAllApplications(), fetchConsentAuditLogs()])
      .then(([ia, aa, logs]) => {
        setApps(ia || [])
        setAllApps(aa || [])
        setAuditLogs(logs || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function onScheduled(updated) {
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a))
    setAllApps(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  // Seeding mockup data if database is empty for a gorgeous preview
  const isEmptyDB = apps.length === 0

  const aiApps     = isEmptyDB ? [] : apps.filter(a => a.status === 'video_interview')
  const manualApps = isEmptyDB ? [] : apps.filter(a => a.status === 'manual_round')
  const tabApps    = activeTab === 'ai' ? aiApps : manualApps

  // Calculate live statistics
  const scheduledCountAI = aiApps.filter(a => a.interview_date).length
  const scheduledCountManual = manualApps.filter(a => a.interview_date).length
  const completedCount = allApps.filter(a => a.status === 'interview_done').length
  const totalScheduled = allApps.filter(a => a.interview_date).length
  const completionRate = totalScheduled > 0 ? Math.round((completedCount / totalScheduled) * 100) : 0

  // 1. Stats Setup
  const stats = [
    {
      label: 'AI Video Interviews',
      value: isEmptyDB ? 0 : scheduledCountAI,
      icon: Video,
      color: '#4F46E5',
      bg: '#EEF2FF',
      subtext: 'No scheduled interviews'
    },
    {
      label: 'Manual Interviews',
      value: isEmptyDB ? 0 : scheduledCountManual,
      icon: Users,
      color: '#10B981',
      bg: '#ECFDF5',
      subtext: 'No scheduled interviews'
    },
    {
      label: 'Completed',
      value: isEmptyDB ? 0 : completedCount,
      icon: Calendar,
      color: '#2563EB',
      bg: '#EFF6FF',
      subtext: 'This month'
    },
    {
      label: 'Completion Rate',
      value: isEmptyDB ? '0%' : `${completionRate}%`,
      icon: Clock,
      color: '#7C3AED',
      bg: '#F5F3FF',
      subtext: 'This month'
    },
  ]

  // Filter / Sort Logic
  const filteredApps = tabApps.filter(app => {
    const candidate = app.candidates || {}
    const job = app.jobs || {}
    
    // Search Term
    const matchSearch =
      candidate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.status?.toLowerCase().includes(searchTerm.toLowerCase())

    // Status Filter
    const isScheduled = !!app.interview_date
    const matchStatus =
      statusFilter === 'all' ||
      (statusFilter === 'scheduled' && isScheduled) ||
      (statusFilter === 'pending' && !isScheduled)

    // Job Profile Filter
    const matchJob = jobFilter === 'all' || job.id === jobFilter

    return matchSearch && matchStatus && matchJob
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.updated_at || b.applied_at).getTime() - new Date(a.updated_at || a.applied_at).getTime()
    }
    if (sortBy === 'oldest') {
      return new Date(a.updated_at || a.applied_at).getTime() - new Date(b.updated_at || b.applied_at).getTime()
    }
    return 0
  })

  // Extract unique jobs for dropdown filter
  const jobOptions = [...new Map(
    tabApps.map(a => a.jobs).filter(Boolean).map(j => [j.id, j])
  ).values()]

  // Get scheduled dates key list to mark in calendar
  const scheduledDates = allApps
    .filter(a => a.interview_date)
    .map(a => {
      // Date parsing helper
      try {
        const cleanDatePart = a.interview_date.split(' at ')[0] || ''
        const parsedDate = new Date(cleanDatePart)
        if (!isNaN(parsedDate.getTime())) {
          return `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`
        }
      } catch {}
      return null
    })
    .filter(Boolean)

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', paddingBottom: 40 }}>

      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-1)', marginBottom: 2 }}>
            Interviews
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 400 }}>
            {isEmptyDB ? '0' : aiApps.length} AI video <span style={{ margin: '0 4px' }}>•</span> {isEmptyDB ? '0' : manualApps.length} manual round
          </p>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search candidates, roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: 34,
                paddingRight: 12,
                height: 38,
                fontSize: 13,
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: '#FFF',
                outline: 'none',
                width: '100%',
                boxShadow: 'none'
              }}
            />
          </div>

          {/* Notifications bell */}
          <NotificationBell />

          {/* Profile Picture */}
          <div style={{ cursor: 'pointer' }}>
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
              alt="Priya Sharma"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--border)'
              }}
            />
          </div>

        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', color: msg.startsWith('✅') ? '#10B981' : '#EF4444', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Tabs Row */}
      <div className="tabs" style={{ marginBottom: 20, display: 'flex', gap: 6, background: '#EFF1F5', padding: 4, borderRadius: 10, width: 'fit-content', flexWrap: 'wrap' }}>
        <button
          className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'ai' ? '#FFF' : 'transparent',
            color: activeTab === 'ai' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'ai' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <Video size={14} /> AI Video Interview ({isEmptyDB ? 0 : aiApps.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'manual' ? '#FFF' : 'transparent',
            color: activeTab === 'manual' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'manual' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <FileText size={14} /> Manual Interview ({isEmptyDB ? 0 : manualApps.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'scheduler' ? 'active' : ''}`}
          onClick={() => setActiveTab('scheduler')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'scheduler' ? '#FFF' : 'transparent',
            color: activeTab === 'scheduler' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'scheduler' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <Calendar size={14} /> Scheduler Link
        </button>
        <button
          className={`tab-btn ${activeTab === 'consent_logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('consent_logs')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === 'consent_logs' ? '#FFF' : 'transparent',
            color: activeTab === 'consent_logs' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'consent_logs' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <FileText size={14} /> Consent Audit Logs
        </button>
      </div>

      {(activeTab === 'ai' || activeTab === 'manual') ? (
        <>
        {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {stats.map((card, idx) => (
          <div key={idx} className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center' }}>
              <card.icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: '1.2', fontFamily: 'var(--font-display)' }}>
                {loading ? '—' : card.value}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, marginTop: 2 }}>{card.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{card.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        {/* Name / query input */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by candidate, job role, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: 38,
              height: 40,
              fontSize: 13,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              outline: 'none',
              boxShadow: 'none'
            }}
          />
        </div>

        {/* Status Dropdown */}
        <div style={{ position: 'relative', width: 160 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="pending">Pending</option>
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Jobs Profile Dropdown */}
        <div style={{ position: 'relative', width: 180 }}>
          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Jobs</option>
            {jobOptions.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Date Filter Dropdown */}
        <div style={{ position: 'relative', width: 160 }}>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Dates</option>
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Sort Dropdown */}
        <div style={{ position: 'relative', width: 160 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Main Two-Column Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 0.8fr',
        gap: 20,
        alignItems: 'flex-start'
      }}>
        
        {/* Left Column: Empty State or Scheduled Cards + Process Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {loading ? (
            <div className="card" style={{ padding: 32 }}>Loading candidates...</div>
          ) : filteredApps.length === 0 ? (
            
            // Empty State Card
            <div className="card" style={{
              borderRadius: 16,
              background: '#FFF',
              border: '1px solid var(--border)',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)'
            }}>
              
              {/* Camera Illustration */}
              <div style={{
                display: 'inline-flex',
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: '#F5F3FF',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 7a2 2 0 0 0-2.45-1.45L16 7V5a2 2 0 0 0-2-2H2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2l4.55 1.45A2 2 0 0 0 23 15z" />
                  <circle cx="6" cy="10" r="2" />
                  <circle cx="12" cy="10" r="1" />
                </svg>
              </div>

              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
                No interviews scheduled yet
              </h2>
              <p style={{ color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6, maxWidth: 440, margin: '0 auto 24px' }}>
                Looks like you don't have any interviews here yet. Transfer candidates to "AI Video Interview" or schedule manual interviews from the hiring pipeline.
              </p>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button
                  onClick={() => navigate('/hiring')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 8,
                    background: '#4F46E5',
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  <Video size={14} /> Transfer to AI Video Interview
                </button>
                <button
                  onClick={() => navigate('/hiring')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 38,
                    padding: '0 16px',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    background: '#FFF',
                    color: 'var(--text-1)',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  <Calendar size={14} /> Schedule Manual Interview
                </button>
              </div>
            </div>
            
          ) : (
            
            // Render Candidates lists
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredApps.map(app => {
                const candidate = app.candidates || {}
                const job = app.jobs || {}
                const waNumber = candidate.phone?.replace(/[^0-9]/g, '')
                const isScheduled = !!app.interview_date

                return (
                  <div key={app.id} className="card" style={{
                    borderRadius: 16,
                    background: '#FFF',
                    border: '1px solid var(--border)',
                    padding: 20,
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)'
                  }}>
                    
                    {/* Upper row details */}
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div className="avatar" style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: '#EEF2FF', color: '#4F46E5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, flexShrink: 0
                      }}>
                        {candidate.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'}
                      </div>

                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{candidate.name}</h3>
                          {isScheduled && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '1px 6px', borderRadius: 99 }}>
                              Scheduled
                            </span>
                          )}
                          <span style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: app.status === 'video_interview' ? '#7C3AED' : '#2563EB',
                            background: app.status === 'video_interview' ? '#F5F3FF' : '#EFF6FF',
                            padding: '1px 6px',
                            borderRadius: 99
                          }}>
                            {app.status === 'video_interview' ? 'AI Video' : 'Manual Round'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                          <Briefcase size={12} color="#4F46E5" />
                          <span style={{
                            fontSize: 12, fontWeight: 600, color: '#4F46E5',
                            background: '#EEF2FF', padding: '2px 8px', borderRadius: 20
                          }}>
                            {job.title}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{job.department}</span>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                          {candidate.email} {candidate.phone && <span style={{ marginLeft: 6 }}>• {candidate.phone}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Schedule block */}
                    {isScheduled && (
                      <div style={{
                        marginTop: 12,
                        padding: '10px 14px',
                        background: '#F8F9FC',
                        borderRadius: 8,
                        fontSize: 12,
                        color: 'var(--text-2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <Calendar size={13} color="#4F46E5" />
                        <span><strong>Scheduled:</strong> {app.interview_date}</span>
                      </div>
                    )}

                    {/* Action footer */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 14,
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                      flexWrap: 'wrap',
                      gap: 12
                    }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact:</span>
                        
                        <a href={candidate.phone ? `tel:${candidate.phone}` : undefined}
                          onClick={!candidate.phone ? e => { e.preventDefault(); alert('No phone number on file.') } : undefined}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>
                          <Phone size={12} color="#10B981" /> Call
                        </a>

                        <button
                          type="button"
                          onClick={() => openInterviewEmail(candidate.email, candidate.name, job.title)}
                          style={{ background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                          <Mail size={12} color="#4F46E5" /> Email
                        </button>

                        <a href={waNumber ? `https://wa.me/${waNumber}?text=Hi ${encodeURIComponent(candidate.name)}, we'd like to confirm your interview schedule.` : undefined}
                          onClick={!waNumber ? e => { e.preventDefault(); alert('No phone number on file.') } : undefined}
                          target="_blank" rel="noopener noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'var(--text-2)', fontSize: 12, fontWeight: 500 }}>
                          <MessageCircle size={12} color="#25D366" /> WhatsApp
                        </a>
                      </div>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setScheduling(app)}
                        style={{ height: 32, padding: '0 12px', fontSize: 12 }}
                      >
                        <Calendar size={12} /> {isScheduled ? 'Reschedule' : 'Schedule'}
                      </button>
                    </div>

                  </div>
                )
              })}
            </div>
            
          )}

          {/* How it works Card */}
          <div className="card" style={{
            borderRadius: 16,
            background: '#FFF',
            border: '1px solid var(--border)',
            padding: 24,
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)'
          }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              How it works
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              {/* Step 1 */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  1
                </div>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Transfer candidates</h4>
                  <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
                    Move shortlisted candidates from the hiring pipeline.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  2
                </div>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Conduct interviews</h4>
                  <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
                    AI video or manual interviews as per your process.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#EEF2FF',
                  color: '#4F46E5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}>
                  3
                </div>
                <div>
                  <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>Make decisions</h4>
                  <p style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 4, lineHeight: 1.4 }}>
                    Evaluate, give feedback and move to next stage.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Upcoming Calendar & Insights */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Calendar Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Upcoming interviews</span>
              <button
                onClick={() => navigate('/interviews')}
                style={{
                  background: '#F5F3FF',
                  color: '#4F46E5',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                View calendar
              </button>
            </div>
            
            <SimpleCalendar scheduledDates={scheduledDates} />
          </div>

          {/* Insights Block */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Interview insights</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)' }}>This month</span>
                <ChevronDown size={12} color="var(--text-3)" />
              </div>
            </div>

            {/* Insights Row Cards */}
            <div className="card" style={{
              borderRadius: 16,
              background: '#FFF',
              border: '1px solid var(--border)',
              padding: 20,
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}>
              
              {/* Total interviews */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#F5F3FF',
                    color: '#7C3AED',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={14} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Total Interviews</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{isEmptyDB ? 0 : totalScheduled}</span>
                  <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>▲ 0%</span>
                </div>
              </div>

              {/* Completed */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#ECFDF5',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={14} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Completed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{isEmptyDB ? 0 : completedCount}</span>
                  <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>▲ 0%</span>
                </div>
              </div>

              {/* Avg Duration */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Clock size={14} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>Avg. Interview Duration</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>0 min</span>
                  <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>▲ 0%</span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>
      </>
    ) : activeTab === 'scheduler' ? (
      <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Calendar scheduling integration</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>Set the live booking link (Cal.com or Google Calendar) for candidates upon consent approval</p>
        
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', maxWidth: 600 }}>
          <input
            type="text"
            placeholder="https://cal.com/company/interview"
            value={schedulerUrl}
            onChange={(e) => {
              const val = e.target.value
              setSchedulerUrl(val)
              localStorage.setItem('company_scheduler_url', val)
            }}
            style={{
              flex: 1,
              height: 40,
              padding: '0 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              outline: 'none'
            }}
          />
          <button 
            className="btn btn-primary"
            onClick={() => {
              localStorage.setItem('company_scheduler_url', schedulerUrl)
              setMsg('✅ Scheduling link saved successfully!')
              window.scrollTo({ top: 0, behavior: 'smooth' })
              setTimeout(() => setMsg(''), 4000)
            }}
            style={{ height: 40, borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Save Link
          </button>
        </div>
      </div>
    ) : (
      <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Candidate consent audit logs</h2>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 18 }}>GDPR compliance immutable log tracking candidates' IP addresses, timestamps, and accepted terms version.</p>

        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Timestamp</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Candidate</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Job Role</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>IP Address</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Status</th>
                <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Policy Version</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 12, color: 'var(--text-3)' }}>
                    No consent events logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #F1F3F9' }}>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)' }}>
                      {new Date(log.timestamp || log.created_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>
                      {log.candidate_name} <br/>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 400 }}>{log.candidate_email}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-2)' }}>
                      {log.job_title}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, fontFamily: 'monospace', color: 'var(--text-2)' }}>
                      {log.ip_address}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11 }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: 99,
                        fontSize: 10,
                        fontWeight: 600,
                        background: log.consent_status === 'accepted' ? '#ECFDF5' : '#FEF2F2',
                        color: log.consent_status === 'accepted' ? '#065F46' : '#991B1B'
                      }}>
                        {log.consent_status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-3)' }}>
                      {log.terms_version}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )}

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
