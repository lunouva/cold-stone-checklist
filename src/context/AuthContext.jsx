import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const SESSION_KEY = 'csc_session'
const SESSION_HOURS = 12

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const elapsed = Date.now() - session.loginAt
    if (elapsed > SESSION_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    return session.employee
  } catch {
    localStorage.removeItem(SESSION_KEY)
    return null
  }
}

export function AuthProvider({ children }) {
  const [employee, setEmployee] = useState(getStoredSession)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function login(pin) {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase.rpc('verify_pin', { input_pin: pin })
      if (rpcError) throw rpcError
      if (!data || data.length === 0) {
        setError('Invalid PIN')
        setLoading(false)
        return false
      }
      const emp = data[0]
      setEmployee(emp)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ employee: emp, loginAt: Date.now() }))
      setLoading(false)
      return true
    } catch (err) {
      setError(err.message || 'Login failed')
      setLoading(false)
      return false
    }
  }

  function logout() {
    setEmployee(null)
    localStorage.removeItem(SESSION_KEY)
  }

  const isManager = employee?.role === 'manager' || employee?.role === 'owner'

  return (
    <AuthContext.Provider value={{ employee, login, logout, loading, error, isManager }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
