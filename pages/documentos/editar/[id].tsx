import { useRouter } from 'next/router'
import DocumentoForm from '../../../components/DocumentoForm'

export default function EditarDocumento() {
  const router = useRouter()
  const { id } = router.query

  if (!id || typeof id !== 'string') return <p>Carregando...</p>

  return <DocumentoForm documentoId={id} />
}