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
  status?: string
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
    totalLicitacoes: 0, valorEmDisputa: 0, totalOrgaos: 0, docsAtivos: 0, totalContratos: 0, statusCount: {}, modalidadeCount: {} 
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
      // 1. Busca Licitações para processar as Métricas
      const { data: allLics } = await supabase.from('licitacoes').select('id, valor_estimado, status, modalidade')
      
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

      // 2. Contagens Gerais
      const { count: countOrg } = await supabase.from('orgaos').select('*', { count: 'exact', head: true })
      const { count: countDoc } = await supabase.from('documentos').select('*', { count: 'exact', head: true })
      const { count: countContratos } = await supabase.from('contratos').select('*', { count: 'exact', head: true })

      setKpis({
        totalLicitacoes: allLics?.length || 0,
        valorEmDisputa: valorTotal,
        totalOrgaos: countOrg || 0,
        docsAtivos: countDoc || 0,
        totalContratos: countContratos || 0,
        statusCount: contagemStatus,
        modalidadeCount: contagemModalidade
      })

      // 3. Documentos Críticos (próximos 15 dias)
      const { data: docs } = await supabase
        .from('documentos')
        .select('id, nome, vencimento, unidades(codigo)')
        .not('vencimento', 'is', null)
        .gte('vencimento', hoje.toISOString().split('T')[0])
        .lte('vencimento', daqui15Dias.toISOString().split('T')[0])
        .order('vencimento', { ascending: true })
        .limit(5)

      if (docs) setDocumentos(docs as any)

      // 4. Licitações Próximas (até 15 dias)
      const { data: lics } = await supabase
        .from('licitacoes')
        .select('id, identificacao, data_limite_participacao, status') 
        .gte('data_limite_participacao', hoje.toISOString().split('T')[0])
        .lte('data_limite_participacao', daqui15Dias.toISOString().split('T')[0])
        .order('data_limite_participacao', { ascending: true })
        .limit(5)

      if (lics) setLicitacoesProximas(lics as any)

      // 5. Contratos Próximos (até 60 dias) – ajuste o nome da coluna conforme sua tabela
      const { data: conts } = await supabase
        .from('contratos')
        .select('id, identificacao, data_vencimento')
        .gte('data_vencimento', hoje.toISOString().split('T')[0])
        .lte('data_vencimento', daqui60Dias.toISOString().split('T')[0])
        .order('data_vencimento', { ascending: true })
        .limit(5)

      if (conts) setContratosProximos(conts as any)

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

  const statusOrdenados = Object.entries(kpis.statusCount).sort((a, b) => b[1] - a[1])
  const modalidadesOrdenadas = Object.entries(kpis.modalidadeCount).sort((a, b) => b[1] - a[1])

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* HEADER TÁTICO COM TRÊS CARDS DE ALERTA E PIPELINE TOTAL */}
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

      {/* 4 CARDS MACRO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '4px solid #3b82f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Licitações Ativas</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{kpis.totalLicitacoes}</div>
        </div>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Contratos Vigentes</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{kpis.totalContratos}</div>
        </div>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '4px solid #8b5cf6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Órgãos Atendidos</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{kpis.totalOrgaos}</div>
        </div>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '4px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '10px' }}>Documentos Monitorados</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{kpis.docsAtivos}</div>
        </div>
      </div>

      {/* SEÇÃO DO MEIO: FUNIL & MODALIDADES */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📊 Pipeline de Licitações (Status)
          </h2>
          {statusOrdenados.length === 0 ? (
             <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Nenhuma licitação cadastrada para gerar o gráfico.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {statusOrdenados.map(([nomeStatus, quantidade], index) => {
                const porcentagem = Math.round((quantidade / kpis.totalLicitacoes) * 100)
                const cores = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b']
                const corAtual = cores[index % cores.length]
                return (
                  <div key={nomeStatus}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px', fontWeight: '600', color: '#334155' }}>
                      <span>{nomeStatus}</span>
                      <span>{quantidade} ({porcentagem}%)</span>
                    </div>
                    <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
                      <div style={{ width: `${porcentagem}%`, background: corAtual, height: '100%', borderRadius: '10px', transition: 'width 1s ease-out' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#0f172a', margin: '0 0 20px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🎯 Top Modalidades
          </h2>
          {modalidadesOrdenadas.length === 0 ? (
             <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem dados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {modalidadesOrdenadas.map(([mod, qtd]) => (
                <div key={mod} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>{mod}</span>
                  <span style={{ background: '#e2e8f0', color: '#0f172a', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold' }}>{qtd}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO INFERIOR: AVISOS CRÍTICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>🗓️ Próximas Sessões</h2>
            <Link href="/licitacoes" style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>Ver todas</Link>
          </div>
          {licitacoesProximas.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Agenda tranquila nos próximos 15 dias.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {licitacoesProximas.map(lic => (
                <div key={lic.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div>
                    <strong style={{ display: 'block', color: '#1e293b', fontSize: '0.9rem' }}>{lic.identificacao}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{lic.status || 'Pendente'}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontWeight: 'bold', color: '#d97706', fontSize: '0.95rem' }}>{formatarData(lic.data_limite_participacao)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '30px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#0f172a', margin: 0 }}>⚠️ Atenção: Documentos</h2>
            <Link href="/documentos" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 'bold', textDecoration: 'none' }}>Atualizar</Link>
          </div>
          {documentos.length === 0 ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>Nenhum documento crítico.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {documentos.map(doc => {
                const isVencido = new Date(doc.vencimento + 'T00:00:00') < new Date()
                const codigoUnidade = Array.isArray(doc.unidades) ? doc.unidades[0]?.codigo : doc.unidades?.codigo
                return (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <strong style={{ display: 'block', color: '#1e293b', fontSize: '0.9rem' }}>{doc.nome}</strong>
                      <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{codigoUnidade || 'Geral'}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontWeight: 'bold', color: isVencido ? '#ef4444' : '#d97706', fontSize: '0.95rem' }}>
                        {isVencido ? 'VENCIDO' : formatarData(doc.vencimento)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}