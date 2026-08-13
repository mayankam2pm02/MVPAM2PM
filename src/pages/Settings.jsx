import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { supabase, fetchConsentAuditLogs } from '../lib/supabase.js'
import { getRoleModulePermissions, saveRoleModulePermissions, hasModulePermission } from '../lib/permissions.js'
import {
  Shield, UserPlus, Check, X, Edit2, FileText,
  MoreVertical, ArrowRight, Info, LayoutGrid,
  Briefcase, Calendar, User, CheckSquare,
  BarChart2, GraduationCap, Settings as SettingsIcon,
  Sparkles, Globe, Send, ClipboardList
} from 'lucide-react'


const ROLES_CONFIG = {
  admin:       { label: 'Admin',       color: '#7C3AED', bg: '#F5F3FF', badge: 'Full access' },
  hr:          { label: 'HR Manager',  color: '#2563EB', bg: '#EFF6FF', badge: 'Limited access' },
  manager:     { label: 'Manager',     color: '#10B981', bg: '#ECFDF5', badge: 'View access' },
  interviewer: { label: 'Interviewer', color: '#F59E0B', bg: '#FEF3C7', badge: 'Basic access' },
}

const MODULE_DEFINITIONS = [
  {
    key: 'dashboard', label: 'Dashboard', actions: [{ key: 'view', label: 'View' }],
  },
  {
    key: 'hiring', label: 'Hiring', actions: [{ key: 'view', label: 'View' }, { key: 'create', label: 'Create' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }, { key: 'approve', label: 'Approve' }],
  },
  {
    key: 'interviews', label: 'Interviews', actions: [{ key: 'view', label: 'View' }, { key: 'schedule', label: 'Schedule' }, { key: 'reschedule', label: 'Reschedule' }],
  },
  {
    key: 'candidates', label: 'Candidates', actions: [{ key: 'view', label: 'View' }, { key: 'create', label: 'Create' }, { key: 'edit', label: 'Edit' }],
  },
  {
    key: 'crm', label: 'CRM', actions: [{ key: 'view', label: 'View' }, { key: 'create', label: 'Create' }, { key: 'edit', label: 'Edit' }, { key: 'delete', label: 'Delete' }],
  },
  {
    key: 'reports', label: 'Reports', actions: [{ key: 'view', label: 'View' }, { key: 'export', label: 'Export' }],
  },
  {
    key: 'training', label: 'Training', actions: [{ key: 'view', label: 'View' }, { key: 'create', label: 'Create' }, { key: 'edit', label: 'Edit' }, { key: 'approve', label: 'Approve' }],
  },
  {
    key: 'settings', label: 'Settings', actions: [{ key: 'view', label: 'View' }, { key: 'manage_users', label: 'Manage users' }, { key: 'manage_roles', label: 'Manage roles' }],
  },
]

const ROLE_PERMISSION_PRESETS = {
  admin: Object.fromEntries(MODULE_DEFINITIONS.map(module => [module.key, module.actions.map(action => action.key)])),
  hr: {
    hiring: ['view', 'create', 'edit', 'approve'],
    interviews: ['view', 'schedule', 'reschedule'],
    candidates: ['view', 'create', 'edit'],
    crm: ['view', 'create', 'edit'],
    reports: ['view'],
    training: ['view', 'create', 'edit', 'approve'],
  },
  manager: {
    hiring: ['view'],
    interviews: ['view'],
    candidates: ['view'],
    reports: ['view'],
    training: ['view', 'approve'],
  },
  interviewer: {
    interviews: ['view'],
    candidates: ['view'],
  },
}

const MODULE_ICONS = {
  dashboard:   LayoutGrid,
  hiring:      Briefcase,
  interviews:  Calendar,
  candidates:  User,
  crm:         CheckSquare,
  reports:     BarChart2,
  training:    GraduationCap,
  settings:    SettingsIcon,
}

