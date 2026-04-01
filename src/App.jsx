import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Home from './pages/Home'
import Checklist from './pages/Checklist'
import Admin from './pages/Admin'
import AdminEmployees from './pages/AdminEmployees'
import AdminHistory from './pages/AdminHistory'
import AdminAssign from './pages/AdminAssign'
import BottomNav from './components/BottomNav'

function ProtectedRoute({ children, requireManager }) {
  const { employee, isManager } = useAuth()
  if (!employee) return <Navigate to="/login" replace />
  if (requireManager && !isManager) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { employee } = useAuth()

  return (
    <div className="min-h-screen bg-csc-cream pb-20">
      <Routes>
        <Route path="/login" element={employee ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/checklist/:slug" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
        <Route path="/checklist/:slug/:timeSlot" element={<ProtectedRoute><Checklist /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requireManager><Admin /></ProtectedRoute>} />
        <Route path="/admin/employees" element={<ProtectedRoute requireManager><AdminEmployees /></ProtectedRoute>} />
        <Route path="/admin/history" element={<ProtectedRoute requireManager><AdminHistory /></ProtectedRoute>} />
        <Route path="/admin/assign" element={<ProtectedRoute requireManager><AdminAssign /></ProtectedRoute>} />
      </Routes>
      {employee && <BottomNav />}
    </div>
  )
}
