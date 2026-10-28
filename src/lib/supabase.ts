import { createClient, type SupabaseClient } from '@supabase/supabase-js'


const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && key)

// Si faltan las variables, la parte pública sigue funcionando
// y solo el login mostrará un aviso.
export const supabase: SupabaseClient | null = supabaseConfigurado
  ? createClient(url!, key!)
  : null

/** Para usar dentro del panel (ya hay sesión, así que Supabase está configurado). */
export function requireSupabase(): SupabaseClient {
  if (!supabase) throw new Error('Supabase no está configurado (.env.local).')
  return supabase
}

export const BUCKET_IMAGENES = 'product-images'

export function urlImagen(path: string): string {
  return requireSupabase().storage.from(BUCKET_IMAGENES).getPublicUrl(path).data.publicUrl
}
