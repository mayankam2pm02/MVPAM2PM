import Sidebar from './Sidebar.jsx'
import CompanySwitcherHeader from './CompanySwitcherHeader.jsx'

export default function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg, #F8FAFC)' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', minWidth: 0 }}>
        <CompanySwitcherHeader />
        <main style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '2rem', maxWidth: 1150, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
