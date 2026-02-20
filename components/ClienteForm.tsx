import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface ClienteFormProps {
  clienteId?: string
}

export default function ClienteForm({ clienteId }: ClienteFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    telefone: '',
    gestor_contrato: '',
    email: ''
  })

  useEffect(() => {
    if (clienteId) {
      carregarCliente()
    }
  }, [clienteId])

  async function carregarCliente() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orgaos')
      .select('*')
      .eq('id', clienteId)
      .single()
    if (error) {
      alert('Erro ao carregar órgão')
    } else if (data) {
      setFormData({
        razao_social: data.razao_social || '',
        cnpj: data.cnpj || '',
        telefone: data.telefone || '',
        gestor_contrato: data.gestor_contrato || '',
        email: data.email || ''
      })
    }
    setLoading(false)
  }

  const handleRazaoSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, razao_social: e.target.value.toUpperCase() })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  // Funções para aplicar máscaras
  const formatarCNPJ = (valor: string) => {
    const nums = valor.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    if (nums.length <= 5) return nums.replace(/^(\d{2})(\d{0,3})/, '$1.$2')
    if (nums.length <= 8) return nums.replace(/^(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3')
    if (nums.length <= 12) return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4')
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5')
  }

  const formatarTelefone = (valor: string) => {
    const nums = valor.replace(/\D/g, '')
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return nums.replace(/^(\d{2})(\d{0,5})/, '($1) $2')
    return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }

  const handleCNPJChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarCNPJ(e.target.value)
    setFormData({ ...formData, cnpj: valorFormatado })
  }

  const handleTelefoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorFormatado = formatarTelefone(e.target.value)
    setFormData({ ...formData, telefone: valorFormatado })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const cnpjLimpo = formData.cnpj.replace(/\D/g, '')
    const telefoneLimpo = formData.telefone.replace(/\D/g, '')

    const dadosParaSalvar = {
      razao_social: formData.razao_social,
      cnpj: cnpjLimpo || null,
      telefone: telefoneLimpo || null,
      gestor_contrato: formData.gestor_contrato || null,
      email: formData.email || null
    }

    let error
    if (clienteId) {
      const { error: err } = await supabase
        .from('orgaos')
        .update(dadosParaSalvar)
        .eq('id', clienteId)
      error = err
    } else {
      const { error: err } = await supabase
        .from('orgaos')
        .insert([dadosParaSalvar])
      error = err
    }

    setLoading(false)
    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      router.push('/clientes')
    }
  }

  if (loading && clienteId) return <p>Carregando...</p>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>{clienteId ? 'Editar Órgão' : 'Novo Órgão'}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Razão Social *</label>
        <input
          type="text"
          value={formData.razao_social}
          onChange={handleRazaoSocialChange}
          required
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>CNPJ</label>
        <input
          type="text"
          value={formData.cnpj}
          onChange={handleCNPJChange}
          placeholder="00.000.000/0000-00"
          style={{ width: '100%', padding: '8px' }}
        />
        <small>Digite apenas números</small>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Telefone</label>
        <input
          type="text"
          value={formData.telefone}
          onChange={handleTelefoneChange}
          placeholder="(00) 00000-0000"
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Gestor do Contrato</label>
        <input
          type="text"
          name="gestor_contrato"
          value={formData.gestor_contrato}
          onChange={handleChange}
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>E-mail</label>
        <input
          type="email"
          name="email"
          value={formData.email}
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
