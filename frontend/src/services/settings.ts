import { api } from './api'
import type { Settings } from '../types'

export const settingsService = {
  get: async () => (await api.get<Settings>('/settings')).data,
  update: async (payload: Settings) => (await api.put<Settings>('/settings', payload)).data,
}
