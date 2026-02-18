import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

// Interfaces
interface Orgao {
  id: string
  razao_social: string
}

interface Licitacao {
  id: string
  identificacao: string
  orgao_id: string
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  created_at: string
}

interface Contrato {
  id: string
  numero_contrato: string
  orgao_id: string
  valor_total: number
  vigencia_fim: string
  status?: string
  licitacoes?: { orgaos?: { razao_social: string } }
}

interface Certidao {
  id: string
  nome_certidao: string
  vencimento: string
  unidade_id: string
  unidades?: { codigo: string; razao_social: string }
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B']

export default function RelatoriosPage() {
  const [orgaos, setOrgaos] = useState<Orgao[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'licitacoes' | 'contratos' | 'certidoes'>('licitacoes')

  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState('')
  const [filtroDataFim, setFiltroDataFim] = useState('')
  const [filtroOrgao, setFiltroOrgao] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // Dados carregados
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [certidoes, setCertidoes] = useState<Certidao[]>([])

  // Carregar órgãos para o filtro
  useEffect(() => {
    supabase.from('orgaos').select('id, razao_social').order('razao_social')
      .then(({ data }) => setOrgaos(data || []))
  }, [])

  // Função para carregar dados com base nos filtros
  const carregarDados = async () => {
    setLoading(true)
    try {
      if (activeTab === 'licitacoes') {
        let query = supabase
          .from('licitacoes')
          .select('*, orgaos(razao_social)')
          .order('data_limite_participacao', { ascending: false })

        if (filtroDataInicio) query = query.gte('data_limite_participacao', filtroDataInicio)
        if (filtroDataFim) query = query.lte('data_limite_participacao', filtroDataFim)
        if (filtroOrgao) query = query.eq('orgao_id', filtroOrgao)
        if (filtroStatus) query = query.eq('status', filtroStatus)

        const { data } = await query
        setLicitacoes(data || [])
      }

      if (activeTab === 'contratos') {
        let query = supabase
          .from('contratos')
          .select('*, licitacoes(orgaos(razao_social))')
          .order('vigencia_fim', { ascending: false })

        if (filtroDataInicio) query = query.gte('vigencia_fim', filtroDataInicio)
        if (filtroDataFim) query = query.lte('vigencia_fim', filtroDataFim)
        // Filtro por órgão precisa ser feito via relacionamento, mas simplificamos
        // (pode ser implementado depois)
        const { data } = await query
        setContratos(data || [])
      }

      if (activeTab === 'certidoes') {
        let query = supabase
          .from('certidoes')
          .select('*, unidades(codigo, razao_social)')
          .order('vencimento', { ascending: true })

        if (filtroDataInicio) query = query.gte('vencimento', filtroDataInicio)
        if (filtroDataFim) query = query.lte('vencimento', filtroDataFim)

        const { data } = await query
        setCertidoes(data || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Efeito para recarregar quando a aba ou filtros mudarem
  useEffect(() => {
    carregarDados()
  }, [activeTab, filtroDataInicio, filtroDataFim, filtroOrgao, filtroStatus])

  // Utilitários
  const formatarData = (dataISO: string) => {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // Estatísticas e gráficos
  const dadosStatus = (() => {
    if (activeTab === 'licitacoes') {
      const map = new Map<string, number>()
      licitacoes.forEach(l => map.set(l.status, (map.get(l.status) || 0) + 1))
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    }
    if (activeTab === 'contratos') {
      // Calcular status dos contratos com base na vigência
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const map = new Map<string, number>()
      contratos.forEach(c => {
        if (!c.vigencia_fim) return
        const venc = new Date(c.vigencia_fim + 'T00:00:00')
        const diff = venc.getTime() - hoje.getTime()
        const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
        let status = ''
        if (dias < 0) status = 'Vencido'
        else if (dias <= 30) status = `Vence em ${dias} dias`
        else status = 'Válido'
        map.set(status, (map.get(status) || 0) + 1)
      })
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    }
    if (activeTab === 'certidoes') {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const map = new Map<string, number>()
      certidoes.forEach(c => {
        const venc = new Date(c.vencimento + 'T00:00:00')
        const diff = venc.getTime() - hoje.getTime()
        const dias = Math.ceil(diff / (1000 * 60 * 60 * 24))
        let status = ''
        if (dias < 0) status = 'Vencido'
        else if (dias <= 15) status = `Vence em ${dias} dias`
        else status = 'Válido'
        map.set(status, (map.get(status) || 0) + 1)
      })
      return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
    }
    return []
  })()

  // Dados para gráfico de barras (evolução mensal)
  const dadosMensais = (() => {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    const counts = new Array(12).fill(0)

    if (activeTab === 'licitacoes') {
      licitacoes.forEach(l => {
        const mes = new Date(l.data_limite_participacao || l.created_at).getMonth()
        counts[mes]++
      })
    } else if (activeTab === 'contratos') {
      contratos.forEach(c => {
        if (c.vigencia_fim) {
          const mes = new Date(c.vigencia_fim).getMonth()
          counts[mes]++
        }
      })
    } else if (activeTab === 'certidoes') {
      certidoes.forEach(c => {
        const mes = new Date(c.vencimento).getMonth()
        counts[mes]++
      })
    }

    return meses.map((nome, idx) => ({ nome, quantidade: counts[idx] }))
  })()

  // Exportação Excel
  const exportarExcel = () => {
    let dados: any[] = []
    if (activeTab === 'licitacoes') {
      dados = licitacoes.map(l => ({
        Identificação: l.identificacao,
        Órgão: (l as any).orgaos?.razao_social || '',
        Modalidade: l.modalidade,
        'Valor Estimado': l.valor_estimado,
        'Data Limite': l.data_limite_participacao,
        Status: l.status,
      }))
    } else if (activeTab === 'contratos') {
      dados = contratos.map(c => ({
        'Nº Contrato': c.numero_contrato,
        Órgão: (c as any).licitacoes?.orgaos?.razao_social || '',
        'Valor Total': c.valor_total,
        'Vigência Fim': c.vigencia_fim,
      }))
    } else if (activeTab === 'certidoes') {
      dados = certidoes.map(c => ({
        Certidão: c.nome_certidao,
        Unidade: c.unidades?.codigo ? `${c.unidades.codigo} - ${c.unidades.razao_social}` : 'Geral',
        Vencimento: c.vencimento,
      }))
    }
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, activeTab)
    XLSX.writeFile(wb, `relatorio_${activeTab}.xlsx`)
  }

  // Exportação PDF
  const exportarPDF = () => {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    const titulo = `Relatório de ${activeTab === 'licitacoes' ? 'Licitações' : activeTab === 'contratos' ? 'Contratos' : 'Certidões'}`

    doc.setFontSize(16)
    doc.text(titulo, 14, 20)
    doc.setFontSize(10)
    doc.text(`Data de emissão: ${dataAtual}`, 14, 28)
    if (filtroDataInicio || filtroDataFim) {
      doc.text(`Período: ${filtroDataInicio || 'início'} a ${filtroDataFim || 'fim'}`, 14, 36)
    }

    let colunas: string[] = []
    let linhas: any[][] = []

    if (activeTab === 'licitacoes') {
      colunas = ['Identificação', 'Órgão', 'Modalidade', 'Valor', 'Data Limite', 'Status']
      linhas = licitacoes.map(l => [
        l.identificacao,
        (l as any).orgaos?.razao_social || '',
        l.modalidade || '',
        l.valor_estimado ? `R$ ${l.valor_estimado.toFixed(2)}` : '',
        formatarData(l.data_limite_participacao),
        l.status || '',
      ])
    } else if (activeTab === 'contratos') {
      colunas = ['Nº Contrato', 'Órgão', 'Valor Total', 'Vigência Fim']
      linhas = contratos.map(c => [
        c.numero_contrato,
        (c as any).licitacoes?.orgaos?.razao_social || '',
        c.valor_total ? `R$ ${c.valor_total.toFixed(2)}` : '',
        formatarData(c.vigencia_fim),
      ])
    } else if (activeTab === 'certidoes') {
      colunas = ['Certidão', 'Unidade', 'Vencimento']
      linhas = certidoes.map(c => [
        c.nome_certidao,
        c.unidades?.codigo ? `${c.unidades.codigo} - ${c.unidades.razao_social}` : 'Geral',
        formatarData(c.vencimento),
      ])
    }

    autoTable(doc, { startY: 45, head: [colunas], body: linhas })
    doc.save(`relatorio_${activeTab}.pdf`)
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Relatórios</h1>

      {/* Abas */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ccc', paddingBottom: '10px' }}>
        {(['licitacoes', 'contratos', 'certidoes'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              background: activeTab === tab ? '#0070f3' : '#e0e0e0',
              color: activeTab === tab ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px 5px 0 0',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            {tab === 'licitacoes' ? 'Licitações' : tab === 'contratos' ? 'Contratos' : 'Certidões'}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <div>
          <label>Data início</label>
          <input type="date" value={filtroDataInicio} onChange={e => setFiltroDataInicio(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div>
          <label>Data fim</label>
          <input type="date" value={filtroDataFim} onChange={e => setFiltroDataFim(e.target.value)} style={{ width: '100%', padding: '8px' }} />
        </div>
        {activeTab === 'licitacoes' && (
          <>
            <div>
              <label>Órgão</label>
              <select value={filtroOrgao} onChange={e => setFiltroOrgao(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                <option value="">Todos</option>
                {orgaos.map(o => <option key={o.id} value={o.id}>{o.razao_social}</option>)}
              </select>
            </div>
            <div>
              <label>Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} style={{ width: '100%', padding: '8px' }}>
                <option value="">Todos</option>
                <option value="Ganha">Ganha</option>
                <option value="Perdida">Perdida</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Edital em Análise">Edital em Análise</option>
                <option value="Aguardando Sessão">Aguardando Sessão</option>
              </select>
            </div>
          </>
        )}
      </div>

      {/* Botões de exportação */}
      <div style={{ marginBottom: '20px' }}>
        <button onClick={exportarExcel} style={{ marginRight: '10px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Exportar Excel
        </button>
        <button onClick={exportarPDF} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Exportar PDF
        </button>
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          {/* Gráficos lado a lado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            {/* Pizza de status */}
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <h2>Distribuição por Status</h2>
              {dadosStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={dadosStatus} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                      {dadosStatus.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <p>Sem dados para o período.</p>}
            </div>

            {/* Barras mensais */}
            <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
              <h2>Evolução Mensal</h2>
              {dadosMensais.some(d => d.quantidade > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dadosMensais}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nome" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="quantidade" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p>Sem dados para o período.</p>}
            </div>
          </div>

          {/* Tabela de resultados */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '8px' }}>
            <h2>Dados detalhados</h2>
            {activeTab === 'licitacoes' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>Identificação</th><th>Órgão</th><th>Modalidade</th><th>Valor</th><th>Data Limite</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {licitacoes.map(l => (
                    <tr key={l.id}>
                      <td>{l.identificacao}</td>
                      <td>{(l as any).orgaos?.razao_social}</td>
                      <td>{l.modalidade}</td>
                      <td>{l.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{formatarData(l.data_limite_participacao)}</td>
                      <td>{l.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'contratos' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>Nº Contrato</th><th>Órgão</th><th>Valor Total</th><th>Vigência Fim</th></tr>
                </thead>
                <tbody>
                  {contratos.map(c => (
                    <tr key={c.id}>
                      <td>{c.numero_contrato}</td>
                      <td>{(c as any).licitacoes?.orgaos?.razao_social}</td>
                      <td>{c.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                      <td>{formatarData(c.vigencia_fim)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'certidoes' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr><th>Certidão</th><th>Unidade</th><th>Vencimento</th></tr>
                </thead>
                <tbody>
                  {certidoes.map(c => (
                    <tr key={c.id}>
                      <td>{c.nome_certidao}</td>
                      <td>{c.unidades?.codigo ? `${c.unidades.codigo} - ${c.unidades.razao_social}` : 'Geral'}</td>
                      <td>{formatarData(c.vencimento)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}