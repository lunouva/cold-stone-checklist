import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminEmployees() {
  const navigate = useNavigate()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'crew' })
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
    setSaving(true)
    setError(null)

    const { error: insertError } = await supabase.rpc('create_employee_profile', {
      emp_name: formData.name.trim(),
      emp_email: formData.email.trim(),
      emp_role: formData.role
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    setFormData({ name: '', email: '', role: 'crew' })
    setShowForm(false)
    setSaving(false)
    loadEmployees()
  }

  async function toggleActive(emp) {
    await supabase.from('employees').update({ is_active: !emp.is_active }).eq('id', emp.id)
    loadEmployees()
  }

  async function updateEmail(emp) {
    const newEmail = prompt(`Enter login email for ${emp.name}:`, emp.email || '')
    if (newEmail === null) return
    const trimmed = newEmail.trim()
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      alert('Enter a valid email address')
      return
    }
    await supabase.from('employees').update({ email: trimmed.toLowerCase() }).eq('id', emp.id)
    loadEmployees()
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
            type="email"
            placeholder="Login Email"
            value={formData.email}
            onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
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
                <p className="text-xs text-csc-brown/40">{emp.email || 'No login email set'}</p>
              </div>
              <button
                onClick={() => updateEmail(emp)}
                className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200"
              >
                Email
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
