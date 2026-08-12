import { apiClient } from './apiClient'
import type { FocusInterruption, FocusSession, FocusStartPayload, InterruptionKind } from '@/types'

export const focusKeys = {
  all: ['focus-sessions'] as const,
  active: ['focus-sessions', 'active'] as const,
  recent: (limit = 10) => ['focus-sessions', 'recent', limit] as const,
}

export const focusService = {
  active: async () => {
    const response = await apiClient.get<FocusSession | null>('/focus-sessions/active')
    return response.status === 204 || !response.data ? null : response.data
  },
  recent: async (limit = 10) =>
    (await apiClient.get<FocusSession[]>('/focus-sessions', { params: { limit } })).data,
  start: async (payload: FocusStartPayload) =>
    (await apiClient.post<FocusSession>('/focus-sessions', payload)).data,
  pause: async (id: string) => (await apiClient.post<FocusSession>(`/focus-sessions/${id}/pause`)).data,
  resume: async (id: string) => (await apiClient.post<FocusSession>(`/focus-sessions/${id}/resume`)).data,
  complete: async (id: string) => (await apiClient.post<FocusSession>(`/focus-sessions/${id}/complete`)).data,
  cancel: async (id: string) => (await apiClient.post<FocusSession>(`/focus-sessions/${id}/cancel`)).data,
  addInterruption: async (id: string, payload: { kind: InterruptionKind; note: string }) =>
    (await apiClient.post<FocusInterruption>(`/focus-sessions/${id}/interruptions`, payload)).data,
}
