import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { habitsService } from '../services/habits'
import { settingsService } from '../services/settings'
import { useAuthStore } from '../store/authStore'
import type { Habit, Settings } from '../types'
import { PreferencesSync } from './PreferencesSync'
import { ToastProvider } from './Toast'

vi.mock('../services/settings', () => ({ settingsService: { get: vi.fn() } }))
vi.mock('../services/habits', () => ({
  habitKeys: { all: ['habits'], list: (includeArchived = false) => ['habits', 'list', includeArchived] },
  habitsService: { list: vi.fn() },
}))

const darkSettings: Settings = {
  defaultFocusMinutes: 25,
  defaultBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  timezone: 'UTC',
  notificationsEnabled: true,
  browserNotifications: false,
  inAppNotifications: true,
  theme: 'DARK',
}

function currentUtcMinute() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .format(new Date())
}

function reminderHabit(): Habit {
  return {
    id: 'habit-reminder',
    name: 'Uống nước',
    description: null,
    type: 'BOOLEAN',
    targetValue: 1,
    unit: 'lần',
    scheduleType: 'DAILY',
    weekdays: [],
    timesPerWeek: null,
    intervalDays: null,
    scheduleStartDate: null,
    reminderTime: `${currentUtcMinute()}:00`,
    color: 'moss',
    archivedAt: null,
    scheduledToday: true,
    todayProgress: 0,
    todayTarget: 1,
    completedToday: false,
    weeklyCompletedOccurrences: null,
    weeklyTargetOccurrences: null,
    weeklyTargetMet: false,
    currentStreak: 0,
    entries: [],
  }
}

describe('PreferencesSync', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    useAuthStore.getState().setSession({
      user: { id: 'user-1', name: 'User', email: 'user@example.test', timezone: 'UTC' },
      accessToken: 'access',
      refreshToken: 'refresh',
    })
    vi.mocked(settingsService.get).mockResolvedValue(darkSettings)
    vi.mocked(habitsService.list).mockResolvedValue([reminderHabit()])
  })

  afterEach(() => {
    useAuthStore.getState().clearSession()
  })

  it('applies the saved appearance and delivers a due in-app reminder once', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={queryClient}><ToastProvider><PreferencesSync /></ToastProvider></QueryClientProvider>)

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(await screen.findByText(/Đến giờ cho “Uống nước”/)).toBeInTheDocument()
    expect(Object.keys(localStorage).some((key) => key.startsWith('befocus.reminder.habit-reminder.'))).toBe(true)
  })
})
