import axios from 'axios'
import { getApiError, getFieldErrors } from './apiClient'

function apiError(status?: number, data?: unknown) {
  return new axios.AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, status ? { status, statusText: '', headers: {}, config: {} as never, data } : undefined)
}

describe('API error mapping', () => {
  it('returns actionable network and authorization messages', () => {
    expect(getApiError(apiError())).toContain('Kiểm tra mạng')
    expect(getApiError(apiError(403, {}))).toContain('không có quyền')
    expect(getApiError(apiError(404, {}))).toContain('Không tìm thấy')
    expect(getApiError(apiError(500, { message: 'java.lang.NullPointerException' }))).toContain('Máy chủ đang gặp sự cố')
  })

  it('does not expose Java exception text and preserves field errors', () => {
    expect(getApiError(apiError(400, { message: 'java.lang.IllegalStateException' }), 'Dữ liệu không hợp lệ.')).toBe('Dữ liệu không hợp lệ.')
    expect(getFieldErrors(apiError(400, { errors: { email: 'Email đã tồn tại.' } }))).toEqual({ email: 'Email đã tồn tại.' })
  })
})
