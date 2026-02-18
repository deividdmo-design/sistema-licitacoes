import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Anexo {
  id: string
  nome_arquivo: string
  arquivo_url: string
  created_at: string
}

interface Licitacao {
  id: string
  identificacao: string
  objeto: string
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  orgaos?: { razao_social: string }
}

export default function DetalheLicitacao() {
  const router = useRouter()
  const { id } = router.query
  const [licitacao, setLicitacao] = useState<Licitacao | null>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)
    // 1. Busca detalhes da licitação
    const { data: lic } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .eq('id', id)
      .single()

    if (lic) {
      setLicitacao({
        ...lic,
        orgaos: Array.isArray(lic.orgaos) ? lic.orgaos[0] : lic.orgaos
      })
    }

    // 2. Busca todos os anexos da nova tabela
    const { data: anx } = await supabase
      .from('licitacao_anexos')
      .select('*')
      .eq('licitacao_id', id)
      .order('created_at', { ascending: false })

    setAnexos(anx || [])
    setLoading(false)
  }

  // FUNÇÃO PARA SUBIR MÚLTIPLOS ARQUIVOS
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const files = Array.from(e.target.files)

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${id}/${Math.random()}.${fileExt}` // Organiza por pasta da licitação

        // 1. Sobe para o Storage (Bucket: editais)
        const { error: uploadError } = await supabase.storage
          .from('editais')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('editais').getPublicUrl(fileName)

        // 2. Registra na tabela licitacao_anexos
        await supabase.from('licitacao_anexos').insert({
          licitacao_id: id,
          nome_arquivo: file.name,
          arquivo_url: publicUrl
        })

      } catch (error: any) {
        alert(`Erro ao subir ${file.name}: ` + error.message)
      }
    }

    setUploading(false)
    carregarDados() // Atualiza a lista na tela
  }

  async function excluirAnexo(anexoId: string, url: string) {
    if (!confirm('Excluir este arquivo?')) return
    const path = url.split('/').slice(-2).join('/') // Extrai o caminho correto do storage
    
    await supabase.storage.from('editais').remove([path])
    await supabase.from('licitacao_anexos').delete().eq('id', anexoId)
    carregarDados()
  }

  if (loading) return <div style={{ padding: '50px' }}>Carregando...</div>
  if (!licitacao) return <div style={{ padding: '50px' }}>Licitação não encontrada.</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h1>{licitacao.identificacao}</h1>
        <Link href="/licitacoes"><button>Voltar</button></Link>
      </div>

      <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
        <p><strong>Órgão:</strong> {licitacao.orgaos?.razao_social}</p>
        <p><strong>Objeto:</strong> {licitacao.objeto}</p>
      </div>

      {/* SEÇÃO DE ARQUIVOS MÚLTIPLOS */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3>📁 Documentos (Edital, Planilhas, etc)</h3>
        
        <div style={{ marginBottom: '20px', padding: '15px', border: '2px dashed #cbd5e1', borderRadius: '8px' }}>
          <label style={{ cursor: 'pointer', display: 'block', textAlign: 'center' }}>
            {uploading ? 'Enviando arquivos...' : '📎 Clique aqui para selecionar vários arquivos'}
            <input type="file" multiple onChange={handleFileUpload} hidden disabled={uploading} />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {anexos.length === 0 && <p style={{ color: '#94a3b8' }}>Nenhum arquivo anexado.</p>}
          {anexos.map(anexo => (
            <div key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#f1f5f9', borderRadius: '8px' }}>
              <a href={anexo.arquivo_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '500' }}>
                📄 {anexo.nome_arquivo}
              </a>
              <button onClick={() => excluirAnexo(anexo.id, anexo.arquivo_url)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Excluir</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}