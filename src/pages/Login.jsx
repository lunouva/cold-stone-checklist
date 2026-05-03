import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { loginWithPassword, signUpWithPassword, loginWithGoogle, loading, error } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    const success = mode === 'login'
      ? await loginWithPassword(form.email, form.password)
      : await signUpWithPassword(form)
    if (success) {
      navigate('/', { replace: true })
    }
  }

  function updateField(field, value) {
    setForm(current => ({ ...current, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-csc-red flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Cold Stone Creamery</h1>
        <p className="text-csc-cream/80 text-lg">Employee Checklist</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
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

        {error && (
          <p className="text-center text-red-500 text-sm mb-4">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'signup' && (
            <input
              type="text"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              placeholder="Full name"
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
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs text-csc-brown/40">or</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <button
          type="button"
          onClick={loginWithGoogle}
          disabled={loading}
          className="w-full py-3 border border-gray-200 rounded-xl text-sm font-semibold text-csc-brown hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Continue with Google
        </button>

        {mode === 'signup' && (
          <p className="text-[11px] text-center text-csc-brown/45 mt-4">
            Use the same email your manager has on your employee profile to keep your existing checklist history.
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
