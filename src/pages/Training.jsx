import { useState, useEffect, useRef } from 'react'
import {
  fetchEmployees, fetchTrainingModules, createEmployee, fetchCandidatesForTraining,
  createTrainingModule, uploadTrainingFile, updateEmployee,
  fetchTrainingProgress, upsertTrainingProgress
} from '../lib/supabase.js'
import {
  GraduationCap, PlayCircle, FileText, CheckCircle, Clock,
  ChevronDown, ChevronUp, Send, AlertCircle, UserPlus, X,
  Users, User, Upload, Video, BookOpen, Plus, Circle, Square, Camera, RefreshCw, Pause, Play,
  Award, Shield, Heart, Search, ArrowRight, CheckSquare, Sparkles, Filter
} from 'lucide-react'

// ─── CONSTANTS ────────────────────────────────────────────────

const QUIZ = [
  { q: 'What is your primary goal in the first 30 days?',  opts: ['Close deals immediately', 'Learn product and processes', 'Manage the team', 'Set up infrastructure'], ans: 1 },
  { q: 'Which tool tracks the sales pipeline?',            opts: ['HubSpot', 'Salesforce', 'Zoho', 'The system you trained on'], ans: 3 },
  { q: 'How should you handle a pricing objection?',       opts: ['Offer a discount', 'Acknowledge and reframe value', 'Escalate to manager', 'End the call'], ans: 1 },
  { q: 'First step when you receive a new lead?',          opts: ['Call immediately', 'Qualify against ICP criteria', 'Send a generic email', 'Mark as won'], ans: 1 },
]

const INITIAL_TRAINING_TYPES = [
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={modalBox(560)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserPlus size={18} color="#4F46E5" /> Add Employee to Training
          </h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 16, gap: 4 }}>
          {[['candidate', 'From Candidates', <Users size={13}/>], ['manual', 'Add Manually', <User size={13}/>]].map(([m, label, icon]) => (
            <button key={m} onClick={() => { setMode(m); setSelected(null); setError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', fontSize: 13,
                fontWeight: mode === m ? 700 : 500, color: mode === m ? '#4F46E5' : 'var(--text-3)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: mode === m ? '2px solid #4F46E5' : '2px solid transparent' }}>
              {icon} {label}
            </button>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, maxHeight: '52vh' }}>
          {mode === 'candidate' && (
            <div>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 12 }}>Select a shortlisted or hired candidate from the pipeline to enroll in training.</p>
              {loadingC && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading candidates…</div>}
              {!loadingC && candidates.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', border: '1px dashed var(--border)', borderRadius: 8 }}>
                  <GraduationCap size={28} style={{ marginBottom: 8, opacity: .4 }}/><br/>No candidates ready for training.
                </div>
              )}
              {candidates.map(app => {
                const c = app.candidates; const isSel = selected?.id === app.id
                return (
                  <div key={app.id} onClick={() => setSelected(isSel ? null : app)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderRadius: 8, marginBottom: 6,
                      cursor: 'pointer', border: isSel ? '1.5px solid #4F46E5' : '1px solid var(--border)',
                      background: isSel ? 'rgba(79,70,229,.04)' : '#fff' }}>
                    <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
                      {c?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c?.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                        {app.jobs?.title} {app.jobs?.department && `· ${app.jobs.department}`}
                        <span className={`badge badge-${STATUS_COLORS[app.status] || 'gray'}`} style={{ fontSize: 10 }}>{app.status?.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    {isSel && <CheckCircle size={16} color="#4F46E5"/>}
                  </div>
                )
              })}
            </div>
          )}
          {mode === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 4 }}>Add a new employee directly without going through the hiring pipeline.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Full name *</label><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', borderRadius: 8 }}/></div>
                <div><label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Profile / Role *</label><input value={form.profile} onChange={e => set('profile', e.target.value)} placeholder="e.g. Sales Executive" style={{ width: '100%', borderRadius: 8 }}/></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Mobile no</label><input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', borderRadius: 8 }}/></div>
                <div><label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>Email ID *</label><input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="rahul@company.com" style={{ width: '100%', borderRadius: 8 }}/></div>
              </div>
            </div>
          )}
          {error && <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 13, marginTop: 8 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          {mode === 'candidate'
            ? <button className="btn btn-primary" onClick={enrollCandidate} disabled={!selected || saving}>{saving ? 'Enrolling…' : <><GraduationCap size={14} style={{ marginRight: 5 }}/> Enroll</>}</button>
            : <button className="btn btn-primary" onClick={addManually} disabled={saving}>{saving ? 'Adding…' : <><UserPlus size={14} style={{ marginRight: 5 }}/> Add Employee</>}</button>}
        </div>
      </div>
    </div>
  )
}

