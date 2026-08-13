import { useState, useEffect, useRef } from 'react'
import { fetchLeads, updateLead, logCall, fetchTasks, createLead, createTask, fetchEmployees, createEmployee } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { sendWhatsAppMessage } from '../lib/twilio.js'
import { sendConsentEmail } from '../lib/resend.js'
import {
  Phone, CheckSquare, Clock, Plus, Bell, MessageSquare, Target, Calendar, Upload, X, CheckCircle,
  FileText, UserPlus, ChevronDown, ChevronUp, Loader, Users, Mail, MessageCircle, Save, StickyNote,
  MoreVertical, ArrowRight, PhoneCall, Check, Filter, Sparkles
} from 'lucide-react'

// ─── Shared CSV parser ─────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map(line => {
    const vals = []
    let cur = '', inQ = false
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    vals.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '') })
    return obj
  }).filter(r => Object.values(r).some(v => v.trim()))
  return { headers, rows }
}

function pick(row, ...keys) {
  for (const k of keys) if (row[k]?.trim()) return row[k].trim()
  return ''
}

function normalizeFreq(v) {
  const s = (v || '').toLowerCase()
  if (s.includes('week')) return 'weekly'
  if (s.includes('month')) return 'monthly'
  if (s.includes('one') || s.includes('1')) return 'one-time'
  return 'daily'
}

function normalizePriority(v) {
  const s = (v || '').toLowerCase()
  if (s.includes('high')) return 'high'
  if (s.includes('low')) return 'low'
  return 'medium'
}

// ─── Shared modal shell ────────────────────────────────────────
function Modal({ title, onClose, width = 560, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#ffffff', borderRadius: 14, width: '100%', maxWidth: width, boxShadow: '0 24px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ModalFooter({ onClose, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      {children}
    </div>
  )
}

