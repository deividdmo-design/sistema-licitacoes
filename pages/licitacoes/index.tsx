import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Licitacao {
  id: string
  identificacao: string
  orgao_id: string
  orgaos?: { razao_social: string }
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  arquivo_url: string | null
}

const PAGE_SIZE = 20 // Quantidade de registros por carregamento

export default function ListaLicitacoes() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const carregarLicitacoes = async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    setLoading(reset)
    setLoadingMore(!reset)

    const { data, error } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .order('data_limite_participacao', { ascending: false })
      .range(from, to)

    if (error) {
      console.error(error)
    } else {
      if (reset) {
        setLicitacoes(data || [])
        setPage(1)
      } else {
        setLicitacoes(prev => [...prev, ...(data || [])])
        setPage(prev => prev + 1)
      }
      setHasMore(data && data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    carregarLicitacoes(true) // carrega primeira página
  }, [])

  async function excluirLicitacao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta licitação?')) return
    const { error } = await supabase.from('licitacoes').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarLicitacoes(true) // recarrega do início
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Licitações</h1>
      <Link href="/licitacoes/novo">
        <button style={{ marginBottom: '20px', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Nova Licitação
        </button>
      </Link>

      {loading && page === 0 ? (
        <p>Carregando...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Identificação</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Órgão</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Modalidade</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Valor</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Data Limite</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Arquivo</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {licitacoes.map((lic) => (
                <tr key={lic.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>
                    <Link href={`/licitacoes/${lic.id}`}>{lic.identificacao}</Link>
                  </td>
                  <td style={{ padding: '10px' }}>{lic.orgaos?.razao_social}</td>
                  <td style={{ padding: '10px' }}>{lic.modalidade}</td>
                  <td style={{ padding: '10px' }}>
                    {lic.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '10px' }}>{formatarData(lic.data_limite_participacao)}</td>
                  <td style={{ padding: '10px' }}>{lic.status}</td>
                  <td style={{ padding: '10px' }}>
                    {lic.arquivo_url ? (
                      <a href={lic.arquivo_url} target="_blank" rel="noopener noreferrer">
                        📄 Ver
                      </a>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '10px' }}>
                    <Link href={`/licitacoes/editar/${lic.id}`}>
                      <button style={{ marginRight: '5px' }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirLicitacao(lic.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => carregarLicitacoes()}
                disabled={loadingMore}
                style={{ padding: '10px 20px', cursor: 'pointer' }}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}