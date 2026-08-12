import { Redirect, Stack } from 'expo-router'
import { useAuthStore } from '@/store/authStore'

export default function HabitsLayout() {
  const status = useAuthStore((state) => state.status)
  if (status === 'anonymous') return <Redirect href="/login" />
  return <Stack screenOptions={{ headerShown: false }} />
}
