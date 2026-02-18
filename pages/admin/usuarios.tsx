import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminRoute from '../components/AdminRoute'

interface Usuario {
  id: string
  email: string
  perfil: {
    nome: string
    nivel_acesso: string
    cargo: string
  } | null
}

export default function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    setLoading(true)
    // Buscar usuários da auth.users (não é possível diretamente via SQL, mas podemos usar a tabela perfis)
    // Na verdade, precisamos listar os perfis existentes e talvez criar uma função no banco para listar usuários.
    // Por simplicidade, vamos listar os perfis e seus emails (que precisam ser obtidos de auth.users).
    // Isso requer uma função no banco ou usar admin API. Vamos pular por enquanto.
    // Em vez disso, vamos apenas listar os perfis existentes com os dados que temos.
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
    if (error) console.error(error)
    else {
      // Para obter emails, precisaríamos de uma função serverless ou da API de admin.
      // Por enquanto, mostramos apenas os dados do perfil.
      setUsuarios(data.map(p => ({ id: p.id, email: 'carregar...', perfil: p })))
    }
    setLoading(false)
  }

  async function alterarNivel(id: string, novoNivel: string) {
    const { error } = await supabase
      .from('perfis')
      .update({ nivel_acesso: novoNivel })
      .eq('id', id)
    if (error) alert('Erro ao atualizar: ' + error.message)
    else carregarUsuarios()
  }

  return (
    <AdminRoute>
      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>Gerenciar Perfis de Usuário</h1>
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                <th>Cargo</th>
                <th>Nível de Acesso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>{u.perfil?.nome}</td>
                  <td>{u.perfil?.cargo}</td>
                  <td>
                    <select
                      value={u.perfil?.nivel_acesso}
                      onChange={(e) => alterarNivel(u.id, e.target.value)}
                    >
                      <option value="admin">Admin</option>
                      <option value="comercial">Comercial</option>
                      <option value="apoio">Apoio</option>
                    </select>
                  </td>
                  <td>
                    <button>Salvar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminRoute>
  )
}