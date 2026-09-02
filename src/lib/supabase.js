import { createClient } from '@supabase/supabase-js'
import { getCleanCandidateEmail } from './emailUtils.js'
import { getCleanCandidateName } from './nameUtils.js'

const rawUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dcctifdgmiuyofkuydwm.supabase.co'
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjY3RpZmRnbWl1eW9ma3V5ZHdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5OTYzNTMsImV4cCI6MjA5NjU3MjM1M30.XFThOMgfHTcj3woqbaH_JbQ2IJfS3wJLHp7xqAaJc6s'

const isValidUrl = (url) => {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export const isConfigured = !!(
  rawUrl &&
  isValidUrl(rawUrl) &&
  !rawUrl.includes('your_supabase_project_url') &&
  rawKey &&
  rawKey !== 'your_supabase_anon_key'
)

const supabaseUrl = rawUrl
const supabaseKey = rawKey

function hydrateCandidate(candidate) {
  if (!candidate) return candidate
  const cleanEmail = getCleanCandidateEmail(candidate)
  const cleanName  = getCleanCandidateName(candidate)
  const updates = {}

  if (cleanEmail && cleanEmail !== candidate.email && /cv\.import|noemail/i.test(candidate.email)) {
    candidate.email = cleanEmail
    updates.email = cleanEmail
  }

  if (cleanName && cleanName !== 'Candidate' && cleanName !== candidate.name && (/^(?:cv|resume)/i.test(candidate.name) || /[-_]/.test(candidate.name) || /\.(pdf|docx?)/i.test(candidate.name) || /\s*(?:s\.?e\.?|b\.?d\.?e?\.?)$/i.test(candidate.name) || !candidate.name.includes(' '))) {
    candidate.name = cleanName
    updates.name = cleanName
  }

  if (isConfigured && candidate.id && Object.keys(updates).length > 0) {
    supabase.from('candidates').update(updates).eq('id', candidate.id).then(() => {}).catch(() => {})
  }
  return candidate
}

if (!isConfigured) {
  console.warn('Supabase environment variables are missing or invalid in your .env file. The application is running in preview/fallback mode.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// ─── LOCAL STORAGE MOCK DATABASE (PREVIEW MODE) ────────────────

const getMockDB = (key, initial) => {
  const data = localStorage.getItem(`mock_db_${key}`)
  if (!data) {
    localStorage.setItem(`mock_db_${key}`, JSON.stringify(initial))
    return initial
  }
  try {
    return JSON.parse(data)
  } catch {
    return initial
  }
}

const saveMockDB = (key, data) => {
  localStorage.setItem(`mock_db_${key}`, JSON.stringify(data))
}

const getMockUser = () => {
  const stored = localStorage.getItem('mock_user')
  return stored ? JSON.parse(stored) : null
}

const MOCK_JOBS_DEFAULT = [
  {
    id: 'job-1',
    title: 'Senior Sales Executive',
    department: 'Sales',
    location: 'Mumbai',
    type: 'Full-time',
    salary: 'Rs 8-12 LPA',
    reporting_to: 'VP Sales',
    skills: 'B2B Sales, Salesforce, SaaS, Negotiation',
    status: 'active',
    jd: 'We are looking for a driven Senior Sales Executive to join our growing sales team in Mumbai.\n\nKey Responsibilities:\n- Own sales cycle from prospecting to closure\n- Achieve monthly/quarterly revenue targets\n\nRequirements:\n- 3-6 years B2B sales experience\n- Strong CRM skills',
    created_at: new Date(Date.now() - 3600000 * 24 * 3).toISOString()
  },
  {
    id: 'job-2',
    title: 'Software Engineer',
    department: 'Engineering',
    location: 'Bangalore',
    type: 'Full-time',
    salary: 'Rs 12-18 LPA',
    reporting_to: 'VP Engineering',
    skills: 'React, Node.js, PostgreSQL, AWS',
    status: 'active',
    jd: 'We are looking for a Software Engineer with strong fullstack JavaScript capabilities to join our Bangalore team.',
    created_at: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
  }
]

const MOCK_CANDIDATES_DEFAULT = [
  {
    id: 'cand-1',
    name: 'Arjun Kapoor',
    email: 'arjun.kapoor@gmail.com',
    phone: '+91 98100 11223',
    role: 'Software Engineer',
    experience: 4,
    location: 'Bangalore',
    skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'TypeScript', 'Docker'],
    education: 'B.Tech Computer Science, IIT Delhi',
    summary: 'Full-stack developer with 4 years at early-stage startups. Built 2 products from 0 to 1.',
    rating: 4.5,
    status: 'available',
    source: 'internal',
    cv_text: 'Arjun Kapoor — Software Engineer\nEmail: arjun.kapoor@gmail.com | Location: Bangalore\n\nEXPERIENCE\nSenior Software Engineer — TechStart Pvt Ltd (2022–Present)\n- Led React/TypeScript frontend for B2B SaaS (500+ clients)\n- Built Node.js/Express APIs with PostgreSQL\n\nEDUCATION\nB.Tech CS — IIT Delhi (2016–2020)',
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
  },
  {
    id: 'cand-2',
    name: 'Sneha Iyer',
    email: 'sneha.iyer@outlook.com',
    phone: '+91 99200 33445',
    role: 'Sales Executive',
    experience: 3,
    location: 'Mumbai',
    skills: ['B2B Sales', 'CRM', 'Lead Generation', 'Negotiation', 'Salesforce'],
    education: 'MBA Marketing, SP Jain Institute',
    summary: 'Consistently top 10% sales performer. Closed Rs 2Cr+ in ARR last year.',
    rating: 4.8,
    status: 'available',
    source: 'internal',
    cv_text: 'Sneha Iyer — Sales Executive\nEmail: sneha.iyer@outlook.com | Location: Mumbai\n\nEXPERIENCE\nSenior Sales Executive — CloudSoft India (2021–Present)\n- Closed Rs 2.1 Cr in ARR in FY2023\n\nEDUCATION\nMBA Marketing — SP Jain Institute (2017–2019)',
    created_at: new Date(Date.now() - 3600000 * 24 * 1).toISOString()
  }
]

const MOCK_APPLICATIONS_DEFAULT = [
  {
    id: 'app-1',
    job_id: 'job-1',
    candidate_id: 'cand-2',
    status: 'shortlisted',
    screen_score: 88,
    screen_recommendation: 'shortlist',
    screen_strengths: ['Strong sales track record', 'Salesforce expert', 'Good communication'],
    screen_gaps: [],
    screen_summary: 'Excellent sales performance, meets all requirements.',
    experience_match: 90,
    skills_match: 85,
    education_match: 90,
    consent_status: 'not_sent',
    consent_token: 'mock-consent-token-1',
    applied_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 24).toISOString()
  }
]

const MOCK_EMPLOYEES_DEFAULT = []

const MOCK_TRAINING_MODULES_DEFAULT = [
  { id: 'tm-1', title: 'Company Overview & Culture', description: 'Understand our mission, values, and team structure.', type: 'video', duration: '12 min', profile_tags: ['all'], order_index: 1, is_mandatory: true },
  { id: 'tm-2', title: 'HR Policies & Code of Conduct', description: 'Leave policy, performance review cycle, and workplace guidelines.', type: 'document', duration: '20 min', profile_tags: ['all'], order_index: 2, is_mandatory: true },
  { id: 'tm-3', title: 'Tools & Systems Access', description: 'Setting up all tools — email, Slack, HRMS, and more.', type: 'video', duration: '10 min', profile_tags: ['all'], order_index: 3, is_mandatory: true },
  { id: 'tm-4', title: 'Product Knowledge — SaaS Platform', description: 'Deep dive into product features, use cases, and competitive differentiation.', type: 'document', duration: '20 min', profile_tags: ['sales', 'bd'], order_index: 4, is_mandatory: true },
  { id: 'tm-5', title: 'Sales Process & CRM Usage', description: 'End-to-end sales cycle walkthrough with live CRM demonstration.', type: 'video', duration: '18 min', profile_tags: ['sales', 'bd'], order_index: 5, is_mandatory: true }
]

const MOCK_CRM_LEADS_DEFAULT = [
  { id: 'lead-1', name: 'Raj Malhotra', company: 'Infosys BPO', phone: '+91 98111 22334', email: 'raj@infosys.com', status: 'interested', notes: 'Wants demo next week', created_at: new Date().toISOString() },
  { id: 'lead-2', name: 'Sunita Agarwal', company: 'TCS Ltd', phone: '+91 98222 33445', email: 'sunita@tcs.com', status: 'callback', notes: 'Call back Thursday 3pm', created_at: new Date().toISOString() }
]

const MOCK_TASKS_DEFAULT = [
  { id: 'task-1', title: 'Make 30 cold calls', frequency: 'daily', priority: 'high', profile_tags: ['sales', 'bd'], created_at: new Date().toISOString() },
  { id: 'task-2', title: 'Update CRM with call dispositions', frequency: 'daily', priority: 'medium', profile_tags: ['sales', 'bd'], created_at: new Date().toISOString() }
]

// ─── AUTH HELPERS ─────────────────────────────────────────────

export async function signIn(email, password) {
  if (!isConfigured) {
    const role = email.includes('priya') ? 'admin' : email.includes('rahul') ? 'hr' : email.includes('anita') ? 'manager' : 'interviewer'
    const name = email.includes('priya') ? 'Priya Sharma' : email.includes('rahul') ? 'Rahul Verma' : email.includes('anita') ? 'Anita Desai' : 'Karan Singh'
    const mockUser = {
      id: 'mock-uuid-' + role,
      email: email,
      role: role,
      name: name,
      avatar: null
    }
    localStorage.setItem('mock_user', JSON.stringify(mockUser))
    window.dispatchEvent(new Event('mock-auth-change'))
    return {
      user: { id: mockUser.id, email: mockUser.email },
      session: { user: { id: mockUser.id, email: mockUser.email } }
    }
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUp(email, password, metadata) {
  if (!isConfigured) {
    const role = metadata?.role || 'interviewer'
    const name = metadata?.name || email.split('@')[0]
    const title = metadata?.title || role
    const mockUser = {
      id: 'mock-uuid-' + Date.now(),
      email: email,
      role: role,
      name: name,
      title: title,
      avatar: null
    }
    localStorage.setItem('mock_user', JSON.stringify(mockUser))
    window.dispatchEvent(new Event('mock-auth-change'))
    return {
      user: { id: mockUser.id, email: mockUser.email },
      session: { user: { id: mockUser.id, email: mockUser.email } }
    }
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: metadata?.name,
        role: metadata?.role || 'interviewer',
        title: metadata?.title || metadata?.role || 'interviewer'
      }
    }
  })
  if (error) throw error
  return data
}

