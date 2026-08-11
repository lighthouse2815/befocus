import { useEffect, useState } from 'react'
import { getBreakRemainingSeconds, getRemainingSeconds, useTimerStore } from '../store/timerStore'

export function useTimerTicker() {
  const session = useTimerStore((state) => state.session)
  const phase = useTimerStore((state) => state.phase)
  const breakExpectedEndAt = useTimerStore((state) => state.breakExpectedEndAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timerActive = (session?.status === 'RUNNING') || phase === 'SHORT_BREAK' || phase === 'LONG_BREAK'
    if (!timerActive) return
    const tick = () => setNow(Date.now())
    tick()
    const interval = window.setInterval(tick, 500)
    const onVisibility = () => tick()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [breakExpectedEndAt, phase, session])

  const remainingSeconds = phase === 'SHORT_BREAK' || phase === 'LONG_BREAK'
    ? getBreakRemainingSeconds(breakExpectedEndAt, now)
    : getRemainingSeconds(session, now)
  return { session, phase, remainingSeconds, now }
}
