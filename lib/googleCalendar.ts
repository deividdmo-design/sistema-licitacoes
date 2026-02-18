interface EventoCalendario {
  titulo: string
  descricao?: string
  local?: string
  dataInicio: string // formato YYYY-MM-DD (ou com hora)
  dataFim?: string   // opcional, se não fornecido será dataInicio + 1h
  duracaoMinutos?: number // 60 por padrão
}

/**
 * Gera URL para adicionar evento ao Google Calendar
 * Formato: https://calendar.google.com/calendar/render?action=TEMPLATE&text=...
 */
export function gerarLinkGoogleCalendar(evento: EventoCalendario): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  
  const params = new URLSearchParams()
  params.append('text', evento.titulo)
  
  if (evento.descricao) {
    params.append('details', evento.descricao)
  }
  
  if (evento.local) {
    params.append('location', evento.local)
  }
  
  const formatarDataGoogle = (dataISO: string, comHora: boolean = true) => {
    if (!dataISO) return ''
    if (dataISO.includes('T')) {
      return dataISO.replace(/[-:]/g, '').split('.')[0]
    } else {
      return dataISO.replace(/-/g, '')
    }
  }

  if (evento.dataInicio) {
    let dataInicio = evento.dataInicio
    if (!dataInicio.includes('T')) {
      dataInicio = `${dataInicio}T09:00:00`
    }
    params.append('dates', `${formatarDataGoogle(dataInicio)}/${evento.dataFim ? formatarDataGoogle(evento.dataFim) : ''}`)
  }

  return `${baseUrl}&${params.toString()}`
}

export function linkLicitacaoCalendario(licitacao: any): string {
  const titulo = `📋 Licitação: ${licitacao.identificacao}`
  const descricao = `Órgão: ${licitacao.orgaos?.razao_social || 'Não informado'}\nModalidade: ${licitacao.modalidade || '-'}\nObjeto: ${licitacao.objeto || '-'}`
  
  if (licitacao.data_limite_participacao) {
    return gerarLinkGoogleCalendar({
      titulo,
      descricao,
      dataInicio: licitacao.data_limite_participacao,
    })
  }
  return '#'
}

export function linkContratoCalendario(contrato: any): string {
  const titulo = `📑 Contrato: ${contrato.numero_contrato} (fim da vigência)`
  const descricao = `Órgão: ${contrato.licitacoes?.orgaos?.razao_social || 'Não informado'}\nObjeto: ${contrato.objeto || '-'}`
  
  if (contrato.vigencia_fim) {
    return gerarLinkGoogleCalendar({
      titulo,
      descricao,
      dataInicio: contrato.vigencia_fim,
    })
  }
  return '#'
}