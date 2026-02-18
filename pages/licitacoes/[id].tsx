import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function DetalheLicitacao() {
  const router = useRouter()
  const { id } = router.query
  const [licitacao, setLicitacao] = useState<any>(null)
  const [anexos, setAnexos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newFiles, setNewFiles] = useState<FileList | null>(null)
  const [tipoArquivo, setTipoArquivo] = useState('edital')

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)
    // Dados da licitação com órgão
    const { data: lic } = await supabase
      .from('licitacoes')
      .select(`
        *,
        orgaos ( razao_social )
      `)
      .eq('id', id)
      .single()
    setLicitacao(lic)

    // Anexos
    const { data: anexosData } = await supabase
      .from('licitacao_anexos')
      .select('*')
      .eq('licitacao_id', id)
      .order('data_upload', { ascending: false })
    setAnexos(anexosData || [])
    setLoading(false)
  }

  async function handleUpload() {
    if (!newFiles || newFiles.length === 0) return
    setUploading(true)
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${id}_${Date.now()}_${i}.${fileExt}`
      const filePath = fileName

      // Upload para o bucket 'licitacoes'
      const { error: uploadError } = await supabase.storage
        .from('licitacoes')
        .upload(filePath, file)
      if (uploadError) {
        alert(`Erro no upload: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from('licitacoes').getPublicUrl(filePath)
      const publicUrl = urlData.publicUrl

      // Salvar no banco
      await supabase.from('licitacao_anexos').insert({
        licitacao_id: id,
        nome_arquivo: file.name,
        url: publicUrl,
        tipo: tipoArquivo
      })
    }
    setNewFiles(null)
    setUploading(false)
    carregarDados() // recarrega anexos
  }

  async function excluirAnexo(anexoId: string, url: string) {
    if (!confirm('Remover este anexo?')) return
    // Extrair path do URL
    const path = url.split('/').pop()
    await supabase.storage.from('licitacoes').remove([path])
    await supabase.from('licitacao_anexos').delete().eq('id', anexoId)
    carregarDados()
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  if (loading) return <p>Carregando...</p>
  if (!licitacao) return <p>Licitação não encontrada</p>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <h1>{licitacao.identificacao}</h1>
      <div style={{ marginBottom: '20px' }}>
        <Link href={`/licitacoes/editar/${id}`}>
          <button style={{ marginRight: '10px' }}>Editar dados</button>
        </Link>
        <Link href="/licitacoes">
          <button>Voltar</button>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <h3>Informações</h3>
          <p><strong>Órgão:</strong> {licitacao.orgaos?.razao_social}</p>
          <p><strong>Modalidade:</strong> {licitacao.modalidade}</p>
          <p><strong>Tipo:</strong> {licitacao.tipo}</p>
          <p><strong>Objeto:</strong> {licitacao.objeto}</p>
          <p><strong>Valor estimado:</strong> {licitacao.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
        <div>
          <h3>Datas e Status</h3>
          <p><strong>Data limite:</strong> {formatarData(licitacao.data_limite_participacao)}</p>
          <p><strong>Data resultado:</strong> {formatarData(licitacao.data_resultado)}</p>
          <p><strong>Status:</strong> {licitacao.status}</p>
          <p><strong>Motivo:</strong> {licitacao.motivo_status}</p>
        </div>
      </div>

      <h3 style={{ marginTop: '30px' }}>Anexos</h3>

      {/* Lista de anexos existentes */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr><th>Nome</th><th>Tipo</th><th>Data Upload</th><th>Ações</th></tr>
        </thead>
        <tbody>
          {anexos.map(a => (
            <tr key={a.id}>
              <td><a href={a.url} target="_blank">{a.nome_arquivo}</a></td>
              <td>{a.tipo}</td>
              <td>{new Date(a.data_upload).toLocaleDateString()}</td>
              <td>
                <button onClick={() => excluirAnexo(a.id, a.url)}>Excluir</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Upload de novos anexos */}
      <div style={{ marginTop: '20px', padding: '20px', background: '#f9f9f9', borderRadius: '8px' }}>
        <h4>Adicionar novos anexos</h4>
        <div style={{ marginBottom: '10px' }}>
          <label>Tipo: </label>
          <select value={tipoArquivo} onChange={(e) => setTipoArquivo(e.target.value)}>
            <option value="edital">Edital</option>
            <option value="planilha">Planilha</option>
            <option value="anexo">Anexo geral</option>
          </select>
        </div>
        <input
          type="file"
          multiple
          onChange={(e) => setNewFiles(e.target.files)}
        />
        <button onClick={handleUpload} disabled={uploading || !newFiles} style={{ marginTop: '10px' }}>
          {uploading ? 'Enviando...' : 'Upload'}
        </button>
      </div>
    </div>
  )
}