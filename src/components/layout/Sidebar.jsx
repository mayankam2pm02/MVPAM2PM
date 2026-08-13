import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth.jsx'
import { getRoleModulePermissions, hasModulePermission } from '../../lib/permissions.js'
import {
  Zap, Users, Briefcase, GraduationCap,
  BarChart2, Settings, LogOut, CheckSquare, CalendarDays, ChevronDown,
  Sparkles, Globe, ClipboardList, Send
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',   icon: Zap,             label: 'Dashboard',   key: 'dashboard' },
  { to: '/hiring',      icon: Briefcase,       label: 'Hiring',      key: 'hiring' },
  { to: '/interviews',  icon: CalendarDays,    label: 'Interviews',  key: 'interviews' },
  { to: '/candidates',  icon: Users,           label: 'Candidates',  key: 'candidates' },
  { to: '/onboarding',  icon: ClipboardList,   label: 'Onboarding',  key: 'onboarding' },
  { to: '/training',   icon: GraduationCap,   label: 'Training',   key: 'training' },
  { to: '/crm',        icon: CheckSquare,     label: 'Tasks & CRM', key: 'crm' },
  { to: '/campaigns',   icon: Send,            label: 'Campaigns',   key: 'campaigns' },
  { to: '/portals',     icon: Globe,           label: 'Job Portals', key: 'portals' },
  { to: '/reports',    icon: BarChart2,       label: 'Reports',    key: 'reports' },
  { to: '/prompts',     icon: Sparkles,        label: 'AI Prompts',  key: 'prompts' },
]

