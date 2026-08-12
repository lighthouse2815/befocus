import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react-native'
import { FocusSessionSync } from './FocusSessionSync'
import { focusService } from '@/services/focusService'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'
import type { FocusSession } from '@/types'

const active: FocusSession = {
  id: 'session-active', status: 'RUNNING', plannedDurationMinutes: 50, actualDurationMinutes: null,
  startedAt: '2026-08-13T10:00:00Z', expectedEndAt: '2026-08-13T10:50:00Z', pausedAt: null,
  totalPausedSeconds: 0, completedAt: null, cancelledAt: null, projectId: null, projectName: null,
  taskId: null, taskTitle: null, habitId: null, habitName: null, interruptions: [],
}

describe('FocusSessionSync integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('restores the server active session after secure auth and timer hydration', async () => {
    jest.spyOn(focusService, 'active').mockResolvedValue(active)
    useAuthStore.setState({ status: 'authenticated' })
    useTimerStore.setState({ hydrated: true, session: null, phase: 'READY' })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } })
    const view = await render(<QueryClientProvider client={client}><FocusSessionSync /></QueryClientProvider>)

    await waitFor(() => expect(useTimerStore.getState().session?.id).toBe('session-active'))
    await view.unmount()
    client.clear()
  })
})
