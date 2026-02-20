import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import Link from 'next/link'

interface LicitacaoPendente {
  id: string
  identificacao: string
  objeto: string
  data_limite_participacao: string
}

export default function NotificacaoLicitacao() {
  const { user } = useAuth()
  const [notificacoes, setNotificacoes] = useState<LicitacaoPendente[]>([])
  const [loadingAction, setLoadingAction] = useState(false)

  useEffect(() => {
    if (user) buscarNotificacoes()
  }, [user])

  async function buscarNotificacoes() {
    if (!user) return

    try {
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      const daqui5Dias = new Date()
      daqui5Dias.setDate(hoje.getDate() + 5)
      
      const { data: licitacoes, error: errorLic } = await supabase
        .from('licitacoes')
        .select('id, identificacao, objeto, data_limite_participacao')
        .gte('data_limite_participacao', hoje.toISOString().split('T')[0])
        .lte('data_limite_participacao', daqui5Dias.toISOString().split('T')[0])
        .order('data_limite_participacao', { ascending: true })

      if (errorLic || !licitacoes) return

      const { data: lidas, error: errorLidas } = await supabase
        .from('notificacoes_lidas')
        .select('licitacao_id')
        .eq('usuario_id', user.id)

      if (errorLidas) return

      const idsLidos = lidas?.map(item => item.licitacao_id) || []
      const pendentes = licitacoes.filter(lic => !idsLidos.includes(lic.id))
      
      setNotificacoes(pendentes)
    } catch (error) {
      console.error('Erro ao buscar notificações', error)
    }
  }

  async function marcarComoCiente(licitacaoId: string) {
    if (!user) return
    setLoadingAction(true)
    try {
      await supabase.from('notificacoes_lidas').insert([{ usuario_id: user.id, licitacao_id: licitacaoId }])
      setNotificacoes(prev => prev.filter(n => n.id !== licitacaoId))
    } finally {
      setLoadingAction(false)
    }
  }

  function formatarData(dataISO: string) {
    if (!dataISO) return ''
    const [ano, mes, dia] = dataISO.split('-')
    return `${dia}/${mes}/${ano}`
  }

  if (notificacoes.length === 0) return null
  const notificacaoAtual = notificacoes[0]

  return (
    <div style={{
      position: 'fixed', bottom: '30px', right: '30px', width: '350px',
      background: '#ffffff', boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      borderRadius: '12px', borderLeft: '6px solid #ef4444',
      padding: '20px', zIndex: 9999, fontFamily: 'sans-serif',
      animation: 'slideIn 0.5s ease-out'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <span style={{ fontSize: '1.5rem' }}>🚨</span>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Sessão Urgente!</h3>
      </div>
      
      <div style={{ marginBottom: '15px', color: '#475569', fontSize: '0.9rem' }}>
        <p style={{ margin: '0 0 5px 0' }}><strong>Ref:</strong> {notificacaoAtual.identificacao}</p>
        <p style={{ margin: '0 0 5px 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          <strong>Objeto:</strong> {notificacaoAtual.objeto}
        </p>
        <p style={{ margin: '0', color: '#d97706', fontWeight: 'bold' }}>
          <strong>Limite:</strong> {formatarData(notificacaoAtual.data_limite_participacao)}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => marcarComoCiente(notificacaoAtual.id)} disabled={loadingAction}
          style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '6px', cursor: loadingAction ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
          {loadingAction ? '...' : '✔️ Estou Ciente'}
        </button>
        <Link href={`/licitacoes`} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '10px 15px', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
            Detalhes
          </button>
        </Link>
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  )
}