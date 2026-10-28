import { formatear } from './money'

export type LineaPedido = {
  nombre: string
  talla: string
  color: string | null
  qty: number
  subtotalCentavos: number
}

export type DatosPedido = {
  lineas: LineaPedido[]
  subtotalCentavos: number
  envio: { tipo: 'tarifa'; centavos: number } | { tipo: 'consultar' }
  destino: string
  nombre: string
  referencia: string
}

export function construirMensaje(d: DatosPedido): string {
  const partes: string[] = ['Hola, quiero confirmar este pedido:', '']

  d.lineas.forEach((l, i) => {
    const detalle = [`Talla ${l.talla}`, l.color ? `Color ${l.color}` : ''].filter(Boolean).join(', ')
    partes.push(`${i + 1}. ${l.nombre} (${detalle}) x${l.qty} = ${formatear(l.subtotalCentavos)}`)
  })

  partes.push('', `Subtotal: ${formatear(d.subtotalCentavos)}`)

  if (d.envio.tipo === 'tarifa') {
    partes.push(`Envío: ${formatear(d.envio.centavos)}`)
    partes.push(`Total: ${formatear(d.subtotalCentavos + d.envio.centavos)}`)
  } else {
    partes.push('Envío: por confirmar')
    partes.push(`Total sin envío: ${formatear(d.subtotalCentavos)}`)
  }

  partes.push('', `Destino: ${d.destino}`)
  if (d.nombre.trim()) partes.push(`Nombre: ${d.nombre.trim()}`)
  if (d.referencia.trim()) partes.push(`Dirección o referencia: ${d.referencia.trim()}`)

  return partes.join('\n')
}

export function enlaceWhatsApp(numero: string, mensaje: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`
}
