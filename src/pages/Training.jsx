import { useState, useEffect, useRef } from 'react'
import {
  fetchEmployees, fetchTrainingModules, createEmployee, fetchCandidatesForTraining,
  createTrainingModule, uploadTrainingFile, updateEmployee
} from '../lib/supabase.js'
import {
  GraduationCap, PlayCircle, FileText, CheckCircle, Clock,
  ChevronDown, ChevronUp, Send, AlertCircle, UserPlus, X,
  Users, User, Upload, Video, BookOpen, Plus, Circle, Square, Camera, RefreshCw, Pause, Play
} from 'lucide-react'

// ─── CONSTANTS ────────────────────────────────────────────────

const QUIZ = [
  { q: 'What is your primary goal in the first 30 days?',  opts: ['Close deals immediately', 'Learn product and processes', 'Manage the team', 'Set up infrastructure'], ans: 1 },
  { q: 'Which tool tracks the sales pipeline?',            opts: ['HubSpot', 'Salesforce', 'Zoho', 'The system you trained on'], ans: 3 },
  { q: 'How should you handle a pricing objection?',       opts: ['Offer a discount', 'Acknowledge and reframe value', 'Escalate to manager', 'End the call'], ans: 1 },
  { q: 'First step when you receive a new lead?',          opts: ['Call immediately', 'Qualify against ICP criteria', 'Send a generic email', 'Mark as won'], ans: 1 },
]

const TRAINING_TYPES = [
  { value: 'general',          label: 'General Onboarding',   tag: 'all' },
  { value: 'sales',            label: 'Sales & BD',           tag: 'sales' },
  { value: 'engineering',      label: 'Engineering & Dev',    tag: 'engineering' },
  { value: 'hr',               label: 'HR & Admin',           tag: 'hr' },
  { value: 'operations',       label: 'Operations',           tag: 'operations' },
  { value: 'management',       label: 'Management',           tag: 'management' },
  { value: 'customer_success', label: 'Customer Success',     tag: 'customer_success' },
]

const STATUS_COLORS = {
  hired: 'success', offer_sent: 'brand', interview_done: 'brand',
  consent_accepted: 'success', shortlisted: 'brand', interview_scheduled: 'brand',
  consent_sent: 'gray'
}

// ─── ADD EMPLOYEE MODAL ───────────────────────────────────────

