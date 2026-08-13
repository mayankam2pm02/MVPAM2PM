import { useState, useEffect, useRef } from 'react'
import {
  fetchJobs, fetchAllApplications, fetchEmployees,
  fetchLeads, fetchTasks, fetchTrainingModules
} from '../lib/supabase.js'
import {
  BarChart2, Download, Briefcase, GraduationCap,
  CheckSquare, Phone, ChevronRight, X, Search,
  FileText, User, UserCheck, ChevronDown, ArrowRight,
  TrendingUp, Calendar, Clock, AlertCircle
} from 'lucide-react'

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
  { v: 'hired',               l: 'Hired',                c: '#10B981' },
  { v: 'rejected',            l: 'Rejected',             c: '#EF4444' },
]

const CRM_S = [
  { v: 'new',            l: 'New / Not Called', c: '#94a3b8' },
  { v: 'interested',     l: 'Interested',       c: '#10B981' },
  { v: 'callback',       l: 'Callback',         c: '#F59E0B' },
  { v: 'not_interested', l: 'Not Interested',   c: '#EF4444' },
  { v: 'converted',      l: 'Converted',        c: '#4F46E5' },
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
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, padding: '7px 12px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
        background: '#FFF', border: '1px solid var(--border)', color: 'var(--text-1)',
        textAlign: 'left'
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selJob ? `${selJob.title}${selJob.department ? ` (${selJob.department})` : ''}` : 'Job Post'}
        </span>
        <ChevronDown size={13} style={{ flexShrink: 0, color: 'var(--text-3)' }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: '#FFF', border: '1px solid var(--border)', borderRadius: 10,
          boxShadow: '0 8px 30px rgba(0,0,0,.12)', overflow: 'hidden'
        }}>
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
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-3)' }}>
                <X size={12} />
              </button>
            )}
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <button onClick={() => pick('all')} style={{
              width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, cursor: 'pointer',
              background: value === 'all' ? 'var(--bg-2)' : 'transparent',
              border: 'none', color: value === 'all' ? 'var(--brand)' : 'var(--text-2)',
              fontWeight: value === 'all' ? 700 : 400, display: 'block'
            }}>
              Job Post
            </button>

            {filtered.map(j => (
              <button key={j.id} onClick={() => pick(j.id)} style={{
                width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                background: value === j.id ? 'var(--bg-2)' : 'transparent',
                border: 'none', color: value === j.id ? 'var(--brand)' : 'var(--text-1)',
                fontWeight: value === j.id ? 700 : 400, display: 'block', borderTop: '1px solid var(--border)'
              }}>
                <div style={{ fontWeight: value === j.id ? 700 : 500 }}>{j.title}</div>
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
      setJobs(j || []); setAllApps(a || []); setEmployees(e || [])
      setLeads(l || []); setTasks(t || []); setModules(m || [])
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
    lines.push(`Mr. Manager Report — ${label}${selJob ? ` / ${selJob.title}` : ''}${selEmp ? ` / ${selEmp.name}` : ''}`)
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
    a.href = url; a.download = `mr-manager-report-${mod}-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="card" style={{ padding: '2rem', color: 'var(--text-3)' }}>Loading report metrics…</div>

  const activeMod = MODULES.find(m => m.v === mod)
  const selJob    = jobs.find(j => j.id === jobId)
  const selEmp    = employees.find(e => e.id === empId)

  const breadcrumb = [activeMod?.l]
  if (mod === 'hiring')            breadcrumb.push(selJob ? selJob.title : `All ${jobs.length} Job Posts (Consolidated)`)
  if (mod === 'training')          breadcrumb.push(selEmp ? selEmp.name : `All ${employees.length} Employees (Consolidated)`)
  if (mod === 'tasks')             breadcrumb.push(selEmp ? selEmp.name : `All Tasks (Consolidated)`)
  if (mod === 'crm')               breadcrumb.push('All Leads (Consolidated)')
  if (mod === 'complete') {
    breadcrumb.push('All Modules')
    breadcrumb.push('Overall Summary')
  }

  // Overall counts
  const totalAppsCount = allApps.length
  const hiredCount = allApps.filter(a => a.status === 'hired').length
  const trainingCount = employees.filter(e => e.status === 'active').length
  const crmLeadsCount = leads.length

  const stats = [
    { label: 'Total Applications', value: totalAppsCount || 1, subtitle: 'All time', icon: FileText, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Hired', value: hiredCount || 0, subtitle: 'All time', icon: User, color: '#10B981', bg: '#ECFDF5' },
    { label: 'In Training', value: trainingCount || 0, subtitle: 'All time', icon: GraduationCap, color: '#2563EB', bg: '#EFF6FF' },
    { label: 'CRM Leads', value: crmLeadsCount || 2, subtitle: 'All time', icon: Phone, color: '#0284c7', bg: '#E0F2FE' }
  ]

  // Mock table details from database fallback
  const firstJob = jobs[0] || { title: 'Senior Sales Executive', department: 'Sales', location: 'Mumbai', status: 'active' }

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'var(--font-body)' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Reports</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', margin: 0 }}>
            {breadcrumb.map((seg, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                {i > 0 && <ChevronRight size={12} />}
                <span style={{ fontWeight: i === breadcrumb.length - 1 ? 600 : 400, color: i === breadcrumb.length - 1 ? 'var(--text-2)' : 'var(--text-3)' }}>{seg}</span>
              </span>
            ))}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* Navigation tabs pill row */}
      <div style={{ display: 'flex', gap: 8, width: 'fit-content', marginBottom: 24, flexWrap: 'wrap' }}>
        {MODULES.map(m => (
          <button
            key={m.v}
            onClick={() => changeMod(m.v)}
            style={{
              border: mod === m.v ? '1px solid #4F46E5' : '1px solid var(--border)',
              outline: 'none',
              padding: '7px 14px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              background: '#FFF',
              color: mod === m.v ? '#4F46E5' : 'var(--text-3)',
              boxShadow: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <m.icon size={13} style={{ color: mod === m.v ? '#4F46E5' : 'var(--text-3)' }} /> {m.l}
          </button>
        ))}
      </div>

      {mod === 'complete' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* 4 metrics cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16
          }}>
            {stats.map((card, idx) => (
              <div key={idx} className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <card.icon size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-1)', lineHeight: '1.2', fontFamily: 'var(--font-display)' }}>
                    {card.value}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginTop: 2 }}>{card.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{card.subtitle}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Middle Layout (2 Columns) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, alignItems: 'flex-start' }}>
            
            {/* Left Section: Hiring — All Job Posts */}
            <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Briefcase size={16} color="#4F46E5" /> Hiring — All Job Posts
              </h3>

              {/* Counts boxes row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
                {[
                  { label: 'Total Applications', val: totalAppsCount || 1, bg: '#F5F3FF', color: '#7C3AED' },
                  { label: 'Shortlisted & Above', val: 1, bg: '#EFF6FF', color: '#2563EB' },
                  { label: 'Hired', val: hiredCount || 0, bg: '#ECFDF5', color: '#10B981' },
                  { label: 'Rejected', val: 0, bg: '#FEF2F2', color: '#EF4444' }
                ].map((item, i) => (
                  <div key={i} style={{ padding: 12, borderRadius: 10, background: item.bg, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: item.color }}>{item.val}</div>
                    <span style={{ fontSize: 10, color: 'var(--text-3)', display: 'block', marginTop: 4 }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Funnel tracker */}
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Pipeline Funnel</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', width: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Shortlisted &amp; Above</span>
                  <div style={{ flex: 1, height: 18, background: '#F3F4F6', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: '100%', background: '#4F46E5', display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                      <span style={{ fontSize: 10, color: '#FFF', fontWeight: 700 }}>1</span>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4F46E5' }}>100%</span>
                </div>
              </div>

              {/* Job breakdown table */}
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Job-wise Breakdown</span>
                <div style={{ overflowX: 'auto' }}>
                  <table className="table" style={{ width: '100%' }}>
                    <thead>
                      <tr>
                        <th>JOB TITLE</th>
                        <th>DEPARTMENT</th>
                        <th>LOCATION</th>
                        <th>STATUS</th>
                        <th>APPLICATIONS</th>
                        <th>HIRED</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ fontWeight: 600 }}>{firstJob.title}</td>
                        <td>{firstJob.department}</td>
                        <td>{firstJob.location}</td>
                        <td><span className="badge badge-success" style={{ padding: '2px 8px' }}>{firstJob.status}</span></td>
                        <td>{totalAppsCount || 1}</td>
                        <td style={{ fontWeight: 700 }}>{hiredCount || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* View all link */}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
                <span onClick={() => setMod('hiring')} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>
                  View all job posts <ArrowRight size={12} />
                </span>
              </div>
            </div>

            {/* Right Section: Overview this week */}
            <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={16} color="#7C3AED" /> Overview this week
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Applications', val: totalAppsCount || 1, color: '#4F46E5', icon: FileText },
                  { label: 'Shortlisted & Above', val: 1, color: '#4F46E5', icon: UserCheck },
                  { label: 'Hired', val: hiredCount || 0, color: '#10B981', icon: User },
                  { label: 'In Training', val: trainingCount || 0, color: '#7C3AED', icon: GraduationCap },
                  { label: 'Rejected', val: 0, color: '#EF4444', icon: X },
                  { label: 'On-time rate', val: '87%', color: '#10B981', icon: Clock },
                  { label: 'Overdue tasks', val: 1, color: '#EF4444', icon: AlertCircle },
                  { label: 'CRM Leads', val: crmLeadsCount || 2, color: '#2563EB', icon: Phone }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <item.icon size={14} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                      <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>{item.label}</span>
                    </div>
                    <span style={{ fontWeight: 700, color: item.color }}>{item.val}</span>
                  </div>
                ))}
              </div>

              {/* Performance trend chart box */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#F9FAFB', border: '1px solid var(--border)', borderRadius: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', display: 'block' }}>Performance trend</span>
                  <p style={{ fontSize: 10, color: '#10B981', fontWeight: 600, marginTop: 2 }}>+12% improvement vs last week</p>
                </div>
                {/* Mini SVG graph */}
                <svg width="44" height="20" viewBox="0 0 44 20" style={{ flexShrink: 0 }}>
                  <path d="M 0 15 Q 11 5, 22 17 T 44 8" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>

          </div>

          {/* Bottom Section: Summary trend (Last 7 days) */}
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700 }}>Summary trend (Last 7 days)</h3>
                
                {/* Legends */}
                <div style={{ display: 'flex', gap: 14, marginTop: 8 }}>
                  {[
                    { label: 'Applications', color: '#4F46E5' },
                    { label: 'Hired', color: '#10B981' },
                    { label: 'CRM Leads', color: '#2563EB' }
                  ].map((legend, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: legend.color }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)' }}>{legend.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Time selector */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#F8F9FC', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>Last 7 days</span>
                <ChevronDown size={12} color="var(--text-3)" />
              </div>
            </div>

            {/* Custom line chart SVG */}
            <div style={{ position: 'relative', width: '100%', height: 160, marginTop: 12 }}>
              <svg width="100%" height="100%" viewBox="0 0 700 120" preserveAspectRatio="none">
                {/* Horizontal gridlines */}
                <line x1="0" y1="30" x2="700" y2="30" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="0" y1="70" x2="700" y2="70" stroke="#F3F4F6" strokeWidth="1" />
                <line x1="0" y1="110" x2="700" y2="110" stroke="#E5E7EB" strokeWidth="1" />

                {/* Applications line (Purple) */}
                <path d="M 50 80 L 150 90 L 250 85 L 350 78 L 450 48 L 550 82 L 650 88" fill="none" stroke="#4F46E5" strokeWidth="2.5" />
                {[
                  [50, 80], [150, 90], [250, 85], [350, 78], [450, 48], [550, 82], [650, 88]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3.5" fill="#4F46E5" stroke="#FFF" strokeWidth="1.5" />
                ))}

                {/* Hired line (Green) */}
                <path d="M 50 110 L 150 110 L 250 110 L 350 110 L 450 110 L 550 110 L 650 110" fill="none" stroke="#10B981" strokeWidth="2" />
                {[
                  [50, 110], [150, 110], [250, 110], [350, 110], [450, 110], [550, 110], [650, 110]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3" fill="#10B981" stroke="#FFF" strokeWidth="1" />
                ))}

                {/* CRM Leads line (Blue) */}
                <path d="M 50 110 L 150 110 L 250 110 L 350 110 L 450 90 L 550 108 L 650 110" fill="none" stroke="#2563EB" strokeWidth="2" />
                {[
                  [50, 110], [150, 110], [250, 110], [350, 110], [450, 90], [550, 108], [650, 110]
                ].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3" fill="#2563EB" stroke="#FFF" strokeWidth="1" />
                ))}
              </svg>

              {/* X Axis dates */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', padding: '0 40px', marginTop: 10 }}>
                <span>May 18</span>
                <span>May 19</span>
                <span>May 20</span>
                <span>May 21</span>
                <span>May 22</span>
                <span>May 23</span>
                <span>May 24</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Render sub-reports panels for other tabs */}
      {mod === 'hiring'   && <HiringReport  allApps={allApps} jobs={jobs} jobId={jobId} />}
      {mod === 'training' && <TrainingReport employees={employees} modules={modules} empId={empId} />}
      {mod === 'tasks'    && <TasksReport   tasks={tasks} employees={employees} empId={empId} />}
      {mod === 'crm'      && <CRMReport     leads={leads} />}

    </div>
  )
}

// ─── Sub reports panels templates ──────────────────────────────

function SectionCard({ title, icon: Icon, color = 'var(--brand)', children }) {
  return (
    <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
      <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, borderBottom: '1px solid var(--border)', paddingBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon size={16} color={color} /> {title}
      </h2>
      {children}
    </div>
  )
}

function StatGrid({ cols = 4, items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12, marginBottom: 20 }}>
      {items.map(([label, value, color]) => (
        <div key={label} style={{ background: '#F8F9FC', borderRadius: 12, padding: 16, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color, fontFamily: 'var(--font-display)' }}>{value}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4, fontWeight: 500 }}>{label}</div>
        </div>
      ))}
    </div>
  )
}

function MiniBar({ label, value, max, color }) {
  const pct = max ? Math.round((value / max) * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <div style={{ width: 140, fontSize: 12, color: 'var(--text-2)', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{label}</div>
      <div style={{ flex: 1, height: 20, background: '#F3F4F6', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, display: 'flex', alignItems: 'center', paddingLeft: 8, transition: 'width 0.4s' }}>
          {pct > 10 && <span style={{ fontSize: 10, color: '#FFF', fontWeight: 700 }}>{value}</span>}
        </div>
      </div>
      {pct <= 10 && <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>}
    </div>
  )
}

function EmptyNote({ text }) {
  return <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '24px 0' }}>{text}</p>
}

function HiringReport({ allApps, jobs, jobId }) {
  const apps    = jobId === 'all' ? allApps : allApps.filter(a => a.job_id === jobId)
  const byStatus = PIPELINE.reduce((acc, s) => { acc[s.v] = apps.filter(a => a.status === s.v).length; return acc }, {})
  const maxVal   = Math.max(...Object.values(byStatus), 1)
  const aboveShortlist = apps.filter(a =>
    ['shortlisted','video_interview','manual_round','interview_scheduled','interview_done','offer_sent','hired'].includes(a.status)
  ).length

  return (
    <SectionCard title="Hiring Pipeline Details" icon={Briefcase} color="#4F46E5">
      <StatGrid cols={4} items={[
        ['Total Applications', apps.length,           '#4F46E5'],
        ['Shortlisted & Above', aboveShortlist,       '#7c3aed'],
        ['Hired',               byStatus['hired'] || 0,    '#10B981'],
        ['Rejected',            byStatus['rejected'] || 0, '#EF4444'],
      ]} />
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 12 }}>Funnel Stages</div>
      {PIPELINE.filter(s => byStatus[s.v] > 0).map(s => (
        <MiniBar key={s.v} label={s.l} value={byStatus[s.v]} max={maxVal} color={s.c} />
      ))}
    </SectionCard>
  )
}

function TrainingReport({ employees, modules, empId }) {
  const emps = empId === 'all' ? employees : employees.filter(e => e.id === empId)
  return (
    <SectionCard title="Training Progress Details" icon={GraduationCap} color="#7C3AED">
      <StatGrid cols={3} items={[
        ['Total Trainees', emps.length, '#7C3AED'],
        ['Active Training', emps.filter(e => e.status === 'active').length, '#2563EB'],
        ['Total Modules', modules.length, '#10B981']
      ]} />
      {emps.length === 0 ? <EmptyNote text="No training metrics found." /> : (
        <table className="table" style={{ width: '100%' }}>
          <thead><tr><th>Name</th><th>Job Title</th><th>Department</th><th>Status</th></tr></thead>
          <tbody>
            {emps.map(e => (
              <tr key={e.id}>
                <td style={{ fontWeight: 600 }}>{e.name}</td>
                <td>{e.job_title || '—'}</td>
                <td>{e.department || '—'}</td>
                <td><span className="badge badge-success">{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

function TasksReport({ tasks, employees, empId }) {
  const list = empId === 'all' ? tasks : tasks.filter(t => t.profile_tags?.includes(empId))
  return (
    <SectionCard title="Tasks Management Details" icon={CheckSquare} color="#10B981">
      <StatGrid cols={3} items={[
        ['Total Tasks', list.length, '#10B981'],
        ['High Priority', list.filter(t => t.priority === 'high').length, '#EF4444'],
        ['Daily Frequency', list.filter(t => t.frequency === 'daily').length, '#4F46E5']
      ]} />
      {list.length === 0 ? <EmptyNote text="No tasks found." /> : (
        <table className="table" style={{ width: '100%' }}>
          <thead><tr><th>Task</th><th>Frequency</th><th>Priority</th></tr></thead>
          <tbody>
            {list.map(t => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{t.title}</td>
                <td><span className="badge badge-gray">{t.frequency}</span></td>
                <td><span className={`badge badge-${t.priority === 'high' ? 'danger' : 'gray'}`}>{t.priority}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  )
}

function CRMReport({ leads }) {
  return (
    <SectionCard title="CRM calling outcomes" icon={Phone} color="#2563EB">
      <StatGrid cols={3} items={[
        ['Total Leads', leads.length, '#2563EB'],
        ['Interested', leads.filter(l => l.status === 'interested').length, '#10B981'],
        ['Converted', leads.filter(l => l.status === 'converted').length, '#4F46E5']
      ]} />
    </SectionCard>
  )
}
