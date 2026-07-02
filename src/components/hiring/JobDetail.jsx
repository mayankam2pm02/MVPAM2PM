import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { fetchJobs, fetchApplicationsForJob, fetchAllApplications, fetchCandidates, createApplication, createCandidate, updateApplication, deleteApplication, updateJob, resetApplicationScreening, createEmployee } from '../../lib/supabase.js'
import { screenResume, generateJD } from '../../lib/claude.js'
import { extractText, nameFromFile } from '../../lib/fileExtract.js'
import { sendConsentEmail, sendInterviewEmail, sendOfferEmail } from '../../lib/resend.js'
import { ChevronLeft, Upload, Sparkles, Mail, Calendar, CheckCircle, XCircle, FileText, Loader, Send, Star, X, Pencil, RefreshCw, Phone, MessageCircle, Video, GraduationCap, ChevronDown, Download, AlertTriangle, Plus, Trash2, Search, SlidersHorizontal } from 'lucide-react'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const fileRef = useRef()

  const [job,  setJob]  = useState(null)
  const [apps, setApps] = useState([])
  const [candidates, setCandidates] = useState([])
  const [allApplications, setAllApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]   = useState('pipeline')
  const [expandedApp, setExpanded] = useState(null)
  const [screening, setScreening] = useState({})
  const [showUpload, setShowUpload]   = useState(false)
  const [uploadRows, setUploadRows]   = useState([])
  const [dragOver, setDragOver]       = useState(false)
  // Edit job state
  const [showEdit, setShowEdit]       = useState(false)
  const [editStep, setEditStep]       = useState(1)   // 1 = details, 2 = JD
  const [editForm, setEditForm]       = useState({})
  const [editJd, setEditJd]           = useState('')
  const [editQuestions, setEditQuestions] = useState([])
  const [editGenerating, setEditGenerating] = useState(false)
  const [editSaving, setEditSaving]   = useState(false)
  const [editError, setEditError]     = useState('')
  const [jdEdited, setJdEdited]       = useState(false)  // banner after save
  const [feedback, setFeedback]       = useState('')
  const [error, setError]             = useState('')
  const [openDropdown, setOpenDropdown] = useState(null)

  // Pipeline filters
  const [fName,    setFName]    = useState('')
  const [fStatus,  setFStatus]  = useState('all')
  const [fConsent, setFConsent] = useState('all')
  const [fRec,     setFRec]     = useState('all')
  const [fScore,   setFScore]   = useState('all')

  // Bulk selection
  const [selected,       setSelected]       = useState(new Set())
  const [bulkMoveTo,     setBulkMoveTo]     = useState('')
  const [bulkWorking,    setBulkWorking]    = useState(false)

  // Add-from-DB filters
  const [dbFName,    setDbFName]    = useState('')
  const [dbFProfile, setDbFProfile] = useState('all')
  const [dbFStage,   setDbFStage]   = useState('all')
  const [dbFScoreMin,setDbFScoreMin]= useState('')
  const [dbFScoreMax,setDbFScoreMax]= useState('')

  useEffect(() => {
    Promise.all([fetchJobs(), fetchApplicationsForJob(id), fetchCandidates(), fetchAllApplications()])
      .then(([jobs, appsData, cands, allApps]) => {
        setJob(jobs.find(j => j.id === id))
        setApps(appsData)
        setCandidates(cands)
        setAllApplications(allApps)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="card" style={{ padding: '2rem', color: 'var(--text-3)' }}>Loading…</div>
  if (!job)    return <div className="card" style={{ padding: '2rem' }}>Job not found.</div>

  const sorted   = [...apps].sort((a, b) => (b.screen_score || 0) - (a.screen_score || 0))

  const visible = sorted.filter(app => {
    const c   = app.candidates || {}
    const q   = fName.trim().toLowerCase()
    if (q && !((c.name || '').toLowerCase().includes(q)) && !((c.email || '').toLowerCase().includes(q)) && !((c.phone || '').includes(q))) return false
    if (fStatus  !== 'all' && app.status !== fStatus)                          return false
    if (fConsent !== 'all' && app.consent_status !== fConsent)                 return false
    if (fRec     !== 'all' && app.screen_recommendation !== fRec)              return false
    if (fScore !== 'all') {
      const s = app.screen_score
      if (fScore === 'high' && !(s >= 75))                    return false
      if (fScore === 'mid'  && !(s >= 45 && s < 75))         return false
      if (fScore === 'low'  && !(s != null && s < 45))       return false
      if (fScore === 'none' && s != null)                     return false
    }
    return true
  })

  const activeFilters = [fName, fStatus !== 'all' ? fStatus : '', fConsent !== 'all' ? fConsent : '', fRec !== 'all' ? fRec : '', fScore !== 'all' ? fScore : ''].filter(Boolean).length

  function clearFilters() { setFName(''); setFStatus('all'); setFConsent('all'); setFRec('all'); setFScore('all') }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === visible.length && visible.length > 0) {
      setSelected(new Set())
    } else {
      setSelected(new Set(visible.map(a => a.id)))
    }
  }

  async function bulkDelete() {
    const names = visible.filter(a => selected.has(a.id)).map(a => a.candidates?.name || 'Unknown').join(', ')
    if (!confirm(`Delete ${selected.size} candidate(s) from this pipeline?\n\n${names}\n\nThis cannot be undone.`)) return
    setBulkWorking(true)
    try {
      await Promise.all([...selected].map(id => deleteApplication(id)))
      setApps(prev => prev.filter(a => !selected.has(a.id)))
      setSelected(new Set())
    } catch (e) { setError(e.message) }
    setBulkWorking(false)
  }

  async function bulkMove() {
    if (!bulkMoveTo) return
    setBulkWorking(true)
    try {
      const updates = await Promise.all(
        [...selected].map(id => updateApplication(id, { status: bulkMoveTo }))
      )
      setApps(prev => prev.map(a => {
        const upd = updates.find(u => u.id === a.id)
        return upd ? upd : a
      }))
      setSelected(new Set())
      setBulkMoveTo('')
    } catch (e) { setError(e.message) }
    setBulkWorking(false)
  }
  const notAdded = candidates.filter(c => !apps.find(a => a.candidate_id === c.id))

  async function addFromDB(c) {
    try {
      const newApp = await createApplication({ job_id: id, candidate_id: c.id, status: 'applied', consent_status: 'not_sent' })
      setApps(prev => [newApp, ...prev])
    } catch (e) { setError(e.message) }
  }

  function downloadJD() {
    const content = [
      job.title,
      `${job.department} · ${job.location} · ${job.type} · ${job.salary}`,
      job.reporting_to ? `Reporting to: ${job.reporting_to}` : '',
      '',
      job.jd || '',
      ...(job.qualifying_questions?.length ? [
        '',
        '─── QUALIFYING QUESTIONS ───────────────────',
        ...job.qualifying_questions.map((q, i) =>
          `Q${i + 1}${q.dealbreaker ? ' [DEALBREAKER]' : ''}: ${q.question}`
        ),
      ] : []),
    ].filter(l => l !== undefined).join('\n')

    const blob = new Blob([content], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = `JD-${job.title.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function screenOne(app) {
    if (!app.candidates?.cv_text) { setError('No CV text available for AI screening.'); return }
    setScreening(s => ({ ...s, [app.id]: true }))
    try {
      const r = await screenResume({
        cvText: app.candidates.cv_text,
        jd: job.jd,
        candidateName: app.candidates.name,
        qualifyingQuestions: job.qualifying_questions || [],
      })
      const updated = await updateApplication(app.id, {
        screen_score: r.score,
        screen_recommendation: r.recommendation,
        screen_strengths: r.strengths,
        screen_gaps: r.gaps,
        screen_summary: r.summary,
        experience_match: r.experienceMatch,
        skills_match: r.skillsMatch,
        education_match: r.educationMatch,
        qualifying_results: r.qualifyingResults,
        status: 'screened',
        screened_at: new Date().toISOString()
      })
      setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    } catch (e) { setError(e.message) }
    setScreening(s => ({ ...s, [app.id]: false }))
  }

  async function screenAll() {
    for (const app of apps.filter(a => !a.screen_score)) await screenOne(app)
  }

  async function sendConsent(app) {
    try {
      await sendConsentEmail({
        candidateName: app.candidates?.name,
        candidateEmail: app.candidates?.email,
        jobTitle: job.title,
        jobLocation: job.location,
        salary: job.salary,
        consentToken: app.consent_token
      })
      const updated = await updateApplication(app.id, { consent_status: 'pending', consent_sent_at: new Date().toISOString(), status: 'consent_sent' })
      setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    } catch (e) { setError('Email failed: ' + e.message) }
  }

  async function scheduleInterview(app) {
    const d = prompt('Enter interview date & time (e.g. 15 Jan 2025, 2:00 PM):')
    if (!d) return
    try {
      await sendInterviewEmail({ candidateName: app.candidates?.name, candidateEmail: app.candidates?.email, jobTitle: job.title, interviewDate: d })
      const updated = await updateApplication(app.id, { interview_date: d, status: 'interview_scheduled', interview_scheduled_at: new Date().toISOString() })
      setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    } catch (e) { setError(e.message) }
  }

  async function submitFeedback(app) {
    if (!feedback.trim()) return
    const updated = await updateApplication(app.id, { interview_feedback: feedback, status: 'interview_done', interview_done_at: new Date().toISOString() })
    setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    setFeedback(''); setExpanded(null)
  }

  async function markHired(app) {
    const candName = app.candidates?.name || 'this candidate'
    const interviewedStatuses = ['video_interview', 'manual_round', 'interview_scheduled', 'interview_done']
    const hadInterview = interviewedStatuses.includes(app.status)

    if (!hadInterview) {
      const proceed = confirm(
        `⚠️ No interview on record for ${candName}.\n\n` +
        `Current stage: "${app.status?.replace(/_/g, ' ')}"\n\n` +
        `Are you sure you want to mark them as Hired without conducting any interview?\n\n` +
        `Click OK to confirm direct hire, or Cancel to go back.`
      )
      if (!proceed) return
    } else {
      if (!confirm(`Mark ${candName} as Hired?`)) return
    }

    const empId     = `EMP${Date.now().toString().slice(-6)}`
    const candEmail = app.candidates?.email || `emp.${empId}@internal.local`
    const isRealEmail = !candEmail.includes('@noemail.local') && !candEmail.includes('@internal.local')

    try {
      // 1 — create employee record (critical — email NOT NULL so always pass a value)
      await createEmployee({
        emp_id:          empId,
        candidate_id:    app.candidate_id,
        application_id:  app.id,
        name:            candName,
        email:           candEmail,
        job_title:       job.title,
        department:      job.department,
        location:        job.location,
        status:          'active',
        date_of_joining: new Date().toISOString().slice(0, 10),
      })

      // 2 — mark application as hired (critical)
      const updated = await updateApplication(app.id, {
        status:   'hired',
        hired_at: new Date().toISOString(),
        emp_id:   empId,
      })
      setApps(prev => prev.map(a => a.id === app.id ? updated : a))

      // 3 — send offer email (best-effort — never blocks the hire)
      let emailNote = ''
      if (isRealEmail) {
        try {
          await sendOfferEmail({ candidateName: candName, candidateEmail: candEmail, jobTitle: job.title, salary: job.salary })
          emailNote = '\nOffer email sent to candidate.'
        } catch {
          emailNote = '\nOffer email could not be sent (check Resend config).'
        }
      }

      alert(`✅ ${candName} hired! Employee ID: ${empId}${emailNote}\n\nThey are now available in the Training section.`)
    } catch (e) {
      setError(e.message || 'Failed to complete hire. Please try again.')
    }
  }

  async function handleStatusChange(app, newStatus) {
    setOpenDropdown(null)
    if (newStatus === 'hired') { await markHired(app); return }
    try {
      const updated = await updateApplication(app.id, { status: newStatus })
      setApps(prev => prev.map(a => a.id === app.id ? updated : a))
    } catch (e) { setError('Status update failed: ' + e.message) }
  }

  async function handleUploadFiles(files) {
    const list = Array.from(files)
    if (!list.length) return

    // Append placeholder rows immediately so user sees progress
    const startIdx = uploadRows.length
    setUploadRows(prev => [
      ...prev,
      ...list.map(file => ({ file, name: nameFromFile(file.name), cvText: '', status: 'extracting', msg: 'Extracting…' }))
    ])

    for (let i = 0; i < list.length; i++) {
      const idx = startIdx + i
      const file = list[i]
      const name = nameFromFile(file.name)
      // placeholder email keeps DB constraint happy; can be updated later via Settings
      const placeholderEmail = `cv.import.${Date.now()}.${i}@noemail.local`

      try {
        // Step 1 — extract text
        const cvText = await extractText(file)
        setUploadRows(prev => prev.map((r, j) => j === idx ? { ...r, cvText, status: 'saving', msg: 'Saving…' } : r))

        // Parse email + phone from CV text
        const emailMatch = cvText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)
        const phoneMatch = cvText.match(/(?:\+?91[-.\s]?)?[6-9]\d{9}|(?:\+?[1-9]\d{0,2}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/)
        const extractedEmail = emailMatch ? emailMatch[0] : placeholderEmail
        const extractedPhone = phoneMatch ? phoneMatch[0].replace(/[-.\s]/g, '').trim() : null

        // Step 2 — create candidate + application in one shot
        const cand = await createCandidate({
          name, email: extractedEmail, phone: extractedPhone || undefined, cv_text: cvText, source: 'upload', status: 'available'
        })
        const newApp = await createApplication({ job_id: id, candidate_id: cand.id, status: 'applied', consent_status: 'not_sent' })
        setApps(prev => [{ ...newApp, candidates: cand }, ...prev])
        setUploadRows(prev => prev.map((r, j) => j === idx ? { ...r, status: 'done', msg: 'Added to pipeline' } : r))
      } catch (e) {
        setUploadRows(prev => prev.map((r, j) => j === idx ? { ...r, status: 'error', msg: e.message || 'Failed' } : r))
      }
    }
  }

  function openEdit() {
    setEditForm({
      title:       job.title        || '',
      department:  job.department   || '',
      location:    job.location     || '',
      type:        job.type         || 'Full-time',
      salary:      job.salary       || '',
      reportingTo: job.reporting_to || '',
      skills:      job.skills       || '',
      experience:  job.experience   || '',
      description: job.description  || '',
    })
    setEditJd(job.jd || '')
    setEditQuestions(job.qualifying_questions ? [...job.qualifying_questions] : [])
    setEditStep(1)
    setEditError('')
    setShowEdit(true)
  }

  function addEQ()          { setEditQuestions(prev => [...prev, { question: '', dealbreaker: false }]) }
  function removeEQ(i)      { setEditQuestions(prev => prev.filter((_, j) => j !== i)) }
  function setEQ(i, k, v)   { setEditQuestions(prev => prev.map((q, j) => j === i ? { ...q, [k]: v } : q)) }

  async function handleEditGenerateJD() {
    if (!editForm.title || !editForm.department || !editForm.location || !editForm.salary) {
      setEditError('Fill Role, Department, Location and Salary first.')
      return
    }
    setEditError('')
    setEditGenerating(true)
    try {
      const jd = await generateJD(editForm)
      setEditJd(jd)
      setEditStep(2)
    } catch (e) {
      setEditError('AI error: ' + e.message)
    } finally {
      setEditGenerating(false)
    }
  }

  async function handleEditSave() {
    setEditSaving(true)
    setEditError('')
    try {
      const updated = await updateJob(id, {
        title:                editForm.title,
        department:           editForm.department,
        location:             editForm.location,
        type:                 editForm.type,
        salary:               editForm.salary,
        reporting_to:         editForm.reportingTo,
        skills:               editForm.skills,
        experience:           editForm.experience,
        description:          editForm.description,
        jd:                   editJd,
        qualifying_questions: editQuestions.filter(q => q.question.trim()),
      })
      // Reset all AI screening results so Screen All becomes active
      await resetApplicationScreening(id)
      // Update local state
      setJob(updated)
      setApps(prev => prev.map(a => ({
        ...a,
        screen_score: null, screen_recommendation: null,
        screen_strengths: null, screen_gaps: null,
        screen_summary: null, experience_match: null,
        skills_match: null, education_match: null, screened_at: null
      })))
      setShowEdit(false)
      setJdEdited(true)
    } catch (e) {
      setEditError(e.message || 'Failed to save changes.')
    } finally {
      setEditSaving(false)
    }
  }

  const depts = ['Sales','Engineering','Marketing','HR','Operations','Finance','Customer Success']
  const setEF  = (k, v) => setEditForm(f => ({ ...f, [k]: v }))

  const recColor = { shortlist: 'success', maybe: 'warning', reject: 'danger' }
  const statusColor = { hired: 'success', interview_done: 'info', interview_scheduled: 'purple', screened: 'brand', applied: 'gray', video_interview: 'purple', manual_round: 'brand', rejected: 'danger', consent_accepted: 'success', shortlisted: 'brand' }

  return (
    <div>
      <button onClick={() => navigate('/hiring')} className="btn btn-ghost btn-sm" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}><ChevronLeft size={15} /> Back</button>

      <div className="card" style={{ marginBottom: 14, padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, marginBottom: 8 }}>{job.title}</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span className="badge badge-gray">{job.department}</span>
              <span className="badge badge-gray">{job.location}</span>
              <span className="badge badge-gray">{job.type}</span>
              <span className="badge badge-info">{job.salary}</span>
              <span className={`badge badge-${job.status === 'active' ? 'success' : 'gray'}`}>{job.status}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" onClick={openEdit}><Pencil size={13} /> Edit Job</button>
            {tab === 'pipeline' && (
              <>
                <button className="btn btn-ghost btn-sm" onClick={downloadJD}><Download size={13} /> Download JD</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowUpload(true)}><Upload size={13} /> Upload CV</button>
                {apps.some(a => a.candidates?.cv_text && !a.screen_score) &&
                  <button className="btn btn-primary btn-sm" onClick={screenAll}><Sparkles size={13} /> Screen all</button>}
              </>
            )}
          </div>
        </div>
        {jdEdited && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--warning-bg, #fffbeb)', border: '1px solid var(--warning)', color: 'var(--warning)', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 12 }}>
            <RefreshCw size={13} />
            <span>JD updated — all previous screening results have been cleared. Click <strong>Screen all</strong> to re-screen candidates against the new JD.</span>
            <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', padding: '2px 6px' }} onClick={() => setJdEdited(false)}><X size={12} /></button>
          </div>
        )}
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 12 }}>{error}</div>}
      </div>

      <div className="tabs">
        {[['pipeline','Pipeline'],['jd','Job Description'],['source','Add from DB']].map(([k,l]) => (
          <button key={k} className={`tab-btn ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <div>
          {openDropdown && <div style={{ position:'fixed', inset:0, zIndex:99 }} onClick={() => setOpenDropdown(null)}/>}

          {/* ── Filter bar ── */}
          {apps.length > 0 && (
            <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

                {/* Text search */}
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 180 }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
                  <input
                    value={fName}
                    onChange={e => setFName(e.target.value)}
                    placeholder="Search name, email or phone…"
                    style={{ paddingLeft: 30, fontSize: 13, height: 36 }}
                  />
                </div>

                {/* Stage / Status */}
                <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={{ fontSize: 13, height: 36, flex: '1 1 150px', minWidth: 140 }}>
                  <option value="all">Stage</option>
                  <option value="applied">Applied</option>
                  <option value="screened">Screened</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="video_interview">AI Video Interview</option>
                  <option value="manual_round">Manual Round</option>
                  <option value="interview_scheduled">Interview Scheduled</option>
                  <option value="interview_done">Interview Done</option>
                  <option value="consent_sent">Consent Sent</option>
                  <option value="offer_sent">Offer Sent</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>

                {/* AI Score */}
                <select value={fScore} onChange={e => setFScore(e.target.value)} style={{ fontSize: 13, height: 36, flex: '1 1 130px', minWidth: 120 }}>
                  <option value="all">Score</option>
                  <option value="high">Strong (75+)</option>
                  <option value="mid">Average (45–74)</option>
                  <option value="low">Weak (&lt;45)</option>
                  <option value="none">Not Screened</option>
                </select>

                {/* Recommendation */}
                <select value={fRec} onChange={e => setFRec(e.target.value)} style={{ fontSize: 13, height: 36, flex: '1 1 130px', minWidth: 120 }}>
                  <option value="all">Recommendation</option>
                  <option value="shortlist">Shortlist</option>
                  <option value="maybe">Maybe</option>
                  <option value="reject">Reject</option>
                </select>

                {/* Consent */}
                <select value={fConsent} onChange={e => setFConsent(e.target.value)} style={{ fontSize: 13, height: 36, flex: '1 1 130px', minWidth: 120 }}>
                  <option value="all">Consent</option>
                  <option value="accepted">Consented</option>
                  <option value="pending">Pending</option>
                  <option value="not_sent">Not Sent</option>
                  <option value="declined">Declined</option>
                </select>

                {/* Active filter indicator + clear */}
                {activeFilters > 0 && (
                  <button onClick={clearFilters} className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--brand)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    <X size={13} />
                    Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
                  </button>
                )}
              </div>

              {/* Result count + select all */}
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', margin: 0, fontSize: 12, color: 'var(--text-2)', fontWeight: 500, userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={visible.length > 0 && selected.size === visible.length}
                    ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < visible.length }}
                    onChange={toggleSelectAll}
                    style={{ width: 15, height: 15, accentColor: 'var(--brand)', cursor: 'pointer' }}
                  />
                  Select all
                </label>
                <span style={{ color: 'var(--border)' }}>|</span>
                <SlidersHorizontal size={12} />
                Showing <strong style={{ color: 'var(--text-1)' }}>{visible.length}</strong> of <strong style={{ color: 'var(--text-1)' }}>{apps.length}</strong> candidates
                {activeFilters > 0 && <span>· <span style={{ color: 'var(--brand)' }}>{activeFilters} filter{activeFilters > 1 ? 's' : ''} active</span></span>}
                {selected.size > 0 && <span>· <strong style={{ color: 'var(--brand)' }}>{selected.size} selected</strong></span>}
              </div>
            </div>
          )}

          {/* ── Bulk action bar ── */}
          {selected.size > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
              padding: '10px 16px', marginBottom: 10, borderRadius: 10,
              background: 'var(--brand)', color: '#fff',
              boxShadow: '0 4px 16px rgba(79,70,229,0.3)'
            }}>
              <span style={{ fontWeight: 700, fontSize: 13, marginRight: 4 }}>
                {selected.size} selected
              </span>

              {/* Bulk move */}
              <select
                value={bulkMoveTo}
                onChange={e => setBulkMoveTo(e.target.value)}
                style={{ fontSize: 13, padding: '6px 10px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', minWidth: 160 }}
              >
                <option value="" style={{ color: '#000' }}>Move to stage…</option>
                <option value="screened"            style={{ color: '#000' }}>Screened</option>
                <option value="shortlisted"         style={{ color: '#000' }}>Shortlisted</option>
                <option value="video_interview"     style={{ color: '#000' }}>AI Video Interview</option>
                <option value="manual_round"        style={{ color: '#000' }}>Manual Round</option>
                <option value="interview_scheduled" style={{ color: '#000' }}>Interview Scheduled</option>
                <option value="interview_done"      style={{ color: '#000' }}>Interview Done</option>
                <option value="offer_sent"          style={{ color: '#000' }}>Offer Sent</option>
                <option value="rejected"            style={{ color: '#000' }}>Rejected</option>
              </select>
              <button
                onClick={bulkMove}
                disabled={!bulkMoveTo || bulkWorking}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: bulkMoveTo ? 'pointer' : 'not-allowed', opacity: bulkMoveTo ? 1 : 0.5 }}
              >
                {bulkWorking ? 'Applying…' : 'Apply'}
              </button>

              <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />

              {/* Bulk delete */}
              <button
                onClick={bulkDelete}
                disabled={bulkWorking}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 7, border: 'none', background: 'rgba(239,68,68,0.25)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                <Trash2 size={13} /> Delete
              </button>

              {/* Clear selection */}
              <button
                onClick={() => setSelected(new Set())}
                style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, cursor: 'pointer' }}
              >
                <X size={12} /> Clear
              </button>
            </div>
          )}

          {apps.length === 0
            ? <div className="card empty-state"><div className="icon">👤</div><h3>No candidates yet</h3><p>Upload a CV or add from the database.</p></div>
            : visible.length === 0
              ? (
                <div className="card empty-state">
                  <div className="icon">🔍</div>
                  <h3>No candidates match your filters</h3>
                  <p style={{ marginBottom: 12 }}>Try adjusting or clearing the active filters.</p>
                  <button className="btn btn-secondary btn-sm" onClick={clearFilters}><X size={13} /> Clear all filters</button>
                </div>
              )
            : visible.map(app => {
              const candidate   = app.candidates || {}
              const phone       = candidate.phone
              const email       = candidate.email
              const name        = candidate.name || ''
              const waNumber    = phone?.replace(/[^0-9]/g, '')
              const consented   = app.consent_status === 'accepted'

              const isSelected = selected.has(app.id)
              return (
              <div key={app.id} className="card" style={{ marginBottom: 10, padding: '1rem 1.25rem', outline: isSelected ? '2px solid var(--brand)' : 'none', outlineOffset: -1, borderRadius: 12, transition: 'outline .1s' }}>

                {/* ── Top row: checkbox + identity + score + status badges ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(app.id)}
                    style={{ width: 16, height: 16, accentColor: 'var(--brand)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <div className="avatar">{name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{email}</div>
                    {phone && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>{phone}</div>}
                  </div>

                  {/* AI score */}
                  {screening[app.id]
                    ? <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Screening…</span>
                    : app.screen_score
                      ? <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2.5px solid ${app.screen_score >= 75 ? 'var(--success)' : app.screen_score >= 50 ? 'var(--warning)' : 'var(--danger)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: app.screen_score >= 75 ? 'var(--success)' : app.screen_score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{app.screen_score}</div>
                          <span className={`badge badge-${recColor[app.screen_recommendation] || 'gray'}`}>{app.screen_recommendation}</span>
                        </div>
                      : <button className="btn btn-secondary btn-sm" onClick={() => screenOne(app)}><Sparkles size={12} /> Screen</button>
                  }

                  {/* Consent badge */}
                  {consented
                    ? <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={11} /> Consented
                      </span>
                    : <span className={`badge badge-${app.consent_status === 'pending' ? 'warning' : app.consent_status === 'declined' ? 'danger' : 'gray'}`}>
                        {app.consent_status === 'not_sent' ? 'No consent' : app.consent_status}
                      </span>
                  }

                  {/* Pipeline status */}
                  <span className={`badge badge-${statusColor[app.status] || 'gray'}`}>{app.status?.replace(/_/g, ' ')}</span>
                </div>

                {/* ── Bottom action bar ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>

                  {/* Contact buttons — always visible */}
                  <span style={{ fontSize: 11, color: 'var(--text-3)', marginRight: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</span>
                  <a
                    href={phone ? `tel:${phone}` : undefined}
                    onClick={!phone ? e => { e.preventDefault(); alert('No phone number on file for this candidate.') } : undefined}
                    className="btn btn-ghost btn-sm"
                    title="Call candidate"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Phone size={13} style={{ color: 'var(--success)' }} /> Call
                  </a>
                  <a
                    href={email ? `mailto:${email}?subject=Regarding your application for ${job.title}` : undefined}
                    onClick={!email ? e => { e.preventDefault(); alert('No email on file for this candidate.') } : undefined}
                    className="btn btn-ghost btn-sm"
                    title="Email candidate"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Mail size={13} style={{ color: 'var(--brand)' }} /> Email
                  </a>
                  <a
                    href={waNumber ? `https://wa.me/${waNumber}?text=Hi ${encodeURIComponent(name)}, we'd like to discuss your application for the ${encodeURIComponent(job.title)} role.` : undefined}
                    onClick={!waNumber ? e => { e.preventDefault(); alert('No phone number on file for this candidate.') } : undefined}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    title="WhatsApp candidate"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}
                  >
                    <MessageCircle size={13} style={{ color: '#25d366' }} /> WhatsApp
                  </a>

                  {/* Divider */}
                  <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

                  {/* Screening details */}
                  {app.screen_score && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(expandedApp === app.id ? null : app.id)} title="View screening details">
                      <FileText size={13} /> Details
                    </button>
                  )}

                  {/* Send Consent — explicit email action kept separate */}
                  {app.screen_recommendation === 'shortlist' && app.consent_status === 'not_sent' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => sendConsent(app)}>
                      <Mail size={13} /> Send Consent
                    </button>
                  )}

                  {/* Move to dropdown */}
                  <div style={{ position: 'relative', zIndex: 100 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setOpenDropdown(openDropdown === app.id ? null : app.id)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      Move to <ChevronDown size={12} />
                    </button>
                    {openDropdown === app.id && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', right: 0,
                        background: '#fff', border: '1px solid var(--border)',
                        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.14)',
                        minWidth: 220, overflow: 'hidden', zIndex: 200
                      }}>
                        {[
                          { label: 'Transfer to Video Interview', value: 'video_interview', icon: <Video size={13}/>,        color: 'var(--brand)' },
                          { label: 'Selected for Manual Round',   value: 'manual_round',    icon: <FileText size={13}/>,     color: 'var(--text-2)' },
                          { label: 'Hired',                       value: 'hired',            icon: <CheckCircle size={13}/>,  color: 'var(--success)' },
                          { label: 'Rejected',                    value: 'rejected',         icon: <XCircle size={13}/>,      color: 'var(--danger)' },
                        ].map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => handleStatusChange(app, opt.value)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 9,
                              width: '100%', padding: '10px 14px',
                              background: 'none', border: 'none', borderBottom: '1px solid var(--border)',
                              cursor: 'pointer', fontSize: 13, color: opt.color, textAlign: 'left'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                          >
                            {opt.icon} {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* View in Training — shown only after hired */}
                  {app.status === 'hired' && (
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => navigate('/training')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      title="Candidate is enrolled in Training"
                    >
                      <GraduationCap size={13} /> View in Training
                    </button>
                  )}
                </div>

                {expandedApp === app.id && app.screen_score && (
                  <div style={{ marginTop: 14, padding: '1rem', background: 'var(--surface-2)', borderRadius: 8, borderTop: '1px solid var(--border)' }}>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', fontStyle: 'italic', marginBottom: 12 }}>{app.screen_summary}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                      {[['Experience', app.experience_match], ['Skills', app.skills_match], ['Education', app.education_match]].map(([l, v]) => (
                        <div key={l}>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>{l} match</div>
                          <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${v || 0}%`, background: (v||0) >= 70 ? 'var(--success)' : (v||0) >= 40 ? 'var(--warning)' : 'var(--danger)' }} /></div>
                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 3 }}>{v || 0}%</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Strengths</div>
                        {(app.screen_strengths || []).map((s, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '2px 0' }}>• {s}</div>)}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}><XCircle size={12} /> Gaps</div>
                        {(app.screen_gaps || []).length ? (app.screen_gaps).map((g, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', padding: '2px 0' }}>• {g}</div>) : <div style={{ fontSize: 12, color: 'var(--text-3)' }}>None identified</div>}
                      </div>
                    </div>
                    {app.status === 'interview_scheduled' && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>📅 Interview: {app.interview_date}</div>
                        <label>Post-interview feedback</label>
                        <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Observations…" style={{ minHeight: 80, marginBottom: 8 }} />
                        <button className="btn btn-primary btn-sm" onClick={() => submitFeedback(app)}><Send size={13} /> Submit feedback</button>
                      </div>
                    )}
                    {app.interview_feedback && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 4 }}>Interview feedback</div>
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{app.interview_feedback}</p>
                      </div>
                    )}

                    {/* Qualifying question results */}
                    {app.qualifying_results?.length > 0 && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={13} color="var(--warning)" /> Qualifying Questions
                        </div>
                        {app.qualifying_results.map((r, i) => {
                          const answerColor = r.inferredAnswer === 'Yes' ? 'var(--success)'
                            : r.inferredAnswer === 'No' ? 'var(--danger)'
                            : r.inferredAnswer === 'Partial' ? 'var(--warning)'
                            : 'var(--text-3)'
                          return (
                            <div key={i} style={{
                              padding: '8px 10px', marginBottom: 6, borderRadius: 7,
                              background: r.dealbreaker && r.inferredAnswer === 'No'
                                ? 'rgba(239,68,68,0.07)' : 'var(--bg)',
                              border: `1px solid ${r.dealbreaker && r.inferredAnswer === 'No' ? 'var(--danger)' : 'var(--border)'}`
                            }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {r.dealbreaker && <AlertTriangle size={11} color="var(--warning)" />}
                                    {r.question}
                                  </div>
                                  {r.notes && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontStyle: 'italic' }}>{r.notes}</div>}
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 12, color: answerColor }}>{r.inferredAnswer}</div>
                                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{r.confidence} confidence</div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'jd' && (
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Job Description</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={downloadJD}>
                  <Download size={12} style={{ marginRight: 4 }} />Download JD
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => { openEdit(); setEditStep(2) }}>
                  <Pencil size={12} style={{ marginRight: 4 }} />Edit JD
                </button>
              </div>
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.8, margin: 0 }}>{job.jd}</pre>
          </div>

          {/* Qualifying questions panel */}
          {job.qualifying_questions?.length > 0 && (
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} color="var(--warning)" />
                Qualifying Questions ({job.qualifying_questions.length})
              </div>
              {job.qualifying_questions.map((q, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 0', borderBottom: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', minWidth: 24 }}>Q{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>{q.question}</span>
                  {q.dealbreaker && (
                    <span className="badge badge-warning" style={{ fontSize: 10, flexShrink: 0 }}>
                      Dealbreaker
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'source' && (() => {
        const stageOrder = ['applied','screened','shortlisted','consent_sent','consent_accepted','video_interview','manual_round','interview_scheduled','interview_done','offer_sent','hired','rejected']
        const stageBadgeColor = { hired:'success', rejected:'danger', offer_sent:'brand', interview_done:'info', interview_scheduled:'purple', video_interview:'purple', manual_round:'brand', shortlisted:'brand', screened:'gray', applied:'gray', consent_accepted:'success', consent_sent:'gray' }

        // Enrich each candidate with their prior app data
        const enriched = notAdded.map(c => {
          const priorApps  = allApplications.filter(a => a.candidate_id === c.id && a.job_id !== id)
          const primaryJob = priorApps[0]?.jobs || null
          const extraCount = priorApps.length > 1 ? priorApps.length - 1 : 0
          const scoredApp  = [...priorApps].sort((a,b) => (b.screen_score||0)-(a.screen_score||0)).find(a => a.screen_score != null)
          const bestScore  = scoredApp?.screen_score ?? null
          const bestRec    = scoredApp?.screen_recommendation ?? null
          const latestStage= [...priorApps].sort((a,b) => stageOrder.indexOf(b.status)-stageOrder.indexOf(a.status))[0]?.status ?? null
          return { c, priorApps, primaryJob, extraCount, bestScore, bestRec, latestStage }
        })

        // Unique profiles for filter dropdown
        const profileOptions = [...new Map(enriched.flatMap(e => e.priorApps.map(a => a.jobs).filter(Boolean)).map(j => [j.id, j])).values()]

        // Apply filters
        const dbFiltered = enriched.filter(({ c, primaryJob, bestScore, latestStage }) => {
          if (dbFName.trim() && !(c.name||'').toLowerCase().includes(dbFName.trim().toLowerCase())) return false
          if (dbFProfile !== 'all' && primaryJob?.id !== dbFProfile) return false
          if (dbFStage   !== 'all' && latestStage !== dbFStage) return false
          const min = dbFScoreMin !== '' ? Number(dbFScoreMin) : null
          const max = dbFScoreMax !== '' ? Number(dbFScoreMax) : null
          if (min !== null || max !== null) {
            if (bestScore === null) return false
            if (min !== null && bestScore < min) return false
            if (max !== null && bestScore > max) return false
          }
          return true
        })

        const dbActiveFilters = [dbFName, dbFProfile !== 'all' ? dbFProfile : '', dbFStage !== 'all' ? dbFStage : '', dbFScoreMin, dbFScoreMax].filter(Boolean).length
        function clearDbFilters() { setDbFName(''); setDbFProfile('all'); setDbFStage('all'); setDbFScoreMin(''); setDbFScoreMax('') }

        return (
          <div>
            {/* ── Filter card ── */}
            {notAdded.length > 0 && (
              <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

                  {/* Name search */}
                  <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 160 }}>
                    <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-3)', pointerEvents:'none' }} />
                    <input value={dbFName} onChange={e => setDbFName(e.target.value)}
                      placeholder="Search name…"
                      style={{ paddingLeft: 30, fontSize: 13, height: 36 }} />
                  </div>

                  {/* Profile / job */}
                  <select value={dbFProfile} onChange={e => setDbFProfile(e.target.value)}
                    style={{ fontSize: 13, height: 36, flex: '1 1 160px', minWidth: 140 }}>
                    <option value="all">Profile</option>
                    {profileOptions.map(j => <option key={j.id} value={j.id}>{j.title}{j.department ? ` (${j.department})` : ''}</option>)}
                  </select>

                  {/* Last stage */}
                  <select value={dbFStage} onChange={e => setDbFStage(e.target.value)}
                    style={{ fontSize: 13, height: 36, flex: '1 1 140px', minWidth: 130 }}>
                    <option value="all">Last Stage</option>
                    {stageOrder.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                  </select>

                  {/* Score range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>Score</span>
                    <input type="number" min="0" max="100" value={dbFScoreMin}
                      onChange={e => setDbFScoreMin(e.target.value)}
                      placeholder="Min"
                      style={{ width: 60, fontSize: 13, height: 36, padding: '0 8px', textAlign: 'center' }} />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>–</span>
                    <input type="number" min="0" max="100" value={dbFScoreMax}
                      onChange={e => setDbFScoreMax(e.target.value)}
                      placeholder="Max"
                      style={{ width: 60, fontSize: 13, height: 36, padding: '0 8px', textAlign: 'center' }} />
                  </div>

                  {dbActiveFilters > 0 && (
                    <button onClick={clearDbFilters} className="btn btn-ghost btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--brand)', whiteSpace: 'nowrap' }}>
                      <X size={13} /> Clear {dbActiveFilters} filter{dbActiveFilters > 1 ? 's' : ''}
                    </button>
                  )}
                </div>

                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <SlidersHorizontal size={12} />
                  Showing <strong style={{ color:'var(--text-1)' }}>{dbFiltered.length}</strong> of <strong style={{ color:'var(--text-1)' }}>{notAdded.length}</strong> candidates
                  {dbActiveFilters > 0 && <span>· <span style={{ color:'var(--brand)' }}>{dbActiveFilters} filter{dbActiveFilters > 1 ? 's' : ''} active</span></span>}
                </div>
              </div>
            )}

            {/* ── Candidate list ── */}
            {notAdded.length === 0
              ? <div className="card empty-state"><div className="icon">✅</div><h3>All candidates added</h3></div>
              : dbFiltered.length === 0
                ? (
                  <div className="card empty-state">
                    <div className="icon">🔍</div>
                    <h3>No candidates match your filters</h3>
                    <p style={{ marginBottom: 12 }}>Try adjusting or clearing the filters.</p>
                    <button className="btn btn-secondary btn-sm" onClick={clearDbFilters}><X size={13} /> Clear filters</button>
                  </div>
                )
                : dbFiltered.map(({ c, primaryJob, extraCount, bestScore, bestRec, latestStage }) => {
                  const scoreColor = bestScore == null ? 'var(--text-3)' : bestScore >= 75 ? 'var(--success)' : bestScore >= 45 ? 'var(--warning)' : 'var(--danger)'

                  return (
                    <div key={c.id} className="card" style={{ marginBottom: 8, padding: '0.875rem 1.25rem' }}>
                      {/* ── Single layout row ── */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

                        {/* Avatar */}
                        <div className="avatar" style={{ flexShrink: 0 }}>
                          {c.name?.split(' ').map(w=>w[0]).join('').slice(0,2)}
                        </div>

                        {/* Name + single info line */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{c.name}</div>

                          {/* ── One info line: Profile · Stage · Score · Rating ── */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>

                            {/* Profile */}
                            {primaryJob ? (
                              <>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.04em', flexShrink:0 }}>Profile</span>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', background: 'var(--brand-light)', padding: '2px 8px', borderRadius: 20, whiteSpace:'nowrap' }}>
                                  {primaryJob.title}
                                </span>
                                {extraCount > 0 && <span className="badge badge-gray" style={{ fontSize: 10 }}>+{extraCount}</span>}
                                <span style={{ color: 'var(--border)', fontSize: 14, lineHeight: 1 }}>|</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No profile</span>
                                <span style={{ color: 'var(--border)', fontSize: 14, lineHeight: 1 }}>|</span>
                              </>
                            )}

                            {/* Last stage */}
                            {latestStage ? (
                              <>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.04em', flexShrink:0 }}>Stage</span>
                                <span className={`badge badge-${stageBadgeColor[latestStage]||'gray'}`} style={{ fontSize: 11, whiteSpace:'nowrap' }}>
                                  {latestStage.replace(/_/g,' ')}
                                </span>
                                <span style={{ color: 'var(--border)', fontSize: 14, lineHeight: 1 }}>|</span>
                              </>
                            ) : (
                              <>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No stage</span>
                                <span style={{ color: 'var(--border)', fontSize: 14, lineHeight: 1 }}>|</span>
                              </>
                            )}

                            {/* AI Score */}
                            {bestScore != null ? (
                              <>
                                <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform:'uppercase', letterSpacing:'0.04em', flexShrink:0 }}>Score</span>
                                <span style={{ fontSize: 13, fontWeight: 800, color: scoreColor }}>{bestScore}</span>
                                {bestRec && <span style={{ fontSize: 11, color: scoreColor, fontWeight: 600, textTransform:'uppercase' }}>{bestRec}</span>}
                              </>
                            ) : (
                              <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>Not screened</span>
                            )}

                            {/* Rating */}
                            {c.rating != null && (
                              <>
                                <span style={{ color: 'var(--border)', fontSize: 14, lineHeight: 1 }}>|</span>
                                <Star size={11} color="var(--warning)" fill="var(--warning)" />
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>{c.rating}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Add button */}
                        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0 }} onClick={() => addFromDB(c)}>
                          Add to pipeline
                        </button>
                      </div>
                    </div>
                  )
                })
            }
          </div>
        )
      })()}

      {/* ── Edit Job Modal ──────────────────────────────────── */}
      {showEdit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#ffffff', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: editStep === 2 ? 720 : 560, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 17 }}><Pencil size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Edit Job Post</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
                  {[['1', 'Job Details'], ['2', 'Review JD']].map(([n, l], i) => (
                    <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 22, height: 22, borderRadius: '50%', background: editStep >= +n ? 'var(--brand)' : 'var(--border)', color: editStep >= +n ? '#fff' : 'var(--text-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{n}</span>
                      <span style={{ fontSize: 12, color: editStep === +n ? 'var(--text-1)' : 'var(--text-3)', fontWeight: editStep === +n ? 600 : 400 }}>{l}</span>
                      {i === 0 && <span style={{ width: 28, height: 1, background: 'var(--border)', display: 'inline-block' }} />}
                    </span>
                  ))}
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowEdit(false)}><X size={16} /></button>
            </div>

            {/* Step 1 — Edit details */}
            {editStep === 1 && (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Job Title *</label>
                    <input value={editForm.title} onChange={e => setEF('title', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Location *</label>
                    <input value={editForm.location} onChange={e => setEF('location', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Department *</label>
                    <select value={editForm.department} onChange={e => setEF('department', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Select…</option>
                      {depts.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Employment Type</label>
                    <select value={editForm.type} onChange={e => setEF('type', e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }}>
                      {['Full-time', 'Part-time', 'Contract', 'Internship'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Salary Range *</label>
                    <input value={editForm.salary} onChange={e => setEF('salary', e.target.value)} placeholder="e.g. ₹8–12 LPA" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Reporting To</label>
                    <input value={editForm.reportingTo} onChange={e => setEF('reportingTo', e.target.value)} placeholder="e.g. VP Sales" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Key Skills</label>
                    <input value={editForm.skills} onChange={e => setEF('skills', e.target.value)} placeholder="e.g. B2B Sales, Salesforce" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Relevant Experience</label>
                    <input value={editForm.experience} onChange={e => setEF('experience', e.target.value)} placeholder="e.g. 3–5 years in B2B SaaS sales" style={{ width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Additional Description / Context</label>
                    <textarea value={editForm.description} onChange={e => setEF('description', e.target.value)}
                      placeholder="Team culture, key priorities, deal-breakers, company stage…"
                      style={{ width: '100%', boxSizing: 'border-box', minHeight: 80, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }} />
                  </div>
                </div>

                {/* Qualifying questions editor */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      Qualifying Questions
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>
                        AI infers answers from each candidate's CV during screening
                      </span>
                    </div>
                    <button className="btn btn-secondary btn-sm" onClick={addEQ}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {editQuestions.length === 0 && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', padding: '10px 0' }}>No qualifying questions.</div>
                  )}
                  {editQuestions.map((q, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8,
                      padding: '10px 12px', background: 'var(--bg-2)', borderRadius: 7,
                      border: `1px solid ${q.dealbreaker ? 'var(--warning)' : 'var(--border)'}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <input value={q.question} onChange={e => setEQ(i, 'question', e.target.value)}
                          placeholder={`Question ${i + 1}`}
                          style={{ width: '100%', boxSizing: 'border-box', marginBottom: 6, fontSize: 13 }} />
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, userSelect: 'none' }}>
                          <input type="checkbox" checked={q.dealbreaker} onChange={e => setEQ(i, 'dealbreaker', e.target.checked)}
                            style={{ width: 13, height: 13, accentColor: 'var(--warning)', cursor: 'pointer' }} />
                          <AlertTriangle size={11} color={q.dealbreaker ? 'var(--warning)' : 'var(--text-3)'} />
                          <span style={{ color: q.dealbreaker ? 'var(--warning)' : 'var(--text-3)', fontWeight: q.dealbreaker ? 700 : 400 }}>
                            Dealbreaker
                          </span>
                        </label>
                      </div>
                      <button onClick={() => removeEQ(i)} className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', padding: '4px 5px', flexShrink: 0 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>

                {editError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 10 }}>{editError}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
                  <button className="btn btn-ghost" onClick={() => setShowEdit(false)}>Cancel</button>
                  <button className="btn btn-ghost" onClick={() => setEditStep(2)} disabled={!editJd}>
                    Skip → Review JD
                  </button>
                  <button className="btn btn-primary" onClick={handleEditGenerateJD} disabled={editGenerating}>
                    {editGenerating
                      ? <><Loader size={13} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Generating…</>
                      : <><Sparkles size={13} style={{ marginRight: 6 }} />Re-generate JD with AI</>}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Edit JD */}
            {editStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexShrink: 0 }}>
                  <span className="badge badge-brand">Review &amp; edit</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>You can freely edit the text below before saving.</span>
                </div>
                <textarea
                  value={editJd}
                  onChange={e => setEditJd(e.target.value)}
                  style={{ flex: 1, minHeight: 340, lineHeight: 1.7, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                />
                {editError && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{editError}</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12, flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost" onClick={() => setEditStep(1)}>← Edit details</button>
                    <button className="btn btn-ghost" onClick={handleEditGenerateJD} disabled={editGenerating}>
                      {editGenerating ? 'Re-generating…' : <><RefreshCw size={13} style={{ marginRight: 4 }} />Re-generate</>}
                    </button>
                  </div>
                  <button className="btn btn-primary" onClick={handleEditSave} disabled={editSaving || !editJd.trim()}>
                    {editSaving
                      ? <><Loader size={13} style={{ marginRight: 6, animation: 'spin 1s linear infinite' }} />Saving…</>
                      : 'Save & Reset Screening'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
          <div style={{ background: '#ffffff', borderRadius: 14, padding: '1.5rem', width: '100%', maxWidth: 560, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: 17 }}>
                <Upload size={15} style={{ marginRight: 6, verticalAlign: 'middle' }} />Bulk Upload CVs
              </h2>
              <button className="btn btn-ghost" onClick={() => { setShowUpload(false); setUploadRows([]) }}><X size={16} /></button>
            </div>

            {/* Drop zone — always visible so user can keep adding files */}
            <div
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 8, padding: '1.5rem', textAlign: 'center', cursor: 'pointer',
                background: 'var(--bg-2)', marginBottom: 14, flexShrink: 0,
                transition: 'border-color 0.15s'
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleUploadFiles(e.dataTransfer.files) }}
            >
              <Upload size={24} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Drop files here or click to browse</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
                Any file type · PDF, DOC, TXT and more · Multiple files at once
              </p>
            </div>
            <input ref={fileRef} type="file" multiple style={{ display: 'none' }}
              onChange={e => handleUploadFiles(e.target.files)} />

            {/* Live progress list */}
            {uploadRows.length > 0 && (
              <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
                {uploadRows.map((r, i) => {
                  const isProcessing = r.status === 'extracting' || r.status === 'saving'
                  const isDone  = r.status === 'done'
                  const isError = r.status === 'error'
                  return (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 7, marginBottom: 6,
                      background: isDone ? 'var(--success-bg, #f0fdf4)' : isError ? 'var(--danger-bg, #fff5f5)' : 'var(--bg-2)',
                      border: `1px solid ${isDone ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--border)'}`
                    }}>
                      {isProcessing && <Loader size={14} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                      {isDone  && <CheckCircle size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />}
                      {isError && <XCircle    size={14} style={{ color: 'var(--danger)',  flexShrink: 0 }} />}
                      {!isProcessing && !isDone && !isError && <FileText size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file.name}</div>
                      </div>
                      <span style={{
                        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                        color: isDone ? 'var(--success)' : isError ? 'var(--danger)' : 'var(--text-3)'
                      }}>{r.msg}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {uploadRows.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', margin: '0 0 12px' }}>
                Files will be added to the pipeline automatically as they upload.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                {uploadRows.filter(r => r.status === 'done').length > 0 &&
                  `${uploadRows.filter(r => r.status === 'done').length} added to pipeline`}
              </span>
              <button className="btn btn-primary" onClick={() => { setShowUpload(false); setUploadRows([]) }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
