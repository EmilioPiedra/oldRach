export type ProductoPublico = {
  id: string
  name: string
  description: string | null
  price: number
  brand_id: string
  category_id: string
  brands: { name: string } | null
  categories: { name: string } | null
  product_variants: { id: string; size: string; color: string | null; stock: number }[]
  product_images: { path: string; position: number }[]
}

/** Datos actuales de una variante que está en el carrito. */
export type DetalleVariante = {
  id: string
  size: string
  color: string | null
  stock: number
  productId: string
  name: string
  priceCents: number
  imagePath: string | null
}
