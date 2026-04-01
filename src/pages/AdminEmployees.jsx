import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminEmployees() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', pin: '', role: 'crew' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    setLoading(true)
    const { data } = await supabase.from('employees').select('*').order('name')
    setEmployees(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (formData.pin.length !== 4 || !/^\d{4}$/.test(formData.pin)) {
      setError('PIN must be exactly 4 digits')
      return
    }
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.rpc('create_employee', {
      emp_name: formData.name.trim(),
      emp_pin: formData.pin,
      emp_role: formData.role
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setFormData({ name: '', pin: '', role: 'crew' })
    setShowForm(false)
    setSaving(false)
    loadEmployees()
  }

  async function toggleActive(emp) {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id)
    loadEmployees()
  }

  async function resetPin(emp) {
    const newPin = prompt(`Enter new 4-digit PIN for ${emp.name}:`)
    if (!newPin || newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      if (newPin !== null) alert('PIN must be exactly 4 digits')
      return
    }
    await supabase.rpc('update_employee_pin', { emp_id: emp.id, new_pin: newPin })
    alert('PIN updated!')
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 -ml-2 text-csc-brown/50 hover:text-csc-brown">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-csc-brown flex-1">Employees</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-csc-red text-white text-sm rounded-lg hover:bg-csc-red-light transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 shadow-sm mb-4 space-y-3">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
          />
          <input
            type="text"
            placeholder="4-digit PIN"
            value={formData.pin}
            onChange={e => setFormData(d => ({ ...d, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
            inputMode="numeric"
            maxLength={4}
            required
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
          />
          <select
            value={formData.role}
            onChange={e => setFormData(d => ({ ...d, role: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
          >
            <option value="crew">Crew Member</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-csc-red text-white rounded-lg text-sm font-medium hover:bg-csc-red-light disabled:opacity-50"
          >
            {saving ? 'Adding...' : 'Add Employee'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map(emp => (
            <div key={emp.id} className={`bg-white rounded-xl p-4 shadow-sm flex items-center gap-3 ${!emp.is_active ? 'opacity-50' : ''}`}>
              <div className="flex-1">
                <p className="font-medium text-sm text-csc-brown">{emp.name}</p>
                <p className="text-xs text-csc-brown/50 capitalize">{emp.role}</p>
              </div>
              <button
                onClick={() => resetPin(emp)}
                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Reset PIN
              </button>
              <button
                onClick={() => toggleActive(emp)}
                className={`text-xs px-2 py-1 rounded ${emp.is_active ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
              >
                {emp.is_active ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
