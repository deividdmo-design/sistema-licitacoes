import { useAuth } from '../contexts/AuthContext'

interface AuthorizedProps {
  children: React.ReactNode
  allowedRoles: ('admin'|'comercial'|'apoio')[]
  fallback?: React.ReactNode // opcional: o que mostrar se não tiver permissão
}

export default function Authorized({ children, allowedRoles, fallback = null }: AuthorizedProps) {
  const { hasPermission } = useAuth()

  if (!hasPermission(allowedRoles)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}