import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { applyOrganizationScope } from '../lib/organization'
import { supabase } from '../lib/supabase'

export default function Admin() {
  const navigate = useNavigate()
  const location = useLocation()
  const { employee, isPlatformAdmin } = useAuth()
  const [overview, setOverview] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOverview()
  }, [location.key])

  async function loadOverview() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const { data: checklists } = await applyOrganizationScope(
      supabase.from('checklists').select('*'),
      employee
    ).order('sort_order')

    const { data: sessions } = await applyOrganizationScope(
      supabase.from('daily_sessions').select('*, employees!daily_sessions_employee_id_fkey(name)'),
      employee
    ).eq('shift_date', today)

    const combined = (checklists || []).map(cl => {
      const clSessions = (sessions || []).filter(s => s.checklist_id === cl.id)
      return {
        ...cl,
        sessions: clSessions,
        status: clSessions.some(s => s.status === 'completed')
          ? 'completed'
          : clSessions.length > 0
            ? 'in_progress'
            : 'not_started'
      }
    })

    setOverview(combined)
    setLoading(false)
  }

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    not_started: 'bg-gray-100 text-gray-500'
  }
  const statusLabels = {
    completed: 'Done',
    in_progress: 'In Progress',
    not_started: 'Not Started'
  }
  const quickLinks = [
    { label: 'Employees', path: '/app/admin/employees', icon: 'Team' },
    { label: 'History', path: '/app/admin/history', icon: 'Log' },
    { label: 'Assign', path: '/app/admin/assign', icon: 'Plan' },
    ...(isPlatformAdmin ? [{ label: 'Orgs', path: '/app/admin/organizations', icon: 'HQ' }] : [])
  ]

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold text-csc-brown mb-1">Admin Dashboard</h1>
      <p className="text-csc-brown/60 text-sm mb-6">{dateStr}</p>

      <div className={`grid gap-3 mb-6 ${quickLinks.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {quickLinks.map(link => (
          <button
            key={link.path}
            onClick={() => navigate(link.path)}
            className="bg-white rounded-lg p-4 shadow-sm text-center hover:shadow-md active:scale-[0.98] transition-all"
          >
            <span className="text-sm font-black text-csc-red">{link.icon}</span>
            <p className="text-xs font-medium text-csc-brown mt-1">{link.label}</p>
          </button>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-csc-brown/50 uppercase tracking-wider mb-3">Today's Status</h2>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {overview.map(cl => (
            <div key={cl.id} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-csc-brown">{cl.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[cl.status]}`}>
                  {statusLabels[cl.status]}
                </span>
              </div>
              {cl.sessions.length > 0 ? (
                <div className="space-y-1">
                  {cl.sessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-xs text-csc-brown/60">
                      <span>{s.employees?.name || 'Unknown'}</span>
                      <span>
                        {s.status === 'completed'
                          ? `Done at ${new Date(s.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                          : 'Working...'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-csc-brown/40">No one has started this yet</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
