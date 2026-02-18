import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import AdminRoute from '../../components/AdminRoute'

interface Usuario {
  id: string
  email?: string
  nivel_acesso: string
  created_at: string
}

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarUsuarios()
  }, [])

  async function carregarUsuarios() {
    setLoading(true)
    // Busca os perfis vinculados aos usuários
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar usuários:', error.message)
    } else {
      setUsuarios(data || [])
    }
    setLoading(false)
  }

  async function alterarNivel(id: string, novoNivel: string) {
    const { error } = await supabase
      .from('perfis')
      .update({ nivel_acesso: novoNivel })
      .eq('id', id)

    if (error) alert('Erro ao atualizar nível: ' + error.message)
    else carregarUsuarios()
  }

  return (
    <AdminRoute>
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '30px' }}>
        <h1 style={{ color: '#1e293b', marginBottom: '20px' }}>Gerenciar Acessos</h1>
        <p style={{ color: '#64748b', marginBottom: '30px' }}>Controle quem pode acessar as funções administrativas da Nordeste.</p>

        {loading ? (
          <p>Carregando lista de permissões...</p>
        ) : (
          <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Usuário (ID)</th>
                  <th style={{ padding: '16px', textAlign: 'left', color: '#64748b' }}>Nível de Acesso</th>
                  <th style={{ padding: '16px', textAlign: 'right', color: '#64748b' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontSize: '14px', color: '#334155' }}>
                      {user.id}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{ 
                        padding: '4px 10px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        background: user.nivel_acesso === 'admin' ? '#dcfce7' : '#f1f5f9',
                        color: user.nivel_acesso === 'admin' ? '#166534' : '#475569'
                      }}>
                        {user.nivel_acesso.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <select 
                        value={user.nivel_acesso} 
                        onChange={(e) => alterarNivel(user.id, e.target.value)}
                        style={{ padding: '5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                      >
                        <option value="user">Usuário Comum</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminRoute>
  )
}