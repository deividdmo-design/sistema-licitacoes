import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/router'

interface DocumentoCritico {
  id: string
  nome: string
  vencimento: string
  unidades?: any
}

interface LicitacaoCritica {
  id: string
  identificacao: string
  data_limite_participacao: string
}

interface ContratoCritico {
  id: string
  identificacao?: string
  data_vencimento: string
}

interface KPIs {
  totalLicitacoes: number
  valorEmDisputa: number
  totalOrgaos: number
  docsAtivos: number
  totalContratos: number
  statusCount: Record<string, number>
  modalidadeCount: Record<string, number>
}

export default function Dashboard() {
  const router = useRouter()
  const [documentos, setDocumentos] = useState<DocumentoCritico[]>([])
  const [licitacoesProximas, setLicitacoesProximas] = useState<LicitacaoCritica[]>([])
  const [contratosProximos, setContratosProximos] = useState<ContratoCritico[]>([])
  const [kpis, setKpis] = useState<KPIs>({
    totalLicitacoes: 0, valorEmDisputa: 0, totalOrgaos: 0, docsAtivos: 0, totalContratos: 0,
    statusCount: {}, modalidadeCount: {}
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarDadosDashboard()
  }, [])

  async function carregarDadosDashboard() {
    setLoading(true)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const daqui7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
    const daqui15Dias = new Date(hoje.getTime() + 15 * 24 * 60 * 60 * 1000)
    const daqui30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    const daqui60Dias = new Date(hoje.getTime() + 60 * 24 * 60 * 60 * 1000)

    try {
      // 1. KPIs gerais (licitações, órgãos, documentos, contratos)
      const { data: allLics } = await supabase.from('licitacoes').select('id, valor_estimado, status, modalidade')
      const { count: countOrg } = await supabase.from('orgaos').select('*', { count: 'exact', head: true })
      const { count: countDoc } = await supabase.from('documentos').select('*', { count: 'exact', head: true })
      const { count: countContratos } = await supabase.from('contratos').select('*', { count: 'exact', head: true })

      let valorTotal = 0
      const contagemStatus: Record<string, number> = {}
      const contagemModalidade: Record<string, number> = {}
      if (allLics) {
        allLics.forEach(lic => {
          valorTotal += Number(lic.valor_estimado) || 0
          const status = lic.status || 'Não Informado'
          contagemStatus[status] = (contagemStatus[status] || 0) + 1
          const mod = lic.modalidade || 'Outros'
          contagemModalidade[mod] = (contagemModalidade[mod] || 0) + 1
        })
      }

      setKpis({
        totalLicitacoes: allLics?.length || 0,
        valorEmDisputa: valorTotal,
        totalOrgaos: countOrg || 0,
        docsAtivos: countDoc || 0,
        totalContratos: countContratos || 0,
        statusCount: contagemStatus,
        modalidadeCount: contagemModalidade
      })

      // 2. Documentos críticos (próximos 15 dias)
      const { data: docs } = await supabase
        .from('documentos')
        .select('id, nome, vencimento, unidades(codigo)')
        .not('vencimento', 'is', null)
        .gte('vencimento', hoje.toISOString().split('T')[0])
        .lte('vencimento', daqui15Dias.toISOString().split('T')[0])
        .order('vencimento', { ascending: true })
        .limit(5)
      setDocumentos(docs || [])

      // 3. Licitações próximas (até 15 dias)
      const { data: lics } = await supabase
        .from('licitacoes')
        .select('id, identificacao, data_limite_participacao')
        .gte('data_limite_participacao', hoje.toISOString().split('T')[0])
        .lte('data_limite_participacao', daqui15Dias.toISOString().split('T')[0])
        .order('data_limite_participacao', { ascending: true })
        .limit(5)
      setLicitacoesProximas(lics || [])

      // 4. Contratos próximos (até 60 dias) – supondo coluna data_vencimento
      const { data: conts } = await supabase
        .from('contratos')
        .select('id, identificacao, data_vencimento')
        .gte('data_vencimento', hoje.toISOString().split('T')[0])
        .lte('data_vencimento', daqui60Dias.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true })
        .limit(5)
      setContratosProximos(conts || [])

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
  }

  // Funções para determinar a cor do card de alerta
  function getCorAlertaDocumentos() {
    if (documentos.length === 0) return '#94a3b8' // cinza
    return '#ef4444' // vermelho
  }

  function getCorAlertaLicitacoes() {
    if (licitacoesProximas.length === 0) return '#94a3b8'
    // Verifica se alguma licitação está nos próximos 7 dias
    const hoje = new Date()
    const daqui7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000)
    const temUrgente = licitacoesProximas.some(lic => {
      const dataLic = new Date(lic.data_limite_participacao + 'T00:00:00')
      return dataLic <= daqui7Dias
    })
    return temUrgente ? '#ef4444' : '#f59e0b' // vermelho ou laranja
  }

  function getCorAlertaContratos() {
    if (contratosProximos.length === 0) return '#94a3b8'
    const hoje = new Date()
    const daqui30Dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
    const temVermelho = contratosProximos.some(ct => {
      const dataCt = new Date(ct.data_vencimento + 'T00:00:00')
      return dataCt <= daqui30Dias
    })
    return temVermelho ? '#ef4444' : '#f59e0b' // vermelho se <=30 dias, laranja se entre 31 e 60
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: '15px' }}>
      <div style={{ width: '50px', height: '50px', border: '5px solid #e2e8f0', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <p style={{ color: '#64748b', fontSize: '1.2rem', fontWeight: 'bold' }}>Sincronizando Inteligência de Negócio...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* HEADER COM PIPELINE TOTAL E TRÊS CARDS DE ALERTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', background: '#fff', padding: '20px 30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '1.8rem', fontWeight: '800' }}>Painel Executivo</h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>Monitoramento de editais e saúde documental da Nordeste Emergências.</p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: '20px' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>Pipeline Total</div>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#10b981' }}>{formatarMoeda(kpis.valorEmDisputa)}</div>
          </div>

          {/* Card Documentos */}
          <button
            onClick={() => router.push('/documentos')}
            style={{
              background: getCorAlertaDocumentos(),
              color: 'white',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 'bold',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              border: 'none',
              cursor: 'pointer',
              minWidth: '100px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.9 }}>Documentos</span>
            <span style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1 }}>{documentos.length}</span>
          </button>

          {/* Card Licitações */}
          <button
            onClick={() => router.push('/licitacoes')}
            style={{
              background: getCorAlertaLicitacoes(),
              color: 'white',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 'bold',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              border: 'none',
              cursor: 'pointer',
              minWidth: '100px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.9 }}>Licitações</span>
            <span style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1 }}>{licitacoesProximas.length}</span>
          </button>

          {/* Card Contratos */}
          <button
            onClick={() => router.push('/contratos')}
            style={{
              background: getCorAlertaContratos(),
              color: 'white',
              padding: '10px 18px',
              borderRadius: '12px',
              fontWeight: 'bold',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
              border: 'none',
              cursor: 'pointer',
              minWidth: '100px',
              transition: 'transform 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', opacity: 0.9 }}>Contratos</span>
            <span style={{ fontSize: '1.8rem', fontWeight: '900', lineHeight: 1 }}>{contratosProximos.length}</span>
          </button>
        </div>
      </div>

      {/* O restante do dashboard permanece igual (cards macro, pipeline, etc.) */}
      {/* ... (código que você já tinha para os 4 cards macro, gráficos, etc.) ... */}

    </div>
  )
}