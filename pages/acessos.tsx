import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { useRouter } from 'next/router'
import Link from 'next/link'

interface Acesso {
  id: string
  sistema: string
  login: string
  senha_criptografada: string
  url: string | null
  observacoes: string | null
}

export default function AcessosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [acessos, setAcessos] = useState<Acesso[]>([])
  const [loading, setLoading] = useState(true)
  const [verificando, setVerificando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState<{ [key: string]: boolean }>({})
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    sistema: '',
    login: '',
    senha: '',
    url: '',
    observacoes: ''
  })

  useEffect(() => {
    async function verificarPerfil() {
      if (!user) {
        router.push('/login')
        return
      }
      const { data, error } = await supabase
        .from('perfis')
        .select('nivel_acesso')
        .eq('id', user.id)
        .maybeSingle()
      if (error) {
        setError('Erro ao verificar permissões: ' + error.message)
        setVerificando(false)
        return
      }
      if (!data || data.nivel_acesso !== 'admin') {
        setError('Acesso negado. Você não é administrador.')
        setVerificando(false)
        return
      }
      setVerificando(false)
      carregarAcessos()
    }
    verificarPerfil()
  }, [user, router])

  async function carregarAcessos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .order('sistema')
    if (error) {
      setError('Erro ao carregar acessos: ' + error.message)
    } else {
      setAcessos(data || [])
    }
    setLoading(false)
  }

  function toggleMostrarSenha(id: string) {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  function abrirFormNovo() {
    setEditingId(null)
    setFormData({ sistema: '', login: '', senha: '', url: '', observacoes: '' })
    setShowForm(true)
  }

  function abrirFormEditar(acesso: Acesso) {
    setEditingId(acesso.id)
    setFormData({
      sistema: acesso.sistema,
      login: acesso.login,
      senha: '', // não carregamos a senha por segurança
      url: acesso.url || '',
      observacoes: acesso.observacoes || ''
    })
    setShowForm(true)
  }

  async function salvarAcesso() {
    if (!formData.sistema || !formData.login) {
      alert('Sistema e Login são obrigatórios.')
      return
    }

    const dados = {
      sistema: formData.sistema,
      login: formData.login,
      senha_criptografada: formData.senha, // por enquanto em texto plano
      url: formData.url || null,
      observacoes: formData.observacoes || null
    }

    if (editingId) {
      // Atualizar
      const { error } = await supabase
        .from('acessos')
        .update(dados)
        .eq('id', editingId)
      if (error) {
        alert('Erro ao atualizar: ' + error.message)
      } else {
        setShowForm(false)
        carregarAcessos()
      }
    } else {
      // Inserir novo
      const { error } = await supabase
        .from('acessos')
        .insert([dados])
      if (error) {
        alert('Erro ao salvar: ' + error.message)
      } else {
        setShowForm(false)
        carregarAcessos()
      }
    }
  }

  async function excluirAcesso(id: string) {
    if (!confirm('Tem certeza que deseja excluir este acesso?')) return
    const { error } = await supabase.from('acessos').delete().eq('id', id)
    if (error) {
      alert('Erro ao excluir: ' + error.message)
    } else {
      carregarAcessos()
    }
  }

  function cancelarForm() {
    setShowForm(false)
    setEditingId(null)
  }

  if (verificando) {
    return <div style={{ padding: '20px' }}>Verificando permissões...</div>
  }

  if (error) {
    return (
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <h1>Acesso Negado</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <Link href="/dashboard">
          <button style={{ padding: '8px 16px', marginTop: '20px' }}>Voltar ao Dashboard</button>
        </Link>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Gerenciamento de Acessos a Portais</h1>
        <Link href="/dashboard">
          <button style={{ padding: '8px 16px' }}>← Voltar ao Dashboard</button>
        </Link>
      </div>

      <button onClick={abrirFormNovo} style={{ marginBottom: '20px', padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
        + Novo Acesso
      </button>

      {showForm && (
        <div style={{ border: '1px solid #ccc', padding: '20px', marginBottom: '20px', borderRadius: '5px' }}>
          <h2>{editingId ? 'Editar Acesso' : 'Novo Acesso'}</h2>
          <div style={{ marginBottom: '10px' }}>
            <label>Sistema *</label>
            <input
              type="text"
              name="sistema"
              value={formData.sistema}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Login *</label>
            <input
              type="text"
              name="login"
              value={formData.login}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Senha {editingId && '(deixe em branco para manter a atual)'}</label>
            <input
              type="password"
              name="senha"
              value={formData.senha}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>URL</label>
            <input
              type="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={3}
              style={{ width: '100%', padding: '8px' }}
            />
          </div>
          <div>
            <button onClick={salvarAcesso} style={{ marginRight: '10px', padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Salvar</button>
            <button onClick={cancelarForm} style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p>Carregando acessos...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Sistema</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Login</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Senha</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>URL</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Observações</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {acessos.map(acesso => (
              <tr key={acesso.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{acesso.sistema}</td>
                <td style={{ padding: '10px' }}>{acesso.login}</td>
                <td style={{ padding: '10px' }}>
                  {showPassword[acesso.id] ? (
                    <span>{acesso.senha_criptografada}</span>
                  ) : (
                    '••••••••'
                  )}
                  <button 
                    onClick={() => toggleMostrarSenha(acesso.id)}
                    style={{ marginLeft: '10px', padding: '2px 8px', fontSize: '0.8rem' }}
                  >
                    {showPassword[acesso.id] ? 'Ocultar' : 'Mostrar'}
                  </button>
                </td>
                <td style={{ padding: '10px' }}>
                  {acesso.url ? (
                    <a href={acesso.url} target="_blank" rel="noopener noreferrer">
                      {acesso.url}
                    </a>
                  ) : '—'}
                </td>
                <td style={{ padding: '10px' }}>{acesso.observacoes || '—'}</td>
                <td style={{ padding: '10px' }}>
                  <button onClick={() => abrirFormEditar(acesso)} style={{ marginRight: '5px' }}>Editar</button>
                  <button onClick={() => excluirAcesso(acesso.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {acessos.length === 0 && !loading && (
        <p style={{ marginTop: '20px' }}>Nenhum acesso cadastrado. Clique em <strong>Novo Acesso</strong> para adicionar.</p>
      )}
    </div>
  )
}