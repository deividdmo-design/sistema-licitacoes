import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import Link from 'next/link'
import { useAuth } from '../contexts/AuthContext'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend
} from 'recharts'

// Interfaces
interface Licitacao {
  id: string
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

  // Estatísticas principais
  const [totalLicitacoes, setTotalLicitacoes] = useState(0)
  const [ganhas, setGanhas] = useState(0)
  const [perdidas, setPerdidas] = useState(0)
  const [analisadas, setAnalisadas] = useState(0)
  const [declinadas, setDeclinadas] = useState(0)
  const [valorTotalGanho, setValorTotalGanho] = useState(0)
  const [certidoesAVencer, setCertidoesAVencer] = useState(0)
  const [totalContratos, setTotalContratos] = useState(0)
  const [valorTotalContratos, setValorTotalContratos] = useState(0)

  // Dados para gráficos
  const [dadosStatus, setDadosStatus] = useState<any[]>([])
  const [dadosMensais, setDadosMensais] = useState<any[]>([])
  const [dadosEvolucao, setDadosEvolucao] = useState<any[]>([])

  // Listas detalhadas
  const [proximasCertidoes, setProximasCertidoes] = useState<Certidao[]>([])
  const [proximasLicitacoes, setProximasLicitacoes] = useState<any[]>([])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B']

