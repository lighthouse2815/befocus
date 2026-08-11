import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/Toast'
import { habitsService } from '../services/habits'
import type { Habit } from '../types'
import { HabitsPage } from './HabitsPage'

vi.mock('../services/habits', () => ({
  habitKeys: {
    all: ['habits'],
    list: (includeArchived = false) => ['habits', 'list', includeArchived],
  },
  habitsService: {
    list: vi.fn(),
    setEntry: vi.fn(),
    removeEntry: vi.fn(),
    archive: vi.fn(),
  },
}))

const activeHabit: Habit = {
  id: 'habit-1',
  name: 'Đọc sách',
  description: null,
  type: 'COUNT',
  targetValue: 20,
  unit: 'trang',
  scheduleType: 'DAILY',
  weekdays: [],
  timesPerWeek: null,
  intervalDays: null,
  scheduleStartDate: null,
  reminderTime: null,
  color: 'clay',
  archivedAt: null,
  scheduledToday: true,
  todayProgress: 4,
  todayTarget: 20,
  completedToday: false,
  weeklyCompletedOccurrences: null,
  weeklyTargetOccurrences: null,
  weeklyTargetMet: false,
  currentStreak: 2,
  longestStreak: 5,
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
          <HabitsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('HabitsPage completion flow', () => {
  beforeEach(() => {
    vi.mocked(habitsService.list).mockReset().mockResolvedValue([activeHabit])
    vi.mocked(habitsService.setEntry).mockReset().mockResolvedValue({
      id: 'entry-1',
      date: '2026-08-12',
      value: 20,
      note: null,
      completed: true,
    })
    vi.mocked(habitsService.removeEntry).mockReset().mockResolvedValue(undefined)
    vi.mocked(habitsService.archive).mockReset().mockResolvedValue(undefined)
  })

  it('writes the habits target when the user marks it complete', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Hoàn thành Đọc sách' }))

    await waitFor(() => {
      expect(habitsService.setEntry).toHaveBeenCalledWith(
        'habit-1',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        { value: 20, note: '' },
      )
    })
  })
})
