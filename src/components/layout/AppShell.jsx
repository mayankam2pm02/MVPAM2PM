import Sidebar from './Sidebar.jsx'

export default function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', minHeight: '100vh' }}>
        <div style={{ padding: '2rem', maxWidth: 1100 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
