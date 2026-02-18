import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface ContratoFormProps {
  contratoId?: string
}

// Interface corrigida para o Deploy
interface Licitacao {
  id: string
  identificacao: string
  orgaos?: { razao_social: string } | { razao_social: string }[]
}

export default function ContratoForm({ contratoId }: ContratoFormProps) {
  const router = useRouter()
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [orgaoSelecionado, setOrgaoSelecionado] = useState('')
  const [formData, setFormData] = useState({
    licitacao_id: '',
    numero_contrato: '',
    numero_processo: '',
    responsavel: '',
    objeto: '',
    valor_total: '',
    valor_aditivo: '',
    data_assinatura: '',
    vigencia_inicio: '',
    vigencia_fim: '',
    observacoes: '',
    arquivo_url: ''
  })

  useEffect(() => {
    carregarLicitacoes()
    if (contratoId) carregarContrato()
  }, [contratoId])

  async function carregarLicitacoes() {
    const { data } = await supabase
      .from('licitacoes')
      .select('id, identificacao, orgaos(razao_social)')
      .order('identificacao')
    
    // Garantindo que orgaos seja tratado como objeto único para o TS
    const dataFormatada = data?.map((item: any) => ({
      ...item,
      orgaos: Array.isArray(item.orgaos) ? item.orgaos[0] : item.orgaos
    }))

    setLicitacoes(dataFormatada || [])
  }

  async function carregarContrato() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', contratoId)
      .single()
    if (error) alert('Erro ao carregar contrato')
    else if (data) {
      setFormData({
        licitacao_id: data.licitacao_id || '',
        numero_contrato: data.numero_contrato || '',
        numero_processo: data.numero_processo || '',
        responsavel: data.responsavel || '',
        objeto: data.objeto || '',
        valor_total: data.valor_total ? data.valor_total.toString().replace('.', ',') : '',
        valor_aditivo: data.valor_aditivo ? data.valor_aditivo.toString().replace('.', ',') : '',
        data_assinatura: data.data_assinatura || '',
        vigencia_inicio: data.vigencia_inicio || '',
        vigencia_fim: data.vigencia_fim || '',
        observacoes: data.observacoes || '',
        arquivo_url: data.arquivo_url || ''
      })
      if (data.licitacao_id) {
        const { data: lic } = await supabase
          .from('licitacoes')
          .select('orgaos(razao_social)')
          .eq('id', data.licitacao_id)
          .single()
        
        const orgaoData: any = lic?.orgaos
        const nomeOrgao = Array.isArray(orgaoData) ? orgaoData[0]?.razao_social : orgaoData?.razao_social
        setOrgaoSelecionado(nomeOrgao || '')
      }
    }
    setLoading(false)
  }

  const handleLicitacaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const licId = e.target.value
    setFormData({ ...formData, licitacao_id: licId })
    const lic = licitacoes.find(l => l.id === licId)
    
    const orgaoData: any = lic?.orgaos
    const nomeOrgao = Array.isArray(orgaoData) ? orgaoData[0]?.razao_social : orgaoData?.razao_social
    setOrgaoSelecionado(nomeOrgao || '')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    if (!rawValue) {
      setFormData({ ...formData, [e.target.name]: '' })
      return
    }
    const valorEmCentavos = parseInt(rawValue) / 100
    const valorFormatado = valorEmCentavos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setFormData({ ...formData, [e.target.name]: valorFormatado })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0])
  }

  async function uploadFile(file: File, contratoId: string) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${contratoId}.${fileExt}`
    const { error } = await supabase.storage
      .from('contratos')
      .upload(fileName, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('contratos').getPublicUrl(fileName)
    return data.publicUrl
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const valorTotalNum = formData.valor_total ? parseFloat(formData.valor_total.replace(/\./g, '').replace(',', '.')) : 0
      const valorAditivoNum = formData.valor_aditivo ? parseFloat(formData.valor_aditivo.replace(/\./g, '').replace(',', '.')) : 0

      const dadosParaSalvar = {
        licitacao_id: formData.licitacao_id || null,
        numero_contrato: formData.numero_contrato,
        numero_processo: formData.numero_processo || null,
        responsavel: formData.responsavel || null,
        objeto: formData.objeto || null,
        valor_total: valorTotalNum,
        valor_aditivo: valorAditivoNum,
        data_assinatura: formData.data_assinatura || null,
        vigencia_inicio: formData.vigencia_inicio || null,
        vigencia_fim: formData.vigencia_fim || null,
        observacoes: formData.observacoes || null,
        arquivo_url: formData.arquivo_url || null
      }

      if (contratoId) {
        const { error } = await supabase
          .from('contratos')
          .update(dadosParaSalvar)
          .eq('id', contratoId)
        if (error) throw error

        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, contratoId)
          await supabase.from('contratos').update({ arquivo_url: publicUrl }).eq('id', contratoId)
          setUploading(false)
        }
      } else {
        const { data: inserted, error } = await supabase
          .from('contratos')
          .insert([dadosParaSalvar])
          .select('id')
          .single()
        if (error) throw error

        if (file) {
          setUploading(true)
          const publicUrl = await uploadFile(file, inserted.id)
          await supabase.from('contratos').update({ arquivo_url: publicUrl }).eq('id', inserted.id)
          setUploading(false)
        }
      }
      router.push('/contratos')
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <h1>{contratoId ? 'Editar Contrato' : 'Novo Contrato'}</h1>
      <div style={{ marginBottom: '15px' }}>
        <label>Nº Contrato *</label>
        <input name="numero_contrato" value={formData.numero_contrato} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Licitação Relacionada</label>
        <select name="licitacao_id" value={formData.licitacao_id} onChange={handleLicitacaoChange} style={{ width: '100%', padding: '8px' }}>
          <option value="">Selecione</option>
          {licitacoes.map(l => (
            <option key={l.id} value={l.id}>
              {l.identificacao} {l.orgaos ? `(${(l.orgaos as any).razao_social})` : ''}
            </option>
          ))}
        </select>
        {orgaoSelecionado && <small style={{ display: 'block', marginTop: '5px', color: '#666' }}>Órgão: {orgaoSelecionado}</small>}
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Nº Processo</label>
        <input name="numero_processo" value={formData.numero_processo} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Responsável</label>
        <input name="responsavel" value={formData.responsavel} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Objeto</label>
        <textarea name="objeto" value={formData.objeto} onChange={handleChange} rows={3} style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Valor Total (R$) *</label>
        <input name="valor_total" value={formData.valor_total} onChange={handleValorChange} placeholder="0,00" required style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Aditivos (R$)</label>
        <input name="valor_aditivo" value={formData.valor_aditivo} onChange={handleValorChange} placeholder="0,00" style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Data Assinatura</label>
        <input type="date" name="data_assinatura" value={formData.data_assinatura} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <div style={{ flex: 1 }}>
          <label>Vigência Início</label>
          <input type="date" name="vigencia_inicio" value={formData.vigencia_inicio} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label>Vigência Fim</label>
          <input type="date" name="vigencia_fim" value={formData.vigencia_fim} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
        </div>
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Observações</label>
        <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={2} style={{ width: '100%', padding: '8px' }} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>Arquivo (PDF)</label>
        <input type="file" accept=".pdf" onChange={handleFileChange} style={{ width: '100%', padding: '8px' }} />
        {formData.arquivo_url && (
          <div style={{ marginTop: '5px' }}><a href={formData.arquivo_url} target="_blank" rel="noreferrer">Ver arquivo atual</a></div>
        )}
      </div>
      <button type="submit" disabled={loading || uploading} style={{ padding: '12px 24px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
        {loading ? 'Salvando...' : uploading ? 'Enviando arquivo...' : 'Salvar'}
      </button>
    </form>
  )
}