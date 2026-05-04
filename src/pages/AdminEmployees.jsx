import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { applyOrganizationScope, hasOrganizationScope } from '../lib/organization'
import { getInviteUrl, supabase } from '../lib/supabase'

const ROLE_LABELS = {
  owner: 'Owner',
  manager: 'Manager',
  crew: 'Crew Member'
}

export default function AdminEmployees() {
  const navigate = useNavigate()
  const { employee: currentUser, isOwner } = useAuth()
  const [employees, setEmployees] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', role: 'crew' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => { loadEmployees() }, [])

  async function loadEmployees() {
    setLoading(true)
    if (!hasOrganizationScope(currentUser)) {
      const { data } = await supabase.from('employees').select('*').order('name')
      setEmployees(data || [])
      setInvites([])
      setLoading(false)
      return
    }

    const [employeeRes, inviteRes] = await Promise.all([
      applyOrganizationScope(supabase.from('employees').select('*'), currentUser).order('name'),
      supabase
        .from('organization_invites')
        .select('*, inviter:employees!organization_invites_invited_by_employee_id_fkey(name)')
        .eq('organization_id', currentUser.organization_id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
    ])

    setEmployees(employeeRes.data || [])
    setInvites(inviteRes.data || [])
    setLoading(false)
  }

  async function copyInviteLink(token) {
    const inviteUrl = getInviteUrl(token)
    await navigator.clipboard.writeText(inviteUrl)
    setNotice('Invite link copied.')
  }

  async function sendInviteEmail(invite, inviteUrl) {
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) return { skipped: true, reason: 'No active session.' }

    const response = await fetch('/api/send-invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        email: invite.email,
        role: invite.role,
        inviteUrl,
        organizationName: invite.organization_name || currentUser.organization_name,
        inviterName: currentUser.name
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Invite email could not be sent.')
    }

    return response.json()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)

    if (!hasOrganizationScope(currentUser)) {
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

      setNotice('Employee added.')
      setFormData({ name: '', email: '', role: 'crew' })
      setShowForm(false)
      setSaving(false)
      loadEmployees()
      return
    }

    const { data, error: inviteError } = await supabase.rpc('create_organization_invite', {
      invite_email: formData.email.trim(),
      invite_role: formData.role
    })

    if (inviteError) {
      setError(inviteError.message)
      setSaving(false)
      return
    }

    const invite = Array.isArray(data) ? data[0] : data
    const inviteUrl = getInviteUrl(invite.token)
    let message = 'Invite created. Link copied.'

    try {
      await navigator.clipboard.writeText(inviteUrl)
      const emailResult = await sendInviteEmail(invite, inviteUrl)
      if (emailResult?.skipped) message = 'Invite link copied. Email sending is not configured yet.'
      else message = 'Invite link copied and email sent.'
    } catch (err) {
      message = `Invite link copied. ${err.message}`
    }

    setNotice(message)
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

  async function cancelInvite(inviteId) {
    await supabase.from('organization_invites').delete().eq('id', inviteId)
    loadEmployees()
  }

  const roleOptions = isOwner
    ? [
        { value: 'manager', label: 'Manager' },
        { value: 'crew', label: 'Crew Member' }
      ]
    : [{ value: 'crew', label: 'Crew Member' }]

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/app/admin')} className="p-2 -ml-2 text-csc-brown/50 hover:text-csc-brown">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-csc-brown">Team</h1>
          <p className="text-xs text-csc-brown/50">{currentUser.organization_name}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 bg-csc-red text-white text-sm rounded-lg hover:bg-csc-red-light transition-colors"
        >
          {showForm ? 'Cancel' : hasOrganizationScope(currentUser) ? 'Invite' : '+ Add'}
        </button>
      </div>

      {notice && <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{notice}</p>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 shadow-sm mb-4 space-y-3">
          {!hasOrganizationScope(currentUser) && (
            <input
              type="text"
              placeholder="Full name"
              value={formData.name}
              onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
            />
          )}
          <input
            type="email"
            placeholder={hasOrganizationScope(currentUser) ? 'Work email' : 'Login email'}
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
            {roleOptions.map(role => (
              <option key={role.value} value={role.value}>{role.label}</option>
            ))}
          </select>
          {error && <p className="text-red-500 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-csc-red text-white rounded-lg text-sm font-medium hover:bg-csc-red-light disabled:opacity-50"
          >
            {saving ? 'Saving...' : hasOrganizationScope(currentUser) ? 'Create Invite' : 'Add Employee'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {hasOrganizationScope(currentUser) && invites.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-csc-brown/50">Pending Invites</h2>
              <div className="space-y-2">
                {invites.map(invite => (
                  <div key={invite.id} className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium text-csc-brown">{invite.email}</p>
                        <p className="text-xs text-csc-brown/50">{ROLE_LABELS[invite.role] || invite.role}</p>
                      </div>
                      <button onClick={() => copyInviteLink(invite.token)} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                        Copy
                      </button>
                      <button onClick={() => cancelInvite(invite.id)} className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100">
                        Cancel
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-csc-brown/50">Active Team</h2>
          <div className="space-y-2">
            {employees.map(emp => (
              <div key={emp.id} className={`bg-white rounded-lg p-4 shadow-sm flex items-center gap-3 ${!emp.is_active ? 'opacity-50' : ''}`}>
                <div className="flex-1">
                  <p className="font-medium text-sm text-csc-brown">{emp.name}</p>
                  <p className="text-xs text-csc-brown/50">{ROLE_LABELS[emp.role] || emp.role}</p>
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
        </>
      )}
    </div>
  )
}
