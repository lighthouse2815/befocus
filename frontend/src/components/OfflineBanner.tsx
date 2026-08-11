import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])
  if (online) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[70] flex min-h-10 items-center justify-center gap-2 bg-amber-wash px-4 py-2 text-center text-sm font-medium text-ink" role="status">
      <WifiOff className="h-4 w-4 text-amber" aria-hidden="true" />
      Bạn đang ngoại tuyến. Bộ đếm vẫn chạy theo thời gian trên thiết bị; thay đổi sẽ cần mạng để lưu.
    </div>
  )
}
