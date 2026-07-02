import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// ─── AUTH HELPERS ─────────────────────────────────────────────

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function getCurrentSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ─── JOBS ─────────────────────────────────────────────────────

export async function fetchJobs() {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, profiles(name, avatar)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createJob(job) {
  const { data, error } = await supabase
    .from('jobs')
    .insert(job)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJob(id, updates) {
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
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(name, email, phone, role, location), jobs(id, title, department, location)')
    .order('applied_at', { ascending: false })
  if (error) throw error
  return data
}

// ─── INTERVIEW PIPELINE ───────────────────────────────────────

export async function fetchInterviewApplications() {
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(*), jobs(id, title, department, location)')
    .in('status', ['video_interview', 'manual_round'])
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

// ─── CANDIDATES ───────────────────────────────────────────────

export async function fetchCandidates() {
  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .order('rating', { ascending: false })
  if (error) throw error
  return data
}

export async function createCandidate(candidate) {
  const { data, error } = await supabase
    .from('candidates')
    .insert(candidate)
    .select()
    .single()
  if (error) throw error
  return data
}

// ─── APPLICATIONS ─────────────────────────────────────────────

export async function fetchApplicationsForJob(jobId) {
  const { data, error } = await supabase
    .from('applications')
    .select('*, candidates(*)')
    .eq('job_id', jobId)
    .order('screen_score', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data
}

export async function createApplication(application) {
  const { data, error } = await supabase
    .from('applications')
    .insert(application)
    .select('*, candidates(*)')
    .single()
  if (error) throw error
  return data
}

export async function updateApplication(id, updates) {
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
  const { error } = await supabase.from('applications').delete().eq('id', id)
  if (error) throw error
}

export async function fetchApplicationByToken(token) {
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
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createEmployee(employee) {
  const { data, error } = await supabase
    .from('employees')
    .insert(employee)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateEmployee(id, updates) {
  const { data, error } = await supabase
    .from('employees')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// Returns applications (shortlisted and beyond) whose candidates are not yet enrolled in training
export async function fetchCandidatesForTraining() {
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
  const { data, error } = await supabase
    .from('training_modules')
    .select('*')
    .order('order_index')
  if (error) throw error
  return data
}

export async function createTrainingModule(module) {
  const { data, error } = await supabase
    .from('training_modules')
    .insert(module)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function uploadTrainingFile(file, path) {
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
  const { data, error } = await supabase
    .from('training_progress')
    .select('*, training_modules(*)')
    .eq('employee_id', employeeId)
  if (error) throw error
  return data
}

export async function upsertTrainingProgress(record) {
  const { data, error } = await supabase
    .from('training_progress')
    .upsert(record)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function saveQuizResult(result) {
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
  const { data, error } = await supabase
    .from('crm_leads')
    .insert(lead)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createTask(task) {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function fetchLeads() {
  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateLead(id, updates) {
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
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('priority', { ascending: false })
  if (error) throw error
  return data
}

export async function completeTask(completion) {
  const { data, error } = await supabase
    .from('task_completions')
    .insert(completion)
    .select()
    .single()
  if (error) throw error
  return data
}
