import { requireSupabase } from './supabase'
import { mensajeError } from './errors'
import { aCentavos } from './money'
import type { DetalleVariante, ProductoPublico } from '../types/store'

const SELECT_PRODUCTO =
  'id,name,description,price,brand_id,category_id,brands(name),categories(name),' +
  'product_variants(id,size,color,stock),product_images(path,position)'

/** Productos publicados (las políticas RLS ya ocultan los no publicados). */
export async function listarProductos(): Promise<ProductoPublico[]> {
  const { data, error } = await requireSupabase()
    .from('products')
    .select(SELECT_PRODUCTO)
    .order('created_at', { ascending: false })
  if (error) throw new Error(mensajeError(error))
  return (data ?? []) as unknown as ProductoPublico[]
}

export async function obtenerProducto(id: string): Promise<ProductoPublico | null> {
  const { data, error } = await requireSupabase()
    .from('products')
    .select(SELECT_PRODUCTO)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    if (error.code === '22P02') return null // id con formato inválido
    throw new Error(mensajeError(error))
  }
  return (data as unknown as ProductoPublico | null) ?? null
}

/** Datos actuales (precio, stock, nombre) de las variantes del carrito. */
export async function cargarDetallesVariantes(ids: string[]): Promise<DetalleVariante[]> {
  if (ids.length === 0) return []
  const { data, error } = await requireSupabase()
    .from('product_variants')
    .select('id,size,color,stock,products(id,name,price,product_images(path,position))')
    .in('id', ids)
  if (error) throw new Error(mensajeError(error))

  const resultado: DetalleVariante[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of (data ?? []) as any[]) {
    const p = Array.isArray(v.products) ? v.products[0] : v.products
    if (!p) continue
    const imagenes = [...(p.product_images ?? [])].sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position,
    )
    resultado.push({
      id: v.id,
      size: v.size,
      color: v.color ?? null,
      stock: v.stock,
      productId: p.id,
      name: p.name,
      priceCents: aCentavos(Number(p.price)),
      imagePath: imagenes[0]?.path ?? null,
    })
  }
  return resultado
}
