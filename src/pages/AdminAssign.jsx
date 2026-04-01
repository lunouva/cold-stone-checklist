import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function AdminAssign() {
  const navigate = useNavigate()
  const { employee: currentUser } = useAuth()
  const [checklists, setChecklists] = useState([])
  const [employees, setEmployees] = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [clRes, empRes, sessRes] = await Promise.all([
      supabase.from('checklists').select('*').order('sort_order'),
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
      supabase.from('daily_sessions').select('*, employees!daily_sessions_employee_id_fkey(name)').eq('shift_date', today)
    ])

    setChecklists(clRes.data || [])
    setEmployees(empRes.data || [])
    setSessions(sessRes.data || [])
    setLoading(false)
  }

  async function assignChecklist(checklistId, employeeId) {
    if (!employeeId) return
    const today = new Date().toISOString().split('T')[0]

    // Check if already assigned
    const existing = sessions.find(s => s.checklist_id === checklistId && s.employee_id === employeeId)
    if (existing) return

    const { data } = await supabase
      .from('daily_sessions')
      .insert({
        checklist_id: checklistId,
        employee_id: employeeId,
        assigned_by: currentUser.id,
        shift_date: today,
        status: 'in_progress'
      })
      .select('*, employees!daily_sessions_employee_id_fkey(name)')
      .single()

    if (data) setSessions(s => [...s, data])
  }

  async function removeAssignment(sessionId) {
    await supabase.from('daily_sessions').delete().eq('id', sessionId)
    setSessions(s => s.filter(sess => sess.id !== sessionId))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 -ml-2 text-csc-brown/50 hover:text-csc-brown">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-csc-brown flex-1">Assign Checklists</h1>
      </div>

      <p className="text-xs text-csc-brown/50 mb-4">
        Assign checklists to employees for today. They'll see assigned checklists highlighted on their home screen.
      </p>

      <div className="space-y-4">
        {checklists.map(cl => {
          const clSessions = sessions.filter(s => s.checklist_id === cl.id)

          return (
            <div key={cl.id} className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-semibold text-csc-brown mb-3">{cl.name}</h3>

              {/* Current assignments */}
              {clSessions.length > 0 && (
                <div className="space-y-2 mb-3">
                  {clSessions.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-csc-cream rounded-lg px-3 py-2">
                      <div>
                        <span className="text-sm text-csc-brown">{s.employees?.name}</span>
                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full ${
                          s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {s.status === 'completed' ? 'Done' : 'In Progress'}
                        </span>
                      </div>
                      {s.status !== 'completed' && (
                        <button
                          onClick={() => removeAssignment(s.id)}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Assign dropdown */}
              <select
                defaultValue=""
                onChange={e => { assignChecklist(cl.id, e.target.value); e.target.value = '' }}
                className="w-full px-3 py-2 border rounded-lg text-sm text-csc-brown/60 focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
              >
                <option value="" disabled>Assign to employee...</option>
                {employees
                  .filter(emp => !clSessions.some(s => s.employee_id === emp.id))
                  .map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                  ))
                }
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
