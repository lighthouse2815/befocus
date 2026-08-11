import { create } from 'zustand'
import type { FocusSession } from '../types'

const STORAGE_KEY = 'befocus.timer.v1'

interface TimerState {
  session: FocusSession | null
  phase: 'READY' | 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
  breakExpectedEndAt: string | null
  completedFocusCount: number
  hydrated: boolean
  setSession: (session: FocusSession | null) => void
  startBreak: (kind: 'SHORT_BREAK' | 'LONG_BREAK', durationMinutes: number, completedFocusCount: number) => void
  finishBreak: () => void
  clear: () => void
  hydrate: () => void
}

interface StoredTimer {
  session: FocusSession | null
  phase: TimerState['phase']
  breakExpectedEndAt: string | null
  completedFocusCount: number
}

function persist(value: StoredTimer) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function read(): StoredTimer {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { session: null, phase: 'READY', breakExpectedEndAt: null, completedFocusCount: 0 }
    const parsed = JSON.parse(raw) as StoredTimer | FocusSession
    if ('session' in parsed) return parsed
    return { session: parsed, phase: 'FOCUS', breakExpectedEndAt: null, completedFocusCount: 0 }
  } catch {
    return { session: null, phase: 'READY', breakExpectedEndAt: null, completedFocusCount: 0 }
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  session: null,
  phase: 'READY',
  breakExpectedEndAt: null,
  completedFocusCount: 0,
  hydrated: false,
  setSession: (session) => {
    const current = get()
    const phase: TimerState['phase'] = session ? 'FOCUS' : current.phase === 'FOCUS' ? 'READY' : current.phase
    const next: StoredTimer = { session, phase, breakExpectedEndAt: current.breakExpectedEndAt, completedFocusCount: current.completedFocusCount }
    persist(next)
    set({ ...next, hydrated: true })
  },
  startBreak: (kind, durationMinutes, completedFocusCount) => {
    const next: StoredTimer = { session: null, phase: kind, breakExpectedEndAt: new Date(Date.now() + durationMinutes * 60_000).toISOString(), completedFocusCount }
    persist(next)
    set({ ...next, hydrated: true })
  },
  finishBreak: () => {
    const current = get()
    const next = { session: null, phase: 'READY' as const, breakExpectedEndAt: null, completedFocusCount: current.completedFocusCount }
    persist(next)
    set({ ...next, hydrated: true })
  },
  clear: () => {
    const next = { session: null, phase: 'READY' as const, breakExpectedEndAt: null, completedFocusCount: 0 }
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
