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

const MOCK_COMPANIES_DEFAULT = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    name: 'Acme Corporation',
    slug: 'acme',
    admin_name: 'Priya Sharma',
    admin_email: 'priya@acme.com',
    status: 'active',
    created_at: new Date(Date.now() - 3600000 * 24 * 30).toISOString()
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    name: 'TechCorp Solutions',
    slug: 'techcorp',
    admin_name: 'Rahul Verma',
    admin_email: 'rahul@techcorp.com',
    status: 'active',
    created_at: new Date(Date.now() - 3600000 * 24 * 14).toISOString()
  }
]

// ─── AUTH HELPERS ─────────────────────────────────────────────

export async function signIn(email, password) {
  const normEmail = (email || '').trim().toLowerCase()
  if (!isConfigured) {
    const customUsers = getMockDB('mock_registered_users', {})
    const matched = customUsers[normEmail]
    
    let role = 'interviewer'
    let name = 'User'
    let companyId = null
    let companyName = null

    if (normEmail === 'mayank@am2pmsupport.com' || normEmail.includes('mayank') || normEmail.includes('superadmin')) {
      role = 'superadmin'
      name = 'Mayank (Super Admin)'
    } else if (matched) {
      role = matched.role || 'admin'
      name = matched.name || 'Client Admin'
      companyId = matched.company_id || null
      companyName = matched.company_name || null
    } else if (normEmail.includes('priya')) {
      role = 'admin'
      name = 'Priya Sharma'
      companyId = 'a0000000-0000-0000-0000-000000000001'
      companyName = 'Acme Corporation'
    } else if (normEmail.includes('rahul')) {
      role = 'hr'
      name = 'Rahul Verma'
      companyId = 'a0000000-0000-0000-0000-000000000001'
      companyName = 'Acme Corporation'
    } else if (normEmail.includes('anita')) {
      role = 'manager'
      name = 'Anita Desai'
      companyId = 'a0000000-0000-0000-0000-000000000001'
      companyName = 'Acme Corporation'
    } else {
      role = 'interviewer'
      name = 'Karan Singh'
    }

    if (role !== 'superadmin' && companyId) {
      const companies = getMockDB('companies', MOCK_COMPANIES_DEFAULT)
      const comp = companies.find(c => c.id === companyId)
      if (comp && (comp.status === 'locked' || comp.status === 'suspended')) {
        throw new Error(`Access Denied: The workspace for "${comp.name}" has been locked by the Super Administrator. Please contact support.`)
      }
    }

    const mockUser = {
      id: matched?.id || ('mock-uuid-' + role),
      email: email,
      role: role,
      name: name,
      title: role === 'superadmin' ? 'Super Administrator' : (role === 'admin' ? 'Client Administrator' : 'Team Member'),
      company_id: companyId,
      company_name: companyName,
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

  // Ensure mayank is recognized as superadmin in Supabase
  if (normEmail === 'mayank@am2pmsupport.com' && data?.user?.id) {
    try {
      await supabase.from('profiles').update({ role: 'superadmin' }).eq('id', data.user.id)
    } catch (e) {
      console.warn('Could not auto-update superadmin role in profiles:', e)
    }
  } else if (data?.user?.id) {
    // Check if user's company is locked
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*, companies(id, name, status)')
        .eq('id', data.user.id)
        .maybeSingle()
      if (prof?.companies && (prof.companies.status === 'locked' || prof.companies.status === 'suspended')) {
        await supabase.auth.signOut()
        throw new Error(`Access Denied: The workspace for "${prof.companies.name}" has been locked by the Super Administrator. Please contact support.`)
      }
    } catch (checkErr) {
      if (checkErr.message?.includes('Access Denied')) throw checkErr
      console.warn('Could not check company lock status:', checkErr)
    }
  }

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
      name: 'Mayank (Super Admin)',
      email: 'mayank@am2pmsupport.com',
      role: 'superadmin',
      title: 'Super Administrator',
      avatar: null
    }
  }

  let profileData = null
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(id, name, logo_url)')
      .eq('id', userId)
      .maybeSingle()
    if (!error && data) {
      profileData = {
        ...data,
        company_name: data.companies?.name || null
      }
    }
  } catch (err) {
    console.warn('Could not query profiles with companies join:', err)
  }

  if (!profileData) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      profileData = data
    } catch (e) {
      console.warn('Could not query profiles basic:', e)
    }
  }
  
  if (profileData) {
    if (profileData.email?.toLowerCase() === 'mayank@am2pmsupport.com') {
      profileData.role = 'superadmin'
      profileData.title = 'Super Administrator'
    }
    return profileData
  }

  // If profile row doesn't exist yet, auto-generate from session user metadata
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const authUser = sessionData?.session?.user
    if (authUser && authUser.id === userId) {
      const isSuper = authUser.email?.toLowerCase() === 'mayank@am2pmsupport.com'
      const fallback = {
        id: userId,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
        email: authUser.email,
        role: isSuper ? 'superadmin' : (authUser.user_metadata?.role || 'employee'),
        title: isSuper ? 'Super Administrator' : (authUser.user_metadata?.title || 'Team Member'),
        company_id: authUser.user_metadata?.company_id || null
      }
      const { data: created } = await supabase
        .from('profiles')
        .upsert(fallback)
        .select()
        .maybeSingle()
      if (created) return created
      return fallback
    }
  } catch (err) {
    console.warn('Could not fallback-create profile:', err)
  }

  return {
    id: userId,
    name: 'User',
    email: '',
    role: 'employee',
    title: 'Team Member'
  }
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
    .upsert({ id: userId, ...updates })
    .select()
    .maybeSingle()
  if (error) {
    console.warn('Profile update warning:', error)
    return { id: userId, ...updates }
  }
  return data || { id: userId, ...updates }
}

