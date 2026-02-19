import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import CryptoJS from 'crypto-js'

interface AcessoFormProps {
  acessoId?: string
}

export default function AcessoForm({ acessoId }: AcessoFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    sistema: '',
    login: '',
    senha: '',
    url: '',
    observacoes: ''
  })

  useEffect(() => {
    if (acessoId) {
      carregarAcesso()
    }
  }, [acessoId])

  async function carregarAcesso() {
    setLoading(true)
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .eq('id', acessoId)
      .single()
    if (error) {
      alert('Erro ao carregar acesso')
    } else if (data) {
      const bytes = CryptoJS.AES.decrypt(data.senha_criptografada, process.env.NEXT_PUBLIC_CRYPTO_SECRET!)
      const senha = bytes.toString(CryptoJS.enc.Utf8)
      setFormData({
        sistema: data.sistema || '',
        login: data.login || '',
        senha: senha || '',
        url: data.url || '',
        observacoes: data.observacoes || ''
      })
    }
    setLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const senhaCriptografada = CryptoJS.AES.encrypt(formData.senha, process.env.NEXT_PUBLIC_CRYPTO_SECRET!).toString()

    const dadosParaSalvar = {
      sistema: formData.sistema,
      login: formData.login,
      senha_criptografada: senhaCriptografada,
      url: formData.url || null,
      observacoes: formData.observacoes || null
    }

    let error
    if (acessoId) {
      const { error: err } = await supabase
        .from('acessos')
        .update(dadosParaSalvar)
        .eq('id', acessoId)
      error = err
    } else {
      const { error: err } = await supabase
        .from('acessos')
        .insert([dadosParaSalvar])
      error = err
    }

    setLoading(false)
    if (error) {
      alert('Erro ao salvar: ' + error.message)
    } else {
      router.push('/acessos')
    }
  }

  if (loading && acessoId) return <p>Carregando...</p>

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h1>{acessoId ? 'Editar Acesso' : 'Novo Acesso'}</h1>

      <div style={{ marginBottom: '15px' }}>
        <label>Sistema *</label>
        <input type="text" name="sistema" value={formData.sistema} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Login *</label>
        <input type="text" name="login" value={formData.login} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Senha *</label>
        <input type="password" name="senha" value={formData.senha} onChange={handleChange} required style={{ width: '100%', padding: '8px' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>URL</label>
        <input type="url" name="url" value={formData.url} onChange={handleChange} style={{ width: '100%', padding: '8px' }} />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label>Observações</label>
        <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} style={{ width: '100%', padding: '8px' }} />
      </div>

      <button type="submit" disabled={loading} style={{ padding: '10px 20px' }}>
        {loading ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}