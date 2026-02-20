import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'

interface Orgao {
  razao_social?: string
}

interface Licitacao {
  id: string
  identificacao: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  orgaos?: Orgao
}

// Configuração visual das colunas do Pipeline
const CONFIG_STATUS: Record<string, { icone: string, corBase: string, bgHeader: string, corTextoHeader: string }> = {
  'em análise': { icone: '📋', corBase: '#3b82f6', bgHeader: '#eff6ff', corTextoHeader: '#1e3a8a' }, 
  'em precificação': { icone: '💲', corBase: '#f59e0b', bgHeader: '#fffbeb', corTextoHeader: '#92400e' }, 
  'aguardando autorização da diretoria': { icone: '⏳', corBase: '#8b5cf6', bgHeader: '#f5f3ff', corTextoHeader: '#4c1d95' }, 
  'aguardando sessão': { icone: '⏰', corBase: '#0ea5e9', bgHeader: '#f0f9ff', corTextoHeader: '#0c4a6e' }, 
  'ganha': { icone: '🏆', corBase: '#10b981', bgHeader: '#ecfdf5', corTextoHeader: '#064e3b' }, 
  'perdida': { icone: '❌', corBase: '#ef4444', bgHeader: '#fef2f2', corTextoHeader: '#7f1d1d' }
}

// Ordem exata que as colunas devem aparecer na tela
const ORDEM_PIPELINE = [
  'Em Análise',
  'Em Precificação',
  'Aguardando autorização da Diretoria',
  'Aguardando Sessão',
  'Ganha',
  'Perdida'
]

