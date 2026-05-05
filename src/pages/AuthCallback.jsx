import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function safeNextPath(value) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  return value
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refreshEmployee } = useAuth()
  const [message, setMessage] = useState('Finishing sign in...')
  const hasRun = useRef(false)

  useEffect(() => {
    let mounted = true
    if (hasRun.current) return undefined
    hasRun.current = true

    async function finishAuth() {
      const nextPath = safeNextPath(searchParams.get('next'))
      const code = searchParams.get('code')
      const error = searchParams.get('error_description') || searchParams.get('error')

      if (error) {
        navigate(`/login?error=${encodeURIComponent(error)}`, { replace: true })
        return
      }

      try {
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeError) throw exchangeError
        } else {
          await supabase.auth.getSession()
        }

        const employee = await refreshEmployee()
        if (!mounted) return

        if (nextPath?.startsWith('/invite/')) {
          navigate(nextPath, { replace: true })
        } else if (employee) {
          navigate('/app', { replace: true })
        } else {
          navigate('/onboarding', { replace: true })
        }
      } catch (err) {
        if (!mounted) return
        setMessage(err.message || 'Could not finish sign in.')
        setTimeout(() => navigate('/login', { replace: true }), 1800)
      }
    }

    finishAuth()

    return () => {
      mounted = false
    }
  }, [navigate, refreshEmployee, searchParams])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-sky-50 px-4 text-center">
      <div className="mb-4 h-9 w-9 rounded-full border-3 border-csc-red border-t-transparent animate-spin" />
      <h1 className="text-xl font-bold text-sky-950">{message}</h1>
      <p className="mt-2 max-w-sm text-sm text-sky-700">You will be sent to the right workspace as soon as the session is ready.</p>
    </div>
  )
}
