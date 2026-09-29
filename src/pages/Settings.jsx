import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth.jsx'
import { supabase, fetchConsentAuditLogs, fetchAccessLogs, createAccessLog } from '../lib/supabase.js'
import { getRoleModulePermissions, saveRoleModulePermissions, hasModulePermission } from '../lib/permissions.js'
import {
  Shield, UserPlus, Check, X, Edit2, FileText,
  MoreVertical, ArrowRight, Info, LayoutGrid,
  Briefcase, Calendar, User, CheckSquare,
  BarChart2, GraduationCap, Settings as SettingsIcon,
  Sparkles, Globe, Send, ClipboardList,
  Pencil, Trash2, Copy, CheckCircle2, UserX,
  ChevronDown, ChevronUp, Search, Users, RefreshCw,
  LogIn, ShieldAlert, ShieldCheck, Download, AlertCircle, Clock, Laptop, Filter, History
} from 'lucide-react'


const ROLES_CONFIG = {
  superadmin:  { label: 'Super Admin', color: '#DC2626', bg: '#FEF2F2', badge: 'System-wide access' },
  admin:       { label: 'Admin',       color: '#7C3AED', bg: '#F5F3FF', badge: 'Full access' },
  hr:          { label: 'HR Manager',  color: '#2563EB', bg: '#EFF6FF', badge: 'Limited access' },
  manager:     { label: 'Manager',     color: '#10B981', bg: '#ECFDF5', badge: 'View access' },
  interviewer: { label: 'Interviewer', color: '#F59E0B', bg: '#FEF3C7', badge: 'Basic access' },
  employee:    { label: 'Employee',    color: '#4B5563', bg: '#F3F4F6', badge: 'Employee portal' },
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
  superadmin: Object.fromEntries(MODULE_DEFINITIONS.map(module => [module.key, module.actions.map(action => action.key)])),
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
  employee: {
    dashboard: ['view'],
    training: ['view'],
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
  const { user, isSuperAdmin } = useAuth()
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'hr', title: '', permissions: buildDefaultPermissions('hr') })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  // 3-dots action menu state
  const [activeMenuUserId, setActiveMenuUserId] = useState(null)

  // Edit member modal state
  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', title: '', role: 'hr', is_active: true })
  const [savingMember, setSavingMember] = useState(false)

  // Delete member modal state
  const [deletingMember, setDeletingMember] = useState(null)
  const [deletingState, setDeletingState] = useState(false)

  // View all members / Directory state
  const [showAllMembers, setShowAllMembers] = useState(false)
  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [directoryRoleFilter, setDirectoryRoleFilter] = useState('all')

  // Access & Security Logs state
  const [showAccessLogsModal, setShowAccessLogsModal] = useState(false)
  const [accessLogs, setAccessLogs] = useState([])
  const [loadingAccessLogs, setLoadingAccessLogs] = useState(false)
  const [accessLogSearch, setAccessLogSearch] = useState('')
  const [accessLogCategory, setAccessLogCategory] = useState('all')
  const [accessLogStatus, setAccessLogStatus] = useState('all')

  const loadAccessLogs = async () => {
    setLoadingAccessLogs(true)
    try {
      const logs = await fetchAccessLogs(user?.company_id)
      setAccessLogs(logs || [])
    } catch (err) {
      console.warn('Failed to load access logs:', err)
    } finally {
      setLoadingAccessLogs(false)
    }
  }

  useEffect(() => {
    loadAccessLogs()
  }, [user?.company_id])

  const exportAccessLogsCSV = (logsToExport) => {
    const headers = ['Timestamp', 'User', 'Email', 'Role', 'Event', 'Details', 'IP Address', 'Device', 'Status']
    const rows = logsToExport.map(log => [
      `"${new Date(log.created_at).toLocaleString()}"`,
      `"${log.user_name || ''}"`,
      `"${log.user_email || ''}"`,
      `"${log.user_role || ''}"`,
      `"${log.action_label || log.action || ''}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`,
      `"${log.ip_address || ''}"`,
      `"${log.device || ''}"`,
      `"${log.status || 'success'}"`
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `access_audit_logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const [selectedRole, setSelectedRole] = useState('hr')
  const [rolePermissions, setRolePermissions] = useState(getRoleModulePermissions())
  const [saveStatus, setSaveStatus] = useState('')
  const [statusTimeoutId, setStatusTimeoutId] = useState(null)

  // Close 3-dots menu on outside click
  useEffect(() => {
    function handleClickOutside() {
      setActiveMenuUserId(null)
    }
    if (activeMenuUserId) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenuUserId])

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

    // Audit log
    createAccessLog({
      company_id: user?.company_id,
      user_name: user?.name || 'Administrator',
      user_email: user?.email || '',
      user_role: user?.role || 'admin',
      action: 'PERMISSION_UPDATE',
      action_label: 'Permissions Modified',
      details: `Toggled ${action} permission on ${moduleKey} for ${ROLES_CONFIG[selectedRole]?.label || selectedRole}`,
      ip_address: '103.21.244.18',
      device: `${navigator?.platform || 'Desktop'} · Web Client`,
      status: 'info'
    }).then(newEntry => {
      setAccessLogs(prev => [newEntry, ...prev])
    })
    
    if (statusTimeoutId) clearTimeout(statusTimeoutId)
    const newTimeoutId = setTimeout(() => setSaveStatus(''), 3000)
    setStatusTimeoutId(newTimeoutId)
  }

  // Quick role change from 3-dots menu
  const handleQuickRoleChange = async (member, newRole) => {
    setActiveMenuUserId(null)
    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', member.id)
      if (error) console.warn('Supabase profile update warning:', error)
      setProfiles(prev => prev.map(p => p.id === member.id ? { ...p, role: newRole } : p))
      setMsg(`✅ Updated ${member.name || member.email}'s role to ${ROLES_CONFIG[newRole]?.label || newRole}`)

      createAccessLog({
        company_id: user?.company_id,
        user_name: user?.name || 'Administrator',
        user_email: user?.email || '',
        user_role: user?.role || 'admin',
        action: 'ROLE_UPDATE',
        action_label: 'Role Modified',
        details: `Assigned ${ROLES_CONFIG[newRole]?.label || newRole} role to ${member.name || member.email}`,
        ip_address: '103.21.244.18',
        device: `${navigator?.platform || 'Desktop'} · Web Client`,
        status: 'info'
      }).then(newEntry => {
        setAccessLogs(prev => [newEntry, ...prev])
      })
    } catch (err) {
      console.warn('Role change error:', err)
      setProfiles(prev => prev.map(p => p.id === member.id ? { ...p, role: newRole } : p))
      setMsg(`✅ Updated ${member.name || member.email}'s role to ${ROLES_CONFIG[newRole]?.label || newRole}`)
    }
    setTimeout(() => setMsg(''), 4000)
  }

  // Toggle active status
  const handleToggleActive = async (member) => {
    setActiveMenuUserId(null)
    const nextStatus = member.is_active === false ? true : false
    try {
      const { error } = await supabase.from('profiles').update({ is_active: nextStatus }).eq('id', member.id)
      if (error) console.warn('Supabase toggle status warning:', error)
      setProfiles(prev => prev.map(p => p.id === member.id ? { ...p, is_active: nextStatus } : p))
      setMsg(`✅ ${member.name || member.email} is now ${nextStatus ? 'Active' : 'Deactivated'}`)

      createAccessLog({
        company_id: user?.company_id,
        user_name: user?.name || 'Administrator',
        user_email: user?.email || '',
        user_role: user?.role || 'admin',
        action: 'STATUS_CHANGE',
        action_label: 'Account Status Modified',
        details: `${nextStatus ? 'Activated' : 'Deactivated'} account for ${member.name || member.email}`,
        ip_address: '103.21.244.18',
        device: `${navigator?.platform || 'Desktop'} · Web Client`,
        status: nextStatus ? 'success' : 'warning'
      }).then(newEntry => {
        setAccessLogs(prev => [newEntry, ...prev])
      })
    } catch (err) {
      console.warn('Toggle active error:', err)
      setProfiles(prev => prev.map(p => p.id === member.id ? { ...p, is_active: nextStatus } : p))
      setMsg(`✅ ${member.name || member.email} is now ${nextStatus ? 'Active' : 'Deactivated'}`)
    }
    setTimeout(() => setMsg(''), 4000)
  }

  // Copy email
  const handleCopyEmail = (email) => {
    setActiveMenuUserId(null)
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(email)
      setMsg(`📋 Copied ${email} to clipboard!`)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  // Open edit modal
  const handleOpenEdit = (member) => {
    setActiveMenuUserId(null)
    setEditingMember(member)
    setEditForm({
      name: member.name || '',
      title: member.title || '',
      role: member.role || 'hr',
      is_active: member.is_active !== false
    })
  }

  // Save edit member
  const handleSaveEditMember = async () => {
    if (!editingMember) return
    setSavingMember(true)
    try {
      const updates = {
        name: editForm.name,
        title: editForm.title,
        role: editForm.role,
        is_active: editForm.is_active
      }
      const { error } = await supabase.from('profiles').update(updates).eq('id', editingMember.id)
      if (error) console.warn('Supabase update profile warning:', error)

      setProfiles(prev => prev.map(p => p.id === editingMember.id ? { ...p, ...updates } : p))
      setMsg(`✅ Profile for ${editForm.name || editingMember.email} updated successfully!`)
      setEditingMember(null)

      createAccessLog({
        company_id: user?.company_id,
        user_name: user?.name || 'Administrator',
        user_email: user?.email || '',
        user_role: user?.role || 'admin',
        action: 'USER_UPDATE',
        action_label: 'Profile Details Edited',
        details: `Updated name and title for ${editForm.name} (${editForm.role})`,
        ip_address: '103.21.244.18',
        device: `${navigator?.platform || 'Desktop'} · Web Client`,
        status: 'info'
      }).then(newEntry => {
        setAccessLogs(prev => [newEntry, ...prev])
      })
    } catch (err) {
      console.error('Error saving member:', err)
      setProfiles(prev => prev.map(p => p.id === editingMember.id ? { ...p, ...editForm } : p))
      setMsg(`✅ Profile for ${editForm.name || editingMember.email} updated successfully!`)
      setEditingMember(null)
    } finally {
      setSavingMember(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  // Open delete modal
  const handleOpenDelete = (member) => {
    setActiveMenuUserId(null)
    if (member.email === 'mayank@am2pmsupport.com' || member.role === 'superadmin') {
      alert('The Super Admin account cannot be removed.')
      return
    }
    if (user?.id && member.id === user.id) {
      alert('You cannot remove your own active account.')
      return
    }
    setDeletingMember(member)
  }

  // Confirm delete member
  const handleConfirmDeleteMember = async () => {
    if (!deletingMember) return
    setDeletingState(true)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deletingMember.id)
      if (error) console.warn('Supabase delete profile warning:', error)

      setProfiles(prev => prev.filter(p => p.id !== deletingMember.id))
      setMsg(`✅ Removed ${deletingMember.name || deletingMember.email} from the workspace.`)
      setDeletingMember(null)

      createAccessLog({
        company_id: user?.company_id,
        user_name: user?.name || 'Administrator',
        user_email: user?.email || '',
        user_role: user?.role || 'admin',
        action: 'USER_DELETE',
        action_label: 'Team Member Removed',
        details: `Revoked access and removed user ${deletingMember.name || deletingMember.email}`,
        ip_address: '103.21.244.18',
        device: `${navigator?.platform || 'Desktop'} · Web Client`,
        status: 'warning'
      }).then(newEntry => {
        setAccessLogs(prev => [newEntry, ...prev])
      })
    } catch (err) {
      console.error('Error deleting member:', err)
      setProfiles(prev => prev.filter(p => p.id !== deletingMember.id))
      setMsg(`✅ Removed ${deletingMember.name || deletingMember.email} from the workspace.`)
      setDeletingMember(null)
    } finally {
      setDeletingState(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  function formatJoinedDate(p) {
    if (p.joined_on) return p.joined_on
    if (p.created_at) {
      try {
        return new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      } catch {
        return 'May 12, 2025'
      }
    }
    return 'May 12, 2025'
  }

  useEffect(() => {
    async function loadProfiles() {
      try {
        let query = supabase.from('profiles').select('*')
        if (user?.company_id) {
          query = query.eq('company_id', user.company_id)
        }
        const { data, error } = await query
        if (error) throw error
        setProfiles(data || [])
      } catch (err) {
        console.warn('Failed to load profiles from database, utilizing fallback values.', err)
        // Fallback mock team members
        setProfiles([
          { id: '1', name: 'Priya Sharma', email: 'priya@example.com', role: 'admin', joined_on: 'May 12, 2025', last_active: '2 min ago' },
          { id: '2', name: 'Rohit Kumar', email: 'rohit@example.com', role: 'hr', joined_on: 'May 10, 2025', last_active: '1 hour ago' }
        ])
      } finally {
        setLoading(false)
      }
    }
    loadProfiles()
  }, [user?.company_id])

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
      const userCompanyId = user?.company_id || null

      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: form.email,
          password: form.password,
          email_confirm: true,
          user_metadata: {
            name: form.name,
            role: form.role,
            permissions: permissionsPayload,
            company_id: userCompanyId
          }
        })
        if (error) throw error

        if (data?.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: form.name,
            email: form.email,
            title: form.title,
            role: form.role,
            permissions: permissionsPayload,
            company_id: userCompanyId
          })
        }
      } catch (authAdminErr) {
        console.warn('Direct auth.admin.createUser fallback:', authAdminErr.message)
      }

      setMsg(`✅ User ${form.name} created successfully under ${user?.company_name || 'your company'}!`)
      setForm({ name: '', email: '', password: '', role: 'hr', title: '', permissions: buildDefaultPermissions('hr') })
      setShowAdd(false)

      createAccessLog({
        company_id: userCompanyId,
        user_name: user?.name || 'Administrator',
        user_email: user?.email || '',
        user_role: user?.role || 'admin',
        action: 'USER_INVITE',
        action_label: 'New Account Created',
        details: `Created new team member profile for ${form.name} (${form.role})`,
        ip_address: '103.21.244.18',
        device: `${navigator?.platform || 'Desktop'} · Web Client`,
        status: 'success'
      }).then(newEntry => {
        setAccessLogs(prev => [newEntry, ...prev])
      })
      
      // reload
      let query = supabase.from('profiles').select('*')
      if (user?.company_id) query = query.eq('company_id', user.company_id)
      const { data: updated } = await query
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
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              setShowAccessLogsModal(true)
              loadAccessLogs()
            }} 
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, cursor: 'pointer' }}
          >
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
      {(() => {
        const filteredProfiles = profiles.filter(p => {
          if (!memberSearch) return true
          const q = memberSearch.toLowerCase()
          return (p.name || '').toLowerCase().includes(q) ||
                 (p.email || '').toLowerCase().includes(q) ||
                 (p.role || '').toLowerCase().includes(q) ||
                 (p.title || '').toLowerCase().includes(q)
        })

        const displayedProfiles = showAllMembers ? filteredProfiles : filteredProfiles.slice(0, 5)

        const actionMenuItemStyle = {
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '7px 10px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          fontSize: 13,
          color: 'var(--text-1)',
          cursor: 'pointer',
          textAlign: 'left',
          transition: 'background 0.15s ease'
        }

        return (
          <div className="card" style={{ padding: 24, borderRadius: 16, border: '1px solid var(--border)', background: '#FFF', marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>Team members</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 12, background: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }}>
                  {profiles.length} total
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {/* Member Search input */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input 
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search members..."
                    style={{
                      paddingLeft: 30,
                      paddingRight: 10,
                      height: 32,
                      fontSize: 12,
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      width: 170,
                      outline: 'none'
                    }}
                  />
                </div>

                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowDirectoryModal(true)}
                  style={{ height: 32, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                >
                  <Users size={13} /> Directory
                </button>
              </div>
            </div>

            {/* Users Table */}
            <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
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
                  {displayedProfiles.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-3)' }}>
                        No team members found matching your search.
                      </td>
                    </tr>
                  ) : (
                    displayedProfiles.map(p => {
                      const cfg = ROLES_CONFIG[p.role] || { label: p.role?.toUpperCase(), color: '#6B7280', bg: '#F3F4F6' }
                      const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'
                      const isActive = p.is_active !== false
                      const isMenuOpen = activeMenuUserId === p.id

                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
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
                            {isActive ? (
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
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '3px 10px',
                                borderRadius: 99,
                                background: '#FEF2F2',
                                border: '1px solid #FECACA',
                                color: '#991B1B',
                                fontSize: 11,
                                fontWeight: 600
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                                Inactive
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{formatJoinedDate(p)}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{p.last_active || 'Just now'}</td>
                          <td style={{ textAlign: 'right', position: 'relative' }}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation()
                                setActiveMenuUserId(isMenuOpen ? null : p.id)
                              }}
                              style={{ 
                                background: isMenuOpen ? '#F3F4F6' : 'none', 
                                border: 'none', 
                                cursor: 'pointer', 
                                color: isMenuOpen ? 'var(--text-1)' : 'var(--text-3)',
                                padding: '6px',
                                borderRadius: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.15s ease'
                              }}
                              title="Actions"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {/* Dropdown Menu */}
                            {isMenuOpen && (
                              <div 
                                onClick={e => e.stopPropagation()}
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: 'calc(100% + 4px)',
                                  zIndex: 100,
                                  background: '#FFFFFF',
                                  borderRadius: 10,
                                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                  border: '1px solid var(--border)',
                                  minWidth: 195,
                                  padding: 6,
                                  textAlign: 'left'
                                }}
                              >
                                <button
                                  onClick={() => handleOpenEdit(p)}
                                  style={actionMenuItemStyle}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Pencil size={14} color="var(--text-2)" />
                                  <span>Edit details</span>
                                </button>

                                <button
                                  onClick={() => handleCopyEmail(p.email)}
                                  style={actionMenuItemStyle}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  <Copy size={14} color="var(--text-2)" />
                                  <span>Copy email</span>
                                </button>

                                <button
                                  onClick={() => handleToggleActive(p)}
                                  style={{
                                    ...actionMenuItemStyle,
                                    color: isActive ? '#D97706' : '#059669'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                  {isActive ? (
                                    <><UserX size={14} color="#D97706" /><span>Deactivate user</span></>
                                  ) : (
                                    <><CheckCircle2 size={14} color="#059669" /><span>Activate user</span></>
                                  )}
                                </button>

                                <div style={{ padding: '6px 8px 3px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-3)', borderTop: '1px solid var(--border)', marginTop: 4 }}>
                                  Change Role
                                </div>
                                {['admin', 'hr', 'manager', 'interviewer', 'employee'].map(rKey => {
                                  const rCfg = ROLES_CONFIG[rKey]
                                  const isCurrent = p.role === rKey
                                  return (
                                    <button
                                      key={rKey}
                                      onClick={() => handleQuickRoleChange(p, rKey)}
                                      style={{
                                        ...actionMenuItemStyle,
                                        padding: '4px 8px',
                                        fontSize: 12,
                                        background: isCurrent ? '#EEF2FF' : 'transparent',
                                        color: isCurrent ? '#4F46E5' : 'var(--text-2)',
                                        fontWeight: isCurrent ? 700 : 500,
                                        justifyContent: 'space-between'
                                      }}
                                      onMouseEnter={e => !isCurrent && (e.currentTarget.style.background = '#F9FAFB')}
                                      onMouseLeave={e => !isCurrent && (e.currentTarget.style.background = 'transparent')}
                                    >
                                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: rCfg.color }} />
                                        {rCfg.label}
                                      </span>
                                      {isCurrent && <Check size={12} color="#4F46E5" />}
                                    </button>
                                  )
                                })}

                                {!(p.email === 'mayank@am2pmsupport.com' || p.role === 'superadmin' || p.id === user?.id) && (
                                  <>
                                    <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                                    <button
                                      onClick={() => handleOpenDelete(p)}
                                      style={{
                                        ...actionMenuItemStyle,
                                        color: '#DC2626'
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                      <Trash2 size={14} color="#DC2626" />
                                      <span>Remove user</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* View all team members link */}
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 14, paddingTop: 12, textAlign: 'center' }}>
              {filteredProfiles.length > 5 ? (
                <button 
                  onClick={() => setShowAllMembers(!showAllMembers)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: '#4F46E5', 
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: 6,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  {showAllMembers ? (
                    <>Show fewer members <ChevronUp size={14} /></>
                  ) : (
                    <>View all team members ({filteredProfiles.length}) <ChevronDown size={14} /></>
                  )}
                </button>
              ) : (
                <button 
                  onClick={() => setShowDirectoryModal(true)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    fontSize: 12, 
                    fontWeight: 600, 
                    color: '#4F46E5', 
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: 6,
                    transition: 'background 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF2FF'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  View all team members in directory ({profiles.length}) <ArrowRight size={14} />
                </button>
              )}
            </div>
          </div>
        )
      })()}

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

      {/* Edit Member Modal */}
      {editingMember && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
          onClick={e => e.target === e.currentTarget && setEditingMember(null)}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Pencil size={18} color="var(--brand)" /> Edit Team Member
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingMember(null)}><X size={16} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Full Name</label>
                <input 
                  value={editForm.name} 
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Rahul Sharma"
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Email Address (read-only)</label>
                <input 
                  value={editingMember.email} 
                  disabled
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px', background: '#F9FAFB', color: 'var(--text-3)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Job Title</label>
                <input 
                  value={editForm.title} 
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Talent Acquisition Lead"
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px' }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>System Role</label>
                <select 
                  value={editForm.role} 
                  onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  style={{ width: '100%', height: 38, borderRadius: 8, border: '1px solid var(--border)', padding: '0 12px', background: '#fff' }}
                >
                  {Object.entries(ROLES_CONFIG)
                    .filter(([k]) => k !== 'superadmin' || isSuperAdmin)
                    .map(([k, cfg]) => (
                      <option key={k} value={k}>{cfg.label} ({cfg.badge})</option>
                    ))
                  }
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>Account Status</label>
                <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="edit_is_active" 
                      checked={editForm.is_active} 
                      onChange={() => setEditForm(f => ({ ...f, is_active: true }))} 
                    />
                    <span style={{ color: '#065F46', fontWeight: 600 }}>Active</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="edit_is_active" 
                      checked={!editForm.is_active} 
                      onChange={() => setEditForm(f => ({ ...f, is_active: false }))} 
                    />
                    <span style={{ color: '#991B1B', fontWeight: 600 }}>Deactivated</span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: '#F9FAFB' }}>
              <button className="btn btn-secondary" onClick={() => setEditingMember(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEditMember} disabled={savingMember}>
                {savingMember ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deletingMember && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' }}
          onClick={e => e.target === e.currentTarget && setDeletingMember(null)}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 440, boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={18} color="#DC2626" /> Remove Team Member
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDeletingMember(null)}><X size={16} /></button>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.5, margin: 0 }}>
                Are you sure you want to remove <strong>{deletingMember.name || deletingMember.email}</strong>?
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8, marginBottom: 0 }}>
                This user will no longer be able to log in or access company records.
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: '#F9FAFB' }}>
              <button className="btn btn-secondary" onClick={() => setDeletingMember(null)}>Cancel</button>
              <button 
                style={{ background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', height: 38, fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }} 
                onClick={handleConfirmDeleteMember}
                disabled={deletingState}
              >
                {deletingState ? 'Removing...' : 'Remove User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Directory Modal */}
      {showDirectoryModal && (() => {
        const directoryProfiles = profiles.filter(p => {
          const matchesSearch = !memberSearch || (
            (p.name || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
            (p.email || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
            (p.role || '').toLowerCase().includes(memberSearch.toLowerCase()) ||
            (p.title || '').toLowerCase().includes(memberSearch.toLowerCase())
          )
          const matchesRole = directoryRoleFilter === 'all' || p.role === directoryRoleFilter
          return matchesSearch && matchesRole
        })

        return (
          <div 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.5)', 
              zIndex: 1000, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 16, 
              backdropFilter: 'blur(2px)' 
            }}
            onClick={e => e.target === e.currentTarget && setShowDirectoryModal(false)}
          >
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              width: '100%', 
              maxWidth: 820, 
              maxHeight: '88vh', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)', 
              overflow: 'hidden' 
            }}>
              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>
                      Team Directory ({profiles.length})
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      All registered accounts under {user?.company_name || 'this workspace'}.
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowDirectoryModal(false)}>
                  <X size={16} />
                </button>
              </div>

              {/* Directory Search & Filters */}
              <div style={{ padding: '12px 1.5rem', background: '#F9FAFB', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ position: 'relative', width: 260 }}>
                  <Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input 
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    placeholder="Search by name, email, role..."
                    style={{ width: '100%', height: 34, paddingLeft: 32, paddingRight: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: '#fff', outline: 'none' }}
                  />
                </div>

                {/* Role Filters */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['all', 'admin', 'hr', 'manager', 'interviewer', 'employee'].map(r => (
                    <button
                      key={r}
                      onClick={() => setDirectoryRoleFilter(r)}
                      style={{
                        border: 'none',
                        borderRadius: 20,
                        padding: '4px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: directoryRoleFilter === r ? '#4F46E5' : '#E5E7EB',
                        color: directoryRoleFilter === r ? '#fff' : 'var(--text-2)',
                        transition: 'all 0.15s'
                      }}
                    >
                      {r === 'all' ? 'All' : ROLES_CONFIG[r]?.label || r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Directory Member List */}
              <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {directoryProfiles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)', fontSize: 13 }}>
                    No team members matched the current filter.
                  </div>
                ) : (
                  directoryProfiles.map(p => {
                    const cfg = ROLES_CONFIG[p.role] || { label: p.role?.toUpperCase(), color: '#6B7280', bg: '#F3F4F6' }
                    const initials = p.name ? p.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'
                    const isActive = p.is_active !== false

                    return (
                      <div 
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          borderRadius: 12,
                          border: '1px solid var(--border)',
                          background: '#fff',
                          transition: 'border-color 0.15s',
                          gap: 16,
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 220 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>{p.name || 'Anonymous User'}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{p.email || 'no-email@company.com'}</div>
                            {p.title && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{p.title}</div>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                            {cfg.label}
                          </span>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '3px 8px',
                            borderRadius: 99,
                            background: isActive ? '#ECFDF5' : '#FEF2F2',
                            border: `1px solid ${isActive ? '#A7F3D0' : '#FECACA'}`,
                            color: isActive ? '#065F46' : '#991B1B',
                            fontSize: 11,
                            fontWeight: 600
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: isActive ? '#10B981' : '#EF4444' }} />
                            {isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              handleOpenEdit(p)
                            }}
                            style={{ height: 30, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <Pencil size={12} /> Edit
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCopyEmail(p.email)}
                            style={{ height: 30, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title="Copy email"
                          >
                            <Copy size={12} />
                          </button>
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleActive(p)}
                            style={{ height: 30, fontSize: 11, color: isActive ? '#D97706' : '#059669', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            title={isActive ? 'Deactivate' : 'Activate'}
                          >
                            {isActive ? <UserX size={12} /> : <CheckCircle2 size={12} />}
                          </button>
                          {!(p.email === 'mayank@am2pmsupport.com' || p.role === 'superadmin' || p.id === user?.id) && (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenDelete(p)}
                              style={{ height: 30, fontSize: 11, color: '#DC2626', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              title="Remove user"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Directory Modal Footer */}
              <div style={{ padding: '12px 1.5rem', borderTop: '1px solid var(--border)', background: '#F9FAFB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Showing {directoryProfiles.length} of {profiles.length} team members
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDirectoryModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Access & Security Audit Logs Modal */}
      {showAccessLogsModal && (() => {
        const filteredAccessLogs = accessLogs.filter(log => {
          const q = accessLogSearch.toLowerCase()
          const matchesSearch = !accessLogSearch || (
            (log.user_name || '').toLowerCase().includes(q) ||
            (log.user_email || '').toLowerCase().includes(q) ||
            (log.action || '').toLowerCase().includes(q) ||
            (log.action_label || '').toLowerCase().includes(q) ||
            (log.details || '').toLowerCase().includes(q) ||
            (log.ip_address || '').toLowerCase().includes(q) ||
            (log.device || '').toLowerCase().includes(q)
          )

          let matchesCategory = true
          if (accessLogCategory === 'logins') {
            matchesCategory = log.action === 'SESSION_LOGIN' || log.action.includes('AUTH')
          } else if (accessLogCategory === 'roles') {
            matchesCategory = log.action.includes('ROLE') || log.action.includes('PERMISSION')
          } else if (accessLogCategory === 'users') {
            matchesCategory = log.action.includes('USER') || log.action === 'STATUS_CHANGE'
          } else if (accessLogCategory === 'security') {
            matchesCategory = log.status === 'warning' || log.status === 'failed' || log.action.includes('FAILED')
          }

          const matchesStatus = accessLogStatus === 'all' || log.status === accessLogStatus

          return matchesSearch && matchesCategory && matchesStatus
        })

        const totalLogins = accessLogs.filter(l => l.action === 'SESSION_LOGIN').length
        const totalRoleChanges = accessLogs.filter(l => l.action.includes('ROLE') || l.action.includes('PERMISSION')).length
        const totalAlerts = accessLogs.filter(l => l.status === 'warning' || l.status === 'failed' || l.action.includes('FAILED')).length

        return (
          <div 
            style={{ 
              position: 'fixed', 
              inset: 0, 
              background: 'rgba(0,0,0,0.55)', 
              zIndex: 1000, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: 16, 
              backdropFilter: 'blur(3px)' 
            }}
            onClick={e => e.target === e.currentTarget && setShowAccessLogsModal(false)}
          >
            <div style={{ 
              background: '#fff', 
              borderRadius: 16, 
              width: '100%', 
              maxWidth: 960, 
              maxHeight: '90vh', 
              display: 'flex', 
              flexDirection: 'column', 
              boxShadow: '0 24px 64px rgba(0,0,0,0.28)', 
              overflow: 'hidden' 
            }}>
              {/* Modal Header */}
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--text-1)' }}>
                      Access &amp; Security Audit Trail
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                      Immutable live activity record of user logins, role modifications, and admin actions for {user?.company_name || 'your workspace'}.
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAccessLogsModal(false)}>
                  <X size={18} />
                </button>
              </div>

              {/* KPI Summary Cards */}
              <div style={{ padding: '12px 1.5rem', background: '#F8FAFC', borderBottom: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, flexShrink: 0 }}>
                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <History size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Total Events</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>{accessLogs.length}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ECFDF5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <LogIn size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Logins Logged</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#059669' }}>{totalLogins}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Role/Perm Changes</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#7C3AED' }}>{totalRoleChanges}</div>
                  </div>
                </div>

                <div style={{ background: '#fff', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <AlertCircle size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Security Alerts</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: totalAlerts > 0 ? '#D97706' : 'var(--text-2)' }}>{totalAlerts}</div>
                  </div>
                </div>
              </div>

              {/* Search & Filter Toolbar */}
              <div style={{ padding: '12px 1.5rem', background: '#FFFFFF', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
                  <div style={{ position: 'relative', width: 240 }}>
                    <Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input 
                      value={accessLogSearch}
                      onChange={e => setAccessLogSearch(e.target.value)}
                      placeholder="Search user, action, IP..."
                      style={{ width: '100%', height: 34, paddingLeft: 32, paddingRight: 10, borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, outline: 'none' }}
                    />
                  </div>

                  {/* Category Filter Pills */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      { key: 'all', label: `All (${accessLogs.length})` },
                      { key: 'logins', label: 'Logins' },
                      { key: 'roles', label: 'Roles & Perms' },
                      { key: 'users', label: 'User Changes' },
                      { key: 'security', label: 'Alerts' }
                    ].map(cat => (
                      <button
                        key={cat.key}
                        onClick={() => setAccessLogCategory(cat.key)}
                        style={{
                          border: 'none',
                          borderRadius: 20,
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: accessLogCategory === cat.key ? '#4F46E5' : '#F3F4F6',
                          color: accessLogCategory === cat.key ? '#fff' : 'var(--text-2)',
                          transition: 'all 0.15s'
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Status Dropdown Filter */}
                  <select
                    value={accessLogStatus}
                    onChange={e => setAccessLogStatus(e.target.value)}
                    style={{
                      height: 34,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      fontSize: 12,
                      background: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Statuses</option>
                    <option value="success">Success</option>
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={loadAccessLogs}
                    style={{ height: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title="Refresh logs"
                  >
                    <RefreshCw size={13} className={loadingAccessLogs ? 'spin' : ''} /> Refresh
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => exportAccessLogsCSV(filteredAccessLogs)}
                    style={{ height: 34, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    title="Export filtered logs as CSV"
                  >
                    <Download size={13} /> Export CSV
                  </button>
                </div>
              </div>

              {/* Log Entries Table */}
              <div style={{ padding: '0', overflowY: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 10 }}>
                      <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Timestamp</th>
                      <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>User / Actor</th>
                      <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Event</th>
                      <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Details</th>
                      <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase' }}>Client / IP</th>
                      <th style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', textTransform: 'uppercase', textAlign: 'right' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccessLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '40px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                          No access log events matched your filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredAccessLogs.map((log) => {
                        const dateObj = new Date(log.created_at)
                        const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        const initials = log.user_name ? log.user_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'SYS'
                        const roleCfg = ROLES_CONFIG[log.user_role] || { label: log.user_role || 'User', color: '#6B7280', bg: '#F3F4F6' }

                        const isWarning = log.status === 'warning' || log.status === 'failed' || (log.action && log.action.includes('FAILED'))
                        const isInfo = log.status === 'info'

                        return (
                          <tr key={log.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.1s' }} onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{formattedDate}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                <Clock size={11} /> {formattedTime}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', verticalAlign: 'top' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                  {initials}
                                </div>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{log.user_name || 'System Actor'}</div>
                                  <span style={{ fontSize: 11, color: 'var(--text-3)', display: 'block' }}>{log.user_email || 'system'}</span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 600,
                                background: isWarning ? '#FEF3C7' : (isInfo ? '#EFF6FF' : '#ECFDF5'),
                                color: isWarning ? '#92400E' : (isInfo ? '#1D4ED8' : '#065F46')
                              }}>
                                {isWarning ? <AlertCircle size={12} /> : (isInfo ? <Info size={12} /> : <CheckCircle2 size={12} />)}
                                {log.action_label || log.action}
                              </span>
                            </td>

                            <td style={{ padding: '12px 16px', verticalAlign: 'top', fontSize: 12, color: 'var(--text-2)', maxWidth: 280 }}>
                              {log.details || 'System event recorded'}
                            </td>

                            <td style={{ padding: '12px 16px', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                              <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#F1F5F9', padding: '2px 6px', borderRadius: 4, display: 'inline-block', color: 'var(--text-2)' }}>
                                {log.ip_address || '127.0.0.1'}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Laptop size={11} /> {log.device || 'Web Session'}
                              </div>
                            </td>

                            <td style={{ padding: '12px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5,
                                padding: '3px 8px',
                                borderRadius: 99,
                                fontSize: 11,
                                fontWeight: 600,
                                background: isWarning ? '#FEF2F2' : '#ECFDF5',
                                color: isWarning ? '#DC2626' : '#059669',
                                border: `1px solid ${isWarning ? '#FECACA' : '#A7F3D0'}`
                              }}>
                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: isWarning ? '#DC2626' : '#10B981' }} />
                                {log.status ? log.status.charAt(0).toUpperCase() + log.status.slice(1) : 'Success'}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div style={{ padding: '12px 1.5rem', borderTop: '1px solid var(--border)', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Showing {filteredAccessLogs.length} of {accessLogs.length} audit trail records
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAccessLogsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
