import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchJobs, fetchCandidates } from '../lib/supabase.js'
import { Briefcase, Users, CheckCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react'

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs]           = useState([])
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    Promise.all([fetchJobs(), fetchCandidates()])
      .then(([j, c]) => { setJobs(j); setCandidates(c) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const activeJobs = jobs.filter(j => j.status === 'active').length

  const stats = [
    { label: 'Active job postings', value: activeJobs,          icon: Briefcase,    color: 'var(--brand)',   bg: 'var(--brand-light)' },
    { label: 'Candidates in DB',    value: candidates.length,   icon: Users,        color: 'var(--success)', bg: 'var(--success-bg)'  },
    { label: 'Open roles',          value: jobs.length,         icon: TrendingUp,   color: 'var(--info)',    bg: 'var(--info-bg)'     },
    { label: 'Departments hiring',  value: [...new Set(jobs.map(j => j.department))].length, icon: CheckCircle, color: 'var(--purple)', bg: 'var(--purple-bg)' },
  ]

  return (
    <div>
      <div className="page-header">
        <h1>Good day, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's your hiring pipeline snapshot.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 30, fontWeight: 800, fontFamily: 'var(--font-display)', color }}>{loading ? '—' : value}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{label}</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: '1rem' }}>Quick actions</h2>
          {['hr','admin'].includes(user?.role) && (
            <button className="btn btn-secondary" onClick={() => navigate('/hiring/new')} style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
              Post a new job <ArrowRight size={14} />
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/candidates')} style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
            View candidate database <ArrowRight size={14} />
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/hiring')} style={{ width: '100%', justifyContent: 'space-between' }}>
            View hiring pipeline <ArrowRight size={14} />
          </button>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, marginBottom: '1rem' }}>Recent job postings</h2>
          {loading ? <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div> :
          jobs.length === 0 ? <div className="empty-state" style={{ padding: '1.5rem 0' }}><p>No jobs posted yet</p></div> :
          jobs.slice(0,4).map(job => (
            <div key={job.id} onClick={() => navigate(`/hiring/${job.id}`)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', cursor: 'pointer', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{job.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{job.department} · {job.location}</div>
              </div>
              <span className={`badge badge-${job.status === 'active' ? 'success' : 'gray'}`}>{job.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
