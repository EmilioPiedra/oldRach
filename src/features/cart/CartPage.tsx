import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from './CartProvider'
import ShippingSelector from '../shipping/ShippingSelector'
import { cargarDetallesVariantes } from '../../lib/catalog-api'
import { urlImagen } from '../../lib/supabase'
import { formatear } from '../../lib/money'
import { SHIPPING_SHEET_URL, WHATSAPP_NUMBER } from '../../lib/config'
import {
  cargarTarifas,
  resolverEnvio,
  type Envio,
  type Seleccion,
  type Tarifa,
} from '../../lib/shipping-sheet'
import { construirMensaje, enlaceWhatsApp } from '../../lib/whatsapp'
import type { DetalleVariante } from '../../types/store'

const inputCls = 'w-full border border-stone-300 rounded px-2 py-1 bg-white'

export default function CartPage() {
  const { lineas, setCantidad, quitar, vaciar, ajustarAStock } = useCart()

  // ---------- Datos en vivo de los productos del carrito ----------
  const [detalles, setDetalles] = useState<Record<string, DetalleVariante>>({})
  const [cargado, setCargado] = useState(false)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [avisos, setAvisos] = useState<string[]>([])

  const idsKey = lineas.map((l) => l.variantId).sort().join(',')

  useEffect(() => {
    if (!idsKey) {
      setCargado(true)
      return
    }
    let cancelado = false
    cargarDetallesVariantes(idsKey.split(','))
      .then((lista) => {
        if (cancelado) return
        const mapa: Record<string, DetalleVariante> = {}
        for (const d of lista) mapa[d.id] = d
        setDetalles(mapa)
        setErrorCarga(null)

        // si alguien compró mientras tanto, bajamos las cantidades al stock real
        const stocks: Record<string, number> = {}
        const nuevosAvisos: string[] = []
        for (const l of lineas) {
          const d = mapa[l.variantId]
          if (d && d.stock > 0 && l.qty > d.stock) {
            stocks[d.id] = d.stock
            nuevosAvisos.push(`${d.name} (talla ${d.size}): solo quedan ${d.stock}.`)
          }
        }
        if (Object.keys(stocks).length > 0) {
          ajustarAStock(stocks)
          setAvisos(nuevosAvisos)
        }
      })
      .catch((err) => {
        if (!cancelado) setErrorCarga(err instanceof Error ? err.message : 'No se pudo cargar el carrito.')
      })
      .finally(() => {
        if (!cancelado) setCargado(true)
      })
    return () => {
      cancelado = true
    }
    // Se recarga solo cuando cambian los productos del carrito, no las cantidades.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  // ---------- Tarifas de envío (Google Sheets) ----------
  const [tarifas, setTarifas] = useState<Tarifa[]>([])
  const [tarifasListas, setTarifasListas] = useState(!SHIPPING_SHEET_URL)
  const [errorTarifas, setErrorTarifas] = useState<string | null>(null)
  const [desactualizado, setDesactualizado] = useState(false)

  useEffect(() => {
    if (!SHIPPING_SHEET_URL) return
    let cancelado = false
    cargarTarifas(SHIPPING_SHEET_URL)
      .then((r) => {
        if (cancelado) return
        setTarifas(r.tarifas)
        setDesactualizado(r.desactualizado)
      })
      .catch(() => {
        if (!cancelado) setErrorTarifas('No se pudieron cargar las tarifas de envío.')
      })
      .finally(() => {
        if (!cancelado) setTarifasListas(true)
      })
    return () => {
      cancelado = true
    }
  }, [])

  // ---------- Datos del pedido ----------
  const [seleccion, setSeleccion] = useState<Seleccion>({ provincia: '', canton: '', zona: '' })
  const [destinoTexto, setDestinoTexto] = useState('')
  const [nombre, setNombre] = useState('')
  const [referencia, setReferencia] = useState('')

  // ---------- Cálculos (siempre con datos actuales, en centavos) ----------
  const vista = lineas.map((l) => {
    const d = detalles[l.variantId]
    const disponible = Boolean(d && d.stock > 0)
    const qty = d ? Math.min(l.qty, d.stock) : 0
    return { variantId: l.variantId, d, disponible, qty, subtotal: d && disponible ? d.priceCents * qty : 0 }
  })
  const disponibles = vista.filter((v) => v.disponible)
  const subtotal = disponibles.reduce((s, v) => s + v.subtotal, 0)

  const soloConsulta = tarifasListas && tarifas.length === 0
  const envio: Envio = soloConsulta ? { estado: 'consultar' } : resolverEnvio(tarifas, seleccion)
  const costoEnvio = envio.estado === 'tarifa' ? envio.centavos : 0
  const total = subtotal + costoEnvio

  const faltantes: string[] = []
  if (!WHATSAPP_NUMBER) faltantes.push('La tienda aún no tiene un número de WhatsApp configurado.')
  if (disponibles.length === 0) faltantes.push('No hay productos disponibles en el carrito.')
  if (!tarifasListas) faltantes.push('Cargando tarifas de envío…')
  else if (envio.estado === 'incompleto') faltantes.push('Elige tu destino de entrega.')
  else if (envio.estado === 'consultar' && !destinoTexto.trim()) {
    faltantes.push('Escribe la ciudad y provincia de entrega.')
  }

  let enlace: string | null = null
  if (faltantes.length === 0) {
    const mensaje = construirMensaje({
      lineas: disponibles.map((v) => ({
        nombre: v.d!.name,
        talla: v.d!.size,
        color: v.d!.color,
        qty: v.qty,
        subtotalCentavos: v.subtotal,
      })),
      subtotalCentavos: subtotal,
      envio: envio.estado === 'tarifa' ? { tipo: 'tarifa', centavos: envio.centavos } : { tipo: 'consultar' },
      destino: envio.estado === 'tarifa' ? envio.etiqueta : destinoTexto.trim(),
      nombre,
      referencia,
    })
    enlace = enlaceWhatsApp(WHATSAPP_NUMBER, mensaje)
  }

  // ---------- Pantalla ----------
  if (lineas.length === 0) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Carrito</h1>
        <p className="text-stone-500">Tu carrito está vacío.</p>
        <Link to="/" className="underline">Ver el catálogo</Link>
      </section>
    )
  }

  if (!cargado) return <p className="text-stone-500">Cargando carrito…</p>

  return (
    <section className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">Carrito</h1>

      {errorCarga && (
        <p role="alert" className="text-sm text-red-700">{errorCarga}</p>
      )}
      {avisos.length > 0 && (
        <ul className="bg-amber-50 border border-amber-300 rounded p-3 text-sm space-y-1">
          {avisos.map((a) => (
            <li key={a}>{a} Ajustamos la cantidad.</li>
          ))}
        </ul>
      )}

      <ul className="bg-white border border-stone-200 rounded divide-y divide-stone-200">
        {vista.map((v) => (
          <li key={v.variantId} className="p-3 flex gap-3">
            {v.d?.imagePath ? (
              <img src={urlImagen(v.d.imagePath)} alt="" className="w-16 h-16 object-cover rounded" />
            ) : (
              <div className="w-16 h-16 bg-stone-100 rounded" />
            )}
            <div className="flex-1 space-y-1">
              {v.d ? (
                <>
                  <p className="font-medium">{v.d.name}</p>
                  <p className="text-sm text-stone-500">
                    Talla {v.d.size}
                    {v.d.color ? ` · ${v.d.color}` : ''} · {formatear(v.d.priceCents)} c/u
                  </p>
                </>
              ) : (
                <p className="font-medium">Producto no disponible</p>
              )}

              {v.disponible && v.d ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Quitar una unidad"
                    onClick={() => setCantidad(v.variantId, v.qty - 1)}
                    className="border border-stone-300 rounded w-8 h-8"
                  >
                    −
                  </button>
                  <span aria-live="polite" className="w-6 text-center">{v.qty}</span>
                  <button
                    type="button"
                    aria-label="Agregar una unidad"
                    disabled={v.qty >= v.d.stock}
                    onClick={() => setCantidad(v.variantId, v.qty + 1)}
                    className="border border-stone-300 rounded w-8 h-8 disabled:opacity-40"
                  >
                    +
                  </button>
                  {v.qty >= v.d.stock && <span className="text-xs text-stone-500">Máximo disponible</span>}
                </div>
              ) : (
                <p className="text-sm text-red-700">
                  Agotado o retirado de la tienda. No se incluirá en el pedido.
                </p>
              )}
            </div>
            <div className="text-right space-y-1">
              {v.disponible && <p>{formatear(v.subtotal)}</p>}
              <button type="button" onClick={() => quitar(v.variantId)} className="text-sm text-red-700 underline">
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" onClick={() => window.confirm('¿Vaciar el carrito?') && vaciar()} className="text-sm underline">
        Vaciar carrito
      </button>

      <div className="space-y-3">
        <h2 className="font-medium">Envío</h2>
        {!tarifasListas ? (
          <p className="text-stone-500 text-sm">Cargando tarifas…</p>
        ) : (
          <>
            {errorTarifas && (
              <p role="alert" className="text-sm text-amber-800">
                {errorTarifas} El costo de envío se confirmará por WhatsApp.
              </p>
            )}
            {desactualizado && (
              <p className="text-sm text-amber-800">
                Mostramos la última tarifa guardada; podría haber cambiado. Se confirmará por WhatsApp.
              </p>
            )}
            <ShippingSelector
              tarifas={tarifas}
              soloConsulta={soloConsulta}
              valor={seleccion}
              onChange={setSeleccion}
              destinoTexto={destinoTexto}
              onDestinoTexto={setDestinoTexto}
            />
          </>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="font-medium">Tus datos (opcional)</h2>
        <div className="space-y-1">
          <label htmlFor="nombre" className="text-sm text-stone-600">Nombre</label>
          <input id="nombre" className={inputCls} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="referencia" className="text-sm text-stone-600">Dirección o referencia de entrega</label>
          <input id="referencia" className={inputCls} value={referencia} onChange={(e) => setReferencia(e.target.value)} />
        </div>
      </div>

      <dl className="bg-white border border-stone-200 rounded p-3 space-y-1">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd>{formatear(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Envío</dt>
          <dd>
            {envio.estado === 'tarifa'
              ? formatear(envio.centavos)
              : envio.estado === 'consultar'
                ? 'Consultar envío'
                : 'Elige tu destino'}
          </dd>
        </div>
        <div className="flex justify-between font-semibold text-lg border-t border-stone-200 pt-1">
          <dt>{envio.estado === 'tarifa' ? 'Total' : 'Total sin envío'}</dt>
          <dd>{formatear(total)}</dd>
        </div>
      </dl>

      {enlace ? (
        <a
          href={enlace}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-green-700 text-white rounded px-4 py-2"
        >
          Confirmar pedido por WhatsApp
        </a>
      ) : (
        <div className="space-y-1">
          <button type="button" disabled className="bg-green-700 text-white rounded px-4 py-2 opacity-50">
            Confirmar pedido por WhatsApp
          </button>
          <ul className="text-sm text-stone-600">
            {faltantes.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
