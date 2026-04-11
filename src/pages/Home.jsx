import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const CHECKLIST_ICONS = {
  'manager-walk': '🌡️',
  'back-room-closer': '🧹',
  'lobby-closer': '🪣',
  'stone-closer': '🪨',
  'key-closer': '🔑'
}

export default function Home() {
  const { employee } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [checklists, setChecklists] = useState([])
  const [sessions, setSessions] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (employee) loadData()
  }, [employee, location.key])

  async function loadData() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    const [checklistRes, sessionRes, assignRes] = await Promise.all([
      supabase.from('checklists').select('*').order('sort_order'),
      supabase.from('daily_sessions').select('*, employees!daily_sessions_employee_id_fkey(name)').eq('shift_date', today),
      supabase.from('daily_sessions').select('*').eq('shift_date', today).eq('employee_id', employee.id)
    ])

    setChecklists(checklistRes.data || [])
    setSessions(sessionRes.data || [])
    setAssignments(assignRes.data || [])
    setLoading(false)
  }

  function getSessionForChecklist(checklistId, timeSlot) {
    return sessions.find(s =>
      s.checklist_id === checklistId &&
      (timeSlot ? s.time_slot === timeSlot : true)
    )
  }

  function getMySession(checklistId) {
    return assignments.find(s => s.checklist_id === checklistId)
  }

  function getStatusBadge(session) {
    if (!session) return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Not Started</span>
    if (session.status === 'completed') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Completed</span>
    return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">In Progress</span>
  }

  async function startChecklist(checklist) {
    const today = new Date().toISOString().split('T')[0]
    const existing = getMySession(checklist.id)
    if (existing) {
      navigate(`/checklist/${checklist.slug}`)
      return
    }

    const { data, error } = await supabase.from('daily_sessions').insert({
      checklist_id: checklist.id,
      employee_id: employee.id,
      shift_date: today,
      status: 'in_progress'
    }).select().single()

    if (!error) {
      navigate(`/checklist/${checklist.slug}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const today = new Date()
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-csc-brown">Hey, {employee.name.split(' ')[0]}!</h1>
        <p className="text-csc-brown/60 text-sm">{dateStr}</p>
      </div>

      <h2 className="text-sm font-semibold text-csc-brown/50 uppercase tracking-wider mb-3">Today's Checklists</h2>

      <div className="space-y-3">
        {checklists.map(cl => {
          const mySession = getMySession(cl.id)
          const anySession = getSessionForChecklist(cl.id)
          const isAssigned = !!mySession
          const icon = CHECKLIST_ICONS[cl.slug] || '📋'

          return (
            <button
              key={cl.id}
              onClick={() => startChecklist(cl)}
              className={`w-full text-left bg-white rounded-xl p-4 shadow-sm border-2 transition-all
                ${isAssigned ? 'border-csc-gold' : 'border-transparent'}
                hover:shadow-md active:scale-[0.98]`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-csc-brown truncate">{cl.name}</h3>
                    {isAssigned && <span className="text-[10px] px-1.5 py-0.5 rounded bg-csc-gold/20 text-csc-gold font-medium">Assigned</span>}
                  </div>
                  <p className="text-xs text-csc-brown/50 mt-0.5">{cl.description}</p>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(mySession || anySession)}
                </div>
              </div>
              {mySession?.employees?.name && mySession.employee_id !== employee.id && (
                <p className="text-[11px] text-csc-brown/40 mt-2 ml-10">
                  Being done by {mySession.employees.name}
                </p>
              )}
            </button>
          )
        })}
      </div>

      {checklists.length === 0 && (
        <div className="text-center py-12">
          <p className="text-csc-brown/40">No checklists set up yet.</p>
        </div>
      )}
    </div>
  )
}
