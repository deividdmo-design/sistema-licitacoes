import '../styles/globals.css'
import { AuthProvider } from '../contexts/AuthContext'
import PrivateRoute from '../components/PrivateRoute'
import Layout from '../components/Layout'
import { useRouter } from 'next/router'

const publicRoutes = ['/login']

function MyApp({ Component, pageProps }: any) {
  const router = useRouter()

  return (
    <AuthProvider>
      {publicRoutes.includes(router.pathname) ? (
        <Component {...pageProps} />
      ) : (
        <PrivateRoute>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </PrivateRoute>
      )}
    </AuthProvider>
  )
}

export default MyApp