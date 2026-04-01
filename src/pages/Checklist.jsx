import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function TempIndicator({ value, min, max }) {
  if (!value && value !== 0) return null
  const num = parseFloat(value)
  if (isNaN(num)) return null
  const inRange = num >= min && num <= max
  const close = num >= min - 5 && num <= max + 5
  const color = inRange ? 'bg-green-500' : close ? 'bg-yellow-500' : 'bg-red-500'
  return <div className={`w-2.5 h-2.5 rounded-full ${color}`} title={inRange ? 'In range' : 'Out of range'} />
}

export default function Checklist() {
  const { slug, timeSlot } = useParams()
  const { employee } = useAuth()
  const navigate = useNavigate()
  const [checklist, setChecklist] = useState(null)
  const [sections, setSections] = useState([])
  const [session, setSession] = useState(null)
  const [completions, setCompletions] = useState({})
  const [loading, setLoading] = useState(true)
  const [expandedSections, setExpandedSections] = useState({})
  const [saving, setSaving] = useState({})

  useEffect(() => {
    loadChecklist()
  }, [slug])

  async function loadChecklist() {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]

    // Get checklist
    const { data: cl } = await supabase
      .from('checklists')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!cl) { navigate('/'); return }
    setChecklist(cl)

    // Get sections with items
    const { data: secs } = await supabase
      .from('checklist_sections')
      .select('*, checklist_items(*)')
      .eq('checklist_id', cl.id)
      .order('sort_order')

    // Sort items within sections
    const sortedSecs = (secs || []).map(s => ({
      ...s,
      checklist_items: (s.checklist_items || []).sort((a, b) => a.sort_order - b.sort_order)
    }))
    setSections(sortedSecs)

    // Expand all sections by default
    const expanded = {}
    sortedSecs.forEach(s => expanded[s.id] = true)
    setExpandedSections(expanded)

    // Get or create session
    let { data: sess } = await supabase
      .from('daily_sessions')
      .select('*')
      .eq('checklist_id', cl.id)
      .eq('employee_id', employee.id)
      .eq('shift_date', today)
      .maybeSingle()

    if (!sess) {
      const { data: newSess } = await supabase
        .from('daily_sessions')
        .insert({
          checklist_id: cl.id,
          employee_id: employee.id,
          shift_date: today,
          time_slot: timeSlot || null,
          status: 'in_progress'
        })
        .select()
        .single()
      sess = newSess
    }
    setSession(sess)

    // Load existing completions
    if (sess) {
      const { data: comps } = await supabase
        .from('item_completions')
        .select('*')
        .eq('session_id', sess.id)

      const compMap = {}
      ;(comps || []).forEach(c => {
        compMap[c.item_id] = c
      })
      setCompletions(compMap)
    }

    setLoading(false)
  }

  async function toggleItem(item) {
    if (!session) return
    const existing = completions[item.id]
    setSaving(s => ({ ...s, [item.id]: true }))

    if (existing) {
      if (item.item_type === 'checkbox') {
        const newChecked = !existing.is_checked
        await supabase
          .from('item_completions')
          .update({ is_checked: newChecked, completed_at: new Date().toISOString() })
          .eq('id', existing.id)
        setCompletions(c => ({ ...c, [item.id]: { ...existing, is_checked: newChecked } }))
      }
    } else {
      const { data } = await supabase
        .from('item_completions')
        .insert({
          session_id: session.id,
          item_id: item.id,
          is_checked: true,
          completed_by: employee.id
        })
        .select()
        .single()
      if (data) setCompletions(c => ({ ...c, [item.id]: data }))
    }

    setSaving(s => ({ ...s, [item.id]: false }))
  }

  async function updateTempValue(item, value) {
    if (!session) return
    const existing = completions[item.id]
    setSaving(s => ({ ...s, [item.id]: true }))

    if (existing) {
      await supabase
        .from('item_completions')
        .update({ value, is_checked: !!value, completed_at: new Date().toISOString() })
        .eq('id', existing.id)
      setCompletions(c => ({ ...c, [item.id]: { ...existing, value, is_checked: !!value } }))
    } else {
      const { data } = await supabase
        .from('item_completions')
        .insert({
          session_id: session.id,
          item_id: item.id,
          is_checked: !!value,
          value,
          completed_by: employee.id
        })
        .select()
        .single()
      if (data) setCompletions(c => ({ ...c, [item.id]: data }))
    }

    setSaving(s => ({ ...s, [item.id]: false }))
  }

  async function markComplete() {
    if (!session) return
    await supabase
      .from('daily_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', session.id)
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalItems = sections.reduce((sum, s) => sum + s.checklist_items.length, 0)
  const completedItems = Object.values(completions).filter(c => c.is_checked).length
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0
  const allDone = completedItems === totalItems && totalItems > 0

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/')} className="p-2 -ml-2 text-csc-brown/50 hover:text-csc-brown">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-csc-brown">{checklist?.name}</h1>
          <p className="text-xs text-csc-brown/50">{completedItems} of {totalItems} tasks</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-green-500' : 'bg-csc-gold'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedSections(e => ({ ...e, [section.id]: !e[section.id] }))}
              className="w-full flex items-center justify-between px-4 py-3 bg-csc-brown/5 hover:bg-csc-brown/10 transition-colors"
            >
              <h2 className="font-semibold text-sm text-csc-brown">{section.name}</h2>
              <svg
                className={`w-4 h-4 text-csc-brown/40 transition-transform ${expandedSections[section.id] ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expandedSections[section.id] && (
              <div className="divide-y divide-gray-100">
                {section.checklist_items.map(item => {
                  const completion = completions[item.id]
                  const isChecked = completion?.is_checked || false
                  const isSaving = saving[item.id]

                  if (item.item_type === 'temperature') {
                    return (
                      <div key={item.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <p className={`text-sm ${completion?.value ? 'text-csc-brown' : 'text-csc-brown/70'}`}>
                              {item.label}
                            </p>
                            <p className="text-[11px] text-csc-brown/40 mt-0.5">
                              Range: {item.temp_min}°F to {item.temp_max}°F
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <TempIndicator value={completion?.value} min={item.temp_min} max={item.temp_max} />
                            <input
                              type="number"
                              inputMode="decimal"
                              placeholder="°F"
                              value={completion?.value || ''}
                              onChange={e => updateTempValue(item, e.target.value)}
                              className="w-20 px-2 py-1.5 text-sm border rounded-lg text-center
                                         focus:outline-none focus:ring-2 focus:ring-csc-gold/50 focus:border-csc-gold"
                            />
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggleItem(item)}
                      disabled={isSaving}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left"
                    >
                      <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                        isChecked ? 'bg-green-500 border-green-500' : 'border-gray-300'
                      }`}>
                        {isChecked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`text-sm flex-1 ${isChecked ? 'text-csc-brown/40 line-through' : 'text-csc-brown'}`}>
                        {item.label}
                      </span>
                      {isSaving && (
                        <div className="w-4 h-4 border-2 border-csc-gold border-t-transparent rounded-full animate-spin" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Complete button */}
      {allDone && session?.status !== 'completed' && (
        <button
          onClick={markComplete}
          className="w-full mt-6 py-3 bg-green-500 text-white font-semibold rounded-xl
                     hover:bg-green-600 active:bg-green-700 transition-colors shadow-lg"
        >
          Mark Checklist Complete
        </button>
      )}

      {session?.status === 'completed' && (
        <div className="mt-6 py-3 text-center bg-green-50 text-green-700 font-semibold rounded-xl border border-green-200">
          Checklist Completed
        </div>
      )}
    </div>
  )
}
