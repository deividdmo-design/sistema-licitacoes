import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface CertidaoFormProps {
  certidaoId?: string
}

interface Unidade {
  id: string
  codigo: string
  razao_social: string
  cnpj: string
}

export default function CertidaoForm({ certidaoId }: CertidaoFormProps) {
  const router = useRouter()
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    nome_certidao: '',
    responsavel_nome: '',
    data_emissao: '',
    validade_dias: '',
    unidade_id: '',
    arquivo_url: ''
  })
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    carregarUnidades()
    if (certidaoId) {
      carregarCertidao()
    }
  }, [certidaoId])

  async function carregarUnidades() {
    const { data } = await supabase
      .from('unidades')
      .select('id, codigo, razao_social, cnpj')
      .order('codigo')
    setUnidades(data || [])
  }

  async function carregarCertidao() {
    setLoading(true)
    const { data, error } = await supabase
      .from('certidoes')
      .select('*')
      .eq('id', certidaoId)
      .single()
    if (error) {
      alert('Erro ao carregar certidão')
    } else if (data) {
      setFormData({
        nome_certidao: data.nome_certidao || '',
        responsavel_nome: data.responsavel_nome || '',
        data_emissao: data.data_emissao || '',
        validade_dias: data.validade_dias ? data.validade_dias.toString() : '',
        unidade_id: data.unidade_id || '',
        arquivo_url: data.arquivo_url || ''
      })
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  async function uploadFile(file: File, certidaoId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${certidaoId}.${fileExt}`
    const filePath = fileName

    const { error } = await supabase.storage
      .from('certidoes')
      .upload(filePath, file, { upsert: true })

    if (error) throw error

    const { data } = supabase.storage.from('certidoes').getPublicUrl(filePath)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let arquivo_url = formData.arquivo_url

      // Se for edição e tiver novo arquivo, faz upload com o ID existente
      if (certidaoId && file) {
        setUploading(true)
        arquivo_url = await uploadFile(file, certidaoId)
        setUploading(false)
      }

      const dadosParaSalvar = {
        nome_certidao: formData.nome_certidao,
        responsavel_nome: formData.responsavel_nome || null,
        data_emissao: formData.data_emissao || null,
        validade_dias: formData.validade_dias ? parseInt(formData.validade_dias) : null,
        unidade_id: formData.unidade_id || null,
        arquivo_url: arquivo_url || null
      }

      if (certidaoId) {
        // Atualização
        const { error } = await supabase
          .from('certidoes')
          .update(dadosParaSalvar)
          .eq('id', certidaoId)
        if (error) throw error
      } else {
        // Inserção
        const { data: inserted, error } = await supabase
          .from('certidoes')
          .insert([dadosParaSalvar])
          .select('id')
          .single()
        if (error) throw error

        // Se tiver arquivo, faz upload com o novo ID e atualiza
        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, inserted.id)
          const { error: updateError } = await supabase
            .from('certidoes')
            .update({ arquivo_url: publicUrl })
            .eq('id', inserted.id)
          if (updateError) throw updateError
          setUploading(false)
        }
      }

      router.push('/certidoes')
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && certidaoId) return <p>Carregando...</p>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>{certidaoId ? 'Editar Certidão' : 'Nova Certidão'}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Nome da Certidão *</label>
        <input
          type="text"
          name="nome_certidao"
          value={formData.nome_certidao}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Unidade (Matriz/Filial)</label>
        <select
          name="unidade_id"
          value={formData.unidade_id}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Geral (sem unidade específica)</option>
          {unidades.map((unidade) => (
            <option key={unidade.id} value={unidade.id}>
              {unidade.codigo} - {unidade.razao_social} ({unidade.cnpj})
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Responsável</label>
        <input
          type="text"
          name="responsavel_nome"
          value={formData.responsavel_nome}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Data de Emissão</label>
        <input
          type="date"
          name="data_emissao"
          value={formData.data_emissao}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Validade (dias)</label>
        <input
          type="number"
          name="validade_dias"
          value={formData.validade_dias}
          onChange={handleChange}
          min="1"
          style={{ width: '100%', padding: '8px' }}
        />
        <small>A data de vencimento será calculada automaticamente pelo sistema.</small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Arquivo (PDF)</label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ width: '100%', padding: '8px' }}
        />
        {formData.arquivo_url && (
          <div style={{ marginTop: '5px' }}>
            <a href={formData.arquivo_url} target="_blank" rel="noopener noreferrer">
              Ver arquivo atual
            </a>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || uploading}
        style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        {loading ? 'Salvando...' : uploading ? 'Enviando arquivo...' : 'Salvar'}
      </button>
    </form>
  )
}