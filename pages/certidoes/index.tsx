import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

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

const PAGE_SIZE = 20

export default function ListaCertidoes() {
  const [certidoes, setCertidoes] = useState<Certidao[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)

  const carregarCertidoes = async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    setLoading(reset)
    setLoadingMore(!reset)

    const { data, error } = await supabase
      .from('certidoes')
      .select('*, unidades(codigo, razao_social)')
      .order('vencimento', { ascending: true })
      .range(from, to)

    if (error) {
      console.error(error)
    } else {
      if (reset) {
        setCertidoes(data || [])
        setPage(1)
      } else {
        setCertidoes(prev => [...prev, ...(data || [])])
        setPage(prev => prev + 1)
      }
      setHasMore(data && data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    carregarCertidoes(true)
  }, [])

  async function excluirCertidao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta certidão?')) return
    const { error } = await supabase.from('certidoes').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarCertidoes(true)
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

  function getStatusClass(dias: number) {
    if (dias < 0) return { color: 'red', text: 'Vencido', bg: '#ffeeee' }
    if (dias <= 15) return { color: 'orange', text: `Vence em ${dias} dias`, bg: '#fff3cd' }
    return { color: 'green', text: 'Válido', bg: '#d4edda' }
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Certidões</h1>
      <Link href="/certidoes/novo">
        <button style={{ marginBottom: '20px', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Nova Certidão
        </button>
      </Link>

      {loading && page === 0 ? (
        <p>Carregando...</p>
      ) : (
        <>
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
                const status = getStatusClass(dias)
                return (
                  <tr key={cert.id} style={{ borderBottom: '1px solid #ddd', background: status.bg }}>
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
                        <a href={cert.arquivo_url} target="_blank" rel="noopener noreferrer">
                          📄 Ver
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Link href={`/certidoes/editar/${cert.id}`}>
                        <button style={{ marginRight: '5px' }}>Editar</button>
                      </Link>
                      <button onClick={() => excluirCertidao(cert.id)}>Excluir</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => carregarCertidoes()}
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