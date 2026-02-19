import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'

interface Certidao {
  id: string
  nome_certidao: string
  descricao: string | null
  tipo_id: string
  tipos_documento?: { nome: string }
  unidade_id: string
  unidades?: { codigo: string; razao_social: string; cnpj: string }
  data_emissao: string
  validade_dias: number | null
  sem_validade: boolean
  vencimento: string | null
  arquivo_url: string | null
  responsavel_nome: string | null
}

interface Unidade {
  id: string
  codigo: string
  razao_social: string
  cnpj: string
}

const PAGE_SIZE = 20

export default function ListaCertidoes() {
  const [certidoes, setCertidoes] = useState<Certidao[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [filtroUnidade, setFiltroUnidade] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [baixando, setBaixando] = useState(false)

  // Carregar lista de unidades para o filtro (incluindo CNPJ)
  useEffect(() => {
    supabase.from('unidades').select('id, codigo, razao_social, cnpj').order('codigo').then(({ data }) => {
      setUnidades(data || [])
    })
  }, [])

  const carregarCertidoes = async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    setLoading(reset)
    setLoadingMore(!reset)

    let query = supabase
      .from('certidoes')
      .select('*, unidades(codigo, razao_social, cnpj), tipos_documento(nome)')
      .order('vencimento', { ascending: true, nullsFirst: false })

    if (filtroUnidade) {
      query = query.eq('unidade_id', filtroUnidade)
    }

    const { data, error } = await query.range(from, to)

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
  }, [filtroUnidade])

  async function excluirCertidao(id: string) {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    const { error } = await supabase.from('certidoes').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarCertidoes(true)
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

  function getStatusClass(dias: number | null, semValidade: boolean) {
    if (semValidade) return { color: 'gray', text: 'Sem validade', bg: '#f0f0f0' }
    if (dias === null) return { color: 'gray', text: 'Indeterminado', bg: '#f0f0f0' }
    if (dias < 0) return { color: 'red', text: 'Vencido', bg: '#ffeeee' }
    if (dias <= 15) return { color: 'orange', text: `Vence em ${dias} dias`, bg: '#fff3cd' }
    return { color: 'green', text: 'Vigente', bg: '#d4edda' }
  }

  const toggleSelecionar = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedIds(newSet)
  }

  const selecionarTodos = () => {
    if (selectedIds.size === certidoes.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(certidoes.map(c => c.id)))
    }
  }

  const baixarSelecionados = async () => {
    if (selectedIds.size === 0) {
      alert('Selecione pelo menos um documento.')
      return
    }

    setBaixando(true)
    const zip = new JSZip()
    const documentos = certidoes.filter(c => selectedIds.has(c.id) && c.arquivo_url)

    for (const doc of documentos) {
      if (doc.arquivo_url) {
        try {
          const response = await fetch(doc.arquivo_url)
          const blob = await response.blob()
          const nomeArquivo = doc.arquivo_url.split('/').pop() || `${doc.nome_certidao}.pdf`
          zip.file(nomeArquivo, blob)
        } catch (err) {
          console.error('Erro ao baixar', doc.arquivo_url, err)
        }
      }
    }

    const content = await zip.generateAsync({ type: 'blob' })
    saveAs(content, 'documentos_selecionados.zip')
    setBaixando(false)
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Documentos de Habilitação</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <Link href="/certidoes/novo">
          <button style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Novo Documento
          </button>
        </Link>
        <button
          onClick={baixarSelecionados}
          disabled={baixando || selectedIds.size === 0}
          style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
        >
          {baixando ? 'Compactando...' : `Baixar Selecionados (${selectedIds.size})`}
        </button>

        {/* Filtro por Unidade com CNPJ */}
        <select
          value={filtroUnidade}
          onChange={(e) => setFiltroUnidade(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', border: '1px solid #ccc' }}
        >
          <option value="">Todas as Unidades</option>
          {unidades.map(u => (
            <option key={u.id} value={u.id}>
              {u.codigo} - {u.razao_social} ({u.cnpj})
            </option>
          ))}
        </select>
      </div>

      {loading && page === 0 ? (
        <p>Carregando...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>
                  <input type="checkbox" onChange={selecionarTodos} checked={selectedIds.size === certidoes.length && certidoes.length > 0} />
                </th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Documento</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Tipo</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Origem (CNPJ)</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Responsável</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Emissão</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Validade</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Dias</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Arquivo</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {certidoes.map((cert) => {
                const dias = cert.sem_validade ? null : calcularDiasRestantes(cert.vencimento)
                const status = getStatusClass(dias, cert.sem_validade)
                return (
                  <tr key={cert.id} style={{ borderBottom: '1px solid #ddd', background: status.bg }}>
                    <td style={{ padding: '10px' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(cert.id)}
                        onChange={() => toggleSelecionar(cert.id)}
                      />
                    </td>
                    <td style={{ padding: '10px' }}>
                      <strong>{cert.nome_certidao}</strong>
                      {cert.descricao && <div style={{ fontSize: '0.9em', color: '#666' }}>{cert.descricao}</div>}
                    </td>
                    <td style={{ padding: '10px' }}>{cert.tipos_documento?.nome}</td>
                    <td style={{ padding: '10px' }}>
                      {cert.unidades?.codigo ? `${cert.unidades.codigo} - ${cert.unidades.razao_social} (${cert.unidades.cnpj})` : 'Geral'}
                    </td>
                    <td style={{ padding: '10px' }}>{cert.responsavel_nome}</td>
                    <td style={{ padding: '10px' }}>{formatarData(cert.data_emissao)}</td>
                    <td style={{ padding: '10px' }}>
                      {cert.sem_validade ? 'Sem validade' : formatarData(cert.vencimento)}
                    </td>
                    <td style={{ padding: '10px' }}>{dias !== null ? dias : '-'}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: status.color }}>{status.text}</td>
                    <td style={{ padding: '10px' }}>
                      {cert.arquivo_url ? (
                        <a href={cert.arquivo_url} target="_blank" rel="noopener noreferrer">📄 Ver</a>
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