import { apiClient } from './apiClient'
import type { NotificationPreference, Settings } from '@/types'

export const settingsKeys = {
  settings: ['settings'] as const,
  notifications: ['notification-preferences'] as const,
}

export const settingsService = {
  get: async () => (await apiClient.get<Settings>('/settings')).data,
  update: async (payload: Settings) => (await apiClient.put<Settings>('/settings', payload)).data,
  notifications: async () =>
    (await apiClient.get<NotificationPreference>('/notifications/preferences')).data,
  updateNotifications: async (payload: NotificationPreference) =>
    (await apiClient.put<NotificationPreference>('/notifications/preferences', payload)).data,
}
