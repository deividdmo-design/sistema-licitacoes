import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface RecebimentoFormProps {
  recebimentoId?: string
}

// Interface para os dados do contrato que serão exibidos no select
interface Contrato {
  id: string
  numero_contrato: string
  // Opcional: incluir dados da licitação para exibir junto? Mas por enquanto só número do contrato
}

export default function RecebimentoForm({ recebimentoId }: RecebimentoFormProps) {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    contrato_id: '',
    data_pagamento: '',
    valor_recebido: '',
    nota_fiscal: ''
  })

  useEffect(() => {
    carregarContratos()
    if (recebimentoId) {
      carregarRecebimento()
    }
  }, [recebimentoId])

  // Carrega a lista de contratos para o select
  async function carregarContratos() {
    const { data } = await supabase
      .from('contratos')
      .select('id, numero_contrato')
      .order('numero_contrato')
    setContratos(data || [])
  }

  // Carrega os dados do recebimento para edição
  async function carregarRecebimento() {
    setLoading(true)
    const { data, error } = await supabase
      .from('recebimentos')
      .select('*')
      .eq('id', recebimentoId)
      .single()
    if (error) {
      alert('Erro ao carregar recebimento')
    } else if (data) {
      setFormData({
        contrato_id: data.contrato_id || '',
        data_pagamento: data.data_pagamento || '',
        valor_recebido: data.valor_rebido ? data.valor_recebido.toString().replace('.', ',') : '',
        nota_fiscal: data.nota_fiscal || ''
      })
    }
    setLoading(false)
  }

  // Atualiza o estado para inputs comuns
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  // Máscara para valor monetário (formato brasileiro)
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    if (!rawValue) {
      setFormData({ ...formData, valor_recebido: '' })
      return
    }
    const valorEmCentavos = parseInt(rawValue) / 100
    const valorFormatado = valorEmCentavos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    setFormData({ ...formData, valor_recebido: valorFormatado })
  }

  // Envia os dados para o Supabase
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const valorNumerico = formData.valor_recebido
      ? parseFloat(formData.valor_recebido.replace(/\./g, '').replace(',', '.'))
      : 0

    const dadosParaSalvar = {
      contrato_id: formData.contrato_id || null,
      data_pagamento: formData.data_pagamento || null,
      valor_recebido: valorNumerico,
      nota_fiscal: formData.nota_fiscal || null
    }

    let error
    if (recebimentoId) {
      const { error: err } = await supabase
        .from('recebimentos')
        .update(dadosParaSalvar)
        .eq('id', recebimentoId)
      error = err
    } else {
      const { error: err } = await supabase
        .from('recebimentos')
        .insert([dadosParaSalvar])
      error = err
    }

    setLoading(false)
    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      router.push('/recebimentos')
    }
  }

  if (loading && recebimentoId) return <p>Carregando...</p>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>{recebimentoId ? 'Editar Recebimento' : 'Novo Recebimento'}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Contrato *</label>
        <select
          name="contrato_id"
          value={formData.contrato_id}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="">Selecione o contrato</option>
          {contratos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.numero_contrato}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Data do Pagamento *</label>
        <input
          type="date"
          name="data_pagamento"
          value={formData.data_pagamento}
          onChange={handleChange}
          required
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Valor Recebido (R$) *</label>
        <input
          type="text"
          value={formData.valor_recebido}
          onChange={handleValorChange}
          placeholder="0,00"
          required
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Nota Fiscal</label>
        <input
          type="text"
          name="nota_fiscal"
          value={formData.nota_fiscal}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <button type="submit" disabled={loading} style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}