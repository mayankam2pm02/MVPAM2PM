import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllApplications, fetchTasks } from '../../lib/supabase.js'
import {
  Bell, User, Sparkles, CheckCircle2, XCircle, Calendar, CheckSquare, X, Info
} from 'lucide-react'

export default function NotificationBell() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadNotifications()
    // Poll every 10 seconds to keep updates real-time
    const interval = setInterval(loadNotifications, 10000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function loadNotifications() {
    try {
      const [apps, tasks] = await Promise.all([
        fetchAllApplications(),
        fetchTasks()
      ])

      const list = []

      // 1. Process Applications
      apps.forEach(app => {
        const candidateName = app.candidates?.name || 'A candidate'
        const jobTitle = app.jobs?.title || 'a role'

        // Applied
        if (app.created_at) {
          list.push({
            id: `applied-${app.id}`,
            title: 'New Application',
            text: `${candidateName} applied for the ${jobTitle} position.`,
            time: new Date(app.created_at),
            icon: User,
            color: '#3B82F6',
            bg: '#EFF6FF',
            link: `/hiring/${app.job_id}`
          })
        }

        // Screened
        if (app.screen_score != null) {
          list.push({
            id: `screened-${app.id}`,
            title: 'AI Screening Complete',
            text: `${candidateName} scored ${app.screen_score}% for ${jobTitle}.`,
            time: new Date(app.screened_at || app.created_at),
            icon: Sparkles,
            color: '#8B5CF6',
            bg: '#F5F3FF',
            link: `/hiring/${app.job_id}`
          })
        }

        // Consent Response
        if (app.consent_status === 'accepted' || app.consent_status === 'declined') {
          const accepted = app.consent_status === 'accepted'
          list.push({
            id: `consent-${app.id}`,
            title: `Consent ${accepted ? 'Accepted' : 'Declined'}`,
            text: `${candidateName} has ${app.consent_status} the opportunity for ${jobTitle}.`,
            time: new Date(app.consent_sent_at || app.created_at),
            icon: accepted ? CheckCircle2 : XCircle,
            color: accepted ? '#10B981' : '#EF4444',
            bg: accepted ? '#ECFDF5' : '#FEF2F2',
            link: `/hiring/${app.job_id}`
          })
        }

        // Interview Scheduled
        if (app.interview_date) {
          list.push({
            id: `interview-${app.id}`,
            title: 'Interview Scheduled',
            text: `Interview with ${candidateName} for ${jobTitle} is set for ${app.interview_date}.`,
            time: new Date(app.interview_scheduled_at || app.created_at),
            icon: Calendar,
            color: '#F59E0B',
            bg: '#FEF3C7',
            link: `/interviews`
          })
        }
      })

      // 2. Process Tasks
      tasks.forEach(task => {
        if (task.created_at) {
          list.push({
            id: `task-${task.id}`,
            title: 'CRM Task Created',
            text: `New task assigned: "${task.title}" (Due: ${task.due_date || 'No due date'}).`,
            time: new Date(task.created_at),
            icon: CheckSquare,
            color: '#14B8A6',
            bg: '#F0FDFA',
            link: `/crm`
          })
        }
      })

      // Sort by newest first and limit to top 15
      const sorted = list
        .sort((a, b) => b.time.getTime() - a.time.getTime())
        .slice(0, 15)

      setNotifications(sorted)

      // Calculate unread count
      const lastRead = localStorage.getItem('notifications_last_read')
      if (!lastRead) {
        setUnreadCount(sorted.length)
      } else {
        const lastReadTime = new Date(lastRead).getTime()
        const unread = sorted.filter(n => n.time.getTime() > lastReadTime).length
        setUnreadCount(unread)
      }
    } catch (e) {
      console.error('Failed to load notifications:', e)
    }
  }

  function handleBellClick() {
    setIsOpen(!isOpen)
    if (!isOpen) {
      // Mark all as read
      const now = new Date().toISOString()
      localStorage.setItem('notifications_last_read', now)
      setUnreadCount(0)
    }
  }

  function formatTime(date) {
    const diffMs = new Date().getTime() - date.getTime()
    const diffMins = Math.max(0, Math.floor(diffMs / (1000 * 60)))
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <div
        onClick={handleBellClick}
        style={{
          position: 'relative',
          width: 38,
          height: 38,
          borderRadius: '50%',
          background: '#FFF',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--text-3)'
          e.currentTarget.style.background = '#F9FAFB'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.background = '#FFF'
        }}
      >
        <Bell size={16} color="var(--text-2)" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#4F46E5',
              color: '#FFF',
              fontSize: 9,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 0 2px #FFF'
            }}
          >
            {unreadCount}
          </span>
        )}
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 340,
            maxHeight: 450,
            background: '#FFF',
            borderRadius: 16,
            border: '1px solid var(--border)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#FAFBFC'
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>Notifications</span>
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: 11,
                  background: '#E0E7FF',
                  color: '#4F46E5',
                  padding: '2px 8px',
                  borderRadius: 99,
                  fontWeight: 600
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)' }}>
                <Info size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.5 }} />
                <div style={{ fontSize: 13, fontWeight: 500 }}>No notifications yet</div>
                <div style={{ fontSize: 11, marginTop: 2 }}>We'll notify you when actions occur.</div>
              </div>
            ) : (
              notifications.map((n) => {
                const Icon = n.icon
                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setIsOpen(false)
                      navigate(n.link)
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F3F9',
                      display: 'flex',
                      gap: 12,
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      alignItems: 'flex-start'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#F8FAFC'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#FFF'
                    }}
                  >
                    {/* Icon Column */}
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: n.bg,
                        color: n.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Icon size={15} />
                    </div>

                    {/* Text Column */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.4 }}>
                        {n.text}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 6, fontWeight: 500 }}>
                        {formatTime(n.time)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
