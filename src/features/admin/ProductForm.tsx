import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { BUCKET_IMAGENES, requireSupabase, urlImagen } from '../../lib/supabase'
import { mensajeError } from '../../lib/errors'
import type { Option, ProductImage, Variant } from '../../types/catalog'

const inputCls = 'w-full border border-stone-300 rounded px-2 py-1 bg-white'
const btnCls = 'border border-stone-300 rounded px-3 py-1 hover:bg-stone-100 disabled:opacity-60'
const btnPrimary = 'bg-stone-900 text-white rounded px-4 py-2 disabled:opacity-60'
const MAX_FOTO_MB = 5

const varianteVacia = (): Variant => ({ size: '', color: '', sku: '', stock: 0 })

async function leerVariantes(productId: string): Promise<Variant[]> {
  const { data, error } = await requireSupabase()
    .from('product_variants')
    .select('id,size,color,sku,stock')
    .eq('product_id', productId)
    .order('created_at')
  if (error) throw new Error(mensajeError(error))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((v: any) => ({
    id: v.id,
    size: v.size,
    color: v.color ?? '',
    sku: v.sku ?? '',
    stock: v.stock,
  }))
}

async function guardarVariantes(productId: string, variantes: Variant[]) {
  const sb = requireSupabase()

  // 1) borrar las que el usuario quitó del formulario
  const { data: existentes, error: e1 } = await sb
    .from('product_variants')
    .select('id')
    .eq('product_id', productId)
  if (e1) throw new Error(mensajeError(e1))
  const quedan = new Set(variantes.filter((v) => v.id).map((v) => v.id))
  const aBorrar = (existentes ?? []).map((x) => x.id as string).filter((vid) => !quedan.has(vid))
  if (aBorrar.length) {
    const { error } = await sb.from('product_variants').delete().in('id', aBorrar)
    if (error) throw new Error(mensajeError(error))
  }

  const aFila = (v: Variant) => ({
    product_id: productId,
    size: v.size.trim(),
    color: v.color.trim() || null,
    sku: v.sku.trim() || null,
    stock: v.stock,
  })

  // 2) actualizar las existentes
  const conId = variantes.filter((v) => v.id).map((v) => ({ id: v.id, ...aFila(v) }))
  if (conId.length) {
    const { error } = await sb.from('product_variants').upsert(conId)
    if (error) throw new Error(mensajeError(error))
  }

  // 3) crear las nuevas
  const nuevas = variantes.filter((v) => !v.id).map(aFila)
  if (nuevas.length) {
    const { error } = await sb.from('product_variants').insert(nuevas)
    if (error) throw new Error(mensajeError(error))
  }
}

