import { Redirect } from 'expo-router'
import { LoadingScreen } from '@/components/LoadingScreen'
import { useAuthStore } from '@/store/authStore'

export default function IndexRoute() {
  const status = useAuthStore((state) => state.status)
  if (status === 'loading') return <LoadingScreen />
  return <Redirect href={status === 'authenticated' ? '/(tabs)' : '/login'} />
}
