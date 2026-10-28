import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BUCKET_IMAGENES, requireSupabase, urlImagen } from '../../lib/supabase'
import { mensajeError } from '../../lib/errors'

type Fila = {
  id: string
  name: string
  price: number
  published: boolean
  brands: { name: string } | null
  categories: { name: string } | null
  product_variants: { stock: number }[]
  product_images: { path: string; position: number }[]
}

export default function ProductList() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function cargar() {
      const { data, error } = await requireSupabase()
        .from('products')
        .select(
          'id,name,price,published,brands(name),categories(name),product_variants(stock),product_images(path,position)',
        )
        .order('created_at', { ascending: false })
      if (error) setError(mensajeError(error))
      else setFilas((data ?? []) as unknown as Fila[])
      setCargando(false)
    }
    cargar()
  }, [])

  async function cambiarPublicado(p: Fila) {
    setError(null)
    const { error } = await requireSupabase()
      .from('products')
      .update({ published: !p.published })
      .eq('id', p.id)
    if (error) return setError(mensajeError(error))
    setFilas((prev) => prev.map((f) => (f.id === p.id ? { ...f, published: !f.published } : f)))
  }

  async function eliminar(p: Fila) {
    if (!window.confirm(`¿Eliminar "${p.name}" con todas sus tallas y fotos?`)) return
    setError(null)
    const sb = requireSupabase()
    const paths = p.product_images.map((i) => i.path)
    if (paths.length) await sb.storage.from(BUCKET_IMAGENES).remove(paths)
    const { error } = await sb.from('products').delete().eq('id', p.id)
    if (error) return setError(mensajeError(error))
    setFilas((prev) => prev.filter((f) => f.id !== p.id))
  }

  function portada(p: Fila): string | null {
    if (p.product_images.length === 0) return null
    const primera = [...p.product_images].sort((a, b) => a.position - b.position)[0]
    return urlImagen(primera.path)
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Productos</h1>
        <Link to="/admin/productos/nuevo" className="bg-stone-900 text-white rounded px-4 py-2">
          Nuevo producto
        </Link>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {cargando ? (
        <p className="text-stone-500">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="text-stone-500">
          Aún no hay productos. Primero crea al menos una marca y una categoría, luego agrega tu
          primer producto.
        </p>
      ) : (
        <div className="overflow-x-auto bg-white border border-stone-200 rounded">
          <table className="w-full text-sm">
            <thead className="text-left bg-stone-100">
              <tr>
                <th className="p-2">Foto</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Marca</th>
                <th className="p-2">Categoría</th>
                <th className="p-2">Precio</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Publicado</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((p) => {
                const foto = portada(p)
                const stock = p.product_variants.reduce((s, v) => s + v.stock, 0)
                return (
                  <tr key={p.id} className="border-t border-stone-200">
                    <td className="p-2">
                      {foto ? (
                        <img src={foto} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-stone-100 rounded" />
                      )}
                    </td>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2">{p.brands?.name}</td>
                    <td className="p-2">{p.categories?.name}</td>
                    <td className="p-2">${Number(p.price).toFixed(2)}</td>
                    <td className="p-2">{stock === 0 ? 'Agotado' : stock}</td>
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={p.published}
                        onChange={() => cambiarPublicado(p)}
                        aria-label={`Publicar ${p.name}`}
                      />
                    </td>
                    <td className="p-2 whitespace-nowrap space-x-2">
                      <Link
                        to={`/admin/productos/${p.id}`}
                        className="border border-stone-300 rounded px-2 py-1"
                      >
                        Editar
                      </Link>
                      <button
                        onClick={() => eliminar(p)}
                        className="border border-red-300 text-red-700 rounded px-2 py-1"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