function AddEmployeeModal({ onClose, onAdded }) {
  const [mode, setMode]             = useState('candidate')
  const [candidates, setCandidates] = useState([])
  const [loadingC, setLoadingC]     = useState(false)
  const [selected, setSelected]     = useState(null)
  const [form, setForm]             = useState({ name: '', profile: '', mobile: '', email: '' })
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    if (mode === 'candidate') {
      setLoadingC(true)
      fetchCandidatesForTraining()
        .then(setCandidates)
        .catch(e => setError(e.message))
        .finally(() => setLoadingC(false))
    }
  }, [mode])

  async function enrollCandidate() {
    if (!selected) return
    setSaving(true); setError('')
    try {
      const c = selected.candidates
      const emp = await createEmployee({
        name: c.name, emp_id: 'EMP' + Date.now().toString().slice(-6),
        job_title: selected.jobs?.title || 'Employee',
        department: selected.jobs?.department || 'General',
        email: c.email, phone: c.phone || null,
        candidate_id: c.id, application_id: selected.id,
        status: 'active', date_of_joining: new Date().toISOString().slice(0, 10)
      })
      onAdded(emp); onClose()
    } catch (e) { setError(e.message); setSaving(false) }
  }

  async function addManually() {
    if (!form.name || !form.profile || !form.email) { setError('Name, Profile, and Email are required.'); return }
    setSaving(true); setError('')
    try {
      const emp = await createEmployee({
        name: form.name.trim(), emp_id: 'EMP' + Date.now().toString().slice(-6),
        job_title: form.profile.trim(), department: 'General',
        email: form.email.trim(), phone: form.mobile.trim() || null,
        status: 'active', date_of_joining: new Date().toISOString().slice(0, 10)
      })
      onAdded(emp); onClose()
    } catch (e) { setError(e.message); setSaving(false) }
  }

  return (
    <Modal title={<><UserPlus size={18} color="var(--brand)"/> Add Employee to Training</>} onClose={onClose} width={560}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 1.5rem', gap: 4 }}>
        {[['candidate', 'From Candidates', <Users size={13}/>], ['manual', 'Add Manually', <User size={13}/>]].map(([m, label, icon]) => (
          <button key={m} onClick={() => { setMode(m); setSelected(null); setError('') }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13,
              fontWeight: mode === m ? 700 : 400, color: mode === m ? 'var(--brand)' : 'var(--text-3)',
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: mode === m ? '2px solid var(--brand)' : '2px solid transparent' }}>
            {icon} {label}
          </button>
        ))}
      </div>
      <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '52vh' }}>
        {mode === 'candidate' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>Select a shortlisted or hired candidate from the pipeline to enroll in training.</p>
            {loadingC && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>}
            {!loadingC && candidates.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                <GraduationCap size={28} style={{ marginBottom: 8, opacity: .4 }}/><br/>No shortlisted/hired candidates available yet.
              </div>
            )}
            {candidates.map(app => {
              const c = app.candidates; const isSel = selected?.id === app.id
              return (
                <div key={app.id} onClick={() => setSelected(isSel ? null : app)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 6,
                    cursor: 'pointer', border: isSel ? '1.5px solid var(--brand)' : '1px solid var(--border)',
                    background: isSel ? 'rgba(99,102,241,.06)' : '#fff' }}>
                  <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
                    {c?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{c?.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {app.jobs?.title} {app.jobs?.department && `· ${app.jobs.department}`}
                      <span className={`badge badge-${STATUS_COLORS[app.status] || 'gray'}`} style={{ fontSize: 10 }}>{app.status?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  {isSel && <CheckCircle size={16} color="var(--brand)"/>}
                </div>
              )
            })}
          </div>
        )}
        {mode === 'manual' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1.25rem' }}>Add a new employee directly without going through the hiring pipeline.</p>
            <div className="form-row">
              <div className="form-group"><label>Full name *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rahul Sharma"/></div>
              <div className="form-group"><label>Profile / Role *</label><input value={form.profile} onChange={e => set('profile', e.target.value)} placeholder="e.g. Sales Executive"/></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label>Mobile no</label><input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 98765 43210"/></div>
              <div className="form-group"><label>Email ID *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="rahul@company.com"/></div>
            </div>
          </div>
        )}
        {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>
      <ModalFooter onClose={onClose}>
        {mode === 'candidate'
          ? <button className="btn btn-primary" onClick={enrollCandidate} disabled={!selected || saving}>{saving ? 'Enrolling…' : <><GraduationCap size={14}/> Enroll in Training</>}</button>
          : <button className="btn btn-primary" onClick={addManually} disabled={saving}>{saving ? 'Adding…' : <><UserPlus size={14}/> Add Employee</>}</button>}
      </ModalFooter>
    </Modal>
  )
}

// ─── ADD TRAINING CONTENT MODAL ──────────────────────────────