// ─── Upload Tasks Modal ────────────────────────────────────────
function UploadTasksModal({ onClose, onSaved }) {
  const fileRef = useRef()
  const [step, setStep]             = useState('upload')   // upload | allocate | saving | done
  const [rows, setRows]             = useState([])
  const [employees, setEmployees]   = useState([])
  const [loadingEmps, setLoadingEmps] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [showNewEmp, setShowNewEmp] = useState(false)
  const [newEmp, setNewEmp]         = useState({ name: '', role: '', email: '', phone: '' })
  const [addingEmp, setAddingEmp]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [savedCount, setSavedCount] = useState(0)
  const [dragOver, setDragOver]     = useState(false)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows: parsed } = parseCSV(e.target.result)
      if (!parsed.length) { setError('No data rows found. Make sure the file has a header row and data.'); return }
      const tasks = parsed.map(r => ({
        title:     pick(r, 'task', 'task title', 'title', 'name', 'description') || Object.values(r)[0] || '',
        frequency: normalizeFreq(pick(r, 'frequency', 'freq', 'type')),
        priority:  normalizePriority(pick(r, 'priority')),
      })).filter(t => t.title)
      if (!tasks.length) { setError('Could not read any task titles. Check your columns.'); return }
      setRows(tasks)
      setError('')
      setStep('allocate')
      loadEmployees()
    }
    reader.readAsText(file)
  }

  function loadEmployees() {
    setLoadingEmps(true)
    fetchEmployees()
      .then(setEmployees)
      .catch(e => setError(e.message))
      .finally(() => setLoadingEmps(false))
  }

  async function addNewEmployee() {
    if (!newEmp.name.trim() || !newEmp.email.trim()) { setError('Name and Email are required for new employee.'); return }
    setAddingEmp(true); setError('')
    try {
      const emp = await createEmployee({
        name: newEmp.name.trim(),
        emp_id: 'EMP' + Date.now().toString().slice(-6),
        job_title: newEmp.role.trim() || 'Employee',
        department: 'General',
        email: newEmp.email.trim(),
        phone: newEmp.phone.trim() || null,
        status: 'active',
        date_of_joining: new Date().toISOString().slice(0, 10)
      })
      setEmployees(prev => [emp, ...prev])
      setSelectedEmp(emp)
      setShowNewEmp(false)
      setNewEmp({ name: '', role: '', email: '', phone: '' })
    } catch (e) { setError(e.message) }
    setAddingEmp(false)
  }

  async function saveAll() {
    if (!selectedEmp) { setError('Please select an employee to allocate the tasks to.'); return }
    setSaving(true); setStep('saving'); setError('')
    const saved = []
    for (const r of rows) {
      try {
        const t = await createTask({
          title: r.title,
          frequency: r.frequency,
          priority: r.priority,
          profile_tags: [selectedEmp.id]
        })
        saved.push(t)
      } catch {}
    }
    setSavedCount(saved.length)
    setSaving(false)
    setStep('done')
    onSaved(saved)
  }

  const setNE = (k, v) => setNewEmp(f => ({ ...f, [k]: v }))

  return (
    <Modal title={<><Upload size={16} color="var(--brand)" /> Upload Task Sheet</>} onClose={onClose} width={600}>
      <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

        {step === 'upload' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
              Upload a CSV file with columns: <strong>Task, Frequency, Priority</strong> (Frequency: daily/weekly/monthly/one-time · Priority: high/medium/low)
            </p>
            <div
              style={{ border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 10, padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(99,102,241,.05)' : 'var(--bg-2)', transition: 'all .15s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            >
              <Upload size={28} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Drop CSV file here or click to browse</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Supports .csv files only</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </>
        )}

        {step === 'allocate' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
                {rows.length} task{rows.length !== 1 ? 's' : ''} ready to import
              </div>
              <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none', background: i % 2 === 0 ? 'var(--bg-2)' : 'var(--bg)' }}>
                    <span style={{ fontSize: 13, flex: 1 }}>{r.title}</span>
                    <span className={`badge badge-${r.priority === 'high' ? 'danger' : 'gray'}`} style={{ fontSize: 10 }}>{r.priority}</span>
                    <span className="badge badge-brand" style={{ fontSize: 10 }}>{r.frequency}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
              Allocate to Employee
            </div>

            {loadingEmps ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-3)', fontSize: 13, padding: '12px 0' }}>
                <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading employees…
              </div>
            ) : (
              <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 12 }}>
                {employees.length === 0 && (
                  <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                    No employees yet. Add one below.
                  </div>
                )}
                {employees.map(emp => (
                  <div key={emp.id} onClick={() => setSelectedEmp(emp)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: selectedEmp?.id === emp.id ? 'rgba(99,102,241,.07)' : 'var(--bg)', transition: 'background .1s' }}
                    onMouseEnter={e => { if (selectedEmp?.id !== emp.id) e.currentTarget.style.background = 'var(--bg-2)' }}
                    onMouseLeave={e => { if (selectedEmp?.id !== emp.id) e.currentTarget.style.background = 'var(--bg)' }}>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>
                      {emp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{emp.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{emp.job_title}{emp.department ? ` · ${emp.department}` : ''}</div>
                    </div>
                    {selectedEmp?.id === emp.id && <CheckCircle size={16} color="var(--brand)" />}
                  </div>
                ))}

                <div onClick={() => setShowNewEmp(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: 'rgba(99,102,241,.04)', borderTop: employees.length ? '1px solid var(--border)' : 'none' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px dashed var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserPlus size={14} color="var(--brand)" />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand)' }}>Add new employee</span>
                  {showNewEmp ? <ChevronUp size={14} color="var(--brand)" style={{ marginLeft: 'auto' }} /> : <ChevronDown size={14} color="var(--brand)" style={{ marginLeft: 'auto' }} />}
                </div>
              </div>
            )}

            {showNewEmp && (
              <div style={{ border: '1px solid var(--brand)', borderRadius: 8, padding: '14px', marginBottom: 12, background: 'rgba(99,102,241,.03)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--brand)', marginBottom: 10 }}>New Employee Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px' }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Full Name *</label>
                    <input value={newEmp.name} onChange={e => setNE('name', e.target.value)} placeholder="e.g. Rahul Sharma" style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Role / Profile</label>
                    <input value={newEmp.role} onChange={e => setNE('role', e.target.value)} placeholder="e.g. Sales Executive" style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Email *</label>
                    <input type="email" value={newEmp.email} onChange={e => setNE('email', e.target.value)} placeholder="rahul@company.com" style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 3 }}>Phone</label>
                    <input value={newEmp.phone} onChange={e => setNE('phone', e.target.value)} placeholder="+91 98765 43210" style={{ width: '100%', boxSizing: 'border-box', fontSize: 13 }} />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={addNewEmployee} disabled={addingEmp}>
                  {addingEmp ? 'Adding…' : <><UserPlus size={13} /> Add & Select</>}
                </button>
              </div>
            )}

            {selectedEmp && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(34,197,94,.08)', border: '1px solid var(--success)', borderRadius: 8, fontSize: 13 }}>
                <CheckCircle size={14} color="var(--success)" />
                <span>Will allocate <strong>{rows.length} task{rows.length !== 1 ? 's' : ''}</strong> to <strong>{selectedEmp.name}</strong></span>
              </div>
            )}

            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </>
        )}

        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader size={32} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite', marginBottom: 14 }} />
            <p style={{ fontWeight: 600 }}>Saving tasks…</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Done!</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{savedCount} task{savedCount !== 1 ? 's' : ''} allocated to {selectedEmp?.name}.</p>
          </div>
        )}
      </div>

      {step === 'upload' && (
        <ModalFooter onClose={onClose}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Select a file above to continue</span>
        </ModalFooter>
      )}
      {step === 'allocate' && (
        <ModalFooter onClose={onClose}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStep('upload'); setRows([]); setSelectedEmp(null); setError('') }}>← Back</button>
          <button className="btn btn-primary" onClick={saveAll} disabled={!selectedEmp}>
            <Upload size={13} /> Import {rows.length} Task{rows.length !== 1 ? 's' : ''}
          </button>
        </ModalFooter>
      )}
      {step === 'done' && (
        <ModalFooter onClose={onClose}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </ModalFooter>
      )}
    </Modal>
  )
}