const ROLE_MODULES_CONFIG = [
  { key: 'dashboard',  label: 'Dashboard',   icon: LayoutGrid,    desc: 'Overview of system analytics and key metrics.' },
  { key: 'hiring',     label: 'Hiring',      icon: Briefcase,     desc: 'Manage job postings and candidate pipelines.' },
  { key: 'interviews', label: 'Interviews',  icon: Calendar,      desc: 'Schedule and manage interviewer panels.' },
  { key: 'candidates', label: 'Candidates',  icon: User,          desc: 'Search and view candidate profiles.' },
  { key: 'onboarding', label: 'Onboarding',  icon: ClipboardList, desc: 'Manage new hire onboarding documents and progress.' },
  { key: 'training',   label: 'Training',    icon: GraduationCap, desc: 'Create and assign training programs.' },
  { key: 'crm',        label: 'Tasks & CRM', icon: CheckSquare,   desc: 'Track customer tasks, interactions, and CRM activities.' },
  { key: 'campaigns',  label: 'Campaigns',   icon: Send,          desc: 'Manage recruitment email and SMS campaigns.' },
  { key: 'portals',    label: 'Job Portals', icon: Globe,         desc: 'Integrate with external job boards like Indeed, LinkedIn.' },
  { key: 'reports',    label: 'Reports',     icon: BarChart2,     desc: 'Generate and export advanced analytics reports.' },
  { key: 'prompts',    label: 'AI Prompts',  icon: Sparkles,      desc: 'Customize system-wide generative AI models and prompts.' },
  { key: 'settings',   label: 'Settings',    icon: SettingsIcon,  desc: 'Manage organization details, roles, and permissions.' }
]


function buildDefaultPermissions(role) {
  const preset = ROLE_PERMISSION_PRESETS[role] || {}
  return Object.fromEntries(MODULE_DEFINITIONS.map(module => [module.key, (preset[module.key] || []).filter(action => module.actions.some(item => item.key === action))]))
}

function normalizePermissions(rawPermissions = {}) {
  return Object.fromEntries(MODULE_DEFINITIONS.map(module => [
    module.key,
    Array.isArray(rawPermissions[module.key]) ? rawPermissions[module.key].filter(action => module.actions.some(item => item.key === action)) : []
  ]))
}

