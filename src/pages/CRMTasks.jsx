import { useState, useEffect, useRef } from 'react'
import { fetchLeads, updateLead, logCall, fetchTasks, createLead, createTask, fetchEmployees, createEmployee } from '../lib/supabase.js'
import { useAuth } from '../lib/auth.jsx'
import { Phone, CheckSquare, Clock, Plus, Bell, MessageSquare, Target, Calendar, Upload, X, CheckCircle, FileText, UserPlus, ChevronDown, ChevronUp, Loader, Users, Mail, MessageCircle, Save, StickyNote } from 'lucide-react'

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

        {/* STEP: upload */}
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

        {/* STEP: allocate */}
        {step === 'allocate' && (
          <>
            {/* Task preview */}
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

            {/* Employee selection */}
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

                {/* Add new employee row */}
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

            {/* Inline new employee form */}
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

        {/* STEP: saving */}
        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader size={32} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite', marginBottom: 14 }} />
            <p style={{ fontWeight: 600 }}>Saving tasks…</p>
          </div>
        )}

        {/* STEP: done */}
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

// ─── Upload CRM Data Modal ─────────────────────────────────────
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

        {/* STEP: upload */}
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

        {/* STEP: preview */}
        {step === 'preview' && (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
              Preview — {rows.length} contact{rows.length !== 1 ? 's' : ''} found
            </div>
            <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
              {/* Table header */}
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

        {/* STEP: saving */}
        {step === 'saving' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <Loader size={32} style={{ color: 'var(--brand)', animation: 'spin 1s linear infinite', marginBottom: 14 }} />
            <p style={{ fontWeight: 600 }}>Importing contacts to CRM…</p>
          </div>
        )}

        {/* STEP: done */}
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

export default function CRMTasks() {
  const { user } = useAuth()
  const [tab, setTab]               = useState('tasks')
  const [leads, setLeads]           = useState([])
  const [tasks, setTasks]           = useState([])
  const [tasksDone, setDone]        = useState({})
  const [customTask, setCustom]     = useState('')
  const [extraTasks, setExtra]      = useState([])
  const [loading, setLoading]       = useState(true)
  const [showUploadTasks, setShowUploadTasks] = useState(false)
  const [showUploadCRM, setShowUploadCRM]     = useState(false)
  // per-lead inline state: { [id]: { disp, note, showNote, saving, saved } }
  const [leadState, setLeadState]   = useState({})

  useEffect(() => {
    Promise.all([fetchLeads(), fetchTasks()])
      .then(([l, t]) => { setLeads(l); setTasks(t) })
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
    setExtra(e => [...e, { id: `ct_${Date.now()}`, title: customTask, frequency: 'daily', priority: 'medium' }])
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
          <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: tasksDone[task.id] ? 'var(--success-bg)' : '#fff', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 6 }}>
            <input type="checkbox" checked={!!tasksDone[task.id]} onChange={() => setDone(d => ({ ...d, [task.id]: !d[task.id] }))} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand)' }} />
            <span style={{ flex: 1, fontSize: 13, textDecoration: tasksDone[task.id] ? 'line-through' : 'none', color: tasksDone[task.id] ? 'var(--text-3)' : 'var(--text-1)' }}>{task.title}</span>
            <span className={`badge badge-${task.priority === 'high' ? 'danger' : 'gray'}`}>{task.priority}</span>
          </div>
        ))}
      </div>
    )
  }

  if (loading) return <div className="card" style={{ padding: '2rem', color: 'var(--text-3)' }}>Loading…</div>

  return (
    <div>
      {showUploadTasks && <UploadTasksModal onClose={() => setShowUploadTasks(false)} onSaved={onTasksImported} />}
      {showUploadCRM   && <UploadCRMModal   onClose={() => setShowUploadCRM(false)}   onSaved={onLeadsImported} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Tasks &amp; CRM</h1>
          <p>Daily tasks and calling pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'tasks' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowUploadTasks(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> Upload Task Sheet
            </button>
          )}
          {tab === 'crm' && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowUploadCRM(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} /> Upload Data Sheet
            </button>
          )}
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'tasks' ? 'active' : ''}`} onClick={() => setTab('tasks')}>☑ Task manager</button>
        <button className={`tab-btn ${tab === 'crm' ? 'active' : ''}`} onClick={() => setTab('crm')}>📞 Calling CRM</button>
      </div>

      {tab === 'tasks' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 16 }}>
          <div>
            <div className="card" style={{ marginBottom: 12, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Today's progress</span>
                <span style={{ fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-display)', color: pct === 100 ? 'var(--success)' : 'var(--brand)' }}>{pct}%</span>
              </div>
              <div className="score-bar-track"><div className="score-bar-fill" style={{ width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--brand)' }} /></div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{doneCnt} of {allTasks.length} tasks complete</div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>My tasks</span>
                <input value={customTask} onChange={e => setCustom(e.target.value)} placeholder="Add custom task…" style={{ width: 200, fontSize: 12, padding: '6px 10px' }} onKeyDown={e => e.key === 'Enter' && addCustomTask()} />
                <button className="btn btn-secondary btn-sm" onClick={addCustomTask}><Plus size={13} /></button>
              </div>
              {allTasks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)' }}>
                  <CheckSquare size={28} style={{ opacity: .3, marginBottom: 10, display: 'block', margin: '0 auto 10px' }} />
                  <p style={{ margin: 0, fontSize: 13 }}>No tasks yet. Upload a task sheet or add one above.</p>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setShowUploadTasks(true)}>
                    <Upload size={13} /> Upload Task Sheet
                  </button>
                </div>
              ) : (
                <>
                  <TaskGroup label="Daily"    freq="daily"    icon={Clock} />
                  <TaskGroup label="Weekly"   freq="weekly"   icon={Calendar} />
                  <TaskGroup label="Monthly"  freq="monthly"  icon={Target} />
                  <TaskGroup label="One-time" freq="one-time" icon={CheckSquare} />
                </>
              )}
            </div>
          </div>
          <div className="card" style={{ alignSelf: 'flex-start' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)', marginBottom: 12 }}>This week</div>
            {[['Tasks done', `${doneCnt}/${allTasks.length}`, 'var(--brand)'], ['On-time rate', '87%', 'var(--success)'], ['Overdue', '1', 'var(--danger)']].map(([l, v, c]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--text-3)' }}>{l}</span><span style={{ fontWeight: 700, color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'crm' && (
        <div>
          {/* Summary badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            {DISP_OPTIONS.map(d => (
              <span key={d.v} className={`badge badge-${d.t}`}>
                {d.l}: {leads.filter(l => l.status === d.v).length}
              </span>
            ))}
          </div>

          {leads.length === 0 ? (
            <div className="card empty-state">
              <div className="icon">📋</div>
              <h3>No leads yet</h3>
              <p>Upload a data sheet to populate your CRM calling list.</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowUploadCRM(true)}>
                <Upload size={14} style={{ marginRight: 5 }} />Upload Data Sheet
              </button>
            </div>
          ) : leads.map(lead => {
            const ls        = lsOf(lead)
            const dispOpt   = DISP_OPTIONS.find(x => x.v === ls.disp)
            const phone     = lead.phone
            const email     = lead.email
            const waNumber  = phone?.replace(/[^0-9]/g, '')

            return (
              <div key={lead.id} className="card" style={{ marginBottom: 10, padding: '1rem 1.25rem' }}>

                {/* ── Top: identity + current status ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar" style={{ width: 40, height: 40, fontSize: 14, flexShrink: 0 }}>
                    {lead.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{lead.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 1, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {lead.company && <span>{lead.company}</span>}
                      {phone  && <span>{phone}</span>}
                      {email  && <span>{email}</span>}
                    </div>
                  </div>
                  <span className={`badge badge-${dispOpt?.t || 'gray'}`} style={{ flexShrink: 0 }}>{dispOpt?.l || ls.disp}</span>
                </div>

                {/* ── Action buttons ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', marginRight: 2 }}>Contact</span>

                  <a
                    href={phone ? `tel:${phone}` : undefined}
                    onClick={!phone ? e => { e.preventDefault(); alert('No phone number on file.') } : undefined}
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Phone size={13} style={{ color: 'var(--success)' }} /> Call
                  </a>

                  <a
                    href={waNumber ? `https://wa.me/${waNumber}?text=Hi ${encodeURIComponent(lead.name)}, we are reaching out regarding your enquiry.` : undefined}
                    onClick={!waNumber ? e => { e.preventDefault(); alert('No phone number on file.') } : undefined}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}
                  >
                    <MessageCircle size={13} style={{ color: '#25d366' }} /> WhatsApp
                  </a>

                  <a
                    href={email ? `mailto:${email}` : undefined}
                    onClick={!email ? e => { e.preventDefault(); alert('No email on file.') } : undefined}
                    className="btn btn-ghost btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: 'inherit' }}
                  >
                    <Mail size={13} style={{ color: 'var(--brand)' }} /> Email
                  </a>

                  <span style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px', flexShrink: 0 }} />

                  {/* Disposition dropdown */}
                  <select
                    value={ls.disp}
                    onChange={e => setLS(lead.id, { disp: e.target.value, saved: false })}
                    style={{ fontSize: 12, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer', background: 'var(--bg)' }}
                  >
                    {DISP_OPTIONS.map(d => <option key={d.v} value={d.v}>{d.l}</option>)}
                  </select>

                  {/* Notes toggle */}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setLS(lead.id, { showNote: !ls.showNote })}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    title="Add call notes"
                  >
                    <StickyNote size={13} /> Notes
                  </button>

                  {/* Save button */}
                  <button
                    className={`btn btn-sm ${ls.saved ? 'btn-success' : 'btn-primary'}`}
                    onClick={() => saveLeadDisp(lead)}
                    disabled={ls.saving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {ls.saving
                      ? <><Loader size={12} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
                      : ls.saved
                        ? <><CheckCircle size={12} /> Saved</>
                        : <><Save size={12} /> Save</>}
                  </button>
                </div>

                {/* Notes textarea (shown when toggled) */}
                {ls.showNote && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      value={ls.note}
                      onChange={e => setLS(lead.id, { note: e.target.value, saved: false })}
                      placeholder="Call notes — what was discussed, follow-up actions…"
                      style={{ width: '100%', boxSizing: 'border-box', minHeight: 72, resize: 'vertical', fontSize: 13, fontFamily: 'inherit', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
                    />
                    {lead.notes && lead.notes !== ls.note && (
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, fontStyle: 'italic' }}>
                        Previous note: "{lead.notes}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