export async function signOut() {
  if (!isConfigured) {
    localStorage.removeItem('mock_user')
    window.dispatchEvent(new Event('mock-auth-change'))
    return
  }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  if (!isConfigured) {
    const mockUser = getMockUser()
    if (mockUser && mockUser.id === userId) return mockUser
    return {
      id: userId,
      name: 'Demo User',
      role: 'admin',
      avatar: null
    }
  }
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function updateProfile(userId, updates) {
  if (!isConfigured) {
    const mockUser = getMockUser()
    if (mockUser && mockUser.id === userId) {
      const updated = { ...mockUser, ...updates }
      localStorage.setItem('mock_user', JSON.stringify(updated))
      window.dispatchEvent(new Event('mock-auth-change'))
      return updated
    }
    return mockUser
  }
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getCurrentSession() {
  if (!isConfigured) {
    const mockUser = getMockUser()
    return mockUser ? { user: { id: mockUser.id, email: mockUser.email } } : null
  }
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── JOBS ─────────────────────────────────────────────────────

export async function fetchJobs() {
  if (!isConfigured) {
    return getMockDB('jobs', MOCK_JOBS_DEFAULT)
  }
  const { data, error } = await supabase
    .from('jobs')
    .select('*, profiles(name, avatar)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createJob(job) {
  if (!isConfigured) {
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    const newJob = {
      ...job,
      id: 'job-' + Date.now(),
      created_at: new Date().toISOString()
    }
    jobs.unshift(newJob)
    saveMockDB('jobs', jobs)
    return newJob
  }
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJob(id, updates) {
  if (!isConfigured) {
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    const idx = jobs.findIndex(j => j.id === id)
    if (idx !== -1) {
      jobs[idx] = { ...jobs[idx], ...updates }
      saveMockDB('jobs', jobs)
      return jobs[idx]
    }
    throw new Error('Job not found')
  }
  const { data, error } = await supabase
    .from('jobs')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function resetApplicationScreening(jobId) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const updated = apps.map(a => a.job_id === jobId ? {
      ...a,
      screen_score: null,
      screen_recommendation: null,
      screen_strengths: null,
      screen_gaps: null,
      screen_summary: null,
      experience_match: null,
      skills_match: null,
      education_match: null,
      screened_at: null
    } : a)
    saveMockDB('applications', updated)
    return
  }
  const { error } = await supabase
    .from('applications')
    .update({
      screen_score: null,
      screen_recommendation: null,
      screen_strengths: null,
      screen_gaps: null,
      screen_summary: null,
      experience_match: null,
      skills_match: null,
      education_match: null,
      screened_at: null
    })
    .eq('job_id', jobId)
  if (error) throw error
}

export async function fetchAllApplications() {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    return apps.map(a => ({
      ...a,
      candidates: candidates.find(c => c.id === a.candidate_id) || null,
      jobs: jobs.find(j => j.id === a.job_id) || null
    }))
  }
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(name, email, phone, role, location), jobs(id, title, department, location)')
    .order('applied_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchInterviewApplications() {
  if (!isConfigured) {
    const apps = await fetchAllApplications()
    return apps.filter(a => ['video_interview', 'manual_round'].includes(a.status))
  }
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(*), jobs(id, title, department, location)')
    .in('status', ['video_interview', 'manual_round'])
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data || []).map(app => {
    if (app.candidates) hydrateCandidate(app.candidates)
    return app
  })
}

// ─── CANDIDATES ───────────────────────────────────────────────

export async function fetchCandidates() {
  if (!isConfigured) {
    const list = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    return list.map(c => hydrateCandidate(c))
  }
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('rating', { ascending: false })
  if (error) throw error
  return (data || []).map(c => hydrateCandidate(c))
}

export async function createCandidate(candidate) {
  if (!isConfigured) {
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const newCand = {
      ...candidate,
      id: 'cand-' + Date.now(),
      created_at: new Date().toISOString()
    }
    candidates.push(newCand)
    saveMockDB('candidates', candidates)
    return newCand
  }
  const { data, error } = await supabase
    .from('candidates')
    .insert(candidate)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCandidate(id, updates) {
  if (!isConfigured) {
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const idx = candidates.findIndex(c => c.id === id)
    if (idx !== -1) {
      candidates[idx] = { ...candidates[idx], ...updates, updated_at: new Date().toISOString() }
      saveMockDB('candidates', candidates)
      return candidates[idx]
    }
    return null
  }
  const { data, error } = await supabase
    .from('candidates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── APPLICATIONS ─────────────────────────────────────────────

export async function fetchApplicationsForJob(jobId) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    return apps
      .filter(a => a.job_id === jobId)
      .map(a => ({
        ...a,
        candidates: candidates.find(c => c.id === a.candidate_id) || null
      }))
  }
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(*)')
    .eq('job_id', jobId)
    .order('screen_score', { ascending: false, nullsFirst: false })
  if (error) throw error
  return (data || []).map(app => {
    if (app.candidates) hydrateCandidate(app.candidates)
    return app
  })
}

export async function createApplication(application) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const newApp = {
      ...application,
      id: 'app-' + Date.now(),
      applied_at: new Date().toISOString()
    }
    apps.push(newApp)
    saveMockDB('applications', apps)
    return {
      ...newApp,
      candidates: candidates.find(c => c.id === newApp.candidate_id) || null
    }
  }
  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select('*, candidates(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateApplication(id, updates) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const idx = apps.findIndex(a => a.id === id)
    if (idx !== -1) {
      apps[idx] = { ...apps[idx], ...updates, updated_at: new Date().toISOString() }
      saveMockDB('applications', apps)
      const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
      return {
        ...apps[idx],
        candidates: candidates.find(c => c.id === apps[idx].candidate_id) || null
      }
    }
    throw new Error('Application not found')
  }
  const { data, error } = await supabase
    .from('applications')
    .update(updates)
    .eq('id', id)
    .select('*, candidates(*)')
    .single()
  if (error) throw error
  return data
}

export async function deleteApplication(id) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const filtered = apps.filter(a => a.id !== id)
    saveMockDB('applications', filtered)
    return
  }
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw error
}

