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
    if (error) {
      console.error(error)
    } else {
      setOrgaos(data || [])
    }
    setLoading(false)
  }

  async function excluirOrgao(id: string) {
    if (!confirm('Tem certeza que deseja excluir este órgão?')) return
    const { error } = await supabase.from('orgaos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarOrgaos()
  }

  // Máscaras com verificação de segurança
  function formatarCNPJ(cnpj: string) {
    if (!cnpj || cnpj.length !== 14) return cnpj || '—'
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }

  function formatarTelefone(telefone: string) {
    if (!telefone) return '—'
    const t = telefone.replace(/\D/g, '')
    if (t.length === 11) return t.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')
    if (t.length === 10) return t.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3')
    return telefone
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px', fontWeight: 'bold' }}>Gestão de Órgãos</h1>
      
      <Link href="/clientes/novo">
        <button style={{ 
          marginBottom: '30px', 
          padding: '12px 24px', 
          background: '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: 'pointer',
          fontWeight: '600',
          boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
        }}>
          + Novo Órgão
        </button>
      </Link>

      {loading ? (
        <p>Carregando instituições...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>RAZÃO SOCIAL</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>CNPJ</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>CONTATO</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>GESTOR</th>
                <th style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {orgaos.map((org) => (
                <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '16px', fontWeight: '600', color: '#1e293b' }}>{org.razao_social}</td>
                  <td style={{ padding: '16px', color: '#64748b', fontSize: '14px', fontFamily: 'monospace' }}>
                    {formatarCNPJ(org.cnpj)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: '14px', color: '#1e293b' }}>{formatarTelefone(org.telefone)}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{org.email || 'Sem e-mail'}</div>
                  </td>
                  <td style={{ padding: '16px', color: '#64748b' }}>{org.gestor_contrato || '—'}</td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <Link href={`/clientes/editar/${org.id}`}>
                      <button style={{ 
                        marginRight: '8px', 
                        padding: '6px 12px', 
                        borderRadius: '6px', 
                        border: '1px solid #e2e8f0', 
                        background: 'white', 
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirOrgao(org.id)} style={{ 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      border: '1px solid #fee2e2', 
                      background: '#fef2f2', 
                      color: '#991b1b', 
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}