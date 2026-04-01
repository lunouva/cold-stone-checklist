import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [pin, setPin] = useState('')
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()

  async function handleKey(digit) {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length === 4) {
      const success = await login(newPin)
      if (success) {
        navigate('/', { replace: true })
      } else {
        setTimeout(() => setPin(''), 500)
      }
    }
  }

  function handleDelete() {
    setPin(p => p.slice(0, -1))
  }

  return (
    <div className="min-h-screen bg-csc-red flex flex-col items-center justify-center px-4">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-1">Cold Stone Creamery</h1>
        <p className="text-csc-cream/80 text-lg">Employee Checklist</p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-xs">
        <p className="text-center text-csc-brown/60 text-sm mb-4">Enter your 4-digit PIN</p>

        {/* PIN dots */}
        <div className="flex justify-center gap-4 mb-6">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                i < pin.length
                  ? 'bg-csc-red border-csc-red scale-110'
                  : 'border-csc-brown/30'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-red-500 text-sm mb-4 animate-pulse">{error}</p>
        )}

        {/* Numeric keypad */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button
              key={d}
              onClick={() => handleKey(String(d))}
              disabled={loading}
              className="h-16 rounded-xl bg-csc-cream text-2xl font-semibold text-csc-brown
                         hover:bg-csc-gold/20 active:bg-csc-gold/40 transition-colors
                         disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <div /> {/* empty space */}
          <button
            onClick={() => handleKey('0')}
            disabled={loading}
            className="h-16 rounded-xl bg-csc-cream text-2xl font-semibold text-csc-brown
                       hover:bg-csc-gold/20 active:bg-csc-gold/40 transition-colors
                       disabled:opacity-50"
          >
            0
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="h-16 rounded-xl bg-csc-cream text-lg text-csc-brown/60
                       hover:bg-red-100 active:bg-red-200 transition-colors
                       disabled:opacity-50"
          >
            DEL
          </button>
        </div>

        {loading && (
          <div className="flex justify-center mt-4">
            <div className="w-6 h-6 border-2 border-csc-red border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
