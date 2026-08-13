import { useCallback, useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { notificationService, type LocalNotificationPermission } from '@/services/notificationService'

export function useNotificationPermission(onError: (message: string | null) => void) {
  const [permission, setPermission] = useState<LocalNotificationPermission>('undetermined')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const refresh = async () => {
      if (mounted) setLoading(true)
      try {
        const nextPermission = await notificationService.permission()
        if (mounted) setPermission(nextPermission)
      } catch {
        if (mounted) onError('Không thể đọc quyền thông báo của thiết bị.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void refresh()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh()
    })
    return () => {
      mounted = false
      subscription.remove()
    }
  }, [onError])

  const request = useCallback(async () => {
    setLoading(true)
    try {
      const nextPermission = await notificationService.requestPermission()
      setPermission(nextPermission)
      onError(null)
    } catch {
      onError('Không thể yêu cầu quyền thông báo. Hãy kiểm tra cài đặt hệ thống.')
    } finally {
      setLoading(false)
    }
  }, [onError])

  return { permission, loading, request }
}
