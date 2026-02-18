import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Certidao {
  id: string
  nome_certidao: string
  responsavel_nome: string
  data_emissao: string
  validade_dias: number
  vencimento: string
  arquivo_url: string | null
  unidade_id: string
  unidades?: { codigo: string; razao_social: string }
}

export default function ListaCertidoes() {
  const [certidoes, setCertidoes] = useState<Certidao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarCertidoes()
  }, [])

  async function carregarCertidoes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('certidoes')
      .select('*, unidades(codigo, razao_social)')
      .order('vencimento', { ascending: true })
    if (error) console.error(error)
    else setCertidoes(data || [])
    setLoading(false)
  }

  async function excluirCertidao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta certidão?')) return
    const { error } = await supabase.from('certidoes').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarCertidoes()
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function calcularDiasRestantes(vencimentoISO: string) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const venc = new Date(vencimentoISO + 'T00:00:00')
    const diff = venc.getTime() - hoje.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function getStatus(dias: number) {
    if (dias < 0) return { text: 'Vencido', color: 'red' }
    if (dias <= 15) return { text: `Vence em ${dias} dias`, color: 'orange' }
    return { text: 'Válido', color: 'green' }
  }

  // Exportação Excel
  function exportarExcel() {
    const dados = certidoes.map(c => ({
      Certidão: c.nome_certidao,
      Unidade: c.unidades?.codigo ? `${c.unidades.codigo} - ${c.unidades.razao_social}` : 'Geral',
      Responsável: c.responsavel_nome || '',
      Emissão: c.data_emissao,
      Vencimento: c.vencimento,
      Status: (() => {
        const dias = calcularDiasRestantes(c.vencimento)
        return dias < 0 ? 'Vencido' : dias <= 15 ? `Vence em ${dias} dias` : 'Válido'
      })(),
    }))
    const ws = XLSX.utils.json_to_sheet(dados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Certidões')
    XLSX.writeFile(wb, 'certidoes.xlsx')
  }

  // Exportação PDF
  function exportarPDF() {
  const doc = new jsPDF()
  const dataAtual = new Date().toLocaleDateString('pt-BR')

  doc.setFontSize(16)
  doc.text('Relatório de Certidões', 14, 20)
  doc.setFontSize(10)
  doc.text(`Data de emissão: ${dataAtual}`, 14, 28)

  const colunas = ['Certidão', 'Unidade', 'Responsável', 'Emissão', 'Vencimento', 'Status']
  const linhas = certidoes.map(c => {
    const dias = calcularDiasRestantes(c.vencimento)
    const status = dias < 0 ? 'Vencido' : dias <= 15 ? `Vence em ${dias} dias` : 'Válido'
    return [
      c.nome_certidao,
      c.unidades?.codigo ? `${c.unidades.codigo} - ${c.unidades.razao_social}` : 'Geral',
      c.responsavel_nome || '',
      formatarData(c.data_emissao),
      formatarData(c.vencimento),
      status,
    ]
  })

  autoTable(doc, {
    startY: 35,
    head: [colunas],
    body: linhas,
  })
  doc.save('certidoes.pdf')
}

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Certidões</h1>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/certidoes/novo">
          <button style={{ marginRight: '10px', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Nova Certidão
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
              <th style={{ padding: '10px', textAlign: 'left' }}>Certidão</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Unidade</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Responsável</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Emissão</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Vencimento</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Arquivo</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {certidoes.map((cert) => {
              const dias = calcularDiasRestantes(cert.vencimento)
              const status = getStatus(dias)
              return (
                <tr key={cert.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{cert.nome_certidao}</td>
                  <td style={{ padding: '10px' }}>
                    {cert.unidades?.codigo ? `${cert.unidades.codigo} - ${cert.unidades.razao_social}` : 'Geral'}
                  </td>
                  <td style={{ padding: '10px' }}>{cert.responsavel_nome}</td>
                  <td style={{ padding: '10px' }}>{formatarData(cert.data_emissao)}</td>
                  <td style={{ padding: '10px' }}>{formatarData(cert.vencimento)}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: status.color }}>{status.text}</td>
                  <td style={{ padding: '10px' }}>
                    {cert.arquivo_url ? (
                      <a href={cert.arquivo_url} target="_blank" rel="noopener noreferrer">📄</a>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <Link href={`/certidoes/editar/${cert.id}`}>
                      <button style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirCertidao(cert.id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
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