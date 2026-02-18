import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from 'recharts'

// Interfaces Refinadas
interface Licitacao {
  id: string
  identificacao: string
  status: string
  valor_final?: number
  created_at?: string
  data_limite_participacao?: string
}

interface Certidao {
  id: string
  nome_certidao: string
  vencimento: string
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  // Estados com tipos garantidos
  const [metrics, setMetrics] = useState({
    total: 0, ganhas: 0, perdidas: 0, analisadas: 0, declinadas: 0,
    valorGanho: 0, certidoesVencer: 0, contratos: 0, valorContratos: 0
  })

  const [dadosStatus, setDadosStatus] = useState<any[]>([])
  const [dadosEvolucao, setDadosEvolucao] = useState<any[]>([])
  const [proximasCertidoes, setProximasCertidoes] = useState<Certidao[]>([])
  const [proximasLicitacoes, setProximasLicitacoes] = useState<Licitacao[]>([])

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

  useEffect(() => {
    async function carregarDados() {
      setLoading(true)
      try {
        // 1. Verificação de Admin
        if (user) {
          const { data } = await supabase.from('perfis').select('nivel_acesso').eq('id', user.id).maybeSingle()
          if (data?.nivel_acesso === 'admin') setIsAdmin(true)
        }

        // 2. Busca de Licitações com Tratamento de Erros
        const { data: licitacoes } = await supabase.from('licitacoes').select('*')
        const listaLicitacoes: Licitacao[] = licitacoes || []

        const ganhas = listaLicitacoes.filter(l => l.status === 'Ganha')
        const statusAnalise = ['Edital em Análise', 'Em precificação', 'Aguardando Cadastramento da Proposta', 'Aguardando Sessão']
        
        // 3. Cálculos Seguros (Evitando NaN no Deploy)
        const valorGanho = ganhas.reduce((acc, l) => acc + (Number(l.valor_final) || 0), 0)

        // Gráfico de Status
        const statusMap = new Map<string, number>()
        listaLicitacoes.forEach(l => {
          const st = l.status || 'Não informado'
          statusMap.set(st, (statusMap.get(st) || 0) + 1)
        })

        // Evolução Mensal Segura
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const evolucao = meses.map((nome, idx) => {
          const criadas = listaLicitacoes.filter(l => l.created_at && new Date(l.created_at).getMonth() === idx).length
          const ganhasMes = listaLicitacoes.filter(l => l.status === 'Ganha' && l.created_at && new Date(l.created_at).getMonth() === idx).length
          return { nome, criadas, ganhas: ganhasMes }
        })

        // 4. Prazos e Alertas
        const hoje = new Date(); hoje.setHours(0,0,0,0)
        const limite15 = new Date(); limite15.setDate(hoje.getDate() + 15)
        
        const { data: certs } = await supabase.from('certidoes').select('*')
          .gte('vencimento', hoje.toISOString().split('T')[0])
          .lte('vencimento', limite15.toISOString().split('T')[0])
          .order('vencimento', { ascending: true }).limit(5)

        const { data: contratos } = await supabase.from('contratos').select('valor_total')
        const vContratos = contratos?.reduce((acc, c) => acc + (Number(c.valor_total) || 0), 0) || 0

        setMetrics({
          total: listaLicitacoes.length,
          ganhas: ganhas.length,
          perdidas: listaLicitacoes.filter(l => l.status === 'Perdida').length,
          analisadas: listaLicitacoes.filter(l => statusAnalise.includes(l.status)).length,
          declinadas: listaLicitacoes.filter(l => l.status === 'Declinada').length,
          valorGanho,
          certidoesVencer: certs?.length || 0,
          contratos: contratos?.length || 0,
          valorContratos: vContratos
        })

        setDadosStatus(Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })))
        setDadosEvolucao(evolucao)
        setProximasCertidoes(certs || [])
        
      } catch (err) {
        console.error("Erro no Dashboard:", err)
      } finally {
        setLoading(false)
      }
    }
    carregarDados()
  }, [user])

  if (loading) return <div style={centerStyle}>Sincronizando dados da Nordeste...</div>

  const taxaConversao = metrics.total > 0 ? ((metrics.ganhas / (metrics.ganhas + metrics.perdidas || 1)) * 100).toFixed(1) : '0'

  return (
    <div style={{ padding: '30px', maxWidth: '1600px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header Profissional */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ margin: 0, color: '#1e293b', fontSize: '24px' }}>Painel de Controle</h1>
          <p style={{ margin: 0, color: '#64748b' }}>Bem-vindo, {user?.email}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {isAdmin && (
            <Link href="/acessos">
              <button style={{ padding: '10px 20px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>🔐 Acessos</button>
            </Link>
          )}
          <button onClick={signOut} style={{ padding: '10px 20px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Sair</button>
        </div>
      </div>

      {/* Grid de Métricas High-End */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <MetricCard title="Total de Licitações" value={metrics.total} color="#3b82f6" icon="📊" />
        <MetricCard title="Taxa de Vitória" value={`${taxaConversao}%`} color="#10b981" icon="🏆" />
        <MetricCard title="Valor Total Ganho" value={metrics.valorGanho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} color="#f59e0b" icon="💰" />
        <MetricCard title="Contratos Ativos" value={metrics.contratos} subtitle={`${(metrics.valorContratos / 1e6).toFixed(1)}M em carteira`} color="#8b5cf6" icon="📜" />
      </div>

      {/* Gráficos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px', marginBottom: '40px' }}>
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Distribuição de Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={dadosStatus} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {dadosStatus.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Desempenho Mensal (Criadas vs Ganhas)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dadosEvolucao}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="nome" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="criadas" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} name="Criadas" />
              <Line type="monotone" dataKey="ganhas" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} name="Ganhas" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alertas Rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <AlertBox title="⚠️ Certidões Próximas do Vencimento" data={proximasCertidoes} type="cert" />
        <div style={chartCardStyle}>
          <h3 style={chartTitleStyle}>Ações Rápidas</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <QuickBtn href="/licitacoes/novo" label="Nova Licitação" color="#3b82f6" />
            <QuickBtn href="/certidoes/novo" label="Nova Certidão" color="#10b981" />
            <QuickBtn href="/contratos/novo" label="Novo Contrato" color="#8b5cf6" />
            <QuickBtn href="/recebimentos/novo" label="Novo Recebimento" color="#f59e0b" />
          </div>
        </div>
      </div>
    </div>
  )
}

// Sub-componentes Estilizados
function MetricCard({ title, value, subtitle, color, icon }: any) {
  return (
    <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', borderLeft: `6px solid ${color}` }}>
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>{icon}</div>
      <div style={{ color: '#64748b', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase' }}>{title}</div>
      <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1e293b', margin: '5px 0' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '12px', color: '#94a3b8' }}>{subtitle}</div>}
    </div>
  )
}

function AlertBox({ title, data, type }: any) {
  return (
    <div style={{ ...chartCardStyle, borderTop: '4px solid #f59e0b' }}>
      <h3 style={chartTitleStyle}>{title}</h3>
      {data.length > 0 ? (
        data.map((item: any) => (
          <div key={item.id} style={{ padding: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: '600' }}>{item.nome_certidao || item.identificacao}</span>
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{item.vencimento ? new Date(item.vencimento).toLocaleDateString('pt-BR') : '—'}</span>
          </div>
        ))
      ) : <p style={{ color: '#94a3b8' }}>Tudo em dia por aqui!</p>}
    </div>
  )
}

function QuickBtn({ href, label, color }: any) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{ padding: '15px', backgroundColor: color, color: 'white', borderRadius: '12px', textAlign: 'center', fontWeight: 'bold', cursor: 'pointer' }}>{label}</div>
    </Link>
  )
}

const chartCardStyle = { backgroundColor: 'white', padding: '25px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }
const chartTitleStyle = { margin: '0 0 20px 0', fontSize: '16px', color: '#1e293b' }
const centerStyle = { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#64748b', fontWeight: 'bold' }