import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Recebimento {
  id: string
  data_pagamento: string
  valor_recebido: number
  nota_fiscal: string | null
  licitacao_id: string
  // 1. Ajuste na Interface para aceitar retorno flexível do Supabase
  licitacoes?: { identificacao: string } | { identificacao: string }[]
}

export default function ListaRecebimentos() {
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([])
  const [loading, setLoading] = useState(true)
  const [totalGeral, setTotalGeral] = useState(0)

  useEffect(() => {
    carregarRecebimentos()
  }, [])

  async function carregarRecebimentos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('recebimentos')
      .select('*, licitacoes(identificacao)')
      .order('data_pagamento', { ascending: false })
    
    if (error) {
      console.error(error)
    } else {
      // 2. Correção de Dados: Tratando a licitação para evitar erro no build
      const formatado = data?.map((rec: any) => ({
        ...rec,
        licitacoes: Array.isArray(rec.licitacoes) ? rec.licitacoes[0] : rec.licitacoes
      }))
      
      setRecebimentos(formatado || [])
      const total = (formatado || []).reduce((acc: number, r: any) => acc + (r.valor_recebido || 0), 0)
      setTotalGeral(total)
    }
    setLoading(false)
  }

  // Helper para acessar a identificação com segurança
  const getLicitacaoIdentificacao = (rec: Recebimento) => {
    const lic: any = rec.licitacoes
    return Array.isArray(lic) ? lic[0]?.identificacao : lic?.identificacao
  }

  async function excluirRecebimento(id: string) {
    if (!confirm('Tem certeza que deseja excluir este recebimento?')) return
    const { error } = await supabase.from('recebimentos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarRecebimentos()
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '30px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px', fontWeight: 'bold' }}>Recebimentos</h1>
      
      {/* Resumo Financeiro Profissional */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '20px' }}>
        <Link href="/recebimentos/novo">
          <button style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)' }}>
            + Novo Recebimento
          </button>
        </Link>
        <div style={{ background: '#dcfce7', padding: '15px 25px', borderRadius: '12px', border: '1px solid #bbf7d0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <span style={{ color: '#166534', fontWeight: '600', fontSize: '14px' }}>TOTAL RECEBIDO: </span>
          <span style={{ color: '#166534', fontWeight: 'bold', fontSize: '1.5rem', marginLeft: '10px' }}>
            {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </span>
        </div>
      </div>

      {loading ? (
        <p>Buscando lançamentos financeiros...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>LICITAÇÃO</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>DATA PAGAMENTO</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>VALOR</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>NOTA FISCAL</th>
                <th style={{ padding: '18px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {recebimentos.map((rec) => (
                <tr key={rec.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                  <td style={{ padding: '18px', fontWeight: '600', color: '#1e293b' }}>
                    {getLicitacaoIdentificacao(rec) || '—'}
                  </td>
                  <td style={{ padding: '18px', color: '#64748b' }}>{formatarData(rec.data_pagamento)}</td>
                  <td style={{ padding: '18px', fontWeight: '700', color: '#166534' }}>
                    {rec.valor_recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '18px' }}>
                    <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '12px', color: '#475569', fontWeight: '500' }}>
                      {rec.nota_fiscal || 'S/ NF'}
                    </span>
                  </td>
                  <td style={{ padding: '18px', textAlign: 'right' }}>
                    <Link href={`/recebimentos/editar/${rec.id}`}>
                      <button style={{ marginRight: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirRecebimento(rec.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Excluir</button>
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