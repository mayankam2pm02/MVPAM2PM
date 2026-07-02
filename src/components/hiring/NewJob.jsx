import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { createJob } from '../../lib/supabase.js'
import { generateJD } from '../../lib/claude.js'
import { Sparkles, ChevronLeft, Save, Plus, Trash2, AlertTriangle } from 'lucide-react'

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
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const depts = ['Sales', 'Engineering', 'Marketing', 'HR', 'Operations', 'Finance', 'Customer Success']

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
      const r = await generateJD(form)
      setJd(r)
      setStep(2)
    } catch (e) {
      setError('AI error: ' + e.message)
    } finally {
      setGenerating(false)
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
      })
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
              <select value={form.department} onChange={e => set('department', e.target.value)}>
                <option value="">Select…</option>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>Qualifying Questions</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                  AI will screen each candidate's CV against these questions and flag mismatches.
                  Mark a question as <strong>Dealbreaker</strong> to auto-reject candidates who don't meet it.
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={addQuestion}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                <Plus size={13} /> Add Question
              </button>
            </div>

            {questions.length === 0 && (
              <div style={{
                padding: '1rem', background: 'var(--bg-2)', borderRadius: 8,
                border: '1px dashed var(--border)', textAlign: 'center',
                fontSize: 13, color: 'var(--text-3)'
              }}>
                No qualifying questions yet. Click "Add Question" to add screening criteria.
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

            {questions.filter(q => q.question.trim()).length > 0 && (
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-2)', marginBottom: '0.75rem' }}>
                  Qualifying Questions ({questions.filter(q => q.question.trim()).length})
                </div>
                {questions.filter(q => q.question.trim()).map((q, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    {q.dealbreaker && <AlertTriangle size={11} color="var(--warning)" style={{ flexShrink: 0, marginTop: 2 }} />}
                    <span style={{ color: 'var(--text-2)' }}>{q.question}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
