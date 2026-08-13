import { useEffect, useRef } from 'react'
import { useNetInfo } from '@react-native-community/netinfo'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTimerTicker } from '@/hooks/useTimerTicker'
import { getApiError } from '@/services/apiClient'
import { focusKeys, focusService } from '@/services/focusService'
import { habitKeys } from '@/services/habitService'
import { projectKeys } from '@/services/projectService'
import { settingsKeys, settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'

export function FocusSessionSync() {
  const queryClient = useQueryClient()
  const network = useNetInfo()
  const authStatus = useAuthStore((state) => state.status)
  const hydrated = useTimerStore((state) => state.hydrated)
  const setSession = useTimerStore((state) => state.setSession)
  const completeFocus = useTimerStore((state) => state.completeFocus)
  const finishBreak = useTimerStore((state) => state.finishBreak)
  const setCompletionError = useTimerStore((state) => state.setCompletionError)
  const completionRetryNonce = useTimerStore((state) => state.completionRetryNonce)
  const phase = useTimerStore((state) => state.phase)
  const breakExpectedEndAt = useTimerStore((state) => state.breakExpectedEndAt)
  const { session, remainingSeconds } = useTimerTicker()
  const completing = useRef<string | null>(null)
  const query = useQuery({
    queryKey: focusKeys.active,
    queryFn: focusService.active,
    enabled: authStatus === 'authenticated' && hydrated,
    refetchInterval: 60_000,
  })
  const settings = useQuery({
    queryKey: settingsKeys.settings,
    queryFn: settingsService.get,
    enabled: authStatus === 'authenticated' && hydrated,
  })

  useEffect(() => {
    if (!query.isSuccess) return
    if (query.data && completing.current !== query.data.id) void setSession(query.data)
    else if (phase === 'FOCUS' && completing.current === null) void setSession(null)
  }, [phase, query.data, query.isSuccess, setSession])

  useEffect(() => {
    const online = Boolean(network.isConnected && network.isInternetReachable !== false)
    if (!online || authStatus !== 'authenticated' || phase !== 'FOCUS' || !session || session.status !== 'RUNNING' || remainingSeconds > 0) return
    if (completing.current === session.id) return
    completing.current = session.id
    setCompletionError(null)
    void (async () => {
      try {
        const completed = await focusService.complete(session.id)
        const config = settings.data ?? { defaultBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 }
        queryClient.setQueryData(focusKeys.active, null)
        await completeFocus(completed.id, config.defaultBreakMinutes, config.longBreakMinutes, config.sessionsBeforeLongBreak)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: focusKeys.all }),
          queryClient.invalidateQueries({ queryKey: habitKeys.all }),
          queryClient.invalidateQueries({ queryKey: projectKeys.all }),
          queryClient.invalidateQueries({ queryKey: ['analytics'] }),
        ])
      } catch (error) {
        // Keep the server-backed session visible; reconnect or the explicit retry action can try again.
        completing.current = null
        setCompletionError(getApiError(error, 'Chưa thể xác nhận phiên đã hoàn thành. Kiểm tra kết nối rồi thử lại.'))
      }
    })()
  }, [authStatus, completeFocus, completionRetryNonce, network.isConnected, network.isInternetReachable, phase, queryClient, remainingSeconds, session, setCompletionError, settings.data])

  useEffect(() => {
    const expectedEnd = breakExpectedEndAt ? Date.parse(breakExpectedEndAt) : Number.NaN
    if ((phase === 'SHORT_BREAK' || phase === 'LONG_BREAK') && Number.isFinite(expectedEnd) && expectedEnd <= Date.now()) void finishBreak()
  }, [breakExpectedEndAt, finishBreak, phase, remainingSeconds])

  return null
}
