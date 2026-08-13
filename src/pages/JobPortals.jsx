import { useState, useEffect } from 'react'
import { fetchJobs, createCandidate, createApplication } from '../lib/supabase.js'
import {
  Sparkles, Briefcase, Link as LinkIcon, UserCheck, Check,
  AlertCircle, RefreshCw, Plus, Trash2, ArrowUpRight,
  Layers, Settings, ShieldCheck, Mail, Phone, MapPin, Globe
} from 'lucide-react'

export default function JobPortals() {
  const [activeTab, setActiveTab] = useState('applicants') // 'applicants' | 'channels' | 'listings'
  const [msg, setMsg] = useState('')
  const [jobs, setJobs] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [connectingChannel, setConnectingChannel] = useState(null)
  const [copiedId, setCopiedId] = useState(null)

  const handleCopyLink = (jobId, platform) => {
    const url = `${window.location.origin}/apply?jobId=${jobId}&source=${platform}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(`${jobId}-${platform}`)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }
  
  // Credentials form state
  const [username, setUsername] = useState('')
  const [apiKey, setApiKey] = useState('')

  // Portal Channels state (persisted in localStorage)
  const [channels, setChannels] = useState(() => {
    const saved = localStorage.getItem('company_portal_channels')
    return saved ? JSON.parse(saved) : [
      { id: 'linkedin', name: 'LinkedIn Recruiter', connected: true, username: 'hr@cosphere.io', lastSync: '10 mins ago', color: '#0A66C2' },
      { id: 'indeed', name: 'Indeed for Employers', connected: true, username: 'talent-acq@cosphere.io', lastSync: '1 hour ago', color: '#2164E3' },
      { id: 'naukri', name: 'Naukri Recruiter', connected: false, username: '', lastSync: 'Never', color: '#FF7555' },
      { id: 'glassdoor', name: 'Glassdoor Jobs', connected: false, username: '', lastSync: 'Never', color: '#0CAA41' }
    ]
  })

  // Portal Job Listings state
  const [listings, setListings] = useState(() => {
    const saved = localStorage.getItem('company_portal_listings')
    return saved ? JSON.parse(saved) : [
      { id: 'list-1', title: 'Frontend Engineer', platform: 'Indeed', candidatesCount: 12, status: 'Active', postedAt: '2 days ago' },
      { id: 'list-2', title: 'Senior Node.js Developer', platform: 'LinkedIn', candidatesCount: 8, status: 'Active', postedAt: '1 day ago' },
      { id: 'list-3', title: 'HR Specialist', platform: 'Naukri', candidatesCount: 4, status: 'Draft', postedAt: 'Not Posted' },
      { id: 'list-4', title: 'Data Scientist', platform: 'Indeed', candidatesCount: 6, status: 'Active', postedAt: '3 days ago' }
    ]
  })

  // Portal Applicants state
  const [applicants, setApplicants] = useState(() => {
    const saved = localStorage.getItem('company_portal_applicants')
    return saved ? JSON.parse(saved) : [
      {
        id: 'p-cand-1',
        name: 'Aarav Mehta',
        email: 'aarav.mehta@gmail.com',
        phone: '+91 98123 45678',
        location: 'Mumbai, India',
        jobTitle: 'Frontend Engineer',
        platform: 'Indeed',
        score: 92,
        expMatch: 95,
        skillsMatch: 90,
        eduMatch: 90,
        skills: 'React, TypeScript, Redux, HTML5, CSS3, TailwindCSS',
        transferred: false
      },
      {
        id: 'p-cand-2',
        name: 'Ananya Sen',
        email: 'ananya.sen@outlook.com',
        phone: '+91 97865 43210',
        location: 'Delhi, India',
        jobTitle: 'Senior Node.js Developer',
        platform: 'LinkedIn',
        score: 85,
        expMatch: 80,
        skillsMatch: 90,
        eduMatch: 85,
        skills: 'Node.js, Express, NestJS, MongoDB, PostgreSQL, Redis',
        transferred: false
      },
      {
        id: 'p-cand-3',
        name: 'Rahul Dravid',
        email: 'rahul.d@yahoo.com',
        phone: '+91 98989 89898',
        location: 'Bangalore, India',
        jobTitle: 'HR Specialist',
        platform: 'Naukri',
        score: 74,
        expMatch: 70,
        skillsMatch: 80,
        eduMatch: 70,
        skills: 'HR Operations, Talent Acquisition, Employee Engagement',
        transferred: false
      },
      {
        id: 'p-cand-4',
        name: 'Pooja Hegde',
        email: 'pooja.h@gmail.com',
        phone: '+91 99887 76655',
        location: 'Hyderabad, India',
        jobTitle: 'Frontend Engineer',
        platform: 'Indeed',
        score: 68,
        expMatch: 65,
        skillsMatch: 70,
        eduMatch: 70,
        skills: 'HTML, CSS, JavaScript, Vue.js, Bootstrap',
        transferred: false
      },
      {
        id: 'p-cand-5',
        name: 'Kabir Singh',
        email: 'kabir.s@gmail.com',
        phone: '+91 91234 56789',
        location: 'Mumbai, India',
        jobTitle: 'Senior Node.js Developer',
        platform: 'LinkedIn',
        score: 94,
        expMatch: 95,
        skillsMatch: 95,
        eduMatch: 90,
        skills: 'Node.js, GraphQL, AWS Lambdas, Docker, Kubernetes',
        transferred: false
      }
    ]
  })

  useEffect(() => {
    fetchJobs().then(setJobs).catch(console.error)
  }, [])

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.origin !== window.location.origin) return
      if (e.data?.type === 'oauth-success') {
        const { platform, username } = e.data
        const updated = channels.map(c => c.id === platform ? {
          ...c,
          connected: true,
          username: username,
          lastSync: 'Just now'
        } : c)
        saveChannels(updated)
        setMsg(`✅ Connected to ${platform === 'linkedin' ? 'LinkedIn' : platform === 'indeed' ? 'Indeed' : platform === 'naukri' ? 'Naukri' : 'Glassdoor'} Recruiter Portal!`)
        setTimeout(() => setMsg(''), 4000)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [channels])

  const handleOAuthConnect = (platform) => {
    const url = `${window.location.origin}/oauth-login?platform=${platform.id}&name=${encodeURIComponent(platform.name)}`
    const width = 450
    const height = 580
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    window.open(url, 'Connect Account', `width=${width},height=${height},left=${left},top=${top}`)
  }

  // Persist local state changes
  const saveChannels = (updated) => {
    setChannels(updated)
    localStorage.setItem('company_portal_channels', JSON.stringify(updated))
  }

  const saveListings = (updated) => {
    setListings(updated)
    localStorage.setItem('company_portal_listings', JSON.stringify(updated))
  }

  const saveApplicants = (updated) => {
    setApplicants(updated)
    localStorage.setItem('company_portal_applicants', JSON.stringify(updated))
  }

  // Trigger sync simulation
  const handleTriggerSync = () => {
    if (syncing) return
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      const updatedChannels = channels.map(c => c.connected ? { ...c, lastSync: 'Just now' } : c)
      saveChannels(updatedChannels)
      setMsg('✅ Fetched and synchronized active job posts and applicants successfully!')
      setTimeout(() => setMsg(''), 4000)
    }, 1500)
  }

  // Connect platform account
  const handleConnectChannel = (e) => {
    e.preventDefault()
    if (!username || !apiKey) {
      alert('Please fill out all credentials.')
      return
    }
    const updated = channels.map(c => c.id === connectingChannel.id ? {
      ...c,
      connected: true,
      username: username,
      lastSync: 'Just now'
    } : c)
    saveChannels(updated)
    setConnectingChannel(null)
    setUsername('')
    setApiKey('')
    setMsg(`✅ Account connected to ${connectingChannel.name}!`)
    setTimeout(() => setMsg(''), 4000)
  }

  // Disconnect platform account
  const handleDisconnectChannel = (platformId) => {
    if (window.confirm('Are you sure you want to disconnect this platform account?')) {
      const updated = channels.map(c => c.id === platformId ? {
        ...c,
        connected: false,
        username: '',
        lastSync: 'Never'
      } : c)
      saveChannels(updated)
      setMsg('🔌 Disconnected account.')
      setTimeout(() => setMsg(''), 4000)
    }
  }

  // Send Candidate to Main Candidates & Applications module
  const handleSendToCandidates = async (appId) => {
    const applicant = applicants.find(a => a.id === appId)
    if (!applicant || applicant.transferred) return

    try {
      // 1. Create candidate entry in DB
      const platformSource = applicant.platform.toLowerCase()
      const newCandidate = await createCandidate({
        name: applicant.name,
        email: applicant.email,
        phone: applicant.phone || null,
        role: applicant.jobTitle || null,
        experience: 3,
        location: applicant.location || null,
        rating: Math.round(applicant.score / 20) || 4,
        summary: `Imported from ${applicant.platform} Portal Job Board. Screen Score: ${applicant.score}%.`,
        skills: applicant.skills ? applicant.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        cv_text: `Name: ${applicant.name}\nEmail: ${applicant.email}\nPlatform: ${applicant.platform}\nSkills: ${applicant.skills}`,
        source: ['linkedin', 'indeed', 'naukri'].includes(platformSource) ? platformSource : 'manual',
        status: 'available'
      })

      // 2. Locate matching job in local system database
      let targetJob = jobs.find(j => j.title.toLowerCase().includes(applicant.jobTitle.toLowerCase()))
      if (!targetJob && jobs.length > 0) {
        targetJob = jobs[0] // Fallback to first job
      }

      if (targetJob) {
        // 3. Create application entry linking job and candidate
        await createApplication({
          job_id: targetJob.id,
          candidate_id: newCandidate.id,
          status: 'applied',
          consent_status: 'not_sent',
          screen_score: applicant.score,
          screen_recommendation: applicant.score >= 80 ? 'shortlist' : 'maybe',
          experience_match: applicant.expMatch,
          skills_match: applicant.skillsMatch,
          education_match: applicant.eduMatch,
          screen_summary: `Profile automatically imported and screened from ${applicant.platform}.`
        })

        // 4. Update applicant status in state
        const updated = applicants.map(a => a.id === appId ? { ...a, transferred: true } : a)
        saveApplicants(updated)
        setMsg(`✅ Candidate "${applicant.name}" has been transferred to Candidates module!`)
        setTimeout(() => setMsg(''), 4000)
      } else {
        alert('Could not find any active jobs in your TalentOS platform to assign this candidate to. Please create a job posting first.')
      }
    } catch (err) {
      console.error(err)
      alert('Error transferring candidate: ' + err.message)
    }
  }

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Job Portals Integration</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Connect external job boards, sync posted roles, and screen candidate submissions.</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleTriggerSync}
          disabled={syncing}
          style={{ display: 'flex', alignItems: 'center', gap: 8, height: 40, borderRadius: 8, fontWeight: 600, fontSize: 13 }}
        >
          <RefreshCw size={14} className={syncing ? 'spin-anim' : ''} />
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ECFDF5', color: '#10B981', fontSize: 13, marginBottom: 16, border: '1px solid #A7F3D0' }}>
          {msg}
        </div>
      )}

      {/* Tabs Menu */}
      <div className="tabs" style={{ marginBottom: 20, display: 'flex', gap: 6, background: '#EFF1F5', padding: 4, borderRadius: 10, width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('applicants')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'applicants' ? '#FFF' : 'transparent',
            color: activeTab === 'applicants' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'applicants' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <UserCheck size={14} /> Portal Candidates ({applicants.filter(a => !a.transferred).length})
        </button>
        <button
          onClick={() => setActiveTab('listings')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'listings' ? '#FFF' : 'transparent',
            color: activeTab === 'listings' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'listings' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <Briefcase size={14} /> Active Board Listings ({listings.length})
        </button>
        <button
          onClick={() => setActiveTab('channels')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            background: activeTab === 'channels' ? '#FFF' : 'transparent',
            color: activeTab === 'channels' ? '#4F46E5' : 'var(--text-3)',
            boxShadow: activeTab === 'channels' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
          }}
        >
          <LinkIcon size={14} /> Connected Platforms ({channels.filter(c => c.connected).length})
        </button>
      </div>

      {/* ─── TAB VIEW: CANDIDATES ───────────────────────────────── */}
      {activeTab === 'applicants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {applicants.length === 0 ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-3)' }}>
              <AlertCircle size={24} style={{ marginBottom: 8, color: 'var(--text-3)' }} />
              <p>No candidates have applied through external portals yet.</p>
            </div>
          ) : (
            applicants.map(app => (
              <div
                key={app.id}
                className="card"
                style={{
                  padding: 20,
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: '#FFF',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 16,
                  opacity: app.transferred ? 0.75 : 1
                }}
              >
                {/* Left side: Candidate Main Card Info */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>{app.name}</h3>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 20,
                        color: '#FFF',
                        background: channels.find(c => c.name.toLowerCase().includes(app.platform.toLowerCase()))?.color || '#999'
                      }}
                    >
                      {app.platform}
                    </span>
                  </div>

                  <p style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 600, marginBottom: 12 }}>
                    Applied for: <span style={{ color: 'var(--text-1)' }}>{app.jobTitle}</span>
                  </p>

                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-3)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13} /> {app.email}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} /> {app.phone}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} /> {app.location}</span>
                  </div>

                  {/* Skills tags */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
                    {app.skills.split(', ').map((skill, i) => (
                      <span key={i} style={{ fontSize: 10, padding: '2px 8px', background: '#F3F4F6', borderRadius: 4, color: 'var(--text-2)' }}>{skill}</span>
                    ))}
                  </div>
                </div>

                {/* Middle side: Match Metrics & ATS scores */}
                <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Match Scores */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Experience Match</span>
                      <span style={{ fontWeight: 600 }}>{app.expMatch}%</span>
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#10B981', width: `${app.expMatch}%` }} />
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Skills Match</span>
                      <span style={{ fontWeight: 600 }}>{app.skillsMatch}%</span>
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#3B82F6', width: `${app.skillsMatch}%` }} />
                    </div>

                    <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span>Education Match</span>
                      <span style={{ fontWeight: 600 }}>{app.eduMatch}%</span>
                    </div>
                    <div style={{ height: 4, background: '#E5E7EB', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: '#F59E0B', width: `${app.eduMatch}%` }} />
                    </div>
                  </div>

                  {/* ATS Rating Box */}
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 12,
                      background: app.score >= 85 ? '#ECFDF5' : app.score >= 70 ? '#FFFBEB' : '#FEF2F2',
                      border: `1px solid ${app.score >= 85 ? '#A7F3D0' : app.score >= 70 ? '#FDE68A' : '#FCA5A5'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase' }}>ATS</span>
                    <span style={{ fontSize: 20, fontWeight: 800, color: app.score >= 85 ? '#065F46' : app.score >= 70 ? '#92400E' : '#B91C1C' }}>
                      {app.score}
                    </span>
                  </div>
                </div>

                {/* Right side: Action send candidate */}
                <div>
                  {app.transferred ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10B981', fontSize: 13, fontWeight: 600 }}>
                      <Check size={16} /> Sent
                    </div>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleSendToCandidates(app.id)}
                      style={{
                        height: 38,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        background: 'var(--bg-active)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-1)',
                        cursor: 'pointer'
                      }}
                    >
                      Send to Candidate
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── TAB VIEW: ACTIVE POSTINGS ─────────────────────────── */}
      {activeTab === 'listings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Instructions banner */}
          <div style={{ padding: '16px 20px', borderRadius: 12, background: 'rgba(79, 70, 229, 0.04)', border: '1px solid rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 4px', color: '#4F46E5' }}>Direct Board Sync Instructions</h4>
              <p style={{ fontSize: 12, color: 'var(--text-2)', margin: 0, lineHeight: 1.5 }}>
                Copy the target platform apply link for your job listing and paste it as the <strong>Redirect URL / Application URL</strong> on LinkedIn, Indeed, Naukri, or Glassdoor. 
                Candidates who apply on those boards will be seamlessly redirected to submit their details directly into your dashboard.
              </p>
            </div>
          </div>

          <div className="card" style={{ padding: 0, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)', background: '#FFF' }}>
            {jobs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>
                <AlertCircle size={24} style={{ marginBottom: 8, color: 'var(--text-3)', display: 'block', margin: '0 auto 10px' }} />
                <p style={{ margin: 0 }}>No jobs created yet in your TalentOS dashboard.</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Please create a job post in the hiring module first.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Job Posting</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Location</th>
                    <th style={{ padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>Board Integration Links (Click to Copy)</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(job => (
                    <tr key={job.id} style={{ borderBottom: '1px solid #F1F3F9' }}>
                      <td style={{ padding: '16px', fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Briefcase size={14} color="var(--text-3)" />
                          <div>
                            <div>{job.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>{job.department || 'General'}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: 12, color: 'var(--text-2)' }}>
                        {job.location || 'Remote'}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {[
                            { key: 'linkedin', name: 'LinkedIn', color: '#0A66C2' },
                            { key: 'indeed', name: 'Indeed', color: '#2164E3' },
                            { key: 'naukri', name: 'Naukri', color: '#FF7555' },
                            { key: 'glassdoor', name: 'Glassdoor', color: '#0CAA41' }
                          ].map(platform => {
                            const isCopied = copiedId === `${job.id}-${platform.key}`
                            return (
                              <button
                                key={platform.key}
                                onClick={() => handleCopyLink(job.id, platform.key)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  border: `1.5px solid ${isCopied ? '#10B981' : platform.color}`,
                                  background: isCopied ? '#ECFDF5' : '#FFF',
                                  color: isCopied ? '#10B981' : platform.color,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  padding: '5px 12px',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {isCopied ? 'Copied!' : `Copy ${platform.name} URL`}
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB VIEW: CHANNELS ────────────────────────────────── */}
      {activeTab === 'channels' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {channels.map(platform => (
            <div
              key={platform.id}
              className="card"
              style={{
                padding: 20,
                borderRadius: 16,
                border: '1px solid var(--border)',
                background: '#FFF',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 180
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: platform.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontWeight: 800, fontSize: 16 }}>
                      {platform.name[0]}
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>{platform.name}</h3>
                  </div>

                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: platform.connected ? '#10B981' : '#D1D5DB'
                    }}
                  />
                </div>

                {platform.connected ? (
                  <div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 4 }}>
                      Connected as: <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{platform.username}</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      Last automated sync: {platform.lastSync}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                    Account is disconnected.
                  </div>
                )}
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
                {platform.connected ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDisconnectChannel(platform.id)}
                    style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#FFF5F5', color: '#E53E3E', border: '1px solid #FED7D7' }}
                  >
                    Disconnect
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleOAuthConnect(platform)}
                      style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      OAuth Login
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConnectingChannel(platform)}
                      style={{ flex: 1, height: 34, borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#F8F9FC', border: '1px solid var(--border)', color: 'var(--text-2)' }}
                    >
                      API Key
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONNECT PLATFORM MODAL */}
      {connectingChannel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#FFF', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, border: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>
              Connect {connectingChannel.name}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>
              Enter your credentials to link your corporate job posting account securely.
            </p>

            <form onSubmit={handleConnectChannel} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                  Account Username / Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="hr@company.com"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)', outline: 'none', background: '#FFF', fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>
                  Client API Key / Access Token
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  style={{ width: '100%', height: 38, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)', outline: 'none', background: '#FFF', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => setConnectingChannel(null)}
                  style={{ flex: 1, height: 36, borderRadius: 6, border: '1px solid var(--border)', background: '#FFF', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, height: 36, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                >
                  Verify &amp; Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
