import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listarProductos } from '../../lib/catalog-api'
import { normalizarTexto, stockTotal, tallasConStock } from '../../lib/catalog-utils'
import ProductCard from './ProductCard'
import type { ProductoPublico } from '../../types/store'

const inputCls = 'border border-stone-300 rounded px-2 py-1 bg-white'

function aNumero(texto: string): number | null {
  if (texto.trim() === '') return null
  const n = Number(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export default function CatalogPage() {
  const [productos, setProductos] = useState<ProductoPublico[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    let cancelado = false
    listarProductos()
      .then((lista) => {
        if (!cancelado) setProductos(lista)
      })
      .catch((err) => {
        if (!cancelado) setError(err instanceof Error ? err.message : 'No se pudo cargar el catálogo.')
      })
      .finally(() => {
        if (!cancelado) setCargando(false)
      })
    return () => {
      cancelado = true
    }
  }, [])

  // Los filtros viven en la URL: se pueden compartir y el botón «atrás» funciona.
  const q = params.get('q') ?? ''
  const marca = params.get('marca') ?? ''
  const categoria = params.get('categoria') ?? ''
  const talla = params.get('talla') ?? ''
  const minTxt = params.get('min') ?? ''
  const maxTxt = params.get('max') ?? ''
  const orden = params.get('orden') ?? ''
  const soloStock = params.get('stock') === '1'

  function setParam(clave: string, valor: string, reemplazar = false) {
    setParams(
      (prev) => {
        const nuevo = new URLSearchParams(prev)
        if (valor) nuevo.set(clave, valor)
        else nuevo.delete(clave)
        return nuevo
      },
      { replace: reemplazar },
    )
  }

  const marcas = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of productos) if (p.brands) mapa.set(p.brand_id, p.brands.name)
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [productos])

  const categorias = useMemo(() => {
    const mapa = new Map<string, string>()
    for (const p of productos) if (p.categories) mapa.set(p.category_id, p.categories.name)
    return [...mapa].sort((a, b) => a[1].localeCompare(b[1], 'es'))
  }, [productos])

  const tallas = useMemo(() => tallasConStock(productos), [productos])

  const visibles = useMemo(() => {
    const texto = normalizarTexto(q)
    const min = aNumero(minTxt)
    const max = aNumero(maxTxt)

    const lista = productos.filter((p) => {
      if (texto && !normalizarTexto(`${p.name} ${p.brands?.name ?? ''}`).includes(texto)) return false
      if (marca && p.brand_id !== marca) return false
      if (categoria && p.category_id !== categoria) return false
      if (talla && !p.product_variants.some((v) => v.size === talla && v.stock > 0)) return false
      if (min !== null && p.price < min) return false
      if (max !== null && p.price > max) return false
      if (soloStock && stockTotal(p) === 0) return false
      return true
    })

    if (orden === 'precio-asc') lista.sort((a, b) => a.price - b.price)
    if (orden === 'precio-desc') lista.sort((a, b) => b.price - a.price)
    return lista
  }, [productos, q, marca, categoria, talla, minTxt, maxTxt, orden, soloStock])

  const hayFiltros = params.toString() !== ''

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Catálogo</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input
          type="search"
          placeholder="Buscar…"
          aria-label="Buscar"
          value={q}
          onChange={(e) => setParam('q', e.target.value, true)}
          className={`${inputCls} col-span-2 sm:col-span-4`}
        />
        <select aria-label="Marca" value={marca} onChange={(e) => setParam('marca', e.target.value)} className={inputCls}>
          <option value="">Todas las marcas</option>
          {marcas.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>
        <select aria-label="Categoría" value={categoria} onChange={(e) => setParam('categoria', e.target.value)} className={inputCls}>
          <option value="">Todas las categorías</option>
          {categorias.map(([id, nombre]) => (
            <option key={id} value={id}>{nombre}</option>
          ))}
        </select>
        <select aria-label="Talla" value={talla} onChange={(e) => setParam('talla', e.target.value)} className={inputCls}>
          <option value="">Todas las tallas</option>
          {tallas.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select aria-label="Ordenar" value={orden} onChange={(e) => setParam('orden', e.target.value)} className={inputCls}>
          <option value="">Más nuevos</option>
          <option value="precio-asc">Precio: menor a mayor</option>
          <option value="precio-desc">Precio: mayor a menor</option>
        </select>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio mínimo"
          aria-label="Precio mínimo"
          value={minTxt}
          onChange={(e) => setParam('min', e.target.value, true)}
          className={inputCls}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Precio máximo"
          aria-label="Precio máximo"
          value={maxTxt}
          onChange={(e) => setParam('max', e.target.value, true)}
          className={inputCls}
        />
        <label className="flex items-center gap-2 col-span-2">
          <input
            type="checkbox"
            checked={soloStock}
            onChange={(e) => setParam('stock', e.target.checked ? '1' : '')}
          />
          Solo con stock
        </label>
        {hayFiltros && (
          <button type="button" onClick={() => setParams({})} className="border border-stone-300 rounded px-2 py-1">
            Limpiar filtros
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-stone-500">Cargando catálogo…</p>
      ) : visibles.length === 0 ? (
        <p className="text-stone-500">
          {productos.length === 0
            ? 'Todavía no hay productos publicados.'
            : 'No hay productos con esos filtros.'}
        </p>
      ) : (
        <>
          <p className="text-sm text-stone-500">{visibles.length} producto(s)</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {visibles.map((p) => (
              <li key={p.id}>
                <ProductCard producto={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
