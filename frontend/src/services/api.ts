import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/authStore'
import type { ApiErrorBody, AuthResponse } from '../types'

const baseURL = import.meta.env.VITE_API_URL || '/api/v1'

export const api = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
})

const refreshClient = axios.create({ baseURL, timeout: 20_000 })
let refreshPromise: Promise<AuthResponse> | null = null

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const refreshToken = useAuthStore.getState().refreshToken

    if (error.response?.status !== 401 || !original || original._retry || !refreshToken) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      refreshPromise ??= refreshClient
        .post<AuthResponse>('/auth/refresh', { refreshToken })
        .then(({ data }) => data)
        .finally(() => {
          refreshPromise = null
        })
      const session = await refreshPromise
      useAuthStore.getState().setSession(session)
      original.headers.Authorization = `Bearer ${session.accessToken}`
      return api(original)
    } catch (refreshError) {
      sessionStorage.setItem('befocus.auth-expired', '1')
      useAuthStore.getState().clearSession()
      window.dispatchEvent(new CustomEvent('befocus:auth-expired'))
      return Promise.reject(refreshError)
    }
  },
)

export function getApiError(error: unknown, fallback = 'Không thể hoàn tất yêu cầu.') {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return fallback
  if (!error.response) return 'Không thể kết nối máy chủ. Kiểm tra mạng rồi thử lại.'
  return error.response.data?.message || fallback
}

export function getFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return {}
  return error.response?.data?.errors ?? {}
}
