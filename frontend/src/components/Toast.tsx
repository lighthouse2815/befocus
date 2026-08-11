/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { CheckCircle2, X } from 'lucide-react'

interface ToastItem {
  id: number
  message: string
  tone: 'success' | 'error'
}

interface ToastContextValue {
  notify: (message: string, tone?: ToastItem['tone']) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const remove = useCallback((id: number) => setItems((current) => current.filter((item) => item.id !== id)), [])
  const notify = useCallback((message: string, tone: ToastItem['tone'] = 'success') => {
    const id = Date.now()
    setItems((current) => [...current.slice(-2), { id, message, tone }])
    window.setTimeout(() => remove(id), 4500)
  }, [remove])
  const value = useMemo(() => ({ notify }), [notify])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-24 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 md:bottom-5" aria-live="polite" aria-atomic="false">
        {items.map((item) => (
          <div key={item.id} className={`flex items-start gap-3 rounded-surface border bg-paper-raised p-4 shadow-dialog ${item.tone === 'error' ? 'border-danger' : 'border-moss'}`} role={item.tone === 'error' ? 'alert' : 'status'}>
            <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${item.tone === 'error' ? 'text-danger' : 'text-moss'}`} aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">{item.message}</p>
            <button type="button" className="-m-2 flex h-9 w-9 items-center justify-center rounded-control text-ink-soft hover:bg-paper" onClick={() => remove(item.id)} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
