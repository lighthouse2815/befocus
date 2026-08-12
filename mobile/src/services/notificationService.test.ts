import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import { notificationService } from './notificationService'
import type { FocusSession, Habit } from '@/types'

const session: FocusSession = {
  id: 'session-1', status: 'RUNNING', plannedDurationMinutes: 25, actualDurationMinutes: null,
  startedAt: '2099-08-13T10:00:00Z', expectedEndAt: '2099-08-13T10:25:00Z', pausedAt: null,
  totalPausedSeconds: 0, completedAt: null, cancelledAt: null, projectId: null, projectName: null,
  taskId: null, taskTitle: 'Viết báo cáo', habitId: null, habitName: null, interruptions: [],
}

const weekdayHabit: Habit = {
  id: 'habit-1', name: 'Đọc sách', type: 'COUNT', targetValue: 20, unit: 'trang', scheduleType: 'WEEKDAYS',
  weekdays: [1, 7], reminderTime: '20:15', color: 'moss', scheduledToday: true, todayProgress: 0, todayTarget: 20,
  completedToday: false, weeklyTargetMet: false, currentStreak: 0, longestStreak: 0, entries: [],
}

describe('local notification scheduling', () => {
  let stored: string | null

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-10T12:00:00.000Z'))
    stored = null
    jest.clearAllMocks()
    jest.mocked(AsyncStorage.getItem).mockImplementation(async () => stored)
    jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => { stored = value })
    jest.mocked(AsyncStorage.removeItem).mockImplementation(async () => { stored = null })
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: true, status: 'granted' } as never)
    let scheduled = 0
    jest.mocked(Notifications.scheduleNotificationAsync).mockImplementation(async () => `notification-${++scheduled}`)
  })

  afterEach(() => jest.useRealTimers())

  it('schedules by expectedEndAt and cancels the exact stale focus request on pause', async () => {
    await notificationService.syncFocus(session, true)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.objectContaining({ data: expect.objectContaining({ sessionId: 'session-1' }) }),
      trigger: expect.objectContaining({ type: 'date', date: new Date(session.expectedEndAt) }),
    }))

    await notificationService.syncFocus({ ...session, status: 'PAUSED', pausedAt: '2099-08-13T10:05:00Z' }, true)
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-1')
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1)
  })

  it('maps backend ISO weekdays to Expo Sunday-first weekly triggers', async () => {
    await notificationService.syncHabits([weekdayHabit], true, Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({ trigger: expect.objectContaining({ type: 'weekly', weekday: 2, hour: 20, minute: 15 }) }))
    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(2, expect.objectContaining({ trigger: expect.objectContaining({ type: 'weekly', weekday: 1, hour: 20, minute: 15 }) }))
  })

  it('uses absolute timestamps when the profile timezone differs from the device', async () => {
    const daily = { ...weekdayHabit, scheduleType: 'DAILY' as const, weekdays: null }
    await notificationService.syncHabits([daily], true, 'Pacific/Auckland')

    expect(Notifications.scheduleNotificationAsync).toHaveBeenNthCalledWith(1, expect.objectContaining({
      trigger: expect.objectContaining({
        type: 'date',
        date: new Date('2026-08-11T08:15:00.000Z'),
      }),
    }))
  })

  it('does not schedule when the operating-system permission is unavailable', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({ granted: false, status: 'denied' } as never)
    await notificationService.syncBreak('2099-08-13T10:30:00Z', true)
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled()
  })
})
