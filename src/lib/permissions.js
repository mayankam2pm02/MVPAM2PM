const DEFAULT_ROLE_PERMISSIONS = {
  superadmin: {
    dashboard: { view: true, create: true, update: true, delete: true },
    companies: { view: true, create: true, update: true, delete: true },
    hiring: { view: true, create: true, update: true, delete: true },
    interviews: { view: true, create: true, update: true, delete: true },
    candidates: { view: true, create: true, update: true, delete: true },
    onboarding: { view: true, create: true, update: true, delete: true },
    training: { view: true, create: true, update: true, delete: true },
    crm: { view: true, create: true, update: true, delete: true },
    campaigns: { view: true, create: true, update: true, delete: true },
    portals: { view: true, create: true, update: true, delete: true },
    reports: { view: true, create: true, update: true, delete: true },
    prompts: { view: true, create: true, update: true, delete: true },
    settings: { view: true, create: true, update: true, delete: true }
  },
  admin: {
    dashboard: { view: true, create: true, update: true, delete: true },
    companies: { view: false, create: false, update: false, delete: false },
    hiring: { view: true, create: true, update: true, delete: true },
    interviews: { view: true, create: true, update: true, delete: true },
    candidates: { view: true, create: true, update: true, delete: true },
    onboarding: { view: true, create: true, update: true, delete: true },
    training: { view: true, create: true, update: true, delete: true },
    crm: { view: true, create: true, update: true, delete: true },
    campaigns: { view: true, create: true, update: true, delete: true },
    portals: { view: true, create: true, update: true, delete: true },
    reports: { view: true, create: true, update: true, delete: true },
    prompts: { view: true, create: true, update: true, delete: true },
    settings: { view: true, create: true, update: true, delete: true }
  },
  hr: {
    dashboard: { view: true, create: false, update: false, delete: false },
    companies: { view: false, create: false, update: false, delete: false },
    hiring: { view: true, create: true, update: true, delete: true },
    interviews: { view: true, create: true, update: true, delete: true },
    candidates: { view: true, create: true, update: true, delete: false },
    onboarding: { view: true, create: true, update: true, delete: false },
    training: { view: true, create: true, update: true, delete: false },
    crm: { view: true, create: true, update: true, delete: false },
    campaigns: { view: true, create: true, update: true, delete: false },
    portals: { view: true, create: true, update: true, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    prompts: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false }
  },
  manager: {
    dashboard: { view: true, create: false, update: false, delete: false },
    companies: { view: false, create: false, update: false, delete: false },
    hiring: { view: true, create: true, update: true, delete: false },
    interviews: { view: true, create: true, update: true, delete: false },
    candidates: { view: true, create: true, update: true, delete: false },
    onboarding: { view: true, create: false, update: false, delete: false },
    training: { view: true, create: false, update: false, delete: false },
    crm: { view: true, create: true, update: true, delete: false },
    campaigns: { view: true, create: false, update: false, delete: false },
    portals: { view: true, create: false, update: false, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    prompts: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false }
  },
  interviewer: {
    dashboard: { view: true, create: false, update: false, delete: false },
    companies: { view: false, create: false, update: false, delete: false },
    hiring: { view: false, create: false, update: false, delete: false },
    interviews: { view: true, create: false, update: true, delete: false },
    candidates: { view: true, create: false, update: false, delete: false },
    onboarding: { view: false, create: false, update: false, delete: false },
    training: { view: false, create: false, update: false, delete: false },
    crm: { view: true, create: false, update: false, delete: false },
    campaigns: { view: false, create: false, update: false, delete: false },
    portals: { view: false, create: false, update: false, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    prompts: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false }
  },
  employee: {
    dashboard: { view: true, create: false, update: false, delete: false },
    companies: { view: false, create: false, update: false, delete: false },
    hiring: { view: false, create: false, update: false, delete: false },
    interviews: { view: false, create: false, update: false, delete: false },
    candidates: { view: false, create: false, update: false, delete: false },
    onboarding: { view: true, create: false, update: true, delete: false },
    training: { view: true, create: false, update: true, delete: false },
    crm: { view: true, create: true, update: true, delete: false },
    campaigns: { view: false, create: false, update: false, delete: false },
    portals: { view: false, create: false, update: false, delete: false },
    reports: { view: false, create: false, update: false, delete: false },
    prompts: { view: false, create: false, update: false, delete: false },
    settings: { view: false, create: false, update: false, delete: false }
  }
}

