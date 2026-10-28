import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { obtenerProducto } from '../../lib/catalog-api'
import { imagenesOrdenadas, variantesOrdenadas } from '../../lib/catalog-utils'
import { urlImagen } from '../../lib/supabase'
import { aCentavos, formatear } from '../../lib/money'
import { useCart } from '../cart/CartProvider'
import type { ProductoPublico } from '../../types/store'

type Estado = 'cargando' | 'listo' | 'noEncontrado' | 'error'

export default function ProductPage() {
  const { id } = useParams()
  const { agregar, cantidadEnCarrito } = useCart()

  const [producto, setProducto] = useState<ProductoPublico | null>(null)
  const [estado, setEstado] = useState<Estado>('cargando')
  const [varianteId, setVarianteId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)
  const [mensaje, setMensaje] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancelado = false
    setEstado('cargando')
    obtenerProducto(id)
      .then((p) => {
        if (cancelado) return
        if (!p) {
          setEstado('noEncontrado')
          return
        }
        setProducto(p)
        setVarianteId(variantesOrdenadas(p).find((v) => v.stock > 0)?.id ?? '')
        setCantidad(1)
        setImgIdx(0)
        setMensaje(null)
        setEstado('listo')
      })
      .catch(() => {
        if (!cancelado) setEstado('error')
      })
    return () => {
      cancelado = true
    }
  }, [id])

  if (estado === 'cargando') return <p className="text-stone-500">Cargando…</p>
  if (estado === 'error') {
    return <p role="alert" className="text-red-700">No se pudo cargar el producto. Intenta de nuevo.</p>
  }
  if (estado === 'noEncontrado' || !producto) {
    return (
      <div className="space-y-2">
        <p>Este producto no está disponible.</p>
        <Link to="/" className="underline">Volver al catálogo</Link>
      </div>
    )
  }

  const imagenes = imagenesOrdenadas(producto)
  const variantes = variantesOrdenadas(producto)
  const variante = variantes.find((v) => v.id === varianteId)
  const restante = variante ? variante.stock - cantidadEnCarrito(variante.id) : 0
  const hayStock = variantes.some((v) => v.stock > 0)

  function onAgregar() {
    if (!variante) return
    const n = agregar(variante.id, cantidad, variante.stock)
    setMensaje(
      n > 0
        ? `Agregaste ${n} unidad(es) al carrito.`
        : 'Ya tienes en el carrito todas las unidades disponibles de esta talla.',
    )
    setCantidad(1)
  }

  return (
    <article className="grid md:grid-cols-2 gap-6">
      <div className="space-y-2">
        {imagenes.length > 0 ? (
          <>
            <img
              src={urlImagen(imagenes[Math.min(imgIdx, imagenes.length - 1)].path)}
              alt={producto.name}
              className="w-full aspect-square object-cover rounded border border-stone-200"
            />
            {imagenes.length > 1 && (
              <ul className="flex gap-2 flex-wrap">
                {imagenes.map((img, i) => (
                  <li key={img.path}>
                    <button
                      type="button"
                      onClick={() => setImgIdx(i)}
                      aria-label={`Ver foto ${i + 1}`}
                      className={`block border rounded overflow-hidden ${i === imgIdx ? 'border-stone-900' : 'border-stone-200'}`}
                    >
                      <img src={urlImagen(img.path)} alt="" className="w-14 h-14 object-cover" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="w-full aspect-square bg-stone-100 rounded" />
        )}
      </div>

      <div className="space-y-4">
        <Link to="/" className="text-sm text-stone-600 underline">← Catálogo</Link>
        <div>
          {producto.brands && <p className="text-sm text-stone-500">{producto.brands.name}</p>}
          <h1 className="text-2xl font-semibold">{producto.name}</h1>
          {producto.categories && <p className="text-sm text-stone-500">{producto.categories.name}</p>}
        </div>
        <p className="text-xl">{formatear(aCentavos(producto.price))}</p>
        {producto.description && <p className="whitespace-pre-line text-stone-700">{producto.description}</p>}

        {!hayStock ? (
          <p className="text-red-700 font-medium">Agotado</p>
        ) : (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm text-stone-600">Talla</legend>
              <div className="flex flex-wrap gap-2">
                {variantes.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    disabled={v.stock === 0}
                    aria-pressed={v.id === varianteId}
                    onClick={() => {
                      setVarianteId(v.id)
                      setCantidad(1)
                      setMensaje(null)
                    }}
                    className={`border rounded px-3 py-1 disabled:opacity-40 disabled:line-through ${
                      v.id === varianteId ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-300 bg-white'
                    }`}
                  >
                    {v.size}
                    {v.color ? ` · ${v.color}` : ''}
                  </button>
                ))}
              </div>
              {variante && (
                <p className="text-sm text-stone-500">
                  {variante.stock <= 3 ? `Quedan ${variante.stock}` : 'Disponible'}
                </p>
              )}
            </fieldset>

            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label htmlFor="cantidad" className="text-sm text-stone-600">Cantidad</label>
                <input
                  id="cantidad"
                  type="number"
                  min={1}
                  max={Math.max(1, restante)}
                  value={cantidad}
                  disabled={restante <= 0}
                  onChange={(e) =>
                    setCantidad(Math.min(Math.max(1, parseInt(e.target.value || '1', 10) || 1), Math.max(1, restante)))
                  }
                  className="w-20 border border-stone-300 rounded px-2 py-1 bg-white"
                />
              </div>
              <button
                type="button"
                onClick={onAgregar}
                disabled={!variante || restante <= 0}
                className="bg-stone-900 text-white rounded px-4 py-2 disabled:opacity-50"
              >
                Agregar al carrito
              </button>
            </div>

            {mensaje && (
              <p className="text-sm text-green-700">
                {mensaje} <Link to="/carrito" className="underline">Ver carrito</Link>
              </p>
            )}
          </>
        )}
      </div>
    </article>
  )
}
