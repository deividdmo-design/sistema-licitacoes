import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Anexo {
  id: string
  nome_arquivo: string
  arquivo_url: string
  tipo_documento: string
  data_upload: string
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
    if (typeof id === 'string') {
      carregarDados(id)
    }
  }, [id])

  async function carregarDados(licitacaoId: string) {
    setLoading(true)
    try {
      // Busca da licitação
      const { data: lic, error: licError } = await supabase
        .from('licitacoes')
        .select('*, orgaos(razao_social)')
        .eq('id', licitacaoId)
        .single()

      if (licError) {
        console.error('Erro ao buscar licitação:', licError)
      }

      if (lic) {
        setLicitacao({
          ...lic,
          orgaos: Array.isArray(lic.orgaos) ? lic.orgaos[0] : lic.orgaos
        })
      }

      // ⚠️ CORREÇÃO CRÍTICA: usar licitacaoId (não o id do router diretamente)
      const { data: anx, error: anxError } = await supabase
        .from('licitacao_anexos')
        .select('*')
        .eq('licitacao_id', licitacaoId)
        .order('data_upload', { ascending: false })

      if (anxError) {
        console.error('Erro ao buscar anexos:', anxError)
      }

      setAnexos(anx || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return
    if (typeof id !== 'string') return

    setUploading(true)
    const files = Array.from(e.target.files)

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${id}/${Math.random().toString(36).substring(2)}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('editais')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase
          .storage
          .from('editais')
          .getPublicUrl(fileName)

        const { error: insertError } = await supabase
          .from('licitacao_anexos')
          .insert({
            licitacao_id: id,
            nome_arquivo: file.name,
            arquivo_url: publicUrl,
            tipo_documento: file.type || 'application/pdf'
          })

        if (insertError) throw insertError

      } catch (error: any) {
        console.error("Erro no upload:", error)
        alert(`Erro ao subir o arquivo ${file.name}: ${error.message}`)
      }
    }

    // ✅ CORRIGIDO (era a causa do erro na Vercel)
    if (typeof id === 'string') {
      await carregarDados(id)
    }

    setUploading(false)
  }

  async function excluirAnexo(anexoId: string, fileUrl: string) {
    if (!confirm('Tem certeza que deseja excluir este anexo?')) return
    if (typeof id !== 'string') return

    try {
      // Remove do Storage
      if (fileUrl) {
        const path = fileUrl.split('/storage/v1/object/public/editais/')[1]
        if (path) {
          await supabase.storage.from('editais').remove([path])
        }
      }

      // Remove do banco
      const { error } = await supabase
        .from('licitacao_anexos')
        .delete()
        .eq('id', anexoId)

      if (error) throw error

      // ✅ CORREÇÃO PRINCIPAL DO BUILD ERROR
      await carregarDados(id)

    } catch (error: any) {
      console.error("Erro ao excluir:", error)
      alert('Erro ao excluir anexo: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        Sincronizando com a Nordeste...
      </div>
    )
  }

  if (!licitacao) {
    return (
      <div style={{ padding: '50px', textAlign: 'center' }}>
        Licitação não encontrada.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#0f172a', margin: 0 }}>
          {licitacao.identificacao}
        </h1>

        <Link href="/licitacoes">
          <button style={{
            padding: '8px 16px',
            background: '#f1f5f9',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            cursor: 'pointer'
          }}>
            Voltar
          </button>
        </Link>
      </div>

      <div style={{
        background: '#f8fafc',
        padding: '25px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>
          Detalhes da Licitação
        </h3>

        <p><strong>Órgão:</strong> {licitacao.orgaos?.razao_social || 'Não informado'}</p>
        <p><strong>Objeto:</strong> {licitacao.objeto}</p>
        <p><strong>Status:</strong> {licitacao.status}</p>
      </div>

      <div style={{
        background: 'white',
        padding: '25px',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ marginTop: 0, color: '#334155' }}>
          📁 Documentos (Editais, Planilhas, TR)
        </h3>

        <div style={{
          marginBottom: '20px',
          padding: '20px',
          border: '2px dashed #cbd5e1',
          borderRadius: '10px',
          textAlign: 'center',
          background: uploading ? '#f8fafc' : 'transparent'
        }}>
          <label style={{ cursor: uploading ? 'not-allowed' : 'pointer', color: '#475569' }}>
            {uploading ? 'Processando arquivos...' : '📎 Clique aqui para anexar múltiplos arquivos'}
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              hidden
              disabled={uploading}
            />
          </label>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {anexos.length === 0 && !uploading && (
            <p style={{ color: '#94a3b8', textAlign: 'center' }}>
              Nenhum documento anexado ainda.
            </p>
          )}

          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: '#f1f5f9',
                borderRadius: '8px',
                border: '1px solid #e2e8f0'
              }}
            >
              <a
                href={anexo.arquivo_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: 'none',
                  color: '#2563eb',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                📄 {anexo.nome_arquivo}
              </a>

              <button
                onClick={() => excluirAnexo(anexo.id, anexo.arquivo_url)}
                style={{
                  color: '#991b1b',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
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