export default function KanbanLicitacoes() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [colunas, setColunas] = useState<string[]>([])

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('licitacoes')
        .select('*, orgaos(razao_social)')
        .order('data_limite_participacao', { ascending: true })

      if (error) throw error
      
      if (data) {
        setLicitacoes(data as any)
        
        // Pega os status que vieram do banco
        const statusDoBanco = Array.from(new Set(data.map(lic => lic.status || 'Pendente')))
        
        // Junta o Pipeline padrão com qualquer status novo/estranho que tenha vindo do banco
        const todasAsColunas = Array.from(new Set([...ORDEM_PIPELINE, ...statusDoBanco]))
        
        // Ordena garantindo que o Pipeline padrão fique na frente e na ordem certa
        const colunasOrdenadas = todasAsColunas.sort((a, b) => {
          const indexA = ORDEM_PIPELINE.findIndex(s => s.toLowerCase() === a.toLowerCase())
          const indexB = ORDEM_PIPELINE.findIndex(s => s.toLowerCase() === b.toLowerCase())
          
          if (indexA !== -1 && indexB !== -1) return indexA - indexB
          if (indexA !== -1) return -1
          if (indexB !== -1) return 1
          return a.localeCompare(b)
        })

        setColunas(colunasOrdenadas)
      }
    } catch (error) {
      console.error('Erro ao carregar Kanban:', error)
    } finally {
      setLoading(false)
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return '-'
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function formatarMoeda(valor: number) {
    if (!valor) return 'R$ 0,00'
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
  }

  // Motor que calcula quantos dias faltam e define a urgência
  function analisarUrgencia(dataISO: string) {
    if (!dataISO) return { urgente: false, diasTexto: '-' }
    
    const dataSessao = new Date(dataISO + 'T00:00:00')
    const hoje = new Date()
    hoje.setHours(0,0,0,0)
    
    const diferencaTempo = dataSessao.getTime() - hoje.getTime()
    const diferencaDias = Math.ceil(diferencaTempo / (1000 * 60 * 60 * 24))
    
    if (diferencaDias < 0) return { urgente: true, diasTexto: `Atrasada (${Math.abs(diferencaDias)}d)` }
    if (diferencaDias === 0) return { urgente: true, diasTexto: 'É Hoje!' }
    if (diferencaDias <= 3) return { urgente: true, diasTexto: `Faltam ${diferencaDias}d` }
    return { urgente: false, diasTexto: `Em ${diferencaDias}d` }
  }

  function getEstiloColuna(status: string) {
    const s = status.toLowerCase()
    return CONFIG_STATUS[s] || { icone: '📌', corBase: '#94a3b8', bgHeader: '#f1f5f9', corTextoHeader: '#334155' }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '90vh', fontFamily: '"Inter", sans-serif', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '25px', paddingRight: '10px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 8px 0', fontSize: '2.2rem', letterSpacing: '-0.5px' }}>
            Esteira de Licitações
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '1.05rem' }}>Arraste, monitore e feche contratos através do nosso pipeline inteligente.</p>
        </div>
        <Link href="/dashboard">
          <button style={{ background: '#fff', border: '1px solid #cbd5e1', color: '#334155', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = '#fff'}>
            🏠 Voltar ao Dashboard
          </button>
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <div style={{ fontSize: '1.2rem', color: '#64748b', fontWeight: 'bold' }}>Carregando Pipeline... 🧩</div>
        </div>
      ) : (
        
        /* CONTAINER DO BOARD (COM SCROLL) */
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px', flex: 1, alignItems: 'flex-start' }}>
          
          {colunas.map(statusColuna => {
            const estilo = getEstiloColuna(statusColuna)
            // Filtra ignorando letras maiúsculas/minúsculas
            const cardsDaColuna = licitacoes.filter(lic => (lic.status || 'Pendente').toLowerCase() === statusColuna.toLowerCase())

            return (
              /* COLUNA */
              <div key={statusColuna} style={{ minWidth: '340px', maxWidth: '340px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', maxHeight: '100%', overflow: 'hidden' }}>
                
                {/* HEADER DA COLUNA (COM A COR DE FUNDO) */}
                <div style={{ background: estilo.bgHeader, padding: '15px 20px', borderBottom: `3px solid ${estilo.corBase}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', color: estilo.corTextoHeader, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>{estilo.icone}</span> {statusColuna}
                  </h3>
                  <span style={{ background: estilo.corBase, color: 'white', padding: '2px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    {cardsDaColuna.length}
                  </span>
                </div>

                {/* ÁREA DE CARDS (BODY DA COLUNA) */}
                <div style={{ padding: '15px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  
                  {cardsDaColuna.length === 0 ? (
                    <div style={{ background: 'transparent', border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '30px 10px', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', fontWeight: '500' }}>
                      Nenhum edital nesta fase.
                    </div>
                  ) : (
                    cardsDaColuna.map(lic => {
                      const analiseTempo = analisarUrgencia(lic.data_limite_participacao)
                      // Se for coluna de Ganha ou Perdida, não precisa gritar urgência
                      const isAtivo = statusColuna.toLowerCase() !== 'ganha' && statusColuna.toLowerCase() !== 'perdida'
                      const mostrarAlerta = analiseTempo.urgente && isAtivo
                      
                      return (
                        /* O CARD (POST-IT) */
                        <Link key={lic.id} href={`/licitacoes/editar/${lic.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ 
                            background: '#ffffff', padding: '18px', borderRadius: '10px', 
                            boxShadow: mostrarAlerta ? '0 4px 15px -3px rgba(239, 68, 68, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)', 
                            border: '1px solid', borderColor: mostrarAlerta ? '#fca5a5' : '#e2e8f0', 
                            borderLeft: `5px solid ${mostrarAlerta ? '#ef4444' : estilo.corBase}`, 
                            cursor: 'pointer', transition: 'all 0.2s ease' 
                          }} 
                          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 20px -5px rgba(0,0,0,0.1)' }} 
                          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = mostrarAlerta ? '0 4px 15px -3px rgba(239, 68, 68, 0.2)' : '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            
                            {/* Linha 1: Identificação */}
                            <div style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '800', marginBottom: '8px', lineHeight: '1.3' }}>
                              {lic.identificacao}
                            </div>
                            
                            {/* Linha 2: Órgão */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '15px' }}>
                              <span style={{ fontSize: '1rem' }}>🏛️</span>
                              <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: '500', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {lic.orgaos?.razao_social || 'Órgão não informado'}
                              </div>
                            </div>
                            
                            <hr style={{ border: 'none', borderTop: '1px dashed #e2e8f0', margin: '0 0 15px 0' }} />
                            
                            {/* Linha 3: Rodapé com Valor e Data */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ fontSize: '1rem', fontWeight: '900', color: '#10b981' }}>
                                {formatarMoeda(lic.valor_estimado)}
                              </div>
                              <div style={{ 
                                fontSize: '0.75rem', fontWeight: '800', 
                                color: mostrarAlerta ? '#ef4444' : '#64748b', 
                                background: mostrarAlerta ? '#fef2f2' : '#f1f5f9', 
                                padding: '4px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' 
                              }}>
                                {mostrarAlerta ? '🚨' : '📅'} {analiseTempo.diasTexto}
                              </div>
                            </div>

                          </div>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
          
        </div>
      )}

      {/* Estilização moderna da barra de rolagem */}
      <style>{`
        ::-webkit-scrollbar { height: 12px; width: 8px; }
        ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; border: 1px solid #e2e8f0; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; border: 2px solid #f1f5f9; }
        ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

    </div>
  )
}