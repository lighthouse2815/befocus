import { create } from 'zustand'
import { secureStorage } from '@/services/secureStorage'
import type { AuthResponse, User } from '@/types'

const KEYS = {
  accessToken: 'focusflow.access-token',
  refreshToken: 'focusflow.refresh-token',
  user: 'focusflow.user',
} as const

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  status: 'loading' | 'authenticated' | 'anonymous'
  hydrate: () => Promise<void>
  setSession: (session: AuthResponse) => Promise<void>
  setUser: (user: User) => Promise<void>
  clearSession: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  status: 'loading',
  hydrate: async () => {
    try {
      const [accessToken, refreshToken, rawUser] = await Promise.all([
        secureStorage.get(KEYS.accessToken),
        secureStorage.get(KEYS.refreshToken),
        secureStorage.get(KEYS.user),
      ])
      const user = rawUser ? (JSON.parse(rawUser) as User) : null
      if (!accessToken || !refreshToken || !user) {
        set({ user: null, accessToken: null, refreshToken: null, status: 'anonymous' })
        return
      }
      set({ user, accessToken, refreshToken, status: 'authenticated' })
    } catch {
      await Promise.all(Object.values(KEYS).map((key) => secureStorage.remove(key)))
      set({ user: null, accessToken: null, refreshToken: null, status: 'anonymous' })
    }
  },
  setSession: async (session) => {
    await Promise.all([
      secureStorage.set(KEYS.accessToken, session.accessToken),
      secureStorage.set(KEYS.refreshToken, session.refreshToken),
      secureStorage.set(KEYS.user, JSON.stringify(session.user)),
    ])
    set({ ...session, status: 'authenticated' })
  },
  setUser: async (user) => {
    await secureStorage.set(KEYS.user, JSON.stringify(user))
    set({ user })
  },
  clearSession: async () => {
    const refreshToken = get().refreshToken
    set({ user: null, accessToken: null, refreshToken: null, status: 'anonymous' })
    await Promise.all(Object.values(KEYS).map((key) => secureStorage.remove(key)))
    void refreshToken
  },
}))
