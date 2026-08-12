import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, waitFor } from '@testing-library/react-native'
import { FocusSessionSync } from './FocusSessionSync'
import { focusService } from '@/services/focusService'
import { settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'
import type { FocusSession } from '@/types'

jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))

const active: FocusSession = {
  id: 'session-active', status: 'RUNNING', plannedDurationMinutes: 50, actualDurationMinutes: null,
  startedAt: '2099-08-13T10:00:00Z', expectedEndAt: '2099-08-13T10:50:00Z', pausedAt: null,
  totalPausedSeconds: 0, completedAt: null, cancelledAt: null, projectId: null, projectName: null,
  taskId: null, taskTitle: null, habitId: null, habitName: null, interruptions: [],
}

describe('FocusSessionSync integration', () => {
  afterEach(() => jest.restoreAllMocks())

  const settings = {
    defaultFocusMinutes: 25, defaultBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4,
    timezone: 'Asia/Ho_Chi_Minh', notificationsEnabled: true, browserNotifications: false,
    inAppNotifications: true, theme: 'SYSTEM' as const,
  }

  it('restores the server active session after secure auth and timer hydration', async () => {
    jest.spyOn(focusService, 'active').mockResolvedValue(active)
    jest.spyOn(settingsService, 'get').mockResolvedValue(settings)
    useAuthStore.setState({ status: 'authenticated' })
    useTimerStore.setState({ hydrated: true, session: null, phase: 'READY' })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const view = await render(<QueryClientProvider client={client}><FocusSessionSync /></QueryClientProvider>)

    await waitFor(() => expect(useTimerStore.getState().session?.id).toBe('session-active'))
    await view.unmount()
    client.clear()
  })

  it('completes an expired restored session globally without opening the Focus tab', async () => {
    const expired = { ...active, startedAt: '2020-08-13T10:00:00Z', expectedEndAt: '2020-08-13T10:50:00Z' }
    const completed = { ...expired, status: 'COMPLETED' as const, actualDurationMinutes: 50, completedAt: '2020-08-13T10:50:00Z' }
    jest.spyOn(focusService, 'active').mockResolvedValueOnce(expired).mockResolvedValue(null)
    const complete = jest.spyOn(focusService, 'complete').mockResolvedValue(completed)
    jest.spyOn(settingsService, 'get').mockResolvedValue(settings)
    useAuthStore.setState({ status: 'authenticated' })
    useTimerStore.setState({ hydrated: true, session: expired, phase: 'FOCUS', completedFocusCount: 0, lastCompletedSessionId: null, completionError: null, completionRetryNonce: 0 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const view = await render(<QueryClientProvider client={client}><FocusSessionSync /></QueryClientProvider>)

    await waitFor(() => expect(complete).toHaveBeenCalledWith('session-active'))
    await waitFor(() => expect(useTimerStore.getState()).toMatchObject({ session: null, phase: 'SHORT_BREAK', completedFocusCount: 1 }))
    await view.unmount()
    client.clear()
  })

  it('keeps an expired session and exposes an explicit retry after a completion error', async () => {
    const expired = { ...active, startedAt: '2020-08-13T10:00:00Z', expectedEndAt: '2020-08-13T10:50:00Z' }
    const completed = { ...expired, status: 'COMPLETED' as const, actualDurationMinutes: 50, completedAt: '2020-08-13T10:50:00Z' }
    jest.spyOn(focusService, 'active').mockResolvedValueOnce(expired).mockResolvedValue(null)
    const complete = jest.spyOn(focusService, 'complete').mockRejectedValueOnce(new Error('offline')).mockResolvedValue(completed)
    jest.spyOn(settingsService, 'get').mockResolvedValue(settings)
    useAuthStore.setState({ status: 'authenticated' })
    useTimerStore.setState({ hydrated: true, session: expired, phase: 'FOCUS', completedFocusCount: 0, lastCompletedSessionId: null, completionError: null, completionRetryNonce: 0 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const view = await render(<QueryClientProvider client={client}><FocusSessionSync /></QueryClientProvider>)

    await waitFor(() => expect(useTimerStore.getState().completionError).toContain('Chưa thể xác nhận'))
    await act(async () => useTimerStore.getState().retryCompletion())
    await waitFor(() => expect(complete).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(useTimerStore.getState().phase).toBe('SHORT_BREAK'))
    await view.unmount()
    client.clear()
  })
})
