import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface Documento {
  id: string
  nome: string
  tipo: string
  unidade_id: string
  unidades?: { codigo: string; razao_social: string }
  data_emissao: string | null
  validade_dias: number | null
  sem_validade: boolean
  vencimento: string | null
  arquivo_url: string | null
  observacoes: string | null
}

const PAGE_SIZE = 20

export default function ListaDocumentos() {
  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [selecionados, setSelecionados] = useState<string[]>([])

  const carregarDocumentos = async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    setLoading(reset)
    setLoadingMore(!reset)

    const { data, error } = await supabase
      .from('documentos')
      .select('*, unidades(codigo, razao_social)')
      .order('vencimento', { ascending: true, nullsFirst: false })
      .range(from, to)

    if (error) {
      console.error(error)
    } else {
      if (reset) {
        setDocumentos(data || [])
        setPage(1)
      } else {
        setDocumentos(prev => [...prev, ...(data || [])])
        setPage(prev => prev + 1)
      }
      setHasMore(data && data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    carregarDocumentos(true)
  }, [])

  async function excluirDocumento(id: string) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    const { error } = await supabase.from('documentos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarDocumentos(true)
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function calcularDiasRestantes(vencimentoISO: string | null) {
    if (!vencimentoISO) return null
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const venc = new Date(vencimentoISO + 'T00:00:00')
    const diff = venc.getTime() - hoje.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  function getStatus(vencimentoISO: string | null, semValidade: boolean) {
    if (semValidade) return { text: 'Indeterminado', color: '#6c757d', bg: '#e9ecef' }
    if (!vencimentoISO) return { text: 'Sem vencimento', color: '#6c757d', bg: '#e9ecef' }
    const dias = calcularDiasRestantes(vencimentoISO)
    if (dias === null) return { text: 'Erro', color: '#000', bg: '#fff' }
    if (dias < 0) return { text: 'Vencido', color: 'red', bg: '#ffeeee' }
    if (dias <= 15) return { text: `Vence em ${dias} dias`, color: 'orange', bg: '#fff3cd' }
    return { text: 'Vigente', color: 'green', bg: '#d4edda' }
  }

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const selecionarTodos = () => {
    if (selecionados.length === documentos.length) {
      setSelecionados([])
    } else {
      setSelecionados(documentos.map(d => d.id))
    }
  }

  const baixarSelecionados = async () => {
    const docsParaBaixar = documentos.filter(d => selecionados.includes(d.id) && d.arquivo_url)
    if (docsParaBaixar.length === 0) {
      alert('Nenhum documento com arquivo selecionado.')
      return
    }

    const zip = new JSZip()
    for (const doc of docsParaBaixar) {
      if (doc.arquivo_url) {
        try {
          const response = await fetch(doc.arquivo_url)
          const blob = await response.blob()
          // Extrair nome do arquivo da URL ou usar o nome do documento
          const nomeArquivo = doc.arquivo_url.split('/').pop() || `${doc.nome}.pdf`
          zip.file(nomeArquivo, blob)
        } catch (error) {
          console.error('Erro ao baixar arquivo', error)
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, 'documentos_selecionados.zip')
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Documentos de Habilitação</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Link href="/documentos/novo">
          <button style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Novo Documento
          </button>
        </Link>
        <button
          onClick={baixarSelecionados}
          disabled={selecionados.length === 0}
          style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: selecionados.length === 0 ? 'not-allowed' : 'pointer' }}
        >
          Baixar selecionados ({selecionados.length})
        </button>
      </div>

      {loading && page === 0 ? (
        <p>Carregando...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>
                  <input type="checkbox" checked={selecionados.length === documentos.length && documentos.length > 0} onChange={selecionarTodos} />
                </th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Documento</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Origem</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Emissão</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Validade</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Dias</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Arquivo</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {documentos.map((doc) => {
                const status = getStatus(doc.vencimento, doc.sem_validade)
                const dias = doc.vencimento ? calcularDiasRestantes(doc.vencimento) : null
                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #ddd', background: status.bg }}>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selecionados.includes(doc.id)}
                        onChange={() => toggleSelecionado(doc.id)}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>{doc.nome}</td>
                    <td style={{ padding: '10px' }}>{doc.tipo}</td>
                    <td style={{ padding: '10px' }}>
                      {doc.unidades?.codigo ? `${doc.unidades.codigo} - ${doc.unidades.razao_social}` : 'Geral'}
                    </td>
                    <td style={{ padding: '10px' }}>{formatarData(doc.data_emissao)}</td>
                    <td style={{ padding: '10px' }}>
                      {doc.sem_validade ? 'Não se aplica' : formatarData(doc.vencimento)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {dias !== null ? (dias < 0 ? 0 : dias) : '-'}
                    </td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: status.color }}>
                      {status.text}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {doc.arquivo_url ? (
                        <a href={doc.arquivo_url} target="_blank" rel="noopener noreferrer">
                          📄 Ver
                        </a>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <Link href={`/documentos/editar/${doc.id}`}>
                        <button style={{ marginRight: '5px' }}>Editar</button>
                      </Link>
                      <button onClick={() => excluirDocumento(doc.id)}>Excluir</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => carregarDocumentos()}
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