import { useState } from 'react'
import { Sparkles, Info } from 'lucide-react'

export default function AIPrompts() {
  const [msg, setMsg] = useState('')
  
  const [jdPrompt, setJdPrompt] = useState(localStorage.getItem('company_jd_prompt') || `You are an expert HR professional at a fast-growing Indian tech company.
Generate a professional, compelling job description in plain text (not markdown).
Include: role overview (2-3 sentences), key responsibilities (6-8 bullet points with -),
requirements must-have (4-5 points with -), nice-to-have (2-3 points with -),
and what we offer (4-5 points with -). Keep under 500 words. Be specific, not generic.`)

  const [screeningPrompt, setScreeningPrompt] = useState(localStorage.getItem('company_screening_prompt') || `You are an expert recruiter and HR professional.
Screen resumes against job descriptions objectively and fairly.
Always respond with valid JSON only — no markdown fences, no explanation, no extra text.`)

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'var(--font-body)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>AI Prompts</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Manage system instructions for Job Description generation and resume screening.</p>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', color: msg.startsWith('✅') ? '#10B981' : '#EF4444', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* AI Screening Prompt Management Panel */}
      <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Sparkles size={16} color="#7C3AED" />
          <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>AI screening prompt management panel</h2>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Configure the system instructions sent to Claude for screening candidate resumes and generating job descriptions.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Job Description System Prompt
            </label>
            <textarea
              value={jdPrompt}
              onChange={(e) => setJdPrompt(e.target.value)}
              placeholder="System prompt for Job Description generation..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 120,
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FFF',
                fontSize: 12,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>
              Resume Vetting &amp; Screening System Prompt
            </label>
            <textarea
              value={screeningPrompt}
              onChange={(e) => setScreeningPrompt(e.target.value)}
              placeholder="System prompt for candidate resume screening..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 140,
                padding: 12,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FFF',
                fontSize: 12,
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start', gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={() => {
                localStorage.setItem('company_jd_prompt', jdPrompt)
                localStorage.setItem('company_screening_prompt', screeningPrompt)
                setMsg('✅ AI Prompts saved successfully!')
                window.scrollTo({ top: 0, behavior: 'smooth' })
                setTimeout(() => setMsg(''), 4000)
              }}
              style={{ height: 38, borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Save AI Prompts
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm('Are you sure you want to reset prompts to their defaults?')) {
                  localStorage.removeItem('company_jd_prompt')
                  localStorage.removeItem('company_screening_prompt')
                  setJdPrompt(`You are an expert HR professional at a fast-growing Indian tech company.
Generate a professional, compelling job description in plain text (not markdown).
Include: role overview (2-3 sentences), key responsibilities (6-8 bullet points with -),
requirements must-have (4-5 points with -), nice-to-have (2-3 points with -),
and what we offer (4-5 points with -). Keep under 500 words. Be specific, not generic.`)
                  setScreeningPrompt(`You are an expert recruiter and HR professional.
Screen resumes against job descriptions objectively and fairly.
Always respond with valid JSON only — no markdown fences, no explanation, no extra text.`)
                  setMsg('✅ Reset to default AI prompts.')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  setTimeout(() => setMsg(''), 4000)
                }
              }}
              style={{ height: 38, borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
      
      {/* Informational Card */}
      <div style={{ display: 'flex', gap: 8, padding: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1E40AF', alignItems: 'center', marginTop: 20 }}>
        <Info size={14} color="#2563EB" style={{ flexShrink: 0 }} />
        <span style={{ fontWeight: 500 }}>System prompts will be applied globally across all job postings and candidate evaluations. Changes reflect immediately on new requests.</span>
      </div>
    </div>
  )
}
