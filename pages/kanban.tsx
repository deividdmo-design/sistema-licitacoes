import { useEffect, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'
import { SortableItem } from '../components/SortableItem'
import Link from 'next/link'

// 1. COMPONENTE DE COLUNA (Área de drop)
function DroppableColumn({ id, children, coluna }: any) {
  const { setNodeRef } = useDroppable({ id });
  
  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: '300px',
        maxWidth: '350px',
        background: coluna.cor,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        borderTop: `4px solid ${coluna.corBorda}`,
        display: 'flex',
        flexDirection: 'column',
        height: 'fit-content'
      }}
    >
      {children}
    </div>
  );
}

// 2. CONFIGURAÇÃO DAS COLUNAS
const colunas = [
  { id: 'Edital em Análise', titulo: '📋 Em Análise', status: ['Edital em Análise'], cor: '#e3f2fd', corBorda: '#2196f3' },
  { id: 'Em precificação', titulo: '💰 Em Precificação', status: ['Em precificação'], cor: '#fff3cd', corBorda: '#ffc107' },
  { id: 'Aguardando Sessão', titulo: '⏳ Aguardando Sessão', status: ['Aguardando Sessão', 'Aguardando Cadastramento da Proposta'], cor: '#d1ecf1', corBorda: '#17a2b8' },
  { id: 'Em andamento', titulo: '⚙️ Em Andamento', status: ['Em andamento'], cor: '#cce5ff', corBorda: '#007bff' },
  { id: 'Ganha', titulo: '🏆 Ganha', status: ['Ganha'], cor: '#d4edda', corBorda: '#28a745' },
];

// 3. COMPONENTE PRINCIPAL (Exportação Padrão)
export default function KanbanPage() {
  const { user } = useAuth()
  const [licitacoes, setLicitacoes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  useEffect(() => { 
    carregarLicitacoes() 
  }, [])

  async function carregarLicitacoes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('licitacoes')
      .select('*, orgaos(razao_social)')
      .order('data_limite_participacao', { ascending: false })
    
    if (error) console.error('Erro ao carregar:', error)
    else setLicitacoes(data || [])
    setLoading(false)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return

    const licitacaoId = active.id as string
    const novoStatus = over.id as string

    // Atualização visual instantânea
    setLicitacoes(prev => prev.map(l => l.id === licitacaoId ? { ...l, status: novoStatus } : l))

    // Persistência no banco
    const { error } = await supabase
      .from('licitacoes')
      .update({ status: novoStatus })
      .eq('id', licitacaoId)
    
    if (error) {
      console.error('Erro ao salvar no banco:', error)
      carregarLicitacoes()
    }
  }

  if (loading) return <div style={{ padding: '50px', textAlign: 'center' }}>Carregando Quadro...</div>

  return (
    <div style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>📌 Kanban de Licitações</h1>
        <Link href="/dashboard" style={{ textDecoration: 'none', color: '#666' }}>← Voltar ao Painel</Link>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '30px' }}>
          {colunas.map((coluna) => {
            const itensDaColuna = licitacoes.filter((l) => coluna.status.includes(l.status))
            
            return (
              <DroppableColumn key={coluna.id} id={coluna.id} coluna={coluna}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>{coluna.titulo}</h3>
                  <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>{itensDaColuna.length}</span>
                </div>
                
                <SortableContext items={itensDaColuna.map(l => l.id)} strategy={verticalListSortingStrategy}>
                  <div style={{ minHeight: '100px' }}>
                    {itensDaColuna.map((lic) => (
                      <SortableItem key={lic.id} id={lic.id}>
                        <div style={{ 
                          background: 'white', 
                          padding: '12px', 
                          borderRadius: '8px', 
                          marginBottom: '10px', 
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          borderLeft: `4px solid ${coluna.corBorda}`
                        }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{lic.identificacao}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{lic.orgaos?.razao_social}</div>
                          <div style={{ color: '#28a745', fontWeight: 'bold', marginTop: '8px', fontSize: '0.9rem' }}>
                            {lic.valor_estimado?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DroppableColumn>
            )
          })}
        </div>
      </DndContext>
    </div>
  )
}