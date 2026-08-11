import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/auth'

export function useAuthBootstrap() {
  const { hydrated, accessToken, setUser, clearSession, hydrate } = useAuthStore()
  useEffect(() => {
    hydrate()
  }, [hydrate])
  useEffect(() => {
    if (!hydrated || !accessToken) return
    let cancelled = false
    authService.me().then((user) => {
      if (!cancelled) setUser(user)
    }).catch(() => {
      if (!cancelled) clearSession()
    })
    return () => { cancelled = true }
  }, [accessToken, clearSession, hydrated, setUser])
}
