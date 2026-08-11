import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { useAuthBootstrap } from './useAuth'

vi.mock('../services/auth', () => ({ authService: { me: vi.fn() } }))

describe('useAuthBootstrap', () => {
  beforeEach(() => {
    localStorage.clear()
    useAuthStore.getState().setSession({
      user: { id: 'user-1', name: 'User', email: 'user@example.test', timezone: 'UTC' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    vi.mocked(authService.me).mockReset()
  })

  afterEach(() => useAuthStore.getState().clearSession())

  it('keeps the persisted session during a transient network failure', async () => {
    vi.mocked(authService.me).mockRejectedValue(new Error('offline'))
    renderHook(() => useAuthBootstrap())

    await waitFor(() => expect(authService.me).toHaveBeenCalled())
    await act(async () => { await Promise.resolve() })
    expect(useAuthStore.getState().accessToken).toBe('access-token')
  })

  it('clears the session when the current-user endpoint rejects authorization', async () => {
    vi.mocked(authService.me).mockRejectedValue({ isAxiosError: true, response: { status: 401 } })
    renderHook(() => useAuthBootstrap())

    await waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull())
  })
})
