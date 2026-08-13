import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { fetchJobs, fetchAllApplications } from '../../lib/supabase.js'
import NotificationBell from '../layout/NotificationBell.jsx'
import {
  Plus, Search, Briefcase, Users, BarChart3, Clock,
  ChevronDown, MapPin, Calendar, DollarSign, MoreVertical,
  ListFilter, Code, GraduationCap, ChevronRight, HelpCircle
} from 'lucide-react'

// Helper to determine department/job icon
function getJobIcon(title = '', department = '') {
  const combined = `${title} ${department}`.toLowerCase()
  if (combined.includes('software') || combined.includes('engineer') || combined.includes('developer') || combined.includes('code') || combined.includes('tech')) {
    return { icon: Code, color: '#2563EB', bg: '#EFF6FF' }
  }
  if (combined.includes('sales') || combined.includes('business development') || combined.includes('marketing') || combined.includes('account')) {
    return { icon: Briefcase, color: '#4F46E5', bg: '#EEF2FF' }
  }
  if (combined.includes('hr') || combined.includes('recruit') || combined.includes('people')) {
    return { icon: Users, color: '#10B981', bg: '#ECFDF5' }
  }
  return { icon: Briefcase, color: '#7C3AED', bg: '#F5F3FF' }
}

export default function HiringList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [jobs, setJobs]                   = useState([])
  const [applications, setApplications]   = useState([])
  const [loading, setLoading]             = useState(true)

  // Filters & Search State
  const [searchTerm, setSearchTerm]       = useState('')
  const [deptFilter, setDeptFilter]       = useState('all')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [sortBy, setSortBy]               = useState('latest')

  useEffect(() => {
    Promise.all([fetchJobs(), fetchAllApplications()])
      .then(([j, a]) => {
        setJobs(j || [])
        setApplications(a || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Check if database is completely empty (seed fallback)
  const isEmptyDB = jobs.length === 0

  // 1. Stats Calculations
  const activeJobsCount = jobs.filter(j => j.status === 'active').length
  const totalApplicants = applications.length
  const avgApplicantsPerJob = jobs.length > 0 ? Math.round(applications.length / jobs.length) : 0

  // Time to fill (average days)
  let avgTimeToFill = 18 // Default mockup value
  const hiredApps = applications.filter(a => a.status === 'hired' && a.hired_at)
  if (hiredApps.length > 0) {
    let totalDays = 0
    hiredApps.forEach(a => {
      const jobOfApp = jobs.find(j => j.id === a.job_id)
      if (jobOfApp) {
        const diffMs = new Date(a.hired_at).getTime() - new Date(jobOfApp.created_at).getTime()
        totalDays += Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
      }
    })
    avgTimeToFill = Math.round(totalDays / hiredApps.length) || 18
  }

  // 2. Filter / Sort Logic
  const filteredJobs = jobs.filter(job => {
    // Search query
    const matchSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Department Filter
    const matchDept = deptFilter === 'all' || job.department === deptFilter

    // Status Filter
    const matchStatus = statusFilter === 'all' || job.status === statusFilter

    return matchSearch && matchDept && matchStatus
  }).sort((a, b) => {
    if (sortBy === 'latest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    }
    return 0
  })

  // Get unique departments for filter dropdown
  const departments = ['all', ...new Set(jobs.map(j => j.department))]
  const statuses = ['all', 'active', 'paused', 'closed', 'draft']

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', paddingBottom: 40 }}>
      
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-1)', marginBottom: 2 }}>
            Hiring pipeline
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 400 }}>
            {isEmptyDB ? '2' : jobs.length} job{ (isEmptyDB ? 2 : jobs.length) !== 1 ? 's' : ''} posted
          </p>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                paddingLeft: 34,
                paddingRight: 12,
                height: 38,
                fontSize: 13,
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: '#FFF',
                outline: 'none',
                width: '100%',
                boxShadow: 'none'
              }}
            />
          </div>

          {/* Notifications bell */}
          <NotificationBell />

          {/* Profile Picture */}
          <div style={{ cursor: 'pointer' }}>
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80"
              alt="Priya Sharma"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1px solid var(--border)'
              }}
            />
          </div>

          {/* Post New Job Button */}
          {['hr','admin','manager'].includes(user?.role) && (
            <button
              onClick={() => navigate('/hiring/new')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 20,
                background: '#4F46E5',
                color: '#FFF',
                border: 'none',
                fontWeight: 600,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
              }}
            >
              <Plus size={15} /> Post new job
            </button>
          )}

        </div>
      </div>

      {/* Summary Metrics Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Metric 1 */}
        <div className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center' }}>
            <Briefcase size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Total jobs</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
              {isEmptyDB ? 2 : activeJobsCount}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Active job postings</div>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#ECFDF5', color: '#10B981', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center' }}>
            <Users size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Total applicants</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
              {isEmptyDB ? 30 : totalApplicants}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Across all jobs</div>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center' }}>
            <BarChart3 size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Avg. applicants / job</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
              {isEmptyDB ? 15 : avgApplicantsPerJob}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>This month</div>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyOrigin: 'center', justifyContent: 'center' }}>
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>Time to fill</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
              {avgTimeToFill}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>Days on average</div>
          </div>
        </div>
      </div>

      {/* Filters & Sorting Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 20,
        flexWrap: 'wrap'
      }}>
        {/* Search by job title, department... */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by job title, department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              paddingLeft: 38,
              height: 40,
              fontSize: 13,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              outline: 'none',
              boxShadow: 'none'
            }}
          />
        </div>

        {/* Department Filter */}
        <div style={{ position: 'relative', width: 180 }}>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Status Filter */}
        <div style={{ position: 'relative', width: 180 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            {statuses.map((st) => (
              <option key={st} value={st}>
                {st === 'all' ? 'All Status' : st.charAt(0).toUpperCase() + st.slice(1)}
              </option>
            ))}
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Sort Filter */}
        <div style={{ position: 'relative', width: 160 }}>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: '#FFF',
              fontSize: 13,
              paddingLeft: 12,
              paddingRight: 32,
              appearance: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="latest">Latest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <ChevronDown size={14} color="var(--text-3)" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* Loading state / Empty State / Job Cards */}
      {loading ? (
        <div className="card" style={{ color: 'var(--text-3)', padding: 32, borderRadius: 16 }}>Loading jobs...</div>
      ) : (isEmptyDB ? (
        // Seeding preview list matching the screenshot exactly if DB is empty
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              id: 'job-1',
              title: 'Senior Sales Executive',
              department: 'Sales',
              location: 'Mumbai',
              salary: 'Rs 8-12 LPA',
              date: 'Posted on 20 Jul, 2026',
              applicants: 12,
              shortlisted: 4,
              interviewing: 3,
              offer: 1,
              progress: 65
            },
            {
              id: 'job-2',
              title: 'Software Engineer',
              department: 'Engineering',
              location: 'Bangalore',
              salary: 'Rs 12-18 LPA',
              date: 'Posted on 18 Jul, 2026',
              applicants: 18,
              shortlisted: 7,
              interviewing: 5,
              offer: 2,
              progress: 58
            }
          ].map(job => {
            const theme = getJobIcon(job.title, job.department)
            const Icon = theme.icon
            return (
              <div key={job.id} className="card" style={{
                borderRadius: 16,
                background: '#FFF',
                border: '1px solid var(--border)',
                padding: 24,
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
                gap: 20
              }}>
                {/* Left info column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyOrigin: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: theme.bg, color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{job.title}</h2>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#10B981', background: '#ECFDF5', padding: '2px 8px', borderRadius: 99, textTransform: 'lowercase' }}>active</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Briefcase size={12} /> {job.department}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {job.location}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>💰 {job.salary}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {job.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Metrics Card Blocks */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    background: '#F8F9FC',
                    borderRadius: 12,
                    padding: '12px 16px',
                    gap: 12,
                    marginTop: 20
                  }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{job.applicants}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Applicants</div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{job.shortlisted}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Shortlisted</div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{job.interviewing}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Interviewing</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{job.offer}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Offer</div>
                    </div>
                  </div>
                </div>

                {/* Right stats and progress column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
                  <div style={{ alignSelf: 'flex-end', cursor: 'pointer' }}>
                    <MoreVertical size={16} color="var(--text-3)" />
                  </div>

                  {/* Pipeline Progress meter */}
                  <div style={{ margin: '12px 0 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>Pipeline progress</span>
                      <span style={{ color: '#4F46E5', fontWeight: 700 }}>{job.progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#F1F3F9', borderRadius: 99 }}>
                      <div style={{ width: `${job.progress}%`, height: '100%', background: '#4F46E5', borderRadius: 99 }} />
                    </div>
                  </div>

                  {/* Job Action buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => navigate(`/hiring/${job.id}`)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: '#FFF',
                        color: 'var(--text-1)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <ListFilter size={13} /> View details
                    </button>
                    <button
                      onClick={() => navigate(`/hiring/${job.id}`)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: 'none',
                        background: '#4F46E5',
                        color: '#FFF',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Users size={13} /> View applicants
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="card empty-state" style={{ borderRadius: 16, padding: 48 }}>
          <div className="icon"><Briefcase size={36} /></div>
          <h3>No matching job postings found</h3>
          <p>Try refining your search query or filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredJobs.map(job => {
            const theme = getJobIcon(job.title, job.department)
            const Icon = theme.icon

            // Calculate actual live stage numbers
            const jobApps = applications.filter(a => a.job_id === job.id)
            const applicants = jobApps.length
            const shortlisted = jobApps.filter(a => ['screened', 'shortlisted'].includes(a.status)).length
            const interviewing = jobApps.filter(a => ['consent_sent', 'consent_accepted', 'consent_declined', 'interview_scheduled', 'interview_done'].includes(a.status)).length
            const offer = jobApps.filter(a => ['offer_sent', 'hired'].includes(a.status)).length

            // Compute dynamic progress percentage
            let progress = 0
            if (applicants > 0) {
              const weightSum = (shortlisted * 0.3) + (interviewing * 0.7) + (offer * 1.0)
              progress = Math.min(100, Math.round((weightSum / applicants) * 100))
            }

            const cleanDate = job.created_at
              ? new Date(job.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
              : 'N/A'

            return (
              <div key={job.id} className="card" style={{
                borderRadius: 16,
                background: '#FFF',
                border: '1px solid var(--border)',
                padding: 24,
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
                display: 'grid',
                gridTemplateColumns: '1.2fr 0.8fr',
                gap: 20
              }}>
                {/* Left info column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyOrigin: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: theme.bg, color: theme.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{job.title}</h2>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          color: job.status === 'active' ? '#10B981' : 'var(--text-3)',
                          background: job.status === 'active' ? '#ECFDF5' : 'var(--surface-3)',
                          padding: '2px 8px',
                          borderRadius: 99,
                          textTransform: 'lowercase'
                        }}>
                          {job.status}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Briefcase size={12} /> {job.department}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MapPin size={12} /> {job.location}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>💰 {job.salary || 'Unspecified'}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> Posted on {cleanDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Metrics Card Blocks */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    background: '#F8F9FC',
                    borderRadius: 12,
                    padding: '12px 16px',
                    gap: 12,
                    marginTop: 20
                  }}>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{applicants}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Applicants</div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{shortlisted}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Shortlisted</div>
                    </div>
                    <div style={{ textAlign: 'center', borderRight: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{interviewing}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Interviewing</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{offer}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Offer</div>
                    </div>
                  </div>
                </div>

                {/* Right stats and progress column */}
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'stretch' }}>
                  <div style={{ alignSelf: 'flex-end', cursor: 'pointer' }}>
                    <MoreVertical size={16} color="var(--text-3)" />
                  </div>

                  {/* Pipeline Progress meter */}
                  <div style={{ margin: '12px 0 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>Pipeline progress</span>
                      <span style={{ color: '#4F46E5', fontWeight: 700 }}>{progress}%</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: '#F1F3F9', borderRadius: 99 }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: '#4F46E5', borderRadius: 99 }} />
                    </div>
                  </div>

                  {/* Job Action buttons */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => navigate(`/hiring/${job.id}`)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: '#FFF',
                        color: 'var(--text-1)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <ListFilter size={13} /> View details
                    </button>
                    <button
                      onClick={() => navigate(`/hiring/${job.id}`)}
                      style={{
                        flex: 1,
                        height: 38,
                        borderRadius: 8,
                        border: 'none',
                        background: '#4F46E5',
                        color: '#FFF',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6
                      }}
                    >
                      <Users size={13} /> View applicants
                    </button>
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      ))}

      {/* Bottom Improve Pipeline Banner */}
      <div className="card" style={{
        marginTop: 24,
        borderRadius: 16,
        background: '#FFF',
        border: '1px solid var(--border)',
        padding: '24px 32px',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 20
      }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Custom vector illustration of chart and magnifier */}
          <div style={{ width: 80, height: 60, flexShrink: 0 }}>
            <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Background card outline */}
              <rect width="80" height="60" rx="8" fill="#F8F9FC" />
              <rect x="0.5" y="0.5" width="79" height="59" rx="7.5" stroke="#E4E7EF" />
              
              {/* Main dashboard horizontal items */}
              <rect x="8" y="10" width="36" height="5" rx="1" fill="#4F46E5" />
              <rect x="8" y="20" width="22" height="3" rx="0.5" fill="#E4E7EF" />

              {/* Chart lines */}
              <circle cx="16" cy="42" r="2.5" fill="#10B981" />
              <circle cx="30" cy="34" r="2.5" fill="#10B981" />
              <circle cx="44" cy="46" r="2.5" fill="#10B981" />
              <path d="M16 42 L30 34 L44 46" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />

              {/* Magnifier Glass */}
              <circle cx="56" cy="34" r="7.5" stroke="#4F46E5" strokeWidth="2.5" fill="#FFF" />
              <path d="M62 40 L69 47" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>Improve your hiring pipeline</h3>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 4 }}>
              Track performance, identify bottlenecks and hire top talent faster.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/reports')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 20px',
            borderRadius: 10,
            background: '#FFF',
            color: '#4F46E5',
            border: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
            transition: 'all 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#4F46E5'
            e.currentTarget.style.background = '#F5F3FF'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = '#FFF'
          }}
        >
          View pipeline analytics <ChevronRight size={14} />
        </button>
      </div>

    </div>
  )
}
