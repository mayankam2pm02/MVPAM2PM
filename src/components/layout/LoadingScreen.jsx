export default function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--surface-2)',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        width: 48, height: 48,
        background: 'var(--brand)',
        borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ color: '#fff', fontWeight: 800, fontSize: 22, fontFamily: 'var(--font-display)' }}>T</span>
      </div>
      <div className="spinner" style={{ width: 24, height: 24 }} />
      <p style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading Mr. Manager…</p>
    </div>
  )
}
