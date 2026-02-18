import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Orgao {
  id: string
  razao_social: string
  cnpj: string
  telefone: string
  gestor_contrato: string | null
  email: string | null
}

export default function ListaOrgaos() {
  const [orgaos, setOrgaos] = useState<Orgao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarOrgaos()
  }, [])

  async function carregarOrgaos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orgaos')
      .select('*')
      .order('razao_social')
    if (error) console.error(error)
    else setOrgaos(data || [])
    setLoading(false)
  }

  async function excluirOrgao(id: string) {
    if (!confirm('Tem certeza que deseja excluir este órgão?')) return
    const { error } = await supabase.from('orgaos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarOrgaos()
  }

  function formatarCNPJ(cnpj: string) {
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  function formatarTelefone(telefone: string) {
    return telefone.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Órgãos</h1>
      <Link href="/clientes/novo">
        <button style={{ marginBottom: '20px', padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Novo Órgão
        </button>
      </Link>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Razão Social</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>CNPJ</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Telefone</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Gestor</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>E-mail</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {orgaos.map((org) => (
              <tr key={org.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{org.razao_social}</td>
                <td style={{ padding: '10px' }}>{org.cnpj ? formatarCNPJ(org.cnpj) : ''}</td>
                <td style={{ padding: '10px' }}>{org.telefone ? formatarTelefone(org.telefone) : ''}</td>
                <td style={{ padding: '10px' }}>{org.gestor_contrato}</td>
                <td style={{ padding: '10px' }}>{org.email}</td>
                <td style={{ padding: '10px' }}>
                  <Link href={`/clientes/editar/${org.id}`}>
                    <button style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                  </Link>
                  <button onClick={() => excluirOrgao(org.id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}