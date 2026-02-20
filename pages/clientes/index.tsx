import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Cliente {
  id: string
  razao_social: string
  cnpj: string
  telefone: string
  gestor_contrato: string | null
  email: string | null
}

export default function ListaClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarClientes()
  }, [])

  async function carregarClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('orgaos')
      .select('*')
      .order('razao_social')
    if (error) console.error(error)
    else setClientes(data || [])
    setLoading(false)
  }

  async function excluirCliente(id: string) {
    if (!confirm('Tem certeza que deseja excluir este órgão?')) return
    const { error } = await supabase.from('orgaos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarClientes()
  }

  function formatarCNPJ(cnpj: string) {
    if (!cnpj) return ''
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  function formatarTelefone(telefone: string) {
    if (!telefone) return ''
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
              <th style={{ padding: '10px', textAlign: 'left' }}>RAZÃO SOCIAL / NOME</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>CNPJ</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>CONTATO (E-MAIL / TEL)</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>GESTOR RESPONSÁVEL</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>AÇÕES</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((cliente) => (
              <tr key={cliente.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{cliente.razao_social}</td>
                <td style={{ padding: '10px' }}>{formatarCNPJ(cliente.cnpj)}</td>
                <td style={{ padding: '10px' }}>
                  {cliente.email && <div>{cliente.email}</div>}
                  {cliente.telefone && <div>{formatarTelefone(cliente.telefone)}</div>}
                </td>
                <td style={{ padding: '10px' }}>{cliente.gestor_contrato || '-'}</td>
                <td style={{ padding: '10px' }}>
                  <Link href={`/clientes/editar/${cliente.id}`}>
                    <button style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                  </Link>
                  <button onClick={() => excluirCliente(cliente.id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
