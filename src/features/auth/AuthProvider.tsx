import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

type AuthState = {
  session: Session | null
  /** true mientras se revisa la sesión y el permiso de administrador */
  loading: boolean
  isAdmin: boolean
  /** Devuelve null si todo salió bien, o el mensaje de error. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [adminInfo, setAdminInfo] = useState<{ userId: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!supabase) {
      setCargandoSesion(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCargandoSesion(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSession(nuevaSesion)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  // Pregunta a la base de datos si este usuario está en la tabla `admins`
  const userId = session?.user.id
  useEffect(() => {
    if (!supabase || !userId) return
    let cancelado = false
    supabase.rpc('is_admin').then(({ data }) => {
      if (!cancelado) setAdminInfo({ userId, ok: data === true })
    })
    return () => {
      cancelado = true
    }
  }, [userId])

  const revisandoAdmin = Boolean(userId) && adminInfo?.userId !== userId
  const isAdmin = Boolean(userId) && adminInfo !== null && adminInfo.userId === userId && adminInfo.ok

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
    <AuthContext.Provider
      value={{
        session,
        loading: cargandoSesion || revisandoAdmin,
        isAdmin,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
