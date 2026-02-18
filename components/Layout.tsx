import { useAuth } from '../contexts/AuthContext'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { isAdmin } from '../lib/userProfile'

interface MenuItem {
  label: string
  href: string
  icon: string
  adminOnly?: boolean
}

const menuItems: MenuItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Licitações', href: '/licitacoes', icon: '📋' },
  { label: 'Contratos', href: '/contratos', icon: '📑' },
  { label: 'Certidões', href: '/certidoes', icon: '📄' },
  { label: 'Recebimentos', href: '/recebimentos', icon: '💰' },
  { label: 'Órgãos', href: '/clientes', icon: '🏢' },
  { label: 'Relatórios', href: '/relatorios', icon: '📈' },
  { label: 'Kanban', href: '/kanban', icon: '📌' },
  { label: 'Calendário', href: '/calendario', icon: '📅' },
  { label: 'Acessos', href: '/acessos', icon: '🔐', adminOnly: true },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const router = useRouter()
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    if (user) {
      isAdmin().then(setAdmin)
    }
  }, [user])

  if (!user) {
    return <>{children}</>
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* Menu lateral Profissional */}
      <aside style={{
        width: '260px',
        background: '#1e293b', // Azul Slate escuro (Corporativo)
        color: '#f8fafc',      // Texto quase branco para leitura perfeita
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 10px rgba(0,0,0,0.15)',
        zIndex: 10
      }}>
        {/* Cabeçalho da Empresa */}
        <div style={{ padding: '30px 24px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Nordeste
          </h2>
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email}
          </p>
        </div>

        {/* Navegação */}
        <nav style={{ padding: '20px 12px', flex: 1 }}>
          {menuItems.map(item => {
            if (item.adminOnly && !admin) return null
            
            const isActive = router.pathname === item.href

            return (
              <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isActive ? '#3b82f6' : 'transparent', // Azul vibrante no ativo
                  color: isActive ? '#ffffff' : '#cbd5e1',         // Branco no ativo, cinza no inativo
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = '#334155'
                  if (!isActive) e.currentTarget.style.color = '#ffffff'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                  if (!isActive) e.currentTarget.style.color = '#cbd5e1'
                }}
                >
                  <span style={{ fontSize: '1.2rem', opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: isActive ? 600 : 500 }}>{item.label}</span>
                </div>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Conteúdo principal */}
      <main style={{ flex: 1, background: '#f1f5f9', padding: '30px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}