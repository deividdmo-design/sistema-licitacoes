import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface UserProfile {
  id: string
  nome: string
  cargo: string | null
  nivel_acesso: 'admin' | 'comercial' | 'apoio'
}

interface AuthContextType {
  user: any // usuário do Supabase Auth
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
  hasPermission: (allowedRoles: ('admin'|'comercial'|'apoio')[]) => boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  hasPermission: () => false,
})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        carregarPerfil(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    // Ouvir mudanças de autenticação
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await carregarPerfil(session.user.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [])

  async function carregarPerfil(userId: string) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) {
      console.error('Erro ao carregar perfil:', error)
      // Se não existir, podemos criar um perfil padrão ou redirecionar para cadastro
    } else {
      setProfile(data)
    }
    setLoading(false)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const hasPermission = (allowedRoles: ('admin'|'comercial'|'apoio')[]) => {
    if (!profile) return false
    return allowedRoles.includes(profile.nivel_acesso)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}