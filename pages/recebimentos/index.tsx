import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'

interface Recebimento {
  id: string
  data_pagamento: string
  valor_recebido: number
  nota_fiscal: string | null
  licitacao_id: string
  licitacoes?: { identificacao: string }
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
    if (error) console.error(error)
    else {
      setRecebimentos(data || [])
      const total = (data || []).reduce((acc, r) => acc + (r.valor_recebido || 0), 0)
      setTotalGeral(total)
    }
    setLoading(false)
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
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Recebimentos</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <Link href="/recebimentos/novo">
          <button style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Novo Recebimento
          </button>
        </Link>
        <div style={{ background: '#e3f2fd', padding: '10px 20px', borderRadius: '8px' }}>
          <strong>Total Recebido: </strong>
          {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
      </div>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f0f0f0' }}>
              <th style={{ padding: '10px', textAlign: 'left' }}>Licitação</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Data Pagamento</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Valor</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Nota Fiscal</th>
              <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {recebimentos.map((rec) => (
              <tr key={rec.id} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '10px' }}>{rec.licitacoes?.identificacao || '—'}</td>
                <td style={{ padding: '10px' }}>{formatarData(rec.data_pagamento)}</td>
                <td style={{ padding: '10px' }}>
                  {rec.valor_recebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </td>
                <td style={{ padding: '10px' }}>{rec.nota_fiscal || '—'}</td>
                <td style={{ padding: '10px' }}>
                  <Link href={`/recebimentos/editar/${rec.id}`}>
                    <button style={{ marginRight: '5px', padding: '5px 10px', cursor: 'pointer' }}>Editar</button>
                  </Link>
                  <button onClick={() => excluirRecebimento(rec.id)} style={{ padding: '5px 10px', cursor: 'pointer' }}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}