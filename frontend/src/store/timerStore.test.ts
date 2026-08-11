import { describe, expect, it } from 'vitest'
import type { FocusSession } from '../types'
import { formatTimer, getBreakRemainingSeconds, getRemainingSeconds } from './timerStore'

const runningSession: FocusSession = {
  id: 'session-1',
  plannedDurationMinutes: 25,
  status: 'RUNNING',
  startedAt: '2026-08-12T02:00:00.000Z',
  expectedEndAt: '2026-08-12T02:25:00.000Z',
}

describe('timer timestamp calculations', () => {
  it('derives remaining time from expectedEndAt instead of decrement state', () => {
    const now = Date.parse('2026-08-12T02:24:00.000Z')

    expect(getRemainingSeconds(runningSession, now)).toBe(60)
  })

  it('freezes a paused session at pausedAt', () => {
    const paused: FocusSession = {
      ...runningSession,
      status: 'PAUSED',
      pausedAt: '2026-08-12T02:10:00.000Z',
    }

    expect(getRemainingSeconds(paused, Date.parse('2026-08-12T03:00:00.000Z'))).toBe(900)
  })

  it('never returns a negative or active value for terminal sessions', () => {
    expect(getRemainingSeconds({ ...runningSession, status: 'COMPLETED' })).toBe(0)
    expect(getRemainingSeconds(runningSession, Date.parse('2026-08-12T03:00:00.000Z'))).toBe(0)
    expect(getBreakRemainingSeconds('2026-08-12T02:00:00.000Z', Date.parse('2026-08-12T02:01:00.000Z'))).toBe(0)
  })

  it('formats long timer values without truncating hours', () => {
    expect(formatTimer(90 * 60 + 5)).toBe('90:05')
  })
})
