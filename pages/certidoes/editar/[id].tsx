import { useRouter } from 'next/router'
import CertidaoForm from '../../../components/CertidaoForm'

export default function EditarCertidao() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <CertidaoForm certidaoId={id} />
}