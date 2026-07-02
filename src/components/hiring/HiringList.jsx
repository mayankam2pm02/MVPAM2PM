import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { fetchJobs } from '../../lib/supabase.js'
import { Plus, Briefcase, MapPin } from 'lucide-react'

export default function HiringList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs().then(setJobs).catch(console.error).finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'1.5rem' }}>
        <div className="page-header" style={{ marginBottom:0 }}>
          <h1>Hiring pipeline</h1>
          <p>{jobs.length} job{jobs.length!==1?'s':''} posted</p>
        </div>
        {['hr','admin'].includes(user?.role) && (
          <button className="btn btn-primary" onClick={() => navigate('/hiring/new')}><Plus size={15} /> Post new job</button>
        )}
      </div>
      {loading ? <div className="card" style={{color:'var(--text-3)'}}>Loading jobs…</div> :
      jobs.length === 0 ? (
        <div className="card empty-state">
          <div className="icon"><Briefcase size={36} /></div>
          <h3>No jobs posted yet</h3>
          <p>Create your first job posting to start hiring.</p>
          <button className="btn btn-primary" style={{marginTop:'1rem'}} onClick={()=>navigate('/hiring/new')}><Plus size={15}/> Post a job</button>
        </div>
      ) : jobs.map(job => (
        <div key={job.id} className="card" onClick={()=>navigate(`/hiring/${job.id}`)} style={{marginBottom:10,padding:'1.25rem 1.5rem',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                <h2 style={{fontSize:15,fontWeight:700}}>{job.title}</h2>
                <span className={`badge badge-${job.status==='active'?'success':'gray'}`}>{job.status}</span>
              </div>
              <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:12,color:'var(--text-3)'}}>
                <span><Briefcase size={11} style={{display:'inline',marginRight:4}}/>{job.department}</span>
                <span><MapPin size={11} style={{display:'inline',marginRight:4}}/>{job.location}</span>
                <span>💰 {job.salary}</span>
                <span>🗓 {job.created_at?.slice(0,10)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
