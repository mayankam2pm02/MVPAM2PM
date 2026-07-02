import { useState, useEffect, useRef } from 'react'
import {
  fetchJobs, fetchAllApplications, fetchEmployees,
  fetchLeads, fetchTasks, fetchTrainingModules
} from '../lib/supabase.js'
import {
  BarChart2, Download, Briefcase, GraduationCap,
  CheckSquare, Phone, ChevronRight, X, Search
} from 'lucide-react'

// ─── Shared UI helpers ─────────────────────────────────────────

function MiniBar({ label, value, max, color = 'var(--brand)' }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 7 }}>
      <div style={{ width: 170, fontSize: 12, color: 'var(--text-2)', flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ flex: 1, height: 22, background: 'var(--bg-2)', borderRadius: 5, overflow: 'hidden', border: '1px solid var(--border)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width .4s', display: 'flex', alignItems: 'center', paddingLeft: pct > 10 ? 8 : 0, minWidth: value > 0 ? 4 : 0 }}>
          {pct > 10 && <span style={{ fontSize: 11, color: '#fff', fontWeight: 700 }}>{value}</span>}
        </div>
      </div>
      {pct <= 10 && <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 24 }}>{value}</span>}
    </div>
  )
}

function StatGrid({ cols = 4, items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap: 10, marginBottom: '1.25rem' }}>
      {items.map(([label, value, color]) => (
        <div key={label} style={{ background: 'var(--bg-2)', borderRadius: 8, padding: '1rem', textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function SectionCard({ title, icon: Icon, color = 'var(--brand)', children }) {
  return (
    <div className="card" style={{ marginBottom: '1.25rem' }}>
      <h2 style={{ fontSize: 15, marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color={color} /> {title}
      </h2>
      {children}
    </div>
  )
}

function EmptyNote({ text }) {
  return <p style={{ fontSize: 13, color: 'var(--text-3)', padding: '1rem 0' }}>{text}</p>
}

// ─── Constants ─────────────────────────────────────────────────

const PIPELINE = [
  { v: 'applied',             l: 'Applied',              c: '#94a3b8' },
  { v: 'screened',            l: 'Screened',             c: '#6366f1' },
  { v: 'shortlisted',         l: 'Shortlisted',          c: '#7c3aed' },
  { v: 'video_interview',     l: 'AI Video Interview',   c: '#7c3aed' },
  { v: 'manual_round',        l: 'Manual Round',         c: '#2563eb' },
  { v: 'interview_scheduled', l: 'Interview Scheduled',  c: '#0891b2' },
  { v: 'interview_done',      l: 'Interview Done',       c: '#0284c7' },
  { v: 'offer_sent',          l: 'Offer Sent',           c: '#059669' },
  { v: 'hired',               l: 'Hired',                c: 'var(--success)' },
  { v: 'rejected',            l: 'Rejected',             c: 'var(--danger)' },
]

const CRM_S = [
  { v: 'new',            l: 'New / Not Called', c: '#94a3b8' },
  { v: 'interested',     l: 'Interested',       c: 'var(--success)' },
  { v: 'callback',       l: 'Callback',         c: 'var(--warning)' },
  { v: 'not_interested', l: 'Not Interested',   c: 'var(--danger)' },
  { v: 'converted',      l: 'Converted',        c: 'var(--brand)' },
  { v: 'lost',           l: 'Lost',             c: '#6b7280' },
]

const TRAINING_TYPE_MAP = {
  general: 'all', sales: 'sales', engineering: 'engineering',
  hr: 'hr', operations: 'operations', management: 'management',
  customer_success: 'customer_success',
}

const TRAINING_TYPE_LABELS = {
  general: 'General Onboarding', sales: 'Sales & BD', engineering: 'Engineering & Dev',
  hr: 'HR & Admin', operations: 'Operations', management: 'Management', customer_success: 'Customer Success',
}

function getModsForEmp(emp, modules) {
  const tag = TRAINING_TYPE_MAP[emp?.training_type || 'general'] || 'all'
  return modules.filter(m => {
    if (!m.profile_tags?.length) return true
    if (m.profile_tags.includes('all')) return true
    return m.profile_tags.includes(tag)
  })
}

// ─── Hiring report ─────────────────────────────────────────────

function HiringReport({ allApps, jobs, jobId }) {
  const apps    = jobId === 'all' ? allApps : allApps.filter(a => a.job_id === jobId)
  const selJob  = jobs.find(j => j.id === jobId)

  const byStatus = PIPELINE.reduce((acc, s) => { acc[s.v] = apps.filter(a => a.status === s.v).length; return acc }, {})
  const maxVal   = Math.max(...Object.values(byStatus), 1)
  const aboveShortlist = apps.filter(a =>
    ['shortlisted','video_interview','manual_round','interview_scheduled','interview_done','offer_sent','hired'].includes(a.status)
  ).length

  return (
    <SectionCard title={selJob ? `Hiring — ${selJob.title}` : 'Hiring — All Job Posts'} icon={Briefcase} color="#4f46e5">
      <StatGrid cols={4} items={[
        ['Total Applications', apps.length,           '#4f46e5'],
        ['Shortlisted & Above', aboveShortlist,       '#7c3aed'],
        ['Hired',               byStatus['hired'],    'var(--success)'],
        ['Rejected',            byStatus['rejected'], 'var(--danger)'],
      ]} />

      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Pipeline Funnel</div>
      {apps.length === 0
        ? <EmptyNote text="No applications yet for this selection." />
        : PIPELINE.filter(s => byStatus[s.v] > 0).map(s => (
            <MiniBar key={s.v} label={s.l} value={byStatus[s.v]} max={maxVal} color={s.c} />
          ))
      }

      {/* Per-job summary when showing all */}
      {jobId === 'all' && jobs.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '1.25rem 0 10px' }}>
            Job-wise Breakdown
          </div>
          <table className="table">
            <thead>
              <tr><th>Job Title</th><th>Department</th><th>Location</th><th>Status</th><th>Applications</th><th>Hired</th></tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const ja = allApps.filter(a => a.job_id === job.id)
                return (
                  <tr key={job.id}>
                    <td style={{ fontWeight: 600 }}>{job.title}</td>
                    <td>{job.department}</td>
                    <td>{job.location}</td>
                    <td><span className={`badge badge-${job.status === 'active' ? 'success' : 'gray'}`}>{job.status}</span></td>
                    <td>{ja.length}</td>
                    <td><span style={{ fontWeight: 700, color: ja.filter(a => a.status === 'hired').length > 0 ? 'var(--success)' : 'var(--text-3)' }}>{ja.filter(a => a.status === 'hired').length}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Candidate list for specific job */}
      {jobId !== 'all' && apps.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '1.25rem 0 10px' }}>
            Candidate List
          </div>
          <table className="table">
            <thead>
              <tr><th>Candidate</th><th>Role</th><th>Email</th><th>Stage</th><th>AI Score</th></tr>
            </thead>
            <tbody>
              {apps.map(app => {
                const c   = app.candidates || {}
                const ps  = PIPELINE.find(p => p.v === app.status)
                return (
                  <tr key={app.id}>
                    <td style={{ fontWeight: 600 }}>{c.name || '—'}</td>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{c.role || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                    <td>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: `${ps?.c || '#94a3b8'}22`, color: ps?.c || '#94a3b8', fontWeight: 600 }}>
                        {ps?.l || app.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {app.screen_score != null
                        ? <span style={{ fontWeight: 700, color: app.screen_score >= 75 ? 'var(--success)' : app.screen_score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{app.screen_score}</span>
                        : <span style={{ color: 'var(--text-3)', fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </SectionCard>
  )
}

// ─── Training report ───────────────────────────────────────────

function TrainingReport({ employees, modules, empId }) {
  const selEmp  = employees.find(e => e.id === empId)
  const empMods = selEmp ? getModsForEmp(selEmp, modules) : []

  if (empId !== 'all' && selEmp) {
    return (
      <SectionCard title={`Training — ${selEmp.name}`} icon={GraduationCap} color="#7c3aed">
        {/* Employee details */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '1rem', background: 'var(--bg-2)', borderRadius: 8, marginBottom: '1.25rem' }}>
          <div className="avatar" style={{ width: 44, height: 44, fontSize: 15, flexShrink: 0 }}>
            {selEmp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{selEmp.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
              {selEmp.emp_id} · {selEmp.job_title || '—'} · {selEmp.department || '—'}
            </div>
            {selEmp.email && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{selEmp.email}</div>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>Training Track</div>
            <span className="badge badge-brand">{TRAINING_TYPE_LABELS[selEmp.training_type || 'general']}</span>
          </div>
        </div>

        <StatGrid cols={3} items={[
          ['Modules Assigned',  empMods.length,                           '#7c3aed'],
          ['Joined',            selEmp.date_of_joining ? new Date(selEmp.date_of_joining).toLocaleDateString('en-IN') : '—', '#2563eb'],
          ['Status',            selEmp.status,                            selEmp.status === 'active' ? 'var(--success)' : '#94a3b8'],
        ]} />

        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
          Assigned Modules ({empMods.length})
        </div>
        {empMods.length === 0
          ? <EmptyNote text="No modules assigned to this training track yet." />
          : (
            <table className="table">
              <thead><tr><th>#</th><th>Module Title</th><th>Type</th><th>Duration</th><th>Mandatory</th></tr></thead>
              <tbody>
                {empMods.map((m, i) => (
                  <tr key={m.id}>
                    <td style={{ color: 'var(--text-3)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{m.title}</td>
                    <td><span className={`badge badge-${m.type === 'video' ? 'brand' : 'gray'}`}>{m.type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.duration || '—'}</td>
                    <td>{m.is_mandatory ? <span className="badge badge-danger">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </SectionCard>
    )
  }

  // All employees view
  const deptMap = employees.reduce((acc, e) => { const d = e.department || 'Unassigned'; acc[d] = (acc[d] || 0) + 1; return acc }, {})
  const maxDept = Math.max(...Object.values(deptMap), 1)

  return (
    <SectionCard title="Training — All Employees" icon={GraduationCap} color="#7c3aed">
      <StatGrid cols={3} items={[
        ['Total Employees',   employees.length,                             '#7c3aed'],
        ['Active',            employees.filter(e => e.status === 'active').length, 'var(--success)'],
        ['Training Modules',  modules.length,                               '#2563eb'],
      ]} />

      {Object.keys(deptMap).length > 1 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>By Department</div>
          {Object.entries(deptMap).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
            <MiniBar key={d} label={d} value={n} max={maxDept} color="#7c3aed" />
          ))}
          <div style={{ height: 1, background: 'var(--border)', margin: '1.25rem 0' }} />
        </>
      )}

      {employees.length === 0
        ? <EmptyNote text="No employees in training yet." />
        : (
          <table className="table">
            <thead><tr><th>Name</th><th>Emp ID</th><th>Job Title</th><th>Department</th><th>Training Track</th><th>Joined</th><th>Status</th></tr></thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ fontWeight: 600 }}>{emp.name}</td>
                  <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-3)' }}>{emp.emp_id}</td>
                  <td>{emp.job_title || '—'}</td>
                  <td>{emp.department || '—'}</td>
                  <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{TRAINING_TYPE_LABELS[emp.training_type || 'general']}</span></td>
                  <td style={{ fontSize: 12 }}>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-IN') : '—'}</td>
                  <td><span className={`badge badge-${emp.status === 'active' ? 'success' : 'gray'}`}>{emp.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </SectionCard>
  )
}

// ─── Task Management report ────────────────────────────────────

function TasksReport({ tasks, employees, empId }) {
  const selEmp     = employees.find(e => e.id === empId)
  const empTasks   = empId === 'all' ? tasks : tasks.filter(t => t.profile_tags?.includes(empId))

  const byFreq     = ['daily','weekly','monthly','one-time'].map(f => ({
    f, l: { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', 'one-time': 'One-time' }[f],
    c: ['var(--brand)','#7c3aed','#059669','var(--warning)'][['daily','weekly','monthly','one-time'].indexOf(f)],
    n: empTasks.filter(t => t.frequency === f).length
  }))
  const byPriority = ['high','medium','low'].map(p => ({
    p, l: p.charAt(0).toUpperCase() + p.slice(1) + ' Priority',
    c: ['var(--danger)','var(--warning)','var(--success)'][['high','medium','low'].indexOf(p)],
    n: empTasks.filter(t => t.priority === p).length
  }))
  const maxF = Math.max(...byFreq.map(x => x.n), 1)
  const maxP = Math.max(...byPriority.map(x => x.n), 1)

  return (
    <SectionCard title={selEmp ? `Tasks — ${selEmp.name}` : 'Task Management — All'} icon={CheckSquare} color="#059669">
      {selEmp && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-2)', borderRadius: 8, marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
          <div className="avatar" style={{ width: 36, height: 36, fontSize: 12, flexShrink: 0 }}>
            {selEmp.name?.split(' ').map(w => w[0]).join('').slice(0, 2)}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{selEmp.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{selEmp.job_title} · {selEmp.department}</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#059669', fontFamily: 'var(--font-display)' }}>{empTasks.length}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>tasks assigned</div>
          </div>
        </div>
      )}

      {!selEmp && (
        <StatGrid cols={3} items={[
          ['Total Tasks',   tasks.length,                                    '#059669'],
          ['High Priority', tasks.filter(t => t.priority === 'high').length,  'var(--danger)'],
          ['Daily Tasks',   tasks.filter(t => t.frequency === 'daily').length, 'var(--brand)'],
        ]} />
      )}

      {empTasks.length === 0
        ? <EmptyNote text={selEmp ? `No tasks allocated to ${selEmp.name} yet.` : 'No tasks in the system yet.'} />
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>By Frequency</div>
                {byFreq.filter(x => x.n > 0).map(x => <MiniBar key={x.f} label={x.l} value={x.n} max={maxF} color={x.c} />)}
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>By Priority</div>
                {byPriority.filter(x => x.n > 0).map(x => <MiniBar key={x.p} label={x.l} value={x.n} max={maxP} color={x.c} />)}
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Task List</div>
            <table className="table">
              <thead><tr><th>Task</th><th>Frequency</th><th>Priority</th></tr></thead>
              <tbody>
                {empTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 500 }}>{t.title}</td>
                    <td><span className="badge badge-gray" style={{ fontSize: 10 }}>{t.frequency}</span></td>
                    <td><span className={`badge badge-${t.priority === 'high' ? 'danger' : t.priority === 'medium' ? 'warning' : 'gray'}`} style={{ fontSize: 10 }}>{t.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )
      }
    </SectionCard>
  )
}

// ─── CRM report ────────────────────────────────────────────────

function CRMReport({ leads }) {
  const byStatus = CRM_S.reduce((acc, s) => { acc[s.v] = leads.filter(l => l.status === s.v).length; return acc }, {})
  const maxVal   = Math.max(...Object.values(byStatus), 1)
  const conv     = byStatus['converted'] || 0
  const inter    = byStatus['interested'] || 0

  return (
    <SectionCard title="CRM & Leads" icon={Phone} color="#0891b2">
      <StatGrid cols={3} items={[
        ['Total Leads',  leads.length, '#0891b2'],
        ['Interested',   inter,        'var(--success)'],
        ['Converted',    conv,         'var(--brand)'],
      ]} />

      {leads.length === 0
        ? <EmptyNote text="No CRM leads yet." />
        : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Lead Status Breakdown</div>
            {CRM_S.filter(s => byStatus[s.v] > 0).map(s => (
              <MiniBar key={s.v} label={s.l} value={byStatus[s.v]} max={maxVal} color={s.c} />
            ))}
            <div style={{ display: 'flex', gap: 24, marginTop: 16, padding: '12px 16px', background: 'var(--bg-2)', borderRadius: 8, flexWrap: 'wrap', border: '1px solid var(--border)' }}>
              {[
                ['Conversion Rate', leads.length ? `${Math.round((conv / leads.length) * 100)}%` : '0%', 'var(--brand)'],
                ['Interest Rate',   leads.length ? `${Math.round(((inter + conv) / leads.length) * 100)}%` : '0%', 'var(--success)'],
                ['Not Interested',  byStatus['not_interested'] || 0, 'var(--danger)'],
              ].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: 'var(--font-display)' }}>{v}</div>
                </div>
              ))}
            </div>
          </>
        )
      }
    </SectionCard>
  )
}

// ─── Searchable Job Picker ─────────────────────────────────────

function SearchableJobPicker({ jobs, value, onChange }) {
  const [open,   setOpen]   = useState(false)
  const [query,  setQuery]  = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function onClickOut(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  const filtered = jobs.filter(j =>
    !query || `${j.title} ${j.department || ''} ${j.location || ''}`.toLowerCase().includes(query.toLowerCase())
  )
  const selJob = jobs.find(j => j.id === value)

  function pick(id) { onChange(id); setOpen(false); setQuery('') }

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 260 }}>
      {/* Trigger */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
        background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-1)',
        textAlign: 'left'
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selJob ? `${selJob.title}${selJob.department ? ` (${selJob.department})` : ''}` : 'Job Post'}
        </span>
        <ChevronRight size={13} style={{ flexShrink: 0, transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: 'var(--text-3)' }} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,.18)', overflow: 'hidden'
        }}>
          {/* Search input */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Search size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <input
              autoFocus
              placeholder="Search job title or department…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text-1)', width: '100%' }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)', display: 'flex' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Options list */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {/* "All" option */}
            <button onClick={() => pick('all')} style={{
              width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, cursor: 'pointer',
              background: value === 'all' ? 'var(--bg-2)' : 'transparent',
              border: 'none', color: value === 'all' ? 'var(--brand)' : 'var(--text-2)',
              fontWeight: value === 'all' ? 700 : 400, display: 'block'
            }}>
              Job Post
            </button>

            {filtered.length === 0 && (
              <div style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-3)' }}>No jobs match "{query}"</div>
            )}

            {filtered.map(j => (
              <button key={j.id} onClick={() => pick(j.id)} style={{
                width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                background: value === j.id ? 'var(--bg-2)' : 'transparent',
                border: 'none', color: value === j.id ? 'var(--brand)' : 'var(--text-1)',
                fontWeight: value === j.id ? 700 : 400, display: 'block', borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontWeight: value === j.id ? 700 : 500 }}>{j.title}</div>
                {(j.department || j.location) && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>
                    {[j.department, j.location].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────

const MODULES = [
  { v: 'complete',  l: 'Complete Report',  icon: BarChart2,     color: '#4f46e5' },
  { v: 'hiring',    l: 'Hiring',           icon: Briefcase,     color: '#4f46e5' },
  { v: 'training',  l: 'Training',         icon: GraduationCap, color: '#7c3aed' },
  { v: 'tasks',     l: 'Task Management',  icon: CheckSquare,   color: '#059669' },
  { v: 'crm',       l: 'CRM & Leads',      icon: Phone,         color: '#0891b2' },
]

export default function Reports() {
  const [mod,   setMod]   = useState('complete')
  const [jobId, setJobId] = useState('all')
  const [empId, setEmpId] = useState('all')

  const [jobs,      setJobs]      = useState([])
  const [allApps,   setAllApps]   = useState([])
  const [employees, setEmployees] = useState([])
  const [leads,     setLeads]     = useState([])
  const [tasks,     setTasks]     = useState([])
  const [modules,   setModules]   = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
      fetchJobs(), fetchAllApplications(), fetchEmployees(),
      fetchLeads(), fetchTasks(), fetchTrainingModules(),
    ]).then(([j, a, e, l, t, m]) => {
      setJobs(j); setAllApps(a); setEmployees(e)
      setLeads(l); setTasks(t); setModules(m)
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  function changeMod(newMod) {
    setMod(newMod)
    setJobId('all')
    setEmpId('all')
  }

  function exportCSV() {
    const lines  = []
    const label  = MODULES.find(m => m.v === mod)?.l || mod
    const selJob = jobs.find(j => j.id === jobId)
    const selEmp = employees.find(e => e.id === empId)
    lines.push(`TalentOS Report — ${label}${selJob ? ` / ${selJob.title}` : ''}${selEmp ? ` / ${selEmp.name}` : ''}`)
    lines.push(`Generated: ${new Date().toLocaleString()}`, '')

    const include = t => mod === 'complete' || mod === t

    if (include('hiring')) {
      const apps = jobId === 'all' ? allApps : allApps.filter(a => a.job_id === jobId)
      lines.push('=== HIRING ===', 'Status,Count')
      PIPELINE.forEach(s => { const n = apps.filter(a => a.status === s.v).length; if (n) lines.push(`"${s.l}",${n}`) })
      lines.push('')
    }
    if (include('training')) {
      lines.push('=== TRAINING ===', 'Name,Emp ID,Job Title,Department,Track,Joined,Status')
      const emps = empId === 'all' ? employees : employees.filter(e => e.id === empId)
      emps.forEach(e => lines.push(`"${e.name}",${e.emp_id},"${e.job_title || ''}","${e.department || ''}","${TRAINING_TYPE_LABELS[e.training_type || 'general']}",${e.date_of_joining || ''},${e.status}`))
      lines.push('')
    }
    if (include('tasks')) {
      const empTasks = empId === 'all' ? tasks : tasks.filter(t => t.profile_tags?.includes(empId))
      lines.push('=== TASKS ===', 'Task,Frequency,Priority')
      empTasks.forEach(t => lines.push(`"${t.title}",${t.frequency},${t.priority}`))
      lines.push('')
    }
    if (include('crm')) {
      lines.push('=== CRM ===', 'Status,Count')
      CRM_S.forEach(s => lines.push(`"${s.l}",${leads.filter(l => l.status === s.v).length}`))
      lines.push('')
    }

    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `talentos-report-${mod}-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="card" style={{ padding: '2rem', color: 'var(--text-3)' }}>Loading report data…</div>

  const activeMod = MODULES.find(m => m.v === mod)
  const selJob    = jobs.find(j => j.id === jobId)
  const selEmp    = employees.find(e => e.id === empId)

  // ── Breadcrumb label under the title ──
  const breadcrumb = [activeMod?.l]
  if (mod === 'hiring')            breadcrumb.push(selJob ? selJob.title : `All ${jobs.length} Job Posts (Consolidated)`)
  if (mod === 'training')          breadcrumb.push(selEmp ? selEmp.name : `All ${employees.length} Employees (Consolidated)`)
  if (mod === 'tasks')             breadcrumb.push(selEmp ? selEmp.name : `All Tasks (Consolidated)`)
  if (mod === 'crm')               breadcrumb.push('All Leads (Consolidated)')
  if (mod === 'complete')          breadcrumb.push('All Modules — Overall Summary')

  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Reports</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', margin: 0 }}>
            {breadcrumb.map((seg, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {i > 0 && <ChevronRight size={12} />}
                <span style={{ fontWeight: i === breadcrumb.length - 1 ? 600 : 400, color: i === breadcrumb.length - 1 ? 'var(--text-2)' : 'var(--text-3)' }}>{seg}</span>
              </span>
            ))}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* ── Module tab bar ── */}
      <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {MODULES.map(m => {
            const Icon   = m.icon
            const active = mod === m.v
            return (
              <button key={m.v} onClick={() => changeMod(m.v)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: active ? 700 : 500,
                  border: active ? `2px solid ${m.color}` : '1px solid var(--border)',
                  background: active ? `${m.color}18` : 'var(--bg)',
                  color: active ? m.color : 'var(--text-2)', cursor: 'pointer', transition: 'all .15s'
                }}>
                <Icon size={13} /> {m.l}
              </button>
            )
          })}
        </div>

        {/* ── Secondary drill-down filter (only for non-Complete tabs) ── */}
        {mod !== 'complete' && mod !== 'crm' && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>
              {mod === 'hiring' ? 'Job Post' : 'Employee'}
            </span>

            {/* Consolidated pill */}
            <button
              onClick={() => { setJobId('all'); setEmpId('all') }}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: (mod === 'hiring' ? jobId : empId) === 'all' ? '2px solid var(--brand)' : '1px solid var(--border)',
                background: (mod === 'hiring' ? jobId : empId) === 'all' ? 'rgba(99,102,241,0.1)' : 'var(--bg)',
                color: (mod === 'hiring' ? jobId : empId) === 'all' ? 'var(--brand)' : 'var(--text-2)',
                transition: 'all .15s'
              }}>
              Consolidated — {mod === 'hiring' ? `All ${jobs.length} JDs` : `All ${employees.length} Employees`}
            </button>

            {/* Specific item picker */}
            {mod === 'hiring' && (
              <SearchableJobPicker jobs={jobs} value={jobId} onChange={setJobId} />
            )}
            {(mod === 'training' || mod === 'tasks') && (
              <select value={empId} onChange={e => setEmpId(e.target.value)}
                style={{ fontSize: 13, padding: '7px 12px', minWidth: 220, borderRadius: 8 }}>
                <option value="all">Select a specific employee…</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.name}{e.job_title ? ` — ${e.job_title}` : ''}{e.emp_id ? ` (${e.emp_id})` : ''}</option>
                ))}
              </select>
            )}

            {/* Active chip */}
            {(selJob || (selEmp && mod !== 'complete')) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge badge-brand" style={{ fontSize: 12 }}>
                  {selJob?.title || selEmp?.name}
                </span>
                <button onClick={() => { setJobId('all'); setEmpId('all') }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)', display: 'flex', alignItems: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Complete Report: overall summary + all 4 modules ── */}
      {mod === 'complete' && (
        <>
          {/* Overall stat row — only here */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: '1.5rem' }}>
            {[
              ['Total Applications', allApps.length,                                   '#4f46e5', '📋'],
              ['Hired',              allApps.filter(a => a.status === 'hired').length,  'var(--success)', '✅'],
              ['In Training',        employees.length,                                  '#7c3aed', '🎓'],
              ['CRM Leads',          leads.length,                                      '#0891b2', '📞'],
            ].map(([l, v, c, icon]) => (
              <div key={l} className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-display)', color: c }}>{v}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{icon} {l}</div>
              </div>
            ))}
          </div>
          <HiringReport  allApps={allApps} jobs={jobs} jobId="all" />
          <TrainingReport employees={employees} modules={modules} empId="all" />
          <TasksReport   tasks={tasks} employees={employees} empId="all" />
          <CRMReport     leads={leads} />
        </>
      )}

      {/* ── Single-section reports ── */}
      {mod === 'hiring'   && <HiringReport  allApps={allApps} jobs={jobs} jobId={jobId} />}
      {mod === 'training' && <TrainingReport employees={employees} modules={modules} empId={empId} />}
      {mod === 'tasks'    && <TasksReport   tasks={tasks} employees={employees} empId={empId} />}
      {mod === 'crm'      && <CRMReport     leads={leads} />}
    </div>
  )
}