export default function ProductForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const recienCreado = Boolean((location.state as { recienCreado?: boolean } | null)?.recienCreado)

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    brand_id: '',
    category_id: '',
    published: true,
  })
  const [variants, setVariants] = useState<Variant[]>([varianteVacia()])
  const [images, setImages] = useState<ProductImage[]>([])
  const [brands, setBrands] = useState<Option[]>([])
  const [categories, setCategories] = useState<Option[]>([])

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(
    recienCreado ? 'Producto creado. Ahora puedes subir las fotos.' : null,
  )

  useEffect(() => {
    async function cargar() {
      try {
        const sb = requireSupabase()
        const [b, c] = await Promise.all([
          sb.from('brands').select('id,name').order('name'),
          sb.from('categories').select('id,name').order('name'),
        ])
        if (b.error) throw new Error(mensajeError(b.error))
        if (c.error) throw new Error(mensajeError(c.error))
        setBrands((b.data ?? []) as Option[])
        setCategories((c.data ?? []) as Option[])

        if (id) {
          const [p, v, i] = await Promise.all([
            sb.from('products').select('*').eq('id', id).single(),
            leerVariantes(id),
            sb.from('product_images').select('id,path,position').eq('product_id', id).order('position'),
          ])
          if (p.error) throw new Error(mensajeError(p.error))
          if (i.error) throw new Error(mensajeError(i.error))
          setForm({
            name: p.data.name,
            description: p.data.description ?? '',
            price: String(p.data.price),
            brand_id: p.data.brand_id,
            category_id: p.data.category_id,
            published: p.data.published,
          })
          setVariants(v.length ? v : [varianteVacia()])
          setImages((i.data ?? []) as ProductImage[])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar la información.')
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [id])

  function cambiarVariante(index: number, cambios: Partial<Variant>) {
    setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, ...cambios } : v)))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)

    const precio = Number(form.price)
    if (!form.name.trim()) return setError('Escribe el nombre del producto.')
    if (form.price === '' || Number.isNaN(precio) || precio < 0) {
      return setError('Escribe un precio válido.')
    }
    if (!form.brand_id) return setError('Elige una marca.')
    if (!form.category_id) return setError('Elige una categoría.')
    if (variants.length === 0 || variants.some((v) => !v.size.trim())) {
      return setError('Cada variante necesita una talla o nombre (por ejemplo S, M, L o Única).')
    }

    setGuardando(true)
    try {
      const sb = requireSupabase()
      const datos = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price: precio,
        brand_id: form.brand_id,
        category_id: form.category_id,
        published: form.published,
      }

      let productId = id
      if (!productId) {
        const { data, error } = await sb.from('products').insert(datos).select('id').single()
        if (error) throw new Error(mensajeError(error))
        productId = data.id as string
      } else {
        const { error } = await sb.from('products').update(datos).eq('id', productId)
        if (error) throw new Error(mensajeError(error))
      }

      try {
        await guardarVariantes(productId, variants)
      } catch (err) {
        // si era un producto nuevo, lo deshacemos para no dejarlo a medias
        if (!id) await sb.from('products').delete().eq('id', productId)
        throw err
      }

      if (!id) {
        navigate(`/admin/productos/${productId}`, { replace: true, state: { recienCreado: true } })
        return
      }
      setVariants(await leerVariantes(productId))
      setAviso('Cambios guardados.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  async function subirFotos(e: ChangeEvent<HTMLInputElement>) {
    const archivos = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (!id || archivos.length === 0) return

    setError(null)
    setAviso(null)
    setSubiendo(true)
    const sb = requireSupabase()
    let posicion = images.reduce((max, i) => Math.max(max, i.position), -1) + 1

    for (const archivo of archivos) {
      if (!archivo.type.startsWith('image/')) {
        setError(`"${archivo.name}" no es una imagen.`)
        continue
      }
      if (archivo.size > MAX_FOTO_MB * 1024 * 1024) {
        setError(`"${archivo.name}" pesa más de ${MAX_FOTO_MB} MB.`)
        continue
      }
      const ext = archivo.name.split('.').pop()?.toLowerCase() || 'jpg'
      const path = `${id}/${crypto.randomUUID()}.${ext}`

      const { error: errSubida } = await sb.storage
        .from(BUCKET_IMAGENES)
        .upload(path, archivo, { contentType: archivo.type, cacheControl: '3600' })
      if (errSubida) {
        setError(errSubida.message)
        continue
      }

      const { data, error: errFila } = await sb
        .from('product_images')
        .insert({ product_id: id, path, position: posicion })
        .select('id,path,position')
        .single()
      if (errFila || !data) {
        await sb.storage.from(BUCKET_IMAGENES).remove([path])
        setError(errFila ? mensajeError(errFila) : 'No se pudo registrar la foto.')
        continue
      }
      posicion += 1
      setImages((prev) => [...prev, data as ProductImage])
    }
    setSubiendo(false)
  }

  async function quitarFoto(img: ProductImage) {
    if (!window.confirm('¿Eliminar esta foto?')) return
    setError(null)
    const sb = requireSupabase()
    await sb.storage.from(BUCKET_IMAGENES).remove([img.path])
    const { error } = await sb.from('product_images').delete().eq('id', img.id)
    if (error) return setError(mensajeError(error))
    setImages((prev) => prev.filter((i) => i.id !== img.id))
  }

  async function hacerPrincipal(img: ProductImage) {
    setError(null)
    const nuevaPos = Math.min(...images.map((i) => i.position)) - 1
    const { error } = await requireSupabase()
      .from('product_images')
      .update({ position: nuevaPos })
      .eq('id', img.id)
    if (error) return setError(mensajeError(error))
    setImages((prev) =>
      prev
        .map((i) => (i.id === img.id ? { ...i, position: nuevaPos } : i))
        .sort((a, b) => a.position - b.position),
    )
  }

  if (cargando) return <p className="text-stone-500">Cargando…</p>

  const sinMarcasOCategorias = brands.length === 0 || categories.length === 0

  return (
    <section className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{id ? 'Editar producto' : 'Nuevo producto'}</h1>
        <Link to="/admin/productos" className="text-stone-600 underline">
          Volver a productos
        </Link>
      </div>

      {sinMarcasOCategorias && (
        <p className="bg-amber-50 border border-amber-300 rounded p-3 text-sm">
          Antes de crear un producto necesitas al menos una <Link to="/admin/marcas" className="underline">marca</Link> y una{' '}
          <Link to="/admin/categorias" className="underline">categoría</Link>.
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {aviso && <p className="text-sm text-green-700">{aviso}</p>}

      <form onSubmit={guardar} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="name" className="text-sm text-stone-600">Nombre</label>
          <input
            id="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="description" className="text-sm text-stone-600">Descripción</label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className={inputCls}
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label htmlFor="price" className="text-sm text-stone-600">Precio ($)</label>
            <input
              id="price"
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="brand" className="text-sm text-stone-600">Marca</label>
            <select
              id="brand"
              value={form.brand_id}
              onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Elegir…</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="category" className="text-sm text-stone-600">Categoría</label>
            <select
              id="category"
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className={inputCls}
            >
              <option value="">Elegir…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => setForm({ ...form, published: e.target.checked })}
          />
          Visible en la tienda
        </label>

        <fieldset className="space-y-2">
          <legend className="font-medium">Tallas y stock</legend>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={v.id ?? `nueva-${i}`} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                <div>
                  <label className="text-xs text-stone-500" htmlFor={`size-${i}`}>Talla</label>
                  <input
                    id={`size-${i}`}
                    value={v.size}
                    onChange={(e) => cambiarVariante(i, { size: e.target.value })}
                    placeholder="S, M, L…"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500" htmlFor={`color-${i}`}>Color</label>
                  <input
                    id={`color-${i}`}
                    value={v.color}
                    onChange={(e) => cambiarVariante(i, { color: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500" htmlFor={`sku-${i}`}>Código</label>
                  <input
                    id={`sku-${i}`}
                    value={v.sku}
                    onChange={(e) => cambiarVariante(i, { sku: e.target.value })}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-500" htmlFor={`stock-${i}`}>Stock</label>
                  <input
                    id={`stock-${i}`}
                    type="number"
                    min="0"
                    step="1"
                    value={v.stock}
                    onChange={(e) =>
                      cambiarVariante(i, { stock: Math.max(0, parseInt(e.target.value || '0', 10) || 0) })
                    }
                    className={inputCls}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                  disabled={variants.length === 1}
                  className={btnCls}
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setVariants((prev) => [...prev, varianteVacia()])} className={btnCls}>
            Agregar talla
          </button>
        </fieldset>

        <button type="submit" disabled={guardando || sinMarcasOCategorias} className={btnPrimary}>
          {guardando ? 'Guardando…' : id ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </form>

      <div className="space-y-2">
        <h2 className="font-medium">Fotos</h2>
        {!id ? (
          <p className="text-sm text-stone-500">Guarda el producto para poder subir fotos.</p>
        ) : (
          <>
            <input type="file" accept="image/*" multiple onChange={subirFotos} disabled={subiendo} />
            {subiendo && <p className="text-sm text-stone-500">Subiendo…</p>}
            {images.length === 0 ? (
              <p className="text-sm text-stone-500">Este producto aún no tiene fotos.</p>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <li key={img.id} className="space-y-1">
                    <img
                      src={urlImagen(img.path)}
                      alt=""
                      className="w-full aspect-square object-cover rounded border border-stone-200"
                    />
                    <div className="flex flex-wrap gap-1 text-sm">
                      {idx === 0 ? (
                        <span className="text-stone-500">Principal</span>
                      ) : (
                        <button type="button" onClick={() => hacerPrincipal(img)} className="underline">
                          Hacer principal
                        </button>
                      )}
                      <button type="button" onClick={() => quitarFoto(img)} className="text-red-700 underline">
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}
