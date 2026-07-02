import { useState, useEffect, useRef } from 'react'
import { fetchCandidates, createCandidate, fetchJobs, fetchAllApplications } from '../lib/supabase.js'
import { screenResume } from '../lib/claude.js'
import { extractText, nameFromFile } from '../lib/fileExtract.js'
import { Search, Star, MapPin, Briefcase, Upload, Zap, X, CheckCircle, AlertCircle, MinusCircle, FileText, Loader, TrendingUp } from 'lucide-react'

// ─── Shared styles ─────────────────────────────────────────────
const modalBox = (maxWidth = 560) => ({
  background: '#ffffff', borderRadius: 12, padding: '1.5rem',
  width: '100%', maxWidth, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
  maxHeight: '90vh', display: 'flex', flexDirection: 'column'
})

// ─── Bulk Import CV Modal ──────────────────────────────────────
function ImportCVModal({ onClose, onSaved }) {
  const fileRef = useRef()
  // step: 'upload' | 'review' | 'saving' | 'done'
  const [step, setStep]       = useState('upload')
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0 })
  const [rows, setRows]       = useState([])   // [{ file, cvText, name, email, phone, role, experience, location, skills, status }]
  const [saveProgress, setSaveProgress] = useState({ done: 0, total: 0 })
  const [dragOver, setDragOver] = useState(false)
  const [error, setError]     = useState('')

  async function processFiles(files) {
    const list = Array.from(files).filter(f =>
      f.type === 'application/pdf' || f.type === 'text/plain' || f.name.endsWith('.txt')
    )
    if (!list.length) { setError('Please select PDF or TXT files.'); return }
    setError('')
    setExtracting(true)
    setExtractProgress({ done: 0, total: list.length })
    const extracted = []
    for (const file of list) {
      try {
        const cvText = await extractText(file)
        extracted.push({ file, cvText, name: nameFromFile(file.name), email: '', phone: '', role: '', experience: '', location: '', skills: '', status: 'pending' })
      } catch {
        extracted.push({ file, cvText: '', name: nameFromFile(file.name), email: '', phone: '', role: '', experience: '', location: '', skills: '', status: 'error' })
      }
      setExtractProgress(p => ({ ...p, done: p.done + 1 }))
    }
    setRows(extracted)
    setExtracting(false)
    setStep('review')
  }

  function updateRow(i, key, val) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r))
  }

  function removeRow(i) {
    setRows(prev => prev.filter((_, idx) => idx !== i))
  }

  async function saveAll() {
    const valid = rows.filter(r => r.name.trim() && r.email.trim() && r.status !== 'error')
    if (!valid.length) { setError('At least one candidate needs a name and email.'); return }
    setStep('saving')
    setSaveProgress({ done: 0, total: valid.length })
    const saved = []
    for (const r of valid) {
      try {
        const candidate = {
          name:       r.name.trim(),
          email:      r.email.trim(),
          phone:      r.phone.trim() || null,
          role:       r.role.trim() || null,
          experience: parseInt(r.experience) || 0,
          location:   r.location.trim() || null,
          skills:     r.skills ? r.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
          cv_text:    r.cvText,
          source:     'upload',
          status:     'available'
        }
        const result = await createCandidate(candidate)
        saved.push(result)
      } catch {}
      setSaveProgress(p => ({ ...p, done: p.done + 1 }))
    }
    onSaved(saved)
    setStep('done')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={modalBox(step === 'review' ? 780 : 520)}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>
            {step === 'upload' && 'Import CVs'}
            {step === 'review' && `Review ${rows.length} candidate${rows.length !== 1 ? 's' : ''}`}
            {step === 'saving' && 'Saving candidates…'}
            {step === 'done'   && 'Import complete'}
          </h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 10, padding: '3rem 1.5rem', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'var(--brand-bg, var(--bg-2))' : 'var(--bg-2)',
                transition: 'all 0.15s'
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files) }}
            >
              {extracting ? (
                <div>
                  <Loader size={28} style={{ color: 'var(--brand)', marginBottom: 10, animation: 'spin 1s linear infinite' }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Extracting text… {extractProgress.done}/{extractProgress.total}</p>
                  <div style={{ height: 4, background: 'var(--border)', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(extractProgress.done / extractProgress.total) * 100}%`, background: 'var(--brand)', transition: 'width 0.3s' }} />
                  </div>
                </div>
              ) : (
                <>
                  <Upload size={30} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 12px' }} />
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>Drop CVs here or click to browse</p>
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Supports PDF and TXT · Multiple files allowed</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt" multiple style={{ display: 'none' }}
              onChange={e => processFiles(e.target.files)} />
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </div>
        )}

        {/* Review step */}
        {step === 'review' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 12px', flexShrink: 0 }}>
              Fill in name &amp; email for each CV. Other fields are optional.
            </p>
            <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
              {rows.map((r, i) => (
                <div key={i} style={{
                  border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px',
                  marginBottom: 10, background: r.status === 'error' ? 'var(--danger-bg, #fff5f5)' : 'var(--bg-2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{r.file.name}</span>
                      {r.status === 'error' && <span className="badge badge-danger">Extract failed</span>}
                      {r.cvText && <span className="badge badge-success" style={{ fontSize: 10 }}>CV extracted</span>}
                    </div>
                    <button className="btn btn-ghost" style={{ padding: '2px 6px' }} onClick={() => removeRow(i)}><X size={13} /></button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 10px' }}>
                    {[
                      ['name',       'Full Name *',        null],
                      ['email',      'Email *',            null],
                      ['phone',      'Phone',              null],
                      ['role',       'Current Role',       null],
                      ['experience', 'Exp (years)',        null],
                      ['location',   'Location',          null],
                      ['skills',     'Skills (comma-sep)', '1/-1'],
                    ].map(([key, label, col]) => (
                      <div key={key} style={col ? { gridColumn: col } : {}}>
                        <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>{label}</label>
                        <input
                          value={r[key]}
                          onChange={e => updateRow(i, key, e.target.value)}
                          type={key === 'experience' ? 'number' : 'text'}
                          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '5px 8px' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <button className="btn btn-ghost" onClick={() => { setStep('upload'); setRows([]) }}>
                ← Add more files
              </button>
              <button className="btn btn-primary" onClick={saveAll}>
                Save {rows.filter(r => r.status !== 'error').length} candidate{rows.filter(r => r.status !== 'error').length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

        {/* Saving step */}
        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader size={32} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite', marginBottom: 16 }} />
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Saving candidates to database…</p>
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 99, overflow: 'hidden', maxWidth: 320, margin: '0 auto' }}>
              <div style={{ height: '100%', width: `${(saveProgress.done / saveProgress.total) * 100}%`, background: 'var(--brand)', transition: 'width 0.3s' }} />
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 8 }}>{saveProgress.done} of {saveProgress.total}</p>
          </div>
        )}

        {/* Done step */}
        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
            <p style={{ fontWeight: 600, fontSize: 16, marginBottom: 6 }}>Import complete!</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{saveProgress.done} candidate{saveProgress.done !== 1 ? 's' : ''} saved successfully.</p>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────
const REC_STYLE = {
  shortlist: { color: 'var(--success)', bg: 'rgba(34,197,94,0.08)', border: 'var(--success)', label: 'Shortlist', icon: <CheckCircle size={11} /> },
  maybe:     { color: 'var(--warning)', bg: 'rgba(234,179,8,0.08)',  border: 'var(--warning)', label: 'Maybe',     icon: <AlertCircle size={11} />  },
  reject:    { color: 'var(--danger)',  bg: 'rgba(239,68,68,0.08)',  border: 'var(--danger)',  label: 'Reject',    icon: <MinusCircle size={11} />  },
}
const scoreColor = s => s >= 75 ? 'var(--success)' : s >= 45 ? 'var(--warning)' : 'var(--danger)'

// Human-readable last action label from pipeline status
const ACTION_LABEL = {
  hired:                { label: 'Hired',                    color: 'var(--success)' },
  offer_sent:           { label: 'Offer Sent',               color: 'var(--success)' },
  interview_done:       { label: 'Interview Completed',      color: 'var(--brand)'   },
  interview_scheduled:  { label: 'Interview Scheduled',      color: 'var(--brand)'   },
  video_interview:      { label: 'In Video Interview',       color: '#7c3aed'        },
  manual_round:         { label: 'In Manual Round',          color: '#7c3aed'        },
  consent_accepted:     { label: 'Consent Accepted',         color: 'var(--success)' },
  consent_sent:         { label: 'Consent Pending',          color: 'var(--warning)' },
  shortlisted:          { label: 'Shortlisted',              color: 'var(--brand)'   },
  rejected:             { label: 'Rejected',                 color: 'var(--danger)'  },
  screened:             { label: 'Screened',                 color: 'var(--text-3)'  },
  applied:              { label: 'Applied',                  color: 'var(--text-3)'  },
}
const STATUS_ORDER = ['hired','offer_sent','interview_done','interview_scheduled','video_interview','manual_round','consent_accepted','consent_sent','shortlisted','rejected','screened','applied']

// ─── Main Page ────────────────────────────────────────────────
export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [appMap, setAppMap]         = useState({})   // candidateId → [applications]
  const [jobs, setJobs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [fJob, setFJob]             = useState('all')
  const [selected, setSelected]     = useState(null)
  const [showImport, setShowImport] = useState(false)

  // Inline match state
  const [showMatchBar, setShowMatchBar] = useState(false)
  const [matchJobId, setMatchJobId]     = useState('')
  const [matchResults, setMatchResults] = useState({})   // candidateId → result
  const [matchJobTitle, setMatchJobTitle] = useState('')
  const [matchRunning, setMatchRunning] = useState(false)
  const [matchProgress, setMatchProgress] = useState({ done: 0, total: 0 })
  const [matchError, setMatchError]     = useState('')

  useEffect(() => {
    Promise.all([fetchCandidates(), fetchAllApplications(), fetchJobs()])
      .then(([cands, apps, jobList]) => {
        setCandidates(cands)
        setJobs(jobList)
        const map = {}
        for (const a of apps) {
          if (!a.candidate_id) continue
          if (!map[a.candidate_id]) map[a.candidate_id] = []
          map[a.candidate_id].push(a)
        }
        setAppMap(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function runMatch() {
    const job = jobs.find(j => j.id === matchJobId)
    if (!job?.jd) { setMatchError('Selected job has no JD. Generate one first.'); return }
    const withCV = candidates.filter(c => c.cv_text)
    if (!withCV.length) { setMatchError('No candidates have CV text. Import CVs first.'); return }
    setMatchError('')
    setMatchRunning(true)
    setMatchResults({})
    setMatchJobTitle(job.title)
    setMatchProgress({ done: 0, total: withCV.length })
    const map = {}
    for (const c of withCV) {
      try {
        const res = await screenResume({ cvText: c.cv_text, jd: job.jd, candidateName: c.name })
        map[c.id] = res
      } catch {
        map[c.id] = { score: 0, recommendation: 'reject', summary: 'Screening failed.', strengths: [], gaps: [], experienceMatch: 0, skillsMatch: 0, educationMatch: 0 }
      }
      setMatchProgress(p => ({ ...p, done: p.done + 1 }))
    }
    setMatchResults(map)
    setMatchRunning(false)
  }

  function clearMatch() {
    setMatchResults({})
    setMatchJobId('')
    setMatchJobTitle('')
    setMatchError('')
    setShowMatchBar(false)
  }

  function lastAction(candidateId) {
    const apps = appMap[candidateId] || []
    if (!apps.length) return null
    const best = [...apps].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))[0]
    return best?.status ? ACTION_LABEL[best.status] || { label: best.status.replace(/_/g, ' '), color: 'var(--text-3)' } : null
  }

  // Unique job titles across all applications for the dropdown
  const jobTitleOptions = [...new Map(
    Object.values(appMap).flat().map(a => a.jobs).filter(Boolean).map(j => [j.id, j])
  ).values()].sort((a, b) => a.title.localeCompare(b.title))

  const filtered = candidates.filter(c => {
    const apps = appMap[c.id] || []
    // Name / role / skills search
    const q = search.toLowerCase()
    if (q) {
      const match = c.name?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.skills?.some(s => s.toLowerCase().includes(q))
      if (!match) return false
    }
    // Job title filter
    if (fJob !== 'all') {
      const hasJob = apps.some(a => a.jobs?.id === fJob)
      if (!hasJob) return false
    }
    return true
  })

  const hasFilters = search.trim() || fJob !== 'all'
  function clearFilters() { setSearch(''); setFJob('all') }

  const RELEVANCE_THRESHOLD = 20   // score below this = completely unrelated to JD

  const hasMatchResults = Object.keys(matchResults).length > 0

  // When match is active: only show candidates with score >= threshold (relevant to JD).
  // Candidates with no CV are also hidden since they can't be evaluated.
  const sorted = hasMatchResults
    ? [...filtered]
        .filter(c => {
          const mr = matchResults[c.id]
          if (!mr) return false                        // no CV → can't evaluate → hide
          return mr.score >= RELEVANCE_THRESHOLD       // below threshold → unrelated → hide
        })
        .sort((a, b) => (matchResults[b.id]?.score ?? 0) - (matchResults[a.id]?.score ?? 0))
    : filtered

  // Count how many were screened vs how many are being shown
  const totalScreened  = hasMatchResults ? Object.keys(matchResults).length : 0
  const totalRelevant  = hasMatchResults ? Object.values(matchResults).filter(r => r.score >= RELEVANCE_THRESHOLD).length : 0
  const totalHidden    = totalScreened - totalRelevant

  // Summary counts (only among relevant ones shown)
  const matchCounts = hasMatchResults ? {
    shortlist: sorted.filter(c => matchResults[c.id]?.recommendation === 'shortlist').length,
    maybe:     sorted.filter(c => matchResults[c.id]?.recommendation === 'maybe').length,
    reject:    sorted.filter(c => matchResults[c.id]?.recommendation === 'reject').length,
  } : null

  function onImported(saved) {
    setCandidates(prev => [...saved, ...prev])
  }

  // Derive best screening result for a candidate across all applications
  function bestScreening(candidateId) {
    const apps = appMap[candidateId] || []
    return [...apps]
      .filter(a => a.screen_score != null)
      .sort((a, b) => b.screen_score - a.screen_score)[0] || null
  }

  // Latest job application for a candidate
  function latestApp(candidateId) {
    const apps = appMap[candidateId] || []
    return apps[0] || null
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Candidate database</h1>
          <p>{candidates.length} candidates in your talent pool</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setShowMatchBar(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: showMatchBar ? 'var(--brand)' : undefined }}>
            <Zap size={14} />Match with JD
          </button>
          <button className="btn btn-primary" onClick={() => setShowImport(true)}>
            <Upload size={14} style={{ marginRight: 5 }} />Import CVs
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '0.75rem 1rem', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>

          {/* Name / role / skills search */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search name, role, skills…"
              style={{ paddingLeft: 30, fontSize: 13, height: 36, width: '100%', boxSizing: 'border-box' }} />
          </div>

          {/* Job title dropdown */}
          <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 170 }}>
            <Briefcase size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <select value={fJob} onChange={e => setFJob(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 13, height: 36, width: '100%', boxSizing: 'border-box' }}>
              <option value="all">Job Title</option>
              {jobTitleOptions.map(j => (
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
            Showing <strong style={{ color: 'var(--text-1)' }}>{filtered.length}</strong> of <strong style={{ color: 'var(--text-1)' }}>{candidates.length}</strong> candidates
          </div>
        )}
      </div>

      {/* ── Inline Match Bar ── */}
      {showMatchBar && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: 14, border: '1.5px solid var(--brand)', background: 'rgba(99,102,241,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: matchError ? 8 : 0, flexWrap: 'wrap' }}>
            <Zap size={14} style={{ color: 'var(--brand)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)', marginRight: 4 }}>Match with JD</span>
            <select value={matchJobId} onChange={e => { setMatchJobId(e.target.value); setMatchResults({}); setMatchError('') }}
              style={{ flex: '1 1 200px', fontSize: 13, height: 36 }} disabled={matchRunning}>
              <option value="">Select a job to match against…</option>
              {jobs.filter(j => j.jd).map(j => <option key={j.id} value={j.id}>{j.title}{j.department ? ` — ${j.department}` : ''}</option>)}
            </select>
            <button className="btn btn-primary btn-sm" onClick={runMatch} disabled={!matchJobId || matchRunning}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              {matchRunning
                ? <><Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />{matchProgress.done}/{matchProgress.total}</>
                : <><Zap size={13} />Run Match</>}
            </button>
            {hasMatchResults && (
              <button className="btn btn-ghost btn-sm" onClick={clearMatch}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-3)' }}>
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {matchRunning && (
            <div style={{ marginTop: 10 }}>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${matchProgress.total ? (matchProgress.done / matchProgress.total) * 100 : 0}%`, background: 'var(--brand)', transition: 'width 0.3s' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 5 }}>Screening {matchProgress.done} of {matchProgress.total} candidates…</div>
            </div>
          )}

          {matchError && <p style={{ color: 'var(--danger)', fontSize: 13, margin: '8px 0 0' }}>{matchError}</p>}

          {matchCounts && !matchRunning && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Relevant to <strong style={{ color: 'var(--brand)' }}>{matchJobTitle}</strong>:
                </span>
                {matchCounts.shortlist > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle size={12} />{matchCounts.shortlist} Shortlist
                  </span>
                )}
                {matchCounts.maybe > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={12} />{matchCounts.maybe} Maybe
                  </span>
                )}
                {matchCounts.reject > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MinusCircle size={12} />{matchCounts.reject} Low match
                  </span>
                )}
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>· Sorted by score</span>
              </div>
              {totalHidden > 0 && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <X size={12} style={{ color: 'var(--danger)' }} />
                  <span><strong style={{ color: 'var(--text-2)' }}>{totalHidden}</strong> candidate{totalHidden !== 1 ? 's' : ''} hidden — unrelated to this JD (score below {RELEVANCE_THRESHOLD})</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 16 }}>
        <div>
          {loading ? (
            <div className="card"><p style={{ color: 'var(--text-3)' }}>Loading candidates…</p></div>
          ) : candidates.length === 0 ? (
            <div className="card empty-state">
              <div className="icon">🗂️</div>
              <h3>No candidates yet</h3>
              <p>Import CVs to get started</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="card empty-state">
              <div className="icon">🔍</div>
              <h3>No candidates match</h3>
              <p style={{ marginBottom: 12 }}>Try adjusting your filters.</p>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}><X size={13} /> Clear filters</button>
            </div>
          ) : sorted.length === 0 && hasMatchResults ? (
            <div className="card empty-state">
              <div className="icon">🔍</div>
              <h3>No relevant candidates found</h3>
              <p>None of the {totalScreened} screened candidates had sufficient relevance to <strong>{matchJobTitle}</strong>.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={clearMatch}><X size={13} /> Clear match</button>
            </div>
          ) : sorted.map(c => {
            const apps      = appMap[c.id] || []
            const top       = latestApp(c.id)
            const screen    = bestScreening(c.id)
            const jobTitle  = top?.jobs?.title || null
            const jobDept   = top?.jobs?.department || null
            const extraJobs = apps.length > 1 ? apps.length - 1 : 0
            const action    = lastAction(c.id)

            // Match result for this candidate (from inline match run)
            const mr        = matchResults[c.id] || null
            const mrRec     = mr?.recommendation
            const mrStyle   = mrRec ? REC_STYLE[mrRec] : null
            const cardBorderColor = mrStyle
              ? mrStyle.border
              : selected?.id === c.id ? 'var(--brand)' : 'var(--border)'
            const cardBg = mrRec === 'shortlist' ? 'rgba(34,197,94,0.04)'
              : mrRec === 'maybe' ? 'rgba(234,179,8,0.04)'
              : mrRec === 'reject' ? 'rgba(239,68,68,0.04)'
              : undefined

            return (
              <div key={c.id} className="card"
                onClick={() => setSelected(selected?.id === c.id ? null : c)}
                style={{
                  marginBottom: 8, padding: '1rem 1.25rem', cursor: 'pointer',
                  border: `${selected?.id === c.id || mr ? '1.5px' : '1px'} solid ${cardBorderColor}`,
                  borderLeft: mr ? `4px solid ${mrStyle.border}` : undefined,
                  background: cardBg,
                  transition: 'border-color 0.2s, background 0.2s'
                }}>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  {/* Avatar */}
                  <div className="avatar" style={{ width: 42, height: 42, fontSize: 14, flexShrink: 0,
                    background: mrRec === 'shortlist' ? 'rgba(34,197,94,0.15)' : undefined,
                    color: mrRec === 'shortlist' ? 'var(--success)' : undefined }}>
                    {c.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name + status badges */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</span>
                      {c.cv_text && <span className="badge badge-brand" style={{ fontSize: 10 }}>CV</span>}
                      {/* Last pipeline action */}
                      {action && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: action.color, background: `${action.color}18`, padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {action.label}
                        </span>
                      )}
                    </div>

                    {/* Phone */}
                    {c.phone && (
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 3 }}>{c.phone}</div>
                    )}

                    {/* Job title pill */}
                    {jobTitle && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <Briefcase size={11} style={{ color: 'var(--brand)', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', background: 'var(--brand-light)', padding: '2px 8px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                          {jobTitle}
                        </span>
                        {jobDept && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{jobDept}</span>}
                        {extraJobs > 0 && <span className="badge badge-gray" style={{ fontSize: 10 }}>+{extraJobs} more</span>}
                      </div>
                    )}

                    {/* Role / location / exp */}
                    <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {c.role     && <span><Briefcase size={10} style={{ display: 'inline', marginRight: 3 }} />{c.role}</span>}
                      {c.location && <span><MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />{c.location}</span>}
                      {c.experience > 0 && <span>{c.experience}y exp</span>}
                    </div>
                  </div>

                  {/* Right: match score OR existing screening score */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                    {mr ? (
                      <>
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          border: `3px solid ${mrStyle.border}`,
                          background: `${mrStyle.border}12`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, fontWeight: 900, color: mrStyle.border
                        }}>
                          {mr.score}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, color: mrStyle.color, background: mrStyle.bg, border: `1px solid ${mrStyle.border}`, whiteSpace: 'nowrap' }}>
                          {mrStyle.icon} {mrStyle.label}
                        </div>
                      </>
                    ) : screen ? (
                      <>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%',
                          border: `2.5px solid ${scoreColor(screen.screen_score)}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: scoreColor(screen.screen_score)
                        }}>
                          {screen.screen_score}
                        </div>
                        {screen.screen_recommendation && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                            color: REC_STYLE[screen.screen_recommendation]?.color,
                            background: REC_STYLE[screen.screen_recommendation]?.bg,
                            border: `1px solid ${REC_STYLE[screen.screen_recommendation]?.border}`,
                            whiteSpace: 'nowrap' }}>
                            {REC_STYLE[screen.screen_recommendation]?.icon} {REC_STYLE[screen.screen_recommendation]?.label}
                          </div>
                        )}
                      </>
                    ) : null}
                    {c.rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Star size={12} color="var(--warning)" fill="var(--warning)" />
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{c.rating}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Inline match result details ── */}
                {mr && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${mrStyle.border}40` }}>
                    {mr.summary && (
                      <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.5 }}>{mr.summary}</p>
                    )}
                    <div style={{ display: 'flex', gap: 14, marginBottom: 8, fontSize: 12 }}>
                      {[['Exp', mr.experienceMatch], ['Skills', mr.skillsMatch], ['Education', mr.educationMatch]].map(([lbl, val]) =>
                        val != null && (
                          <span key={lbl} style={{ color: 'var(--text-3)' }}>
                            {lbl}: <strong style={{ color: scoreColor(val) }}>{val}%</strong>
                          </span>
                        )
                      )}
                    </div>
                    {(mr.strengths?.length > 0 || mr.gaps?.length > 0) && (
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {mr.strengths?.slice(0, 3).map((s, i) => <span key={i} className="badge badge-success" style={{ fontSize: 10 }}>{s}</span>)}
                        {mr.gaps?.slice(0, 2).map((g, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(239,68,68,0.08)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)' }}>Gap: {g}</span>)}
                      </div>
                    )}
                  </div>
                )}

                {/* Skills */}
                {!mr && c.skills?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                    {c.skills.slice(0, 5).map(s => <span key={s} className="badge badge-gray" style={{ fontSize: 10 }}>{s}</span>)}
                    {c.skills.length > 5 && <span className="badge badge-gray" style={{ fontSize: 10 }}>+{c.skills.length - 5}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Detail panel ── */}
        {selected && (() => {
          const apps   = appMap[selected.id] || []
          const screen = bestScreening(selected.id)
          const rec    = screen?.screen_recommendation
          const recStyle = rec ? REC_STYLE[rec] : null

          return (
            <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: '2rem', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: 16 }}>
                  {selected.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selected.role}{selected.experience ? ` · ${selected.experience}y exp` : ''}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ flexShrink: 0 }}><X size={14} /></button>
              </div>

              {/* Applied jobs */}
              {apps.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Briefcase size={11} /> Applied Jobs
                  </div>
                  {apps.slice(0, 3).map(a => (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)', flex: 1 }}>{a.jobs?.title || '—'}</span>
                      {a.jobs?.department && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{a.jobs.department}</span>}
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>{(a.status || '').replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                  {apps.length > 3 && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>+{apps.length - 3} more applications</div>}
                </div>
              )}

              {/* Contact details */}
              {[['Email', selected.email], ['Phone', selected.phone], ['Location', selected.location], ['Education', selected.education]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)' }}>{l}</span>
                  <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 210, wordBreak: 'break-word' }}>{v || '—'}</span>
                </div>
              ))}

              {/* Rating */}
              {selected.rating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 }}>
                  <Star size={14} color="var(--warning)" fill="var(--warning)" />
                  <span style={{ fontWeight: 700, fontSize: 17 }}>{selected.rating}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>/ 5.0</span>
                </div>
              )}

              {/* ── Screening results ── */}
              {screen ? (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <TrendingUp size={11} /> AI Screening Results
                    {screen.jobs?.title && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--brand)' }}>· {screen.jobs.title}</span>}
                  </div>

                  {/* Score + recommendation row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%',
                      border: `3px solid ${scoreColor(screen.screen_score)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, fontWeight: 900, color: scoreColor(screen.screen_score), flexShrink: 0
                    }}>
                      {screen.screen_score}
                    </div>
                    <div>
                      {recStyle && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <span style={{ color: recStyle.color }}>{recStyle.icon}</span>
                          <span style={{ fontWeight: 700, fontSize: 13, color: recStyle.color }}>{recStyle.label}</span>
                        </div>
                      )}
                      {screen.screen_summary && (
                        <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>{screen.screen_summary}</p>
                      )}
                    </div>
                  </div>

                  {/* Sub-scores */}
                  {(screen.experience_match != null || screen.skills_match != null || screen.education_match != null) && (
                    <div style={{ display: 'flex', gap: 14, marginBottom: 12, fontSize: 12 }}>
                      {[['Exp', screen.experience_match], ['Skills', screen.skills_match], ['Education', screen.education_match]].map(([label, val]) =>
                        val != null && (
                          <div key={label} style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: scoreColor(val) }}>{val}%</div>
                            <div style={{ color: 'var(--text-3)', fontSize: 11 }}>{label}</div>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  {/* Strengths */}
                  {screen.screen_strengths?.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--success)', marginBottom: 4 }}>Strengths</div>
                      {screen.screen_strengths.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 6, marginBottom: 3 }}>
                          <CheckCircle size={11} style={{ color: 'var(--success)', marginTop: 2, flexShrink: 0 }} />
                          {s}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Gaps */}
                  {screen.screen_gaps?.length > 0 && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)', marginBottom: 4 }}>Gaps</div>
                      {screen.screen_gaps.map((g, i) => (
                        <div key={i} style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', gap: 6, marginBottom: 3 }}>
                          <MinusCircle size={11} style={{ color: 'var(--danger)', marginTop: 2, flexShrink: 0 }} />
                          {g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <TrendingUp size={13} /> No AI screening on record
                </div>
              )}

              {/* Skills */}
              {selected.skills?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>SKILLS</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selected.skills.map(s => <span key={s} className="badge badge-brand">{s}</span>)}
                  </div>
                </div>
              )}

              {/* CV preview */}
              {selected.cv_text && (
                <div style={{ marginTop: 12, padding: 10, background: 'var(--bg-2)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '0 0 4px', fontWeight: 600 }}>CV PREVIEW</p>
                  <p style={{ fontSize: 11, color: 'var(--text-2)', margin: 0, lineHeight: 1.5, maxHeight: 120, overflow: 'hidden' }}>
                    {selected.cv_text.slice(0, 400)}…
                  </p>
                </div>
              )}
            </div>
          )
        })()}
      </div>

      {showImport && <ImportCVModal onClose={() => setShowImport(false)} onSaved={saved => { onImported(saved); setShowImport(false) }} />}
    </div>
  )
}
