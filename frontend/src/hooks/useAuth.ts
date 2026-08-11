import { useEffect } from 'react'
import axios from 'axios'
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
    }).catch((error: unknown) => {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined
      if (!cancelled && (status === 401 || status === 403)) clearSession()
    })
    return () => { cancelled = true }
  }, [accessToken, clearSession, hydrated, setUser])
}
