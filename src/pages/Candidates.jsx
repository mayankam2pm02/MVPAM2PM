import { useState, useEffect, useRef } from 'react'
import { fetchCandidates, createCandidate, fetchJobs, fetchAllApplications } from '../lib/supabase.js'
import { screenResume } from '../lib/claude.js'
import { extractText, nameFromFile } from '../lib/fileExtract.js'
import { getCleanCandidateEmail } from '../lib/emailUtils.js'
import { getCleanCandidateName } from '../lib/nameUtils.js'
import {
  Search, Star, MapPin, Briefcase, Upload, Zap, X, CheckCircle,
  AlertCircle, MinusCircle, FileText, Loader, TrendingUp, Users,
  ChevronDown, ChevronLeft, ChevronRight, MoreVertical, Sparkles, Filter, Clock
} from 'lucide-react'

// ─── Shared styles ─────────────────────────────────────────────
const modalBox = (maxWidth = 560) => ({
  background: '#ffffff', borderRadius: 16, padding: '24px',
  width: '100%', maxWidth, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
  maxHeight: '90vh', display: 'flex', flexDirection: 'column'
})

// ─── Bulk Import CV Modal ──────────────────────────────────────
function ImportCVModal({ onClose, onSaved }) {
  const fileRef = useRef()
  const [step, setStep]       = useState('upload')
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState({ done: 0, total: 0 })
  const [rows, setRows]       = useState([])
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
            {step === 'upload' && 'Import CVs'}
            {step === 'review' && `Review ${rows.length} candidate${rows.length !== 1 ? 's' : ''}`}
            {step === 'saving' && 'Saving candidates…'}
            {step === 'done'   && 'Import complete'}
          </h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        {step === 'upload' && (
          <div style={{ flexShrink: 0 }}>
            <div
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
                borderRadius: 10, padding: '3rem 1.5rem', textAlign: 'center',
                cursor: 'pointer', background: dragOver ? 'rgba(79, 70, 229, 0.04)' : '#F8F9FC',
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
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Drop CVs here or click to browse</p>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>Supports PDF and TXT · Multiple files allowed</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.txt" multiple style={{ display: 'none' }}
              onChange={e => processFiles(e.target.files)} />
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </div>
        )}

        {step === 'review' && (
          <>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 12px', flexShrink: 0 }}>
              Fill in name &amp; email for each CV. Other fields are optional.
            </p>
            <div style={{ overflowY: 'auto', flex: 1, marginBottom: 12 }}>
              {rows.map((r, i) => (
                <div key={i} style={{
                  border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px',
                  marginBottom: 10, background: r.status === 'error' ? '#fff5f5' : '#F8F9FC'
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
                          style={{ width: '100%', boxSizing: 'border-box', fontSize: 13, padding: '5px 8px', borderRadius: 6 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{error}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <button className="btn btn-secondary" onClick={() => { setStep('upload'); setRows([]) }}>
                ← Add more files
              </button>
              <button className="btn btn-primary" onClick={saveAll}>
                Save {rows.filter(r => r.status !== 'error').length} candidate{rows.filter(r => r.status !== 'error').length !== 1 ? 's' : ''}
              </button>
            </div>
          </>
        )}

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

// ─── Match Gauge Component ───
function MatchGauge({ score }) {
  const radius = 22
  const stroke = 3.5
  const normalizedRadius = radius - stroke
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#10B981' : score >= 45 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="#E5E7EB"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={color}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.35s' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <span style={{
        position: 'absolute',
        fontSize: '11px',
        fontWeight: '800',
        color: 'var(--text-1)'
      }}>
        {score}%
      </span>
    </div>
  )
}

const REC_STYLE = {
  shortlist: { color: '#10B981', bg: '#ECFDF5', border: '#10B981', label: 'Shortlist', icon: <CheckCircle size={11} /> },
  maybe:     { color: '#F59E0B', bg: '#FFFBEB',  border: '#F59E0B', label: 'Maybe',     icon: <AlertCircle size={11} />  },
  reject:    { color: '#EF4444',  bg: '#FEF2F2',  border: '#EF4444',  label: 'Reject',    icon: <MinusCircle size={11} />  },
}
const scoreColor = s => s >= 75 ? '#10B981' : s >= 45 ? '#F59E0B' : '#EF4444'

const ACTION_LABEL = {
  hired:                { label: 'Hired',                    color: '#10B981' },
  offer_sent:           { label: 'Offer Sent',               color: '#10B981' },
  interview_done:       { label: 'Interview Completed',      color: '#4F46E5'   },
  interview_scheduled:  { label: 'Interview Scheduled',      color: '#4F46E5'   },
  video_interview:      { label: 'In Video Interview',       color: '#7c3aed'        },
  manual_round:         { label: 'In Manual Round',          color: '#7c3aed'        },
  consent_accepted:     { label: 'Consent Accepted',         color: '#10B981' },
  consent_sent:         { label: 'Consent Pending',          color: '#F59E0B' },
  shortlisted:          { label: 'Shortlisted',              color: '#4F46E5'   },
  rejected:             { label: 'Rejected',                 color: '#EF4444'  },
  screened:             { label: 'Screened',                 color: 'var(--text-3)'  },
  applied:              { label: 'Applied',                  color: 'var(--text-3)'  },
}
const STATUS_ORDER = ['hired','offer_sent','interview_done','interview_scheduled','video_interview','manual_round','consent_accepted','consent_sent','shortlisted','rejected','screened','applied']

// ─── Main Page ────────────────────────────────────────────────
export default function Candidates() {
  const [candidates, setCandidates] = useState([])
  const [appMap, setAppMap]         = useState({})
  const [jobs, setJobs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [fJob, setFJob]             = useState('all')
  const [selected, setSelected]     = useState(null)
  const [showImport, setShowImport] = useState(false)

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(20)

  // Inline match state
  const [showMatchBar, setShowMatchBar] = useState(false)
  const [matchJobId, setMatchJobId]     = useState('')
  const [matchResults, setMatchResults] = useState({})
  const [matchJobTitle, setMatchJobTitle] = useState('')
  const [matchRunning, setMatchRunning] = useState(false)
  const [matchProgress, setMatchProgress] = useState({ done: 0, total: 0 })
  const [matchError, setMatchError]     = useState('')

  useEffect(() => {
    Promise.all([fetchCandidates(), fetchAllApplications(), fetchJobs()])
      .then(([cands, apps, jobList]) => {
        setCandidates(cands || [])
        setJobs(jobList || [])
        const map = {}
        for (const a of (apps || [])) {
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

  const jobTitleOptions = [...new Map(
    Object.values(appMap).flat().map(a => a.jobs).filter(Boolean).map(j => [j.id, j])
  ).values()].sort((a, b) => a.title.localeCompare(b.title))

  const filtered = candidates.filter(c => {
    const apps = appMap[c.id] || []
    const q = search.toLowerCase()
    if (q) {
      const match = c.name?.toLowerCase().includes(q) ||
        c.role?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.skills?.some(s => s.toLowerCase().includes(q))
      if (!match) return false
    }
    if (fJob !== 'all') {
      const hasJob = apps.some(a => a.jobs?.id === fJob)
      if (!hasJob) return false
    }
    return true
  })

  const hasFilters = search.trim() || fJob !== 'all'
  function clearFilters() { setSearch(''); setFJob('all'); setCurrentPage(1) }

  const RELEVANCE_THRESHOLD = 20
  const hasMatchResults = Object.keys(matchResults).length > 0

  const sorted = hasMatchResults
    ? [...filtered]
        .filter(c => {
          const mr = matchResults[c.id]
          if (!mr) return false
          return mr.score >= RELEVANCE_THRESHOLD
        })
        .sort((a, b) => (matchResults[b.id]?.score ?? 0) - (matchResults[a.id]?.score ?? 0))
    : filtered

  const paginated = sorted.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
  const totalPages = Math.max(Math.ceil(sorted.length / rowsPerPage), 1)

  // Metrics derived from live state
  const totalCandidatesCount = candidates.length
  
  // A candidate is shortlisted if their best action is 'Shortlisted'
  const shortlistedCount = candidates.filter(c => lastAction(c.id)?.label === 'Shortlisted').length
  const shortlistedPct = totalCandidatesCount > 0 ? Math.round((shortlistedCount / totalCandidatesCount) * 100) : 0

  // Match score metrics
  const screenedCands = candidates.map(c => {
    const top = latestApp(c.id)
    return top?.screen_score
  }).filter(s => s != null)
  const avgMatchPct = screenedCands.length > 0 ? Math.round(screenedCands.reduce((a, b) => a + b, 0) / screenedCands.length) : 69

  // Top ratings
  const ratedCands = candidates.map(c => c.rating).filter(r => r != null)
  const avgRating = ratedCands.length > 0 ? (ratedCands.reduce((a, b) => a + b, 0) / ratedCands.length).toFixed(1) : '4.8'

  // Summary Metrics setup
  const stats = [
    { label: 'Total candidates', value: totalCandidatesCount, subtext: 'In your talent pool', color: '#4F46E5', bg: '#EEF2FF', icon: Users },
    { label: 'Shortlisted', value: shortlistedCount, subtext: `${shortlistedPct}% of total`, color: '#10B981', bg: '#ECFDF5', icon: CheckCircle },
    { label: 'Avg. match score', value: `${avgMatchPct}%`, subtext: 'Across all candidates', color: '#2563EB', bg: '#EFF6FF', icon: TrendingUp },
    { label: 'Top rated', value: avgRating, subtext: 'Average rating', color: '#7C3AED', bg: '#F5F3FF', icon: Star },
  ]

  function onImported(saved) {
    setCandidates(prev => [...saved, ...prev])
  }

  function bestScreening(candidateId) {
    const apps = appMap[candidateId] || []
    return [...apps]
      .filter(a => a.screen_score != null)
      .sort((a, b) => b.screen_score - a.screen_score)[0] || null
  }

  function latestApp(candidateId) {
    const apps = appMap[candidateId] || []
    return apps[0] || null
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', paddingBottom: 40 }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
            Candidate database
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>
            {totalCandidatesCount} candidate{totalCandidatesCount !== 1 ? 's' : ''} in your talent pool
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowMatchBar(v => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              background: '#FFF',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <Sparkles size={14} color="#4F46E5" /> Match with JD
          </button>

          <button
            onClick={() => setShowImport(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 38,
              padding: '0 16px',
              borderRadius: 8,
              background: '#4F46E5',
              border: 'none',
              color: '#FFF',
              fontWeight: 600,
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            <Upload size={14} /> Import CVs
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {stats.map((card, idx) => (
          <div key={idx} className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search name, role, skills, location..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1) }}
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

        {/* Job Title filter */}
        <div style={{ position: 'relative', width: 220 }}>
          <select
            value={fJob}
            onChange={(e) => { setFJob(e.target.value); setCurrentPage(1) }}
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
            <option value="all">Job Title</option>
            {jobTitleOptions.map((j) => (
              <option key={j.id} value={j.id}>{j.title}</option>
            ))}
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Filter Trigger button */}
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 40,
            padding: '0 16px',
            borderRadius: 10,
            background: '#FFF',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          <Filter size={14} /> Filters
        </button>

        {hasFilters && (
          <button onClick={clearFilters} className="btn btn-ghost btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#4F46E5', whiteSpace: 'nowrap' }}>
            <X size={13} /> Clear filters
          </button>
        )}
      </div>

      {/* Match with JD Inline Panel */}
      {showMatchBar && (
        <div className="card" style={{ padding: 20, marginBottom: 20, border: '1.5px solid #4F46E5', background: 'rgba(79, 70, 229, 0.02)', borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Sparkles size={16} color="#4F46E5" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#4F46E5', marginRight: 4 }}>Match with JD</span>
            <select
              value={matchJobId}
              onChange={e => { setMatchJobId(e.target.value); setMatchResults({}); setMatchError('') }}
              style={{ flex: 1, minWidth: 200, fontSize: 13, height: 38, borderRadius: 8 }}
              disabled={matchRunning}
            >
              <option value="">Select a job to match against…</option>
              {jobs.filter(j => j.jd).map(j => (
                <option key={j.id} value={j.id}>{j.title}{j.department ? ` — ${j.department}` : ''}</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              onClick={runMatch}
              disabled={!matchJobId || matchRunning}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, fontSize: 13 }}
            >
              {matchRunning ? (
                <>
                  <Loader size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  Screening {matchProgress.done}/{matchProgress.total}
                </>
              ) : (
                <><Sparkles size={13} /> Run Match</>
              )}
            </button>
            {hasMatchResults && (
              <button className="btn btn-ghost btn-sm" onClick={clearMatch}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-3)' }}>
                <X size={13} /> Clear
              </button>
            )}
          </div>

          {matchRunning && (
            <div style={{ marginTop: 12 }}>
              <div style={{ height: 5, background: 'var(--border)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${matchProgress.total ? (matchProgress.done / matchProgress.total) * 100 : 0}%`, background: '#4F46E5', transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          {matchError && <p style={{ color: 'var(--danger)', fontSize: 13, margin: '8px 0 0' }}>{matchError}</p>}
        </div>
      )}

      {/* Main layout: Grid with sliding panel if candidate is selected */}
      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20, alignItems: 'flex-start' }}>
        
        {/* Candidates Grid Column */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: selected ? 'repeat(auto-fill, minmax(260px, 1fr))' : 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: 16,
          alignContent: 'start'
        }}>
          {loading ? (
            <div className="card" style={{ padding: 32, gridColumn: '1/-1' }}>Loading candidates…</div>
          ) : sorted.length === 0 ? (
            <div className="card empty-state" style={{ padding: 48, borderRadius: 16, gridColumn: '1/-1' }}>
              <div className="icon">🔍</div>
              <h3>No candidates found</h3>
              <p>Try resetting filters or matching options.</p>
            </div>
          ) : (
            <>
              {paginated.map(c => {
                const apps      = appMap[c.id] || []
                const top       = latestApp(c.id)
                const screen    = bestScreening(c.id)
                const jobTitle  = top?.jobs?.title || null
                const jobDept   = top?.jobs?.department || null
                const action    = lastAction(c.id)

                const mr        = matchResults[c.id] || null
                const score     = mr ? mr.score : (screen ? screen.screen_score : null)
                const isShortlisted = action?.label === 'Shortlisted'

                return (
                  <div
                    key={c.id}
                    className="card"
                    onClick={() => setSelected(selected?.id === c.id ? null : c)}
                    style={{
                      borderRadius: 16,
                      background: '#FFF',
                      border: selected?.id === c.id ? '1.5px solid #4F46E5' : '1px solid var(--border)',
                      padding: 20,
                      cursor: 'pointer',
                      boxShadow: '0 4px 18px rgba(0,0,0,0.015)',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: 260,
                      position: 'relative'
                    }}
                  >
                    <div>
                      {/* Top Header Row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ position: 'relative' }}>
                          <div className="avatar" style={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: '#EEF2FF', color: '#4F46E5',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700
                          }}>
                            {c.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{
                            position: 'absolute',
                            bottom: 1,
                            right: 1,
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: '#10B981',
                            border: '1.5px solid #FFF'
                          }} />
                        </div>


                      </div>

                      {/* Candidate Name & Current Role */}
                      <div style={{ marginBottom: 12 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          {getCleanCandidateName(c)}
                          {isShortlisted && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '1px 5px', borderRadius: 4 }}>
                              Shortlisted
                            </span>
                          )}
                        </h3>
                        {c.role ? (
                          <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600 }}>{c.role}</div>
                        ) : (
                          <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>No designation</div>
                        )}
                      </div>

                      {/* Job & Location Badges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {jobTitle && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Briefcase size={12} color="var(--text-3)" style={{ flexShrink: 0 }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: '#4F46E5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jobTitle}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                          {c.location && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#3B82F6',
                              background: '#EFF6FF',
                              padding: '2px 8px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <MapPin size={11} color="#3B82F6" /> {c.location}
                            </span>
                          )}
                          {c.experience > 0 && (
                            <span style={{
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#10B981',
                              background: '#ECFDF5',
                              padding: '2px 8px',
                              borderRadius: 4,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}>
                              <Clock size={11} color="#10B981" /> {c.experience} yrs
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Skills lists */}
                      {c.skills?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
                          {c.skills.slice(0, 3).map(s => (
                            <span key={s} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-2)', background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>
                              {s}
                            </span>
                          ))}
                          {c.skills.length > 3 && (
                            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', background: '#F3F4F6', padding: '2px 6px', borderRadius: 4 }}>
                              +{c.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Card Actions Row */}
                    <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, height: 30, fontSize: 11, fontWeight: 600 }}
                        onClick={(e) => { e.stopPropagation(); setSelected(c) }}
                      >
                        View profile
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ padding: 4, height: 30, width: 30, borderRadius: 6 }}
                        onClick={(e) => { e.stopPropagation(); alert('More actions options menu') }}
                      >
                        <MoreVertical size={14} color="var(--text-3)" />
                      </button>
                    </div>
                  </div>
                )
              })}

              {/* Pagination block */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 20px',
                background: '#FFF',
                border: '1px solid var(--border)',
                borderRadius: 16,
                marginTop: 10,
                flexWrap: 'wrap',
                gap: 12
              }}>
                <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  Showing {sorted.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} to {Math.min(currentPage * rowsPerPage, sorted.length)} of {sorted.length} candidates
                </span>

                {/* Pagination Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                      background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1
                    const isActive = currentPage === pageNum
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: isActive ? 'none' : '1px solid var(--border)',
                          background: isActive ? '#4F46E5' : '#FFF',
                          color: isActive ? '#FFF' : 'var(--text-2)',
                          fontWeight: isActive ? 700 : 500,
                          cursor: 'pointer',
                          fontSize: 13
                        }}
                      >
                        {pageNum}
                      </button>
                    )
                  })}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)',
                      background: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Rows per page dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-3)' }}>Rows per page</span>
                  <div style={{ position: 'relative', width: 70 }}>
                    <select
                      value={rowsPerPage}
                      onChange={(e) => { setRowsPerPage(parseInt(e.target.value)); setCurrentPage(1) }}
                      style={{
                        height: 32, fontSize: 13, paddingLeft: 8, paddingRight: 24,
                        borderRadius: 8, border: '1px solid var(--border)', background: '#FFF',
                        appearance: 'none', cursor: 'pointer'
                      }}
                    >
                      <option value="20">20</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                    <ChevronDown size={12} color="var(--text-3)" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

              </div>
            </>
          )}
        </div>

        {/* Detail sliding sidebar panel */}
        {selected && (() => {
          const apps   = appMap[selected.id] || []
          const screen = bestScreening(selected.id)
          const rec    = screen?.screen_recommendation
          const recStyle = rec ? REC_STYLE[rec] : null

          return (
            <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: '2rem', maxHeight: 'calc(100vh - 4rem)', overflowY: 'auto', borderRadius: 16, border: '1px solid var(--border)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1rem' }}>
                <div className="avatar" style={{ width: 48, height: 48, fontSize: 16, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {getCleanCandidateName(selected).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{getCleanCandidateName(selected)}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selected.role}{selected.experience ? ` · ${selected.experience}y exp` : ''}</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)} style={{ flexShrink: 0 }}><X size={14} /></button>
              </div>

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
                </div>
              )}

              {[['Email', getCleanCandidateEmail(selected) || '—'], ['Phone', selected.phone], ['Location', selected.location], ['Education', selected.education]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)' }}>{l}</span>
                  <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: 200, wordBreak: 'break-all' }}>{v || '—'}</span>
                </div>
              ))}

              {selected.rating != null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 4 }}>
                  <Star size={14} color="#FBBF24" fill="#FBBF24" />
                  <span style={{ fontWeight: 700, fontSize: 17 }}>{selected.rating}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>/ 5.0</span>
                </div>
              )}

              {screen ? (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <TrendingUp size={11} /> AI Screening Results
                  </div>

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

              {selected.skills?.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 6 }}>SKILLS</div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {selected.skills.map(s => <span key={s} className="badge badge-brand">{s}</span>)}
                  </div>
                </div>
              )}

              {selected.cv_text && (
                <div style={{ marginTop: 12, padding: 10, background: '#F8F9FC', borderRadius: 8 }}>
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
