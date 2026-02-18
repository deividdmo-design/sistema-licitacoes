import { useRouter } from 'next/router'
import ClienteForm from '../../../components/ClienteForm'

export default function EditarOrgao() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <ClienteForm clienteId={id} />
}