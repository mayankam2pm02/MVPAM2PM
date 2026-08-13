import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchJobs, fetchCandidates, fetchAllApplications, fetchTasks } from '../lib/supabase.js'
import NotificationBell from '../components/layout/NotificationBell.jsx'
import {
  Briefcase, Users, CheckCircle, TrendingUp, ArrowRight,
  MoreVertical, Plus, Filter, Calendar, Search, Clock
} from 'lucide-react'

// SVG Donut Chart Component
function DonutChart({ segments, totalCount }) {
  const radius = 45
  const strokeWidth = 10
  const circumference = 2 * Math.PI * radius // 282.74
  let accumulatedPercent = 0

  return (
    <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="140" height="140" viewBox="0 0 120 120" style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#F1F3F9"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {segments.map((seg, idx) => {
          const dash = (seg.value / 100) * circumference
          const offset = - (accumulatedPercent / 100) * circumference
          accumulatedPercent += seg.value
          return (
            <circle
              key={idx}
              cx="60"
              cy="60"
              r={radius}
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={offset}
              fill="transparent"
              strokeLinecap="round"
            />
          )
        })}
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center', fontFamily: 'var(--font-display)' }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1 }}>{totalCount}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, fontWeight: 500 }}>Total</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs]                   = useState([])
  const [candidates, setCandidates]       = useState([])
  const [applications, setApplications]   = useState([])
  const [tasks, setTasks]                 = useState([])
  const [loading, setLoading]             = useState(true)

  useEffect(() => {
    Promise.all([fetchJobs(), fetchCandidates(), fetchAllApplications(), fetchTasks()])
      .then(([j, c, a, t]) => {
        setJobs(j || [])
        setCandidates(c || [])
        setApplications(a || [])
        setTasks(t || [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Calculate live statistics
  const activeJobs = jobs.filter(j => j.status === 'active').length
  const totalCandidates = candidates.length
  const openRolesCount = jobs.length
  const uniqueDepartments = [...new Set(jobs.map(j => j.department))].length

  // Seeding mockup data if database is empty for a gorgeous preview
  const isEmptyDB = jobs.length === 0 && candidates.length === 0

  // 1. Stats Setup
  const stats = [
    {
      label: 'Active job postings',
      value: isEmptyDB ? 2 : activeJobs,
      icon: Briefcase,
      color: '#4F46E5',
      bg: '#EEF2FF',
      trend: '10%'
    },
    {
      label: 'Candidates in DB',
      value: isEmptyDB ? 2 : totalCandidates,
      icon: Users,
      color: '#10B981',
      bg: '#ECFDF5',
      trend: '5%'
    },
    {
      label: 'Open roles',
      value: isEmptyDB ? 2 : openRolesCount,
      icon: TrendingUp,
      color: '#2563EB',
      bg: '#EFF6FF',
      trend: '8%'
    },
    {
      label: 'Departments hiring',
      value: isEmptyDB ? 2 : uniqueDepartments,
      icon: CheckCircle,
      color: '#7C3AED',
      bg: '#F5F3FF',
      trend: '12%'
    },
  ]

  // 2. Recent Job Postings list
  const recentJobsList = isEmptyDB
    ? [
        {
          id: 'job-1',
          title: 'Senior Sales Executive',
          department: 'Sales',
          location: 'Mumbai',
          status: 'active',
          applicantsCount: 12,
          shortlistedCount: 4,
          timeAgo: 'Posted 2 days ago'
        },
        {
          id: 'job-2',
          title: 'Software Engineer',
          department: 'Engineering',
          location: 'Bangalore',
          status: 'active',
          applicantsCount: 18,
          shortlistedCount: 7,
          timeAgo: 'Posted 5 days ago'
        }
      ]
    : jobs.slice(0, 2).map(job => {
        const jobApps = applications.filter(a => a.job_id === job.id)
        const shortlisted = jobApps.filter(a => a.status === 'shortlisted').length
        const diffMs = Date.now() - new Date(job.created_at).getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        const timeAgo = diffDays === 0 ? 'Posted today' : `Posted ${diffDays} day${diffDays > 1 ? 's' : ''} ago`
        return {
          id: job.id,
          title: job.title,
          department: job.department,
          location: job.location,
          status: job.status,
          applicantsCount: jobApps.length,
          shortlistedCount: shortlisted,
          timeAgo
        }
      })

  // 3. Upcoming Interviews
  const interviewList = isEmptyDB
    ? [
        {
          id: 'int-1',
          jobTitle: 'Frontend Developer',
          candidateName: 'Rahul Verma',
          time: '10:00 AM',
          type: 'Technical Round',
          month: 'MAY',
          day: '24'
        },
        {
          id: 'int-2',
          jobTitle: 'Product Manager',
          candidateName: 'Ananya Singh',
          time: '2:00 PM',
          type: 'HR Round',
          month: 'MAY',
          day: '24'
        }
      ]
    : applications
        .filter(a => a.interview_date)
        .slice(0, 2)
        .map(a => {
          // Parse date string e.g., "Monday, May 24, 2026 at 10:00 AM | Link"
          const dateStr = a.interview_date || ''
          const timeMatch = dateStr.match(/\b\d{1,2}:\d{2}\s*(?:AM|PM)\b/i)
          const timeText = timeMatch ? timeMatch[0] : 'Scheduled'
          
          let month = 'DATE'
          let day = '??'
          try {
            // Attempt to parse out date parts
            const cleanDatePart = dateStr.split(' at ')[0] || ''
            const parsedDate = new Date(cleanDatePart)
            if (!isNaN(parsedDate.getTime())) {
              month = parsedDate.toLocaleString('en-US', { month: 'short' }).toUpperCase()
              day = parsedDate.getDate().toString()
            }
          } catch {}

          return {
            id: a.id,
            jobTitle: a.jobs?.title || 'Position',
            candidateName: a.candidates?.name || 'Candidate',
            time: timeText,
            type: a.status === 'video_interview' ? 'AI Video Round' : 'Interviewer Round',
            month,
            day
          }
        })

  // 4. Donut Chart & Pipeline stages calculation
  const totalApps = isEmptyDB ? 24 : applications.length
  let pipelineSegments = []
  let pipelineStages = []

  if (isEmptyDB) {
    pipelineSegments = [
      { name: 'Applied', value: 50, color: '#3B82F6', count: 12 },
      { name: 'Screening', value: 25, color: '#10B981', count: 6 },
      { name: 'Interview', value: 17, color: '#7C3AED', count: 4 },
      { name: 'Offer', value: 8, color: '#F97316', count: 2 },
    ]
    pipelineStages = pipelineSegments
  } else {
    // Count live applications matching our groups
    const applied = applications.filter(a => a.status === 'applied').length
    const screening = applications.filter(a => ['screened', 'shortlisted'].includes(a.status)).length
    const interview = applications.filter(a => ['consent_sent', 'consent_accepted', 'consent_declined', 'interview_scheduled', 'interview_done'].includes(a.status)).length
    const offer = applications.filter(a => ['offer_sent', 'hired'].includes(a.status)).length

    const stages = [
      { name: 'Applied', count: applied, color: '#3B82F6' },
      { name: 'Screening', count: screening, color: '#10B981' },
      { name: 'Interview', count: interview, color: '#7C3AED' },
      { name: 'Offer', count: offer, color: '#F97316' }
    ]

    const valSum = applied + screening + interview + offer
    const totalToUse = valSum === 0 ? 1 : valSum // Avoid division by zero

    pipelineSegments = stages.map(s => ({
      ...s,
      value: Math.round((s.count / totalToUse) * 100)
    }))
    pipelineStages = pipelineSegments
  }

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', minHeight: '100%', paddingBottom: 40 }}>
      
      {/* Premium Page Header containing greeting + search, notification & avatar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text-1)', marginBottom: 2 }}>
            Good day, {user?.name?.split(' ')[0] || 'Priya'} 👋
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, fontWeight: 400 }}>
            Here's your hiring pipeline snapshot.
          </p>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          
          {/* Search Box */}
          <div style={{ position: 'relative', width: 220 }}>
            <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search anything..."
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

          {/* Notifications Icon with Badge */}
          {/* Notifications Icon with Badge */}
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

        </div>
      </div>

      {/* Metrics Row (4 Card Grid) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        {stats.map((card, idx) => (
          <div key={idx} className="card" style={{
            padding: '20px 24px',
            borderRadius: 16,
            background: '#FFF',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: card.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <card.icon size={18} color={card.color} />
              </div>
              <MoreVertical size={16} color="var(--text-3)" style={{ cursor: 'pointer' }} />
            </div>

            <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-1)', lineHeight: '1.1', fontFamily: 'var(--font-display)' }}>
              {loading ? '—' : card.value}
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, marginTop: 4 }}>
              {card.label}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 14, fontSize: 12, color: '#10B981', fontWeight: 600 }}>
              <span style={{ fontSize: 10 }}>▲</span>
              <span>{card.trend}</span>
              <span style={{ color: 'var(--text-3)', fontWeight: 400, marginLeft: 2 }}>vs last week</span>
            </div>
          </div>
        ))}
      </div>

      {/* Task Reminders banner */}
      {tasks.length > 0 && (
        <div className="card" style={{
          padding: '16px 20px',
          borderRadius: 16,
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚠️</span>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#92400E', margin: 0 }}>Attention Required: Operational Task Reminders</h3>
                <p style={{ fontSize: 12, color: '#B45309', margin: '2px 0 0' }}>You have pending operational tasks that need follow-up today.</p>
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={() => navigate('/crm')}
              style={{
                background: '#FFF',
                border: '1px solid #FCD34D',
                color: '#92400E',
                fontSize: 12,
                fontWeight: 600,
                height: 32,
                padding: '0 12px',
                cursor: 'pointer'
              }}
            >
              Open Task Manager →
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tasks.slice(0, 3).map((task) => (
              <div 
                key={task.id} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  background: 'rgba(255, 255, 255, 0.6)', 
                  padding: '8px 12px', 
                  borderRadius: 10,
                  border: '1px solid rgba(253, 230, 138, 0.5)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', 
                    background: task.priority === 'high' ? '#EF4444' : '#F59E0B'
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#78350F' }}>{task.title}</span>
                  {task.department && (
                    <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: 4 }}>
                      {task.department}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#B45309', fontStyle: 'italic' }}>🔄 {task.frequency || 'daily'}</span>
                  <a 
                    href={`https://wa.me/?text=${encodeURIComponent(`Reminder: Task "${task.title}" is due today.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Send reminder via WhatsApp"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: '#25D366',
                      color: '#FFF',
                      textDecoration: 'none',
                      fontSize: 12
                    }}
                  >
                    💬
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Middle Grid Section (Quick Actions & Recent Jobs) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20,
        marginBottom: 24
      }}>
        
        {/* Quick Actions Card */}
        <div className="card" style={{
          borderRadius: 16,
          background: '#FFF',
          border: '1px solid var(--border)',
          padding: 24,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
              Quick actions
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 20 }}>
              Shortcuts to save your time
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              
              {/* Post Job Action */}
              <div
                onClick={() => navigate('/hiring/new')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#FFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#4F46E5'
                  e.currentTarget.style.background = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = '#FFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#EEF2FF',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Plus size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>Post a new job</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>Create a new job posting in minutes</div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-3)" />
              </div>

              {/* View Candidate DB Action */}
              <div
                onClick={() => navigate('/candidates')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#FFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#10B981'
                  e.currentTarget.style.background = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = '#FFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#ECFDF5',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Users size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>View candidate database</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>Browse and manage all candidates</div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-3)" />
              </div>

              {/* View Hiring Pipeline Action */}
              <div
                onClick={() => navigate('/hiring')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#FFF'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2563EB'
                  e.currentTarget.style.background = '#F9FAFB'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.background = '#FFF'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Filter size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>View hiring pipeline</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 1 }}>Track your hiring process</div>
                  </div>
                </div>
                <ArrowRight size={14} color="var(--text-3)" />
              </div>

            </div>
          </div>
        </div>

        {/* Recent Job Postings Card */}
        <div className="card" style={{
          borderRadius: 16,
          background: '#FFF',
          border: '1px solid var(--border)',
          padding: 24,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                Recent job postings
              </h2>
              <button
                onClick={() => navigate('/hiring')}
                style={{
                  background: '#F5F3FF',
                  color: '#4F46E5',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                View all
              </button>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading...</div>
            ) : recentJobsList.length === 0 ? (
              <div style={{ color: 'var(--text-3)', padding: '1.5rem 0', fontSize: 13, textAlign: 'center' }}>
                No job postings found
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentJobsList.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/hiring/${job.id}`)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: 14,
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: '#FFF',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    {/* Status Badge */}
                    <span style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#10B981',
                      background: '#ECFDF5',
                      padding: '2px 8px',
                      borderRadius: 99
                    }}>
                      Active
                    </span>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#EEF2FF',
                        color: '#4F46E5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <Briefcase size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{job.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                          {job.department} <span style={{ margin: '0 4px' }}>•</span> {job.location}
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 11, color: 'var(--text-2)', fontWeight: 500 }}>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{job.applicantsCount}</span> Applicants
                          </div>
                          <div>
                            <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{job.shortlistedCount}</span> Shortlisted
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{
                      alignSelf: 'flex-end',
                      fontSize: 10,
                      color: 'var(--text-3)',
                      marginTop: 2,
                      fontWeight: 400
                    }}>
                      {job.timeAgo}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            onClick={() => navigate('/hiring')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: '#4F46E5',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 18,
              borderTop: '1px solid var(--border)',
              paddingTop: 14
            }}
          >
            View all postings <ArrowRight size={13} />
          </div>
        </div>

      </div>

      {/* Bottom Grid Section (Hiring pipeline overview & Upcoming interviews) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: 20
      }}>
        
        {/* Hiring Pipeline Overview */}
        <div className="card" style={{
          borderRadius: 16,
          background: '#FFF',
          border: '1px solid var(--border)',
          padding: 24,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>
              Hiring pipeline overview
            </h2>
            <p style={{ color: 'var(--text-3)', fontSize: 12, marginBottom: 20 }}>
              Summary of your hiring stages
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
              
              {/* Donut graphic */}
              <DonutChart segments={pipelineSegments} totalCount={totalApps} />

              {/* Progress legend bars */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, minWidth: 160 }}>
                {pipelineStages.map((stage, idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500, color: 'var(--text-2)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color }} />
                        {stage.name}
                      </div>
                      <div style={{ fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-1)' }}>{stage.count}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: 10, marginLeft: 6 }}>{stage.value}%</span>
                      </div>
                    </div>
                    {/* Linear progress track */}
                    <div style={{ width: '100%', height: 4, background: '#F1F3F9', borderRadius: 99 }}>
                      <div style={{ width: `${stage.value}%`, height: '100%', background: stage.color, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>

          <div
            onClick={() => navigate('/hiring')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: '#4F46E5',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 18,
              borderTop: '1px solid var(--border)',
              paddingTop: 14
            }}
          >
            View full pipeline <ArrowRight size={13} />
          </div>
        </div>

        {/* Upcoming Interviews Card */}
        <div className="card" style={{
          borderRadius: 16,
          background: '#FFF',
          border: '1px solid var(--border)',
          padding: 24,
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.015)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                Upcoming interviews
              </h2>
              <button
                onClick={() => navigate('/interviews')}
                style={{
                  background: '#F5F3FF',
                  color: '#4F46E5',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                View calendar
              </button>
            </div>

            {loading ? (
              <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading...</div>
            ) : interviewList.length === 0 ? (
              <div style={{ color: 'var(--text-3)', padding: '1.5rem 0', fontSize: 13, textAlign: 'center' }}>
                No interviews scheduled
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {interviewList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 12,
                      border: '1px solid var(--border)',
                      background: '#FFF',
                      gap: 12
                    }}
                  >
                    {/* Date Block */}
                    <div style={{
                      width: 48,
                      height: 52,
                      borderRadius: 10,
                      background: '#EEF2FF',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(79, 70, 229, 0.08)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: 8, fontWeight: 800, color: '#4F46E5', letterSpacing: '0.05em' }}>
                        {item.month}
                      </span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#4F46E5', lineHeight: '1.1' }}>
                        {item.day}
                      </span>
                    </div>

                    {/* Interview Details */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.jobTitle}
                        </div>
                        <span style={{
                          fontSize: 9,
                          fontWeight: 600,
                          color: '#2563EB',
                          background: '#EFF6FF',
                          padding: '1px 6px',
                          borderRadius: 99,
                          flexShrink: 0
                        }}>
                          Scheduled
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, fontWeight: 500 }}>
                        {item.candidateName}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, color: 'var(--text-3)', fontSize: 10, fontWeight: 500 }}>
                        <Clock size={11} />
                        <span>{item.time}</span>
                        <span style={{ margin: '0 2px' }}>•</span>
                        <span>{item.type}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            onClick={() => navigate('/interviews')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              color: '#4F46E5',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 18,
              borderTop: '1px solid var(--border)',
              paddingTop: 14
            }}
          >
            View all interviews <ArrowRight size={13} />
          </div>
        </div>

      </div>
    </div>
  )
}
