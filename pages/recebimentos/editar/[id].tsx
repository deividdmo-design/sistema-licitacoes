import { useRouter } from 'next/router'
import RecebimentoForm from '../../../components/RecebimentoForm'

export default function EditarRecebimento() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <RecebimentoForm recebimentoId={id} />
}