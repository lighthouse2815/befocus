function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}

export function resolveApiBaseUrl(raw = process.env.EXPO_PUBLIC_API_URL): string | null {
  const configured = raw?.trim()
  if (!configured) return null
  const base = trimTrailingSlash(configured)
  return base.endsWith('/api/v1') ? base : `${base}/api/v1`
}

export const apiBaseUrl = resolveApiBaseUrl()

export class ApiConfigurationError extends Error {
  constructor() {
    super('Thiếu EXPO_PUBLIC_API_URL. Hãy cấu hình địa chỉ LAN của Spring Boot trong mobile/.env.local.')
    this.name = 'ApiConfigurationError'
  }
}