function modalBox(maxWidth = 560) {
  return {
    background: '#ffffff', borderRadius: 16, padding: '24px',
    width: '100%', maxWidth, boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
    maxHeight: '90vh', display: 'flex', flexDirection: 'column'
  }
}

// ─── ADD TRAINING CONTENT MODAL ──────────────────────────────

function fmtTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function AddContentModal({ employees, trainingTypes, setTrainingTypes, onClose, onAdded }) {
  const [form, setForm] = useState({
    title: '', type: 'video', category: 'general',
    description: '', duration: ''
  })
  const [file, setFile]           = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress]   = useState('')
  const [error, setError]         = useState('')
  const [selectedEmpIds, setSelectedEmpIds] = useState([])
  const [isAllSelected, setIsAllSelected] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const [showNewCatInput, setShowNewCatInput] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  function saveNewCategory() {
    if (!newCatName.trim()) return
    const label = newCatName.trim()
    const value = label.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const tag = value
    
    if (trainingTypes.some(t => t.value === value)) {
      setError('Category already exists.')
      return
    }

    const newCat = { value, label, tag }
    const updated = [...trainingTypes, newCat]
    setTrainingTypes(updated)
    set('category', value)
    setShowNewCatInput(false)
  }

  // Filter employees belonging to the selected category
  const categoryEmployees = (employees || []).filter(emp => {
    const empType = emp.training_type || 'general'
    return empType === form.category
  })

  function handleToggleAll() {
    if (isAllSelected) {
      setIsAllSelected(false)
      setSelectedEmpIds([])
    } else {
      setIsAllSelected(true)
      setSelectedEmpIds([])
    }
  }

  function handleToggleEmp(empId) {
    if (isAllSelected) {
      // Transition from all selected to manual selection
      setIsAllSelected(false)
      // Select all except the clicked one
      const others = categoryEmployees.filter(e => e.id !== empId).map(e => e.id)
      setSelectedEmpIds(others)
    } else {
      setSelectedEmpIds(prev => {
        const isChecked = prev.includes(empId)
        let updated
        if (isChecked) {
          updated = prev.filter(id => id !== empId)
        } else {
          updated = [...prev, empId]
        }
        
        // If all are now manually checked, make it "All Selected"
        if (updated.length === categoryEmployees.length) {
          setIsAllSelected(true)
          return []
        }
        return updated
      })
    }
  }

  const [videoTab, setVideoTab]       = useState('upload')
  const [recState, setRecState]       = useState('idle')
  const [recPaused, setRecPaused]     = useState(false)
  const [recTime, setRecTime]         = useState(0)
  const [recordedUrl, setRecordedUrl] = useState(null)

  const previewRef  = useRef(null)
  const playbackRef = useRef(null)
  const streamRef   = useRef(null)
  const recorderRef = useRef(null)
  const chunksRef   = useRef([])
  const timerRef    = useRef(null)
  const mimeRef     = useRef('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    setSelectedEmpIds([])
    setIsAllSelected(true)
  }, [form.category])

  function stopStream() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    clearInterval(timerRef.current)
  }

  useEffect(() => () => stopStream(), [])

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
      setRecState('ready')
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
      const tagMap = Object.fromEntries(trainingTypes.map(t => [t.value, t.tag]))
      const tags = [tagMap[form.category] || 'all']
      if (!isAllSelected && selectedEmpIds.length > 0) {
        selectedEmpIds.forEach(id => tags.push(`emp:${id}`))
      }
      const mod = await createTrainingModule({
        title:        form.title.trim(),
        type:         form.type,
        description:  form.description.trim() || null,
        duration:     form.duration.trim() || (recTime > 0 ? fmtTime(recTime) : null),
        content_url:  url,
        profile_tags: tags,
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16, backdropFilter: 'blur(2px)' }}>
      <div style={modalBox(560)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={18} color="#4F46E5"/> Add Training Content
          </h2>
          <button className="btn btn-ghost" onClick={onClose}><X size={16}/></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {[
              ['video',    'Training Video',    <Video size={14}/>],
              ['document', 'Training Document', <FileText size={14}/>],
            ].map(([v, l, icon]) => (
              <button key={v} onClick={() => { set('type', v); setFile(null); switchVideoTab('upload') }}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  border: form.type === v ? '2px solid #4F46E5' : '1px solid var(--border)',
                  background: form.type === v ? 'rgba(79,70,229,.07)' : '#fff',
                  color: form.type === v ? '#4F46E5' : 'var(--text-2)' }}>
                {icon} {l}
              </button>
            ))}
          </div>

          {form.type === 'video' && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, padding: '4px', background: '#F3F4F6', borderRadius: 8 }}>
              {[
                ['upload', <Upload size={13}/>, 'Upload File'],
                ['record', <Camera size={13}/>, 'Record Live'],
              ].map(([tab, icon, label]) => (
                <button key={tab} onClick={() => switchVideoTab(tab)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '7px 10px', borderRadius: 6, fontSize: 13, fontWeight: videoTab === tab ? 700 : 500, cursor: 'pointer',
                    border: 'none', background: videoTab === tab ? '#ffffff' : 'transparent',
                    color: videoTab === tab ? '#4F46E5' : 'var(--text-3)',
                    boxShadow: videoTab === tab ? '0 1px 4px rgba(0,0,0,.12)' : 'none',
                    transition: 'all .15s' }}>
                  {icon} {label}
                </button>
              ))}
            </div>
          )}

          {(form.type === 'document' || videoTab === 'upload') && (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Upload file *</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
                border: '1.5px dashed var(--border)', borderRadius: 8, cursor: 'pointer',
                background: file ? 'rgba(34,197,94,.06)' : '#F8F9FC' }}>
                <input type="file" accept={form.type === 'video' ? accept : docAccept} style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }}/>
                {file
                  ? <><CheckCircle size={15} color="#10B981"/>
                      <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{file.name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>{(file.size/1024/1024).toFixed(1)} MB</span></>
                  : <><Upload size={15} color="var(--text-3)"/>
                      <span style={{ fontSize: 13, color: 'var(--text-3)' }}>
                        Click to select {form.type === 'video' ? 'video' : 'document'}
                      </span></>}
              </label>
            </div>
          )}

          {form.type === 'video' && videoTab === 'record' && (
            <div style={{ marginBottom: 16 }}>
              {recState === 'idle' && (
                <button onClick={startCamera} className="btn btn-secondary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
                  <Camera size={16}/> Start Camera
                </button>
              )}

              {recState === 'requesting' && (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-3)' }}>
                  Requesting camera access…
                </div>
              )}

              {(recState === 'ready' || recState === 'recording' || recState === 'paused') && (
                <div>
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 10 }}>
                    <video ref={previewRef} muted autoPlay playsInline style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }}/>
                    {recState === 'recording' && (
                      <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,.65)', color: '#fff', padding: '3px 9px', borderRadius: 20, fontSize: 12 }}>
                        <Circle size={9} style={{ color: '#ef4444', fill: '#ef4444' }}/>
                        {fmtTime(recTime)}
                      </div>
                    )}
                  </div>

                  {recState === 'ready' && (
                    <button onClick={startRecording} className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                      <Circle size={14} style={{ fill: '#fff' }}/> Start Recording
                    </button>
                  )}

                  {recState === 'recording' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={pauseRecording} className="btn btn-secondary" style={{ flex: 1 }}><Pause size={14}/> Pause</button>
                      <button onClick={stopRecording} className="btn btn-primary" style={{ flex: 1, background: '#EF4444' }}><Square size={14}/> Stop</button>
                    </div>
                  )}
                </div>
              )}

              {recState === 'done' && recordedUrl && (
                <div>
                  <video ref={playbackRef} src={recordedUrl} controls style={{ width: '100%', borderRadius: 10, maxHeight: 180, background: '#000', display: 'block', marginBottom: 10 }}/>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Recording saved ({fmtTime(recTime)})</span>
                    <button onClick={reRecord} className="btn btn-ghost btn-sm" style={{ color: '#EF4444' }}><RefreshCw size={12}/> Re-record</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Product Demo Walkthrough" style={{ width: '100%', borderRadius: 8 }}/>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Category</label>
              {showNewCatInput ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    placeholder="New category name"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    style={{ flex: 1, height: 38, borderRadius: 8, fontSize: 12 }}
                  />
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={saveNewCategory}
                    style={{ height: 38, padding: '0 10px', fontSize: 11 }}
                  >
                    Save
                  </button>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={() => { setShowNewCatInput(false); set('category', trainingTypes[0].value) }}
                    style={{ height: 38, padding: '0 8px', fontSize: 11 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select 
                  value={form.category} 
                  onChange={e => {
                    if (e.target.value === '__add_new__') {
                      setShowNewCatInput(true)
                      setNewCatName('')
                    } else {
                      set('category', e.target.value)
                    }
                  }} 
                  style={{ width: '100%', borderRadius: 8, height: 38 }}
                >
                  {trainingTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  <option value="__add_new__" style={{ color: '#4F46E5', fontWeight: 'bold' }}>+ Add Category</option>
                </select>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Duration</label>
              <input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="e.g. 30 min" style={{ width: '100%', borderRadius: 8 }}/>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>
              Assign to Specific Employees (Optional - defaults to all in category)
            </label>
            <div style={{
              maxHeight: 140,
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '8px 12px',
              background: '#FFF',
              display: 'flex',
              flexDirection: 'column',
              gap: 4
            }}>
              {/* All Employees row */}
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                cursor: 'pointer',
                margin: 0,
                padding: '6px 8px',
                borderRadius: 6,
                textAlign: 'left',
                justifyContent: 'flex-start',
                width: '100%',
                transition: 'background 0.2s',
                background: hoveredId === 'all' ? '#F3F4F6' : 'transparent',
                borderBottom: '1px solid var(--border)',
                paddingBottom: 8,
                marginBottom: 4
              }}
              onMouseEnter={() => setHoveredId('all')}
              onMouseLeave={() => setHoveredId(null)}
              >
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleAll}
                  style={{ accentColor: '#4F46E5', margin: 0, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }}
                />
                <span style={{ fontWeight: 700, color: '#4F46E5' }}>All Employees</span>
                <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 4 }}>(Assign to everyone in {form.category} category)</span>
              </label>

              {categoryEmployees.length > 0 ? (
                categoryEmployees.map(emp => {
                  const isChecked = isAllSelected || selectedEmpIds.includes(emp.id)
                  return (
                    <label key={emp.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 12,
                      cursor: 'pointer',
                      margin: 0,
                      padding: '6px 8px',
                      borderRadius: 6,
                      textAlign: 'left',
                      justifyContent: 'flex-start',
                      width: '100%',
                      transition: 'background 0.2s',
                      background: hoveredId === emp.id ? '#F3F4F6' : 'transparent',
                    }}
                    onMouseEnter={() => setHoveredId(emp.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleEmp(emp.id)}
                        style={{ accentColor: '#4F46E5', margin: 0, width: 14, height: 14, flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{emp.name}</span>
                      <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 4 }}>({emp.job_title})</span>
                    </label>
                  )
                })
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic', padding: '6px 8px' }}>
                  No active employees found in the selected category.
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-3)', marginBottom: 6 }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="What will they learn?" style={{ width: '100%', borderRadius: 8, minHeight: 60 }}/>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={uploading}>
            {uploading ? 'Uploading…' : <><Upload size={14} style={{ marginRight: 5 }}/> Upload &amp; Save</>}
          </button>
        </div>
      </div>
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

  // Filters State
  const [activeTab, setActiveTab]       = useState('all') // 'all' | 'in_progress' | 'completed' | 'overdue' | 'training_contents'
  const [activeContentCategory, setActiveContentCategory] = useState('all')
  const [searchTerm, setSearchTerm]     = useState('')

  const [trainingTypes, setTrainingTypes] = useState(() => {
    const stored = localStorage.getItem('training_types')
    if (stored) {
      try { return JSON.parse(stored) } catch(e) {}
    }
    return INITIAL_TRAINING_TYPES
  })

  useEffect(() => {
    localStorage.setItem('training_types', JSON.stringify(trainingTypes))
  }, [trainingTypes])

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchTrainingModules()])
      .then(([e, m]) => {
        setEmployees(e || [])
        setModules(m || [])
        
        // Fetch progress for each employee
        if (e && e.length > 0) {
          Promise.all(e.map(emp => fetchTrainingProgress(emp.id)))
            .then(allProgress => {
              const initialCompleted = {}
              e.forEach((emp, i) => {
                const list = allProgress[i] || []
                const doneMap = {}
                list.forEach(p => {
                  doneMap[p.module_id] = true
                })
                initialCompleted[emp.id] = doneMap
              })
              setCompleted(initialCompleted)
            })
            .catch(console.error)
        }
      })
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
    const typeObj = trainingTypes.find(t => t.value === ttype)
    const tag = typeObj?.tag || 'all'
    return modules.filter(m => {
      if (!m.profile_tags || m.profile_tags.length === 0) return true
      
      const hasSpecificAssignments = m.profile_tags.some(t => t.startsWith('emp:'))
      if (hasSpecificAssignments) {
        return m.profile_tags.includes(`emp:${emp.id}`)
      }

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
    if (!selectedEmp) return
    const record = {
      employee_id: selectedEmp.id,
      module_id: modId,
      completed: true,
      updated_at: new Date().toISOString()
    }
    
    upsertTrainingProgress(record)
      .then(() => {
        setCompleted(prev => ({
          ...prev,
          [selectedEmp.id]: {
            ...(prev[selectedEmp.id] || {}),
            [modId]: true
          }
        }))
      })
      .catch(console.error)
      
    setPlayingMod(null)
  }

  // Derive metrics
  const totalTrainees = employees.length
  
  const completedTrainees = employees.filter(emp => {
    const list = getModsForEmp(emp)
    const doneMap = completedMods[emp.id] || {}
    return list.length > 0 && list.every(m => doneMap[m.id])
  }).length

  const pendingTrainees = employees.filter(emp => {
    const list = getModsForEmp(emp)
    const doneMap = completedMods[emp.id] || {}
    const completedCount = Object.keys(doneMap).length
    return list.length > 0 && completedCount < list.length
  }).length

  // Average progress across all trainees
  const totalProgressSum = employees.reduce((sum, emp) => {
    const list = getModsForEmp(emp)
    const doneMap = completedMods[emp.id] || {}
    const pct = list.length ? Math.round(Object.keys(doneMap).length / list.length * 100) : 0
    return sum + pct
  }, 0)
  const avgProgress = totalTrainees > 0 ? Math.round(totalProgressSum / totalTrainees) : 0

  const stats = [
    { label: 'Employees in training', value: totalTrainees, subtext: 'Total active trainees', color: '#4F46E5', bg: '#EEF2FF', icon: Users },
    { label: 'Completed trainings', value: completedTrainees, subtext: 'This month', color: '#10B981', bg: '#ECFDF5', icon: CheckSquare },
    { label: 'Pending trainings', value: pendingTrainees, subtext: 'This month', color: '#2563EB', bg: '#EFF6FF', icon: Clock },
    { label: 'Average progress', value: `${avgProgress}%`, subtext: 'Across all trainees', color: '#7C3AED', bg: '#F5F3FF', icon: Award }
  ]

  // Filter trainees based on activeTab and searchTerm
  const filteredEmployees = employees.filter(emp => {
    const list = getModsForEmp(emp)
    const doneMap = completedMods[emp.id] || {}
    const pct = list.length ? Math.round(Object.keys(doneMap).length / list.length * 100) : 0
    
    // Search filter
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase())

    // Tab filter
    if (activeTab === 'in_progress') return matchesSearch && pct > 0 && pct < 100
    if (activeTab === 'completed') return matchesSearch && pct === 100
    if (activeTab === 'overdue') return matchesSearch && emp.is_overdue // fallback path
    return matchesSearch
  })

  // Filter modules based on activeContentCategory and searchTerm
  const filteredModules = modules.filter(mod => {
    // Search filter
    const matchesSearch = !searchTerm || 
      mod.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.description?.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Category filter
    if (activeContentCategory === 'all') return true
    
    const catObj = trainingTypes.find(t => t.value === activeContentCategory)
    const tag = catObj?.tag || 'all'
    return mod.profile_tags?.includes(tag)
  })

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', paddingBottom: 40 }}>
      {showAddEmp     && <AddEmployeeModal onClose={() => setShowAddEmp(false)} onAdded={handleAdded}/>}
      {showAddContent && (
        <AddContentModal 
          employees={employees} 
          trainingTypes={trainingTypes}
          setTrainingTypes={setTrainingTypes}
          onClose={() => setShowAddContent(false)} 
          onAdded={handleModuleAdded}
        />
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Training</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Onboarding and training management for new employees.</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => setShowAddContent(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
            <Plus size={14}/> Add Training Content
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddEmp(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
            <UserPlus size={14}/> Add Employee
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

      {/* Search and Tab Filters row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        
        {/* Left tabs inside select bar */}
        <div style={{ display: 'flex', gap: 4, background: '#EFF1F5', padding: 4, borderRadius: 10, width: 'fit-content' }}>
          {[
            ['all', 'All Trainees'],
            ['in_progress', 'In Progress'],
            ['completed', 'Completed'],
            ['overdue', 'Overdue'],
            ['training_contents', 'Training Contents']
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 'none',
                outline: 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: activeTab === tab ? '#FFF' : 'transparent',
                color: activeTab === tab ? '#4F46E5' : 'var(--text-3)',
                boxShadow: activeTab === tab ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Right Search Input & Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 280 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
            <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employee, role, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: 34,
                height: 38,
                fontSize: 13,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FFF',
                outline: 'none',
                width: '100%',
                boxShadow: 'none'
              }}
            />
          </div>
          <button style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 38,
            padding: '0 14px',
            borderRadius: 8,
            background: '#FFF',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}>
            <Filter size={14} /> Filters
          </button>
        </div>

      </div>

      {/* Main Content Layout */}
      {activeTab === 'training_contents' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
          {/* Left panel: Category selection list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { value: 'all', label: 'All Categories', tag: 'all' },
              ...trainingTypes
            ].map(cat => {
              const count = cat.value === 'all' 
                ? modules.length 
                : modules.filter(m => m.profile_tags?.includes(cat.tag)).length
              const isSelected = activeContentCategory === cat.value

              return (
                <div
                  key={cat.value}
                  onClick={() => setActiveContentCategory(cat.value)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#FFF',
                    border: isSelected ? '1.5px solid #4F46E5' : '1px solid var(--border)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.01)',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500, color: isSelected ? '#4F46E5' : 'var(--text-2)' }}>
                    {cat.label}
                  </span>
                  <span style={{ 
                    fontSize: 11, 
                    fontWeight: 600, 
                    color: isSelected ? '#FFF' : 'var(--text-3)',
                    background: isSelected ? '#4F46E5' : '#F3F4F6',
                    padding: '2px 8px',
                    borderRadius: 20
                  }}>
                    {count}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Right panel: list of training contents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em' }}>
                Training Contents ({filteredModules.length})
              </h3>
            </div>
            
            {filteredModules.length === 0 ? (
              <div className="card" style={{
                borderRadius: 16,
                background: '#FFF',
                border: '1px solid var(--border)',
                padding: '48px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 18px rgba(0,0,0,0.015)'
              }}>
                <div style={{
                  display: 'inline-flex',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <BookOpen size={24} color="var(--text-3)" />
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
                  No training content found
                </h4>
                <p style={{ color: 'var(--text-3)', fontSize: 12, maxWidth: 300, margin: '0 auto' }}>
                  There are no modules uploaded under this category matching your search.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredModules.map((mod, index) => {
                  const isPlaying = playingMod?.id === mod.id
                  const isVideo = mod.type === 'video'
                  
                  // Find category label
                  const catObj = trainingTypes.find(t => t.tag === (mod.profile_tags?.[0] || 'all'))
                  const categoryLabel = catObj?.label || 'General Onboarding'

                  return (
                    <div
                      key={mod.id}
                      className="card"
                      style={{
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: '#FFF',
                        padding: 16,
                        boxShadow: '0 4px 18px rgba(0,0,0,0.01)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{ 
                            width: 36, 
                            height: 36, 
                            borderRadius: 8, 
                            background: isVideo ? '#EEF2FF' : '#ECFDF5', 
                            color: isVideo ? '#4F46E5' : '#10B981', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {isVideo ? <Video size={16} /> : <FileText size={16} />}
                          </div>
                          
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{mod.title}</h4>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 12,
                                background: '#F3F4F6',
                                color: 'var(--text-2)'
                              }}>
                                {categoryLabel}
                              </span>
                              {mod.is_mandatory && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: '#FEF2F2',
                                  color: '#EF4444'
                                }}>
                                  Mandatory
                                </span>
                              )}
                              {mod.profile_tags?.some(t => t.startsWith('emp:')) && (
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '2px 8px',
                                  borderRadius: 12,
                                  background: '#EFF6FF',
                                  color: '#2563EB'
                                }}>
                                  Assigned: {
                                    mod.profile_tags
                                      .filter(t => t.startsWith('emp:'))
                                      .map(t => t.replace('emp:', ''))
                                      .map(id => employees.find(e => e.id === id)?.name || 'Unknown')
                                      .join(', ')
                                  }
                                </span>
                              )}
                            </div>
                            
                            <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, margin: '0 0 8px 0' }}>
                              {mod.description || 'No description provided.'}
                            </p>
                            
                            <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-3)' }}>
                              {mod.duration && <span>Duration: {mod.duration}</span>}
                              <span>Added on: {new Date(mod.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isVideo ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setPlayingMod(isPlaying ? null : mod)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, fontSize: 11 }}
                            >
                              <Play size={10} /> {isPlaying ? 'Close' : 'Play Video'}
                            </button>
                          ) : (
                            <a
                              href={mod.content_url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, fontSize: 11, textDecoration: 'none' }}
                            >
                              <FileText size={10} /> View Document
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Video Player Box */}
                      {isPlaying && isVideo && (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                          <video src={mod.content_url} controls autoPlay style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 320 }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : employees.length === 0 ? (
        
        // Empty State Card
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div className="card" style={{
            borderRadius: 16,
            background: '#FFF',
            border: '1px solid var(--border)',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 18px rgba(0,0,0,0.015)'
          }}>
            
            {/* Graduation Cap SVG inside circle */}
            <div style={{
              display: 'inline-flex',
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#EEF2FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20
            }}>
              <GraduationCap size={36} color="#4F46E5" />
            </div>

            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
              No employees in training yet
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: 13, lineHeight: 1.6, maxWidth: 420, margin: '0 auto 24px' }}>
              Transfer hired candidates from the Hiring tab or add employees directly to get started.
            </p>

            <button
              onClick={() => setShowAddEmp(true)}
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
                cursor: 'pointer',
                margin: '0 auto'
              }}
            >
              <UserPlus size={14} /> Add First Employee
            </button>
          </div>

          {/* Bottom Grid widgets */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'flex-start' }}>
            
            {/* Popular training topics (2x2 grid) */}
            <div className="card" style={{ borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Popular training topics</h3>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>View all</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { title: 'Onboarding Fundamentals', icon: User, bg: '#EEF2FF', color: '#4F46E5' },
                  { title: 'Compliance & Policies', icon: Shield, bg: '#F3F4F6', color: 'var(--text-2)' },
                  { title: 'Product Knowledge', icon: BookOpen, bg: '#EFF6FF', color: '#2563EB' },
                  { title: 'Soft Skills', icon: Heart, bg: '#F5F3FF', color: '#7C3AED' }
                ].map((item, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 12, background: '#FFF'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <item.icon size={13} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>{item.title}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)' }}>0</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Training insights */}
            <div className="card" style={{ borderRadius: 16, border: '1px solid var(--border)', padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Training insights</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-2)' }}>This month</span>
                  <ChevronDown size={12} color="var(--text-3)" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'Enrolled', value: '0', color: '#7C3AED', bg: '#F5F3FF', icon: Users },
                  { label: 'Completed', value: '0', color: '#2563EB', bg: '#EFF6FF', icon: CheckCircle },
                  { label: 'Avg. time spent', value: '0 hr', color: '#10B981', bg: '#ECFDF5', icon: Clock }
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.bg, color: item.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <item.icon size={13} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{item.value}</span>
                      <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>▲ 0%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 10, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>
                  View detailed reports <ArrowRight size={12} />
                </span>
              </div>
            </div>

          </div>

        </div>

      ) : (
        
        // Split Trainee details view when employees exist
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
          
          {/* Left panel: Trainee selection list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredEmployees.map(emp => {
              const mlist = getModsForEmp(emp)
              const pct   = mlist.length ? Math.round(Object.keys(completedMods[emp.id] || {}).length / mlist.length * 100) : 0
              const ttype = trainingTypes.find(t => t.value === (emp.training_type || 'general'))
              const isSelected = selectedEmp?.id === emp.id

              return (
                <div
                  key={emp.id}
                  onClick={() => selectEmp(emp)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    background: '#FFF',
                    border: isSelected ? '1.5px solid #4F46E5' : '1px solid var(--border)',
                    cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.01)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 11, background: '#EEF2FF', color: '#4F46E5', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {emp.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{ttype?.label || 'General'}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: pct === 100 ? '#10B981' : '#4F46E5' }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right panel: Active checklist / quiz detail block */}
          {selectedEmp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              {/* Profile banner card */}
              <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div className="avatar" style={{ width: 44, height: 44, fontSize: 14, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {selectedEmp.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700 }}>{selectedEmp.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{selectedEmp.job_title} · {selectedEmp.emp_id}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)' }}>{selectedEmp.email}</p>
                  </div>
                  
                  {/* Category switcher */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Training Category:</span>
                    <div style={{ position: 'relative', width: 180 }}>
                      <select
                        value={selectedEmp.training_type || 'general'}
                        onChange={(e) => changeTrainingType(e.target.value)}
                        style={{ height: 32, fontSize: 12, borderRadius: 8, paddingLeft: 8, paddingRight: 24, appearance: 'none', cursor: 'pointer' }}
                        disabled={updatingType}
                      >
                        {trainingTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} color="var(--text-3)" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                    <span>Onboarding progress</span>
                    <span style={{ color: progress === 100 ? '#10B981' : '#4F46E5' }}>{progress}%</span>
                  </div>
                  <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: progress === 100 ? '#10B981' : '#4F46E5', transition: 'width 0.4s' }} />
                  </div>
                </div>
              </div>

              {/* Modules list & accordion panel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em' }}>Training Modules</h4>
                
                {empMods.map((mod, index) => {
                  const isDone = done[mod.id]
                  const isExp = expanded === mod.id
                  const isPlaying = playingMod?.id === mod.id

                  return (
                    <div
                      key={mod.id}
                      className="card"
                      style={{
                        borderRadius: 12, border: '1px solid var(--border)', background: '#FFF', padding: 14,
                        boxShadow: '0 4px 18px rgba(0,0,0,0.01)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div onClick={() => setExpanded(isExp ? null : mod.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', background: isDone ? '#ECFDF5' : '#F3F4F6', color: isDone ? '#10B981' : 'var(--text-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isDone ? <CheckCircle size={12} /> : <span>{index + 1}</span>}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{mod.title}</span>
                            <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                              <span style={{ textTransform: 'uppercase' }}>{mod.type}</span>
                              {mod.duration && <span>· {mod.duration}</span>}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {!isDone && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                if (mod.type === 'video') {
                                  setPlayingMod(isPlaying ? null : mod)
                                } else {
                                  window.open(mod.content_url, '_blank')
                                  markDone(mod.id)
                                }
                              }}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28, fontSize: 11 }}
                            >
                              <Play size={10} /> {isPlaying ? 'Close' : 'Start'}
                            </button>
                          )}
                          {isDone && <span style={{ fontSize: 11, fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: 20 }}>Completed</span>}
                          <button className="btn btn-ghost btn-sm" style={{ padding: 4 }} onClick={() => setExpanded(isExp ? null : mod.id)}>
                            {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Video Player Box */}
                      {isPlaying && (
                        <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                          <video src={mod.content_url} controls autoPlay style={{ width: '100%', borderRadius: 8, background: '#000', maxHeight: 240 }} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                            <button className="btn btn-primary btn-sm" onClick={() => markDone(mod.id)} style={{ height: 28, fontSize: 11 }}>
                              <CheckCircle size={10} style={{ marginRight: 4 }} /> Mark as completed
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Description expand block */}
                      {isExp && !isPlaying && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                          {mod.description || 'No module description available.'}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Quiz final evaluation block */}
              {allDone && (
                <div className="card" style={{ padding: 20, borderRadius: 16, border: '1.5px solid #4F46E5', background: 'rgba(79, 70, 229, 0.02)' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#4F46E5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Award size={16} /> Final Quiz &amp; Evaluation
                  </h4>
                  
                  {!quizStarted && !submitted && (
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5, marginBottom: 12 }}>
                        All training modules completed! Pass this 4-question quiz with at least 3 correct answers to verify competency.
                      </p>
                      <button className="btn btn-primary btn-sm" onClick={() => setQuizStarted(true)}>Start Quiz</button>
                    </div>
                  )}

                  {quizStarted && !submitted && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {QUIZ.map((q, qidx) => (
                        <div key={qidx} style={{ background: '#FFF', border: '1px solid var(--border)', padding: 12, borderRadius: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>Q{qidx + 1}. {q.q}</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                            {q.opts.map((opt, oidx) => (
                              <label key={oidx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                                <input
                                  type="radio"
                                  name={`q-${qidx}`}
                                  checked={answers[qidx] === oidx}
                                  onChange={() => setAnswers(prev => ({ ...prev, [qidx]: oidx }))}
                                  style={{ accentColor: '#4F46E5' }}
                                />
                                {opt}
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSubmitted(true)}
                          disabled={Object.keys(answers).length < QUIZ.length}
                        >
                          Submit Answers
                        </button>
                      </div>
                    </div>
                  )}

                  {submitted && (
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: passed ? '#10B981' : '#EF4444', marginBottom: 4 }}>
                        {passed ? 'Passed! 🎉' : 'Failed ❌'} Score: {score} / {QUIZ.length}
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
                        {passed
                          ? 'Congratulations! The employee has passed the evaluation. Manager approval is now unlocked.'
                          : 'Try reviewing the modules and retry the quiz.'}
                      </p>
                      
                      {passed ? (
                        <div style={{ marginTop: 12, borderTop: '1px solid rgba(79,70,229,0.15)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Manager Action:</span>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setMgrApproved(prev => ({ ...prev, [selectedEmp.id]: true }))}
                            disabled={mgrApproved[selectedEmp.id]}
                          >
                            {mgrApproved[selectedEmp.id] ? 'Approved ✓' : 'Approve & Mark Ready'}
                          </button>
                        </div>
                      ) : (
                        <button className="btn btn-secondary btn-sm" style={{ marginTop: 10 }} onClick={() => { setQuizStarted(false); setSubmitted(false); setAnswers({}) }}>
                          Retry Quiz
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      )}
    </div>
  )
}
