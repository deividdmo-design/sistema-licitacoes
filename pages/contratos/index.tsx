import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Orgao {
  razao_social?: string
}

interface Licitacao {
  identificacao?: string
}

interface Contrato {
  id: string
  numero_contrato: string
  objeto: string
  valor: number
  data_assinatura: string
  vigencia: string
  status: string
  arquivo_url?: string
  orgaos?: Orgao
  licitacoes?: Licitacao
}

export default function ContratosLista() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => {
    carregarContratos()
  }, [])

  async function carregarContratos() {
    setLoading(true)
    try {
      // Busca os contratos e tenta puxar o nome do órgão e o número da licitação
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .order('data_assinatura', { ascending: false })

      if (error) throw error
      if (data) setContratos(data as any)
    } catch (error) {
      console.error('Erro ao buscar contratos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function excluirContrato(id: string) {
    if (!confirm('Tem certeza que deseja excluir este contrato? Essa ação não pode ser desfeita.')) return
    
    try {
      const { error } = await supabase.from('contratos').delete().eq('id', id)
      if (error) throw error
      carregarContratos()
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message)
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

  // Define as cores dos badges de acordo com o status do contrato
  function getStatusEstilo(status: string, vigenciaISO: string) {
    const s = status?.toLowerCase() || ''
    
    // Verifica se a data de vigência já passou (independente do status escrito)
    let estaVencido = false
    if (vigenciaISO) {
      const dataVigencia = new Date(vigenciaISO + 'T00:00:00')
      const hoje = new Date()
      hoje.setHours(0,0,0,0)
      if (dataVigencia < hoje) estaVencido = true
    }

    if (estaVencido || s.includes('vencido') || s.includes('encerrado')) return { bg: '#fee2e2', color: '#991b1b', texto: 'Vencido / Encerrado' }
    if (s.includes('vigente') || s.includes('ativo') || s.includes('andamento')) return { bg: '#dcfce7', color: '#166534', texto: status || 'Vigente' }
    if (s.includes('suspenso') || s.includes('paralisado')) return { bg: '#fef3c7', color: '#92400e', texto: status || 'Suspenso' }
    
    return { bg: '#f1f5f9', color: '#475569', texto: status || 'Pendente' }
  }

  // Cálculos para os Cards do Topo (KPIs)
  const valorTotal = contratos.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0)
  
  // Lógica de filtro e busca
  const contratosFiltrados = contratos.filter(c => {
    const termoBusca = busca.toLowerCase()
    const nomeOrgao = (c.orgaos?.razao_social || '').toLowerCase()
    const numLicitacao = (c.licitacoes?.identificacao || '').toLowerCase()
    
    const bateBusca = 
      (c.numero_contrato || '').toLowerCase().includes(termoBusca) || 
      (c.objeto || '').toLowerCase().includes(termoBusca) || 
      nomeOrgao.includes(termoBusca) ||
      numLicitacao.includes(termoBusca)
      
    const bateStatus = filtroStatus === 'Todos' || c.status === filtroStatus
    
    return bateBusca && bateStatus
  })

  // Extrai lista de status únicos para o select de filtro
  const statusUnicos = ['Todos', ...Array.from(new Set(contratos.map(c => c.status).filter(Boolean)))]

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🤝 Gestão de Contratos
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>Administre valores, vigências e documentos de contratos ativos.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: '#f8fafc', color: '#10b981', border: '1px solid #10b981', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 Exportar Excel
          </button>
          <Link href="/contratos/novo">
            <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
              <span>➕</span> Novo Contrato
            </button>
          </Link>
        </div>
      </div>

      {/* CARDS DE INDICADORES (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Total de Contratos</div>
            <div style={{ fontSize: '2.8rem', fontWeight: '800' }}>{contratos.length}</div>
          </div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '8rem', opacity: 0.1, zIndex: 1, transform: 'rotate(-15deg)' }}>📂</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #047857 100%)', color: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Valor Total Contratado</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '800' }}>{formatarMoeda(valorTotal)}</div>
          </div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '8rem', opacity: 0.1, zIndex: 1, transform: 'rotate(-15deg)' }}>💲</div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Buscar Contrato, Órgão ou Objeto</label>
          <input 
            type="text" 
            placeholder="Ex: Contrato 01/2026, Ambulância..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Filtrar por Status</label>
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ width: '100%', padding: '10px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#fff', cursor: 'pointer' }}
          >
            {statusUnicos.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      {/* TABELA DE DADOS (DATA GRID) */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Carregando contratos...</div>
        ) : contratosFiltrados.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
            Nenhum contrato encontrado.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nº Contrato</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Órgão / Objeto</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Datas (Assin. / Vigência)</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contratosFiltrados.map((contrato) => {
                  const nomeOrgao = contrato.orgaos?.razao_social || 'Órgão não vinculado'
                  const statusStyle = getStatusEstilo(contrato.status, contrato.vigencia)

                  return (
                    <tr key={contrato.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      
                      <td style={{ padding: '16px' }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '1rem' }}>{contrato.numero_contrato || 'S/N'}</strong>
                        {contrato.licitacoes?.identificacao && (
                          <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                            Ref: {contrato.licitacoes.identificacao}
                          </span>
                        )}
                      </td>
                      
                      <td style={{ padding: '16px', maxWidth: '300px' }}>
                        <div style={{ color: '#334155', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeOrgao}>
                          {nomeOrgao}
                        </div>
                        <div style={{ color: '#64748b', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={contrato.objeto}>
                          {contrato.objeto || 'Sem objeto descrito'}
                        </div>
                      </td>
                      
                      <td style={{ padding: '16px', fontWeight: '700', color: '#059669' }}>
                        {formatarMoeda(contrato.valor)}
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '2px' }}>
                          Assinado: <span style={{ color: '#1e293b', fontWeight: '500' }}>{formatarData(contrato.data_assinatura)}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                          Vence: <span style={{ color: statusStyle.bg === '#fee2e2' ? '#ef4444' : '#1e293b', fontWeight: 'bold' }}>{formatarData(contrato.vigencia)}</span>
                        </div>
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                          {statusStyle.texto}
                        </span>
                      </td>
                      
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {contrato.arquivo_url && (
                            <a href={contrato.arquivo_url} target="_blank" rel="noopener noreferrer" title="Ver Contrato" style={{ background: '#e0e7ff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', color: '#4338ca', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              📄
                            </a>
                          )}
                          <Link href={`/contratos/editar/${contrato.id}`}>
                            <button title="Editar" style={{ background: '#fef3c7', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                              ✏️
                            </button>
                          </Link>
                          <button onClick={() => excluirContrato(contrato.id)} title="Excluir" style={{ background: '#fee2e2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                            🗑️
                          </button>
                        </div>
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}