export default function Settings() {
  const { user } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'hr', title: '', permissions: buildDefaultPermissions('hr') })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedRole, setSelectedRole] = useState('hr')
  const [rolePermissions, setRolePermissions] = useState(getRoleModulePermissions())
  const [saveStatus, setSaveStatus] = useState('')
  const [statusTimeoutId, setStatusTimeoutId] = useState(null)

  const handleTogglePermission = (moduleKey, action) => {
    const roleConfig = rolePermissions[selectedRole] || {}
    const moduleConfig = roleConfig[moduleKey] || { view: false, create: false, update: false, delete: false }
    
    const current = typeof moduleConfig === 'object' 
      ? { ...moduleConfig }
      : { view: !!moduleConfig, create: !!moduleConfig, update: !!moduleConfig, delete: !!moduleConfig }
      
    current[action] = !current[action]

    const updated = {
      ...rolePermissions,
      [selectedRole]: {
        ...rolePermissions[selectedRole],
        [moduleKey]: current
      }
    }
    setRolePermissions(updated)
    saveRoleModulePermissions(updated)
    setSaveStatus(`Saved! Updated ${ROLES_CONFIG[selectedRole]?.label || selectedRole} permissions.`)
    
    if (statusTimeoutId) clearTimeout(statusTimeoutId)
    const newTimeoutId = setTimeout(() => setSaveStatus(''), 3000)
    setStatusTimeoutId(newTimeoutId)
  }




  useEffect(() => {
    async function loadProfiles() {
      try {
        const { data, error } = await supabase.from('profiles').select('*')
        if (error) throw error
        setProfiles(data || [])
      } catch (err) {
        console.warn('Failed to load profiles from database, utilizing fallback values.', err)
        // Fallback mock team members matches the mockup screen perfectly
        setProfiles([
          { id: '1', name: 'Priya Sharma', email: 'priya@example.com', role: 'admin', joined_on: 'May 12, 2025', last_active: '2 min ago' },
          { id: '2', name: 'Rohit Kumar', email: 'rohit@example.com', role: 'hr', joined_on: 'May 10, 2025', last_active: '1 hour ago' }
        ])
      } finally {
        setLoading(false)
      }
    }
    loadProfiles()
  }, [])

  if (!hasModulePermission(user?.role, 'settings')) {
    return (
      <div style={{ paddingBottom: 40 }}>
        <div className="page-header">
          <h1>Settings &amp; user profiling</h1>
          <p>Manage team members, roles, and access control.</p>
        </div>
        <div className="card empty-state" style={{ padding: '3rem 2rem', borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
          <div className="icon" style={{ margin: '0 auto 16px', width: 64, height: 64, borderRadius: '50%', background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={32} />
          </div>
          <h3>Access Restricted</h3>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>Only administrators can manage system roles, users, and policy configurations.</p>
        </div>
      </div>
    )
  }

  function handleRoleChange(role) {
    setForm(current => ({ ...current, role, permissions: buildDefaultPermissions(role) }))
  }

  function togglePermission(moduleKey, actionKey) {
    setForm(current => {
      const nextPermissions = { ...current.permissions }
      const nextModulePermissions = new Set(nextPermissions[moduleKey] || [])
      if (nextModulePermissions.has(actionKey)) nextModulePermissions.delete(actionKey)
      else nextModulePermissions.add(actionKey)
      nextPermissions[moduleKey] = Array.from(nextModulePermissions)
      return { ...current, permissions: nextPermissions }
    })
  }

  async function createUser() {
    if (!form.name || !form.email || !form.password) return
    setCreating(true)
    try {
      const permissionsPayload = normalizePermissions(form.permissions)
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email,
        password: form.password,
        email_confirm: true,
        user_metadata: { name: form.name, role: form.role, permissions: permissionsPayload }
      })
      if (error) throw error

      try {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          name: form.name,
          email: form.email,
          title: form.title,
          role: form.role,
          permissions: permissionsPayload,
        })
      } catch (profileError) {
        console.warn('Unable to persist permissions to profiles table:', profileError)
      }

      setMsg(`✅ User ${form.name} created successfully!`)
      setForm({ name: '', email: '', password: '', role: 'hr', title: '', permissions: buildDefaultPermissions('hr') })
      setShowAdd(false)
      // reload
      const { data: updated } = await supabase.from('profiles').select('*')
      if (updated) setProfiles(updated)
    } catch (e) {
      setMsg(`❌ Error: ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'var(--font-body)' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Settings &amp; user profiling</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>Manage team members, roles, and access control.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
            <FileText size={14} /> Access logs
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38 }}>
            <UserPlus size={14} /> Add user
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#ECFDF5' : '#FEF2F2', color: msg.startsWith('✅') ? '#10B981' : '#EF4444', fontSize: 13, marginBottom: 16 }}>
          {msg}
        </div>
      )}

      {/* Add User Slide Panel */}
      {showAdd && (
        <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>New team member</h3>
            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Full name</label><input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
            <div className="form-group"><label>Email</label><input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@company.com" /></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label>Temporary password</label><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" /></div>
            <div className="form-group"><label>Job title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Sales Manager" /></div>
          </div>
          <div className="form-group" style={{ maxWidth: 260 }}>
            <label>System role</label>
            <select value={form.role} onChange={e => handleRoleChange(e.target.value)}>
              {Object.entries(ROLES_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Module permissions</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {MODULE_DEFINITIONS.map(module => (
                <div key={module.key} style={{ background: '#F9FAFB', borderRadius: 10, padding: 14, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-1)' }}>{module.label}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {module.actions.map(action => {
                      const checked = (form.permissions[module.key] || []).includes(action.key)
                      return (
                        <label key={action.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--text-2)', cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => togglePermission(module.key, action.key)} />
                          <span>{action.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
            <button className="btn btn-primary btn-sm" onClick={createUser} disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
          </div>
        </div>
      )}

      {/* Team Members Card */}
      <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF', marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Team members</span>
        </div>

        {/* Supabase Warning Banner */}
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#FFFBEB', border: '1px solid #FEF3C7', borderRadius: 8, fontSize: 12, color: '#D97706', marginBottom: 16, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 14 }}>⚠️</span>
          <span style={{ fontWeight: 500, lineHeight: 1.4 }}>User management requires Supabase Admin API. For the MVP, create users directly in the Supabase dashboard under Authentication &rarr; Users.</span>
        </div>

        {/* Users Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>USER</th>
                <th>ROLE</th>
                <th>STATUS</th>
                <th>JOINED ON</th>
                <th>LAST ACTIVE</th>
                <th style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map(p => {
                const cfg = ROLES_CONFIG[p.role] || { label: p.role?.toUpperCase(), color: '#6B7280', bg: '#F3F4F6' }
                const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'
                return (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                          {initials}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-1)' }}>{p.name || 'Anonymous User'}</div>
                          <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>{p.email || 'no-email@company.com'}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '3px 10px',
                        borderRadius: 99,
                        background: '#ECFDF5',
                        border: '1px solid #A7F3D0',
                        color: '#065F46',
                        fontSize: 11,
                        fontWeight: 600
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
                        Active
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.joined_on || 'May 12, 2025'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.last_active || '2 min ago'}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* View all team members link */}
        <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#4F46E5', cursor: 'pointer' }}>
            View all team members <ArrowRight size={12} />
          </span>
        </div>
      </div>

      {/* Role-Based Module Permissions Panel */}
      <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>Role Permissions Control</h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)' }}>Configure and toggle module permissions for system roles.</p>
          </div>
          
          {saveStatus && (
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#ECFDF5',
              color: '#059669',
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #A7F3D0',
              animation: 'fadeIn 0.2s ease'
            }}>
              <Check size={14} />
              {saveStatus}
            </div>
          )}
        </div>

        {/* Role Selector Card */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
          background: '#F9FAFB',
          border: '1px solid var(--border)',
          borderRadius: 12,
          marginBottom: 24,
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)', margin: 0 }}>Select Role to Edit</label>
            <select 
              value={selectedRole} 
              onChange={(e) => setSelectedRole(e.target.value)} 
              style={{
                width: 200,
                height: 38,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#fff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              {Object.entries(ROLES_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-3)', margin: 0 }}>Access Level</label>
            <span style={{
              display: 'inline-flex',
              alignSelf: 'flex-start',
              padding: '4px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              background: ROLES_CONFIG[selectedRole]?.bg,
              color: ROLES_CONFIG[selectedRole]?.color,
              marginTop: 4
            }}>
              {ROLES_CONFIG[selectedRole]?.badge || ROLES_CONFIG[selectedRole]?.label}
            </span>
          </div>
        </div>

        {/* Modules Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}>
          {ROLE_MODULES_CONFIG.map((module) => {
            const IconComponent = module.icon;
            const currentModulePerms = rolePermissions[selectedRole]?.[module.key] || { view: false, create: false, update: false, delete: false };
            const isEnabled = typeof currentModulePerms === 'object' ? !!currentModulePerms.view : !!currentModulePerms;
            
            return (
              <div 
                key={module.key} 
                style={{
                  background: '#F9FAFB',
                  border: isEnabled ? '1px solid rgba(79, 70, 229, 0.2)' : '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  transition: 'all 0.2s ease',
                  boxShadow: isEnabled ? '0 4px 12px rgba(79, 70, 229, 0.03)' : 'none'
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: isEnabled ? 'rgba(79, 70, 229, 0.08)' : '#E4E7EF',
                    color: isEnabled ? '#4F46E5' : 'var(--text-3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <IconComponent size={18} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                        {module.label}
                      </span>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 4,
                        background: isEnabled ? '#ECFDF5' : '#F3F4F6',
                        color: isEnabled ? '#059669' : 'var(--text-3)'
                      }}>
                        {isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.4, margin: 0 }}>
                      {module.desc}
                    </p>
                  </div>
                </div>

                {/* CRUD Switches */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: 8, 
                  paddingTop: 12, 
                  borderTop: '1px solid var(--border)' 
                }}>
                  {['view', 'create', 'update', 'delete'].map(action => {
                    const actionValue = typeof currentModulePerms === 'object' ? !!currentModulePerms[action] : !!currentModulePerms;
                    return (
                      <label 
                        key={action} 
                        style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          gap: 6, 
                          cursor: 'pointer',
                          padding: '6px 4px',
                          borderRadius: 6,
                          background: actionValue ? 'rgba(79, 70, 229, 0.03)' : 'transparent',
                          border: actionValue ? '1px solid rgba(79, 70, 229, 0.1)' : '1px solid transparent',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="checkbox" 
                          checked={actionValue} 
                          onChange={() => handleTogglePermission(module.key, action)}
                          style={{ cursor: 'pointer', width: 14, height: 14 }}
                        />
                        <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: actionValue ? '#4F46E5' : 'var(--text-3)' }}>
                          {action}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Real-time alert footnote */}
        <div style={{ display: 'flex', gap: 8, padding: 12, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, color: '#1E40AF', alignItems: 'center' }}>
          <Info size={14} color="#2563EB" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 500 }}>Permissions are updated automatically and applied in real-time across the platform.</span>
        </div>
      </div>

    </div>
  )
}
