import { useRouter } from 'next/router'
import ContratoForm from '../../../components/ContratoForm'

export default function EditarContrato() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <ContratoForm contratoId={id} />
}