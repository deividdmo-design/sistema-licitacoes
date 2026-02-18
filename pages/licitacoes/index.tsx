import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { linkLicitacaoCalendario } from '../../lib/googleCalendar'

interface Licitacao {
  id: string
  identificacao: string
  orgao_id: string
  orgaos?: { razao_social: string } | { razao_social: string }[]
  modalidade: string
  valor_estimado: number
  data_limite_participacao: string
  status: string
}

export default function ListaLicitacoes() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarLicitacoes()
  }, [])

  async function carregarLicitacoes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .order('data_limite_participacao', { ascending: false })
    
    if (error) {
      console.error("Erro ao carregar:", error)
    } else {
      const formatado = data?.map((lic: any) => ({
        ...lic,
        orgaos: Array.isArray(lic.orgaos) ? lic.orgaos[0] : lic.orgaos
      }))
      setLicitacoes(formatado || [])
    }
    setLoading(false)
  }

  // FUNÇÃO DE EXCLUSÃO CORRIGIDA
  async function excluirLicitacao(id: string) {
    // Log para confirmar que o clique funcionou (Ver no F12)
    console.log("%c -> TENTANDO EXCLUIR LICITAÇÃO ID: " + id, "color: white; background: red; font-size: 16px; padding: 5px;");

    const confirmacao = window.confirm('Tem certeza que deseja excluir esta licitação? Isso apagará os dados permanentemente.');
    if (!confirmacao) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('licitacoes')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Erro detalhado do Supabase:", error);
        if (error.code === '23503') {
          alert('Erro de Integridade: Esta licitação possui contratos ou anexos vinculados. Exclua-os primeiro.');
        } else {
          alert('Erro ao excluir: ' + error.message);
        }
      } else {
        alert('Licitação removida com sucesso!');
        await carregarLicitacoes(); // Recarrega a lista atualizada
      }
    } catch (err) {
      console.error("Erro inesperado no sistema:", err);
      alert('Erro crítico ao processar a exclusão.');
    } finally {
      setLoading(false);
    }
  }

  const getRazaoSocial = (lic: Licitacao) => {
    const orgaoData: any = lic.orgaos
    return Array.isArray(orgaoData) ? orgaoData[0]?.razao_social : orgaoData?.razao_social
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px' }}>Licitações Nordeste</h1>
      
      <div style={{ marginBottom: '30px', display: 'flex', gap: '10px' }}>
        <Link href="/licitacoes/novo">
          <button style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            + Nova Licitação
          </button>
        </Link>
      </div>

      {loading ? (
        <p>Sincronizando dados...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '16px', textAlign: 'left' }}>Identificação</th>
                <th style={{ padding: '16px', textAlign: 'left' }}>Órgão</th>
                <th style={{ padding: '16px', textAlign: 'left' }}>Valor</th>
                <th style={{ padding: '16px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {licitacoes.map((lic) => (
                <tr key={lic.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontWeight: '600' }}>
                    <Link href={`/licitacoes/${lic.id}`} style={{ color: '#3b82f6', textDecoration: 'none' }}>{lic.identificacao}</Link>
                  </td>
                  <td style={{ padding: '16px' }}>{getRazaoSocial(lic) || '—'}</td>
                  <td style={{ padding: '16px' }}>
                    {lic.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: '#dcfce7', color: '#166534' }}>
                      {lic.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    {/* BOTÕES DE AÇÃO */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <Link href={`/licitacoes/editar/${lic.id}`}>
                        <button style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                          Editar
                        </button>
                      </Link>
                      
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          excluirLicitacao(lic.id);
                        }}
                        style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}
                      >
                        Excluir
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
  )
}