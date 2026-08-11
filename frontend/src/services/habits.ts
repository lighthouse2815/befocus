import { api } from './api'
import type { Habit, HabitEntry, HabitPayload } from '../types'

export const habitKeys = {
  all: ['habits'] as const,
  list: (includeArchived = false) => ['habits', 'list', includeArchived] as const,
  detail: (id: string, from?: string, to?: string) => ['habits', 'detail', id, from, to] as const,
}

export const habitsService = {
  list: async (includeArchived = false) =>
    (await api.get<Habit[]>('/habits', { params: { includeArchived } })).data,
  get: async (id: string, from?: string, to?: string) =>
    (await api.get<Habit>(`/habits/${id}`, { params: { from, to } })).data,
  create: async (payload: HabitPayload) => (await api.post<Habit>('/habits', payload)).data,
  update: async (id: string, payload: HabitPayload) =>
    (await api.put<Habit>(`/habits/${id}`, payload)).data,
  archive: async (id: string) => {
    await api.post(`/habits/${id}/archive`)
  },
  remove: async (id: string) => {
    await api.delete(`/habits/${id}`)
  },
  setEntry: async (id: string, date: string, payload: { value: number; note: string }) =>
    (await api.put<HabitEntry>(`/habits/${id}/entries/${date}`, payload)).data,
  removeEntry: async (id: string, date: string) => {
    await api.delete(`/habits/${id}/entries/${date}`)
  },
}
