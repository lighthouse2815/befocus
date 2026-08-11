import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useAuthBootstrap } from './hooks/useAuth'
import { OfflineBanner } from './components/OfflineBanner'
import { PreferencesSync } from './components/PreferencesSync'

export default function App() {
  useAuthBootstrap()
  return (
    <>
      <OfflineBanner />
      <PreferencesSync />
      <RouterProvider router={router} />
    </>
  )
}