const ROLE_LABELS = {
  admin: 'Admin', hr: 'HR Manager', manager: 'Manager', interviewer: 'Interviewer', employee: 'Employee'
}

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [permissions, setPermissions] = useState(getRoleModulePermissions())
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)

  useEffect(() => {
    const handlePermissionsChange = () => {
      setPermissions(getRoleModulePermissions())
    }
    window.addEventListener('role-permissions-change', handlePermissionsChange)
    return () => window.removeEventListener('role-permissions-change', handlePermissionsChange)
  }, [])


  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '??'

  // Dynamic SVG based on active path
  const renderIllustration = () => {
    const path = location.pathname
    if (path === '/interviews') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          {/* Stars */}
          <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
          <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />
          <circle cx="180" cy="15" r="0.5" fill="#fff" opacity="0.2" />

          {/* Clouds */}
          <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
          <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

          {/* Monitor */}
          {/* Base */}
          <path d="M85 85 L115 85" stroke="#312E81" strokeWidth="4" strokeLinecap="round" />
          <rect x="96" y="70" width="8" height="15" fill="#312E81" />
          {/* Screen */}
          <rect x="65" y="35" width="70" height="40" rx="3" fill="#0F172A" stroke="#312E81" strokeWidth="2.5" />
          <rect x="68" y="38" width="64" height="34" rx="1.5" fill="#1E1B4B" />
          {/* Play Triangle */}
          <polygon points="96,48 108,55 96,62" fill="#4F46E5" />
          {/* Video Call Avatar Nodes */}
          <circle cx="55" cy="55" r="5" fill="#7C3AED" />
          <circle cx="145" cy="55" r="5" fill="#10B981" />
          <circle cx="55" cy="65" r="1.5" fill="#fff" opacity="0.4" />
          <circle cx="145" cy="65" r="1.5" fill="#fff" opacity="0.4" />
        </svg>
      )
    }

    if (path === '/candidates') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          {/* Stars */}
          <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
          <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />

          {/* Clouds */}
          <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
          <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

          {/* ID Card */}
          <g transform="translate(10, 0)">
            <rect x="65" y="32" width="60" height="42" rx="4" fill="#4F46E5" stroke="#312E81" strokeWidth="2" />
            {/* Photo box inside */}
            <rect x="71" y="38" width="16" height="18" rx="2" fill="#818CF8" />
            <circle cx="79" cy="44" r="3" fill="#FFF" />
            <path d="M73 54 C 73 50, 85 50, 85 54 Z" fill="#FFF" />
            {/* Detail lines inside card */}
            <line x1="93" y1="41" x2="117" y2="41" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" />
            <line x1="93" y1="47" x2="111" y2="47" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
            <line x1="93" y1="53" x2="114" y2="53" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
            
            {/* Magnifying Glass */}
            <circle cx="118" cy="65" r="9" stroke="#FBBF24" strokeWidth="2.5" fill="#12151E" />
            <line x1="124" y1="71" x2="135" y2="82" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      )
    }
    if (path === '/training' || path === '/onboarding') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          {/* Stars */}
          <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
          <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />

          {/* Clouds */}
          <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
          <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

          {/* Stack of books */}
          <g transform="translate(10, -5)">
            {/* Bottom Book */}
            <path d="M 60 78 L 120 78 L 130 83 L 50 83 Z" fill="#1E1B4B" />
            <rect x="55" y="70" width="70" height="8" rx="1.5" fill="#312E81" />
            {/* Middle Book */}
            <path d="M 63 68 L 117 68 L 125 73 L 55 73 Z" fill="#312E81" />
            <rect x="58" y="60" width="64" height="8" rx="1.5" fill="#4F46E5" />
            {/* Top Book */}
            <path d="M 68 58 L 112 58 L 120 63 L 60 63 Z" fill="#4F46E5" />
            <rect x="63" y="50" width="54" height="8" rx="1.5" fill="#818CF8" />

            {/* Mortarboard Cap */}
            {/* Diamond top */}
            <polygon points="90,30 115,38 90,46 65,38" fill="#4F46E5" stroke="#312E81" strokeWidth="1.5" />
            {/* Base skull cap */}
            <path d="M 76 40 L 76 46 C 76 52, 104 52, 104 46 L 104 40 Z" fill="#312E81" />
            {/* Tassel */}
            <path d="M 90 38 L 110 46 L 110 54" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="108" y="54" width="4" height="6" fill="#F59E0B" />
          </g>
        </svg>
      )
    }
    if (path === '/crm') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          {/* Stars */}
          <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
          <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />

          {/* Clouds */}
          <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
          <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

          {/* Clipboard & Phone Receiver */}
          <g transform="translate(10, 0)">
            {/* Clipboard Sheet */}
            <rect x="70" y="30" width="45" height="55" rx="4" fill="#1E1B4B" stroke="#312E81" strokeWidth="2" />
            <rect x="75" y="38" width="35" height="42" rx="2" fill="#312E81" />
            
            {/* Binder clip at top */}
            <rect x="85" y="25" width="15" height="8" rx="2" fill="#4F46E5" stroke="#312E81" strokeWidth="1.5" />
            <circle cx="92.5" cy="29" r="1.5" fill="#FBBF24" />

            {/* Checklist items */}
            {/* Row 1 */}
            <path d="M 80 46 L 82 48 L 86 44" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="90" y1="46" x2="104" y2="46" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
            
            {/* Row 2 */}
            <path d="M 80 54 L 82 56 L 86 52" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="90" y1="54" x2="104" y2="54" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />
            
            {/* Row 3 */}
            <path d="M 80 62 L 82 64 L 86 60" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="90" y1="62" x2="104" y2="62" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" />

            {/* Phone Receiver on top/right */}
            <rect x="105" y="48" width="28" height="28" rx="14" fill="#4F46E5" stroke="#312E81" strokeWidth="2" />
            {/* SVG telephone icon inside */}
            <path d="M 113 56 C 113 62, 118 67, 124 67" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            <rect x="111" y="55" width="4" height="4" rx="1" fill="#FFF" />
            <rect x="123" y="65" width="4" height="4" rx="1" fill="#FFF" />
          </g>
        </svg>
      )
    }

    if (path === '/reports') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          {/* Stars */}
          <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
          <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />

          {/* Clouds */}
          <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
          <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

          {/* Reports Analytics illustration */}
          <g transform="translate(10, 0)">
            <rect x="65" y="30" width="70" height="50" rx="4" fill="#1E1B4B" stroke="#312E81" strokeWidth="2" />
            <rect x="70" y="35" width="60" height="40" rx="2" fill="#312E81" />
            
            {/* Pie/Donut Chart */}
            <circle cx="85" cy="55" r="12" stroke="#4F46E5" strokeWidth="4" fill="none" />
            <circle cx="85" cy="55" r="12" stroke="#FBBF24" strokeWidth="4" strokeDasharray="30 80" strokeDashoffset="15" fill="none" />

            {/* Bar Charts */}
            <rect x="106" y="52" width="4" height="15" fill="#10B981" rx="1" />
            <rect x="113" y="44" width="4" height="23" fill="#4F46E5" rx="1" />
            <rect x="120" y="48" width="4" height="19" fill="#FBBF24" rx="1" />
          </g>
        </svg>
      )
    }

    if (path === '/settings') {
      return (
        <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
          {/* Stars */}
          <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
          <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />

          {/* Clouds */}
          <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
          <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

          {/* Shield & Gears illustration */}
          <g transform="translate(10, 0)">
            {/* Shield */}
            <path d="M 100 25 C 80 25, 75 35, 75 55 C 75 75, 100 85, 100 85 C 100 85, 125 75, 125 55 C 125 35, 120 25, 100 25 Z" fill="#1E1B4B" stroke="#312E81" strokeWidth="2.5" />
            {/* Checkmark in shield */}
            <path d="M 92 55 L 97 60 L 108 50" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Gear Left */}
            <circle cx="65" cy="72" r="10" stroke="#312E81" strokeWidth="2.5" fill="#0F172A" />
            <circle cx="65" cy="72" r="4" fill="#312E81" />
            {/* Gear teeth */}
            <path d="M 65 58 L 65 62 M 65 82 L 65 86 M 51 72 L 55 72 M 75 72 L 79 72" stroke="#312E81" strokeWidth="2.5" strokeLinecap="round" />

            {/* Gear Right */}
            <circle cx="135" cy="72" r="10" stroke="#312E81" strokeWidth="2.5" fill="#0F172A" />
            <circle cx="135" cy="72" r="4" fill="#312E81" />
            {/* Gear teeth */}
            <path d="M 135 58 L 135 62 M 135 82 L 135 86 M 121 72 L 125 72 M 145 72 L 149 72" stroke="#312E81" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        </svg>
      )
    }

    // Default: Briefcase
    return (
      <svg width="100%" height="100%" viewBox="0 0 200 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ position: 'absolute', inset: 0 }}>
        {/* Stars */}
        <circle cx="20" cy="15" r="0.7" fill="#fff" opacity="0.5" />
        <circle cx="50" cy="30" r="0.5" fill="#fff" opacity="0.3" />
        <circle cx="120" cy="20" r="0.8" fill="#fff" opacity="0.6" />
        <circle cx="170" cy="25" r="0.6" fill="#fff" opacity="0.4" />
        <circle cx="180" cy="15" r="0.5" fill="#fff" opacity="0.2" />
        
        {/* Big Glow Moon/Star */}
        <circle cx="150" cy="40" r="1.5" fill="#fff" opacity="0.8" />
        <circle cx="150" cy="40" r="6" fill="#fff" opacity="0.05" />

        {/* Clouds */}
        <path d="M-10 95 C 20 85, 40 95, 60 90 C 80 85, 100 95, 120 90 C 140 85, 160 95, 210 95 Z" fill="#1E293B" opacity="0.4" />
        <path d="M-20 100 C 10 90, 30 100, 60 95 C 90 90, 110 100, 140 95 C 170 90, 190 100, 220 100 Z" fill="#0F172A" opacity="0.8" />

        {/* Briefcase */}
        {/* Handle */}
        <path d="M88 47 C 88 40, 112 40, 112 47" stroke="#312E81" strokeWidth="2.5" strokeLinecap="round" />
        {/* Body */}
        <rect x="75" y="47" width="50" height="34" rx="4" fill="#4F46E5" />
        {/* Corners / Protectors */}
        <rect x="75" y="74" width="6" height="7" rx="1" fill="#312E81" />
        <rect x="119" y="74" width="6" height="7" rx="1" fill="#312E81" />
        {/* Straps / Flap details */}
        <rect x="83" y="47" width="5" height="34" fill="#312E81" />
        <rect x="112" y="47" width="5" height="34" fill="#312E81" />
        {/* Metal Lock */}
        <rect x="96" y="55" width="8" height="8" rx="1.5" fill="#FBBF24" />
        <circle cx="100" cy="59" r="1.5" fill="#D97706" />
      </svg>
    )
  }

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#0B0D13',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Logo Section */}
      <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #4F46E5 0%, #3B82F6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 800,
          fontSize: 20,
          boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
          fontFamily: 'var(--font-display)'
        }}>
          M
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 16,
            color: '#fff',
            letterSpacing: '-0.3px',
            lineHeight: '1.2'
          }}>
            Mr. Manager
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 1,
            fontWeight: 400
          }}>
            Your virtual manager
          </div>
        </div>
      </div>

      {/* Nav Link list */}
      <nav style={{ flex: 1, padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.filter(n => {
          const rolePerms = permissions[user?.role] || {}
          return rolePerms[n.key] !== false
        }).map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
            background: isActive ? '#3B38D3' : 'transparent',
            backgroundImage: isActive ? 'linear-gradient(90deg, #3B38D3 0%, #4F46E5 100%)' : 'none',
            boxShadow: isActive ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none',
            transition: 'all 0.2s ease',
            textDecoration: 'none'
          })}>
            <Icon size={16} style={{ opacity: 0.9 }} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User profile section */}
      <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative' }}>
        
        {showProfileDropdown && (
          <>
            {/* Backdrop overlay to capture clicks outside */}
            <div 
              onClick={() => setShowProfileDropdown(false)} 
              style={{ position: 'fixed', inset: 0, zIndex: 99 }} 
            />
            {/* Dropdown Menu */}
            <div style={{
              position: 'absolute',
              bottom: 'calc(100% - 10px)',
              left: 14,
              right: 14,
              background: '#181D28',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
              padding: 6,
              boxShadow: '0 -10px 25px -5px rgba(0,0,0,0.5), 0 -8px 10px -6px rgba(0,0,0,0.5)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}>
              {hasModulePermission(user?.role, 'settings') && (
                <NavLink 
                  to="/settings" 
                  onClick={() => setShowProfileDropdown(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: 13,
                    color: '#fff',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  className="profile-dropdown-item"
                >
                  <Settings size={14} color="rgba(255,255,255,0.6)" />
                  Settings
                </NavLink>
              )}
              <button 
                onClick={() => {
                  setShowProfileDropdown(false)
                  handleLogout()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 8,
                  fontSize: 13,
                  color: '#EF4444',
                  border: 'none',
                  background: 'transparent',
                  width: '100%',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                className="profile-dropdown-item"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}

        {/* Profile Card */}
        <div 
          onClick={() => setShowProfileDropdown(!showProfileDropdown)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 12,
            background: showProfileDropdown ? '#1E2330' : '#12151E',
            border: showProfileDropdown ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.04)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            if (!showProfileDropdown) e.currentTarget.style.background = '#181D29'
          }}
          onMouseLeave={(e) => {
            if (!showProfileDropdown) e.currentTarget.style.background = '#12151E'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: '#232A3C',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              {initials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user?.name || 'User'}
              </div>
              <span style={{
                display: 'inline-block',
                fontSize: 9,
                fontWeight: 700,
                color: '#818CF8',
                background: 'rgba(99, 102, 241, 0.15)',
                padding: '1px 6px',
                borderRadius: 99,
                marginTop: 2,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </span>
            </div>
          </div>
          <ChevronDown size={14} color="rgba(255,255,255,0.4)" style={{ cursor: 'pointer' }} />
        </div>

        {/* Dynamic Vector Illustration Card */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 100,
          borderRadius: 12,
          background: 'radial-gradient(ellipse at bottom, #1E1B4B 0%, #0F172A 100%)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(255,255,255,0.03)'
        }}>
          {renderIllustration()}
        </div>

      </div>
    </aside>
  )
}
