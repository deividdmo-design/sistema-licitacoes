import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'

interface ContratoFormProps {
  contratoId?: string
}

// 1. Ajuste na Interface: Permitindo que orgaos venha como array ou objeto único
interface Licitacao {
  id: string
  identificacao: string
  orgaos?: { razao_social: string } | { razao_social: string }[]
}

export default function ContratoForm({ contratoId }: ContratoFormProps) {
  const router = useRouter()
  const [licitacoes, setLicitacoes] = useState<Licitacao[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [orgaoSelecionado, setOrgaoSelecionado] = useState('')
  const [formData, setFormData] = useState({
    licitacao_id: '',
    numero_contrato: '',
    numero_processo: '',
    responsavel: '',
    objeto: '',
    valor_total: '',
    valor_aditivo: '',
    data_assinatura: '',
    vigencia_inicio: '',
    vigencia_fim: '',
    observacoes: '',
    arquivo_url: ''
  })

  useEffect(() => {
    carregarLicitacoes()
    if (contratoId) carregarContrato()
  }, [contratoId])

  async function carregarLicitacoes() {
    const { data } = await supabase
      .from('licitacoes')
      .select('id, identificacao, orgaos(razao_social)')
      .order('identificacao')
    
    // 2. Correção Crítica: Garantindo que o orgao seja tratado corretamente, seja array ou não
    const dataFormatada = data?.map((item: any) => ({
      ...item,
      orgaos: Array.isArray(item.orgaos) ? item.orgaos[0] : item.orgaos
    }))

    setLicitacoes(dataFormatada || [])
  }

  async function carregarContrato() {
    setLoading(true)
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', contratoId)
      .single()
    if (error) alert('Erro ao carregar contrato')
    else if (data) {
      setFormData({
        licitacao_id: data.licitacao_id || '',
        numero_contrato: data.numero_contrato || '',
        numero_processo: data.numero_processo || '',
        responsavel: data.responsavel || '',
        objeto: data.objeto || '',
        valor_total: data.valor_total ? data.valor_total.toString().replace('.', ',') : '',
        valor_aditivo: data.valor_aditivo ? data.valor_aditivo.toString().replace('.', ',') : '',
        data_assinatura: data.data_assinatura || '',
        vigencia_inicio: data.vigencia_inicio || '',
        vigencia_fim: data.vigencia_fim || '',
        observacoes: data.observacoes || '',
        arquivo_url: data.arquivo_url || ''
      })
      if (data.licitacao_id) {
        const { data: lic } = await supabase
          .from('licitacoes')
          .select('orgaos(razao_social)')
          .eq('id', data.licitacao_id)
          .single()
        
        // 3. Ajuste no carregamento individual do órgão
        const orgaoData: any = lic?.orgaos
        const nomeOrgao = Array.isArray(orgaoData) ? orgaoData[0]?.razao_social : orgaoData?.razao_social
        setOrgaoSelecionado(nomeOrgao || '')
      }
    }
    setLoading(false)
  }

  const handleLicitacaoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const licId = e.target.value
    setFormData({ ...formData, licitacao_id: licId })
    const lic = licitacoes.find(l => l.id === licId)
    
    // Tratamento para exibição segura da razão social
    const orgaoData: any = lic?.orgaos
    const nomeOrgao = Array.isArray(orgaoData) ? orgaoData[0]?.razao_social : orgaoData?.razao_social
    setOrgaoSelecionado(nomeOrgao || '')
  }

  // ... (restante do código permanece igual)