import { useRouter } from 'next/router'
import LicitacaoForm from '../../../components/LicitacaoForm'

export default function EditarLicitacao() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <LicitacaoForm licitacaoId={id} />
}