export async function getCurrentSession() {
  if (!isConfigured) {
    const mockUser = getMockUser()
    return mockUser ? { user: { id: mockUser.id, email: mockUser.email } } : null
  }
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── COMPANIES (MULTI-TENANCY) ────────────────────────────────

export async function fetchCompanies() {
  if (!isConfigured) {
    return getMockDB('companies', MOCK_COMPANIES_DEFAULT)
  }
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('Could not fetch companies from Supabase, using mock fallback:', error.message)
      return getMockDB('companies', MOCK_COMPANIES_DEFAULT)
    }
    return data && data.length > 0 ? data : getMockDB('companies', MOCK_COMPANIES_DEFAULT)
  } catch (err) {
    console.warn('Error fetching companies:', err)
    return getMockDB('companies', MOCK_COMPANIES_DEFAULT)
  }
}

export async function createCompany({ name, admin_name, admin_email, admin_password }) {
  const newCompanyId = 'comp-' + Date.now()
  const slug = (name || 'company').toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')
  const companyRecord = {
    id: newCompanyId,
    name,
    slug,
    admin_name: admin_name || (name + ' Admin'),
    admin_email,
    status: 'active',
    created_at: new Date().toISOString()
  }

  // 1. Always keep local mock DB updated immediately
  const companies = getMockDB('companies', MOCK_COMPANIES_DEFAULT)
  companies.unshift(companyRecord)
  saveMockDB('companies', companies)

  // 2. Register mock user for this admin so they can login immediately
  const mockUsers = getMockDB('mock_registered_users', {})
  mockUsers[admin_email.toLowerCase()] = {
    id: 'admin-' + Date.now(),
    email: admin_email,
    name: admin_name,
    role: 'admin',
    title: 'Client Administrator',
    company_id: newCompanyId,
    company_name: name,
    password: admin_password
  }
  saveMockDB('mock_registered_users', mockUsers)

  // 3. Supabase integration if configured
  if (isConfigured) {
    try {
      const { data: compData, error: compErr } = await supabase
        .from('companies')
        .insert({
          name,
          slug,
          admin_name,
          admin_email,
          status: 'active'
        })
        .select()
        .single()

      if (!compErr && compData) {
        // Also sign up in Supabase auth if possible
        try {
          await supabase.auth.signUp({
            email: admin_email,
            password: admin_password,
            options: {
              data: {
                name: admin_name,
                role: 'admin',
                title: 'Client Administrator',
                company_id: compData.id
              }
            }
          })
        } catch (e) {
          console.warn('Supabase auth signup attempt:', e.message)
        }
        return compData
      }
    } catch (err) {
      console.warn('Supabase createCompany error, falling back to local:', err)
    }
  }

  return companyRecord
}

