import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminHistory() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0])
  const [expandedSession, setExpandedSession] = useState(null)
  const [sessionDetails, setSessionDetails] = useState({})

  useEffect(() => { loadHistory() }, [dateFilter, location.key])

  async function loadHistory() {
    setLoading(true)
    const { data } = await supabase
      .from('daily_sessions')
      .select('*, checklists(name, slug), employees!daily_sessions_employee_id_fkey(name)')
      .eq('shift_date', dateFilter)
      .order('completed_at', { ascending: false })

    setSessions(data || [])
    setLoading(false)
  }

  async function loadSessionDetails(sessionId) {
    if (sessionDetails[sessionId]) {
      setExpandedSession(expandedSession === sessionId ? null : sessionId)
      return
    }

    const { data } = await supabase
      .from('item_completions')
      .select('*, checklist_items(label, item_type, temp_min, temp_max), completer:employees!item_completions_completed_by_fkey(name)')
      .eq('session_id', sessionId)

    setSessionDetails(d => ({ ...d, [sessionId]: data || [] }))
    setExpandedSession(sessionId)
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 -ml-2 text-csc-brown/50 hover:text-csc-brown">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-csc-brown flex-1">History</h1>
      </div>

      <input
        type="date"
        value={dateFilter}
        onChange={e => setDateFilter(e.target.value)}
        className="w-full px-3 py-2 border rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
      />

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-csc-brown/40">
          No activity on this date
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(sess => (
            <div key={sess.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => loadSessionDetails(sess.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-csc-brown">{sess.checklists?.name}</h3>
                    <p className="text-xs text-csc-brown/50">{sess.employees?.name}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      sess.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {sess.status === 'completed' ? 'Done' : 'In Progress'}
                    </span>
                    {sess.completed_at && (
                      <p className="text-[11px] text-csc-brown/40 mt-1">
                        {new Date(sess.completed_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
              </button>

              {expandedSession === sess.id && sessionDetails[sess.id] && (
                <div className="border-t px-4 py-3 bg-gray-50 space-y-1.5 max-h-64 overflow-y-auto">
                  {sessionDetails[sess.id].map(comp => (
                    <div key={comp.id} className="flex items-center gap-2 text-xs">
                      {comp.checklist_items?.item_type === 'temperature' ? (
                        <>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            comp.value && parseFloat(comp.value) >= comp.checklist_items.temp_min && parseFloat(comp.value) <= comp.checklist_items.temp_max
                              ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                          <span className="text-csc-brown/70 flex-1">{comp.checklist_items?.label}</span>
                          <span className="font-medium">{comp.value}°F</span>
                        </>
                      ) : (
                        <>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${comp.is_checked ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <span className={`flex-1 ${comp.is_checked ? 'text-csc-brown/70' : 'text-csc-brown/40'}`}>
                            {comp.checklist_items?.label}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
