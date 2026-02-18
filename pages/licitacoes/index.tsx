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
  // 1. Ajuste na Interface para aceitar o retorno do Supabase
  orgaos?: { razao_social: string } | { razao_social: string }[]
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
      console.error(error)
    } else {
      // 2. Correção Crítica: Formatando os órgãos para garantir que o sistema não quebre
      const formatado = data?.map((lic: any) => ({
        ...lic,
        orgaos: Array.isArray(lic.orgaos) ? lic.orgaos[0] : lic.orgaos
      }))
      setLicitacoes(formatado || [])
    }
    setLoading(false)
  }

  // Helper para acessar a razão social com segurança no código
  const getRazaoSocial = (lic: Licitacao) => {
    const orgaoData: any = lic.orgaos
    return Array.isArray(orgaoData) ? orgaoData[0]?.razao_social : orgaoData?.razao_social
  }

  async function excluirLicitacao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta licitação?')) return
    const { error } = await supabase.from('licitacoes').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarLicitacoes()
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function exportarExcel() {
    const dados = licitacoes.map(lic => ({
      Identificação: lic.identificacao,
      'Órgão': getRazaoSocial(lic) || '',
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
      getRazaoSocial(lic) || '',
      lic.modalidade || '',
      lic.valor_estimado ? `R$ ${lic.valor_estimado.toFixed(2)}` : '',
      formatarData(lic.data_limite_participacao),
      lic.status || '',
    ])

    autoTable(doc, { startY: 35, head: [colunas], body: linhas })
    doc.save('licitacoes.pdf')
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px' }}>Licitações</h1>
      
      {/* Botões com visual levemente melhorado */}
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <Link href="/licitacoes/novo">
          <button style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            + Nova Licitação
          </button>
        </Link>
        <button onClick={exportarExcel} style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          Excel
        </button>
        <button onClick={exportarPDF} style={{ padding: '10px 20px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          PDF
        </button>
      </div>

      {loading ? (
        <p>Carregando dados da Nordeste...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Identificação</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Órgão</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Modalidade</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Valor</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Data Limite</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>Agenda</th>
                <th style={{ padding: '16px', textAlign: 'right', color: '#64748b' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {licitacoes.map((lic) => (
                <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '16px', fontWeight: '600' }}>
                    <Link href={`/licitacoes/${lic.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{lic.identificacao}</Link>
                  </td>
                  <td style={{ padding: '16px', color: '#334155' }}>{getRazaoSocial(lic) || '—'}</td>
                  <td style={{ padding: '16px', color: '#64748b' }}>{lic.modalidade}</td>
                  <td style={{ padding: '16px', fontWeight: '500' }}>
                    {lic.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '16px' }}>{formatarData(lic.data_limite_participacao)}</td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#dcfce7', color: '#166534' }}>
                      {lic.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    {lic.data_limite_participacao ? (
                      <a href={linkLicitacaoCalendario(lic)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', fontSize: '1.2rem' }}>📅</a>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <Link href={`/licitacoes/editar/${lic.id}`}>
                      <button style={{ marginRight: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirLicitacao(lic.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}