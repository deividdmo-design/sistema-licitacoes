import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import CryptoJS from 'crypto-js'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Acesso {
  id: string
  sistema: string
  login: string
  senha_criptografada: string
  url: string | null
  observacoes: string | null
}

const PAGE_SIZE = 20

export default function ListaAcessos() {
  const [acessos, setAcessos] = useState<Acesso[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [senhasVisiveis, setSenhasVisiveis] = useState<{ [key: string]: boolean }>({})

  const carregarAcessos = async (reset = false) => {
    const from = reset ? 0 : page * PAGE_SIZE
    const to = from + PAGE_SIZE - 1

    setLoading(reset)
    setLoadingMore(!reset)

    const { data, error } = await supabase
      .from('acessos')
      .select('*')
      .order('sistema')
      .range(from, to)

    if (error) {
      console.error(error)
    } else {
      if (reset) {
        setAcessos(data || [])
        setPage(1)
      } else {
        setAcessos(prev => [...prev, ...(data || [])])
        setPage(prev => prev + 1)
      }
      setHasMore(data && data.length === PAGE_SIZE)
    }

    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    carregarAcessos(true)
  }, [])

  async function excluirAcesso(id: string) {
    if (!confirm('Tem certeza que deseja excluir este acesso?')) return
    const { error } = await supabase.from('acessos').delete().eq('id', id)
    if (error) alert('Erro ao excluir: ' + error.message)
    else carregarAcessos(true)
  }

  function descriptografarSenha(senhaCripto: string) {
    try {
      const bytes = CryptoJS.AES.decrypt(senhaCripto, process.env.NEXT_PUBLIC_CRYPTO_SECRET!)
      return bytes.toString(CryptoJS.enc.Utf8)
    } catch {
      return 'Erro ao descriptografar'
    }
  }

  const toggleSenha = (id: string) => {
    setSenhasVisiveis(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const copiarAcesso = (acesso: Acesso) => {
    const senha = descriptografarSenha(acesso.senha_criptografada)
    const texto = `
Sistema: ${acesso.sistema}
Login: ${acesso.login}
Senha: ${senha}
URL: ${acesso.url || 'N/A'}
Observações: ${acesso.observacoes || 'N/A'}
    `.trim()
    navigator.clipboard.writeText(texto).then(() => {
      alert('Dados copiados para a área de transferência!')
    }).catch(() => {
      alert('Erro ao copiar.')
    })
  }

  const exportarExcel = () => {
    const dadosParaExportar = acessos.map(acesso => ({
      Sistema: acesso.sistema,
      Login: acesso.login,
      Senha: descriptografarSenha(acesso.senha_criptografada),
      URL: acesso.url || '',
      Observações: acesso.observacoes || ''
    }))
    const ws = XLSX.utils.json_to_sheet(dadosParaExportar)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Acessos')
    XLSX.writeFile(wb, 'acessos.xlsx')
  }

  const exportarPDF = () => {
    const doc = new jsPDF()
    const dados = acessos.map(acesso => [
      acesso.sistema,
      acesso.login,
      descriptografarSenha(acesso.senha_criptografada),
      acesso.url || '',
      acesso.observacoes || ''
    ])
    autoTable(doc, {
      head: [['Sistema', 'Login', 'Senha', 'URL', 'Observações']],
      body: dados,
    })
    doc.save('acessos.pdf')
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <h1>Gerenciamento de Acessos a Portais</h1>

      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <Link href="/acessos/novo">
          <button style={{ padding: '10px 20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            Novo Acesso
          </button>
        </Link>
        <button onClick={exportarExcel} style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Exportar Excel
        </button>
        <button onClick={exportarPDF} style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
          Exportar PDF
        </button>
      </div>

      {loading && page === 0 ? (
        <p>Carregando...</p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>Sistema</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Login</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Senha</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>URL</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Observações</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {acessos.map((acesso) => (
                <tr key={acesso.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{acesso.sistema}</td>
                  <td style={{ padding: '10px' }}>{acesso.login}</td>
                  <td style={{ padding: '10px' }}>
                    {senhasVisiveis[acesso.id] ? (
                      <span>{descriptografarSenha(acesso.senha_criptografada)}</span>
                    ) : (
                      '••••••••'
                    )}
                    <button onClick={() => toggleSenha(acesso.id)} style={{ marginLeft: '5px' }}>
                      {senhasVisiveis[acesso.id] ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </td>
                  <td style={{ padding: '10px' }}>
                    {acesso.url ? (
                      <a href={acesso.url} target="_blank" rel="noopener noreferrer">Link</a>
                    ) : '-'}
                  </td>
                  <td style={{ padding: '10px' }}>{acesso.observacoes}</td>
                  <td style={{ padding: '10px' }}>
                    <button onClick={() => copiarAcesso(acesso)} style={{ marginRight: '5px' }} title="Copiar dados">
                      📋 Copiar
                    </button>
                    <Link href={`/acessos/editar/${acesso.id}`}>
                      <button style={{ marginRight: '5px' }}>Editar</button>
                    </Link>
                    <button onClick={() => excluirAcesso(acesso.id)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasMore && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => carregarAcessos()}
                disabled={loadingMore}
                style={{ padding: '10px 20px', cursor: 'pointer' }}
              >
                {loadingMore ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}