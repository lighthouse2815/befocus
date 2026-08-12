import { apiClient } from './apiClient'
import type { Habit, HabitEntry, HabitPayload } from '@/types'

export const habitKeys = {
  all: ['habits'] as const,
  list: (includeArchived = false) => ['habits', 'list', includeArchived] as const,
  detail: (id: string, from?: string, to?: string) => ['habits', 'detail', id, from, to] as const,
}

export const habitService = {
  list: async (includeArchived = false) =>
    (await apiClient.get<Habit[]>('/habits', { params: { includeArchived } })).data,
  get: async (id: string, from?: string, to?: string) =>
    (await apiClient.get<Habit>(`/habits/${id}`, { params: { from, to } })).data,
  create: async (payload: HabitPayload) => (await apiClient.post<Habit>('/habits', payload)).data,
  update: async (id: string, payload: HabitPayload) =>
    (await apiClient.put<Habit>(`/habits/${id}`, payload)).data,
  archive: async (id: string) => apiClient.post(`/habits/${id}/archive`),
  remove: async (id: string) => apiClient.delete(`/habits/${id}`),
  setEntry: async (id: string, date: string, payload: { value: number; note: string }) =>
    (await apiClient.put<HabitEntry>(`/habits/${id}/entries/${date}`, payload)).data,
  removeEntry: async (id: string, date: string) => apiClient.delete(`/habits/${id}/entries/${date}`),
}
