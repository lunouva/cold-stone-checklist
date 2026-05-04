import { createContext, useContext, useState, useEffect } from 'react'
import { getAuthRedirectUrl, supabase } from '../lib/supabase'

const AuthContext = createContext(null)

function getOAuthErrorFromUrl() {
  if (typeof window === 'undefined') return null

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const searchParams = new URLSearchParams(window.location.search)
  const message = hashParams.get('error_description')
    || searchParams.get('error_description')
    || hashParams.get('error')
    || searchParams.get('error')

  if (!message) return null

  window.history.replaceState({}, document.title, window.location.pathname)
  return message
}

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(null)
  const [authUser, setAuthUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true

    async function initAuth() {
      const redirectError = getOAuthErrorFromUrl()
      if (redirectError && mounted) setError(redirectError)

      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setAuthUser(data.session?.user || null)
      if (data.session?.user) {
        await loadEmployee()
      } else {
        setEmployee(null)
        setLoading(false)
      }
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
      if (session?.user) {
        loadEmployee()
      } else {
        setEmployee(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function loadEmployee() {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('get_current_employee')
      if (rpcError) throw rpcError
      const emp = Array.isArray(data) ? data[0] : data
      if (!emp || !emp.is_active) {
        setEmployee(null)
        setError('No active employee profile found for this login.')
        setLoading(false)
        return false
      }
      setEmployee(emp)
      setLoading(false)
      return true
    } catch (err) {
      setEmployee(null)
      setError(err.message || 'Could not load employee profile')
      setLoading(false)
      return false
    }
  }

  async function loginWithPassword(email, password) {
    setLoading(true)
    setError(null)
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return false
    }
    return true
  }

  async function signUpWithPassword({ name, email, password }) {
    setLoading(true)
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: getAuthRedirectUrl()
      }
    })
    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return false
    }
    if (!data.session) {
      setError('Check your email to confirm your account, then sign in.')
      setLoading(false)
      return false
    }
    return true
  }

  async function loginWithGoogle() {
    setLoading(true)
    setError(null)

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(),
        queryParams: {
          prompt: 'select_account'
        }
      }
    })
    if (googleError) {
      setError(googleError.message)
      setLoading(false)
      return false
    }
    return true
  }

  async function logout() {
    setEmployee(null)
    setAuthUser(null)
    await supabase.auth.signOut()
  }

  const isManager = employee?.role === 'manager' || employee?.role === 'owner'

  return (
    <AuthContext.Provider value={{
      employee,
      authUser,
      loginWithPassword,
      signUpWithPassword,
      loginWithGoogle,
      logout,
      loading,
      error,
      isManager
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
