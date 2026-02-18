import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Anexo {
  id: string
  nome_arquivo: string
  arquivo_url: string
  created_at: string
}

interface Licitacao {
  id: string
  identificacao: string
  objeto: string
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
  orgaos?: { razao_social: string }
}

export default function DetalheLicitacao() {
  const router = useRouter()
  const { id } = router.query
  const [licitacao, setLicitacao] = useState<Licitacao | null>(null)
  const [anexos, setAnexos] = useState<Anexo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) carregarDados()
  }, [id])

  async function carregarDados() {
    setLoading(true)
    
    // Busca os detalhes da licitação
    const { data: lic, error: licErr } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .eq('id', id)
      .single()

    if (licErr) {
      console.error(licErr)
    } else {
      // Ajuste para garantir que orgaos seja um objeto único
      const formatada = {
        ...lic,
        orgaos: Array.isArray(lic.orgaos) ? lic.orgaos[0] : lic.orgaos
      }
      setLicitacao(formatada)
    }

    // Busca os anexos vinculados
    const { data: anx, error: anxErr } = await supabase
      .from('licitacao_anexos')
      .select('*')
      .eq('licitacao_id', id)
      .order('created_at', { ascending: false })

    if (!anxErr) setAnexos(anx || [])
    
    setLoading(false)
  }

  async function excluirAnexo(anexoId: string, url: string) {
    if (!confirm('Deseja excluir este anexo?')) return

    // 1. Correção Crítica para o Deploy: Garantindo que o path não seja undefined
    const path = url.split('/').pop()

    if (path) {
      // Remove o arquivo físico do Storage
      await supabase.storage.from('licitacoes').remove([path])
    }

    // 2. Remove o registro do banco de dados
    await supabase.from('licitacao_anexos').delete().eq('id', anexoId)
    
    carregarDados()
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando detalhes...</div>
  if (!licitacao) return <div style={{ padding: '40px', textAlign: 'center' }}>Licitação não encontrada.</div>

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ color: '#1e293b', margin: 0 }}>{licitacao.identificacao}</h1>
        <Link href="/licitacoes">
          <button style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>Voltar</button>
        </Link>
      </div>

      {/* Grid de Informações */}
      <div style={{ background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>ÓRGÃO</label>
            <p style={{ margin: '5px 0', fontWeight: '600' }}>{licitacao.orgaos?.razao_social || '—'}</p>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>VALOR ESTIMADO</label>
            <p style={{ margin: '5px 0', fontWeight: '600' }}>{licitacao.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>MODALIDADE</label>
            <p style={{ margin: '5px 0' }}>{licitacao.modalidade}</p>
          </div>
          <div>
            <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>DATA LIMITE</label>
            <p style={{ margin: '5px 0' }}>{new Date(licitacao.data_limite_participacao).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div style={{ marginTop: '20px' }}>
          <label style={{ color: '#64748b', fontSize: '12px', fontWeight: 'bold' }}>OBJETO</label>
          <p style={{ margin: '5px 0', lineHeight: '1.6' }}>{licitacao.objeto}</p>
        </div>
      </div>

      {/* Seção de Anexos */}
      <div style={{ background: '#f8fafc', padding: '25px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <h3 style={{ marginTop: 0 }}>📁 Documentos e Anexos</h3>
        {anexos.length === 0 ? (
          <p style={{ color: '#94a3b8' }}>Nenhum documento anexado.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {anexos.map(anexo => (
              <div key={anexo.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                <a href={anexo.arquivo_url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontWeight: '500', textDecoration: 'none' }}>
                  📄 {anexo.nome_arquivo}
                </a>
                <button 
                  onClick={() => excluirAnexo(anexo.id, anexo.arquivo_url)}
                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '18px' }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}