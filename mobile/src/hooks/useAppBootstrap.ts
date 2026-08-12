import { useEffect } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import NetInfo from '@react-native-community/netinfo'
import { focusManager, onlineManager, useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'

let networkConfigured = false

function configureNetworkTracking() {
  if (networkConfigured) return
  networkConfigured = true
  onlineManager.setEventListener((setOnline) => NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected && state.isInternetReachable !== false))
  }))
}

export function useAppBootstrap() {
  const queryClient = useQueryClient()
  const hydrate = useAuthStore((state) => state.hydrate)
  const hydrateTimer = useTimerStore((state) => state.hydrate)

  useEffect(() => {
    configureNetworkTracking()
    let cancelled = false
    void (async () => {
      await Promise.all([hydrate(), hydrateTimer()])
      const auth = useAuthStore.getState()
      if (cancelled || auth.status !== 'authenticated') return
      try {
        const user = await userService.me()
        if (!cancelled) await useAuthStore.getState().setUser(user)
      } catch {
        // A network failure keeps the securely restored session. A 401 is handled centrally.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrate, hydrateTimer])

  useEffect(() => {
    function onAppStateChange(status: AppStateStatus) {
      const active = status === 'active'
      focusManager.setFocused(active)
      if (active && useAuthStore.getState().status === 'authenticated') {
        void queryClient.invalidateQueries()
      }
    }
    const subscription = AppState.addEventListener('change', onAppStateChange)
    return () => subscription.remove()
  }, [queryClient])
}
