import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { ApiConfigurationError, apiBaseUrl } from '@/config/env'
import { useAuthStore } from '@/store/authStore'
import type { ApiErrorBody, AuthResponse } from '@/types'

export const apiClient = axios.create({ baseURL: apiBaseUrl ?? undefined, timeout: 20_000 })
const refreshClient = axios.create({ baseURL: apiBaseUrl ?? undefined, timeout: 20_000 })
let refreshPromise: Promise<AuthResponse> | null = null

function requireConfiguredApi() {
  if (!apiBaseUrl) throw new ApiConfigurationError()
}

apiClient.interceptors.request.use((config) => {
  requireConfiguredApi()
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const refreshToken = useAuthStore.getState().refreshToken
    if (error.response?.status !== 401 || !original || original._retry || !refreshToken) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      requireConfiguredApi()
      refreshPromise ??= refreshClient
        .post<AuthResponse>('/auth/refresh', { refreshToken })
        .then(({ data }) => data)
        .finally(() => {
          refreshPromise = null
        })
      const session = await refreshPromise
      await useAuthStore.getState().setSession(session)
      original.headers.Authorization = `Bearer ${session.accessToken}`
      return apiClient(original)
    } catch (refreshError) {
      await useAuthStore.getState().clearSession()
      return Promise.reject(refreshError)
    }
  },
)

export function getApiError(error: unknown, fallback = 'Không thể hoàn tất yêu cầu.') {
  if (error instanceof ApiConfigurationError) return error.message
  if (!axios.isAxiosError<ApiErrorBody>(error)) return fallback
  if (!error.response) return 'Không thể kết nối máy chủ. Kiểm tra mạng và địa chỉ API rồi thử lại.'
  if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (error.response.status >= 500) return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
  return error.response.data?.message || fallback
}

export function getFieldErrors(error: unknown) {
  if (!axios.isAxiosError<ApiErrorBody>(error)) return {}
  return error.response?.data?.errors ?? {}
}
