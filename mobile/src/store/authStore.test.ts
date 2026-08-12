import * as SecureStore from 'expo-secure-store'
import { useAuthStore } from './authStore'
import type { AuthResponse } from '@/types'

const session: AuthResponse = {
  user: { id: 'user-1', name: 'An', email: 'an@example.com', timezone: 'Asia/Ho_Chi_Minh' },
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
}

describe('authStore secure persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, status: 'loading' })
  })

  it('persists token pairs and user data through SecureStore', async () => {
    await useAuthStore.getState().setSession(session)

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'focusflow.access-token',
      'access-token',
      expect.objectContaining({ keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' }),
    )
    expect(useAuthStore.getState().status).toBe('authenticated')
  })

  it('restores a complete secure session', async () => {
    jest.mocked(SecureStore.getItemAsync)
      .mockResolvedValueOnce(session.accessToken)
      .mockResolvedValueOnce(session.refreshToken)
      .mockResolvedValueOnce(JSON.stringify(session.user))

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState()).toMatchObject({ ...session, status: 'authenticated' })
  })

  it('clears partial credentials instead of exposing a broken session', async () => {
    jest.mocked(SecureStore.getItemAsync)
      .mockResolvedValueOnce(session.accessToken)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(JSON.stringify(session.user))

    await useAuthStore.getState().hydrate()

    expect(useAuthStore.getState().status).toBe('anonymous')
    expect(useAuthStore.getState().accessToken).toBeNull()
  })
})
