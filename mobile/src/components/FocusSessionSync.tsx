import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { focusKeys, focusService } from '@/services/focusService'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'

export function FocusSessionSync() {
  const authStatus = useAuthStore((state) => state.status)
  const hydrated = useTimerStore((state) => state.hydrated)
  const setSession = useTimerStore((state) => state.setSession)
  const phase = useTimerStore((state) => state.phase)
  const query = useQuery({
    queryKey: focusKeys.active,
    queryFn: focusService.active,
    enabled: authStatus === 'authenticated' && hydrated,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (!query.isSuccess) return
    if (query.data) void setSession(query.data)
    else if (phase === 'FOCUS') void setSession(null)
  }, [phase, query.data, query.isSuccess, setSession])
  return null
}