  useEffect(() => {
    async function carregarDados() {
      setLoading(true)

      // Verificar perfil admin
      if (user) {
        const { data } = await supabase
          .from('perfis')
          .select('nivel_acesso')
          .eq('id', user.id)
          .maybeSingle()
        if (data?.nivel_acesso === 'admin') setIsAdmin(true)
      }

      // ---------- Licitações ----------
      const { data: licitacoes, error } = await supabase
        .from('licitacoes')
        .select('status, valor_final, created_at, data_limite_participacao, id, identificacao')

      if (error) console.error(error)
      else {
        setTotalLicitacoes(licitacoes.length)

        const ganhasCount = licitacoes.filter(l => l.status === 'Ganha').length
        const perdidasCount = licitacoes.filter(l => l.status === 'Perdida').length
        const statusAnalise = ['Edital em Análise', 'Em precificação', 'Aguardando Cadastramento da Proposta', 'Aguardando Sessão']
        const analisadasCount = licitacoes.filter(l => statusAnalise.includes(l.status)).length
        const declinadasCount = licitacoes.filter(l => l.status === 'Declinada').length

        setGanhas(ganhasCount)
        setPerdidas(perdidasCount)
        setAnalisadas(analisadasCount)
        setDeclinadas(declinadasCount)

        const totalValor = licitacoes
          .filter(l => l.status === 'Ganha')
          .reduce((acc, l) => acc + (l.valor_final || 0), 0)
        setValorTotalGanho(totalValor)

        // Gráfico pizza por status
        const statusMap = new Map<string, number>()
        licitacoes.forEach(l => {
          const st = l.status || 'Não informado'
          statusMap.set(st, (statusMap.get(st) || 0) + 1)
        })
        setDadosStatus(Array.from(statusMap.entries()).map(([name, value]) => ({ name, value })))

        // Gráfico barras mensal
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
        const mesCount = new Array(12).fill(0)
        const ganhasMes = new Array(12).fill(0)
        licitacoes.forEach(l => {
          let dataStr = l.data_limite_participacao || l.created_at
          if (dataStr) {
            const mes = new Date(dataStr).getMonth()
            mesCount[mes]++
            if (l.status === 'Ganha') ganhasMes[mes]++
          }
        })
        setDadosMensais(meses.map((nome, idx) => ({ nome, quantidade: mesCount[idx] })))

        // Gráfico de linha: evolução mensal (criadas vs ganhas)
        setDadosEvolucao(meses.map((nome, idx) => ({
          nome,
          criadas: mesCount[idx],
          ganhas: ganhasMes[idx]
        })))

        // Licitações com data limite próxima (7 dias)
        const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
        const limite = new Date(); limite.setDate(hoje.getDate() + 7)
        const proximas = licitacoes
          .filter(l => l.data_limite_participacao)
          .map(l => ({ ...l, dataObj: new Date(l.data_limite_participacao + 'T00:00:00') }))
          .filter(l => l.dataObj >= hoje && l.dataObj <= limite)
          .sort((a, b) => a.dataObj.getTime() - b.dataObj.getTime())
          .slice(0, 5)
        setProximasLicitacoes(proximas.map(({ id, identificacao, data_limite_participacao }) => ({
          id, identificacao, data_limite_participacao
        })))
      }

      // ---------- Certidões ----------
      const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
      const hojeISO = hoje.toISOString().split('T')[0]
      const limite15 = new Date(); limite15.setDate(hoje.getDate() + 15)
      const limite15ISO = limite15.toISOString().split('T')[0]

      const { count: certCount } = await supabase
        .from('certidoes')
        .select('*', { count: 'exact', head: true })
        .gte('vencimento', hojeISO)
        .lte('vencimento', limite15ISO)
      setCertidoesAVencer(certCount || 0)

      const { data: certs } = await supabase
        .from('certidoes')
        .select('id, nome_certidao, vencimento')
        .gte('vencimento', hojeISO)
        .lte('vencimento', limite15ISO)
        .order('vencimento', { ascending: true })
        .limit(5)
      setProximasCertidoes(certs || [])

      // ---------- Contratos ----------
      const { count: contratosCount } = await supabase
        .from('contratos')
        .select('*', { count: 'exact', head: true })
      setTotalContratos(contratosCount || 0)

      const { data: contratos } = await supabase
        .from('contratos')
        .select('valor_total')
      const totalContratosValor = contratos?.reduce((acc, c) => acc + (c.valor_total || 0), 0) || 0
      setValorTotalContratos(totalContratosValor)

      setLoading(false)
    }

    carregarDados()
  }, [user])

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  // Cálculo de percentuais
  const totalFinalizadas = ganhas + perdidas
  const taxaConversao = totalFinalizadas > 0 ? (ganhas / totalFinalizadas * 100).toFixed(1) : '0.0'
  const valorMedioGanho = ganhas > 0 ? valorTotalGanho / ganhas : 0

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Carregando dashboard...</div>
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Cabeçalho com usuário e logout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
        <h1 style={{ margin: 0 }}>Dashboard Nordeste</h1>
        <div>
          <span style={{ marginRight: '15px' }}>👤 {user?.email}</span>
          {isAdmin && (
            <Link href="/acessos">
              <button style={{ marginRight: '10px', padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                🔐 Gerenciar Acessos
              </button>
            </Link>
          )}
          <button onClick={signOut} style={{ padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Sair
          </button>
        </div>
      </div>

      {/* Cards de métricas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <MetricCard
          title="Licitações"
          value={totalLicitacoes}
          subtitle="Total cadastradas"
          color="#e3f2fd"
          tooltip="Número total de licitações no sistema"
        />
        <MetricCard
          title="Ganhas"
          value={ganhas}
          subtitle={`Taxa conversão ${taxaConversao}%`}
          color="#c8e6c9"
          tooltip="Licitações com status 'Ganha'"
        />
        <MetricCard
          title="Perdidas"
          value={perdidas}
          color="#ffccbc"
          tooltip="Licitações com status 'Perdida'"
        />
        <MetricCard
          title="Analisadas"
          value={analisadas}
          color="#fff3cd"
          tooltip="Licitações em análise (edital, precificação, proposta, sessão)"
        />
        <MetricCard
          title="Declinadas"
          value={declinadas}
          color="#d1c4e9"
          tooltip="Licitações com status 'Declinada'"
        />
        <MetricCard
          title="Valor Ganho"
          value={valorTotalGanho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          subtitle={`Médio: ${valorMedioGanho.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
          color="#ffe0b2"
          tooltip="Soma dos valores finais das licitações ganhas"
        />
        <MetricCard
          title="Contratos"
          value={totalContratos}
          subtitle={`R$ ${(valorTotalContratos / 1e6).toFixed(1)}M`}
          color="#b2dfdb"
          tooltip="Total de contratos e valor total contratado (em milhões)"
        />
        <MetricCard
          title="Certidões a Vencer"
          value={certidoesAVencer}
          subtitle="Próximos 15 dias"
          color="#f8d7da"
          tooltip="Certidões que vencem nos próximos 15 dias"
        />
      </div>

      {/* Gráficos superiores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Pizza de status */}
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h2>📊 Licitações por Status</h2>
          {dadosStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={dadosStatus} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent*100).toFixed(0)}%`} outerRadius={80} dataKey="value">
                  {dadosStatus.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p>Nenhuma licitação cadastrada.</p>}
        </div>

        {/* Evolução mensal (linha) */}
        <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '8px' }}>
          <h2>📈 Evolução Mensal</h2>
          {dadosEvolucao.some(d => d.criadas > 0 || d.ganhas > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosEvolucao}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="criadas" stroke="#8884d8" name="Criadas" />
                <Line type="monotone" dataKey="ganhas" stroke="#82ca9d" name="Ganhas" />
              </LineChart>
            </ResponsiveContainer>
          ) : <p>Dados insuficientes para o gráfico.</p>}
        </div>
      </div>

      {/* Listas de alerta lado a lado */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
        {/* Certidões a vencer */}
        <div style={{ background: '#fff3cd', padding: '20px', borderRadius: '8px' }}>
          <h2>⚠️ Certidões a Vencer (15 dias)</h2>
          {proximasCertidoes.length > 0 ? (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {proximasCertidoes.map(cert => (
                <li key={cert.id} style={{ marginBottom: '10px', borderBottom: '1px solid #ffe69b', paddingBottom: '5px' }}>
                  <Link href={`/certidoes/editar/${cert.id}`} style={{ textDecoration: 'none', color: '#856404' }}>
                    <strong>{cert.nome_certidao}</strong> – vence em {formatarData(cert.vencimento)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p>Nenhuma certidão próxima do vencimento.</p>}
          <Link href="/certidoes">
            <button style={smallButton}>Ver todas as certidões</button>
          </Link>
        </div>

        {/* Licitações com data limite próxima */}
        <div style={{ background: '#d1ecf1', padding: '20px', borderRadius: '8px' }}>
          <h2>⏰ Licitações com Data Limite (7 dias)</h2>
          {proximasLicitacoes.length > 0 ? (
            <ul style={{ padding: 0, listStyle: 'none' }}>
              {proximasLicitacoes.map(lic => (
                <li key={lic.id} style={{ marginBottom: '10px', borderBottom: '1px solid #bee5eb', paddingBottom: '5px' }}>
                  <Link href={`/licitacoes/editar/${lic.id}`} style={{ textDecoration: 'none', color: '#0c5460' }}>
                    <strong>{lic.identificacao}</strong> – limite em {formatarData(lic.data_limite_participacao)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : <p>Nenhuma licitação com data limite nos próximos 7 dias.</p>}
          <Link href="/licitacoes">
            <button style={smallButton}>Ver todas as licitações</button>
          </Link>
        </div>
      </div>

      {/* Botões de ação rápida */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
        <ActionButton href="/licitacoes/novo" bg="#28a745">➕ Nova Licitação</ActionButton>
        <ActionButton href="/certidoes/novo" bg="#28a745">📄 Nova Certidão</ActionButton>
        <ActionButton href="/contratos/novo" bg="#28a745">📑 Novo Contrato</ActionButton>
        <ActionButton href="/recebimentos/novo" bg="#28a745">💰 Novo Recebimento</ActionButton>
      </div>
    </div>
  )
}

// Componente para os cards de métrica
function MetricCard({ title, value, subtitle = '', color, tooltip }: { title: string; value: string | number; subtitle?: string; color: string; tooltip: string }) {
  const [showTooltip, setShowTooltip] = useState(false)
  return (
    <div
      style={{ background: color, padding: '20px', borderRadius: '8px', textAlign: 'center', position: 'relative', cursor: 'help' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <h3 style={{ margin: '0 0 5px', fontSize: '1rem' }}>{title}</h3>
      <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0 }}>{value}</p>
      {subtitle && <p style={{ fontSize: '0.85rem', margin: '5px 0 0', opacity: 0.8 }}>{subtitle}</p>}
      {showTooltip && <div style={tooltipStyle}>{tooltip}</div>}
    </div>
  )
}

// Estilo do tooltip
const tooltipStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#333',
  color: '#fff',
  padding: '5px 10px',
  borderRadius: '4px',
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
  zIndex: 1000,
  marginBottom: '8px'
}

// Botão pequeno para as listas
const smallButton: React.CSSProperties = {
  marginTop: '10px',
  padding: '6px 12px',
  background: '#0070f3',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer'
}

// Botão de ação rápida
function ActionButton({ href, children, bg }: { href: string; children: React.ReactNode; bg: string }) {
  return (
    <Link href={href}>
      <button style={{ padding: '10px 20px', background: bg, color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
        {children}
      </button>
    </Link>
  )
}