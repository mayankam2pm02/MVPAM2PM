const DEFAULT_ROLE_PERMISSIONS = {
  admin: {
    dashboard: { view: true, create: true, update: true, delete: true },
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

export function hasModulePermission(role, moduleKey) {
  if (!role) return false
  const permissions = getRoleModulePermissions()
  const val = permissions[role]?.[moduleKey]
  if (val && typeof val === 'object') {
    return !!val.view
  }
  return !!val
}

export function hasActionPermission(role, moduleKey, action) {
  if (!role) return false
  const permissions = getRoleModulePermissions()
  const val = permissions[role]?.[moduleKey]
  if (val && typeof val === 'object') {
    return !!val[action]
  }
  return !!val
}
