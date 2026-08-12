import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTodayKey } from '@/hooks/useTodayKey'
import { useAuthStore } from '@/store/authStore'

export function DayBoundarySync() {
  const queryClient = useQueryClient()
  const today = useTodayKey()
  const authenticated = useAuthStore((state) => state.status === 'authenticated')
  const previousDay = useRef(today)

  useEffect(() => {
    if (previousDay.current === today) return
    previousDay.current = today
    if (!authenticated) return
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['habits'] }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
    ])
  }, [authenticated, queryClient, today])

  return null
}
