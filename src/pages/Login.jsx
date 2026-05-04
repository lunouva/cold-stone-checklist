import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [searchParams] = useSearchParams()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [localError, setLocalError] = useState(null)
  const { loginWithPassword, signUpWithPassword, loginWithGoogleRedirect, loading, error } = useAuth()
  const navigate = useNavigate()
  const nextPath = searchParams.get('next')

  useEffect(() => {
    const requestedMode = searchParams.get('mode')
    const requestedEmail = searchParams.get('email')
    const requestedError = searchParams.get('error')
    if (requestedMode === 'signup' || requestedMode === 'login') setMode(requestedMode)
    if (requestedEmail) setForm(current => ({ ...current, email: requestedEmail }))
    if (requestedError) setLocalError(requestedError)
  }, [searchParams])

  function getPostAuthPath() {
    if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) return nextPath
    return mode === 'signup' ? '/onboarding' : '/app'
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const success = mode === 'login'
      ? await loginWithPassword(form.email, form.password)
      : await signUpWithPassword({
          ...form,
          redirectPath: `/auth/callback?next=${encodeURIComponent(getPostAuthPath())}`
        })
    if (success) {
      navigate(getPostAuthPath(), { replace: true })
    }
  }

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-csc-red flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <button onClick={() => navigate('/')} className="text-3xl font-bold text-white mb-1">Operations Checklist</button>
        <p className="text-csc-cream/80 text-lg">{mode === 'signup' ? 'Create the owner account' : 'Sign in to your workspace'}</p>
      </div>

      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm">
        <div className="grid grid-cols-2 gap-2 mb-5 rounded-xl bg-csc-cream p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'login' ? 'bg-white text-csc-red shadow-sm' : 'text-csc-brown/60'}`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'signup' ? 'bg-white text-csc-red shadow-sm' : 'text-csc-brown/60'}`}
          >
            Create
          </button>
        </div>

        {(error || localError) && (
          <p className="text-center text-red-500 text-sm mb-4">{error || localError}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
            placeholder="Owner full name"
              required
              className="w-full px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
            />
          )}
          <input
            type="email"
            value={form.email}
            onChange={e => updateField('email', e.target.value)}
            placeholder="Email"
            autoComplete="email"
            required
            className="w-full px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
          />
          <input
            type="password"
            value={form.password}
            onChange={e => updateField('password', e.target.value)}
            placeholder="Password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={6}
            required
            className="w-full px-3 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-csc-gold/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-csc-red text-white rounded-xl text-sm font-semibold hover:bg-csc-red-light transition-colors disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Owner Account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-csc-brown/40">or</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={() => loginWithGoogleRedirect(`/auth/callback?next=${encodeURIComponent(getPostAuthPath())}`)}
          disabled={loading}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-csc-brown hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Continue with Google
        </button>

        {mode === 'signup' && (
          <p className="text-[11px] text-center text-csc-brown/45 mt-4">
            Managers and employees should use the invite link from their owner or manager.
          </p>
        )}

        {loading && (
          <div className="flex justify-center mt-4">
            <div className="w-6 h-6 border-2 border-csc-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
