import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { useAuthStore } from '@/store/authStore'
import { addDaysToDateKey, dateTimeInTimeZone, toDateKeyInTimeZone } from '@/utils/date'

export function useTodayKey() {
  const timezone = useAuthStore((state) => state.user?.timezone ?? 'UTC')
  const [today, setToday] = useState(() => toDateKeyInTimeZone(timezone))

  useEffect(() => {
    let midnightTimer: ReturnType<typeof setTimeout> | undefined
    const schedule = () => {
      if (midnightTimer) clearTimeout(midnightTimer)
      const current = toDateKeyInTimeZone(timezone)
      setToday(current)
      const nextDate = addDaysToDateKey(current, 1)
      const nextMidnight = dateTimeInTimeZone(nextDate, 0, 0, timezone)
      const delay = nextMidnight ? Math.max(250, nextMidnight.getTime() - Date.now() + 25) : 60_000
      midnightTimer = setTimeout(schedule, delay)
    }
    schedule()
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') schedule()
    })
    return () => {
      if (midnightTimer) clearTimeout(midnightTimer)
      subscription.remove()
    }
  }, [timezone])

  return today
}
