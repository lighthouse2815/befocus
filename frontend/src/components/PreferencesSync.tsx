import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useToast } from './Toast'
import { habitKeys, habitsService } from '../services/habits'
import { settingsService } from '../services/settings'
import { useAuthStore } from '../store/authStore'
import type { Settings } from '../types'

function applyTheme(theme: Settings['theme']) {
  const normalized = theme.toUpperCase()
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  if (normalized === 'DARK' || (normalized === 'SYSTEM' && systemDark)) {
    document.documentElement.dataset.theme = 'dark'
  } else {
    delete document.documentElement.dataset.theme
  }
}

function zonedMinute(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return { date: `${values.year}-${values.month}-${values.day}`, time: `${values.hour}:${values.minute}` }
}

export function PreferencesSync() {
  const user = useAuthStore((state) => state.user)
  const { notify } = useToast()
  const settings = useQuery({ queryKey: ['settings'], queryFn: settingsService.get, enabled: Boolean(user) })
  const habits = useQuery({
    queryKey: habitKeys.list(false),
    queryFn: () => habitsService.list(false),
    enabled: Boolean(user && settings.data?.notificationsEnabled),
    refetchInterval: settings.data?.notificationsEnabled ? 60_000 : false,
  })

  useEffect(() => {
    if (!settings.data) return
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    const update = () => applyTheme(settings.data!.theme)
    update()
    if (settings.data.theme.toUpperCase() === 'SYSTEM') media?.addEventListener('change', update)
    return () => media?.removeEventListener('change', update)
  }, [settings.data])

  useEffect(() => {
    const preferences = settings.data
    const availableHabits = habits.data
    if (!preferences?.notificationsEnabled || !availableHabits) return

    const check = () => {
      const now = zonedMinute(preferences.timezone)
      for (const habit of availableHabits) {
        if (!habit.scheduledToday || habit.completedToday || !habit.reminderTime
            || habit.reminderTime.slice(0, 5) !== now.time) continue
        const storageKey = `befocus.reminder.${habit.id}.${now.date}`
        try {
          if (localStorage.getItem(storageKey)) continue
        } catch {
          // A blocked storage API must not prevent a reminder in this browser session.
        }

        let delivered = false
        const message = `Đến giờ cho “${habit.name}”. Mở BeFocus để ghi nhận tiến độ.`
        if (preferences.inAppNotifications) {
          notify(message, 'success')
          delivered = true
        }
        if (preferences.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('BeFocus · Nhắc thói quen', { body: message, tag: storageKey })
          delivered = true
        }
        if (delivered) {
          try { localStorage.setItem(storageKey, '1') } catch { /* Delivery still succeeded. */ }
        }
      }
    }

    check()
    const interval = window.setInterval(check, 20_000)
    return () => window.clearInterval(interval)
  }, [habits.data, notify, settings.data])

  return null
}
