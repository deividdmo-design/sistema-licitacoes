import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Licitacao {
  id: string
  status: string
  valor_final: number
  modalidade: string
  orgaos?: { razao_social: string }
}

export default function Relatorios() {
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [dadosStatus, setDadosStatus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

  useEffect(() => {
    carregarDados()
  }, [])

  async function carregarDados() {
    setLoading(true)
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')

    if (!error && data) {
      const formatadas = data.map((l: any) => ({
        ...l,
        orgaos: Array.isArray(l.orgaos) ? l.orgaos[0] : l.orgaos
      }))
      setLicitacoes(formatadas)

      const statusMap = new Map<string, number>()
      formatadas.forEach(l => {
        const st = l.status || 'Não informado'
        statusMap.set(st, (statusMap.get(st) || 0) + 1)
      })
      setDadosStatus(Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })))
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '30px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#1e293b', marginBottom: '30px' }}>Relatórios e Indicadores</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '20px', color: '#64748b' }}>Distribuição por Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie 
                data={dadosStatus} 
                cx="50%" 
                cy="50%" 
                labelLine={false} 
                // Correção Crítica: Adicionado (percent || 0) para evitar erro no build
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`} 
                outerRadius={80} 
                dataKey="value"
              >
                {dadosStatus.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
          <h3 style={{ marginBottom: '20px', color: '#64748b' }}>Resumo Geral</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <p><strong>Total de Processos:</strong> {licitacoes.length}</p>
            <p><strong>Valor Total Ganho:</strong> {licitacoes.filter(l => l.status === 'Ganha').reduce((acc, l) => acc + (l.valor_final || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        </div>
      </div>
    </div>
  )
}