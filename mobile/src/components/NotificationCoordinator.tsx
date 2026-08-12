import { useEffect, useMemo } from 'react'
import * as Notifications from 'expo-notifications'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Platform } from 'react-native'
import { habitKeys, habitService } from '@/services/habitService'
import { notificationService } from '@/services/notificationService'
import { settingsKeys, settingsService } from '@/services/settingsService'
import { useAuthStore } from '@/store/authStore'
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
    () => `${enabled}:${(habits.data ?? []).map((habit) => [habit.id, habit.reminderTime, habit.scheduleType, habit.scheduledToday, habit.weekdays?.join(',')].join(':')).join('|')}`,
    [enabled, habits.data],
  )

  useEffect(() => {
    void notificationService.setup()
  }, [])

  useEffect(() => {
    if (Platform.OS === 'web') return
    void Notifications.getLastNotificationResponseAsync().then(openResponse)
    const subscription = Notifications.addNotificationResponseReceivedListener(openResponse)
    return () => subscription.remove()
  }, [])

  useEffect(() => {
    if (!authenticated || settings.isPending || preferences.isPending) return
    void notificationService.syncFocus(session, enabled)
    // focusSignature deliberately prevents rescheduling on each timer tick.
  }, [authenticated, enabled, focusSignature, preferences.isPending, session, settings.isPending])

  useEffect(() => {
    if (!authenticated || settings.isPending || preferences.isPending) return
    void notificationService.syncBreak(phase === 'SHORT_BREAK' || phase === 'LONG_BREAK' ? breakExpectedEndAt : null, enabled)
  }, [authenticated, breakExpectedEndAt, breakSignature, enabled, phase, preferences.isPending, settings.isPending])

  useEffect(() => {
    if (!authenticated || settings.isPending || preferences.isPending || habits.isPending) return
    void notificationService.syncHabits(habits.data ?? [], enabled)
  }, [authenticated, enabled, habitSignature, habits.data, habits.isPending, preferences.isPending, settings.isPending])

  useEffect(() => {
    if (authStatus === 'anonymous') void notificationService.cancelAll()
  }, [authStatus])

  return null
}
