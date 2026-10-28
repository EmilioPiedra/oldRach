import type { ProductoPublico } from '../types/store'

export const normalizarTexto = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

const ORDEN_TALLAS = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', 'xxxl']

export function comparaTallas(a: string, b: string): number {
  const ia = ORDEN_TALLAS.indexOf(a.trim().toLowerCase())
  const ib = ORDEN_TALLAS.indexOf(b.trim().toLowerCase())
  if (ia > -1 && ib > -1) return ia - ib
  if (ia > -1) return -1
  if (ib > -1) return 1
  return a.localeCompare(b, 'es', { numeric: true })
}

export function imagenesOrdenadas(p: ProductoPublico) {
  return [...p.product_images].sort((a, b) => a.position - b.position)
}

export function portadaPath(p: ProductoPublico): string | null {
  return imagenesOrdenadas(p)[0]?.path ?? null
}

export function stockTotal(p: ProductoPublico): number {
  return p.product_variants.reduce((s, v) => s + v.stock, 0)
}

export function variantesOrdenadas(p: ProductoPublico) {
  return [...p.product_variants].sort(
    (a, b) => comparaTallas(a.size, b.size) || (a.color ?? '').localeCompare(b.color ?? '', 'es'),
  )
}

export function tallasConStock(productos: ProductoPublico[]): string[] {
  const set = new Set<string>()
  for (const p of productos) for (const v of p.product_variants) if (v.stock > 0) set.add(v.size)
  return [...set].sort(comparaTallas)
}
