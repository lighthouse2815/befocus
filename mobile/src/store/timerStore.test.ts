import AsyncStorage from '@react-native-async-storage/async-storage'
import { formatTimer, getBreakRemainingSeconds, getRemainingSeconds, timerAccessibilityLabel, useTimerStore } from './timerStore'
import type { FocusSession } from '@/types'

const running: FocusSession = {
  id: 'session-1',
  status: 'RUNNING',
  plannedDurationMinutes: 25,
  actualDurationMinutes: null,
  startedAt: '2026-08-13T00:00:00.000Z',
  expectedEndAt: '2026-08-13T00:25:00.000Z',
  pausedAt: null,
  totalPausedSeconds: 0,
  completedAt: null,
  cancelledAt: null,
  projectId: null,
  projectName: null,
  taskId: null,
  taskTitle: null,
  habitId: null,
  habitName: null,
  interruptions: [],
}

describe('timestamp timer calculations', () => {
  it('reconstructs the running timer from expectedEndAt after background time', () => {
    expect(getRemainingSeconds(running, Date.parse('2026-08-13T00:10:00.400Z'))).toBe(900)
    expect(getRemainingSeconds(running, Date.parse('2026-08-13T00:26:00.000Z'))).toBe(0)
  })

  it('recomputes from the absolute timestamp if the system clock changes', () => {
    expect(getRemainingSeconds(running, Date.parse('2026-08-13T00:15:00.000Z'))).toBe(600)
    expect(getRemainingSeconds(running, Date.parse('2026-08-13T00:05:00.000Z'))).toBe(1200)
  })

  it('freezes remaining time at pausedAt instead of current time', () => {
    const paused = { ...running, status: 'PAUSED' as const, pausedAt: '2026-08-13T00:08:30.000Z' }
    expect(getRemainingSeconds(paused, Date.parse('2026-08-13T01:00:00.000Z'))).toBe(990)
  })

  it('restores break time from an absolute timestamp', () => {
    expect(getBreakRemainingSeconds('2026-08-13T00:05:00.000Z', Date.parse('2026-08-13T00:02:30.000Z'))).toBe(150)
  })

  it('formats visual and screen-reader timer values', () => {
    expect(formatTimer(1472)).toBe('24:32')
    expect(timerAccessibilityLabel(1472)).toBe('Còn 24 phút 32 giây')
  })

  it('fails safe for corrupt persisted timestamps and non-finite display input', () => {
    expect(getBreakRemainingSeconds('not-a-date')).toBe(0)
    expect(formatTimer(Number.NaN)).toBe('00:00')
    expect(timerAccessibilityLabel(Number.NaN)).toBe('Còn 0 phút 0 giây')
  })
})

describe('timer persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers().setSystemTime(new Date('2026-08-13T00:00:00.000Z'))
    useTimerStore.setState({ session: null, phase: 'READY', breakExpectedEndAt: null, completedFocusCount: 0, lastCompletedSessionId: null, hydrated: true })
  })

  afterEach(() => jest.useRealTimers())

  it('persists active session state without treating AsyncStorage as server truth', async () => {
    await useTimerStore.getState().setSession(running)
    expect(useTimerStore.getState()).toMatchObject({ session: running, phase: 'FOCUS' })
    expect(AsyncStorage.setItem).toHaveBeenCalled()
  })

  it('discards corrupt cached session and break timestamps during hydration', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({ session: 'corrupt', phase: 'FOCUS', breakExpectedEndAt: 'bad-date' }))
    await useTimerStore.getState().hydrate()
    expect(useTimerStore.getState()).toMatchObject({ session: null, phase: 'READY', breakExpectedEndAt: null, hydrated: true })
  })

  it('does not start duplicate breaks for a retried complete response', async () => {
    await useTimerStore.getState().completeFocus(running.id, 5, 15, 4)
    const first = useTimerStore.getState()
    await useTimerStore.getState().completeFocus(running.id, 5, 15, 4)
    const second = useTimerStore.getState()
    expect(second.completedFocusCount).toBe(1)
    expect(second.breakExpectedEndAt).toBe(first.breakExpectedEndAt)
  })

  it('uses a long break on the configured cycle boundary', async () => {
    useTimerStore.setState({ completedFocusCount: 3 })
    await useTimerStore.getState().completeFocus('session-4', 5, 15, 4)
    expect(useTimerStore.getState()).toMatchObject({ phase: 'LONG_BREAK', completedFocusCount: 4, breakExpectedEndAt: '2026-08-13T00:15:00.000Z' })
  })
})
