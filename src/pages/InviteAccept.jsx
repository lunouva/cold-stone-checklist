import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function InviteAccept() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { authUser, loginWithGoogleRedirect, refreshEmployee, loading } = useAuth()
  const [invite, setInvite] = useState(null)
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    loadInvite()
  }, [token])

  useEffect(() => {
    if (!loading && authUser && invite && status === 'ready') {
      acceptInvite()
    }
  }, [authUser, invite, loading, status])

  async function loadInvite() {
    setStatus('loading')
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('get_invite_by_token', {
      invite_token: token
    })

    if (rpcError) {
      setError(rpcError.message)
      setStatus('error')
      return
    }

    const foundInvite = Array.isArray(data) ? data[0] : data
    if (!foundInvite) {
      setError('This invite is invalid, expired, or already accepted.')
      setStatus('error')
      return
    }

    setInvite(foundInvite)
    setStatus('ready')
  }

  async function acceptInvite() {
    setStatus('accepting')
    setError(null)

    const { error: rpcError } = await supabase.rpc('accept_organization_invite', {
      invite_token: token
    })

    if (rpcError) {
      setError(rpcError.message)
      setStatus('error')
      return
    }

    await refreshEmployee()
    navigate('/app', { replace: true })
  }

  function continueWithEmail() {
    const next = encodeURIComponent(`/invite/${token}`)
    const email = invite?.email ? `&email=${encodeURIComponent(invite.email)}` : ''
    navigate(`/login?mode=signup&next=${next}${email}`)
  }

  function continueWithGoogle() {
    loginWithGoogleRedirect(`/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`)
  }

  return (
    <div className="min-h-screen bg-sky-50 px-4 py-10">
      <div className="mx-auto max-w-md">
        <button onClick={() => navigate('/')} className="mb-8 flex items-center gap-2 text-sm font-bold text-sky-700 hover:text-csc-red">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-csc-red text-xs font-black text-white">OC</span>
          Operations Checklist
        </button>

        <div className="rounded-lg border border-sky-100 bg-white p-6 shadow-sm">
          {status === 'loading' || status === 'accepting' ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 rounded-full border-3 border-csc-red border-t-transparent animate-spin" />
              <p className="font-bold text-sky-950">{status === 'accepting' ? 'Joining workspace...' : 'Checking invite...'}</p>
            </div>
          ) : status === 'error' ? (
            <>
              <h1 className="text-2xl font-black text-sky-950">Invite needs attention</h1>
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              <button onClick={() => navigate('/login')} className="mt-5 w-full rounded-lg bg-csc-red px-4 py-3 text-sm font-extrabold text-white hover:bg-csc-red-light">
                Back to sign in
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-csc-red">Team invite</p>
              <h1 className="mt-3 text-2xl font-black text-sky-950">Join {invite.organization_name}</h1>
              <p className="mt-3 text-sm leading-6 text-sky-700">
                You were invited as a {invite.role === 'manager' ? 'manager' : 'crew member'} using {invite.email}.
              </p>

              {authUser ? (
                <button onClick={acceptInvite} className="mt-6 w-full rounded-lg bg-csc-red px-4 py-3 text-sm font-extrabold text-white hover:bg-csc-red-light">
                  Accept invite
                </button>
              ) : (
                <div className="mt-6 space-y-3">
                  <button onClick={continueWithGoogle} className="w-full rounded-lg border border-sky-200 bg-white px-4 py-3 text-sm font-extrabold text-sky-950 hover:bg-sky-50">
                    Continue with Google
                  </button>
                  <button onClick={continueWithEmail} className="w-full rounded-lg bg-csc-red px-4 py-3 text-sm font-extrabold text-white hover:bg-csc-red-light">
                    Create account with email
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