export async function fetchApplicationByToken(token) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const app = apps.find(a => a.consent_token === token)
    if (app) {
      return {
        ...app,
        jobs: jobs.find(j => j.id === app.job_id) || null,
        candidates: candidates.find(c => c.id === app.candidate_id) || null
      }
    }
    throw new Error('Application not found')
  }
  const { data, error } = await supabase
    .from('applications')
    .select('*, jobs(*), candidates(*)')
    .eq('consent_token', token)
    .single()
  if (error) throw error
  return data
}

// ─── EMPLOYEES ────────────────────────────────────────────────

export async function fetchEmployees() {
  if (!isConfigured) {
    return getMockDB('employees', MOCK_EMPLOYEES_DEFAULT)
  }
  const { data, error } = await supabase
    .from('employees')
    .select('*, candidates(phone)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map(emp => ({
    ...emp,
    phone: emp.phone || emp.candidates?.phone || ''
  }))
}

export async function createEmployee(employee) {
  if (!isConfigured) {
    const emps = getMockDB('employees', MOCK_EMPLOYEES_DEFAULT)
    const newEmp = {
      ...employee,
      id: 'emp-uuid-' + Date.now(),
      created_at: new Date().toISOString()
    }
    emps.push(newEmp)
    saveMockDB('employees', emps)
    return newEmp
  }
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, updates) {
  if (!isConfigured) {
    const emps = getMockDB('employees', MOCK_EMPLOYEES_DEFAULT)
    const idx = emps.findIndex(e => e.id === id)
    if (idx !== -1) {
      emps[idx] = { ...emps[idx], ...updates, updated_at: new Date().toISOString() }
      saveMockDB('employees', emps)
      return emps[idx]
    }
    throw new Error('Employee not found')
  }
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchCandidatesForTraining() {
  if (!isConfigured) {
    const apps = await fetchAllApplications()
    const emps = getMockDB('employees', MOCK_EMPLOYEES_DEFAULT)
    const enrolledIds = new Set(emps.map(e => e.candidate_id).filter(Boolean))
    const allowedStatuses = ['shortlisted', 'consent_sent', 'consent_accepted', 'interview_scheduled', 'interview_done', 'offer_sent', 'hired']
    return apps.filter(a => a.candidate_id && allowedStatuses.includes(a.status) && !enrolledIds.has(a.candidate_id))
  }
  const [appsRes, empsRes] = await Promise.all([
    supabase
      .from('applications')
      .select('*, candidates(*), jobs(title, department)')
      .in('status', ['shortlisted', 'consent_sent', 'consent_accepted', 'interview_scheduled', 'interview_done', 'offer_sent', 'hired'])
      .order('applied_at', { ascending: false }),
    supabase.from('employees').select('candidate_id').not('candidate_id', 'is', null)
  ])
  if (appsRes.error) throw appsRes.error
  if (empsRes.error) throw empsRes.error
  const enrolledIds = new Set(empsRes.data.map(e => e.candidate_id))
  return appsRes.data.filter(a => a.candidate_id && !enrolledIds.has(a.candidate_id))
}

// ─── TRAINING ─────────────────────────────────────────────────

export async function fetchTrainingModules() {
  if (!isConfigured) {
    return getMockDB('training_modules', MOCK_TRAINING_MODULES_DEFAULT)
  }
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data
}

export async function createTrainingModule(module) {
  if (!isConfigured) {
    const mods = getMockDB('training_modules', MOCK_TRAINING_MODULES_DEFAULT)
    const newMod = {
      ...module,
      id: 'tm-' + Date.now(),
      created_at: new Date().toISOString()
    }
    mods.push(newMod)
    saveMockDB('training_modules', mods)
    return newMod
  }
  const { data, error } = await supabase
    .from('training_modules')
    .insert(module)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadTrainingFile(file, path) {
  if (!isConfigured) {
    return 'https://example.com/mock-training-file.pdf'
  }
  const { data, error } = await supabase.storage
    .from('training-content')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw error
  const { data: { publicUrl } } = supabase.storage
    .from('training-content')
    .getPublicUrl(data.path)
  return publicUrl
}

export async function fetchTrainingProgress(employeeId) {
  if (!isConfigured) {
    const progress = getMockDB('training_progress', [])
    const modules = getMockDB('training_modules', MOCK_TRAINING_MODULES_DEFAULT)
    return progress
      .filter(p => p.employee_id === employeeId)
      .map(p => ({
        ...p,
        training_modules: modules.find(m => m.id === p.module_id) || null
      }))
  }
  const { data, error } = await supabase
    .from('training_progress')
    .select('*, training_modules(*)')
    .eq('employee_id', employeeId)
  if (error) throw error
  return data
}

export async function upsertTrainingProgress(record) {
  if (!isConfigured) {
    const progress = getMockDB('training_progress', [])
    const idx = progress.findIndex(p => p.employee_id === record.employee_id && p.module_id === record.module_id)
    const updatedRecord = {
      id: record.id || 'tp-' + Date.now(),
      ...record,
      updated_at: new Date().toISOString()
    }
    if (idx !== -1) {
      progress[idx] = { ...progress[idx], ...updatedRecord }
    } else {
      progress.push(updatedRecord)
    }
    saveMockDB('training_progress', progress)
    return updatedRecord
  }
  const { data, error } = await supabase
    .from('training_progress')
    .upsert(record)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveQuizResult(result) {
  if (!isConfigured) {
    const results = getMockDB('quiz_results', [])
    const newResult = {
      ...result,
      id: 'qr-' + Date.now(),
      taken_at: new Date().toISOString()
    }
    results.push(newResult)
    saveMockDB('quiz_results', results)
    return newResult
  }
  const { data, error } = await supabase
    .from('quiz_results')
    .insert(result)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── CRM ──────────────────────────────────────────────────────

export async function createLead(lead) {
  if (!isConfigured) {
    const leads = getMockDB('crm_leads', MOCK_CRM_LEADS_DEFAULT)
    const newLead = {
      ...lead,
      id: 'lead-' + Date.now(),
      created_at: new Date().toISOString()
    }
    leads.push(newLead)
    saveMockDB('crm_leads', leads)
    return newLead
  }
  const { data, error } = await supabase
    .from('crm_leads')
    .insert(lead)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createTask(task) {
  if (!isConfigured) {
    const tasks = getMockDB('tasks', MOCK_TASKS_DEFAULT)
    const newTask = {
      ...task,
      id: 'task-' + Date.now(),
      created_at: new Date().toISOString()
    }
    tasks.push(newTask)
    saveMockDB('tasks', tasks)
    return newTask
  }
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchLeads() {
  if (!isConfigured) {
    return getMockDB('crm_leads', MOCK_CRM_LEADS_DEFAULT)
  }
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateLead(id, updates) {
  if (!isConfigured) {
    const leads = getMockDB('crm_leads', MOCK_CRM_LEADS_DEFAULT)
    const idx = leads.findIndex(l => l.id === id)
    if (idx !== -1) {
      leads[idx] = { ...leads[idx], ...updates, updated_at: new Date().toISOString() }
      saveMockDB('crm_leads', leads)
      return leads[idx]
    }
    throw new Error('Lead not found')
  }
  const { data, error } = await supabase
    .from('crm_leads')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function logCall(callLog) {
  if (!isConfigured) {
    const logs = getMockDB('crm_call_logs', [])
    const newLog = {
      ...callLog,
      id: 'call-' + Date.now(),
      called_at: new Date().toISOString()
    }
    logs.push(newLog)
    saveMockDB('crm_call_logs', logs)
    return newLog
  }
  const { data, error } = await supabase
    .from('crm_call_logs')
    .insert(callLog)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── TASKS ────────────────────────────────────────────────────

export async function fetchTasks() {
  if (!isConfigured) {
    return getMockDB('tasks', MOCK_TASKS_DEFAULT)
  }
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('priority', { ascending: false })
  if (error) throw error
  return data
}

export async function completeTask(completion) {
  if (!isConfigured) {
    const comps = getMockDB('task_completions', [])
    const newComp = {
      ...completion,
      id: 'comp-' + Date.now(),
      completed_at: new Date().toISOString()
    }
    comps.push(newComp)
    saveMockDB('task_completions', comps)
    return newComp
  }
  const { data, error } = await supabase
    .from('task_completions')
    .insert(completion)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── CONSENT AUDIT LOGS ───────────────────────────────────────

export async function createConsentAuditLog(log) {
  if (!isConfigured) {
    const logs = getMockDB('consent_audit_logs', [])
    const newLog = {
      ...log,
      id: 'log-' + Date.now(),
      created_at: new Date().toISOString()
    }
    logs.push(newLog)
    saveMockDB('consent_audit_logs', logs)
    return newLog
  }
  try {
    const { data, error } = await supabase
      .from('consent_audit_logs')
      .insert(log)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (err) {
    console.warn('Supabase consent_audit_logs table not found, saving to local store:', err.message)
    const logs = getMockDB('consent_audit_logs', [])
    const newLog = {
      ...log,
      id: 'log-' + Date.now(),
      created_at: new Date().toISOString()
    }
    logs.push(newLog)
    saveMockDB('consent_audit_logs', logs)
    return newLog
  }
}

export async function fetchConsentAuditLogs() {
  if (!isConfigured) {
    return getMockDB('consent_audit_logs', [])
  }
  try {
    const { data, error } = await supabase
      .from('consent_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to fetch from Supabase consent_audit_logs, returning local store:', err.message)
    return getMockDB('consent_audit_logs', [])
  }
}

// ─── ONBOARDING PROGRESS ──────────────────────────────────────

export async function fetchOnboardingProgress(employeeId) {
  if (!isConfigured) {
    const allProgress = getMockDB('onboarding_progress', {})
    if (!allProgress[employeeId]) {
      return {
        employee_id: employeeId,
        docs_offer: false,
        docs_id: false,
        docs_bank: false,
        it_email: false,
        it_laptop: false,
        it_slack: false,
        hr_call: false,
        hr_benefits: false,
        updated_at: new Date().toISOString()
      }
    }
    return allProgress[employeeId]
  }

  try {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .select('*')
      .eq('employee_id', employeeId)
      .maybeSingle()
    
    if (error) throw error
    if (!data) {
      return {
        employee_id: employeeId,
        docs_offer: false,
        docs_id: false,
        docs_bank: false,
        it_email: false,
        it_laptop: false,
        it_slack: false,
        hr_call: false,
        hr_benefits: false,
        updated_at: new Date().toISOString()
      }
    }
    return data
  } catch (err) {
    console.warn('Failed to fetch from Supabase onboarding_progress, returning default template:', err.message)
    return {
      employee_id: employeeId,
      docs_offer: false,
      docs_id: false,
      docs_bank: false,
      it_email: false,
      it_laptop: false,
      it_slack: false,
      hr_call: false,
      hr_benefits: false,
      updated_at: new Date().toISOString()
    }
  }
}

export async function upsertOnboardingProgress(employeeId, record) {
  if (!isConfigured) {
    const allProgress = getMockDB('onboarding_progress', {})
    allProgress[employeeId] = {
      ...allProgress[employeeId],
      ...record,
      employee_id: employeeId,
      updated_at: new Date().toISOString()
    }
    saveMockDB('onboarding_progress', allProgress)
    return allProgress[employeeId]
  }

  try {
    const { data, error } = await supabase
      .from('onboarding_progress')
      .upsert({
        ...record,
        employee_id: employeeId,
        updated_at: new Date().toISOString()
      })
      .select()
      .maybeSingle()
    if (error) throw error
    return data
  } catch (err) {
    console.warn('Failed to upsert to Supabase onboarding_progress, falling back to local storage:', err.message)
    const allProgress = getMockDB('onboarding_progress', {})
    allProgress[employeeId] = {
      ...allProgress[employeeId],
      ...record,
      employee_id: employeeId,
      updated_at: new Date().toISOString()
    }
    saveMockDB('onboarding_progress', allProgress)
    return allProgress[employeeId]
  }
}
