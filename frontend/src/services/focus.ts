import { api } from './api'
import type {
  FocusInterruption,
  FocusSession,
  FocusStartPayload,
  InterruptionKind,
} from '../types'

export const focusKeys = { active: ['focus-sessions', 'active'] as const }

export const focusService = {
  active: async () => (await api.get<FocusSession | null>('/focus-sessions/active')).data,
  start: async (payload: FocusStartPayload) =>
    (await api.post<FocusSession>('/focus-sessions', payload)).data,
  pause: async (id: string) =>
    (await api.post<FocusSession>(`/focus-sessions/${id}/pause`)).data,
  resume: async (id: string) =>
    (await api.post<FocusSession>(`/focus-sessions/${id}/resume`)).data,
  complete: async (id: string) =>
    (await api.post<FocusSession>(`/focus-sessions/${id}/complete`)).data,
  cancel: async (id: string) =>
    (await api.post<FocusSession>(`/focus-sessions/${id}/cancel`)).data,
  addInterruption: async (id: string, payload: { kind: InterruptionKind; note: string }) =>
    (await api.post<FocusInterruption>(`/focus-sessions/${id}/interruptions`, payload)).data,
}
