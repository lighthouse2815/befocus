import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from './Toast'
import { FocusSessionSync } from './FocusSessionSync'
import { focusService } from '../services/focus'
import { useTimerStore } from '../store/timerStore'
import type { FocusSession } from '../types'

vi.mock('../services/focus', () => ({
  focusKeys: {
    all: ['focus-sessions'],
    active: ['focus-sessions', 'active'],
    recent: (limit = 10) => ['focus-sessions', 'recent', limit],
  },
  focusService: {
    active: vi.fn(),
    complete: vi.fn(),
  },
}))

function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 'sync-session',
    plannedDurationMinutes: 25,
    actualDurationMinutes: null,
    projectId: null,
    projectName: null,
    taskId: null,
    taskTitle: null,
    habitId: null,
    habitName: null,
    status: 'RUNNING',
    startedAt: new Date(Date.now() - 25 * 60_000).toISOString(),
    expectedEndAt: new Date(Date.now() - 1_000).toISOString(),
    pausedAt: null,
    totalPausedSeconds: 0,
    completedAt: null,
    cancelledAt: null,
    interruptions: [],
    ...overrides,
  }
}

function renderSync() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider><FocusSessionSync /></ToastProvider>
    </QueryClientProvider>,
  )
}

describe('FocusSessionSync', () => {
  beforeEach(() => {
    useTimerStore.getState().clear()
    vi.mocked(focusService.active).mockReset()
    vi.mocked(focusService.complete).mockReset()
  })

  it('reconciles a locally persisted session with the server copy', async () => {
    const server = session({
      status: 'PAUSED',
      pausedAt: new Date().toISOString(),
      expectedEndAt: new Date(Date.now() + 10 * 60_000).toISOString(),
    })
    vi.mocked(focusService.active).mockResolvedValue(server)
    renderSync()

    await waitFor(() => expect(useTimerStore.getState().session?.status).toBe('PAUSED'))
    expect(useTimerStore.getState().session?.id).toBe('sync-session')
  })

  it('completes an expired session once and starts one break', async () => {
    const expired = session()
    const completed = session({
      status: 'COMPLETED',
      actualDurationMinutes: 25,
      completedAt: new Date().toISOString(),
    })
    vi.mocked(focusService.active).mockResolvedValueOnce(expired).mockResolvedValue(null)
    vi.mocked(focusService.complete).mockResolvedValue(completed)
    renderSync()

    await waitFor(() => expect(focusService.complete).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(useTimerStore.getState()).toMatchObject({
      phase: 'SHORT_BREAK',
      completedFocusCount: 1,
      lastCompletedSessionId: 'sync-session',
    }))
  })
})
