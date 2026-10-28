import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const supabaseConfigurado = Boolean(url && key)

// Si faltan las variables, la parte pública sigue funcionando
// y solo el login mostrará un aviso.
export const supabase = supabaseConfigurado ? createClient(url!, key!) : null