import { create } from 'zustand'
import type { FocusSession } from '../types'

const STORAGE_KEY = 'befocus.timer.v1'

interface TimerState {
  session: FocusSession | null
  phase: 'READY' | 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
  breakExpectedEndAt: string | null
  completedFocusCount: number
  lastCompletedSessionId: string | null
  hydrated: boolean
  setSession: (session: FocusSession | null) => void
  startBreak: (kind: 'SHORT_BREAK' | 'LONG_BREAK', durationMinutes: number, completedFocusCount: number) => void
  completeFocus: (sessionId: string, shortMinutes?: number, longMinutes?: number, sessionsBeforeLongBreak?: number) => void
  finishBreak: () => void
  clear: () => void
  hydrate: () => void
}

interface StoredTimer {
  session: FocusSession | null
  phase: TimerState['phase']
  breakExpectedEndAt: string | null
  completedFocusCount: number
  lastCompletedSessionId: string | null
}

function persist(value: StoredTimer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch {
    // The server remains authoritative when browser storage is unavailable.
  }
}

const emptyTimer = (): StoredTimer => ({
  session: null,
  phase: 'READY',
  breakExpectedEndAt: null,
  completedFocusCount: 0,
  lastCompletedSessionId: null,
})

function read(): StoredTimer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyTimer()
    const parsed = JSON.parse(raw) as StoredTimer | FocusSession
    if ('session' in parsed) {
      return {
        session: parsed.session ?? null,
        phase: parsed.phase ?? (parsed.session ? 'FOCUS' : 'READY'),
        breakExpectedEndAt: parsed.breakExpectedEndAt ?? null,
        completedFocusCount: Number.isFinite(parsed.completedFocusCount) ? parsed.completedFocusCount : 0,
        lastCompletedSessionId: parsed.lastCompletedSessionId ?? null,
      }
    }
    return { ...emptyTimer(), session: parsed, phase: 'FOCUS' }
  } catch {
    return emptyTimer()
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  session: null,
  phase: 'READY',
  breakExpectedEndAt: null,
  completedFocusCount: 0,
  lastCompletedSessionId: null,
  hydrated: false,
  setSession: (session) => {
    const current = get()
    const phase: TimerState['phase'] = session ? 'FOCUS' : current.phase === 'FOCUS' ? 'READY' : current.phase
    const next: StoredTimer = {
      session,
      phase,
      breakExpectedEndAt: current.breakExpectedEndAt,
      completedFocusCount: current.completedFocusCount,
      lastCompletedSessionId: current.lastCompletedSessionId,
    }
    persist(next)
    set({ ...next, hydrated: true })
  },
  startBreak: (kind, durationMinutes, completedFocusCount) => {
    const current = get()
    const next: StoredTimer = {
      session: null,
      phase: kind,
      breakExpectedEndAt: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
      completedFocusCount,
      lastCompletedSessionId: current.lastCompletedSessionId,
    }
    persist(next)
    set({ ...next, hydrated: true })
  },
  completeFocus: (sessionId, shortMinutes = 5, longMinutes = 15, sessionsBeforeLongBreak = 4) => {
    const current = get()
    if (current.lastCompletedSessionId === sessionId) return
    const completedFocusCount = current.completedFocusCount + 1
    const longBreak = completedFocusCount % sessionsBeforeLongBreak === 0
    const durationMinutes = longBreak ? longMinutes : shortMinutes
    const next: StoredTimer = {
      session: null,
      phase: longBreak ? 'LONG_BREAK' : 'SHORT_BREAK',
      breakExpectedEndAt: new Date(Date.now() + durationMinutes * 60_000).toISOString(),
      completedFocusCount,
      lastCompletedSessionId: sessionId,
    }
    persist(next)
    set({ ...next, hydrated: true })
  },
  finishBreak: () => {
    const current = get()
    const next = {
      session: null,
      phase: 'READY' as const,
      breakExpectedEndAt: null,
      completedFocusCount: current.completedFocusCount,
      lastCompletedSessionId: current.lastCompletedSessionId,
    }
    persist(next)
    set({ ...next, hydrated: true })
  },
  clear: () => {
    const next = emptyTimer()
    persist(next)
    set({ ...next, hydrated: true })
  },
  hydrate: () => set({ ...read(), hydrated: true }),
}))

export function getRemainingSeconds(session: FocusSession | null, now = Date.now()): number {
  if (!session || session.status === 'COMPLETED' || session.status === 'CANCELLED') return 0
  const end = Date.parse(session.expectedEndAt)
  if (!Number.isFinite(end)) return 0
  if (session.status === 'PAUSED') {
    const pausedAt = session.pausedAt ? Date.parse(session.pausedAt) : now
    return Math.max(0, Math.ceil((end - pausedAt) / 1000))
  }
  return Math.max(0, Math.ceil((end - now) / 1000))
}

export function formatTimer(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safe / 60)
  const remaining = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
}

export function getBreakRemainingSeconds(expectedEndAt: string | null, now = Date.now()) {
  if (!expectedEndAt) return 0
  return Math.max(0, Math.ceil((Date.parse(expectedEndAt) - now) / 1000))
}
