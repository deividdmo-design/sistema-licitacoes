import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function DashboardExecutivo() {
  const router = useRouter()
  const [alertasCount, setAlertasCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [idAlerta, setIdAlerta] = useState<string | null>(null) // Para saber para onde ir

  useEffect(() => {
    verificarAlertas()
  }, [])

  async function verificarAlertas() {
    setLoading(true)
    try {
      // 1. Verifica Documentos Vencidos ou Próximos do Vencimento (30 dias)
      const hoje = new Date().toISOString().split('T')[0]
      const limite = new Date()
      limite.setDate(limite.getDate() + 30)
      const dataLimite = limite.toISOString().split('T')[0]

      const { data: docs, error: errorDocs } = await supabase
        .from('documentos')
        .select('id, vencimento')
        .or(`vencimento.lte.${dataLimite},vencimento.is.null`)

      // Contabiliza alertas (Documentos vencendo ou sem data crítica)
      if (docs && docs.length > 0) {
        setAlertasCount(docs.length)
        setIdAlerta('/documentos') // Rota de destino
      }

    } catch (error) {
      console.error('Erro ao processar alertas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Função disparada ao clicar no botão de Alerta
  const tratarCliqueAlerta = () => {
    if (idAlerta) {
      router.push(idAlerta)
    } else {
      alert("Nenhum problema crítico detectado no momento.")
    }
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', padding: '20px' }}>
      
      {/* CABEÇALHO DO PAINEL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 5px 0' }}>Painel Executivo</h1>
          <p style={{ color: '#64748b' }}>Monitoramento de editais e saúde documental da Nordeste Emergências.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' }}>Pipeline Total</span>
            <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#10b981' }}>R$ 0</div>
          </div>
          
          {/* BOTÃO DE ALERTA DINÂMICO */}
          <button 
            onClick={tratarCliqueAlerta}
            style={{ 
              background: alertasCount > 0 ? '#ef4444' : '#10b981', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '12px', 
              fontWeight: 'bold', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span>🚨</span> {alertasCount} {alertasCount === 1 ? 'Alerta' : 'Alertas'}
          </button>
        </div>
      </div>

      {/* RESTO DO DASHBOARD (CARDS E GRÁFICOS) ABAIXO... */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
        {/* Aqui continuam os seus cards de Licitações Ativas, Contratos, etc. */}
      </div>

    </div>
  )
}