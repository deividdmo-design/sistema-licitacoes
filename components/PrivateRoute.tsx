import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user) {
    return <div style={{ padding: '20px' }}>Carregando...</div>
  }

  return <>{children}</>
}