export async function updateCompanyStatus(companyId, status) {
  // Normalize status for database compatibility:
  // Supabase check constraint accepts 'active' and 'suspended'
  const isLockRequest = status === 'locked' || status === 'suspended'
  const dbStatus = isLockRequest ? 'suspended' : 'active'

  // 1. Update mock DB
  const companies = getMockDB('companies', MOCK_COMPANIES_DEFAULT)
  const idx = companies.findIndex(c => c.id === companyId)
  if (idx !== -1) {
    companies[idx] = { ...companies[idx], status: dbStatus, updated_at: new Date().toISOString() }
    saveMockDB('companies', companies)
  }

  // 2. Update Supabase if configured
  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from('companies')
        .update({ status: dbStatus, updated_at: new Date().toISOString() })
        .eq('id', companyId)
        .select()
        .maybeSingle()
      if (error) {
        console.warn('Error updating company status in Supabase:', error.message)
      } else if (data) {
        return data
      }
    } catch (err) {
      console.warn('Error updating company status in Supabase:', err)
    }
  }

  return idx !== -1 ? companies[idx] : null
}

// ─── JOBS ─────────────────────────────────────────────────────

export async function fetchJobs(companyId = null) {
  if (!isConfigured) {
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    if (!companyId) return jobs
    return jobs.filter(j => !j.company_id || j.company_id === companyId)
  }
  let query = supabase
    .from('jobs')
    .select('*, profiles(name, avatar)')
    .order('created_at', { ascending: false })
  
  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function createJob(job, companyId = null) {
  const finalJob = { ...job }
  if (companyId && !finalJob.company_id) finalJob.company_id = companyId

  if (!isConfigured) {
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    const newJob = {
      ...finalJob,
      id: 'job-' + Date.now(),
      created_at: new Date().toISOString()
    }
    jobs.unshift(newJob)
    saveMockDB('jobs', jobs)
    return newJob
  }
  const { data, error } = await supabase
    .from('jobs')
    .insert(finalJob)
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

export async function fetchAllApplications(companyId = null) {
  if (!isConfigured) {
    const apps = getMockDB('applications', MOCK_APPLICATIONS_DEFAULT)
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const jobs = getMockDB('jobs', MOCK_JOBS_DEFAULT)
    const mapped = apps.map(a => ({
      ...a,
      candidates: candidates.find(c => c.id === a.candidate_id) || null,
      jobs: jobs.find(j => j.id === a.job_id) || null
    }))
    if (!companyId) return mapped
    return mapped.filter(a => !a.company_id || a.company_id === companyId || (a.jobs && a.jobs.company_id === companyId))
  }
  let query = supabase
    .from('applications')
    .select('*, candidates(name, email, phone, role, location), jobs(id, title, department, location, company_id)')
    .order('applied_at', { ascending: false })
  
  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function fetchInterviewApplications(companyId = null) {
  if (!isConfigured) {
    const apps = await fetchAllApplications(companyId)
    return apps.filter(a => ['video_interview', 'manual_round'].includes(a.status))
  }
  let query = supabase
    .from('applications')
    .select('*, candidates(*), jobs(id, title, department, location, company_id)')
    .in('status', ['video_interview', 'manual_round'])
    .order('updated_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(app => {
    if (app.candidates) hydrateCandidate(app.candidates)
    return app
  })
}

// ─── CANDIDATES ───────────────────────────────────────────────

export async function fetchCandidates(companyId = null) {
  if (!isConfigured) {
    const list = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const filtered = companyId ? list.filter(c => !c.company_id || c.company_id === companyId) : list
    return filtered.map(c => hydrateCandidate(c))
  }
  let query = supabase
    .from('candidates')
    .select('*')
    .order('rating', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(c => hydrateCandidate(c))
}

export async function createCandidate(candidate, companyId = null) {
  const finalCand = { ...candidate }
  if (companyId && !finalCand.company_id) finalCand.company_id = companyId

  if (!isConfigured) {
    const candidates = getMockDB('candidates', MOCK_CANDIDATES_DEFAULT)
    const newCand = {
      ...finalCand,
      id: 'cand-' + Date.now(),
      created_at: new Date().toISOString()
    }
    candidates.push(newCand)
    saveMockDB('candidates', candidates)
    return newCand
  }
  const { data, error } = await supabase
    .from('candidates')
    .insert(finalCand)
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

export async function fetchEmployees(companyId = null) {
  if (!isConfigured) {
    const emps = getMockDB('employees', MOCK_EMPLOYEES_DEFAULT)
    const filtered = companyId ? emps.filter(e => !e.company_id || e.company_id === companyId) : emps
    return filtered.map(emp => ({
      ...emp,
      phone: emp.phone || emp.candidates?.phone || ''
    }))
  }
  let query = supabase
    .from('employees')
    .select('*, candidates(phone)')
    .order('created_at', { ascending: false })

  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(emp => ({
    ...emp,
    phone: emp.phone || emp.candidates?.phone || ''
  }))
}

export async function createEmployee(employee, companyId = null) {
  const finalEmp = { ...employee }
  if (companyId && !finalEmp.company_id) finalEmp.company_id = companyId

  if (!isConfigured) {
    const emps = getMockDB('employees', MOCK_EMPLOYEES_DEFAULT)
    const newEmp = {
      ...finalEmp,
      id: 'emp-uuid-' + Date.now(),
      created_at: new Date().toISOString()
    }
    emps.push(newEmp)
    saveMockDB('employees', emps)
    return newEmp
  }
  const { data, error } = await supabase
    .from('employees')
    .insert(finalEmp)
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
  const getLocalProgress = () => {
    const progress = getMockDB('training_progress', [])
    const modules = getMockDB('training_modules', MOCK_TRAINING_MODULES_DEFAULT)
    return progress
      .filter(p => p.employee_id === employeeId)
      .map(p => ({
        ...p,
        training_modules: modules.find(m => m.id === p.module_id) || null
      }))
  }

  if (!isConfigured) {
    return getLocalProgress()
  }

  try {
    const isUuid = typeof employeeId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employeeId)
    if (!isUuid) {
      return getLocalProgress()
    }

    const { data, error } = await supabase
      .from('training_progress')
      .select('*, training_modules(*)')
      .eq('employee_id', employeeId)

    if (error) {
      console.warn('Supabase fetchTrainingProgress error, falling back to local storage:', error.message)
      return getLocalProgress()
    }

    const localData = getLocalProgress()
    if (!data || data.length === 0) {
      return localData
    }

    const seen = new Set(data.map(p => p.module_id))
    const combined = [...data]
    localData.forEach(lp => {
      if (!seen.has(lp.module_id)) {
        combined.push(lp)
      }
    })
    return combined
  } catch (err) {
    console.warn('Failed to fetch training progress from Supabase, fell back to local storage:', err.message)
    return getLocalProgress()
  }
}

export async function upsertTrainingProgress(record) {
  const status = record.status || (record.completed ? 'completed' : 'in_progress')
  const completedAt = record.completed_at || (status === 'completed' ? (record.updated_at || new Date().toISOString()) : null)

  // 1. Always keep local mock DB updated immediately
  const progress = getMockDB('training_progress', [])
  const idx = progress.findIndex(p => p.employee_id === record.employee_id && p.module_id === record.module_id)
  const localRecord = {
    id: record.id || (idx !== -1 ? progress[idx].id : 'tp-' + Date.now()),
    employee_id: record.employee_id,
    module_id: record.module_id,
    status: status,
    completed: status === 'completed',
    completed_at: completedAt,
    updated_at: new Date().toISOString()
  }
  if (idx !== -1) {
    progress[idx] = { ...progress[idx], ...localRecord }
  } else {
    progress.push(localRecord)
  }
  saveMockDB('training_progress', progress)

  if (!isConfigured) {
    return localRecord
  }

  // 2. If Supabase is configured, sanitize payload to only valid columns:
  // employee_id, module_id, status, completed_at
  try {
    const isUuid = (val) => typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
    if (!isUuid(record.employee_id) || !isUuid(record.module_id)) {
      return localRecord
    }

    const dbRecord = {
      employee_id: record.employee_id,
      module_id: record.module_id,
      status: status,
      completed_at: completedAt
    }
    if (record.id && isUuid(record.id)) {
      dbRecord.id = record.id
    }

    const { data, error } = await supabase
      .from('training_progress')
      .upsert(dbRecord, { onConflict: 'employee_id,module_id' })
      .select()
      .maybeSingle()

    if (error) {
      console.warn('Supabase upsertTrainingProgress error, fallback to local storage:', error.message)
      return localRecord
    }
    return data || localRecord
  } catch (err) {
    console.warn('Failed to upsert training progress to Supabase, fell back to local storage:', err.message)
    return localRecord
  }
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

export async function fetchLeads(companyId = null) {
  if (!isConfigured) {
    const leads = getMockDB('crm_leads', MOCK_CRM_LEADS_DEFAULT)
    if (!companyId) return leads
    return leads.filter(l => !l.company_id || l.company_id === companyId)
  }
  let query = supabase
    .from('crm_leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
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

export async function fetchTasks(companyId = null) {
  if (!isConfigured) {
    const tasks = getMockDB('tasks', MOCK_TASKS_DEFAULT)
    if (!companyId) return tasks
    return tasks.filter(t => !t.company_id || t.company_id === companyId)
  }
  let query = supabase
    .from('tasks')
    .select('*')
    .order('priority', { ascending: false })
  if (companyId) {
    query = query.eq('company_id', companyId)
  }
  const { data, error } = await query
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
      }, { onConflict: 'employee_id' })
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

// ─── ACCESS & SECURITY AUDIT LOGS ──────────────────────────────

const DEFAULT_ACCESS_LOGS = [
  {
    id: 'log-1',
    user_name: 'Mayank Jain',
    user_email: 'mayank@am2pmsupport.com',
    user_role: 'superadmin',
    action: 'SESSION_LOGIN',
    action_label: 'Super Admin Login',
    details: 'Authenticated successfully into TalentOS platform via Supabase Auth',
    ip_address: '103.21.244.18',
    device: 'macOS · Chrome 128',
    status: 'success',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: 'log-2',
    user_name: 'Priya Admin',
    user_email: 'admin@acme.com',
    user_role: 'admin',
    action: 'ROLE_UPDATE',
    action_label: 'Role Permissions Modified',
    details: 'Configured module access for HR Manager role (Hiring & CRM)',
    ip_address: '157.34.89.201',
    device: 'macOS · Safari 17.5',
    status: 'info',
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString()
  },
  {
    id: 'log-3',
    user_name: 'Sujay Dey',
    user_email: 'sujaydey0023@gmail.com',
    user_role: 'employee',
    action: 'USER_INVITE',
    action_label: 'New Account Created',
    details: 'Registered team member account with Employee portal permissions',
    ip_address: '49.37.112.94',
    device: 'Windows · Chrome 127',
    status: 'success',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString()
  },
  {
    id: 'log-4',
    user_name: 'Rajat Gera',
    user_email: 'info@anilfood.com',
    user_role: 'interviewer',
    action: 'SESSION_LOGIN',
    action_label: 'Interviewer Login',
    details: 'Logged into workspace session from authorized IP',
    ip_address: '182.70.14.88',
    device: 'iOS · Mobile Safari',
    status: 'success',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString()
  },
  {
    id: 'log-5',
    user_name: 'Security Guard',
    user_email: 'system@talentos.ai',
    user_role: 'system',
    action: 'FAILED_AUTH_ATTEMPT',
    action_label: 'Unauthorized Attempt Blocked',
    details: 'Invalid credential sequence rejected by rate limiter',
    ip_address: '45.148.10.12',
    device: 'Linux · Unknown client',
    status: 'warning',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString()
  },
  {
    id: 'log-6',
    user_name: 'Priya Admin',
    user_email: 'admin@acme.com',
    user_role: 'admin',
    action: 'STATUS_CHANGE',
    action_label: 'Account Status Modified',
    details: 'User account status toggled to Active',
    ip_address: '157.34.89.201',
    device: 'macOS · Chrome 128',
    status: 'success',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
  }
]

export async function fetchAccessLogs(companyId = null) {
  if (!isConfigured) {
    return getMockDB('access_logs', DEFAULT_ACCESS_LOGS)
  }
  try {
    let query = supabase.from('access_logs').select('*').order('created_at', { ascending: false })
    if (companyId) {
      query = query.eq('company_id', companyId)
    }
    const { data, error } = await query
    if (error) throw error
    if (!data || data.length === 0) {
      return getMockDB('access_logs', DEFAULT_ACCESS_LOGS)
    }
    return data
  } catch (err) {
    console.warn('Failed to fetch from Supabase access_logs, returning fallback/local store:', err.message)
    return getMockDB('access_logs', DEFAULT_ACCESS_LOGS)
  }
}

export async function createAccessLog(log) {
  const newLog = {
    ...log,
    id: 'log-' + Date.now(),
    created_at: log.created_at || new Date().toISOString()
  }

  const currentLogs = getMockDB('access_logs', DEFAULT_ACCESS_LOGS)
  const updatedLogs = [newLog, ...currentLogs]
  saveMockDB('access_logs', updatedLogs)

  if (isConfigured) {
    try {
      await supabase.from('access_logs').insert(log)
    } catch (err) {
      console.warn('Supabase access_logs table write warning (stored locally):', err.message)
    }
  }

  return newLog
}

