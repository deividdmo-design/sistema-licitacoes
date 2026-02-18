import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface Licitacao {
  id: string
  identificacao: string
  orgao_id: string
  orgaos?: { razao_social: string }
  modalidade: string
  tipo: string
  objeto: string
  valor_estimado: number
  data_limite_participacao: string
  data_resultado: string
  status: string
  motivo_status: string
  possui_seguro: string
  observacoes: string
  arquivo_url: string | null
}

export default function DetalhesLicitacao() {
  const router = useRouter()
  const { id } = router.query
  const [licitacao, setLicitacao] = useState<Licitacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (id) {
      carregarLicitacao()
    }
  }, [id])

  async function carregarLicitacao() {
    setLoading(true)
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .eq('id', id)
      .single()
    if (error) {
      alert('Erro ao carregar licitação')
    } else {
      setLicitacao(data)
    }
    setLoading(false)
  }

  async function uploadFile(file: File, licitacaoId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${licitacaoId}.${fileExt}`
    const filePath = fileName

    const { error } = await supabase.storage
      .from('editais')
      .upload(filePath, file, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage.from('editais').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  async function handleUpload() {
    if (!file || !licitacao) return

    setUploading(true)
    try {
      const publicUrl = await uploadFile(file, licitacao.id)
      const { error } = await supabase
        .from('licitacoes')
        .update({ arquivo_url: publicUrl })
        .eq('id', licitacao.id)
      if (error) throw error
      setLicitacao({ ...licitacao, arquivo_url: publicUrl })
      alert('Arquivo enviado com sucesso!')
    } catch (error: any) {
      alert('Erro ao enviar arquivo: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  if (loading) return <p>Carregando...</p>
  if (!licitacao) return <p>Licitação não encontrada</p>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>{licitacao.identificacao}</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <Link href="/licitacoes">
          <button style={{ padding: '5px 10px' }}>Voltar</button>
        </Link>
        <Link href={`/licitacoes/editar/${licitacao.id}`}>
          <button style={{ marginLeft: '10px', padding: '5px 10px' }}>Editar</button>
        </Link>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td><strong>Órgão:</strong></td><td>{licitacao.orgaos?.razao_social}</td></tr>
          <tr><td><strong>Modalidade:</strong></td><td>{licitacao.modalidade}</td></tr>
          <tr><td><strong>Tipo:</strong></td><td>{licitacao.tipo}</td></tr>
          <tr><td><strong>Objeto:</strong></td><td>{licitacao.objeto}</td></tr>
          <tr><td><strong>Valor Estimado:</strong></td><td>
            {licitacao.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </td></tr>
          <tr><td><strong>Data Limite:</strong></td><td>{formatarData(licitacao.data_limite_participacao)}</td></tr>
          <tr><td><strong>Data Resultado:</strong></td><td>{formatarData(licitacao.data_resultado)}</td></tr>
          <tr><td><strong>Status:</strong></td><td>{licitacao.status}</td></tr>
          <tr><td><strong>Motivo:</strong></td><td>{licitacao.motivo_status}</td></tr>
          <tr><td><strong>Seguro Garantia:</strong></td><td>{licitacao.possui_seguro}</td></tr>
          <tr><td><strong>Observações:</strong></td><td>{licitacao.observacoes}</td></tr>
        </tbody>
      </table>

      <div style={{ marginTop: '30px' }}>
        <h3>Documentos e Anexos</h3>
        
        {licitacao.arquivo_url ? (
          <div>
            <p>Arquivo atual:</p>
            <a href={licitacao.arquivo_url} target="_blank" rel="noopener noreferrer">
              📄 Visualizar
            </a>
          </div>
        ) : (
          <p>Nenhum arquivo anexado.</p>
        )}

        <div style={{ marginTop: '20px' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            {uploading ? 'Enviando...' : 'Anexar arquivo'}
          </button>
        </div>
      </div>
    </div>
  )
}