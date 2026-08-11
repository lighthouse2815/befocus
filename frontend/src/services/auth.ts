import { api } from './api'
import type { AuthResponse, User } from '../types'

export const authService = {
  register: async (payload: { name: string; email: string; password: string }) =>
    (await api.post<AuthResponse>('/auth/register', payload)).data,
  login: async (payload: { email: string; password: string }) =>
    (await api.post<AuthResponse>('/auth/login', payload)).data,
  logout: async (refreshToken: string) => {
    await api.post('/auth/logout', { refreshToken })
  },
  me: async () => (await api.get<User>('/users/me')).data,
  updateProfile: async (payload: { name: string; timezone: string }) =>
    (await api.put<User>('/users/me', payload)).data,
}
