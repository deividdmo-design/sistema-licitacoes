import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Certidao {
  id: string
  nome_certidao: string
  responsavel_nome: string
  data_emissao: string
  validade_dias: number
  vencimento: string
  arquivo_url: string | null
  unidade_id: string
  // 1. Ajuste na Interface: Aceitando retorno único ou lista do Supabase
  unidades?: { codigo: string; razao_social: string } | { codigo: string; razao_social: string }[]
}

export default function ListaCertidoes() {
  const [certidoes, setCertidoes] = useState<Certidao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    carregarCertidoes()
  }, [])

  async function carregarCertidoes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('certidoes')
      .select('*, unidades(codigo, razao_social)')
      .order('vencimento', { ascending: true })
    
    if (error) {
      console.error(error)
    } else {
      // 2. Correção de Dados: Tratando a unidade com segurança para o Deploy
      const formatado = data?.map((cert: any) => ({
        ...cert,
        unidades: Array.isArray(cert.unidades) ? cert.unidades[0] : cert.unidades
      }))
      setCertidoes(formatado || [])
    }
    setLoading(false)
  }

  // Helper para acessar dados da unidade sem erro de tipo
  const getUnidadeInfo = (cert: Certidao) => {
    const u: any = cert.unidades
    const data = Array.isArray(u) ? u[0] : u
    return data ? `${data.codigo} - ${data.razao_social}` : 'Geral'
  }

  async function excluirCertidao(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta certidão?')) return
    const { error } = await supabase.from('certidoes').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarCertidoes()
  }

  function formatarData(dataISO: string | null) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  function calcularDiasRestantes(vencimentoISO: string) {
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const venc = new Date(vencimentoISO + 'T00:00:00')
    const diff = venc.getTime() - hoje.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // 3. Status Visual Profissional
  function getStatusStyle(dias: number) {
    if (dias < 0) return { text: 'Vencido', bg: '#fee2e2', color: '#991b1b' }
    if (dias <= 15) return { text: `Vence em ${dias} dias`, bg: '#fef3c7', color: '#92400e' }
    return { text: 'Válido', bg: '#dcfce7', color: '#166534' }
  }

  return (
    <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '30px' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px', fontWeight: 'bold' }}>Certidões</h1>
      
      <div style={{ marginBottom: '30px', display: 'flex', gap: '12px' }}>
        <Link href="/certidoes/novo">
          <button style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
            + Nova Certidão
          </button>
        </Link>
        <button onClick={() => {}} style={{ padding: '12px 24px', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          Excel
        </button>
        <button onClick={() => {}} style={{ padding: '12px 24px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
          PDF
        </button>
      </div>

      {loading ? (
        <p>Sincronizando certidões...</p>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>CERTIDÃO</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>UNIDADE</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>RESPONSÁVEL</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>VENCIMENTO</th>
                <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '13px' }}>STATUS</th>
                <th style={{ padding: '18px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>ARQUIVO</th>
                <th style={{ padding: '18px', textAlign: 'right', color: '#64748b', fontSize: '13px' }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {certidoes.map((cert) => {
                const dias = calcularDiasRestantes(cert.vencimento)
                const status = getStatusStyle(dias)
                return (
                  <tr key={cert.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }}>
                    <td style={{ padding: '18px', fontWeight: '600', color: '#1e293b' }}>{cert.nome_certidao}</td>
                    <td style={{ padding: '18px', color: '#64748b', fontSize: '14px' }}>{getUnidadeInfo(cert)}</td>
                    <td style={{ padding: '18px', color: '#64748b' }}>{cert.responsavel_nome}</td>
                    <td style={{ padding: '18px', fontWeight: '500' }}>{formatarData(cert.vencimento)}</td>
                    <td style={{ padding: '18px' }}>
                      <span style={{ 
                        padding: '6px 14px', 
                        borderRadius: '20px', 
                        fontSize: '12px', 
                        fontWeight: '700', 
                        backgroundColor: status.bg, 
                        color: status.color 
                      }}>
                        {status.text}
                      </span>
                    </td>
                    <td style={{ padding: '18px', textAlign: 'center' }}>
                      {cert.arquivo_url ? (
                        <a href={cert.arquivo_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>📄</a>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '18px', textAlign: 'right' }}>
                      <Link href={`/certidoes/editar/${cert.id}`}>
                        <button style={{ marginRight: '8px', padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>Editar</button>
                      </Link>
                      <button onClick={() => excluirCertidao(cert.id)} style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b', cursor: 'pointer' }}>Excluir</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}