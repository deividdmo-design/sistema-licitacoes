import { useRouter } from 'next/router'
import AcessoForm from '../../../components/AcessoForm'

export default function EditarAcesso() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <AcessoForm acessoId={id} />
}
