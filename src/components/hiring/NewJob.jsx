import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { createJob } from '../../lib/supabase.js'
import { generateJD, generateJobCriteria } from '../../lib/claude.js'
import { Sparkles, ChevronLeft, Save, Plus, Trash2, AlertTriangle, Loader, CheckCircle2 } from 'lucide-react'

export default function NewJob() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '', department: '', location: '', type: 'Full-time',
    salary: '', reportingTo: '', skills: '', experience: '', description: ''
  })
  const [questions, setQuestions] = useState([]) // [{ question, dealbreaker }]
  const [jd, setJd] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generatingQuestions, setGeneratingQuestions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const [customDepts, setCustomDepts] = useState(() => {
    const saved = localStorage.getItem('company_departments')
    return saved ? JSON.parse(saved) : ['Sales', 'Engineering', 'Marketing', 'HR', 'Operations', 'Finance', 'Customer Success']
  })
  const [showAddCustomDept, setShowAddCustomDept] = useState(false)
  const [newDeptInput, setNewDeptInput] = useState('')

  function addQuestion() {
    setQuestions(prev => [...prev, { question: '', dealbreaker: false }])
  }
  function removeQuestion(i) {
    setQuestions(prev => prev.filter((_, j) => j !== i))
  }
  function setQ(i, field, val) {
    setQuestions(prev => prev.map((q, j) => j === i ? { ...q, [field]: val } : q))
  }

  async function handleGenerate() {
    if (!form.title || !form.department || !form.location || !form.salary) {
      setError('Fill Role, Department, Location and Salary.')
      return
    }
    setError('')
    setGenerating(true)
    try {
      const generatedJd = await generateJD(form)
      setJd(generatedJd)

      // Automatically generate tailored required skills and screening questions from the JD
      try {
        const criteria = await generateJobCriteria({ ...form, jd: generatedJd })
        if (criteria?.requiredSkills?.length && !form.skills.trim()) {
          set('skills', criteria.requiredSkills.join(', '))
        }
        if (criteria?.qualifyingQuestions?.length && questions.length === 0) {
          setQuestions(criteria.qualifyingQuestions)
        }
      } catch (critErr) {
        console.warn('Auto criteria generation note:', critErr.message)
      }

      setStep(2)
    } catch (e) {
      setError('AI error: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  async function handleAutoGenerateQuestions() {
    if (!form.title.trim() && !jd.trim() && !form.skills.trim()) {
      setError('Please provide at least a Job title, Key skills, or JD to auto-generate questions.')
      return
    }
    setError('')
    setGeneratingQuestions(true)
    try {
      const criteria = await generateJobCriteria({ ...form, jd })
      if (criteria?.qualifyingQuestions?.length) {
        setQuestions(criteria.qualifyingQuestions)
      }
      if (criteria?.requiredSkills?.length && !form.skills.trim()) {
        set('skills', criteria.requiredSkills.join(', '))
      }
    } catch (e) {
      setError('Failed to generate screening questions: ' + e.message)
    } finally {
      setGeneratingQuestions(false)
    }
  }

  async function handlePost() {
    setSaving(true)
    try {
      await createJob({
        title: form.title, department: form.department, location: form.location,
        type: form.type, salary: form.salary, reporting_to: form.reportingTo,
        skills: form.skills, experience: form.experience, description: form.description,
        jd,
        qualifying_questions: questions.filter(q => q.question.trim()),
        status: 'active',
        posted_by: user.supabaseId,
        company_id: user.company_id || null,
      }, user.company_id)
      navigate('/hiring')
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  const steps = [['1', 'Job details'], ['2', 'Review JD']]

  return (
    <div>
      <button onClick={() => navigate('/hiring')} className="btn btn-ghost btn-sm"
        style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <ChevronLeft size={15} /> Back
      </button>

      <div className="page-header">
        <h1>Post a new job</h1>
        <p>Fill in details, add qualifying questions, then let AI generate a professional JD.</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
        {steps.map(([n, l], i) => (
          <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              background: step >= +n ? 'var(--brand)' : 'var(--border)',
              color: step >= +n ? '#fff' : 'var(--text-3)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700
            }}>{n}</span>
            <span style={{ fontSize: 13, fontWeight: step === +n ? 600 : 400, color: step === +n ? 'var(--text-1)' : 'var(--text-3)' }}>{l}</span>
            {i < steps.length - 1 && <span style={{ width: 40, height: 1, background: 'var(--border)' }} />}
          </span>
        ))}
      </div>

      {/* ── Step 1: Job details + qualifying questions ── */}
      {step === 1 && (
        <div className="card">
          <div className="form-row">
            <div className="form-group">
              <label>Job title *</label>
              <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Senior Sales Executive" />
            </div>
            <div className="form-group">
              <label>Location *</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Mumbai / Remote" />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Department *</label>
              {showAddCustomDept ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newDeptInput}
                    onChange={e => setNewDeptInput(e.target.value)}
                    placeholder="New department name"
                    style={{ flex: 1, height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 10px', fontSize: 13 }}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      const trimmed = newDeptInput.trim()
                      if (!trimmed) {
                        setShowAddCustomDept(false)
                        return
                      }
                      if (!customDepts.includes(trimmed)) {
                        const updated = [...customDepts, trimmed]
                        setCustomDepts(updated)
                        localStorage.setItem('company_departments', JSON.stringify(updated))
                      }
                      set('department', trimmed)
                      setShowAddCustomDept(false)
                      setNewDeptInput('')
                    }}
                    style={{ height: 38, padding: '0 12px', borderRadius: 8 }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setShowAddCustomDept(false)
                      setNewDeptInput('')
                    }}
                    style={{ height: 38, padding: '0 12px', borderRadius: 8, background: '#F3F4F6', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  value={form.department}
                  onChange={e => {
                    if (e.target.value === '+ Add Custom Department') {
                      setShowAddCustomDept(true)
                    } else {
                      set('department', e.target.value)
                    }
                  }}
                  style={{ width: '100%', borderRadius: 8 }}
                >
                  <option value="">Select…</option>
                  {customDepts.map(d => <option key={d} value={d}>{d}</option>)}
                  <option value="+ Add Custom Department" style={{ fontWeight: 600, color: '#4F46E5' }}>+ Add Custom Department</option>
                </select>
              )}
            </div>
            <div className="form-group">
              <label>Type</label>
              <select value={form.type} onChange={e => set('type', e.target.value)}>
                {['Full-time', 'Part-time', 'Contract', 'Internship'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Salary range *</label>
              <input value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="e.g. ₹8–12 LPA" />
            </div>
            <div className="form-group">
              <label>Reporting to</label>
              <input value={form.reportingTo} onChange={e => set('reportingTo', e.target.value)} placeholder="e.g. VP Sales" />
            </div>
          </div>
          <div className="form-group">
            <label>Key skills</label>
            <input value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="e.g. B2B Sales, Salesforce" />
          </div>
          <div className="form-group">
            <label>Relevant experience</label>
            <input value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="e.g. 3–5 years in B2B SaaS sales" />
          </div>
          <div className="form-group">
            <label>Additional description / context</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Team culture, key priorities, deal-breakers, company stage, etc."
              style={{ minHeight: 80, resize: 'vertical' }} />
          </div>

          {/* ── Qualifying questions ── */}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: '1.25rem', paddingTop: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Qualifying Questions &amp; Screening Criteria</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  AI screens each CV specifically against these questions. Mark non-negotiable questions as <strong>Dealbreaker</strong>.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAutoGenerateQuestions}
                  disabled={generatingQuestions}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4F46E5', borderColor: '#C7D2FE', background: '#EEF2FF', fontWeight: 600 }}
                >
                  <Sparkles size={13} color="#4F46E5" />
                  {generatingQuestions ? 'Generating…' : '✨ AI Generate Questions'}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addQuestion}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
                >
                  <Plus size={13} /> Add Question
                </button>
              </div>
            </div>

            {questions.length === 0 && (
              <div style={{
                padding: '1.25rem', background: '#F8FAFC', borderRadius: 8,
                border: '1px dashed var(--border)', textAlign: 'center',
                fontSize: 13, color: 'var(--text-3)', margin: '8px 0'
              }}>
                <Sparkles size={20} color="#4F46E5" style={{ display: 'block', margin: '0 auto 8px' }} />
                <p style={{ margin: '0 0 4px', fontWeight: 600, color: 'var(--text-1)' }}>No screening questions yet</p>
                <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-3)' }}>
                  Questions will be generated automatically when you click "Generate JD with AI", or click below to generate them now.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAutoGenerateQuestions}
                  disabled={generatingQuestions}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#4F46E5', borderColor: '#C7D2FE', background: '#EEF2FF', margin: '0 auto' }}
                >
                  <Sparkles size={13} /> {generatingQuestions ? 'Analyzing role…' : 'Generate Questions with AI'}
                </button>
              </div>
            )}

            {questions.map((q, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10,
                padding: '12px 14px', background: 'var(--bg-2)', borderRadius: 8,
                border: `1px solid ${q.dealbreaker ? 'var(--warning)' : 'var(--border)'}`
              }}>
                <div style={{ flex: 1 }}>
                  <input
                    value={q.question}
                    onChange={e => setQ(i, 'question', e.target.value)}
                    placeholder={`Question ${i + 1} — e.g. Does the candidate have 3+ years of B2B sales experience?`}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: 8 }}
                  />
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={q.dealbreaker}
                      onChange={e => setQ(i, 'dealbreaker', e.target.checked)}
                      style={{ width: 15, height: 15, accentColor: 'var(--warning)', cursor: 'pointer' }}
                    />
                    <AlertTriangle size={13} color={q.dealbreaker ? 'var(--warning)' : 'var(--text-3)'} />
                    <span style={{ color: q.dealbreaker ? 'var(--warning)' : 'var(--text-3)', fontWeight: q.dealbreaker ? 700 : 400 }}>
                      Dealbreaker — reject if not met
                    </span>
                  </label>
                </div>
                <button onClick={() => removeQuestion(i)} className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', flexShrink: 0, padding: '4px 6px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {error && (
            <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating
                ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Generating…</>
                : <><Sparkles size={15} /> Generate JD with AI</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Review JD ── */}
      {step === 2 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>AI-generated JD</span>
              <span className="badge badge-brand">Review &amp; edit</span>
            </div>
            <textarea value={jd} onChange={e => setJd(e.target.value)} style={{ minHeight: 420, lineHeight: 1.7 }} />
            {error && (
              <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 6, fontSize: 13, margin: '8px 0' }}>
                {error}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>← Edit details</button>
              <button className="btn btn-ghost" onClick={handleGenerate} disabled={generating}>
                {generating ? 'Re-generating…' : '↺ Re-generate'}
              </button>
              <button className="btn btn-primary" onClick={handlePost} disabled={saving}>
                <Save size={15} /> {saving ? 'Posting…' : 'Post job'}
              </button>
            </div>
          </div>

          {/* Summary sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)', marginBottom: '1rem' }}>Job summary</div>
              {[
                ['Role', form.title], ['Dept', form.department], ['Location', form.location],
                ['Type', form.type], ['Salary', form.salary],
                ['Reports to', form.reportingTo || '—'], ['Experience', form.experience || '—'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)' }}>{l}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {form.skills && (
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)', marginBottom: '0.5rem' }}>
                  Target Screening Skills
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {form.skills.split(',').map(s => s.trim()).filter(Boolean).map((s, idx) => (
                    <span key={idx} className="badge badge-brand" style={{ fontSize: 11 }}>{s}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)' }}>
                  Screening Questions ({questions.filter(q => q.question.trim()).length})
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleAutoGenerateQuestions}
                  disabled={generatingQuestions}
                  style={{ fontSize: 11, color: '#4F46E5', padding: '2px 6px' }}
                >
                  <Sparkles size={11} style={{ marginRight: 3 }} />
                  {generatingQuestions ? 'Updating…' : 'Re-generate'}
                </button>
              </div>

              {questions.filter(q => q.question.trim()).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '10px 0' }}>
                  No questions yet. Click Re-generate to create from JD.
                </div>
              ) : (
                questions.filter(q => q.question.trim()).map((q, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '7px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    {q.dealbreaker ? (
                      <span style={{ fontSize: 9, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 1 }}>
                        DEALBREAKER
                      </span>
                    ) : (
                      <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--text-3)', background: 'var(--bg-2)', padding: '1px 5px', borderRadius: 4, flexShrink: 0, marginTop: 1 }}>
                        Q{i + 1}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-1)', lineHeight: 1.4 }}>{q.question}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
