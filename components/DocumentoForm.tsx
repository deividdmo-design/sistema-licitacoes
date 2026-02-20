import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface DocumentoFormProps {
  documentoId?: string
}

interface Unidade {
  id: string
  codigo: string
  razao_social: string
  cnpj: string
}

const tipos = ['Fiscal', 'Jurídico', 'Econômico', 'Técnico', 'Conselho', 'Atestado', 'Alvará', 'Outro']

export default function DocumentoForm({ documentoId }: DocumentoFormProps) {
  const router = useRouter()
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [semValidade, setSemValidade] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    tipo: '',
    unidade_id: '',
    data_emissao: '',
    vencimento: '', // Trocado de validade_dias para vencimento
    descricao: '',
    arquivo_url: ''
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    carregarUnidades()
    if (documentoId) carregarDocumento()
  }, [documentoId])

  async function carregarUnidades() {
    const { data } = await supabase.from('unidades').select('id, codigo, razao_social, cnpj').order('codigo')
    setUnidades(data || [])
  }

  async function carregarDocumento() {
    setLoading(true)
    const { data, error } = await supabase.from('documentos').select('*').eq('id', documentoId).single()
    if (error) {
      alert('Erro ao carregar documento')
    } else if (data) {
      setSemValidade(data.sem_validade || false)
      setFormData({
        nome: data.nome || '',
        tipo: data.tipo || '',
        unidade_id: data.unidade_id || '',
        data_emissao: data.data_emissao || '',
        vencimento: data.vencimento || '', // Carrega a data de vencimento
        descricao: data.descricao || '',
        arquivo_url: data.arquivo_url || ''
      })
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) setFile(e.target.files[0])
  }

  async function uploadFile(file: File, documentoId: string, urlAntiga?: string) {
    if (urlAntiga) {
      try {
        const caminhoAntigo = urlAntiga.split('/').pop()
        if (caminhoAntigo) await supabase.storage.from('documentos').remove([caminhoAntigo])
      } catch (err) {
        console.error("Erro ao limpar arquivo:", err)
      }
    }
    const fileExt = file.name.split('.').pop()
    const fileName = `${documentoId}_${Date.now()}.${fileExt}`
    const { error } = await supabase.storage.from('documentos').upload(fileName, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('documentos').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const dadosParaSalvar = {
        nome: formData.nome,
        tipo: formData.tipo,
        unidade_id: formData.unidade_id || null,
        data_emissao: semValidade ? null : formData.data_emissao || null,
        vencimento: semValidade ? null : formData.vencimento || null, // Salva a data direta
        sem_validade: semValidade,
        descricao: formData.descricao || null,
        arquivo_url: formData.arquivo_url || null
      }

      if (documentoId) {
        const { error } = await supabase.from('documentos').update(dadosParaSalvar).eq('id', documentoId)
        if (error) throw error
        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, documentoId, formData.arquivo_url)
          await supabase.from('documentos').update({ arquivo_url: publicUrl }).eq('id', documentoId)
          setUploading(false)
        }
      } else {
        const { data: inserted, error } = await supabase.from('documentos').insert([dadosParaSalvar]).select('id').single()
        if (error) throw error
        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, inserted.id)
          await supabase.from('documentos').update({ arquivo_url: publicUrl }).eq('id', inserted.id)
          setUploading(false)
        }
      }
      router.push('/documentos')
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && documentoId) return <p>Carregando...</p>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', border: '1px solid #eee', borderRadius: '10px', background: '#fff' }}>
      <h1>{documentoId ? 'Editar Documento' : 'Novo Documento'}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Nome do Documento *</label>
        <input type="text" name="nome" value={formData.nome} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Tipo *</label>
        <select name="tipo" value={formData.tipo} onChange={handleChange} required style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
          <option value="">Selecione</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Origem (Unidade)</label>
        <select name="unidade_id" value={formData.unidade_id} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}>
          <option value="">Geral</option>
          {unidades.map(u => <option key={u.id} value={u.id}>{u.codigo} - {u.razao_social}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input type="checkbox" checked={semValidade} onChange={(e) => setSemValidade(e.target.checked)} />
          Documento sem validade
        </label>
      </div>

      {!semValidade && (
        <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Data de Emissão</label>
            <input type="date" name="data_emissao" value={formData.data_emissao} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Data de Vencimento</label>
            <input type="date" name="vencimento" value={formData.vencimento} onChange={handleChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Descrição / Observações</label>
        <textarea name="descricao" value={formData.descricao} onChange={handleChange} rows={3} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#f9f9f9', borderRadius: '5px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Arquivo (PDF)</label>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ width: '100%' }} />
        {formData.arquivo_url && (
          <div style={{ marginTop: '10px' }}><a href={formData.arquivo_url} target="_blank" rel="noopener noreferrer">📄 Ver arquivo atual</a></div>
        )}
      </div>

      <button type="submit" disabled={loading || uploading} style={{ width: '100%', padding: '12px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: (loading || uploading) ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
        {loading ? 'Salvando...' : uploading ? 'Enviando arquivo...' : 'Salvar Documento'}
      </button>
    </form>
  )
}