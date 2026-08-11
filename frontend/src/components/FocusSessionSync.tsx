import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from './Toast'
import { focusKeys, focusService } from '../services/focus'
import { habitKeys } from '../services/habits'
import { useTimerTicker } from '../hooks/useTimerTicker'
import { useTimerStore } from '../store/timerStore'

const automaticRequests = new Set<string>()

export function FocusSessionSync() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const hydrate = useTimerStore((state) => state.hydrate)
  const setSession = useTimerStore((state) => state.setSession)
  const completeFocus = useTimerStore((state) => state.completeFocus)
  const finishBreak = useTimerStore((state) => state.finishBreak)
  const hydrated = useTimerStore((state) => state.hydrated)
  const { session, phase, remainingSeconds } = useTimerTicker()
  const [reconnectAttempt, setReconnectAttempt] = useState(0)

  const activeQuery = useQuery({
    queryKey: focusKeys.active,
    queryFn: focusService.active,
  })

  const complete = useMutation({
    mutationFn: (sessionId: string) => focusService.complete(sessionId),
    onSuccess: (completed) => {
      completeFocus(completed.id)
      queryClient.setQueryData(focusKeys.active, null)
      void queryClient.invalidateQueries({ queryKey: focusKeys.all })
      void queryClient.invalidateQueries({ queryKey: habitKeys.all })
      notify(`Đã ghi nhận ${completed.actualDurationMinutes ?? 0} phút tập trung.`, 'success')
    },
    onError: () => {
      notify('Chưa thể xác nhận phiên đã hoàn thành. Dữ liệu timer vẫn được giữ lại.', 'error')
    },
  })

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!activeQuery.isSuccess) return
    if (activeQuery.data) {
      setSession(activeQuery.data)
      return
    }
    if (useTimerStore.getState().phase === 'FOCUS') setSession(null)
  }, [activeQuery.data, activeQuery.isSuccess, setSession])

  useEffect(() => {
    const retryWhenOnline = () => {
      if (session) automaticRequests.delete(session.id)
      setReconnectAttempt((value) => value + 1)
    }
    window.addEventListener('online', retryWhenOnline)
    return () => window.removeEventListener('online', retryWhenOnline)
  }, [session])

  useEffect(() => {
    if (!hydrated) return
    if ((phase === 'SHORT_BREAK' || phase === 'LONG_BREAK') && remainingSeconds === 0) {
      finishBreak()
    }
  }, [finishBreak, hydrated, phase, remainingSeconds])

  useEffect(() => {
    if (!hydrated || !session || session.status !== 'RUNNING' || remainingSeconds > 0) return
    if (!navigator.onLine || automaticRequests.has(session.id)) return
    automaticRequests.add(session.id)
    complete.mutate(session.id)
  }, [complete, hydrated, reconnectAttempt, remainingSeconds, session])

  return null
}
