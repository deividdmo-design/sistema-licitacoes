import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface LicitacaoFormProps {
  licitacaoId?: string
}

interface Orgao {
  id: string
  razao_social: string
}

const modalidades = [
  'Pregão Eletrônico',
  'Pregão Presencial',
  'Concorrência',
  'Tomada de Preços',
  'Convite',
  'Concurso',
  'Leilão',
  'Dispensa',
  'Inexigibilidade'
]

const tipos = [
  'Menor Preço',
  'Melhor Técnica',
  'Técnica e Preço',
  'Maior Desconto',
  'Maior Lance'
]

const statusOptions = [
  'Aguardando autorização da Diretoria',
  'Edital em Análise',
  'Em precificação',
  'Aguardando Cadastramento da Proposta',
  'Aguardando Sessão',
  'Em andamento',
  'Ganha',
  'Perdida',
  'Em execução',
  'Concluída'
]

export default function LicitacaoForm({ licitacaoId }: LicitacaoFormProps) {
  const router = useRouter()
  const [orgaos, setOrgaos] = useState<Orgao[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [valorNaoDivulgado, setValorNaoDivulgado] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const [formData, setFormData] = useState({
    identificacao: '',
    orgao_id: '',
    modalidade: '',
    tipo: '',
    objeto: '',
    valor_estimado: '',
    data_limite_participacao: '',
    data_resultado: '',
    status: '',
    motivo_status: '',
    possui_seguro: '',
    observacoes: '',
    arquivo_url: ''
  })

  useEffect(() => {
    carregarOrgaos()
    if (licitacaoId) {
      carregarLicitacao()
    }
  }, [licitacaoId])

  async function carregarOrgaos() {
    const { data } = await supabase
      .from('orgaos')
      .select('id, razao_social')
      .order('razao_social')
    setOrgaos(data || [])
  }

  async function carregarLicitacao() {
    setLoading(true)
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*')
      .eq('id', licitacaoId)
      .single()
    if (error) {
      alert('Erro ao carregar licitação')
    } else if (data) {
      setFormData({
        identificacao: data.identificacao || '',
        orgao_id: data.orgao_id || '',
        modalidade: data.modalidade || '',
        tipo: data.tipo || '',
        objeto: data.objeto || '',
        valor_estimado: data.valor_estimado ? data.valor_estimado.toString().replace('.', ',') : '',
        data_limite_participacao: data.data_limite_participacao || '',
        data_resultado: data.data_resultado || '',
        status: data.status || '',
        motivo_status: data.motivo_status || '',
        possui_seguro: data.possui_seguro || '',
        observacoes: data.observacoes || '',
        arquivo_url: data.arquivo_url || ''
      })
      if (data.valor_estimado === null) setValorNaoDivulgado(true)
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    if (!rawValue) {
      setFormData({ ...formData, valor_estimado: '' })
      return
    }
    const valorEmCentavos = parseInt(rawValue) / 100
    const valorFormatado = valorEmCentavos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setFormData({ ...formData, valor_estimado: valorFormatado })
  }

  async function uploadFile(file: File, id: string) {
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let valorNumerico = null
      if (!valorNaoDivulgado && formData.valor_estimado) {
        valorNumerico = parseFloat(formData.valor_estimado.replace(/\./g, '').replace(',', '.'))
      }

      const dadosParaSalvar = {
        identificacao: formData.identificacao,
        orgao_id: formData.orgao_id || null,
        modalidade: formData.modalidade || null,
        tipo: formData.tipo || null,
        objeto: formData.objeto || null,
        valor_estimado: valorNumerico,
        data_limite_participacao: formData.data_limite_participacao || null,
        data_resultado: formData.data_resultado || null,
        status: formData.status || null,
        motivo_status: formData.motivo_status || null,
        possui_seguro: formData.possui_seguro || null,
        observacoes: formData.observacoes || null,
        arquivo_url: formData.arquivo_url || null
      }

      if (licitacaoId) {
        // Atualizar
        const { error } = await supabase
          .from('licitacoes')
          .update(dadosParaSalvar)
          .eq('id', licitacaoId)
        if (error) throw error

        // Se tiver novo arquivo, fazer upload e atualizar
        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, licitacaoId)
          const { error: updateError } = await supabase
            .from('licitacoes')
            .update({ arquivo_url: publicUrl })
            .eq('id', licitacaoId)
          if (updateError) throw updateError
          setUploading(false)
        }
      } else {
        // Inserir
        const { data: inserted, error } = await supabase
          .from('licitacoes')
          .insert([dadosParaSalvar])
          .select('id')
          .single()
        if (error) throw error

        // Se tiver arquivo, fazer upload com o novo ID
        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, inserted.id)
          const { error: updateError } = await supabase
            .from('licitacoes')
            .update({ arquivo_url: publicUrl })
            .eq('id', inserted.id)
          if (updateError) throw updateError
          setUploading(false)
        }
      }

      router.push('/licitacoes')
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && licitacaoId) return <p>Carregando...</p>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1>{licitacaoId ? 'Editar Licitação' : 'Nova Licitação'}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Identificação *</label>
        <input
          type="text"
          name="identificacao"
          value={formData.identificacao}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Órgão Promotor</label>
        <select
          name="orgao_id"
          value={formData.orgao_id}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Selecione um órgão</option>
          {orgaos.map((org) => (
            <option key={org.id} value={org.id}>
              {org.razao_social}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Modalidade</label>
        <select
          name="modalidade"
          value={formData.modalidade}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Selecione</option>
          {modalidades.map(mod => (
            <option key={mod} value={mod}>{mod}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Tipo</label>
        <select
          name="tipo"
          value={formData.tipo}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Selecione</option>
          {tipos.map(tipo => (
            <option key={tipo} value={tipo}>{tipo}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Objeto</label>
        <textarea
          name="objeto"
          value={formData.objeto}
          onChange={handleChange}
          rows={3}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <input
            type="checkbox"
            checked={valorNaoDivulgado}
            onChange={(e) => setValorNaoDivulgado(e.target.checked)}
          />
          {' '}Valor não divulgado
        </label>
        <input
          type="text"
          name="valor_estimado"
          value={formData.valor_estimado}
          onChange={handleValorChange}
          placeholder="0,00"
          disabled={valorNaoDivulgado}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: valorNaoDivulgado ? '#f0f0f0' : 'white'
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Data Limite para Participar</label>
        <input
          type="date"
          name="data_limite_participacao"
          value={formData.data_limite_participacao}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Data do Resultado</label>
        <input
          type="date"
          name="data_resultado"
          value={formData.data_resultado}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Status</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Selecione</option>
          {statusOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Motivo do Status</label>
        <input
          type="text"
          name="motivo_status"
          value={formData.motivo_status}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Possui Seguro Garantia?</label>
        <input
          type="text"
          name="possui_seguro"
          value={formData.possui_seguro}
          onChange={handleChange}
          placeholder="Ex: Sim, Não, Garantia de execução..."
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Observações</label>
        <textarea
          name="observacoes"
          value={formData.observacoes}
          onChange={handleChange}
          rows={3}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Arquivo (Edital/Anexo)</label>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
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