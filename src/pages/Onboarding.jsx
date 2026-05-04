import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Onboarding() {
  const navigate = useNavigate()
  const { authUser, refreshEmployee, loading } = useAuth()
  const suggestedName = useMemo(() => {
    const name = authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || ''
    return name ? `${name.split(' ')[0]}'s Store` : ''
  }, [authUser])
  const [organizationName, setOrganizationName] = useState(suggestedName)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!organizationName && suggestedName) setOrganizationName(suggestedName)
  }, [organizationName, suggestedName])

  async function createOrganization(e) {
    e.preventDefault()
    if (!authUser) {
      navigate('/login?mode=signup', { replace: true })
      return
    }

    setSaving(true)
    setError(null)

    const { error: rpcError } = await supabase.rpc('create_owner_organization', {
      org_name: organizationName.trim()
    })

    if (rpcError) {
      setError(rpcError.message)
      setSaving(false)
      return
    }

    const employee = await refreshEmployee()
    setSaving(false)
    navigate(employee ? '/app' : '/login', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 rounded-full border-3 border-csc-red border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sky-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <button onClick={() => navigate('/')} className="mb-8 flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-csc-red">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-csc-red text-xs font-black text-white">OC</span>
          Operations Checklist
        </button>

        <div className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-csc-red">Owner setup</p>
          <h1 className="mt-3 text-2xl font-black text-sky-950">Create your organization</h1>
          <p className="mt-3 text-sm leading-6 text-sky-700">
            This creates the workspace your managers and employees will join by invite.
          </p>

          <form onSubmit={createOrganization} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-sky-600">Organization name</span>
              <input
                type="text"
                value={organizationName}
                onChange={e => setOrganizationName(e.target.value)}
                placeholder="Example: Cold Stone Store 101"
                required
                minLength={2}
                className="w-full rounded-lg border border-sky-200 px-3 py-3 text-sm outline-none focus:border-csc-gold focus:ring-4 focus:ring-csc-gold/20"
              />
            </label>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-csc-red px-4 py-3 text-sm font-extrabold text-white hover:bg-csc-red-light disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create organization'}
            </button>
          </form>
        </div>

        <div className="mt-4 rounded-lg border border-sky-100 bg-white p-4 text-sm text-sky-700">
          Joining someone else's team? Use the invite link your owner or manager sent you.
        </div>
      </div>
    </div>
  )
}
