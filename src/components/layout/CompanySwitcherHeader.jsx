import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../lib/auth.jsx'
import {
  Building2, ChevronDown, Check, Plus, ShieldCheck,
  Eye, LogOut, ArrowRight, Sparkles, X, Lock
} from 'lucide-react'
import AddCompanyModal from '../companies/AddCompanyModal.jsx'

export default function CompanySwitcherHeader() {
  const {
    user, isSuperAdmin, isImpersonating, impersonatedCompany,
    companies, switchCompany, exitCompanyView
  } = useAuth()

  const [isOpen, setIsOpen] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isSuperAdmin && !isImpersonating && !user?.company_name) {
    return null
  }

  const currentLabel = isImpersonating
    ? impersonatedCompany?.name || 'Client Admin'
    : isSuperAdmin
      ? 'Super Admin (All Companies)'
      : user?.company_name || 'My Workspace'

  return (
    <>
      {/* Impersonation Warning Banner when viewing as a client */}
      {isImpersonating && (
        <div style={{
          background: 'linear-gradient(90deg, #4338CA 0%, #6366F1 50%, #4F46E5 100%)',
          color: '#FFFFFF',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 2px 10px rgba(79, 70, 229, 0.3)',
          zIndex: 100,
          position: 'sticky',
          top: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: 24,
              height: 24
            }}>
              <Eye size={14} />
            </span>
            <span>
              Viewing as <strong>{impersonatedCompany?.name}</strong> (Client Admin Mode) — All modules and data shown are restricted to this client.
            </span>
          </div>
          <button
            onClick={exitCompanyView}
            style={{
              background: '#FFFFFF',
              color: '#312E81',
              border: 'none',
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            <LogOut size={13} />
            Exit to Super Admin Profile
          </button>
        </div>
      )}

      {/* Top Header Bar for Company Switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border, #E2E8F0)',
        background: 'var(--surface, #FFFFFF)',
        position: 'relative'
      }}>
        {/* Left Side: Active Workspace Indicator / Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {isSuperAdmin ? (
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: isImpersonating ? '#EFF6FF' : '#F8FAFC',
                  border: isImpersonating ? '1.5px solid #6366F1' : '1px solid #CBD5E1',
                  borderRadius: 10,
                  padding: '8px 14px',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  color: isImpersonating ? '#312E81' : '#0F172A',
                  transition: 'all 0.15s ease'
                }}
              >
                {isImpersonating ? (
                  <Building2 size={16} color="#4F46E5" />
                ) : (
                  <ShieldCheck size={16} color="#7C3AED" />
                )}
                <span>{currentLabel}</span>
                <ChevronDown size={14} color="#64748B" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  width: 310,
                  background: '#FFFFFF',
                  borderRadius: 14,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #E2E8F0',
                  padding: 8,
                  zIndex: 1000,
                  animation: 'fadeIn 0.15s ease-out'
                }}>
                  {/* Global Option */}
                  <button
                    type="button"
                    onClick={() => {
                      exitCompanyView()
                      setIsOpen(false)
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: !isImpersonating ? '#F5F3FF' : 'transparent',
                      border: 'none',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: '#7C3AED',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <ShieldCheck size={15} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E1B4B' }}>
                          Super Admin Profile
                        </div>
                        <div style={{ fontSize: 11, color: '#6B7280' }}>
                          All companies & global data
                        </div>
                      </div>
                    </div>
                    {!isImpersonating && <Check size={15} color="#7C3AED" />}
                  </button>

                  <div style={{
                    margin: '8px 0',
                    borderTop: '1px solid #F1F5F9',
                    paddingTop: 6,
                    paddingLeft: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#94A3B8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Client Companies ({companies.length})
                  </div>

                  {/* List of Companies */}
                  <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                    {companies.map((comp) => {
                      const isSelected = isImpersonating && impersonatedCompany?.id === comp.id
                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => {
                            switchCompany(comp)
                            setIsOpen(false)
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '9px 12px',
                            background: isSelected ? '#EEF2FF' : 'transparent',
                            border: 'none',
                            borderRadius: 8,
                            cursor: 'pointer',
                            textAlign: 'left',
                            marginBottom: 2
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: isSelected ? '#4F46E5' : '#E2E8F0',
                              color: isSelected ? '#FFFFFF' : '#475569',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <Building2 size={15} />
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? '#312E81' : '#1E293B' }}>
                                  {comp.name}
                                </span>
                                {comp.status === 'locked' && (
                                  <span style={{
                                    fontSize: 9,
                                    background: '#FEE2E2',
                                    color: '#DC2626',
                                    padding: '1px 5px',
                                    borderRadius: 4,
                                    fontWeight: 700,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 2
                                  }}>
                                    <Lock size={9} /> LOCKED
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                {comp.admin_email || 'No admin email'}
                              </div>
                            </div>
                          </div>
                          {isSelected && <Check size={15} color="#4F46E5" />}
                        </button>
                      )
                    })}
                  </div>

                  {/* Add Company Trigger in Dropdown */}
                  <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false)
                        setShowAddModal(true)
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '9px 12px',
                        background: 'transparent',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        color: '#4F46E5',
                        fontSize: 12,
                        fontWeight: 600
                      }}
                    >
                      <Plus size={15} />
                      <span>Add New Client Company</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // For regular Client Admin / Employee
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              background: '#F1F5F9',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: '#1E293B'
            }}>
              <Building2 size={15} color="#4F46E5" />
              <span>{user?.company_name || 'My Organization'}</span>
              <span style={{
                fontSize: 10,
                background: '#E2E8F0',
                padding: '2px 6px',
                borderRadius: 4,
                color: '#64748B',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {user?.role}
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Quick Action Button for Super Admin */}
        {isSuperAdmin && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                color: '#fff',
                border: 'none',
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)'
              }}
            >
              <Plus size={14} />
              <span>Add Client Company</span>
            </button>
          </div>
        )}
      </div>

      {/* Add Company Modal */}
      <AddCompanyModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
    </>
  )
}
