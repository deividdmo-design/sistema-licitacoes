import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Orgao {
  id: string
  razao_social: string
  cnpj: string
  telefone?: string
  email?: string
  gestor_contrato?: string // Nome corrigido (era 'gestor')
}

export default function OrgaosLista() {
  const [orgaos, setOrgaos] = useState<Orgao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    carregarOrgaos()
  }, [])

  async function carregarOrgaos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('orgaos')
        .select('*')
        .order('razao_social', { ascending: true })

      if (error) throw error
      if (data) setOrgaos(data as any)
    } catch (error) {
      console.error('Erro ao buscar órgãos:', error)
    } finally {
      setLoading(false)
    }
  }

  async function excluirOrgao(id: string) {
    if (!confirm('Tem certeza que deseja excluir este órgão? Contratos e licitações vinculados a ele podem ser afetados.')) return

    try {
      const { error } = await supabase.from('orgaos').delete().eq('id', id)
      if (error) throw error
      carregarOrgaos()
    } catch (error: any) {
      alert('Erro ao excluir: ' + error.message)
    }
  }

  // Lógica de filtro e busca
  const orgaosFiltrados = orgaos.filter(org => {
    const termoBusca = busca.toLowerCase()
    return (
      (org.razao_social || '').toLowerCase().includes(termoBusca) ||
      (org.cnpj || '').toLowerCase().includes(termoBusca) ||
      (org.gestor_contrato || '').toLowerCase().includes(termoBusca) // campo corrigido
    )
  })

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif', paddingBottom: '40px' }}>
      
      {/* CABEÇALHO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ color: '#0f172a', margin: '0 0 5px 0', fontSize: '2.2rem', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.5px' }}>
            🏢 Gestão de Órgãos
          </h1>
          <p style={{ color: '#64748b', margin: 0, fontSize: '1.05rem' }}>Cadastre e gerencie a sua base de clientes e instituições públicas.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: '#f8fafc', color: '#10b981', border: '1px solid #10b981', padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#ecfdf5'} onMouseOut={(e) => e.currentTarget.style.background = '#f8fafc'}>
            📊 Exportar Base
          </button>
          {/* Lembre-se de checar se o seu link de criação é /clientes/novo ou /orgaos/novo */}
          <Link href="/clientes/novo">
            <button style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'} onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}>
              <span>➕</span> Novo Órgão
            </button>
          </Link>
        </div>
      </div>

      {/* CARDS DE INDICADORES (KPIs PREMIUM) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.3)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Total na Base</div>
            <div style={{ fontSize: '2.8rem', fontWeight: '800' }}>{orgaos.length}</div>
          </div>
          <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '8rem', opacity: 0.1, zIndex: 1, transform: 'rotate(-15deg)' }}>🏛️</div>
        </div>

      </div>

      {/* BARRA DE FILTROS E BUSCA */}
      <div style={{ background: '#fff', padding: '20px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', marginBottom: '25px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 100%' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '8px' }}>Buscar Instituição</label>
          <input 
            type="text" 
            placeholder="Digite a Razão Social, CNPJ ou nome do Gestor..." 
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', background: '#f8fafc' }}
          />
        </div>
      </div>

      {/* TABELA DE DADOS (DATA GRID PREMIUM) */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b', fontSize: '1.1rem' }}>Carregando instituições...</div>
        ) : orgaosFiltrados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8', background: '#f8fafc' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '15px' }}>📭</div>
            <h3 style={{ margin: '0 0 5px 0', color: '#475569' }}>Nenhum órgão encontrado</h3>
            <p style={{ margin: 0 }}>Verifique a busca ou cadastre uma nova instituição.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Razão Social / Nome</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>CNPJ</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Contato (E-mail / Tel)</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700' }}>Gestor Responsável</th>
                  <th style={{ padding: '18px 20px', color: '#475569', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '700', textAlign: 'center' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {orgaosFiltrados.map((org) => (
                  <tr key={org.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    
                    <td style={{ padding: '16px 20px', maxWidth: '350px' }}>
                      <strong style={{ color: '#0f172a', display: 'block', fontSize: '0.95rem' }}>{org.razao_social}</strong>
                    </td>
                    
                    <td style={{ padding: '16px 20px', color: '#475569', fontWeight: '500', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                      {org.cnpj || '-'}
                    </td>
                    
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ color: '#0369a1', fontSize: '0.9rem', marginBottom: '2px' }}>{org.email || '-'}</div>
                      <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{org.telefone || '-'}</div>
                    </td>

                    <td style={{ padding: '16px 20px', color: '#334155', fontWeight: '500' }}>
                      {org.gestor_contrato ? ( // campo corrigido
                        <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem' }}>👤 {org.gestor_contrato}</span>
                      ) : (
                        <span style={{ color: '#94a3b8' }}>-</span>
                      )}
                    </td>
                    
                    <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {/* Lembre-se de checar se o seu link de edição é /clientes/editar ou /orgaos/editar */}
                        <Link href={`/clientes/editar/${org.id}`}>
                          <button title="Editar Instituição" style={{ background: '#fef3c7', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                            ✏️
                          </button>
                        </Link>
                        <button onClick={() => excluirOrgao(org.id)} title="Excluir Instituição" style={{ background: '#fee2e2', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', transition: 'transform 0.1s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                          🗑️
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}