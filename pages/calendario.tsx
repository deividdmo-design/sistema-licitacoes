import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { linkLicitacaoCalendario, linkContratoCalendario } from '../lib/googleCalendar'
import Link from 'next/link'

interface Evento {
  id: string
  tipo: 'licitacao' | 'contrato'
  titulo: string
  descricao: string
  data: string
  link: string
}

export default function CalendarioPage() {
  const [eventos, setEventos] = useState<Evento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarEventos()
  }, [])

  async function carregarEventos() {
    setLoading(true)
    const eventosTemp: Evento[] = []

    // Buscar licitações com data limite
    const { data: licitacoes } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .not('data_limite_participacao', 'is', null)

    licitacoes?.forEach(l => {
      eventosTemp.push({
        id: `lic-${l.id}`,
        tipo: 'licitacao',
        titulo: `📋 ${l.identificacao}`,
        descricao: `Órgão: ${l.orgaos?.razao_social}`,
        data: l.data_limite_participacao,
        link: linkLicitacaoCalendario(l)
      })
    })

    // Buscar contratos com vigência fim
    const { data: contratos } = await supabase
      .from('contratos')
      .select('*, licitacoes(orgaos(razao_social))')
      .not('vigencia_fim', 'is', null)

    contratos?.forEach(c => {
      eventosTemp.push({
        id: `con-${c.id}`,
        tipo: 'contrato',
        titulo: `📑 ${c.numero_contrato} (fim)`,
        descricao: `Órgão: ${c.licitacoes?.orgaos?.razao_social}`,
        data: c.vigencia_fim,
        link: linkContratoCalendario(c)
      })
    })

    // Ordenar por data
    eventosTemp.sort((a, b) => a.data.localeCompare(b.data))
    setEventos(eventosTemp)
    setLoading(false)
  }

  function formatarData(dataISO: string) {
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>📆 Calendário de Eventos</h1>
      <Link href="/dashboard">
        <button style={{ marginBottom: '20px' }}>← Voltar</button>
      </Link>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Data</th>
              <th>Evento</th>
              <th>Descrição</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {eventos.map(evento => (
              <tr key={evento.id}>
                <td>{formatarData(evento.data)}</td>
                <td>{evento.titulo}</td>
                <td>{evento.descricao}</td>
                <td>
                  <a
                    href={evento.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Adicionar ao Google Calendar"
                  >
                    📅 Adicionar
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}