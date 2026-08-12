import { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { getBreakRemainingSeconds, getRemainingSeconds, useTimerStore } from '@/store/timerStore'

export function useTimerTicker() {
  const session = useTimerStore((state) => state.session)
  const phase = useTimerStore((state) => state.phase)
  const breakExpectedEndAt = useTimerStore((state) => state.breakExpectedEndAt)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    setNow(Date.now())
    const ticking = session?.status === 'RUNNING' || phase === 'SHORT_BREAK' || phase === 'LONG_BREAK'
    if (!ticking) return
    const interval = setInterval(() => setNow(Date.now()), 1_000)
    return () => clearInterval(interval)
  }, [phase, session?.id, session?.status])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setNow(Date.now())
    })
    return () => subscription.remove()
  }, [])

  const remainingSeconds = phase === 'FOCUS'
    ? getRemainingSeconds(session, now)
    : getBreakRemainingSeconds(breakExpectedEndAt, now)
  return { session, phase, remainingSeconds }
}