// ─── Upload CRM Data Sheet Modal ───────────────────────────────
function UploadCRMModal({ onClose, onSaved }) {
  const fileRef = useRef()
  const [step, setStep]     = useState('upload')   // upload | preview | saving | done
  const [rows, setRows]     = useState([])
  const [saving, setSaving] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError]   = useState('')
  const [dragOver, setDragOver] = useState(false)

  function handleFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => {
      const { rows: parsed } = parseCSV(e.target.result)
      if (!parsed.length) { setError('No data rows found. Make sure the file has a header row and data.'); return }
      const leads = parsed.map(r => ({
        name:    pick(r, 'name', 'full name', 'contact name', 'client name') || Object.values(r)[0] || 'Unknown',
        company: pick(r, 'company', 'company name', 'organisation', 'organization', 'firm') || null,
        phone:   pick(r, 'phone', 'mobile', 'contact', 'phone number', 'mobile number') || null,
        email:   pick(r, 'email', 'email id', 'email address') || null,
        notes:   pick(r, 'notes', 'note', 'remarks', 'comment', 'comments') || null,
        status:  'new'
      })).filter(l => l.name && l.name !== 'Unknown')
      if (!leads.length) { setError('Could not read any contact names. Check your column headers.'); return }
      setRows(leads)
      setError('')
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function saveAll() {
    setSaving(true); setStep('saving'); setError('')
    const saved = []
    for (const r of rows) {
      try { saved.push(await createLead(r)) } catch {}
    }
    setSavedCount(saved.length)
    setSaving(false)
    setStep('done')
    onSaved(saved)
  }

  return (
    <Modal title={<><Upload size={16} color="var(--brand)" /> Upload CRM Data Sheet</>} onClose={onClose} width={640}>
      <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>

        {step === 'upload' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14 }}>
              Upload a CSV file with columns: <strong>Name, Company, Phone, Email, Notes</strong> — the data will appear directly in the CRM calling list.
            </p>
            <div
              style={{ border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`, borderRadius: 10, padding: '2.5rem 1.5rem', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(99,102,241,.05)' : 'var(--bg-2)', transition: 'all .15s' }}
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            >
              <Users size={28} style={{ color: 'var(--text-3)', display: 'block', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>Drop CSV file here or click to browse</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Supports .csv files only</p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {error && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{error}</p>}
          </>
        )}

        {step === 'preview' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Preview — {rows.length} contact{rows.length !== 1 ? 's' : ''} found
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0, background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Company', 'Phone', 'Email'].map(h => (
                  <div key={h} style={{ padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.04em' }}>{h}</div>
                ))}
              </div>
              <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', background: i % 2 === 0 ? 'var(--bg)' : 'var(--bg-2)', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>{r.name}</div>
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)' }}>{r.company || '—'}</div>
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)' }}>{r.phone || '—'}</div>
                    <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.email || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</p>}
          </>
        )}

        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader size={32} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite', marginBottom: 14 }} />
            <p style={{ fontWeight: 600 }}>Importing contacts to CRM…</p>
          </div>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <CheckCircle size={40} style={{ color: 'var(--success)', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Import complete!</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>{savedCount} contact{savedCount !== 1 ? 's' : ''} added to your CRM.</p>
          </div>
        )}
      </div>

      {step === 'upload' && (
        <ModalFooter onClose={onClose}>
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Select a file above to continue</span>
        </ModalFooter>
      )}
      {step === 'preview' && (
        <ModalFooter onClose={onClose}>
          <button className="btn btn-ghost btn-sm" onClick={() => { setStep('upload'); setRows([]); setError('') }}>← Back</button>
          <button className="btn btn-primary" onClick={saveAll}>
            <Upload size={13} /> Import {rows.length} Contact{rows.length !== 1 ? 's' : ''}
          </button>
        </ModalFooter>
      )}
      {step === 'done' && (
        <ModalFooter onClose={onClose}>
          <button className="btn btn-primary" onClick={onClose}>Close</button>
        </ModalFooter>
      )}
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────
const DISP_OPTIONS = [
  { v: 'interested',     l: 'Interested',      t: 'success' },
  { v: 'callback',       l: 'Callback',        t: 'warning' },
  { v: 'not_interested', l: 'Not interested',  t: 'danger'  },
  { v: 'new',            l: 'New / not called', t: 'gray'   },
  { v: 'converted',      l: 'Converted',       t: 'brand'   },
]

const DEPT_SCRIPTS = {
  IT: {
    talkingPoints: "Discuss cloud efficiency, engineering hours saved, and security protocols.",
    objections: [
      { q: "We build everything in-house.", a: "Our service focuses on maintenance reduction, giving back 40% of developer hours to focus on your core product." },
      { q: "Security is a priority.", a: "We comply with enterprise standards (SOC2, GDPR) and offer private virtual hosting." }
    ]
  },
  Sales: {
    talkingPoints: "Focus on lead conversion velocity, automated reminders, and CRM sync efficiency.",
    objections: [
      { q: "Our pipeline is already full.", a: "Excellent! Our solution focuses on sales velocity, closing those existing deals 30% faster." },
      { q: "We use another CRM tool.", a: "We integrate directly with major CRMs to enrich and validate contacts, enhancing your current setup." }
    ]
  },
  HR: {
    talkingPoints: "Highlight recruiter pipeline visual dashboard, automated screening scores, and GDPR consent.",
    objections: [
      { q: "We are not hiring right now.", a: "A perfect time to seed your talent pool! When you start hiring again, you can contact pre-screened talent instantly." },
      { q: "Manual vetting works fine.", a: "Automated screening handles CV parsing and qualification screening, reducing vetting time by 90%." }
    ]
  },
  Marketing: {
    talkingPoints: "Discuss campaign metrics, ROAS optimization, and social media/email template integration.",
    objections: [
      { q: "It's too expensive.", a: "Our customers experience an average 4x return on marketing spend within 60 days of launch." },
      { q: "We manage this in spreadsheets.", a: "Centralizing logs avoids lead drop-offs and guarantees team follow-ups are never missed." }
    ]
  }
}

const WHATSAPP_TEMPLATES = [
  { label: 'Introduction Pitch', body: "Hi {name} 👋, I'm reaching out from {company} regarding your operational enquiry. Do you have 5 minutes for a quick chat today?" },
  { label: 'Follow-up Check-in', body: "Hi {name}, just checking in to see if you had a chance to review the product specs we discussed. Let me know if you have any questions!" },
  { label: 'Meeting Booking Link', body: "Hi {name}, it was great speaking with you. Please choose a slot on my scheduler link to book a quick demo: {schedulerUrl}" }
]

const EMAIL_TEMPLATES = [
  { label: 'Welcome Intro', subject: "Welcome to {company}!", body: "Dear {name},\n\nThank you for your interest in {company}. We would love to set up a quick introduction call to see how we can assist you with your operational bottlenecks.\n\nBest regards,\nThe {company} Team" },
  { label: 'Demo Meeting Request', subject: "Live product demo with {company}", body: "Dear {name},\n\nI hope you are doing well.\n\nLet's schedule a live product demo this week. Please select a time slot that works best for you here: {schedulerUrl}.\n\nBest regards,\nThe {company} Team" }
]


export default function CRMTasks() {
  const { user } = useAuth()
  const [tab, setTab]               = useState('tasks')
  const [selectedScriptDept, setSelectedScriptDept] = useState('IT')
  const [msg, setMsg] = useState('')
  const [deptScripts, setDeptScripts] = useState(() => {
    const saved = localStorage.getItem('company_dept_scripts')
    if (saved) {
      try { return JSON.parse(saved) } catch (e) { console.error(e) }
    }
    return DEPT_SCRIPTS
  })
  const [leads, setLeads]           = useState([])
  const [tasks, setTasks]           = useState([])
  const [tasksDone, setDone]        = useState({})
  const [customTask, setCustom]     = useState('')
  const [extraTasks, setExtra]      = useState([])
  const [loading, setLoading]       = useState(true)
  const [showUploadTasks, setShowUploadTasks] = useState(false)
  const [showUploadCRM, setShowUploadCRM]     = useState(false)
  const [leadState, setLeadState]   = useState({})

  // Dialer & Call States
  const [activeCall, setActiveCall] = useState(null)
  
  // Outreach Modal states
  const [outreachModal, setOutreachModal] = useState(null)
  const [outreachBody, setOutreachBody] = useState('')
  const [outreachSubject, setOutreachSubject] = useState('')
  
  // Rich Task Creation states
  const [taskFreq, setTaskFreq] = useState('daily')
  const [taskDept, setTaskDept] = useState('all')

  // WebRTC Call actions
  function initiateWebRTCCall(lead) {
    if (!lead.phone) {
      alert('No phone number available for this lead.')
      return
    }
    const depts = ['IT', 'Sales', 'HR', 'Marketing']
    const dept = depts[Math.floor(Math.random() * depts.length)]

    const newCall = {
      status: 'dialing',
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      duration: 0,
      isMuted: false,
      department: dept
    }
    setActiveCall(newCall)

    setTimeout(() => {
      setActiveCall(prev => {
        if (prev && prev.leadId === lead.id) {
          return { ...prev, status: 'connected' }
        }
        return prev
      })
    }, 2000)
  }

  // Timer interval for active call
  useEffect(() => {
    let interval = null
    if (activeCall && activeCall.status === 'connected') {
      interval = setInterval(() => {
        setActiveCall(prev => {
          if (prev) {
            return { ...prev, duration: prev.duration + 1 }
          }
          return prev
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeCall?.status])

  function formatDuration(sec) {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  async function endWebRTCCall() {
    if (!activeCall) return
    const { leadId, duration } = activeCall
    setActiveCall(null)

    const durationText = `[Call Duration: ${formatDuration(duration)}] `
    const currentLs = leadState[leadId] || {}
    setLS(leadId, {
      showNote: true,
      note: durationText + (currentLs.note || ''),
      saved: false
    })

    alert(`Call ended. Duration: ${formatDuration(duration)}. Call log duration has been added to your comments. Please click Save to persist.`)
  }

  function handleTaskWhatsApp(task) {
    const frequencyLabel = task.frequency === 'one-time' ? 'one-time task' : `recurring (${task.frequency}) task`
    const body = `Reminder 📅:
Task: "${task.title}"
Scope: ${task.department ? `Department: ${task.department.toUpperCase()}` : 'General'}
Interval: ${frequencyLabel}
Status: Pending

Please complete this operational checklist item today.`
    
    const waUrl = `https://wa.me/?text=${encodeURIComponent(body)}`
    window.open(waUrl, '_blank')
  }

  // Fetch initial data
  useEffect(() => {
    Promise.all([fetchLeads(), fetchTasks()])
      .then(([l, t]) => { setLeads(l || []); setTasks(t || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const allTasks = [...tasks, ...extraTasks]
  const doneCnt  = Object.values(tasksDone).filter(Boolean).length
  const pct      = allTasks.length ? Math.round(doneCnt / allTasks.length * 100) : 0

  function setLS(id, updates) {
    setLeadState(prev => ({ ...prev, [id]: { ...(prev[id] || {}), ...updates } }))
  }

  function lsOf(lead) {
    return { disp: lead.status, note: lead.notes || '', showNote: false, saving: false, saved: false, ...leadState[lead.id] }
  }

  async function saveLeadDisp(lead) {
    const ls = lsOf(lead)
    setLS(lead.id, { saving: true, saved: false })
    try {
      await updateLead(lead.id, { status: ls.disp, notes: ls.note, last_contact: new Date().toISOString() })
      await logCall({ lead_id: lead.id, disposition: ls.disp, notes: ls.note })
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: ls.disp, notes: ls.note } : l))
      setLS(lead.id, { saving: false, saved: true })
      setTimeout(() => setLS(lead.id, { saved: false }), 2000)
    } catch (e) {
      console.error(e)
      setLS(lead.id, { saving: false })
    }
  }

  function addCustomTask() {
    if (!customTask.trim()) return
    setExtra(e => [...e, { 
      id: `ct_${Date.now()}`, 
      title: customTask, 
      frequency: taskFreq, 
      priority: 'medium',
      department: taskDept
    }])
    setCustom('')
  }

  function onTasksImported(saved) {
    setTasks(prev => [...prev, ...saved])
  }

  function onLeadsImported(saved) {
    setLeads(prev => [...saved, ...prev])
  }

  function TaskGroup({ label, freq, icon: Icon }) {
    const t = allTasks.filter(x => x.frequency === freq)
    if (!t.length) return null
    return (
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <Icon size={12} /> {label}
        </div>
        {t.map(task => (
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FFF', border: '1px solid var(--border)', borderRadius: 12, marginBottom: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.005)' }}>
            
            {/* Custom Checkbox square */}
            <div
              onClick={() => setDone(d => ({ ...d, [task.id]: !d[task.id] }))}
              style={{
                width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--border)',
                background: tasksDone[task.id] ? '#EEF2FF' : '#FFF',
                borderColor: tasksDone[task.id] ? '#4F46E5' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              {tasksDone[task.id] && <Check size={12} color="#4F46E5" strokeWidth={3} />}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                textDecoration: tasksDone[task.id] ? 'line-through' : 'none',
                color: tasksDone[task.id] ? 'var(--text-3)' : 'var(--text-1)'
              }}>
                {task.title}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, color: 'var(--text-3)', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11 }}>
                  <Clock size={11} /> Due today, 11:59 PM
                </span>
                {task.department && task.department !== 'all' && (
                  <span style={{ display: 'inline-flex', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', background: '#EEF2FF', color: '#4F46E5', padding: '1px 6px', borderRadius: 4 }}>
                    {task.department}
                  </span>
                )}
                {task.frequency && task.frequency !== 'one-time' && (
                  <span style={{ display: 'inline-flex', fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    🔄 {task.frequency}
                  </span>
                )}
              </div>
            </div>

            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              background: task.priority === 'high' ? '#FEF2F2' : '#F3F4F6',
              color: task.priority === 'high' ? '#EF4444' : 'var(--text-3)'
            }}>
              {task.priority}
            </span>

            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => handleTaskWhatsApp(task)}
              title="Share reminder via WhatsApp"
              style={{ padding: 4, color: '#25D366', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <MessageCircle size={15} />
            </button>

            <button className="btn btn-ghost btn-sm" style={{ padding: 4, color: 'var(--text-3)' }}><MoreVertical size={15} /></button>

          </div>
        ))}
      </div>
    )
  }

  if (loading) return <div className="card" style={{ padding: '2rem', color: 'var(--text-3)' }}>Loading Tasks &amp; CRM pipeline…</div>

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'var(--font-body)' }}>
      {showUploadTasks && <UploadTasksModal onClose={() => setShowUploadTasks(false)} onSaved={onTasksImported} />}
      {showUploadCRM   && <UploadCRMModal   onClose={() => setShowUploadCRM(false)}   onSaved={onLeadsImported} />}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 2 }}>Tasks &amp; CRM</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Daily tasks and calling pipeline.</p>
        </div>
        <div>
          {tab === 'tasks' ? (
            <button className="btn btn-primary" onClick={() => setShowUploadTasks(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
              <Upload size={14} /> Upload Task Sheet
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => setShowUploadCRM(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
              <Upload size={14} /> Upload Data Sheet
            </button>
          )}
        </div>
      </div>

      {/* Tabs Row */}
      <div style={{ display: 'flex', gap: 4, background: '#EFF1F5', padding: 4, borderRadius: 10, width: 'fit-content', marginBottom: 20 }}>
        {[
          ['tasks', '☑ Task manager'],
          ['crm', '📞 Calling CRM'],
          ['scripts', '💡 Call Scripts']
        ].map(([t, l]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              border: 'none',
              outline: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: tab === t ? '#FFF' : 'transparent',
              color: tab === t ? '#4F46E5' : 'var(--text-3)',
              boxShadow: tab === t ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'flex-start', marginBottom: 24 }}>
          
          {/* Left panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Progress track card */}
            <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Today's progress</h3>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Keep it up! You've got this.</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#4F46E5', fontFamily: 'var(--font-display)' }}>{pct}%</span>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{doneCnt} of {allTasks.length || 2} tasks complete</p>
                </div>
              </div>

              {/* Progress Slider Track with line chart overlay */}
              <div style={{ position: 'relative', marginTop: 12, paddingBottom: 20 }}>
                {/* SVG Line chart path overlay */}
                <svg width="100%" height="32" viewBox="0 0 100 32" preserveAspectRatio="none" style={{ position: 'absolute', top: -14, left: 0, opacity: 0.1 }}>
                  <path d="M 0 16 Q 12 6, 25 22 T 50 12 T 75 24 T 100 16" fill="none" stroke="#4F46E5" strokeWidth="1.5" />
                </svg>

                {/* Progress bar line */}
                <div style={{ height: 6, background: '#E5E7EB', borderRadius: 9, position: 'relative' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: '#4F46E5', borderRadius: 9, transition: 'width 0.4s' }} />
                  
                  {/* Slider dot marker */}
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', background: '#4F46E5', border: '3.5px solid #FFF',
                    boxShadow: '0 0 8px rgba(79,70,229,0.5)', position: 'absolute', top: '50%', left: `${pct}%`,
                    transform: 'translate(-50%, -50%)', transition: 'left 0.4s'
                  }} />
                </div>

                {/* Percent indicators */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginTop: 8 }}>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            {/* My tasks list */}
            <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>My tasks</h3>
                
                {/* Add task bar */}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    value={customTask}
                    onChange={e => setCustom(e.target.value)}
                    placeholder="Add custom task..."
                    onKeyDown={e => e.key === 'Enter' && addCustomTask()}
                    style={{
                      height: 32, fontSize: 12, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px',
                      background: '#FFF', width: 140
                    }}
                  />
                  
                  {/* Recurrence Dropdown */}
                  <select
                    value={taskFreq}
                    onChange={e => setTaskFreq(e.target.value)}
                    style={{ height: 32, fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', padding: '0 6px', background: '#FFF', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="bi-weekly">Bi-weekly</option>
                    <option value="second_monday">Second Monday</option>
                    <option value="monthly">Monthly</option>
                    <option value="one-time">One-time</option>
                  </select>

                  {/* Department Dropdown */}
                  <select
                    value={taskDept}
                    onChange={e => setTaskDept(e.target.value)}
                    style={{ height: 32, fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', padding: '0 6px', background: '#FFF', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="all">All Depts</option>
                    <option value="sales">Sales</option>
                    <option value="bd">BD</option>
                    <option value="hr">HR</option>
                    <option value="engineering">Engineering</option>
                  </select>

                  <button onClick={addCustomTask} style={{ width: 32, height: 32, borderRadius: 8, background: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {/* DAILY subtab */}
              <div style={{ borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4F46E5', paddingBottom: 6, borderBottom: '2px solid #4F46E5', display: 'inline-block' }}>DAILY</span>
              </div>

              {allTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)' }}>
                  <CheckSquare size={28} style={{ opacity: .3, marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: 13 }}>No tasks yet. Upload a task sheet or add one above.</p>
                </div>
              ) : (
                <>
                  <TaskGroup label="Daily"    freq="daily"    icon={Clock} />
                  <TaskGroup label="Weekly"   freq="weekly"   icon={Calendar} />
                  <TaskGroup label="Bi-weekly" freq="bi-weekly" icon={Calendar} />
                  <TaskGroup label="Every Second Monday" freq="second_monday" icon={Calendar} />
                  <TaskGroup label="Monthly"  freq="monthly"  icon={Target} />
                  <TaskGroup label="One-time" freq="one-time" icon={CheckSquare} />
                </>
              )}

              {/* Footer View all link */}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>
                  View all tasks <ArrowRight size={12} />
                </span>
              </div>
            </div>

          </div>

          {/* Right panel widgets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* This week card */}
            <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={14} />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>This week</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  ['Tasks done', `${doneCnt}/${allTasks.length || 2}`, '#4F46E5'],
                  ['On-time rate', '87%', '#10B981'],
                  ['Overdue', '1', '#EF4444'],
                  ['Completion rate', '0%', 'var(--text-3)']
                ].map(([label, val, color]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
                    <span style={{ fontWeight: 700, color }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming tasks card list */}
            <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckSquare size={14} />
                </div>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>Upcoming tasks</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Tomorrow */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>Tomorrow</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Follow up with leads</span>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>10:00 AM</p>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: '#FEF2F2', color: '#EF4444' }}>high</span>
                  </div>
                </div>

                {/* This week */}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase' }}>This week</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '1.5px solid var(--border)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>Weekly pipeline review</span>
                      <p style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>Friday, 03:00 PM</p>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 20, background: '#EFF6FF', color: '#2563EB' }}>medium</span>
                  </div>
                </div>
              </div>

              {/* View calendar bottom link */}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>View calendar</span>
                <ArrowRight size={14} color="#4F46E5" />
              </div>
            </div>

          </div>

        </div>
      )}

      {tab === 'crm' && (
        <div style={{ marginBottom: 24 }}>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {DISP_OPTIONS.map(d => (
              <span key={d.v} className={`badge badge-${d.t}`} style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}>
                {d.l}: <strong>{leads.filter(l => l.status === d.v).length}</strong>
              </span>
            ))}
          </div>

          {leads.length === 0 ? (
            <div className="card empty-state" style={{ padding: '48px 24px', borderRadius: 16 }}>
              <div className="icon">📋</div>
              <h3>No leads yet</h3>
              <p>Upload a data sheet to populate your CRM calling list.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowUploadCRM(true)}>
                <Upload size={14} style={{ marginRight: 5 }} />Upload Data Sheet
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {leads.map(lead => {
                const ls        = lsOf(lead)
                const dispOpt   = DISP_OPTIONS.find(x => x.v === ls.disp)
                const phone     = lead.phone
                const email     = lead.email
                const waNumber  = phone?.replace(/[^0-9]/g, '')

                return (
                  <div key={lead.id} className="card" style={{ padding: 16, borderRadius: 14, background: '#FFF', border: '1px solid var(--border)' }}>
                    
                    {/* Identity & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar" style={{ width: 38, height: 38, fontSize: 12, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                        {lead.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{lead.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {lead.company && <span>{lead.company}</span>}
                          {phone  && <span>{phone}</span>}
                          {email  && <span>{email}</span>}
                        </div>
                      </div>
                      <span className={`badge badge-${dispOpt?.t || 'gray'}`} style={{ flexShrink: 0 }}>{dispOpt?.l || ls.disp}</span>
                    </div>

                    {/* Actions row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', marginRight: 4 }}>Contact</span>

                      <button 
                        onClick={() => initiateWebRTCCall(lead)} 
                        className="btn btn-ghost btn-sm" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', height: 28, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Phone size={12} style={{ color: '#10B981' }} /> Call
                      </button>

                      <button 
                        onClick={() => {
                          if (!lead.phone) { alert('No phone number on file.'); return }
                          setOutreachModal({ type: 'whatsapp', lead })
                          setOutreachBody(`Hi ${lead.name} 👋, I'm reaching out from ${import.meta.env.VITE_COMPANY_NAME || 'Mr. Manager'} regarding your operational enquiry. Do you have 5 minutes for a quick chat today?`)
                        }} 
                        className="btn btn-ghost btn-sm" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', height: 28, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <MessageCircle size={12} style={{ color: '#25d366' }} /> WhatsApp
                      </button>

                      <button 
                        onClick={() => {
                          if (!lead.email) { alert('No email on file.'); return }
                          setOutreachModal({ type: 'email', lead })
                          setOutreachSubject(`Welcome to ${import.meta.env.VITE_COMPANY_NAME || 'Mr. Manager'}!`)
                          setOutreachBody(`Dear ${lead.name},\n\nThank you for your interest in our solutions. We would love to set up a quick introduction call.\n\nBest regards,\nThe Hiring Team`)
                        }} 
                        className="btn btn-ghost btn-sm" 
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2)', height: 28, background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <Mail size={12} style={{ color: '#4F46E5' }} /> Email
                      </button>

                      <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

                      {/* Dropdown status switcher */}
                      <select
                        value={ls.disp}
                        onChange={e => setLS(lead.id, { disp: e.target.value, saved: false })}
                        style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: '#F8F9FC', height: 28 }}
                      >
                        {DISP_OPTIONS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                      </select>

                      {/* Notes toggle */}
                      <button className="btn btn-ghost btn-sm" onClick={() => setLS(lead.id, { showNote: !ls.showNote })} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28 }}>
                        <StickyNote size={12} /> Notes
                      </button>

                      {/* Save disposition */}
                      <button className={`btn btn-sm ${ls.saved ? 'btn-success' : 'btn-primary'}`} onClick={() => saveLeadDisp(lead)} disabled={ls.saving} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 28 }}>
                        {ls.saving ? <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> : ls.saved ? <Check size={12} /> : <Save size={12} />}
                        <span>{ls.saving ? 'Saving' : ls.saved ? 'Saved' : 'Save'}</span>
                      </button>
                    </div>

                    {/* Expand notes */}
                    {ls.showNote && (
                      <div style={{ marginTop: 10 }}>
                        <textarea
                          value={ls.note}
                          onChange={e => setLS(lead.id, { note: e.target.value, saved: false })}
                          placeholder="Call notes — what was discussed, follow-up actions…"
                          style={{ width: '100%', boxSizing: 'border-box', minHeight: 60, resize: 'vertical', fontSize: 12, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 8, outline: 'none' }}
                        />
                      </div>
                    )}

                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Calling pipeline overview (always visible at bottom of Tasks & CRM) */}
      <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF', marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700 }}>Calling pipeline overview</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Track your calling activities and outcomes.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>Today</span>
            <ChevronDown size={12} color="var(--text-3)" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { label: 'Total calls', value: leads.filter(l => l.status && l.status !== 'new').length, color: '#7C3AED', bg: '#F5F3FF', icon: Phone },
            { label: 'Connected', value: leads.filter(l => ['interested', 'callback', 'converted'].includes(l.status)).length, color: '#10B981', bg: '#ECFDF5', icon: PhoneCall },
            { label: 'Conversations', value: leads.filter(l => ['interested', 'callback'].includes(l.status)).length, color: '#2563EB', bg: '#EFF6FF', icon: MessageSquare },
            { label: 'Follow-ups', value: leads.filter(l => l.status === 'callback').length, color: '#F59E0B', bg: '#FEF3C7', icon: Users }
          ].map((card, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', border: '1px solid var(--border)', borderRadius: 12, background: '#FFF' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={15} />
              </div>
              <div>
                <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-1)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>{card.value}</span>
                <p style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500, marginTop: 2 }}>{card.label}</p>
                <span style={{ fontSize: 10, color: 'var(--text-3)' }}>Today</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic WebRTC Dialer Panel */}
      {activeCall && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 360,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          padding: 24,
          zIndex: 9999,
          fontFamily: 'var(--font-body)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: '#4F46E5', color: '#FFF',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14
              }}>
                {activeCall.leadName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-1)' }}>{activeCall.leadName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: activeCall.status === 'connected' ? '#10B981' : '#F59E0B',
                    display: 'inline-block'
                  }} />
                  {activeCall.status === 'connected' ? 'Connected' : 'Calling...'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
              {formatDuration(activeCall.duration)}
            </div>
          </div>

          <div style={{
            background: 'rgba(243, 244, 246, 0.5)',
            borderRadius: 12,
            padding: 12,
            maxHeight: 180,
            overflowY: 'auto',
            border: '1px solid rgba(229, 231, 235, 0.5)'
          }}>
            <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-1)', margin: '0 0 6px' }}>
              💡 Objection scripts ({activeCall.department || 'General'} Script)
            </h4>
            <p style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4, margin: '0 0 10px', fontStyle: 'italic' }}>
              "{deptScripts[activeCall.department]?.talkingPoints || 'Introduce yourself and ask about their operational bottlenecks.'}"
            </p>

            {deptScripts[activeCall.department]?.objections.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>Objection Handling:</div>
                {deptScripts[activeCall.department].objections.map((ob, i) => (
                  <div key={i} style={{ marginBottom: 6, borderLeft: '2px solid #4F46E5', paddingLeft: 6 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>Q: "{ob.q}"</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>A: "{ob.a}"</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <button
              onClick={() => setActiveCall(c => ({ ...c, isMuted: !c.isMuted }))}
              style={{
                height: 36, padding: '0 14px', borderRadius: 18, border: 'none',
                background: activeCall.isMuted ? '#EEF2FF' : '#F3F4F6',
                color: activeCall.isMuted ? '#4F46E5' : 'var(--text-2)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600
              }}
            >
              {activeCall.isMuted ? '🎙️ Muted' : '🎙️ Mute'}
            </button>
            <button
              onClick={endWebRTCCall}
              style={{
                height: 36, padding: '0 16px', borderRadius: 18, border: 'none',
                background: '#EF4444', color: '#FFF', fontWeight: 700, fontSize: 12,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}
            >
              🛑 Hang Up
            </button>
          </div>
        </div>
      )}

      {/* Outreach Templates Modal */}
      {outreachModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
        }}>
          <div className="card" style={{ width: 420, padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700 }}>
                Outreach {outreachModal.type === 'whatsapp' ? 'WhatsApp' : 'Email'} to {outreachModal.lead.name}
              </h3>
              <button onClick={() => setOutreachModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Select Template:</label>
                <select
                  onChange={(e) => {
                    const idx = parseInt(e.target.value)
                    const templates = outreachModal.type === 'whatsapp' ? WHATSAPP_TEMPLATES : EMAIL_TEMPLATES
                    const t = templates[idx]
                    if (t) {
                      const company = import.meta.env.VITE_COMPANY_NAME || 'Mr. Manager'
                      const scheduler = localStorage.getItem('company_scheduler_url') || 'https://cal.com/company/interview'
                      
                      let bodyText = t.body
                        .replace(/{name}/g, outreachModal.lead.name)
                        .replace(/{company}/g, company)
                        .replace(/{schedulerUrl}/g, scheduler)
                      
                      setOutreachBody(bodyText)
                      if (outreachModal.type === 'email') {
                        setOutreachSubject(t.subject.replace(/{company}/g, company))
                      }
                    }
                  }}
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 8px', fontSize: 13, background: '#FFF' }}
                >
                  <option value="">-- Choose Template --</option>
                  {(outreachModal.type === 'whatsapp' ? WHATSAPP_TEMPLATES : EMAIL_TEMPLATES).map((t, idx) => (
                    <option key={idx} value={idx}>{t.label}</option>
                  ))}
                </select>
              </div>

              {outreachModal.type === 'email' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Subject:</label>
                  <input
                    type="text"
                    value={outreachSubject}
                    onChange={(e) => setOutreachSubject(e.target.value)}
                    style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13, background: '#FFF', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Message Body:</label>
                <textarea
                  value={outreachBody}
                  onChange={(e) => setOutreachBody(e.target.value)}
                  style={{ width: '100%', minHeight: 120, borderRadius: 8, border: '1px solid var(--border)', padding: '10px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: '#FFF' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setOutreachModal(null)}>Cancel</button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    try {
                      if (outreachModal.type === 'whatsapp') {
                        await sendWhatsAppMessage({ to: outreachModal.lead.phone, body: outreachBody })
                      } else {
                        await sendConsentEmail({
                          candidateName: outreachModal.lead.name,
                          candidateEmail: outreachModal.lead.email,
                          jobTitle: 'CRM Lead Follow-up',
                          jobLocation: 'Mumbai',
                          salary: 'N/A',
                          consentToken: 'mock-crm-token'
                        })
                      }
                      setOutreachModal(null)
                    } catch (err) {
                      alert('Outreach failed: ' + err.message)
                    }
                  }}
                >
                  Send Outreach
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'scripts' && (
        <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Outbound Call Scripts & Objection Handling</h2>
              <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Customize the talking points and objection responses displayed inside the softphone dialer during sales calls.</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setDeptScripts(DEPT_SCRIPTS)
                  localStorage.removeItem('company_dept_scripts')
                  setMsg('✅ Call scripts reset to default templates!')
                  setTimeout(() => setMsg(''), 4000)
                }}
              >
                Reset to Defaults
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={() => {
                  localStorage.setItem('company_dept_scripts', JSON.stringify(deptScripts))
                  setMsg('✅ Call scripts saved successfully!')
                  setTimeout(() => setMsg(''), 4000)
                }}
              >
                Save Scripts
              </button>
            </div>
          </div>

          {msg && <div style={{ fontSize: 13, color: '#10B981', fontWeight: 600, marginBottom: 14 }}>{msg}</div>}

          {/* Department selector tabs */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
            {['IT', 'Sales', 'HR', 'Marketing'].map(d => (
              <button
                key={d}
                onClick={() => setSelectedScriptDept(d)}
                style={{
                  border: 'none', background: 'none', padding: '8px 16px', fontSize: 13,
                  fontWeight: selectedScriptDept === d ? 700 : 500,
                  color: selectedScriptDept === d ? '#4F46E5' : 'var(--text-3)',
                  borderBottom: selectedScriptDept === d ? '2px solid #4F46E5' : '2px solid transparent',
                  cursor: 'pointer'
                }}
              >
                {d} Department
              </button>
            ))}
          </div>

          {/* Editor contents */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6, color: 'var(--text-2)' }}>Talking Points / Pitch Intro:</label>
              <textarea
                value={deptScripts[selectedScriptDept]?.talkingPoints || ''}
                onChange={(e) => {
                  const val = e.target.value
                  setDeptScripts(prev => ({
                    ...prev,
                    [selectedScriptDept]: {
                      ...prev[selectedScriptDept],
                      talkingPoints: val
                    }
                  }))
                }}
                style={{ width: '100%', minHeight: 180, borderRadius: 8, border: '1px solid var(--border)', padding: '12px', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', background: '#FFF' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>Objection Handling QA pairs:</span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setDeptScripts(prev => {
                      const list = [...(prev[selectedScriptDept]?.objections || [])]
                      list.push({ q: 'New objection question...', a: 'New handling response...' })
                      return {
                        ...prev,
                        [selectedScriptDept]: {
                          ...prev[selectedScriptDept],
                          objections: list
                        }
                      }
                    })
                  }}
                  style={{ padding: '4px 10px', fontSize: 11 }}
                >
                  + Add Objection
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '42vh', overflowY: 'auto', paddingRight: 6 }}>
                {(deptScripts[selectedScriptDept]?.objections || []).map((ob, idx) => (
                  <div key={idx} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: '#F9FAFB', position: 'relative' }}>
                    <button
                      onClick={() => {
                        setDeptScripts(prev => {
                          const list = (prev[selectedScriptDept]?.objections || []).filter((_, i) => i !== idx)
                          return {
                            ...prev,
                            [selectedScriptDept]: {
                              ...prev[selectedScriptDept],
                              objections: list
                            }
                          }
                        })
                      }}
                      style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-3)' }}
                      title="Delete objection"
                    >
                      ❌
                    </button>
                    
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>Candidate Objection:</label>
                      <input
                        type="text"
                        value={ob.q}
                        onChange={(e) => {
                          const val = e.target.value
                          setDeptScripts(prev => {
                            const list = [...(prev[selectedScriptDept]?.objections || [])]
                            list[idx] = { ...list[idx], q: val }
                            return {
                              ...prev,
                              [selectedScriptDept]: {
                                ...prev[selectedScriptDept],
                                objections: list
                              }
                            }
                          })
                        }}
                        style={{ width: '100%', height: 32, fontSize: 12, borderRadius: 6 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, color: 'var(--text-3)' }}>Objection Answer Response:</label>
                      <textarea
                        value={ob.a}
                        onChange={(e) => {
                          const val = e.target.value
                          setDeptScripts(prev => {
                            const list = [...(prev[selectedScriptDept]?.objections || [])]
                            list[idx] = { ...list[idx], a: val }
                            return {
                              ...prev,
                              [selectedScriptDept]: {
                                ...prev[selectedScriptDept],
                                objections: list
                              }
                            }
                          })
                        }}
                        style={{ width: '100%', minHeight: 52, fontSize: 12, borderRadius: 6, padding: 6, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
