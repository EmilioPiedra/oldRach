import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="p-6 text-stone-500">Cargando…</p>
  }
  if (!session) {
    return <Navigate to="/admin/login" replace />
  }
  return <>{children}</>
}
