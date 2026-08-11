import { create } from 'zustand'
import type { AuthResponse, User } from '../types'

const STORAGE_KEY = 'befocus.auth.v1'

interface StoredAuth {
  user: User
  accessToken: string
  refreshToken: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  hydrated: boolean
  setSession: (session: AuthResponse) => void
  updateTokens: (accessToken: string, refreshToken: string, user?: User) => void
  setUser: (user: User) => void
  clearSession: () => void
  hydrate: () => void
}

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredAuth>
    if (!parsed.user || !parsed.accessToken || !parsed.refreshToken) return null
    return parsed as StoredAuth
  } catch {
    return null
  }
}

function persist(state: StoredAuth | null) {
  if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  else localStorage.removeItem(STORAGE_KEY)
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
  setSession: (session) => {
    const stored = {
      user: session.user,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    }
    persist(stored)
    set({ ...stored, hydrated: true })
  },
  updateTokens: (accessToken, refreshToken, user) => {
    const nextUser = user ?? get().user
    if (!nextUser) return
    persist({ user: nextUser, accessToken, refreshToken })
    set({ user: nextUser, accessToken, refreshToken })
  },
  setUser: (user) => {
    const { accessToken, refreshToken } = get()
    if (accessToken && refreshToken) persist({ user, accessToken, refreshToken })
    set({ user })
  },
  clearSession: () => {
    persist(null)
    set({ user: null, accessToken: null, refreshToken: null, hydrated: true })
  },
  hydrate: () => {
    const stored = readStoredAuth()
    set({
      user: stored?.user ?? null,
      accessToken: stored?.accessToken ?? null,
      refreshToken: stored?.refreshToken ?? null,
      hydrated: true,
    })
  },
}))