// Format seconds as MM:SS
function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function AddContentModal({ onClose, onAdded }) {
  const [form, setForm] = useState({
    title: '', type: 'video', category: 'general',
    description: '', duration: ''
  })
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState('')
  const [error, setError]         = useState('')

  // Live recorder state
  const [videoTab, setVideoTab]       = useState('upload')  // 'upload' | 'record'
  const [recState, setRecState]       = useState('idle')     // 'idle'|'requesting'|'ready'|'recording'|'paused'|'done'
  const [recPaused, setRecPaused]     = useState(false)
  const [recTime, setRecTime]         = useState(0)
  const [recordedUrl, setRecordedUrl] = useState(null)

  const previewRef  = useRef(null)
  const streamRef   = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])
  const timerRef    = useRef(null)
  const mimeRef     = useRef('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    clearInterval(timerRef.current)
  }

  useEffect(() => () => stopStream(), [])

  // ← THE KEY FIX: attach stream to video element AFTER React renders it
  useEffect(() => {
    if ((recState === 'ready' || recState === 'recording' || recState === 'paused') &&
        previewRef.current && streamRef.current) {
      previewRef.current.srcObject = streamRef.current
      previewRef.current.play().catch(() => {})
    }
  }, [recState])

  function switchVideoTab(tab) {
    if (tab === 'upload') {
      stopStream()
      setRecState('idle')
      setRecordedUrl(null)
      setFile(null)
      setRecPaused(false)
      setRecTime(0)
    }
    setVideoTab(tab)
    setError('')
  }

  async function startCamera() {
    setRecState('requesting')
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: true
      })
      streamRef.current = stream
      setRecState('ready')   // useEffect above will attach stream once video element is in DOM
    } catch (e) {
      setError('Camera access denied or not available. ' + (e.message || ''))
      setRecState('idle')
    }
  }

  function startRecording() {
    const stream = streamRef.current
    if (!stream) return
    chunksRef.current = []
    setRecordedUrl(null)
    setRecTime(0)
    setRecPaused(false)

    const mimeType = ['video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
      .find(m => MediaRecorder.isTypeSupported(m)) || ''
    mimeRef.current = mimeType

    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: 600_000,
      audioBitsPerSecond: 64_000,
    })
    recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = () => {
      const mime = mimeRef.current || 'video/webm'
      const blob = new Blob(chunksRef.current, { type: mime })
      const ext  = mime.includes('mp4') ? 'mp4' : 'webm'
      setFile(new File([blob], `recording-${Date.now()}.${ext}`, { type: blob.type }))
      setRecordedUrl(URL.createObjectURL(blob))
      setRecState('done')
    }
    recorder.start(500)
    recorderRef.current = recorder
    setRecState('recording')
    timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000)
  }

  function pauseRecording() {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.pause()
      clearInterval(timerRef.current)
      setRecPaused(true)
      setRecState('paused')
    }
  }

  function resumeRecording() {
    if (recorderRef.current?.state === 'paused') {
      recorderRef.current.resume()
      timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000)
      setRecPaused(false)
      setRecState('recording')
    }
  }

  function stopRecording() {
    clearInterval(timerRef.current)
    recorderRef.current?.stop()
    stopStream()
    // recState → 'done' is set inside recorder.onstop
  }

  function reRecord() {
    setRecordedUrl(null)
    setFile(null)
    setRecTime(0)
    setRecPaused(false)
    setRecState('idle')
    setError('')
  }

  const accept = 'video/mp4,video/webm,video/ogg,video/quicktime'
  const docAccept = '.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

  async function handleSave() {
    if (!form.title) { setError('Title is required.'); return }
    if (!file)       { setError(form.type === 'video' ? 'Please upload or record a video.' : 'Please select a file.'); return }
    setUploading(true); setError('')
    try {
      setProgress('Uploading file…')
      const path = `${form.type}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`
      const url  = await uploadTrainingFile(file, path)

      setProgress('Saving module…')
      const tagMap = Object.fromEntries(TRAINING_TYPES.map(t => [t.value, t.tag]))
      const mod = await createTrainingModule({
        title:        form.title.trim(),
        type:         form.type,
        description:  form.description.trim() || null,
        duration:     form.duration.trim() || (recTime > 0 ? fmtTime(recTime) : null),
        content_url:  url,
        profile_tags: [tagMap[form.category] || 'all'],
        order_index:  999,
        is_mandatory: false
      })
      onAdded(mod)
      onClose()
    } catch (e) {
      setError(e.message)
      setUploading(false)
      setProgress('')
    }
  }

  return (
    <Modal title={<><Upload size={18} color="var(--brand)"/> Add Training Content</>} onClose={onClose} width={560}>
      <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>

        {/* ── Content type tabs ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
          {[
            ['video',    'Training Video',    <Video size={14}/>],
            ['document', 'Training Document', <FileText size={14}/>],
          ].map(([v, l, icon]) => (
            <button key={v} onClick={() => { set('type', v); setFile(null); switchVideoTab('upload') }}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: form.type === v ? '2px solid var(--brand)' : '1px solid var(--border)',
                background: form.type === v ? 'rgba(99,102,241,.07)' : '#fff',
                color: form.type === v ? 'var(--brand)' : 'var(--text-2)' }}>
              {icon} {l}
            </button>
          ))}
        </div>

        {/* ── Video sub-tabs: Upload vs Record ── */}
        {form.type === 'video' && (
          <div style={{ display: 'flex', gap: 6, marginBottom: '1.25rem', padding: '4px', background: 'var(--bg-2)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {[
              ['upload', <Upload size={13}/>, 'Upload File'],
              ['record', <Camera size={13}/>, 'Record Live'],
            ].map(([tab, icon, label]) => (
              <button key={tab} onClick={() => switchVideoTab(tab)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  padding: '7px 10px', borderRadius: 6, fontSize: 13, fontWeight: videoTab === tab ? 700 : 500, cursor: 'pointer',
                  border: 'none', background: videoTab === tab ? '#ffffff' : 'transparent',
                  color: videoTab === tab ? 'var(--brand)' : 'var(--text-3)',
                  boxShadow: videoTab === tab ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                  transition: 'all .15s' }}>
                {icon} {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Upload tab ── */}
        {(form.type === 'document' || videoTab === 'upload') && (
          <div className="form-group">
            <label>Upload file *</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              border: '1.5px dashed var(--border)', borderRadius: 8, cursor: 'pointer',
              background: file ? 'rgba(34,197,94,.06)' : 'var(--bg-2)' }}>
              <input type="file" accept={form.type === 'video' ? accept : docAccept} style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}/>
              {file
                ? <><CheckCircle size={15} color="var(--success)"/>
                    <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>{file.name}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{(file.size/1024/1024).toFixed(1)} MB</span></>
                : <><Upload size={15} color="var(--text-3)"/>
                    <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                      Click to select {form.type === 'video' ? 'video (MP4, WebM, MOV)' : 'document (PDF, DOC, DOCX)'}
                    </span></>}
            </label>
          </div>
        )}

        {/* ── Record Live tab — shown BEFORE form fields so buttons are immediately visible ── */}
        {form.type === 'video' && videoTab === 'record' && (
          <div style={{ marginBottom: '1rem' }}>

            {/* Quality note */}
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Camera size={11}/> Records at 640×480 · 24fps · 600 kbps — medium quality, compact file size
            </div>

            {/* Idle: start camera button */}
            {recState === 'idle' && (
              <button onClick={startCamera} className="btn btn-secondary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '14px', fontSize: 14 }}>
                <Camera size={16}/> Start Camera
              </button>
            )}

            {/* Requesting camera */}
            {recState === 'requesting' && (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-3)', fontSize: 13 }}>
                <Camera size={24} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.5 }}/>
                Requesting camera access…
              </div>
            )}

            {/* Live preview — rendered for 'ready'|'recording'|'paused' so previewRef is valid */}
            {(recState === 'ready' || recState === 'recording' || recState === 'paused') && (
              <div>
                <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 10 }}>
                  <video ref={previewRef} muted autoPlay playsInline
                    style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }}/>

                  {/* REC timer badge */}
                  {recState === 'recording' && (
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 6,
                      background: 'rgba(0,0,0,.65)', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      <Circle size={9} style={{ color: '#ef4444', fill: '#ef4444', animation: 'pulse 1s infinite' }}/>
                      {fmtTime(recTime)}
                    </div>
                  )}

                  {/* PAUSED overlay */}
                  {recState === 'paused' && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.45)', gap: 6 }}>
                      <Pause size={32} style={{ color: '#fff' }}/>
                      <span style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>PAUSED · {fmtTime(recTime)}</span>
                    </div>
                  )}
                </div>

                {/* Start button when camera is ready */}
                {recState === 'ready' && (
                  <button onClick={startRecording} className="btn btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <Circle size={14} style={{ fill: '#fff' }}/> Start Recording
                  </button>
                )}

                {/* Pause + Stop buttons while recording */}
                {recState === 'recording' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={pauseRecording}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: '2px solid var(--warning)', background: 'rgba(234,179,8,.08)', color: 'var(--warning)' }}>
                      <Pause size={14}/> Pause
                    </button>
                    <button onClick={stopRecording}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        border: '2px solid var(--danger)', background: 'rgba(239,68,68,.08)', color: 'var(--danger)' }}>
                      <Square size={14} style={{ fill: 'var(--danger)' }}/> Stop
                    </button>
                  </div>
                )}

                {/* Resume + Stop buttons while paused */}
                {recState === 'paused' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={resumeRecording}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        border: '2px solid var(--brand)', background: 'rgba(99,102,241,.08)', color: 'var(--brand)' }}>
                      <Play size={14}/> Resume
                    </button>
                    <button onClick={stopRecording}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '9px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        border: '2px solid var(--danger)', background: 'rgba(239,68,68,.08)', color: 'var(--danger)' }}>
                      <Square size={14} style={{ fill: 'var(--danger)' }}/> Stop &amp; Save
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Done — show recorded video preview */}
            {recState === 'done' && recordedUrl && (
              <div>
                <video ref={playbackRef} src={recordedUrl} controls
                  style={{ width: '100%', borderRadius: 10, maxHeight: 180, background: '#000', display: 'block', marginBottom: 10 }}/>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 12 }}>
                    <span><CheckCircle size={12} style={{ color: 'var(--success)', display: 'inline', marginRight: 4 }}/>Recording saved</span>
                    <span>Duration: <strong>{fmtTime(recTime)}</strong></span>
                    <span>Size: <strong>{file ? (file.size/1024/1024).toFixed(1) + ' MB' : '—'}</strong></span>
                  </div>
                  <button onClick={reRecord} className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                    <RefreshCw size={12}/> Re-record
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Form fields — below the media section ── */}
        <div className="form-group">
          <label>Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder={form.type === 'video' ? 'e.g. Product Demo Walkthrough' : 'e.g. Sales Process Guide'}/>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Training category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Duration</label>
            <input value={form.duration} onChange={e => set('duration', e.target.value)}
              placeholder={recState === 'done' ? fmtTime(recTime) : 'e.g. 30 min'}/>
          </div>
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="What will the employee learn from this module?"
            style={{ minHeight: 60, resize: 'vertical' }}/>
        </div>

        {uploading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
            background: 'rgba(99,102,241,.08)', borderRadius: 6, fontSize: 13, color: 'var(--brand)' }}>
            <span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }}/> {progress}
          </div>
        )}
        {error && (
          <div style={{ background: 'rgba(239,68,68,.08)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 }}>
            {error}
          </div>
        )}
      </div>

      <ModalFooter onClose={onClose}>
        <button className="btn btn-primary" onClick={handleSave} disabled={uploading}>
          {uploading ? 'Uploading…' : <><Upload size={14}/> Upload &amp; Save</>}
        </button>
      </ModalFooter>
    </Modal>
  )
}

