import { apiClient } from './apiClient'
import type { AuthResponse } from '@/types'

export const authService = {
  register: async (payload: { name: string; email: string; password: string }) =>
    (await apiClient.post<AuthResponse>('/auth/register', payload)).data,
  login: async (payload: { email: string; password: string }) =>
    (await apiClient.post<AuthResponse>('/auth/login', payload)).data,
  logout: async (refreshToken: string) => {
    await apiClient.post('/auth/logout', { refreshToken })
  },
}
