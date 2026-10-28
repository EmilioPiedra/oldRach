import { useAuth } from '../auth/AuthProvider'

export default function AdminHome() {
  const { session, signOut } = useAuth()

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Hola, administrador</h1>
      <p className="text-stone-600">
        Sesión iniciada como <strong>{session?.user.email}</strong>.
      </p>
      <button
        onClick={signOut}
        className="border border-stone-300 rounded px-3 py-2 hover:bg-stone-100"
      >
        Cerrar sesión
      </button>
    </main>
  )
}
