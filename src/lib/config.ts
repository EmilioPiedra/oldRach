export const NOMBRE_TIENDA = 'Tienda de ropa'

/** Solo dígitos, con código de país (ej. 593991234567). */
export const WHATSAPP_NUMBER = (
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? ''
).replace(/\D/g, '')

/** Enlace CSV de la hoja de tarifas publicada en la web. */
export const SHIPPING_SHEET_URL = (
  (import.meta.env.VITE_SHIPPING_SHEET_URL as string | undefined) ?? ''
).trim()
