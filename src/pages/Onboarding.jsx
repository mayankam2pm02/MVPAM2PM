import { useState, useEffect } from 'react'
import {
  fetchEmployees,
  fetchTrainingModules,
  fetchTrainingProgress,
  fetchOnboardingProgress,
  upsertOnboardingProgress
} from '../lib/supabase.js'
import { sendWhatsAppMessage } from '../lib/twilio.js'
import {
  ClipboardList, CheckCircle2, AlertCircle, Clock,
  Users, CheckSquare, Award, Search, Filter,
  FileText, ShieldAlert, Cpu, Heart, MessageCircle, ChevronDown, Check
} from 'lucide-react'

const ONBOARDING_TASKS = [
  { key: 'docs_offer', label: 'Offer Letter Signed', category: 'Documents', desc: 'Candidate has reviewed and returned the signed offer letter.' },
  { key: 'docs_id', label: 'ID Verification Check', category: 'Documents', desc: 'Government ID documents (Passport, PAN, Aadhaar) uploaded and verified.' },
  { key: 'docs_bank', label: 'Bank & Tax Info', category: 'Documents', desc: 'Direct deposit information and tax withholding forms completed.' },
  { key: 'it_email', label: 'Corporate Email Setup', category: 'IT & Provisioning', desc: 'Create employee Google Workspace or corporate email account.' },
  { key: 'it_laptop', label: 'Laptop Dispatched', category: 'IT & Provisioning', desc: 'Courier dispatch confirmation for IT hardware and laptop package.' },
  { key: 'it_slack', label: 'Slack & Tools Access', category: 'IT & Provisioning', desc: 'Provision user accounts in Slack, GitHub, and internal HR systems.' },
  { key: 'hr_call', label: 'HR Induction Welcome Call', category: 'Welcome Session', desc: 'Completed the general HR welcome alignment and culture call.' },
  { key: 'hr_benefits', label: 'Benefits Walkthrough', category: 'Welcome Session', desc: 'Reviewed healthcare, insurance plans, and leave policies.' }
]

