import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { linkContratoCalendario } from '../../lib/googleCalendar'

interface Contrato {
  id: string
  numero_contrato: string
  objeto: string
  valor_total: number
  data_assinatura: string
  vigencia_inicio: string
  vigencia_fim: string
  arquivo_url: string | null
  licitacoes?: {
    identificacao: string
    orgaos?: { razao_social: string }
  }
}

export default function ListaContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [totalContratos, setTotalContratos] = useState(0)
  const [valorTotal, setValorTotal] = useState(0)

  useEffect(() => {
    carregarContratos()
  }, [])

  async function carregarContratos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contratos')
      .select(`
        *,
        licitacoes (
          identificacao,
          orgaos ( razao_social )
        )
      `)
      .order('data_assinatura', { ascending: false })

    if (error) console.error(error)
    else {
      setContratos(data || [])
      setTotalContratos(data?.length || 0)
      const total = (data || []).reduce((acc, c) => acc + (c.valor_total || 0), 0)
      setValorTotal(total)
    }
    setLoading(false)
  }

  async function excluirContrato(id: string) {
    if (!confirm('Tem certeza que deseja excluir este contrato?')) return
    const { error } = await supabase.from('contratos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarContratos()
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function calcularDiasRestantes(vencimentoISO: string) {
    if (!vencimentoISO) return null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const venc = new Date(vencimentoISO + 'T00:00:00')
    const diff = venc.getTime() - hoje.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function getStatusText(vencimentoISO: string) {
    const dias = calcularDiasRestantes(vencimentoISO)
    if (dias === null) return '—'
    if (dias < 0) return 'Vencido'
    if (dias <= 30) return `Vence em ${dias} dias`
    return 'Válido'
  }

  // Exportação Excel
  function exportarExcel() {
    const dados = contratos.map(c => ({
      'Nº Contrato': c.numero_contrato,
      'Órgão': c.licitacoes?.orgaos?.razao_social || '',
      'Licitação': c.licitacoes?.identificacao || '',
      'Objeto': c.objeto || '',
      'Valor Total': c.valor_total,
      'Assinatura': c.data_assinatura,
      'Vigência Fim': c.vigencia_fim,
      'Status': getStatusText(c.vigencia_fim),
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Contratos')
    XLSX.writeFile(wb, 'contratos.xlsx')
  }

  // Exportação PDF
  function exportarPDF() {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    doc.setFontSize(16)
    doc.text('Relatório de Contratos', 14, 20)
    doc.setFontSize(10)
    doc.text(`Data de emissão: ${dataAtual}`, 14, 28)

    const colunas = ['Nº Contrato', 'Órgão', 'Licitação', 'Valor Total', 'Vigência Fim', 'Status']
    const linhas = contratos.map(c => [
      c.numero_contrato,
      c.licitacoes?.orgaos?.razao_social || '',
      c.licitacoes?.identificacao || '',
      c.valor_total ? `R$ ${c.valor_total.toFixed(2)}` : '',
      formatarData(c.vigencia_fim),
      getStatusText(c.vigencia_fim),
    ])

    autoTable(doc, { startY: 35, head: [colunas], body: linhas })
    doc.save('contratos.pdf')
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Contratos</h1>

      {/* Cards de resumo */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div style={{ background: '#e3f2fd', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <strong>Total de Contratos</strong>
          <p style={{ fontSize: '2rem', margin: '5px 0' }}>{totalContratos}</p>
        </div>
        <div style={{ background: '#d4edda', padding: '15px', borderRadius: '8px', flex: 1, textAlign: 'center' }}>
          <strong>Valor Total</strong>
          <p style={{ fontSize: '2rem', margin: '5px 0' }}>
            {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <Link href="/contratos/novo">
          <button style={{ marginRight: '10px', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Novo Contrato
          </button>
        </Link>
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
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Nº Contrato</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Órgão</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Licitação</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Objeto</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Valor</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Assinatura</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Vigência</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Arquivo</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Calendário</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratos.map((c) => {
              const dias = calcularDiasRestantes(c.vigencia_fim)
              const statusText = getStatusText(c.vigencia_fim)
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>
                    <Link href={`/contratos/${c.id}`}>{c.numero_contrato}</Link>
                  </td>
                  <td style={{ padding: '10px' }}>{c.licitacoes?.orgaos?.razao_social || '—'}</td>
                  <td style={{ padding: '10px' }}>{c.licitacoes?.identificacao || '—'}</td>
                  <td style={{ padding: '10px' }}>{c.objeto || '—'}</td>
                  <td style={{ padding: '10px' }}>
                    {c.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '10px' }}>{formatarData(c.data_assinatura)}</td>
                  <td style={{ padding: '10px' }}>
                    {formatarData(c.vigencia_inicio)} a {formatarData(c.vigencia_fim)}
                  </td>
                  <td style={{ padding: '10px' }}>{statusText}</td>
                  <td style={{ padding: '10px' }}>
                    {c.arquivo_url ? (
                      <a href={c.arquivo_url} target="_blank" rel="noopener noreferrer">📄</a>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {c.vigencia_fim ? (
                      <a
                        href={linkContratoCalendario(c)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Adicionar vencimento ao Google Calendar"
                      >
                        📅
                      </a>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <Link href={`/contratos/editar/${c.id}`}>
                      <button style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirContrato(c.id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}