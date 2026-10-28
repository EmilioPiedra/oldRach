import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'

const clase = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1 rounded ${isActive ? 'bg-stone-900 text-white' : 'hover:bg-stone-200'}`

export default function AdminLayout() {
  const { session, signOut } = useAuth()

  return (
    <div>
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto p-3 flex flex-wrap items-center gap-2">
          <nav className="flex gap-1 mr-auto">
            <NavLink to="/admin/productos" className={clase}>
              Productos
            </NavLink>
            <NavLink to="/admin/marcas" className={clase}>
              Marcas
            </NavLink>
            <NavLink to="/admin/categorias" className={clase}>
              Categorías
            </NavLink>
          </nav>
          <span className="text-sm text-stone-500">{session?.user.email}</span>
          <button onClick={signOut} className="border border-stone-300 rounded px-3 py-1">
            Cerrar sesión
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
