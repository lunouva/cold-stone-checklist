import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const HomeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
  </svg>
)

const AdminIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

export default function BottomNav() {
  const { isManager, logout, employee } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center px-4 py-1 rounded-lg transition-colors ${
            isActive('/') && !isActive('/admin') ? 'text-csc-red' : 'text-gray-400'
          }`}
        >
          <HomeIcon />
          <span className="text-xs mt-0.5">Home</span>
        </button>

        {isManager && (
          <button
            onClick={() => navigate('/admin')}
            className={`flex flex-col items-center px-4 py-1 rounded-lg transition-colors ${
              isActive('/admin') ? 'text-csc-red' : 'text-gray-400'
            }`}
          >
            <AdminIcon />
            <span className="text-xs mt-0.5">Admin</span>
          </button>
        )}

        <button
          onClick={() => { logout(); navigate('/login', { replace: true }) }}
          className="flex flex-col items-center px-4 py-1 rounded-lg text-gray-400 hover:text-csc-red transition-colors"
        >
          <LogoutIcon />
          <span className="text-xs mt-0.5">Logout</span>
        </button>
      </div>
      <div className="text-center pb-1">
        <span className="text-[10px] text-gray-300">{employee?.name}</span>
      </div>
    </nav>
  )
}
