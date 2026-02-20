import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Recebimento {
  id: string
  descricao: string
  valor: number
  data_vencimento: string
  data_recebimento?: string
  status: string
  observacoes?: string
}

export default function RecebimentosLista() {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => {
    carregarRecebimentos()
  }, [])

  async function carregarRecebimentos() {
    setLoading(true)
    try {
      // Busca segura: apenas colunas da própria tabela
      const { data, error } = await supabase
        .from('recebimentos')
        .select('*')
        .order('data_vencimento', { ascending: false })

      if (error) throw error
      if (data) setRecebimentos(data as any)
    } catch (error) {
      console.error('Erro ao buscar recebimentos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function excluirRecebimento(id: string) {
    if (!confirm('Tem certeza que deseja excluir este lançamento financeiro?')) return
    
    try {
      const { error } = await supabase.from('recebimentos').delete().eq('id', id)
      if (error) throw error
      carregarRecebimentos()
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

  // Motor de Status Inteligente
  function getStatusEstilo(status: string, dataVencimento: string) {
    const s = (status || '').toLowerCase()
    
    // Se já estiver pago, fica verde independente da data
    if (s.includes('pago') || s.includes('recebido') || s.includes('liquidado')) {
      return { bg: '#dcfce7', color: '#166534', texto: status || 'Recebido' }
    }

    // Verifica se atrasou
    let estaAtrasado = false
    if (dataVencimento) {
      const venc = new Date(dataVencimento + 'T00:00:00')
      const hoje = new Date()
      hoje.setHours(0,0,0,0)
      if (venc < hoje) estaAtrasado = true
    }

    if (estaAtrasado || s.includes('atrasado') || s.includes('vencido')) {
      return { bg: '#fee2e2', color: '#991b1b', texto: 'Atrasado' }
    }
    
    // Se não está pago nem atrasado, está pendente
    return { bg: '#fef3c7', color: '#92400e', texto: status || 'Pendente / A Receber' }
  }

  // Cálculos para os Cards do Topo (KPIs Financeiros)
  let kpiRecebido = 0
  let kpiPendente = 0
  let kpiAtrasado = 0

  recebimentos.forEach(rec => {
    const analise = getStatusEstilo(rec.status, rec.data_vencimento)
    const valor = Number(rec.valor) || 0

    if (analise.color === '#166534') kpiRecebido += valor
    else if (analise.color === '#991b1b') kpiAtrasado += valor
    else kpiPendente += valor
  })

  // Lógica de filtro e busca
  const recebimentosFiltrados = recebimentos.filter(rec => {
    const termoBusca = busca.toLowerCase()
    const analise = getStatusEstilo(rec.status, rec.data_vencimento)
    
    const bateBusca = (rec.descricao || '').toLowerCase().includes(termoBusca)
    
    let bateStatus = true
    if (filtroStatus === 'Recebidos') bateStatus = analise.color === '#166534'
    if (filtroStatus === 'Pendentes') bateStatus = analise.color === '#92400e'
    if (filtroStatus === 'Atrasados') bateStatus = analise.color === '#991b1b'

    return bateBusca && bateStatus
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.5px' }}>
            💰 Gestão de Recebimentos
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '1.05rem' }}>Controle o fluxo de caixa, notas emitidas e pagamentos de órgãos.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: '#f8fafc', color: '#10b981', border: '1px solid #10b981', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#ecfdf5'} onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}>
            📊 Relatório Excel
          </button>
          <Link href="/recebimentos/novo">
            <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}>
              <span>➕</span> Novo Lançamento
            </button>
          </Link>
        </div>
      </div>

      {/* CARDS FINANCEIROS (KPIs PREMIUM) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '5px solid #10b981', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Total Recebido</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{formatarMoeda(kpiRecebido)}</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '5px solid #f59e0b', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>A Receber (No Prazo)</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#d97706' }}>{formatarMoeda(kpiPendente)}</div>
          </div>
        </div>

        <div style={{ background: '#fff', padding: '25px', borderRadius: '16px', borderTop: '5px solid #ef4444', boxShadow: '0 4px 15px -3px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Inadimplência / Atrasos</div>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ef4444' }}>{formatarMoeda(kpiAtrasado)}</div>
          </div>
        </div>

      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Buscar Referência / Nota Fiscal</label>
          <input 
            type="text" 
            placeholder="Ex: Fatura 001, Empenho 2026..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
          />
        </div>
        <div style={{ minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Situação do Pagamento</label>
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#f8fafc', cursor: 'pointer' }}
          >
            <option value="Todos">Visão Geral (Todos)</option>
            <option value="Recebidos">🟢 Pagos / Recebidos</option>
            <option value="Pendentes">🟡 Pendentes / A Receber</option>
            <option value="Atrasados">🔴 Atrasados / Inadimplência</option>
          </select>
        </div>
      </div>

      {/* TABELA DE DADOS (DATA GRID PREMIUM) */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>Sincronizando caixa...</div>
        ) : recebimentosFiltrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>📭</div>
            <h3 style={{ margin: '0 0 5px 0', color: '#475569' }}>Nenhum lançamento encontrado</h3>
            <p style={{ margin: 0 }}>Tente mudar os filtros ou adicione uma nova receita.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Descrição / Referência</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Valor do Título</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Vencimento</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Data Recebido</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recebimentosFiltrados.map((rec) => {
                  const statusStyle = getStatusEstilo(rec.status, rec.data_vencimento)

                  return (
                    <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      
                      <td style={{ padding: '16px 20px' }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.95rem' }}>{rec.descricao || 'Sem Descrição'}</strong>
                      </td>
                      
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: '#0f172a', fontSize: '1.05rem' }}>
                        {formatarMoeda(rec.valor)}
                      </td>
                      
                      <td style={{ padding: '16px 20px', color: statusStyle.color === '#991b1b' ? '#ef4444' : '#475569', fontWeight: statusStyle.color === '#991b1b' ? 'bold' : 'normal' }}>
                        {formatarData(rec.data_vencimento)}
                      </td>

                      <td style={{ padding: '16px 20px', color: '#475569' }}>
                        {rec.data_recebimento ? formatarData(rec.data_recebimento) : '-'}
                      </td>
                      
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                          {statusStyle.texto}
                        </span>
                      </td>
                      
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Link href={`/recebimentos/editar/${rec.id}`}>
                            <button title="Editar/Baixar Lançamento" style={{ background: '#fef3c7', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                              ✏️
                            </button>
                          </Link>
                          <button onClick={() => excluirRecebimento(rec.id)} title="Excluir" style={{ background: '#fee2e2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
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