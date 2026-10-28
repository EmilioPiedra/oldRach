import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/** El carrito solo guarda qué variante y cuántas unidades. Precio y stock se consultan siempre en vivo. */
type Linea = { variantId: string; qty: number }

type CartState = {
  lineas: Linea[]
  /** Total de unidades (para el ícono del carrito) */
  count: number
  cantidadEnCarrito: (variantId: string) => number
  /** Devuelve cuántas unidades se agregaron realmente (respeta el stock). */
  agregar: (variantId: string, cantidad: number, stock: number) => number
  setCantidad: (variantId: string, cantidad: number) => void
  quitar: (variantId: string) => void
  vaciar: () => void
  /** Baja cantidades que superen el stock real. */
  ajustarAStock: (stocks: Record<string, number>) => void
}

const CLAVE = 'tienda:carrito:v1'

function leer(): Linea[] {
  try {
    const raw = localStorage.getItem(CLAVE)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    return data
      .filter(
        (l) =>
          l && typeof l.variantId === 'string' && Number.isInteger(l.qty) && l.qty > 0,
      )
      .map((l) => ({ variantId: l.variantId as string, qty: l.qty as number }))
  } catch {
    return []
  }
}

function guardar(lineas: Linea[]) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lineas))
  } catch {
    /* sin almacenamiento disponible: el carrito vive solo mientras la página esté abierta */
  }
}

const CartContext = createContext<CartState | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [lineas, setLineas] = useState<Linea[]>(leer)

  useEffect(() => {
    guardar(lineas)
  }, [lineas])

  // mantiene sincronizadas varias pestañas abiertas
  useEffect(() => {
    const alCambiar = (e: StorageEvent) => {
      if (e.key === CLAVE) setLineas(leer())
    }
    window.addEventListener('storage', alCambiar)
    return () => window.removeEventListener('storage', alCambiar)
  }, [])

  const cantidadEnCarrito = useCallback(
    (variantId: string) => lineas.find((l) => l.variantId === variantId)?.qty ?? 0,
    [lineas],
  )

  const agregar = useCallback<CartState['agregar']>(
    (variantId, cantidad, stock) => {
      const actual = lineas.find((l) => l.variantId === variantId)?.qty ?? 0
      const nueva = Math.min(actual + Math.max(1, Math.floor(cantidad)), stock)
      const agregadas = Math.max(0, nueva - actual)
      if (agregadas > 0) {
        setLineas((prev) =>
          prev.some((l) => l.variantId === variantId)
            ? prev.map((l) => (l.variantId === variantId ? { ...l, qty: nueva } : l))
            : [...prev, { variantId, qty: nueva }],
        )
      }
      return agregadas
    },
    [lineas],
  )

  const setCantidad = useCallback<CartState['setCantidad']>((variantId, cantidad) => {
    setLineas((prev) =>
      cantidad < 1
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, qty: Math.floor(cantidad) } : l)),
    )
  }, [])

  const quitar = useCallback((variantId: string) => {
    setLineas((prev) => prev.filter((l) => l.variantId !== variantId))
  }, [])

  const vaciar = useCallback(() => setLineas([]), [])

  const ajustarAStock = useCallback((stocks: Record<string, number>) => {
    setLineas((prev) =>
      prev.map((l) => {
        const s = stocks[l.variantId]
        return s !== undefined && s > 0 && l.qty > s ? { ...l, qty: s } : l
      }),
    )
  }, [])

  const count = lineas.reduce((s, l) => s + l.qty, 0)

  return (
    <CartContext.Provider
      value={{ lineas, count, cantidadEnCarrito, agregar, setCantidad, quitar, vaciar, ajustarAStock }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart debe usarse dentro de <CartProvider>')
  return ctx
}
