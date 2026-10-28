// Todo el dinero se calcula en centavos (enteros) para evitar errores de decimales.

export function aCentavos(valor: number): number {
  return Math.round(valor * 100)
}

const formato = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' })

export function formatear(centavos: number): string {
  return formato.format(centavos / 100)
}
