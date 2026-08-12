import { useCallback, useEffect, useMemo } from 'react'
import * as Notifications from 'expo-notifications'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Platform } from 'react-native'
import { habitKeys, habitService } from '@/services/habitService'
import { notificationService } from '@/services/notificationService'
import { settingsKeys, settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/store/authStore'
import { useNotificationStore } from '@/store/notificationStore'
import { useTimerStore } from '@/store/timerStore'

const routes = {
  '/(tabs)/focus': '/(tabs)/focus',
  '/(tabs)/habits': '/(tabs)/habits',
  '/(tabs)': '/(tabs)',
} as const

function openResponse(response: Notifications.NotificationResponse | null) {
  const url = response?.notification.request.content.data?.url
  if (typeof url === 'string' && url in routes) router.push(routes[url as keyof typeof routes])
}

export function NotificationCoordinator() {
  const authStatus = useAuthStore((state) => state.status)
  const timezone = useAuthStore((state) => state.user?.timezone ?? 'UTC')
  const setSyncError = useNotificationStore((state) => state.setSyncError)
  const authenticated = authStatus === 'authenticated'
  const session = useTimerStore((state) => state.session)
  const phase = useTimerStore((state) => state.phase)
  const breakExpectedEndAt = useTimerStore((state) => state.breakExpectedEndAt)
  const settings = useQuery({
    queryKey: settingsKeys.settings,
    queryFn: settingsService.get,
    enabled: authenticated,
  })
  const preferences = useQuery({
    queryKey: settingsKeys.notifications,
    queryFn: settingsService.notifications,
    enabled: authenticated,
  })
  const habits = useQuery({
    queryKey: habitKeys.list(false),
    queryFn: () => habitService.list(false),
    enabled: authenticated,
  })
  const enabled = Boolean(authenticated && settings.data?.notificationsEnabled && preferences.data?.enabled)
  const focusSignature = `${enabled}:${session?.id ?? ''}:${session?.status ?? ''}:${session?.expectedEndAt ?? ''}`
  const breakSignature = `${enabled}:${phase}:${breakExpectedEndAt ?? ''}`
  const habitSignature = useMemo(
    () => `${enabled}:${timezone}:${(habits.data ?? []).map((habit) => [habit.id, habit.reminderTime, habit.scheduleType, habit.scheduledToday, habit.weekdays?.join(','), habit.intervalDays, habit.scheduleStartDate].join(':')).join('|')}`,
    [enabled, habits.data, timezone],
  )
  const report = useCallback(async (operation: Promise<unknown>, message: string) => {
    try {
      await operation
      setSyncError(null)
    } catch {
      setSyncError(message)
    }
  }, [setSyncError])

  useEffect(() => {
    void report(notificationService.setup(), 'Không thể cấu hình thông báo trên thiết bị này.')
  }, [report])

  useEffect(() => {
    if (Platform.OS === 'web') return
    void Notifications.getLastNotificationResponseAsync().then(openResponse).catch(() => setSyncError('Không thể đọc thao tác thông báo gần nhất.'))
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse)
    return () => subscription.remove()
  }, [setSyncError])

  useEffect(() => {
    if (!authenticated || settings.isPending || preferences.isPending) return
    void report(notificationService.syncFocus(session, enabled), 'Không thể cập nhật lịch kết thúc phiên tập trung.')
    // focusSignature deliberately prevents rescheduling on each timer tick.
  }, [authenticated, enabled, focusSignature, preferences.isPending, report, session, settings.isPending])

  useEffect(() => {
    if (!authenticated || settings.isPending || preferences.isPending) return
    void report(notificationService.syncBreak(phase === 'SHORT_BREAK' || phase === 'LONG_BREAK' ? breakExpectedEndAt : null, enabled), 'Không thể cập nhật lịch kết thúc giờ nghỉ.')
  }, [authenticated, breakExpectedEndAt, breakSignature, enabled, phase, preferences.isPending, report, settings.isPending])

  useEffect(() => {
    if (!authenticated || settings.isPending || preferences.isPending || habits.isPending) return
    void report(notificationService.syncHabits(habits.data ?? [], enabled, timezone), 'Không thể đồng bộ reminder thói quen. Mở Settings để kiểm tra quyền.')
  }, [authenticated, enabled, habitSignature, habits.data, habits.isPending, preferences.isPending, report, settings.isPending, timezone])

  useEffect(() => {
    if (authStatus === 'anonymous') void report(notificationService.cancelAll(), 'Không thể dọn lịch thông báo cục bộ sau khi đăng xuất.')
  }, [authStatus, report])

  return null
}
