import { useState } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { Shield, UserPlus, Check, X, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const ROLES_CONFIG = {
  admin:       { label: 'Admin',       color: 'var(--purple)', bg: 'var(--purple-bg)' },
  hr:          { label: 'HR Manager',  color: 'var(--info)',   bg: 'var(--info-bg)'   },
  manager:     { label: 'Manager',     color: 'var(--brand)',  bg: 'var(--brand-light)'},
  interviewer: { label: 'Interviewer', color: 'var(--text-2)', bg: 'var(--surface-3)' },
}

const PERMISSIONS = {
  admin:       ['All modules', 'Post jobs', 'Manage users', 'Approve training', 'All reports', 'System settings'],
  hr:          ['Post jobs', 'Screen candidates', 'Send consents', 'Schedule interviews', 'Hiring reports', 'Manage training'],
  manager:     ['View pipeline', 'Approve training', 'Team reports', 'Assign tasks'],
  interviewer: ['View candidate profile', 'Submit interview feedback'],
}

export default function Settings() {
  const { user } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'hr', title: '' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg]           = useState('')

  if (user?.role !== 'admin') return (
    <div><div className="page-header"><h1>Settings</h1></div>
    <div className="card empty-state"><div className="icon"><Shield size={36} /></div><h3>Access restricted</h3><p>Only administrators can access this section.</p></div></div>
  )

  async function createUser() {
    if (!form.name || !form.email || !form.password) return
    setCreating(true)
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: form.email, password: form.password, email_confirm: true,
        user_metadata: { name: form.name, role: form.role }
      })
      if (error) throw error
      await supabase.from('profiles').upsert({ id: data.user.id, name: form.name, email: form.email, title: form.title, role: form.role })
      setMsg(`✅ User ${form.name} created successfully!`)
      setForm({ name: '', email: '', password: '', role: 'hr', title: '' })
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
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                {Object.entries(ROLES_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
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
        <h2 style={{ fontSize: 15, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}><Shield size={16} color="var(--brand)" /> Role permissions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {Object.entries(PERMISSIONS).map(([role, perms]) => {
            const cfg = ROLES_CONFIG[role] || {}
            return (
              <div key={role} style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '1rem' }}>
                <span style={{ display: 'inline-flex', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, background: cfg.bg, color: cfg.color, marginBottom: 10 }}>{cfg.label}</span>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {perms.map(p => <li key={p} style={{ fontSize: 12, color: 'var(--text-2)', padding: '3px 0', display: 'flex', gap: 6 }}><Check size={11} color="var(--success)" style={{ flexShrink: 0, marginTop: 2 }} /> {p}</li>)}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
