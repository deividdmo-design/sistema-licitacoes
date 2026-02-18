import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Anexo {
  id: string
  nome_arquivo: string
  url: string
  tipo: string
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
    try {
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

      // 2. Busca todos os anexos vinculados a esta licitação
      const { data: anx } = await supabase
        .from('licitacao_anexos')
        .select('*')
        .eq('licitacao_id', id)
        .order('created_at', { ascending: false })

      setAnexos(anx || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    
    setUploading(true)
    const files = Array.from(e.target.files)

    for (const file of files) {
      try {
        // Gera um nome único para o arquivo no storage para evitar conflitos
        const fileExt = file.name.split('.').pop()
        const fileName = `${id}/${Math.random().toString(36).substring(2)}.${fileExt}`

        // 1. Upload para o bucket 'editais'
        const { error: uploadError } = await supabase.storage
          .from('editais')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // 2. Pega a URL pública do arquivo
        const { data: { publicUrl } } = supabase.storage.from('editais').getPublicUrl(fileName)

        // 3. Insere na tabela licitacao_anexos usando as colunas do seu print (url e tipo)
        const { error: insertError } = await supabase
          .from('licitacao_anexos')
          .insert({
            licitacao_id: id,
            nome_arquivo: file.name,
            url: publicUrl,
            tipo: file.type || 'application/octet-stream'
          })

        if (insertError) throw insertError

      } catch (error: any) {
        console.error("Erro no upload:", error)
        alert(`Erro ao subir o arquivo ${file.name}: ${error.message}`)
      }
    }

    // Recarrega a lista de anexos após terminar todos os uploads
    await carregarDados()
    setUploading(false)
  }

  async function excluirAnexo(anexoId: string, fileUrl: string) {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return
    
    try {
      // Tenta extrair o caminho do arquivo no storage a partir da URL
      const path = fileUrl.split('/storage/v1/object/public/editais/')[1]
      
      if (path) {
        await supabase.storage.from('editais').remove([path])
      }
      
      await supabase.from('licitacao_anexos').delete().eq('id', anexoId)
      await carregarDados()
    } catch (error) {
      alert('Erro ao excluir anexo')
    }
  }

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Sincronizando com a Nordeste...</div>
  if (!licitacao) return <div style={{ padding: '50px', textAlign: 'center' }}>Licitação não encontrada.</div>

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>{licitacao.identificacao}</h1>
        <Link href="/licitacoes">
          <button style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>
            Voltar
          </button>
        </Link>
      </div>

      <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>Detalhes da Licitação</h3>
        <p><strong>Órgão:</strong> {licitacao.orgaos?.razao_social || 'Não informado'}</p>
        <p><strong>Objeto:</strong> {licitacao.objeto}</p>
        <p><strong>Modalidade:</strong> {licitacao.modalidade}</p>
        <p><strong>Status:</strong> {licitacao.status}</p>
      </div>

      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>📁 Documentos da Licitação</h3>
        
        {/* Área de Upload */}
        <div style={{ 
          marginBottom: '20px', 
          padding: '20px', 
          border: '2px dashed #cbd5e1', 
          borderRadius: '10px',
          textAlign: 'center',
          background: uploading ? '#f8fafc' : 'transparent'
        }}>
          <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', color: '#475569' }}>
            {uploading ? 'Aguarde, processando arquivos...' : '📎 Clique aqui para anexar vários arquivos (Edital, Planilhas, TR)'}
            <input 
              type="file" 
              multiple 
              onChange={handleFileUpload} 
              hidden 
              disabled={uploading} 
            />
          </label>
        </div>

        {/* Lista de Arquivos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {anexos.length === 0 && !uploading && (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>Nenhum documento anexado ainda.</p>
          )}
          
          {anexos.map((anexo) => (
            <div key={anexo.id} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 16px', 
              background: '#f1f5f9', 
              borderRadius: '8px',
              border: '1px solid #e2e8f0'
            }}>
              <a 
                href={anexo.url} 
                target="_blank" 
                rel="noreferrer" 
                style={{ textDecoration: 'none', color: '#2563eb', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                📄 {anexo.nome_arquivo}
              </a>
              <button 
                onClick={() => excluirAnexo(anexo.id, anexo.url)}
                style={{ color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Excluir
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}