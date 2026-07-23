import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import {
  LayoutDashboard, Users, Briefcase, GraduationCap,
  BarChart2, Settings, LogOut, CheckSquare, CalendarDays
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard',   roles: ['admin','hr','manager','interviewer'] },
  { to: '/hiring',      icon: Briefcase,       label: 'Hiring',      roles: ['admin','hr','manager'] },
  { to: '/interviews',  icon: CalendarDays,    label: 'Interviews',  roles: ['admin','hr','manager','interviewer'] },
  { to: '/candidates',  icon: Users,           label: 'Candidates',  roles: ['admin','hr','manager','interviewer'] },
  { to: '/training',   icon: GraduationCap,   label: 'Training',   roles: ['admin','hr','manager'] },
  { to: '/crm',        icon: CheckSquare,     label: 'Tasks & CRM',roles: ['admin','hr','manager','interviewer'] },
  { to: '/reports',    icon: BarChart2,       label: 'Reports',    roles: ['admin'] },
  { to: '/settings',   icon: Settings,        label: 'Settings',   roles: ['admin'] },
]

const ROLE_LABELS = {
  admin: 'Admin', hr: 'HR Manager', manager: 'Manager', interviewer: 'Interviewer', employee: 'Employee'
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'

  return (
    <aside style={{
      width: 220,
      minHeight: '100vh',
      background: '#0F1117',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto'
    }}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: '#fff', letterSpacing: '-0.3px' }}>
          Mr. Manager
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>your virtual manager</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.filter(n => n.roles.includes(user?.role)).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
            background: isActive ? 'rgba(79,70,229,0.3)' : 'transparent',
            transition: 'all 0.15s', textDecoration: 'none'
          })}>
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User profile */}
      <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', marginBottom: 6 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(79,70,229,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 600, color: '#fff', flexShrink: 0
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
              {ROLE_LABELS[user?.role] || user?.role}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', color: 'rgba(255,255,255,0.4)', gap: 8 }}>
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </aside>
  )
}
