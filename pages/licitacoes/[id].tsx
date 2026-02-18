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
    if (id) carregarLicitacao()
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
      router.push('/licitacoes')
    } else {
      setLicitacao(data)
    }
    setLoading(false)
  }

  async function uploadFile(file: File) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${id}.${fileExt}`
    const filePath = fileName

    const { error } = await supabase.storage
      .from('editais')
      .upload(filePath, file, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage.from('editais').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function handleUpload() {
    if (!file || !licitacao) return
    setUploading(true)
    try {
      const publicUrl = await uploadFile(file)
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
      setFile(null)
    }
  }

  if (loading) return <p>Carregando...</p>
  if (!licitacao) return <p>Licitação não encontrada</p>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1>{licitacao.identificacao}</h1>

      <div style={{ marginBottom: '20px' }}>
        <p><strong>Órgão:</strong> {licitacao.orgaos?.razao_social}</p>
        <p><strong>Modalidade:</strong> {licitacao.modalidade}</p>
        <p><strong>Tipo:</strong> {licitacao.tipo}</p>
        <p><strong>Objeto:</strong> {licitacao.objeto}</p>
        <p><strong>Valor estimado:</strong> {licitacao.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        <p><strong>Data limite:</strong> {new Date(licitacao.data_limite_participacao).toLocaleDateString('pt-BR')}</p>
        <p><strong>Data resultado:</strong> {licitacao.data_resultado ? new Date(licitacao.data_resultado).toLocaleDateString('pt-BR') : '-'}</p>
        <p><strong>Status:</strong> {licitacao.status}</p>
        <p><strong>Motivo:</strong> {licitacao.motivo_status}</p>
        <p><strong>Seguro garantia:</strong> {licitacao.possui_seguro}</p>
        <p><strong>Observações:</strong> {licitacao.observacoes}</p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Arquivo do Edital / Anexo</h2>
        {licitacao.arquivo_url ? (
          <div>
            <a href={licitacao.arquivo_url} target="_blank" rel="noopener noreferrer">
              📄 Ver arquivo atual
            </a>
          </div>
        ) : (
          <p>Nenhum arquivo anexado.</p>
        )}

        <div style={{ marginTop: '15px' }}>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{ marginLeft: '10px', padding: '5px 10px' }}
          >
            {uploading ? 'Enviando...' : 'Enviar novo arquivo'}
          </button>
        </div>
      </div>

      <div>
        <Link href="/licitacoes">
          <button>Voltar para lista</button>
        </Link>
        <Link href={`/licitacoes/editar/${licitacao.id}`}>
          <button style={{ marginLeft: '10px' }}>Editar dados</button>
        </Link>
      </div>
    </div>
  )
}