export default function Onboarding() {
  const [employees, setEmployees] = useState([])
  const [modules, setModules] = useState([])
  const [trainingCompleted, setTrainingCompleted] = useState({})
  const [onboardingTasks, setOnboardingTasks] = useState({})
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('all') // all | in_progress | completed
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchTrainingModules()])
      .then(async ([e, m]) => {
        setEmployees(e || [])
        setModules(m || [])

        if (e && e.length > 0) {
          // 1. Fetch training progress map
          const tProgress = await Promise.all(e.map(emp => fetchTrainingProgress(emp.id)))
          const tMap = {}
          e.forEach((emp, i) => {
            const list = tProgress[i] || []
            const doneMap = {}
            list.forEach(p => { doneMap[p.module_id] = true })
            tMap[emp.id] = doneMap
          })
          setTrainingCompleted(tMap)

          // 2. Fetch onboarding checklist map
          const oProgress = await Promise.all(e.map(emp => fetchOnboardingProgress(emp.id)))
          const oMap = {}
          e.forEach((emp, i) => {
            oMap[emp.id] = oProgress[i]
          })
          setOnboardingTasks(oMap)

          // Default selection
          setSelectedEmp(e[0])
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  function selectEmp(emp) {
    setSelectedEmp(emp)
    setMsg('')
  }

  // Get active courses list for selected employee
  function getModsForEmp(emp) {
    if (!emp) return []
    const tag = emp.training_type || 'all'
    return modules.filter(m => {
      if (!m.profile_tags || m.profile_tags.length === 0) return true
      if (m.profile_tags.includes('all')) return true
      return m.profile_tags.includes(tag)
    })
  }

  // Calculate metrics for selected employee
  const empTasksStatus = onboardingTasks[selectedEmp?.id] || {}
  const checklistCount = ONBOARDING_TASKS.filter(t => empTasksStatus[t.key]).length
  const empMods = getModsForEmp(selectedEmp)
  const doneMods = trainingCompleted[selectedEmp?.id] || {}
  const trainingCount = empMods.length ? empMods.filter(m => doneMods[m.id]).length : 0

  const totalPossible = ONBOARDING_TASKS.length + (empMods.length ? 1 : 0)
  const totalCompleted = checklistCount + (empMods.length && trainingCount === empMods.length ? 1 : 0)
  const currentProgress = totalPossible ? Math.round((totalCompleted / totalPossible) * 100) : 0

  // Checklist handler
  async function toggleTask(taskKey) {
    if (!selectedEmp) return
    const currentStatus = !!empTasksStatus[taskKey]
    const updatedRecord = { [taskKey]: !currentStatus }

    try {
      const result = await upsertOnboardingProgress(selectedEmp.id, updatedRecord)
      setOnboardingTasks(prev => ({
        ...prev,
        [selectedEmp.id]: result
      }))
    } catch (e) {
      console.error(e)
    }
  }

  // Send WhatsApp reminder template
  async function handleSendReminder() {
    if (!selectedEmp) return
    if (!selectedEmp.phone) {
      alert('Candidate does not have a phone number registered.')
      return
    }

    const pending = ONBOARDING_TASKS.filter(t => !empTasksStatus[t.key]).map(t => t.label)
    if (empMods.length && trainingCount < empMods.length) {
      pending.push('Pending training courses')
    }

    if (pending.length === 0) {
      alert('All onboarding steps are completed!')
      return
    }

    const company = import.meta.env.VITE_COMPANY_NAME || 'Mr. Manager'
    const body = `Hi ${selectedEmp.name} 👋,

This is a reminder from the ${company} HR team regarding your onboarding checklist. Please complete the following pending tasks:

${pending.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

Let us know if you require any assistance!

Best regards,
HR Team`

    try {
      await sendWhatsAppMessage({ to: selectedEmp.phone, body })
      setMsg(`✅ Onboarding reminder message opened / sent for ${selectedEmp.name}!`)
      setTimeout(() => setMsg(''), 4000)
    } catch (e) {
      alert('Failed to send reminder: ' + e.message)
    }
  }

  // General statistics helper
  const totalEmployees = employees.length
  const completedCount = employees.filter(emp => {
    const status = onboardingTasks[emp.id] || {}
    const cCount = ONBOARDING_TASKS.filter(t => status[t.key]).length
    const mods = getModsForEmp(emp)
    const dMods = trainingCompleted[emp.id] || {}
    const tCompleted = mods.length ? mods.every(m => dMods[m.id]) : true
    return cCount === ONBOARDING_TASKS.length && tCompleted
  }).length

  const inProgressCount = totalEmployees - completedCount

  const progressSum = employees.reduce((sum, emp) => {
    const status = onboardingTasks[emp.id] || {}
    const cCount = ONBOARDING_TASKS.filter(t => status[t.key]).length
    const mods = getModsForEmp(emp)
    const dMods = trainingCompleted[emp.id] || {}
    const tCompleted = mods.length && mods.every(m => dMods[m.id]) ? 1 : 0
    const possible = ONBOARDING_TASKS.length + (mods.length ? 1 : 0)
    const completed = cCount + (mods.length ? tCompleted : 0)
    return sum + (possible ? Math.round((completed / possible) * 100) : 0)
  }, 0)

  const avgProgress = totalEmployees ? Math.round(progressSum / totalEmployees) : 0

  const stats = [
    { label: 'Total Hires Tracking', value: totalEmployees, bg: '#EEF2FF', color: '#4F46E5', icon: Users, subtext: 'In onboarding process' },
    { label: 'Completed Induction', value: completedCount, bg: '#ECFDF5', color: '#10B981', icon: CheckSquare, subtext: 'All tasks checklist checked' },
    { label: 'In Progress Hires', value: inProgressCount, bg: '#EFF6FF', color: '#2563EB', icon: Clock, subtext: 'Pending steps remaining' },
    { label: 'Average Onboarding', value: `${avgProgress}%`, bg: '#F5F3FF', color: '#7C3AED', icon: Award, subtext: 'Across all tracked hires' }
  ]

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.job_title?.toLowerCase().includes(searchTerm.toLowerCase())

    const status = onboardingTasks[emp.id] || {}
    const cCount = ONBOARDING_TASKS.filter(t => status[t.key]).length
    const mods = getModsForEmp(emp)
    const dMods = trainingCompleted[emp.id] || {}
    const tCompleted = mods.length ? mods.every(m => dMods[m.id]) : true
    const isDone = cCount === ONBOARDING_TASKS.length && tCompleted

    if (activeTab === 'in_progress') return matchesSearch && !isDone
    if (activeTab === 'completed') return matchesSearch && isDone
    return matchesSearch
  })

  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-1)', paddingBottom: 40 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Onboarding Tracker</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Monitor and process induction steps, IT hardware supply, and compliance course onboarding.</p>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((card, idx) => (
          <div key={idx} className="card" style={{ padding: 20, borderRadius: 16, background: '#FFF', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: card.bg, color: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <card.icon size={18} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', lineHeight: '1.2' }}>{loading ? '—' : card.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, marginTop: 2 }}>{card.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{card.subtext}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 4, background: '#EFF1F5', padding: 4, borderRadius: 10 }}>
          {[
            ['all', 'All Hires'],
            ['in_progress', 'In Progress'],
            ['completed', 'Completed']
          ].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                border: 'none', outline: 'none', padding: '6px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                background: activeTab === tab ? '#FFF' : 'transparent',
                color: activeTab === tab ? '#4F46E5' : 'var(--text-3)',
                boxShadow: activeTab === tab ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: 280 }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 260 }}>
            <Search size={15} color="var(--text-3)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search employee, role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: 34, height: 38, fontSize: 13, borderRadius: 8, border: '1px solid var(--border)', background: '#FFF', outline: 'none', width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      {employees.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', borderRadius: 16, background: '#FFF', border: '1px solid var(--border)' }}>
          <ClipboardList size={40} color="#4F46E5" style={{ marginBottom: 16, opacity: 0.5 }} />
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No Hires tracked yet</h2>
          <p style={{ color: 'var(--text-3)', fontSize: 13, maxWidth: 380, margin: '0 auto' }}>Go to the Hiring Pipeline and click "Hire" on eligible candidates to automatically track them here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'flex-start' }}>
          {/* Hires Sidebar List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredEmployees.map(emp => {
              const isSelected = selectedEmp?.id === emp.id
              const status = onboardingTasks[emp.id] || {}
              const cCount = ONBOARDING_TASKS.filter(t => status[t.key]).length
              const mods = getModsForEmp(emp)
              const dMods = trainingCompleted[emp.id] || {}
              const tCompleted = mods.length && mods.every(m => dMods[m.id]) ? 1 : 0
              const possible = ONBOARDING_TASKS.length + (mods.length ? 1 : 0)
              const completed = cCount + (mods.length ? tCompleted : 0)
              const pct = possible ? Math.round((completed / possible) * 100) : 0

              return (
                <div
                  key={emp.id}
                  onClick={() => selectEmp(emp)}
                  style={{
                    padding: '12px 14px', borderRadius: 12, background: '#FFF', border: isSelected ? '1.5px solid #4F46E5' : '1px solid var(--border)', cursor: 'pointer',
                    boxShadow: '0 4px 18px rgba(0,0,0,0.01)', transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar" style={{ width: 34, height: 34, fontSize: 11, background: '#EEF2FF', color: '#4F46E5', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {emp.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>{emp.job_title}</div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 800, color: pct === 100 ? '#10B981' : '#4F46E5' }}>{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Selected Hire Details & Milestones */}
          {selectedEmp && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Profile Overview Card */}
              <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                  <div className="avatar" style={{ width: 48, height: 48, fontSize: 14, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {selectedEmp.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{selectedEmp.name}</h3>
                    <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>{selectedEmp.job_title} · {selectedEmp.emp_id} ({selectedEmp.department || 'General'})</p>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '1px 0 0' }}>{selectedEmp.email} {selectedEmp.phone && `· ${selectedEmp.phone}`}</p>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={handleSendReminder} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#16A34A', borderColor: '#BBF7D0', background: '#F0FDF4' }}>
                    <MessageCircle size={14} /> Send WhatsApp Reminder
                  </button>
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                    <span>Onboarding progress</span>
                    <span style={{ color: currentProgress === 100 ? '#10B981' : '#4F46E5' }}>{currentProgress}%</span>
                  </div>
                  <div style={{ height: 8, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${currentProgress}%`, background: currentProgress === 100 ? '#10B981' : '#4F46E5', transition: 'width 0.4s' }} />
                  </div>
                </div>

                {msg && <div style={{ fontSize: 12, color: '#10B981', fontWeight: 600, marginTop: 8 }}>{msg}</div>}
              </div>

              {/* Tasks List */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {/* Milestone Checklist */}
                <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em', margin: '0 0 16px' }}>Milestone Checklist</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {ONBOARDING_TASKS.map(task => {
                      const isChecked = !!empTasksStatus[task.key]
                      return (
                        <div key={task.key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleTask(task.key)}
                            style={{ width: 16, height: 16, accentColor: '#4F46E5', cursor: 'pointer', marginTop: 2 }}
                          />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: isChecked ? 'var(--text-3)' : 'var(--text-1)', textDecoration: isChecked ? 'line-through' : 'none' }}>{task.label}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{task.desc}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Training Progress widget */}
                <div className="card" style={{ padding: 20, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', letterSpacing: '0.04em', margin: '0 0 16px' }}>Training Courses</h4>
                  {empMods.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 12 }}>No training modules assigned to this department.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {empMods.map(mod => {
                        const isDone = !!doneMods[mod.id]
                        return (
                          <div key={mod.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 600 }}>{mod.title}</div>
                              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{mod.type === 'video' ? 'Video' : 'Document'} · {mod.duration || '5 mins'}</div>
                            </div>
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 600,
                              background: isDone ? '#ECFDF5' : '#F3F4F6', color: isDone ? '#065F46' : 'var(--text-3)'
                            }}>
                              {isDone ? <><Check size={10} /> Done</> : 'Pending'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
