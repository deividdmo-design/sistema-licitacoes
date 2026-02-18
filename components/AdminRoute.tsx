import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function check() {
      if (!user) {
        router.push('/login')
        return
      }
      const { data } = await supabase
        .from('perfis')
        .select('nivel_acesso')
        .eq('id', user.id)
        .maybeSingle()
      if (data?.nivel_acesso === 'admin') {
        setIsAdmin(true)
      } else {
        router.push('/dashboard')
      }
    }
    check()
  }, [user, router])

  if (!isAdmin) return <div>Verificando...</div>
  return <>{children}</>
}