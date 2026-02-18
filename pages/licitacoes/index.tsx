import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { linkLicitacaoCalendario } from '../../lib/googleCalendar'

interface Licitacao {
  id: string
  identificacao: string
  orgao_id: string
  orgaos?: { razao_social: string }
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
}

export default function ListaLicitacoes() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarLicitacoes()
  }, [])

  async function carregarLicitacoes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .order('data_limite_participacao', { ascending: false })
    if (error) {
      console.error('Erro ao carregar licitações:', error)
      alert('Erro ao carregar dados. Verifique o console.')
    } else {
      setLicitacoes(data || [])
    }
    setLoading(false)
  }

  async function excluirLicitacao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta licitação?')) return
    const { error } = await supabase.from('licitacoes').delete().eq('id', id)
    if (error) {
      console.error('Erro ao excluir:', error)
      alert('Erro ao excluir: ' + error.message)
    } else {
      alert('Licitação excluída com sucesso!')
      carregarLicitacoes()
    }
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // Exportação Excel
  function exportarExcel() {
    const dados = licitacoes.map(lic => ({
      Identificação: lic.identificacao,
      'Órgão': lic.orgaos?.razao_social || '',
      Modalidade: lic.modalidade || '',
      'Valor Estimado': lic.valor_estimado || 0,
      'Data Limite': lic.data_limite_participacao || '',
      Status: lic.status || '',
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Licitações')
    XLSX.writeFile(wb, 'licitacoes.xlsx')
  }

  // Exportação PDF
  function exportarPDF() {
    const doc = new jsPDF()
    const dataAtual = new Date().toLocaleDateString('pt-BR')
    doc.setFontSize(16)
    doc.text('Relatório de Licitações', 14, 20)
    doc.setFontSize(10)
    doc.text(`Data de emissão: ${dataAtual}`, 14, 28)

    const colunas = ['Identificação', 'Órgão', 'Modalidade', 'Valor Estimado', 'Data Limite', 'Status']
    const linhas = licitacoes.map(lic => [
      lic.identificacao,
      lic.orgaos?.razao_social || '',
      lic.modalidade || '',
      lic.valor_estimado ? `R$ ${lic.valor_estimado.toFixed(2)}` : '',
      formatarData(lic.data_limite_participacao),
      lic.status || '',
    ])

    autoTable(doc, { startY: 35, head: [colunas], body: linhas })
    doc.save('licitacoes.pdf')
  }

  if (loading) return <p>Carregando...</p>

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Licitações</h1>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/licitacoes/novo">
          <button style={{ marginRight: '10px', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Nova Licitação
          </button>
        </Link>
        <button onClick={exportarExcel} style={{ marginRight: '10px', padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Exportar Excel
        </button>
        <button onClick={exportarPDF} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Exportar PDF
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f0f0f0' }}>
            <th style={{ padding: '10px', textAlign: 'left' }}>Identificação</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Órgão</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Modalidade</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Valor</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Data Limite</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Calendário</th>
            <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {licitacoes.map((lic) => (
            <tr key={lic.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>
                <Link href={`/licitacoes/${lic.id}`}>{lic.identificacao}</Link>
              </td>
              <td style={{ padding: '10px' }}>{lic.orgaos?.razao_social || '—'}</td>
              <td style={{ padding: '10px' }}>{lic.modalidade}</td>
              <td style={{ padding: '10px' }}>
                {lic.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </td>
              <td style={{ padding: '10px' }}>{formatarData(lic.data_limite_participacao)}</td>
              <td style={{ padding: '10px' }}>{lic.status}</td>
              <td style={{ padding: '10px', textAlign: 'center' }}>
                {lic.data_limite_participacao ? (
                  <a
                    href={linkLicitacaoCalendario(lic)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Adicionar ao Google Calendar"
                  >
                    📅
                  </a>
                ) : '—'}
              </td>
              <td style={{ padding: '10px' }}>
                <Link href={`/licitacoes/editar/${lic.id}`}>
                  <button style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                </Link>
                <button onClick={() => excluirLicitacao(lic.id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}