import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (!loading && session) {
    return <Navigate to="/admin" replace />
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const mensaje = await signIn(email.trim(), password)
    setEnviando(false)
    if (mensaje) {
      setError(mensaje)
    } else {
      navigate('/admin', { replace: true })
    }
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white border border-stone-200 rounded-lg p-6 space-y-4"
      >
        <h1 className="text-xl font-semibold">Ingresar al panel</h1>

        <div className="space-y-1">
          <label htmlFor="email" className="text-sm text-stone-600">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-2 focus:outline-stone-900"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="text-sm text-stone-600">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-stone-300 rounded px-3 py-2 focus:outline-2 focus:outline-stone-900"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="w-full bg-stone-900 text-white rounded px-3 py-2 font-medium disabled:opacity-60"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
