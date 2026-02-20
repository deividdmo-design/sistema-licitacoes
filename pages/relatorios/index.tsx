import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface Orgao {
  razao_social?: string
}

interface Licitacao {
  id: string
  identificacao: string
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  orgaos?: Orgao
}

export default function Relatorios() {
  const [abaAtiva, setAbaAtiva] = useState('licitacoes')
  const [dados, setDados] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [orgaoFiltro, setOrgaoFiltro] = useState('Todos')
  const [statusFiltro, setStatusFiltro] = useState('Todos')

  useEffect(() => {
    carregarDados()
  }, [abaAtiva])

  async function carregarDados() {
    setLoading(true)
    try {
      if (abaAtiva === 'licitacoes') {
        const { data, error } = await supabase
          .from('licitacoes')
          .select('*, orgaos(razao_social)')
          .order('data_limite_participacao', { ascending: false })

        if (error) throw error
        if (data) setDados(data as any)
      }
      // O espaço para Contratos e Certidões já está preparado aqui para o futuro!
      if (abaAtiva === 'contratos') setDados([]) 
      if (abaAtiva === 'certidoes') setDados([])
    } catch (error) {
      console.error('Erro ao carregar relatórios:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return '-'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function formatarMoeda(valor: number) {
    if (!valor) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  // Define cores automáticas para os status na tabela
  function getStatusEstilo(status: string) {
    const s = (status || '').toLowerCase()
    if (s.includes('ganha') || s.includes('homologada') || s.includes('venceu')) return { bg: '#dcfce7', color: '#166534' }
    if (s.includes('perdida') || s.includes('fracassada')) return { bg: '#fee2e2', color: '#991b1b' }
    if (s.includes('aguardando') || s.includes('análise')) return { bg: '#fef3c7', color: '#92400e' }
    return { bg: '#f1f5f9', color: '#475569' }
  }

  // --- MOTOR DE FILTROS ---
  const dadosFiltrados = dados.filter(item => {
    let bateData = true
    if (dataInicio && item.data_limite_participacao < dataInicio) bateData = false
    if (dataFim && item.data_limite_participacao > dataFim) bateData = false

    const nomeOrgao = item.orgaos?.razao_social || 'Não Informado'
    let bateOrgao = orgaoFiltro === 'Todos' || nomeOrgao === orgaoFiltro
    let bateStatus = statusFiltro === 'Todos' || item.status === statusFiltro

    return bateData && bateOrgao && bateStatus
  })

  // --- MOTOR DE ESTATÍSTICAS (BI) ---
  const valorTotal = dadosFiltrados.reduce((acc, curr) => acc + (Number(curr.valor_estimado) || 0), 0)
  
  const statusCount: Record<string, number> = {}
  dadosFiltrados.forEach(item => {
    const s = item.status || 'Não Informado'
    statusCount[s] = (statusCount[s] || 0) + 1
  })
  const statusOrdenados = Object.entries(statusCount).sort((a, b) => b[1] - a[1])

  // Listas únicas para os Selects
  const orgaosUnicos = ['Todos', ...Array.from(new Set(dados.map(d => d.orgaos?.razao_social || 'Não Informado')))]
  const statusUnicos = ['Todos', ...Array.from(new Set(dados.map(d => d.status || 'Não Informado')))]

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.5px' }}>
            📈 Inteligência e Relatórios
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '1.05rem' }}>Analise o desempenho, extraia dados e visualize seu pipeline.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: '#10b981', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }} onClick={() => alert('Exportação Excel será gerada!')}>
            📊 Exportar Excel
          </button>
          <button style={{ background: '#ef4444', color: 'white', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)' }} onClick={() => alert('Relatório PDF será gerado!')}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      {/* ABAS DE NAVEGAÇÃO PREMIUM */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '25px', borderBottom: '2px solid #e2e8f0', paddingBottom: '15px' }}>
        {['licitacoes', 'contratos', 'certidoes'].map((aba) => (
          <button 
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            style={{ 
              background: abaAtiva === aba ? '#3b82f6' : '#f1f5f9', 
              color: abaAtiva === aba ? 'white' : '#475569', 
              border: 'none', padding: '10px 24px', borderRadius: '30px', 
              fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize',
              transition: 'all 0.2s', boxShadow: abaAtiva === aba ? '0 4px 10px rgba(59, 130, 246, 0.3)' : 'none'
            }}
          >
            {aba === 'certidoes' ? 'Documentos' : aba}
          </button>
        ))}
      </div>

      {/* PAINEL DE FILTROS */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '25px' }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>🔍 Filtros do Relatório</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Data Início</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#334155' }} />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Data Fim</label>
            <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', color: '#334155' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Filtrar Órgão</label>
            <select value={orgaoFiltro} onChange={(e) => setOrgaoFiltro(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', cursor: 'pointer', color: '#334155' }}>
              {orgaosUnicos.map(org => <option key={org} value={org}>{org}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '6px' }}>Filtrar Status</label>
            <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: '#f8fafc', cursor: 'pointer', color: '#334155' }}>
              {statusUnicos.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

        </div>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '1.2rem' }}>Calculando matriz de dados... 📊</div>
      ) : (
        <>
          {/* SESSÃO DE GRÁFICOS E KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '25px', marginBottom: '30px' }}>
            
            {/* KPI: RESUMO FINANCEIRO */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', padding: '30px', borderRadius: '16px', color: 'white', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{ fontSize: '1rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                  Resultados da Busca ({dadosFiltrados.length} registros)
                </div>
                <div style={{ fontSize: '3rem', fontWeight: '900', color: '#10b981', lineHeight: '1.1' }}>
                  {formatarMoeda(valorTotal)}
                </div>
                <div style={{ marginTop: '10px', fontSize: '0.9rem', color: '#cbd5e1' }}>Valor total estimado do filtro atual</div>
              </div>
              <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '10rem', opacity: 0.05, zIndex: 1, transform: 'rotate(-15deg)' }}>💰</div>
            </div>

            {/* GRÁFICO: DISTRIBUIÇÃO POR STATUS (Nativo CSS) */}
            <div style={{ background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', color: '#0f172a' }}>Distribuição por Status</h3>
              
              {dadosFiltrados.length === 0 ? (
                <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem dados para o gráfico.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {statusOrdenados.map(([nomeStatus, quantidade], index) => {
                    const porcentagem = Math.round((quantidade / dadosFiltrados.length) * 100)
                    const cores = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b']
                    const corAtual = cores[index % cores.length]
                    
                    return (
                      <div key={nomeStatus}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px', fontWeight: '600', color: '#334155' }}>
                          <span>{nomeStatus}</span>
                          <span>{quantidade} unid. ({porcentagem}%)</span>
                        </div>
                        <div style={{ width: '100%', background: '#f1f5f9', borderRadius: '10px', height: '10px', overflow: 'hidden' }}>
                          <div style={{ width: `${porcentagem}%`, background: corAtual, height: '100%', borderRadius: '10px', transition: 'width 1s ease-out' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* TABELA DE DADOS DETALHADOS (DATA GRID PREMIUM) */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>📑 Dados Detalhados</h3>
            </div>
            
            {dadosFiltrados.length === 0 ? (
              <div style={{ padding: '50px', textAlign: 'center', color: '#94a3b8' }}>Nenhum registro encontrado com os filtros aplicados.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '16px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Identificação</th>
                      <th style={{ padding: '16px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Órgão Responsável</th>
                      <th style={{ padding: '16px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor</th>
                      <th style={{ padding: '16px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Limite</th>
                      <th style={{ padding: '16px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item) => {
                      const statusStyle = getStatusEstilo(item.status)
                      return (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '16px 20px' }}>
                            <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.95rem' }}>{item.identificacao}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.modalidade || 'Outros'}</span>
                          </td>
                          <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>
                            {item.orgaos?.razao_social || '-'}
                          </td>
                          <td style={{ padding: '16px 20px', fontWeight: '700', color: '#059669' }}>
                            {formatarMoeda(item.valor_estimado)}
                          </td>
                          <td style={{ padding: '16px 20px', color: '#475569', fontWeight: '500' }}>
                            {formatarData(item.data_limite_participacao)}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                              {item.status || 'Pendente'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}