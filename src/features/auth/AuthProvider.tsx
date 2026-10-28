import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type AuthState = {
  session: Session | null
  loading: boolean
  /** Devuelve null si todo salió bien, o el mensaje de error. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  const signIn: AuthState['signIn'] = async (email, password) => {
    if (!supabase) {
      return 'Supabase no está configurado. Revisa el archivo .env.local.'
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? 'Correo o contraseña incorrectos.' : null
  }

  const signOut: AuthState['signOut'] = async () => {
    await supabase?.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ session, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
