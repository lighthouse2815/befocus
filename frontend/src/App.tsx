import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useAuthBootstrap } from './hooks/useAuth'
import { OfflineBanner } from './components/OfflineBanner'

export default function App() {
  useAuthBootstrap()
  return (
    <>
      <OfflineBanner />
      <RouterProvider router={router} />
    </>
  )
}
