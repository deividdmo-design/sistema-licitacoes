import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Licitacao {
  id: string
  identificacao: string
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  arquivo_url?: string
  orgaos?: { razao_social: string } | { razao_social: string }[] // Pode vir como objeto ou array
}

export default function LicitacoesLista() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => {
    carregarLicitacoes()
  }, [])

  async function carregarLicitacoes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*, orgaos(razao_social)')
        .order('data_limite_participacao', { ascending: false })

      if (error) throw error
      setLicitacoes(data || [])
    } catch (error) {
      console.error('Erro ao buscar licitações:', error)
      alert('Erro ao carregar a lista de licitações.')
    } finally {
      setLoading(false)
    }
  }

  async function excluirLicitacao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta licitação? Essa ação não pode ser desfeita.')) return

    try {
      const { error } = await supabase.from('licitacoes').delete().eq('id', id)
      if (error) throw error
      carregarLicitacoes()
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
    if (!valor) return '-'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  // Função para dar cores automáticas aos status
  function getStatusEstilo(status: string) {
    const s = status?.toLowerCase() || ''
    if (s.includes('ganha') || s.includes('homologada') || s.includes('venceu')) return { bg: '#dcfce7', color: '#166534' }
    if (s.includes('perdida') || s.includes('fracassada') || s.includes('deserta')) return { bg: '#fee2e2', color: '#991b1b' }
    if (s.includes('aguardando') || s.includes('análise') || s.includes('recurso')) return { bg: '#fef3c7', color: '#92400e' }
    return { bg: '#f1f5f9', color: '#475569' } // Pendente / Outros
  }

  // Extrai lista de status únicos para o select de filtro
  const statusUnicos = ['Todos', ...Array.from(new Set(licitacoes.map(l => l.status).filter(Boolean)))]

  // Função auxiliar para obter o nome do órgão (lida com objeto ou array)
  function getNomeOrgao(orgaos: Licitacao['orgaos']): string {
    if (!orgaos) return 'Órgão não vinculado'
    if (Array.isArray(orgaos)) {
      return orgaos[0]?.razao_social || 'Órgão não vinculado'
    }
    return orgaos.razao_social || 'Órgão não vinculado'
  }

  // Lógica de filtro e busca
  const licitacoesFiltradas = licitacoes.filter(lic => {
    const termoBusca = busca.toLowerCase()
    const nomeOrgao = getNomeOrgao(lic.orgaos).toLowerCase()
    const bateBusca = lic.identificacao?.toLowerCase().includes(termoBusca) || nomeOrgao.includes(termoBusca)
    const bateStatus = filtroStatus === 'Todos' || lic.status === filtroStatus
    return bateBusca && bateStatus
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            📋 Gestão de Licitações
          </h1>
          <p style={{ color: '#64748b', margin: 0 }}>Acompanhe, filtre e gerencie todos os editais em andamento.</p>
        </div>
        <Link href="/licitacoes/novo"> {/* Corrigido: de "nova" para "novo" */}
          <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}>
            <span>➕</span> Nova Licitação
          </button>
        </Link>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Buscar Edital ou Órgão</label>
          <input 
            type="text" 
            placeholder="Ex: Pregão 01/2026, Hospital Universitário..." 
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
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Carregando banco de dados...</div>
        ) : licitacoesFiltradas.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>
            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📭</div>
            Nenhuma licitação encontrada com esses filtros.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Identificação</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Órgão</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor Est.</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data Limite</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</th>
                  <th style={{ padding: '16px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {licitacoesFiltradas.map((lic) => {
                  const nomeOrgao = getNomeOrgao(lic.orgaos)
                  const statusStyle = getStatusEstilo(lic.status)

                  return (
                    <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      
                      <td style={{ padding: '16px' }}>
                        <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>{lic.identificacao}</strong>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px' }}>{lic.modalidade || 'Outros'}</span>
                      </td>
                      
                      <td style={{ padding: '16px', color: '#334155', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={nomeOrgao}>
                        {nomeOrgao}
                      </td>
                      
                      <td style={{ padding: '16px', fontWeight: '600', color: '#059669' }}>
                        {formatarMoeda(lic.valor_estimado)}
                      </td>
                      
                      <td style={{ padding: '16px', fontWeight: 'bold', color: '#d97706' }}>
                        {formatarData(lic.data_limite_participacao)}
                      </td>
                      
                      <td style={{ padding: '16px' }}>
                        <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                          {lic.status || 'Pendente'}
                        </span>
                      </td>
                      
                      <td style={{ padding: '16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {lic.arquivo_url && (
                            <a href={lic.arquivo_url} target="_blank" rel="noopener noreferrer" title="Ver Edital" style={{ background: '#e0e7ff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', color: '#4338ca', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              📄
                            </a>
                          )}
                          <Link href={`/licitacoes/editar/${lic.id}`}>
                            <button title="Editar" style={{ background: '#fef3c7', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
                              ✏️
                            </button>
                          </Link>
                          <button onClick={() => excluirLicitacao(lic.id)} title="Excluir" style={{ background: '#fee2e2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer' }}>
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