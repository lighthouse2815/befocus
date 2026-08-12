import { apiClient } from './apiClient'
import type { User } from '@/types'

export const userService = {
  me: async () => (await apiClient.get<User>('/users/me')).data,
  update: async (payload: { name: string; timezone: string }) =>
    (await apiClient.put<User>('/users/me', payload)).data,
}
