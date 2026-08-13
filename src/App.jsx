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
import Onboarding from './pages/Onboarding.jsx'
import Campaigns from './pages/Campaigns.jsx'
import CRMTasks from './pages/CRMTasks.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'
import AIPrompts from './pages/AIPrompts.jsx'
import JobPortals from './pages/JobPortals.jsx'
import ConsentPage from './pages/ConsentPage.jsx'
import ApplyPage from './pages/ApplyPage.jsx'
import OAuthLoginPage from './pages/OAuthLoginPage.jsx'
import LoadingScreen from './components/layout/LoadingScreen.jsx'
import { hasModulePermission } from './lib/permissions.js'

function ProtectedRoute({ children, moduleKey }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (moduleKey && !hasModulePermission(user.role, moduleKey)) return <Navigate to="/dashboard" replace />
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
      <Route path="/apply" element={<ApplyPage />} />
      <Route path="/oauth-login" element={<OAuthLoginPage />} />

      {/* Protected */}
      <Route path="/dashboard" element={<ProtectedRoute moduleKey="dashboard"><Dashboard /></ProtectedRoute>} />
      <Route path="/hiring"    element={<ProtectedRoute moduleKey="hiring"><HiringList /></ProtectedRoute>} />
      <Route path="/hiring/new" element={<ProtectedRoute moduleKey="hiring"><NewJob /></ProtectedRoute>} />
      <Route path="/hiring/:id" element={<ProtectedRoute moduleKey="hiring"><JobDetail /></ProtectedRoute>} />
      <Route path="/interviews" element={<ProtectedRoute moduleKey="interviews"><Interviews /></ProtectedRoute>} />
      <Route path="/candidates" element={<ProtectedRoute moduleKey="candidates"><Candidates /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute moduleKey="onboarding"><Onboarding /></ProtectedRoute>} />
      <Route path="/training"   element={<ProtectedRoute moduleKey="training"><Training /></ProtectedRoute>} />
      <Route path="/crm"        element={<ProtectedRoute moduleKey="crm"><CRMTasks /></ProtectedRoute>} />
      <Route path="/campaigns"  element={<ProtectedRoute moduleKey="campaigns"><Campaigns /></ProtectedRoute>} />
      <Route path="/portals"    element={<ProtectedRoute moduleKey="portals"><JobPortals /></ProtectedRoute>} />
      <Route path="/reports"    element={<ProtectedRoute moduleKey="reports"><Reports /></ProtectedRoute>} />
      <Route path="/prompts"    element={<ProtectedRoute moduleKey="prompts"><AIPrompts /></ProtectedRoute>} />
      <Route path="/settings"   element={<ProtectedRoute moduleKey="settings"><Settings /></ProtectedRoute>} />

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
