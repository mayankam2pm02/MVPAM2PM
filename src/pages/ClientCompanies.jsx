import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'
import { fetchEmployees, fetchJobs, fetchCandidates } from '../lib/supabase.js'
import AddCompanyModal from '../components/companies/AddCompanyModal.jsx'
import {
  Building2, Users, Briefcase, Plus, ArrowRight,
  Eye, Shield, Search, ChevronRight, UserCheck, Calendar,
  Lock, Unlock, Loader2
} from 'lucide-react'

export default function ClientCompanies() {
  const { isSuperAdmin, companies, switchCompany, toggleCompanyLock } = useAuth()
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [companyStats, setCompanyStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedCompanyId, setExpandedCompanyId] = useState(null)
  const [companyEmployees, setCompanyEmployees] = useState({})
  const [lockingId, setLockingId] = useState(null)
  const [feedback, setFeedback] = useState(null)

  const handleToggleLock = async (comp) => {
    const isCurrentlyLocked = comp.status === 'locked' || comp.status === 'suspended'
    const newStatus = isCurrentlyLocked ? 'active' : 'suspended'
    setLockingId(comp.id)
    try {
      await toggleCompanyLock(comp.id, newStatus)
      setFeedback({
        type: 'success',
        msg: `Workspace for "${comp.name}" is now ${isCurrentlyLocked ? 'Unlocked (Logins Allowed)' : 'Locked (All Logins Blocked)'}.`
      })
      setTimeout(() => setFeedback(null), 4000)
    } catch (err) {
      console.error('Failed to toggle lock status:', err)
      setFeedback({
        type: 'error',
        msg: `Failed to update lock status: ${err.message || 'Please try again.'}`
      })
    } finally {
      setLockingId(null)
    }
  }

  useEffect(() => {
    async function loadStats() {
      try {
        const stats = {}
        const empMap = {}

        for (const comp of companies) {
          const [emps, jobs, cands] = await Promise.all([
            fetchEmployees(comp.id).catch(() => []),
            fetchJobs(comp.id).catch(() => []),
            fetchCandidates(comp.id).catch(() => [])
          ])

          stats[comp.id] = {
            employeesCount: emps.length,
            jobsCount: jobs.length,
            candidatesCount: cands.length
          }
          empMap[comp.id] = emps
        }

        setCompanyStats(stats)
        setCompanyEmployees(empMap)
      } catch (err) {
        console.warn('Error loading company statistics:', err)
      } finally {
        setLoading(false)
      }
    }

    if (companies.length > 0) {
      loadStats()
    } else {
      setLoading(false)
    }
  }, [companies])

  if (!isSuperAdmin) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: '#FEE2E2',
          color: '#DC2626',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <Shield size={32} />
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)' }}>Access Restricted</h2>
        <p style={{ color: 'var(--text-3)', fontSize: 14 }}>
          Only the Super Administrator can access the Client Companies Management portal.
        </p>
      </div>
    )
  }

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.admin_email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.admin_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalEmployeesAcrossClients = Object.values(companyStats).reduce((acc, curr) => acc + (curr.employeesCount || 0), 0)
  const totalJobsAcrossClients = Object.values(companyStats).reduce((acc, curr) => acc + (curr.jobsCount || 0), 0)

  const handleImpersonate = (comp) => {
    switchCompany(comp)
    navigate('/dashboard')
  }

  return (
    <div style={{ paddingBottom: 40, fontFamily: 'var(--font-body)' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              background: '#F5F3FF',
              color: '#7C3AED',
              fontSize: 11,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 6,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              Super Admin Console
            </span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 4px 0' }}>
            Client Companies &amp; Tenancy
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>
            Manage client company workspaces, provision admin accounts, and inspect each company's isolated employees and data.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
            color: '#fff',
            border: 'none',
            padding: '10px 18px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
            transition: 'transform 0.1s'
          }}
        >
          <Plus size={16} />
          <span>Add Client Company</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border, #E2E8F0)',
          borderRadius: 14,
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#EEF2FF',
            color: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Building2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>
              {companies.length}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Client Companies</div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border, #E2E8F0)',
          borderRadius: 14,
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#F0FDF4',
            color: '#16A34A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>
              {totalEmployeesAcrossClients}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Client Employee Accounts</div>
          </div>
        </div>

        <div style={{
          background: 'var(--surface, #fff)',
          border: '1px solid var(--border, #E2E8F0)',
          borderRadius: 14,
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: 14
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: '#FEF3C7',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', lineHeight: 1.1 }}>
              {totalJobsAcrossClients}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Active Client Jobs</div>
          </div>
        </div>
      </div>

      {/* Feedback Alert Banner */}
      {feedback && (
        <div style={{
          padding: '12px 18px',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          fontWeight: 600,
          background: feedback.type === 'error' ? '#FEF2F2' : '#ECFDF5',
          color: feedback.type === 'error' ? '#B91C1C' : '#047857',
          border: feedback.type === 'error' ? '1px solid #FECACA' : '1px solid #A7F3D0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
        }}>
          <span>{feedback.msg}</span>
          <button 
            type="button"
            onClick={() => setFeedback(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'inherit', padding: 4 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
        flexWrap: 'wrap'
      }}>
        <div style={{ position: 'relative', width: '100%', maxWidth: 360 }}>
          <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by company or admin email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 8,
              border: '1px solid var(--border, #E2E8F0)',
              background: 'var(--surface, #fff)',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Showing <strong>{filteredCompanies.length}</strong> of <strong>{companies.length}</strong> companies
        </div>
      </div>

      {/* Companies Directory */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {filteredCompanies.map((comp) => {
          const stats = companyStats[comp.id] || { employeesCount: 0, jobsCount: 0, candidatesCount: 0 }
          const emps = companyEmployees[comp.id] || []
          const isExpanded = expandedCompanyId === comp.id
          const isLocked = comp.status === 'locked' || comp.status === 'suspended'

          return (
            <div
              key={comp.id}
              style={{
                background: 'var(--surface, #fff)',
                border: '1px solid var(--border, #E2E8F0)',
                borderRadius: 14,
                overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'border-color 0.15s ease'
              }}
            >
              {/* Company Card Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16
              }}>
                {/* Left: Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 46,
                    height: 46,
                    borderRadius: 12,
                    background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
                    color: '#4F46E5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 18,
                    border: '1px solid #C7D2FE'
                  }}>
                    {comp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-1)' }}>
                        {comp.name}
                      </h3>
                      <span style={{
                        fontSize: 11,
                        background: isLocked ? '#FEE2E2' : '#DCFCE7',
                        color: isLocked ? '#B91C1C' : '#15803D',
                        padding: '2px 8px',
                        borderRadius: 999,
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        {isLocked ? <Lock size={11} /> : null}
                        {isLocked ? 'Locked (Logins Disabled)' : 'Active'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                      Admin: <strong>{comp.admin_name || 'Admin'}</strong> ({comp.admin_email || 'No email'})
                    </div>
                  </div>
                </div>

                {/* Center: Live Counts */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                      {stats.employeesCount}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Employees</div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border, #E2E8F0)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                      {stats.jobsCount}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Jobs</div>
                  </div>
                  <div style={{ width: 1, height: 28, background: 'var(--border, #E2E8F0)' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                      {stats.candidatesCount}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Candidates</div>
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Lock / Unlock Toggle Button */}
                  <button
                    type="button"
                    disabled={lockingId === comp.id}
                    onClick={() => handleToggleLock(comp)}
                    style={{
                      background: isLocked ? '#FEF2F2' : '#F8FAFC',
                      border: isLocked ? '1px solid #FCA5A5' : '1px solid #CBD5E1',
                      color: isLocked ? '#DC2626' : '#475569',
                      padding: '7px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: lockingId === comp.id ? 'not-allowed' : 'pointer',
                      opacity: lockingId === comp.id ? 0.7 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      transition: 'all 0.15s ease'
                    }}
                    title={isLocked ? 'Click to Unlock this company (Allow logins)' : 'Click to Lock this company (Block all logins)'}
                  >
                    {lockingId === comp.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isLocked ? (
                      <Unlock size={14} color="#DC2626" />
                    ) : (
                      <Lock size={14} color="#64748B" />
                    )}
                    <span>{lockingId === comp.id ? 'Updating...' : isLocked ? 'Unlock' : 'Lock'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedCompanyId(isExpanded ? null : comp.id)}
                    style={{
                      background: isExpanded ? '#F1F5F9' : 'transparent',
                      border: '1px solid var(--border, #CBD5E1)',
                      color: 'var(--text-2, #334155)',
                      padding: '7px 12px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <Users size={14} />
                    <span>{isExpanded ? 'Hide Accounts' : 'View Accounts'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleImpersonate(comp)}
                    style={{
                      background: '#4F46E5',
                      color: '#fff',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
                    }}
                  >
                    <Eye size={14} />
                    <span>View As Client</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
              </div>

              {/* Collapsible: Employee Accounts Under this Company */}
              {isExpanded && (
                <div style={{
                  borderTop: '1px solid var(--border, #E2E8F0)',
                  background: '#F8FAFC',
                  padding: '1.25rem 1.5rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                      👥 Employee Accounts under {comp.name} ({emps.length})
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      All data created by these users is isolated to {comp.name}.
                    </div>
                  </div>

                  {emps.length === 0 ? (
                    <div style={{
                      padding: '1.5rem',
                      background: '#fff',
                      borderRadius: 10,
                      border: '1px dashed #CBD5E1',
                      textAlign: 'center',
                      color: 'var(--text-3)',
                      fontSize: 13
                    }}>
                      No employees added yet under this company. Click <strong>"View As Client Admin"</strong> to log in and add employees from Settings.
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                      gap: 10
                    }}>
                      {emps.map((emp, i) => (
                        <div
                          key={emp.id || i}
                          style={{
                            background: '#fff',
                            border: '1px solid #E2E8F0',
                            borderRadius: 10,
                            padding: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10
                          }}
                        >
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: '#E0E7FF',
                            color: '#4F46E5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700
                          }}>
                            {(emp.name || 'E')[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {emp.name || 'Employee'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {emp.email || emp.phone || 'No contact'}
                            </div>
                          </div>
                          <span style={{
                            fontSize: 10,
                            background: '#F1F5F9',
                            color: '#475569',
                            padding: '2px 6px',
                            borderRadius: 4,
                            fontWeight: 600,
                            textTransform: 'uppercase'
                          }}>
                            {emp.role || emp.department || 'Staff'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </div>
  )
}
