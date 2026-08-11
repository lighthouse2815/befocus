import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { focusService } from '../services/focus'
import { habitsService } from '../services/habits'
import { useTimerStore } from '../store/timerStore'
import type { FocusSession, Habit } from '../types'
import { FocusPage } from './FocusPage'

vi.mock('../services/focus', () => ({
  focusKeys: {
    all: ['focus-sessions'],
    active: ['focus-sessions', 'active'],
    recent: (limit = 10) => ['focus-sessions', 'recent', limit],
  },
  focusService: {
    active: vi.fn(),
    recent: vi.fn(),
    start: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    complete: vi.fn(),
    cancel: vi.fn(),
    addInterruption: vi.fn(),
  },
}))

vi.mock('../services/habits', () => ({
  habitKeys: {
    all: ['habits'],
    list: (includeArchived = false) => ['habits', 'list', includeArchived],
  },
  habitsService: { list: vi.fn() },
}))

function focusSession(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 'focus-1',
    plannedDurationMinutes: 25,
    actualDurationMinutes: null,
    projectId: null,
    projectName: null,
    taskId: null,
    taskTitle: null,
    habitId: 'habit-1',
    habitName: 'Học tiếng Anh',
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
    expectedEndAt: new Date(Date.now() + 25 * 60_000).toISOString(),
    pausedAt: null,
    totalPausedSeconds: 0,
    completedAt: null,
    cancelledAt: null,
    interruptions: [],
    ...overrides,
  }
}

const durationHabit: Habit = {
  id: 'habit-1',
  name: 'Học tiếng Anh',
  description: null,
  type: 'DURATION',
  targetValue: 60,
  unit: 'phút',
  scheduleType: 'DAILY',
  weekdays: [],
  timesPerWeek: null,
  intervalDays: null,
  scheduleStartDate: null,
  reminderTime: null,
  color: 'moss',
  archivedAt: null,
  scheduledToday: true,
  todayProgress: 10,
  todayTarget: 60,
  completedToday: false,
  weeklyCompletedOccurrences: null,
  weeklyTargetOccurrences: null,
  weeklyTargetMet: false,
  currentStreak: 2,
  longestStreak: 4,
  entries: [],
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <MemoryRouter>
          <FocusPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('FocusPage', () => {
  beforeEach(() => {
    useTimerStore.getState().clear()
    vi.mocked(focusService.active).mockReset().mockResolvedValue(null)
    vi.mocked(focusService.recent).mockReset().mockResolvedValue([])
    vi.mocked(focusService.start).mockReset()
    vi.mocked(focusService.pause).mockReset()
    vi.mocked(focusService.resume).mockReset()
    vi.mocked(focusService.complete).mockReset()
    vi.mocked(focusService.cancel).mockReset()
    vi.mocked(focusService.addInterruption).mockReset()
    vi.mocked(habitsService.list).mockReset().mockResolvedValue([durationHabit])
  })

  it('starts a preset session linked to a scheduled duration habit', async () => {
    const user = userEvent.setup()
    vi.mocked(focusService.start).mockResolvedValue(focusSession({ plannedDurationMinutes: 50 }))
    renderPage()

    await user.click(await screen.findByRole('button', { name: /50 phút/ }))
    await user.selectOptions(screen.getByLabelText('Thói quen hôm nay'), 'habit-1')
    await user.click(screen.getByRole('button', { name: 'Bắt đầu tập trung' }))

    await waitFor(() => expect(focusService.start).toHaveBeenCalledWith({
      plannedDurationMinutes: 50,
      projectId: null,
      taskId: null,
      habitId: 'habit-1',
    }))
    expect(await screen.findByRole('timer')).toBeInTheDocument()
    expect(screen.getAllByText('Học tiếng Anh').length).toBeGreaterThan(0)
  })

  it('renders a recovered running session and pauses it through the API', async () => {
    const user = userEvent.setup()
    const running = focusSession()
    const paused = focusSession({ status: 'PAUSED', pausedAt: new Date().toISOString() })
    useTimerStore.getState().setSession(running)
    vi.mocked(focusService.active).mockResolvedValue(running)
    vi.mocked(focusService.pause).mockResolvedValue(paused)
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Tạm dừng' }))

    await waitFor(() => expect(focusService.pause).toHaveBeenCalledWith('focus-1'))
    expect(useTimerStore.getState().session?.status).toBe('PAUSED')
    expect(screen.getByRole('button', { name: 'Tiếp tục' })).toBeInTheDocument()
  })
})
