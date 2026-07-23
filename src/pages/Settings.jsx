import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { Shield, UserPlus, Check, X, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const ROLES_CONFIG = {
  admin:       { label: 'Admin',       color: 'var(--purple)', bg: 'var(--purple-bg)' },
  hr:          { label: 'HR Manager',  color: 'var(--info)',   bg: 'var(--info-bg)'   },
  manager:     { label: 'Manager',     color: 'var(--brand)',  bg: 'var(--brand-light)'},
  interviewer: { label: 'Interviewer', color: 'var(--text-2)', bg: 'var(--surface-3)' },
  agent:       { label: 'Agent',       color: 'var(--warning)', bg: 'var(--warning-bg)' },
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
  agent: {
    dashboard: ['view'],
    hiring: ['view'],
    interviews: ['view'],
    candidates: ['view'],
    crm: ['view'],
    reports: ['view'],
  },
}

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

  if (user?.role !== 'admin') return (
    <div><div className="page-header"><h1>Settings</h1></div>
    <div className="card empty-state"><div className="icon"><Shield size={36} /></div><h3>Access restricted</h3><p>Only administrators can access this section.</p></div></div>
  )

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
    } catch (e) {
      setMsg(`❌ Error: ${e.message}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="page-header"><h1>Settings &amp; user profiling</h1><p>Manage team members, roles, and access control.</p></div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Team members</span>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(!showAdd)}><UserPlus size={13} /> Add user</button>
        </div>

        {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.startsWith('✅') ? 'var(--success)' : 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{msg}</div>}

        {showAdd && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.25rem', border: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '1rem' }}>New team member</div>
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

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Module permissions</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                {MODULE_DEFINITIONS.map(module => (
                  <div key={module.key} style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '0.9rem', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{module.label}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {module.actions.map(action => {
                        const checked = (form.permissions[module.key] || []).includes(action.key)
                        return (
                          <label key={action.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-2)' }}>
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

            <div style={{ display: 'flex', gap: 8, marginTop: '1rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={createUser} disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
            </div>
          </div>
        )}

        <div style={{ padding: '1rem', background: 'var(--warning-bg)', borderRadius: 8, fontSize: 13, color: 'var(--warning)' }}>
          ⚠️ User management requires Supabase Admin API. For the MVP, create users directly in the Supabase dashboard under Authentication → Users.
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 15, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={16} color="var(--brand)" /> Permission presets</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {Object.entries(ROLE_PERMISSION_PRESETS).map(([role, preset]) => {
            const cfg = ROLES_CONFIG[role] || {}
            return (
              <div key={role} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '1rem' }}>
                <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, marginBottom: 10 }}>{cfg.label}</span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {Object.entries(preset).map(([moduleKey, actions]) => (
                    <li key={`${role}-${moduleKey}`} style={{ fontSize: 12, color: 'var(--text-2)', padding: '3px 0' }}>
                      <strong>{moduleKey}</strong>: {actions.join(', ')}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
