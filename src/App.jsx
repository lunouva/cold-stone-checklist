import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Onboarding from './pages/Onboarding'
import InviteAccept from './pages/InviteAccept'
import Home from './pages/Home'
import Checklist from './pages/Checklist'
import Admin from './pages/Admin'
import AdminEmployees from './pages/AdminEmployees'
import AdminHistory from './pages/AdminHistory'
import AdminAssign from './pages/AdminAssign'
import AdminOrganizations from './pages/AdminOrganizations'
import BottomNav from './components/BottomNav'

function ProtectedRoute({ children, requireManager, requirePlatformAdmin }) {
  const { authUser, employee, isManager, isPlatformAdmin, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!authUser) return <Navigate to="/login" replace />
  if (requirePlatformAdmin) {
    if (!isPlatformAdmin) return <Navigate to="/app" replace />
    return children
  }
  if (!employee) return <Navigate to="/onboarding" replace />
  if (requireManager && !isManager) return <Navigate to="/app" replace />
  return children
}

function LegacyChecklistRedirect() {
  const { slug, timeSlot } = useParams()
  const path = timeSlot ? `/app/checklist/${slug}/${timeSlot}` : `/app/checklist/${slug}`
  return <Navigate to={path} replace />
}

export default function App() {
  const { authUser, employee, loading } = useAuth()

  return (
    <div className={`min-h-screen bg-csc-cream ${employee ? 'pb-20' : ''}`}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={!loading && employee ? <Navigate to="/app" replace /> : <Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/onboarding" element={!loading && !authUser ? <Navigate to="/login" replace /> : !loading && employee ? <Navigate to="/app" replace /> : <Onboarding />} />
        <Route path="/invite/:token" element={<InviteAccept />} />
        <Route path="/app" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/app/checklist/:slug" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
        <Route path="/app/checklist/:slug/:timeSlot" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
        <Route path="/app/admin" element={<ProtectedRoute requireManager><Admin /></ProtectedRoute>} />
        <Route path="/app/admin/employees" element={<ProtectedRoute requireManager><AdminEmployees /></ProtectedRoute>} />
        <Route path="/app/admin/history" element={<ProtectedRoute requireManager><AdminHistory /></ProtectedRoute>} />
        <Route path="/app/admin/assign" element={<ProtectedRoute requireManager><AdminAssign /></ProtectedRoute>} />
        <Route path="/app/admin/organizations" element={<ProtectedRoute requirePlatformAdmin><AdminOrganizations /></ProtectedRoute>} />
        <Route path="/checklist/:slug" element={<LegacyChecklistRedirect />} />
        <Route path="/checklist/:slug/:timeSlot" element={<LegacyChecklistRedirect />} />
        <Route path="/admin/*" element={<Navigate to="/app/admin" replace />} />
      </Routes>
      {employee && <BottomNav />}
    </div>
  )
}
