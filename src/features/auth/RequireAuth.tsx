import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthProvider'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin, signOut } = useAuth()

  if (loading) {
    return <p className="p-6 text-stone-500">Cargando…</p>
  }
  if (!session) {
    return <Navigate to="/admin/login" replace />
  }
  if (!isAdmin) {
    return (
      <main className="max-w-md mx-auto p-6 space-y-3">
        <h1 className="text-xl font-semibold">Sin permiso de administrador</h1>
        <p className="text-stone-600">
          Tu usuario no figura como administrador. Verifica que ejecutaste el SQL del paso 2 y que
          el correo está registrado en la tabla <code>admins</code>.
        </p>
        <button onClick={signOut} className="border border-stone-300 rounded px-3 py-2">
          Cerrar sesión
        </button>
      </main>
    )
  }
  return <>{children}</>
}
