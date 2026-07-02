import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth.jsx'
import AppShell from './components/layout/AppShell.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HiringList from './components/hiring/HiringList.jsx'
import NewJob from './components/hiring/NewJob.jsx'
import JobDetail from './components/hiring/JobDetail.jsx'
import Candidates from './pages/Candidates.jsx'
import Interviews from './pages/Interviews.jsx'
import Training from './pages/Training.jsx'
import CRMTasks from './pages/CRMTasks.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import ConsentPage from './pages/ConsentPage.jsx'
import LoadingScreen from './components/layout/LoadingScreen.jsx'

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <AppShell>{children}</AppShell>
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/consent" element={<ConsentPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/hiring"    element={<ProtectedRoute roles={['admin','hr','manager']}><HiringList /></ProtectedRoute>} />
      <Route path="/hiring/new" element={<ProtectedRoute roles={['admin','hr']}><NewJob /></ProtectedRoute>} />
      <Route path="/hiring/:id" element={<ProtectedRoute roles={['admin','hr','manager']}><JobDetail /></ProtectedRoute>} />
      <Route path="/interviews" element={<ProtectedRoute><Interviews /></ProtectedRoute>} />
      <Route path="/candidates" element={<ProtectedRoute><Candidates /></ProtectedRoute>} />
      <Route path="/training"   element={<ProtectedRoute roles={['admin','hr','manager']}><Training /></ProtectedRoute>} />
      <Route path="/crm"        element={<ProtectedRoute><CRMTasks /></ProtectedRoute>} />
      <Route path="/reports"    element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute roles={['admin']}><Settings /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
