import { useMemo } from 'react'
import { useAuthStore } from '@/store/authStore'
import { toDateKeyInTimeZone } from '@/utils/date'

export function useTodayKey() {
  const timezone = useAuthStore((state) => state.user?.timezone ?? 'UTC')
  return useMemo(() => toDateKeyInTimeZone(timezone), [timezone])
}
