import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Unidade {
  codigo?: string
}

interface Documento {
  id: string
  nome: string
  tipo: string
  vencimento: string
  arquivo_url?: string
  unidades?: Unidade | Unidade[]
}

export default function DocumentosLista() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todos')

  useEffect(() => {
    carregarDocumentos()
  }, [])

  async function carregarDocumentos() {
    setLoading(true)
    try {
      // Busca os documentos e tenta puxar o código da unidade
      const { data, error } = await supabase
        .from('documentos')
        .select('*, unidades(codigo)')
        .order('vencimento', { ascending: true })

      if (error) throw error
      if (data) setDocumentos(data as any)
    } catch (error) {
      console.error('Erro ao buscar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function excluirDocumento(id: string) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    
    try {
      const { error } = await supabase.from('documentos').delete().eq('id', id)
      if (error) throw error
      carregarDocumentos()
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return '-'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // Motor central que calcula os dias e define as cores
  function analisarVencimento(vencimento: string) {
    if (!vencimento) return { status: 'Sem Data', bg: '#f1f5f9', color: '#475569', diasTexto: '-' }
    
    const dataVenc = new Date(vencimento + 'T00:00:00')
    const hoje = new Date()
    hoje.setHours(0,0,0,0)
    
    const diferencaTempo = dataVenc.getTime() - hoje.getTime()
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24))
    
    if (diferencaDias < 0) {
      return { status: 'Vencido', bg: '#fee2e2', color: '#991b1b', diasTexto: `Vencido há ${Math.abs(diferencaDias)} dias` }
    } else if (diferencaDias <= 30) {
      return { status: 'Vencendo', bg: '#fef3c7', color: '#92400e', diasTexto: `Faltam ${diferencaDias} dias` }
    } else {
      return { status: 'Vigente', bg: '#dcfce7', color: '#166534', diasTexto: `${diferencaDias} dias restantes` }
    }
  }

  // Cálculos para os Cards de KPIs
  let totais = { vigentes: 0, vencendo: 0, vencidos: 0, semData: 0 }
  documentos.forEach(doc => {
    const analise = analisarVencimento(doc.vencimento)
    if (analise.status === 'Vigente') totais.vigentes++
    if (analise.status === 'Vencendo') totais.vencendo++
    if (analise.status === 'Vencido') totais.vencidos++
    if (analise.status === 'Sem Data') totais.semData++
  })

  // Filtro e Busca
  const documentosFiltrados = documentos.filter(doc => {
    const termoBusca = busca.toLowerCase()
    const codigoUnidade = Array.isArray(doc.unidades) ? doc.unidades[0]?.codigo : (doc.unidades as any)?.codigo
    const nomeUnidade = codigoUnidade || 'geral matriz'
    
    const bateBusca = 
      (doc.nome || '').toLowerCase().includes(termoBusca) || 
      (doc.tipo || '').toLowerCase().includes(termoBusca) ||
      nomeUnidade.toLowerCase().includes(termoBusca)

    const analise = analisarVencimento(doc.vencimento)
    const bateStatus = filtroStatus === 'Todos' || analise.status === filtroStatus

    return bateBusca && bateStatus
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.5px' }}>
            🛡️ Cofre de Documentos
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '1.05rem' }}>Gerencie certidões, balanços e atestados de todas as filiais.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: '#f8fafc', color: '#10b981', border: '1px solid #10b981', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📦 Baixar Tudo
          </button>
          <Link href="/documentos/novo">
            <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}>
              <span>➕</span> Novo Documento
            </button>
          </Link>
        </div>
      </div>

      {/* CARDS DE SAÚDE (KPIs) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', borderTop: '4px solid #3b82f6', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Total Arquivados</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{documentos.length}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', borderTop: '4px solid #10b981', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Em Dia / Vigentes</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#10b981' }}>{totais.vigentes}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', borderTop: '4px solid #f59e0b', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Atenção (30 dias)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#f59e0b' }}>{totais.vencendo}</div>
        </div>

        <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', borderTop: '4px solid #ef4444', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>Vencidos (Críticos)</div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#ef4444' }}>{totais.vencidos}</div>
        </div>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Buscar Documento, Tipo ou Filial</label>
          <input 
            type="text" 
            placeholder="Ex: CND Federal, Fiscal, Filial 01..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#f8fafc' }}
          />
        </div>
        <div style={{ minWidth: '250px' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Saúde do Documento (Status)</label>
          <select 
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', background: '#f8fafc', cursor: 'pointer' }}
          >
            <option value="Todos">Mostrar Todos</option>
            <option value="Vigente">🟢 Apenas Vigentes</option>
            <option value="Vencendo">🟡 Atenção (Vencendo)</option>
            <option value="Vencido">🔴 Vencidos / Críticos</option>
            <option value="Sem Data">⚪ Sem Validade / Vitalício</option>
          </select>
        </div>
      </div>

      {/* TABELA (DATA GRID) */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>Verificando prazos de validade...</div>
        ) : documentosFiltrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>📭</div>
            <h3 style={{ margin: '0 0 5px 0', color: '#475569' }}>Nenhum documento encontrado</h3>
            <p style={{ margin: 0 }}>Ajuste a busca ou cadastre um novo arquivo.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Documento</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Unidade / Matriz</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Data Limite</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Cronômetro</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {documentosFiltrados.map((doc) => {
                  const codigoUnidade = Array.isArray(doc.unidades) ? doc.unidades[0]?.codigo : (doc.unidades as any)?.codigo
                  const analise = analisarVencimento(doc.vencimento)

                  return (
                    <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                      
                      <td style={{ padding: '16px 20px' }}>
                        <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.95rem', marginBottom: '4px' }}>{doc.nome}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', background: '#e2e8f0', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                          {doc.tipo || 'Geral'}
                        </span>
                      </td>
                      
                      <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>
                        {codigoUnidade ? `Filial ${codigoUnidade}` : 'Geral / Matriz'}
                      </td>
                      
                      <td style={{ padding: '16px 20px', fontWeight: '700', color: analise.status === 'Vencido' ? '#ef4444' : '#1e293b' }}>
                        {formatarData(doc.vencimento)}
                      </td>
                      
                      <td style={{ padding: '16px 20px', color: analise.color, fontWeight: 'bold', fontSize: '0.9rem' }}>
                        {analise.diasTexto}
                      </td>
                      
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ background: analise.bg, color: analise.color, padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', display: 'inline-block' }}>
                          {analise.status}
                        </span>
                      </td>
                      
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          {doc.arquivo_url && (
                            <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer" title="Ver Arquivo" style={{ background: '#e0e7ff', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', color: '#4338ca', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                              📄
                            </a>
                          )}
                          <Link href={`/documentos/editar/${doc.id}`}>
                            <button title="Editar" style={{ background: '#fef3c7', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                              ✏️
                            </button>
                          </Link>
                          <button onClick={() => excluirDocumento(doc.id)} title="Excluir" style={{ background: '#fee2e2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
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