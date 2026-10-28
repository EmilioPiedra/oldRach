import { Link, Outlet } from 'react-router-dom'
import { useCart } from '../cart/CartProvider'
import { NOMBRE_TIENDA } from '../../lib/config'

export default function PublicLayout() {
  const { count } = useCart()

  return (
    <div className="min-h-screen">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto p-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg">
            {NOMBRE_TIENDA}
          </Link>
          <Link to="/carrito" className="border border-stone-300 rounded px-3 py-1">
            Carrito ({count})
          </Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  )
}
