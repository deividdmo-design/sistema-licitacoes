import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function DetalheContrato() {
  const router = useRouter()
  const { id } = router.query
  const [contrato, setContrato] = useState<any>(null)
  const [recebimentos, setRecebimentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalRecebido, setTotalRecebido] = useState(0)

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)
    // Dados do contrato
    const { data: c } = await supabase
      .from('contratos')
      .select(`
        *,
        licitacoes (
          identificacao,
          orgaos ( razao_social )
        )
      `)
      .eq('id', id)
      .single()
    setContrato(c)

    // Recebimentos vinculados
    const { data: r } = await supabase
      .from('recebimentos')
      .select('*')
      .eq('contrato_id', id)
      .order('data_pagamento', { ascending: false })
    setRecebimentos(r || [])
    const total = (r || []).reduce((acc, rec) => acc + rec.valor_recebido, 0)
    setTotalRecebido(total)

    setLoading(false)
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function gerarLinkGoogleCalendar() {
    if (!contrato) return '#'
    const start = new Date(contrato.vigencia_inicio).toISOString().replace(/-|:|\.\d+/g, '')
    const end = new Date(contrato.vigencia_fim).toISOString().replace(/-|:|\.\d+/g, '')
    const title = encodeURIComponent(`Vigência contrato ${contrato.numero_contrato}`)
    const details = encodeURIComponent(`Objeto: ${contrato.objeto}`)
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`
  }

  if (loading) return <p>Carregando...</p>
  if (!contrato) return <p>Contrato não encontrado</p>

  const valorTotal = contrato.valor_total + (contrato.valor_aditivo || 0)

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1>Contrato {contrato.numero_contrato}</h1>
      <Link href={`/contratos/editar/${id}`}>
        <button style={{ marginBottom: '20px', padding: '8px 16px', marginRight: '10px' }}>Editar</button>
      </Link>
      <a href={gerarLinkGoogleCalendar()} target="_blank" rel="noopener noreferrer">
        <button style={{ marginBottom: '20px', padding: '8px 16px' }}>Adicionar ao Google Calendar</button>
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Informações Gerais</h3>
          <p><strong>Órgão:</strong> {contrato.licitacoes?.orgaos?.razao_social}</p>
          <p><strong>Licitação:</strong> {contrato.licitacoes?.identificacao}</p>
          <p><strong>Objeto:</strong> {contrato.objeto}</p>
          <p><strong>Nº Processo:</strong> {contrato.numero_processo || '—'}</p>
          <p><strong>Responsável:</strong> {contrato.responsavel || '—'}</p>
        </div>
        <div>
          <h3>Valores e Vigência</h3>
          <p><strong>Valor contratado:</strong> {contrato.valor_total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p><strong>Aditivos:</strong> {contrato.valor_aditivo?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p><strong>Valor total:</strong> {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          <p><strong>Assinatura:</strong> {formatarData(contrato.data_assinatura)}</p>
          <p><strong>Vigência:</strong> {formatarData(contrato.vigencia_inicio)} a {formatarData(contrato.vigencia_fim)}</p>
          {contrato.arquivo_url && (
            <p><strong>Arquivo:</strong> <a href={contrato.arquivo_url} target="_blank">Download</a></p>
          )}
        </div>
      </div>

      <h3 style={{ marginTop: '30px' }}>Recebimentos Vinculados</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Data</th><th>Valor</th><th>Nota Fiscal</th></tr>
        </thead>
        <tbody>
          {recebimentos.map(r => (
            <tr key={r.id}>
              <td>{formatarData(r.data_pagamento)}</td>
              <td>{r.valor_recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
              <td>{r.nota_fiscal || '—'}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td colSpan={3}><strong>Total recebido: {totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></td></tr>
        </tfoot>
      </table>
      <p style={{ marginTop: '20px' }}>
        <Link href="/contratos">← Voltar para lista</Link>
      </p>
    </div>
  )
}