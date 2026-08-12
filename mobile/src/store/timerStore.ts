import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import type { FocusSession } from '@/types'

const STORAGE_KEY = 'focusflow.timer.v1'

export type TimerPhase = 'READY' | 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'

interface StoredTimer {
  session: FocusSession | null
  phase: TimerPhase
  breakExpectedEndAt: string | null
  completedFocusCount: number
  lastCompletedSessionId: string | null
}

interface TimerState extends StoredTimer {
  hydrated: boolean
  completionError: string | null
  completionRetryNonce: number
  hydrate: () => Promise<void>
  setSession: (session: FocusSession | null) => Promise<void>
  completeFocus: (sessionId: string, shortMinutes: number, longMinutes: number, sessionsBeforeLongBreak: number) => Promise<void>
  finishBreak: () => Promise<void>
  setCompletionError: (message: string | null) => void
  retryCompletion: () => void
  clear: () => Promise<void>
}

const emptyTimer = (): StoredTimer => ({
  session: null,
  phase: 'READY',
  breakExpectedEndAt: null,
  completedFocusCount: 0,
  lastCompletedSessionId: null,
})

async function persist(value: StoredTimer) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function validSession(value: unknown): FocusSession | null {
  if (!value || typeof value !== 'object') return null
  const session = value as Partial<FocusSession>
  const validStatus = session.status === 'RUNNING' || session.status === 'PAUSED' || session.status === 'COMPLETED' || session.status === 'CANCELLED'
  return typeof session.id === 'string' && validStatus && typeof session.expectedEndAt === 'string' && Number.isFinite(Date.parse(session.expectedEndAt))
    ? value as FocusSession
    : null
}

function validStoredTimer(value: unknown): StoredTimer {
  if (!value || typeof value !== 'object') return emptyTimer()
  const stored = value as Partial<StoredTimer>
  const session = validSession(stored.session)
  const breakExpectedEndAt = typeof stored.breakExpectedEndAt === 'string' && Number.isFinite(Date.parse(stored.breakExpectedEndAt)) ? stored.breakExpectedEndAt : null
  const validPhase = stored.phase === 'FOCUS' || stored.phase === 'SHORT_BREAK' || stored.phase === 'LONG_BREAK' || stored.phase === 'READY'
  let phase: TimerPhase = validPhase ? stored.phase! : session ? 'FOCUS' : 'READY'
  if (phase === 'FOCUS' && !session) phase = 'READY'
  if ((phase === 'SHORT_BREAK' || phase === 'LONG_BREAK') && !breakExpectedEndAt) phase = 'READY'
  return {
    session,
    phase,
    breakExpectedEndAt,
    completedFocusCount: Number.isFinite(stored.completedFocusCount) ? stored.completedFocusCount! : 0,
    lastCompletedSessionId: stored.lastCompletedSessionId ?? null,
  }
}

export const useTimerStore = create<TimerState>((set, get) => ({
  ...emptyTimer(),
  hydrated: false,
  completionError: null,
  completionRetryNonce: 0,
  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY)
      set({ ...validStoredTimer(raw ? JSON.parse(raw) : null), hydrated: true, completionError: null })
    } catch {
      set({ ...emptyTimer(), hydrated: true, completionError: null })
    }
  },
  setSession: async (session) => {
    const current = get()
    const next: StoredTimer = {
      session,
      phase: session ? 'FOCUS' : current.phase === 'FOCUS' ? 'READY' : current.phase,
      breakExpectedEndAt: current.breakExpectedEndAt,
      completedFocusCount: current.completedFocusCount,
      lastCompletedSessionId: current.lastCompletedSessionId,
    }
    set({ ...next, completionError: session?.id === current.session?.id ? current.completionError : null })
    await persist(next)
  },
  completeFocus: async (sessionId, shortMinutes, longMinutes, sessionsBeforeLongBreak) => {
    const current = get()
    if (current.lastCompletedSessionId === sessionId) return
    const completedFocusCount = current.completedFocusCount + 1
    const longBreak = completedFocusCount % Math.max(1, sessionsBeforeLongBreak) === 0
    const duration = longBreak ? longMinutes : shortMinutes
    const next: StoredTimer = {
      session: null,
      phase: longBreak ? 'LONG_BREAK' : 'SHORT_BREAK',
      breakExpectedEndAt: new Date(Date.now() + Math.max(1, duration) * 60_000).toISOString(),
      completedFocusCount,
      lastCompletedSessionId: sessionId,
    }
    set({ ...next, completionError: null })
    await persist(next)
  },
  finishBreak: async () => {
    const current = get()
    const next: StoredTimer = { ...emptyTimer(), completedFocusCount: current.completedFocusCount, lastCompletedSessionId: current.lastCompletedSessionId }
    set(next)
    await persist(next)
  },
  setCompletionError: (completionError) => set({ completionError }),
  retryCompletion: () => set((state) => ({ completionError: null, completionRetryNonce: state.completionRetryNonce + 1 })),
  clear: async () => {
    const next = emptyTimer()
    set({ ...next, completionError: null, completionRetryNonce: 0 })
    await AsyncStorage.removeItem(STORAGE_KEY)
  },
}))

export function getRemainingSeconds(session: FocusSession | null, now = Date.now()) {
  if (!session || session.status === 'COMPLETED' || session.status === 'CANCELLED') return 0
  const expectedEnd = Date.parse(session.expectedEndAt)
  if (!Number.isFinite(expectedEnd)) return 0
  if (session.status === 'PAUSED') {
    const pausedAt = session.pausedAt ? Date.parse(session.pausedAt) : now
    return Math.max(0, Math.ceil((expectedEnd - pausedAt) / 1000))
  }
  return Math.max(0, Math.ceil((expectedEnd - now) / 1000))
}

export function getBreakRemainingSeconds(expectedEndAt: string | null, now = Date.now()) {
  if (!expectedEndAt) return 0
  const expectedEnd = Date.parse(expectedEndAt)
  if (!Number.isFinite(expectedEnd)) return 0
  return Math.max(0, Math.ceil((expectedEnd - now) / 1000))
}

export function formatTimer(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safe / 60)
  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export function timerAccessibilityLabel(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `Còn ${minutes} phút ${remainder} giây`
}
