import { Link } from 'react-router-dom'
import { urlImagen } from '../../lib/supabase'
import { aCentavos, formatear } from '../../lib/money'
import { portadaPath, stockTotal } from '../../lib/catalog-utils'
import type { ProductoPublico } from '../../types/store'

export default function ProductCard({ producto }: { producto: ProductoPublico }) {
  const foto = portadaPath(producto)
  const agotado = stockTotal(producto) === 0

  return (
    <Link
      to={`/producto/${producto.id}`}
      className="block bg-white border border-stone-200 rounded overflow-hidden"
    >
      {foto ? (
        <img
          src={urlImagen(foto)}
          alt={producto.name}
          loading="lazy"
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square bg-stone-100" />
      )}
      <div className="p-2 space-y-0.5">
        {producto.brands && <p className="text-xs text-stone-500">{producto.brands.name}</p>}
        <p className="font-medium">{producto.name}</p>
        <p>{formatear(aCentavos(producto.price))}</p>
        {agotado && <p className="text-sm text-red-700">Agotado</p>}
      </div>
    </Link>
  )
}
