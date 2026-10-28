import { parseCsv } from './csv'

export type Tarifa = { provincia: string; canton: string; zona: string; centavos: number }
export type Seleccion = { provincia: string; canton: string; zona: string }
export type Envio =
  | { estado: 'incompleto' }
  | { estado: 'tarifa'; centavos: number; etiqueta: string }
  | { estado: 'consultar' }

/** Valor especial del selector de provincia: «Mi destino no está en la lista». */
export const OTRO = '__otro__'
const ZONA_GENERAL = 'General'

const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

/** Convierte "2,50", "$2.50", "1.234,50" o "1,234.50" a centavos. Devuelve null si no es válido. */
export function parsearMonto(texto: string): number | null {
  let t = texto.replace(/[^\d.,-]/g, '')
  if (!t) return null
  const ultimaComa = t.lastIndexOf(',')
  const ultimoPunto = t.lastIndexOf('.')
  if (ultimaComa > -1 && ultimoPunto > -1) {
    // el separador decimal es el que aparece al final
    t = ultimaComa > ultimoPunto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '')
  } else if (ultimaComa > -1) {
    t = t.split(',').length > 2 ? t.replace(/,/g, '') : t.replace(',', '.')
  }
  const n = Number(t)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100)
}

function esActiva(valor: string): boolean {
  return ['si', 's', 'true', 'verdadero', '1', 'x', 'yes', 'activa', 'activo'].includes(
    normalizar(valor),
  )
}

const ALIAS = {
  provincia: ['provincia'],
  canton: ['canton', 'ciudad'],
  zona: ['zona'],
  tarifa: ['tarifa', 'precio', 'costo'],
  activa: ['activa', 'activo'],
}

function buscarColumna(encabezados: string[], alias: string[]): number {
  return encabezados.findIndex((h) => alias.includes(h))
}

/** Convierte el CSV de la hoja en tarifas válidas. Lanza un error si el formato no es el esperado. */
export function parseTarifasCsv(texto: string): Tarifa[] {
  const filas = parseCsv(texto)
  if (filas.length === 0) throw new Error('La hoja de tarifas está vacía.')

  const encabezados = filas[0].map(normalizar)
  const iProv = buscarColumna(encabezados, ALIAS.provincia)
  const iCanton = buscarColumna(encabezados, ALIAS.canton)
  const iZona = buscarColumna(encabezados, ALIAS.zona)
  const iTarifa = buscarColumna(encabezados, ALIAS.tarifa)
  const iActiva = buscarColumna(encabezados, ALIAS.activa)

  if (iProv < 0 || iCanton < 0 || iTarifa < 0) {
    throw new Error('La hoja de tarifas no tiene las columnas Provincia, Cantón y Tarifa.')
  }

  const vistos = new Set<string>()
  const resultado: Tarifa[] = []

  for (const fila of filas.slice(1)) {
    const provincia = (fila[iProv] ?? '').trim()
    const canton = (fila[iCanton] ?? '').trim()
    const zona = ((iZona >= 0 ? fila[iZona] : '') ?? '').trim() || ZONA_GENERAL
    if (!provincia || !canton) continue
    if (iActiva >= 0 && !esActiva(fila[iActiva] ?? '')) continue

    const centavos = parsearMonto(fila[iTarifa] ?? '')
    if (centavos === null) continue // sin tarifa válida: no se inventa un valor

    const clave = [provincia, canton, zona].map(normalizar).join('|')
    if (vistos.has(clave)) continue
    vistos.add(clave)
    resultado.push({ provincia, canton, zona, centavos })
  }
  return resultado
}

// ---------- Descarga con copia local ----------

const CLAVE_CACHE = 'tienda:tarifas:v1'
const FRESCO_MS = 5 * 60 * 1000
const TIMEOUT_MS = 8000

type Cache = { url: string; t: number; tarifas: Tarifa[] }

function leerCache(url: string): Cache | null {
  try {
    const raw = localStorage.getItem(CLAVE_CACHE)
    if (!raw) return null
    const c = JSON.parse(raw) as Cache
    return c.url === url && Array.isArray(c.tarifas) ? c : null
  } catch {
    return null
  }
}

function guardarCache(url: string, tarifas: Tarifa[]) {
  try {
    localStorage.setItem(CLAVE_CACHE, JSON.stringify({ url, t: Date.now(), tarifas }))
  } catch {
    /* sin almacenamiento disponible: no pasa nada */
  }
}

export type ResultadoTarifas = { tarifas: Tarifa[]; desactualizado: boolean }

export async function cargarTarifas(url: string): Promise<ResultadoTarifas> {
  const cache = leerCache(url)
  if (cache && Date.now() - cache.t < FRESCO_MS) {
    return { tarifas: cache.tarifas, desactualizado: false }
  }

  const controlador = new AbortController()
  const temporizador = setTimeout(() => controlador.abort(), TIMEOUT_MS)
  try {
    const resp = await fetch(url, { cache: 'no-store', signal: controlador.signal })
    if (!resp.ok) throw new Error(`No se pudo leer la hoja (HTTP ${resp.status}).`)
    const tarifas = parseTarifasCsv(await resp.text())
    guardarCache(url, tarifas)
    return { tarifas, desactualizado: false }
  } catch (err) {
    // si falla la red, usamos la última copia guardada y avisamos
    if (cache) return { tarifas: cache.tarifas, desactualizado: true }
    throw err
  } finally {
    clearTimeout(temporizador)
  }
}

// ---------- Selección de destino ----------

function unicos(valores: string[]): string[] {
  return [...new Set(valores)].sort((a, b) => a.localeCompare(b, 'es'))
}

export const provincias = (t: Tarifa[]) => unicos(t.map((x) => x.provincia))

export const cantones = (t: Tarifa[], provincia: string) =>
  unicos(t.filter((x) => x.provincia === provincia).map((x) => x.canton))

export const zonas = (t: Tarifa[], provincia: string, canton: string) =>
  unicos(t.filter((x) => x.provincia === provincia && x.canton === canton).map((x) => x.zona))

export function resolverEnvio(t: Tarifa[], s: Seleccion): Envio {
  if (s.provincia === OTRO) return { estado: 'consultar' }
  if (!s.provincia || !s.canton) return { estado: 'incompleto' }

  const candidatas = t.filter((x) => x.provincia === s.provincia && x.canton === s.canton)
  if (candidatas.length === 0) return { estado: 'incompleto' }

  if (candidatas.length === 1) {
    const c = candidatas[0]
    return { estado: 'tarifa', centavos: c.centavos, etiqueta: `${c.provincia}, ${c.canton}` }
  }

  const elegida = candidatas.find((x) => x.zona === s.zona)
  if (!elegida) return { estado: 'incompleto' }
  return {
    estado: 'tarifa',
    centavos: elegida.centavos,
    etiqueta: `${elegida.provincia}, ${elegida.canton}, ${elegida.zona}`,
  }
}
