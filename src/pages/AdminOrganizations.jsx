import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AdminOrganizations() {
  const navigate = useNavigate()
  const [organizations, setOrganizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadOrganizations()
  }, [])

  async function loadOrganizations() {
    setLoading(true)
    setError(null)
    const { data, error: loadError } = await supabase
      .from('organizations')
      .select('*, employees(id, role, is_active)')
      .order('created_at', { ascending: false })

    if (loadError) {
      setError(loadError.message)
      setOrganizations([])
      setLoading(false)
      return
    }

    setOrganizations((data || []).map(org => ({
      ...org,
      employee_count: org.employees?.length || 0,
      owner_count: (org.employees || []).filter(emp => emp.role === 'owner' && emp.is_active).length
    })))
    setLoading(false)
  }

  async function updateStatus(org, status) {
    setSaving(org.id)
    await supabase.from('organizations').update({ status }).eq('id', org.id)
    await loadOrganizations()
    setSaving(null)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/app/admin')} className="p-2 -ml-2 text-csc-brown/50 hover:text-csc-brown">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold text-csc-brown">Organizations</h1>
          <p className="text-xs text-csc-brown/50">Platform admin view</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-3 border-csc-red border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-lg bg-white p-6 text-sm text-csc-brown/70">
          Apply the organization migration before using this page. Supabase returned: {error}
        </div>
      ) : (
        <div className="space-y-3">
          {organizations.map(org => (
            <div key={org.id} className="rounded-lg bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-bold text-csc-brown">{org.name}</h2>
                  <p className="text-xs text-csc-brown/50">
                    {org.employee_count} team members - {org.owner_count} active owners
                  </p>
                  <p className="mt-1 text-[11px] text-csc-brown/35">
                    Created {new Date(org.created_at).toLocaleDateString()}
                  </p>
                </div>
                <select
                  value={org.status}
                  disabled={saving === org.id}
                  onChange={e => updateStatus(org, e.target.value)}
                  className="rounded-lg border px-3 py-2 text-sm text-csc-brown focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          ))}
          {organizations.length === 0 && (
            <div className="rounded-lg bg-white p-8 text-center text-csc-brown/45">
              No organizations yet.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
