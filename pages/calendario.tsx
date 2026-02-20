import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

interface EventoLicitacao {
  id: string
  identificacao: string
  data_limite_participacao: string
  status: string
  orgaos?: { razao_social: string }
}

export default function CalendarioEventos() {
  const [eventos, setEventos] = useState<EventoLicitacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarEventos()
  }, [])

  async function carregarEventos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('id, identificacao, data_limite_participacao, status, orgaos(razao_social)')
        .not('data_limite_participacao', 'is', null)
        .order('data_limite_participacao', { ascending: true })

      if (error) throw error
      if (data) setEventos(data as any)
    } catch (error) {
      console.error('Erro ao carregar calendário:', error)
    } finally {
      setLoading(false)
    }
  }

  // NOVA FUNÇÃO: Atualizar resultado sem mudar de página
  async function atualizarResultado(id: string, novoStatus: 'Ganha' | 'Perdida') {
    const confirmacao = confirm(`Confirmar resultado: Licitação ${novoStatus}?`)
    if (!confirmacao) return

    try {
      const { error } = await supabase
        .from('licitacoes')
        .update({ status: novoStatus })
        .eq('id', id)

      if (error) throw error
      alert('Status atualizado com sucesso!')
      carregarEventos() // Recarrega a lista para refletir a mudança
    } catch (error) {
      alert('Erro ao atualizar status.')
      console.error(error)
    }
  }

  function gerarLinkGoogleCalendar(evento: EventoLicitacao) {
    const titulo = encodeURIComponent(`Sessão: ${evento.identificacao}`)
    const dataFormatada = evento.data_limite_participacao.replace(/-/g, '')
    return `https://www.google.com/calendar/render?action=TEMPLATE&text=${titulo}&dates=${dataFormatada}/${dataFormatada}&details=${encodeURIComponent(evento.orgaos?.razao_social || '')}`
  }

  function formatarDia(dataISO: string) { return dataISO.split('-')[2] }
  function formatarMesAno(dataISO: string) {
    return new Date(dataISO + 'T00:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()
  }

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Sincronizando cronograma...</div>

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', padding: '40px 20px' }}>
      
      {/* HEADER COM AÇÃO DE NOVO EVENTO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '60px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 10px 0', fontSize: '2.8rem', fontWeight: '900', letterSpacing: '-1.5px' }}>
            Cronograma de Sessões
          </h1>
          <p style={{ color: '#64748b', fontSize: '1.2rem' }}>Agenda estratégica de licitações da Nordeste.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '15px' }}>
          <Link href="/licitacoes/nova">
            <button style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '14px 28px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700' }}>
              ➕ Agendar Sessão
            </button>
          </Link>
          <Link href="/dashboard">
            <button style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '14px 28px', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', color: '#475569' }}>
              ← Painel
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
        {eventos.map((evento) => {
          const hoje = new Date().toISOString().split('T')[0]
          const isHoje = evento.data_limite_participacao === hoje
          const jaFinalizada = evento.status === 'Ganha' || evento.status === 'Perdida'

          return (
            <div key={evento.id} style={{ 
              display: 'flex', 
              background: jaFinalizada ? '#f8fafc' : '#fff', 
              borderRadius: '24px', 
              overflow: 'hidden', 
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04)',
              border: isHoje ? '2px solid #3b82f6' : '1px solid #f1f5f9',
              opacity: jaFinalizada ? 0.7 : 1
            }}>
              
              <div style={{ minWidth: '180px', background: isHoje ? '#3b82f6' : '#f8fafc', color: isHoje ? '#fff' : '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', opacity: 0.8 }}>{formatarMesAno(evento.data_limite_participacao)}</span>
                <span style={{ fontSize: '4rem', fontWeight: '950', margin: '5px 0' }}>{formatarDia(evento.data_limite_participacao)}</span>
              </div>

              <div style={{ flex: 1, padding: '30px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  {isHoje && !jaFinalizada && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', marginBottom: '10px', display: 'inline-block' }}>⚡ HOJE</span>}
                  {jaFinalizada && <span style={{ background: evento.status === 'Ganha' ? '#dcfce7' : '#fee2e2', color: evento.status === 'Ganha' ? '#166534' : '#991b1b', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', marginBottom: '10px', display: 'inline-block' }}>{evento.status.toUpperCase()}</span>}
                  
                  <h2 style={{ margin: '0 0 10px 0', fontSize: '1.7rem', color: '#0f172a', fontWeight: '900' }}>{evento.identificacao}</h2>
                  <p style={{ margin: 0, color: '#64748b', fontWeight: '600' }}>🏛️ {evento.orgaos?.razao_social}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                  {/* BOTÕES DE AÇÃO RÁPIDA (Só aparecem se não estiver finalizada) */}
                  {!jaFinalizada && (
                    <div style={{ display: 'flex', gap: '10px', borderRight: '1px solid #e2e8f0', paddingRight: '25px' }}>
                      <button onClick={() => atualizarResultado(evento.id, 'Ganha')} style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>🏆 Ganha</button>
                      <button onClick={() => atualizarResultado(evento.id, 'Perdida')} style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 15px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Perdida</button>
                    </div>
                  )}

                  <a href={gerarLinkGoogleCalendar(evento)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.8rem', textDecoration: 'none' }} title="Google Agenda">🗓️</a>

                  <Link href={`/licitacoes/editar/${evento.id}`}>
                    <button style={{ background: '#1e293b', color: '#fff', border: 'none', padding: '15px 30px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer' }}>Detalhes</button>
                  </Link>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}