// ─── MODAL SHELL HELPERS ──────────────────────────────────────

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 12, width: '100%', maxWidth: width,
        boxShadow: '0 20px 60px rgba(0,0,0,.18)', display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 16 }}>{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ onClose, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid var(--border)' }}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      {children}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────

export default function Training() {
  const [employees, setEmployees]       = useState([])
  const [modules, setModules]           = useState([])
  const [selectedEmp, setSelectedEmp]   = useState(null)
  const [completedMods, setCompleted]   = useState({})
  const [expanded, setExpanded]         = useState(null)
  const [quizStarted, setQuizStarted]   = useState(false)
  const [answers, setAnswers]           = useState({})
  const [submitted, setSubmitted]       = useState(false)
  const [mgrApproved, setMgrApproved]   = useState({})
  const [ticket, setTicket]             = useState('')
  const [ticketSent, setTicketSent]     = useState(false)
  const [loading, setLoading]           = useState(true)
  const [showAddEmp, setShowAddEmp]     = useState(false)
  const [showAddContent, setShowAddContent] = useState(false)
  const [playingMod, setPlayingMod]     = useState(null)
  const [updatingType, setUpdatingType] = useState(false)

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchTrainingModules()])
      .then(([e, m]) => { setEmployees(e); setModules(m) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function handleAdded(emp) { setEmployees(prev => [emp, ...prev]); selectEmp(emp) }
  function handleModuleAdded(mod) { setModules(prev => [...prev, mod]) }

  function selectEmp(emp) {
    setSelectedEmp(emp)
    setQuizStarted(false); setSubmitted(false); setAnswers({})
    setTicketSent(false); setTicket(''); setExpanded(null); setPlayingMod(null)
  }

  async function changeTrainingType(newType) {
    if (!selectedEmp || updatingType) return
    setUpdatingType(true)
    try {
      const updated = await updateEmployee(selectedEmp.id, { training_type: newType })
      setSelectedEmp(updated)
      setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e))
      setCompleted(prev => ({ ...prev, [updated.id]: {} }))
      setQuizStarted(false); setSubmitted(false); setExpanded(null); setPlayingMod(null)
    } catch (e) { console.error(e) }
    setUpdatingType(false)
  }

  function getModsForEmp(emp) {
    if (!emp) return []
    const ttype = emp.training_type || 'general'
    const typeObj = TRAINING_TYPES.find(t => t.value === ttype)
    const tag = typeObj?.tag || 'all'
    return modules.filter(m => {
      if (!m.profile_tags || m.profile_tags.length === 0) return true
      if (m.profile_tags.includes('all')) return true
      return m.profile_tags.includes(tag)
    })
  }

  const empMods  = selectedEmp ? getModsForEmp(selectedEmp) : []
  const done     = completedMods[selectedEmp?.id] || {}
  const progress = empMods.length ? Math.round(Object.keys(done).length / empMods.length * 100) : 0
  const allDone  = empMods.length > 0 && empMods.every(m => done[m.id])
  const score    = submitted ? QUIZ.reduce((s, q, i) => s + (answers[i] === q.ans ? 1 : 0), 0) : null
  const passed   = score !== null && score >= 3

  function markDone(modId) {
    setCompleted(prev => ({ ...prev, [selectedEmp.id]: { ...(prev[selectedEmp.id] || {}), [modId]: true } }))
    setPlayingMod(null)
  }

  if (loading) return <div className="card" style={{ padding: '2rem', color: 'var(--text-3)' }}>Loading training data…</div>

  return (
    <div>
      {showAddEmp     && <AddEmployeeModal onClose={() => setShowAddEmp(false)} onAdded={handleAdded}/>}
      {showAddContent && <AddContentModal  onClose={() => setShowAddContent(false)} onAdded={handleModuleAdded}/>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Training</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Onboarding and training management for new employees.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowAddContent(true)}>
            <Plus size={15}/> Add Training Content
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddEmp(true)}>
            <UserPlus size={15}/> Add Employee
          </button>
        </div>
      </div>

      {employees.length === 0 ? (
        <div className="card empty-state">
          <div className="icon"><GraduationCap size={36}/></div>
          <h3>No employees in training yet</h3>
          <p>Transfer hired candidates from the Hiring tab or add employees directly.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAddEmp(true)}>
            <UserPlus size={15}/> Add First Employee
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 16 }}>

          {/* ── Left: employee list ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Employees</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddEmp(true)} style={{ padding: '3px 7px' }}><UserPlus size={13}/></button>
            </div>
            {employees.map(emp => {
              const mlist = getModsForEmp(emp)
              const pct   = mlist.length ? Math.round(Object.keys(completedMods[emp.id] || {}).length / mlist.length * 100) : 0
              const ttype = TRAINING_TYPES.find(t => t.value === (emp.training_type || 'general'))
              return (
                <div key={emp.id} onClick={() => selectEmp(emp)} className="card"
                  style={{ padding: '0.9rem 1rem', marginBottom: 8, cursor: 'pointer',
                    border: selectedEmp?.id === emp.id ? '1.5px solid var(--brand)' : '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar">{emp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ttype?.label || 'General'}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--brand)', flexShrink: 0 }}>{pct}%</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Right: training content ── */}
          {selectedEmp ? (
            <div>
              {/* Employee header card */}
              <div className="card" style={{ marginBottom: 12, padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 15 }}>
                    {selectedEmp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{selectedEmp.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      {selectedEmp.job_title} · {selectedEmp.emp_id}
                      {selectedEmp.phone && <span> · {selectedEmp.phone}</span>}
                    </div>
                    {selectedEmp.email && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selectedEmp.email}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: progress === 100 ? 'var(--success)' : 'var(--brand)' }}>{progress}%</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>complete</div>
                  </div>
                </div>

                {/* Training type assignment */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 10 }}>
                  <BookOpen size={14} color="var(--brand)"/>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', flexShrink: 0 }}>Training Track</span>
                  <select
                    value={selectedEmp.training_type || 'general'}
                    onChange={e => changeTrainingType(e.target.value)}
                    disabled={updatingType}
                    style={{ flex: 1, padding: '5px 8px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                  >
                    {TRAINING_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {updatingType && <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }}/>}
                </div>

                <div className="score-bar-track">
                  <div className="score-bar-fill" style={{ width: `${progress}%`, background: progress === 100 ? 'var(--success)' : 'var(--brand)' }}/>
                </div>
              </div>

              {/* Training modules */}
              <div className="card" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <h2 style={{ fontSize: 15 }}>Training modules</h2>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAddContent(true)}>
                    <Plus size={13}/> Add content
                  </button>
                </div>

                {empMods.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                    <BookOpen size={24} style={{ marginBottom: 8, opacity: .4 }}/><br/>
                    No modules for this training track yet.<br/>
                    <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => setShowAddContent(true)}>
                      <Plus size={13}/> Upload training content
                    </button>
                  </div>
                ) : empMods.map((m, i) => {
                  const isDone  = done[m.id]
                  const isExp   = expanded === m.id
                  const isPlay  = playingMod === m.id
                  return (
                    <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, overflow: 'hidden' }}>
                      {/* Module header row */}
                      <div onClick={() => setExpanded(isExp ? null : m.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px',
                          background: isDone ? 'var(--success-bg)' : '#fff', cursor: 'pointer' }}>
                        <div style={{ width: 26, height: 26, borderRadius: '50%',
                          background: isDone ? 'var(--success)' : 'var(--surface-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {isDone ? <CheckCircle size={14} color="#fff"/> : <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>{i + 1}</span>}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{m.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              {m.type === 'video' ? <Video size={11}/> : <FileText size={11}/>} {m.type}
                            </span>
                            {m.duration && <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}><Clock size={11}/>{m.duration}</span>}
                            {m.is_mandatory && <span className="badge badge-danger" style={{ fontSize: 10 }}>Mandatory</span>}
                          </div>
                        </div>
                        <span className={`badge badge-${isDone ? 'success' : 'gray'}`}>{isDone ? 'Done' : 'Pending'}</span>
                        {isExp ? <ChevronUp size={14} color="var(--text-3)"/> : <ChevronDown size={14} color="var(--text-3)"/>}
                      </div>

                      {/* Expanded content */}
                      {isExp && (
                        <div style={{ padding: '14px', background: 'var(--surface-2)', borderTop: '1px solid var(--border)' }}>
                          {m.description && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 12, lineHeight: 1.6 }}>{m.description}</p>}

                          {/* VIDEO PLAYER */}
                          {m.type === 'video' && m.content_url && isPlay && (
                            <div style={{ marginBottom: 12 }}>
                              <video
                                src={m.content_url}
                                controls
                                style={{ width: '100%', borderRadius: 8, maxHeight: 320, background: '#000' }}
                              />
                            </div>
                          )}

                          {/* DOCUMENT VIEWER link */}
                          {m.type === 'document' && m.content_url && (
                            <div style={{ marginBottom: 12, padding: '10px 12px', background: '#fff', borderRadius: 6, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText size={16} color="var(--brand)"/>
                              <a href={m.content_url} target="_blank" rel="noopener noreferrer"
                                style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>
                                Open document ↗
                              </a>
                            </div>
                          )}

                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {m.type === 'video' && m.content_url && (
                              <button className="btn btn-secondary btn-sm" onClick={() => setPlayingMod(isPlay ? null : m.id)}>
                                <Video size={13}/> {isPlay ? 'Hide Video' : 'Watch Video'}
                              </button>
                            )}
                            {m.type === 'video' && !m.content_url && (
                              <button className="btn btn-secondary btn-sm" disabled><Video size={13}/> No video uploaded</button>
                            )}
                            {m.type === 'document' && !m.content_url && (
                              <button className="btn btn-secondary btn-sm" disabled><FileText size={13}/> No document uploaded</button>
                            )}
                            {!isDone && (
                              <button className="btn btn-success btn-sm" onClick={() => markDone(m.id)}>
                                <CheckCircle size={13}/> Mark complete
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Quiz — shown when all modules done */}
              {allDone && (
                <div className="card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
                    <GraduationCap size={18} color="var(--brand)"/>
                    <h2 style={{ fontSize: 15, flex: 1 }}>Self-evaluation quiz</h2>
                    {submitted && <span className={`badge badge-${passed ? 'success' : 'danger'}`}>{passed ? 'Passed' : 'Failed'}</span>}
                  </div>
                  {!quizStarted && !submitted && (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>All modules done! Take the quiz to confirm understanding.</p>
                      <button className="btn btn-primary" onClick={() => setQuizStarted(true)}>Start quiz</button>
                    </div>
                  )}
                  {quizStarted && !submitted && (
                    <div>
                      {QUIZ.map((q, i) => (
                        <div key={i} style={{ marginBottom: '1.25rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Q{i + 1}. {q.q}</div>
                          {q.opts.map((o, j) => (
                            <label key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', cursor: 'pointer', fontSize: 13 }}>
                              <input type="radio" name={`q${i}`} checked={answers[i] === j} onChange={() => setAnswers(a => ({ ...a, [i]: j }))}/> {o}
                            </label>
                          ))}
                        </div>
                      ))}
                      <button className="btn btn-primary" onClick={() => setSubmitted(true)} disabled={Object.keys(answers).length < QUIZ.length}>Submit answers</button>
                    </div>
                  )}
                  {submitted && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1rem', background: passed ? 'var(--success-bg)' : 'var(--danger-bg)', borderRadius: 8, marginBottom: '1rem' }}>
                        {passed ? <CheckCircle size={24} color="var(--success)"/> : <AlertCircle size={24} color="var(--danger)"/>}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{passed ? 'Training complete!' : 'More review needed'}</div>
                          <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Score: {score}/{QUIZ.length} ({Math.round(score / QUIZ.length * 100)}%)</div>
                        </div>
                      </div>
                      {!passed && (
                        <div>
                          <label>Help ticket</label>
                          <textarea value={ticket} onChange={e => setTicket(e.target.value)} placeholder="I need help with…" style={{ minHeight: 80, marginBottom: 8 }}/>
                          {!ticketSent
                            ? <button className="btn btn-secondary btn-sm" onClick={() => setTicketSent(true)} disabled={!ticket.trim()}><Send size={13}/> Submit help ticket</button>
                            : <span className="badge badge-success">Ticket sent ✓</span>}
                          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => { setQuizStarted(false); setSubmitted(false); setAnswers({}) }}>↺ Retake</button>
                        </div>
                      )}
                      {passed && !mgrApproved[selectedEmp.id] && (
                        <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Awaiting manager approval</div>
                          <button className="btn btn-secondary btn-sm" style={{ marginTop: 8 }} onClick={() => setMgrApproved(m => ({ ...m, [selectedEmp.id]: true }))}>
                            [Manager] Approve training
                          </button>
                        </div>
                      )}
                      {passed && mgrApproved[selectedEmp.id] && (
                        <div style={{ padding: '1rem', background: 'var(--success-bg)', borderRadius: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
                          <CheckCircle size={20} color="var(--success)"/>
                          <div>
                            <div style={{ fontWeight: 700 }}>Fully approved!</div>
                            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{selectedEmp.name} is cleared for task assignment.</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="card empty-state">
              <div className="icon">👈</div>
              <h3>Select an employee</h3>
              <p>Click an employee on the left to view their training progress.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
