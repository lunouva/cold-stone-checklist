import { createContext, useContext, useState, useEffect } from 'react'
import { getAuthRedirectUrl, isPlatformAdminEmail, supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const EMPLOYEE_LOAD_TIMEOUT_MS = 10000

function withTimeout(promise, timeoutMs, message) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)
  })

  return Promise.race([promise, timeout]).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

function cleanOAuthParams() {
  const url = new URL(window.location.href)
  const params = ['code', 'error', 'error_code', 'error_description', 'state']
  let changed = false

  params.forEach(param => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param)
      changed = true
    }
  })

  if (changed) {
    const nextUrl = `${url.pathname}${url.search}${url.hash}`
    window.history.replaceState({}, document.title, nextUrl)
  }
}

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
      setLoading(true)
      const isCallbackRoute = window.location.pathname === '/auth/callback'
      const redirectError = isCallbackRoute ? null : getOAuthErrorFromUrl()
      if (redirectError && mounted) setError(redirectError)

      try {
        const url = new URL(window.location.href)
        const oauthCode = url.searchParams.get('code')

        if (oauthCode && !isCallbackRoute) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(oauthCode)
          if (exchangeError) throw exchangeError
          cleanOAuthParams()
        }

        const { data, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) throw sessionError
        if (!mounted) return

        setAuthUser(data.session?.user || null)
        if (data.session?.user) {
          await loadEmployee()
        } else {
          setEmployee(null)
          setLoading(false)
        }
      } catch (err) {
        if (!mounted) return
        cleanOAuthParams()
        setAuthUser(null)
        setEmployee(null)
        setError(err.message || 'Could not finish login. Please try again.')
        setLoading(false)
      }
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user || null)
      window.setTimeout(() => {
        if (session?.user) {
          loadEmployee()
        } else {
          setEmployee(null)
          setLoading(false)
        }
      }, 0)
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
      const { data, error: rpcError } = await withTimeout(
        supabase.rpc('get_current_employee'),
        EMPLOYEE_LOAD_TIMEOUT_MS,
        'Login worked, but the employee profile did not load. Please refresh and try again.'
      )
      if (rpcError) throw rpcError
      const emp = Array.isArray(data) ? data[0] : data
      if (!emp || !emp.is_active) {
        setEmployee(null)
        setLoading(false)
        return null
      }
      setEmployee(emp)
      setLoading(false)
      return emp
    } catch (err) {
      setEmployee(null)
      setError(err.message || 'Could not load employee profile')
      setLoading(false)
      return null
    }
  }

  async function loginWithPassword(email, password) {
    setLoading(true)
    setError(null)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })
    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return false
    }
    setAuthUser(data.user || null)
    return loadEmployee()
  }

  async function signUpWithPassword({ name, email, password, redirectPath = '/auth/callback?next=/onboarding' }) {
    setLoading(true)
    setError(null)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        emailRedirectTo: getAuthRedirectUrl(redirectPath)
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
    setAuthUser(data.user || null)
    return loadEmployee()
  }

  async function loginWithGoogle() {
    return loginWithGoogleRedirect('/auth/callback')
  }

  async function loginWithGoogleRedirect(nextPath = '/auth/callback') {
    setLoading(true)
    setError(null)

    const { error: googleError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: getAuthRedirectUrl(nextPath),
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
  const isOwner = employee?.role === 'owner'
  const isPlatformAdmin = isPlatformAdminEmail(authUser?.email)

  return (
    <AuthContext.Provider value={{
      employee,
      authUser,
      loginWithPassword,
      signUpWithPassword,
      loginWithGoogle,
      loginWithGoogleRedirect,
      logout,
      refreshEmployee: loadEmployee,
      loading,
      error,
      isManager,
      isOwner,
      isPlatformAdmin
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