export function getRoleModulePermissions() {
  const stored = localStorage.getItem('role_module_permissions')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      
      // Migrate old boolean permissions if they exist to the new object format
      let migrated = false
      const migratedPerms = {}
      
      Object.keys(parsed).forEach(role => {
        migratedPerms[role] = {}
        Object.keys(parsed[role]).forEach(moduleKey => {
          const val = parsed[role][moduleKey]
          if (typeof val === 'boolean') {
            migratedPerms[role][moduleKey] = {
              view: val,
              create: val,
              update: val,
              delete: val
            }
            migrated = true
          } else {
            migratedPerms[role][moduleKey] = val
          }
        })
      })

      if (migrated) {
        localStorage.setItem('role_module_permissions', JSON.stringify(migratedPerms))
        return migratedPerms
      }
      
      return parsed
    } catch (e) {
      console.error('Error parsing role_module_permissions:', e)
    }
  }
  return DEFAULT_ROLE_PERMISSIONS
}

export function saveRoleModulePermissions(permissions) {
  localStorage.setItem('role_module_permissions', JSON.stringify(permissions))
  window.dispatchEvent(new Event('role-permissions-change'))
}

export function hasModulePermission(roleOrUser, moduleKey, customPermissions = null) {
  if (!roleOrUser) return false

  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser
  const user = typeof roleOrUser === 'object' ? roleOrUser : null

  // Super Admin outside of impersonation has access to all modules
  if (role === 'superadmin' && !user?.isImpersonating) return true
  
  // The 'companies' module is strictly restricted to Super Admin
  if (moduleKey === 'companies') {
    return role === 'superadmin' && !user?.isImpersonating
  }

  // 1. Check user-level custom permissions first (e.g., from profiles.permissions)
  if (user && user.permissions && typeof user.permissions === 'object') {
    const userPerm = user.permissions[moduleKey]
    if (userPerm !== undefined) {
      if (Array.isArray(userPerm)) {
        return userPerm.includes('view')
      }
      if (userPerm && typeof userPerm === 'object') {
        return !!userPerm.view
      }
      return !!userPerm
    }
  }

  // 2. Check role-level module permissions
  const permissions = customPermissions || getRoleModulePermissions()
  const roleConfig = permissions[role]
  
  if (roleConfig && roleConfig[moduleKey] !== undefined) {
    const val = roleConfig[moduleKey]
    if (val && typeof val === 'object') {
      return !!val.view
    }
    return !!val
  }

  // Default module access fallbacks
  if (moduleKey === 'dashboard') return true
  if (role === 'admin') return true

  return false
}

export function hasActionPermission(roleOrUser, moduleKey, action = 'view', customPermissions = null) {
  if (!roleOrUser) return false

  const role = typeof roleOrUser === 'object' ? roleOrUser?.role : roleOrUser
  const user = typeof roleOrUser === 'object' ? roleOrUser : null

  if (role === 'superadmin' && !user?.isImpersonating) return true
  if (moduleKey === 'companies') return role === 'superadmin' && !user?.isImpersonating

  // 1. User-level custom permissions
  if (user && user.permissions && typeof user.permissions === 'object') {
    const userPerm = user.permissions[moduleKey]
    if (userPerm !== undefined) {
      if (Array.isArray(userPerm)) {
        return userPerm.includes(action)
      }
      if (userPerm && typeof userPerm === 'object') {
        if (action === 'edit' && userPerm.update !== undefined) return !!userPerm.update
        if (action === 'update' && userPerm.edit !== undefined) return !!userPerm.edit
        return !!userPerm[action]
      }
      return !!userPerm
    }
  }

  // 2. Role-level permissions
  const permissions = customPermissions || getRoleModulePermissions()
  const roleConfig = permissions[role]
  
  if (roleConfig && roleConfig[moduleKey] !== undefined) {
    const val = roleConfig[moduleKey]
    if (val && typeof val === 'object') {
      if (action === 'edit' && val.update !== undefined) return !!val.update
      if (action === 'update' && val.edit !== undefined) return !!val.edit
      return !!val[action]
    }
    return !!val
  }

  if (role === 'admin') return true
  return false
}
