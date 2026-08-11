import { Suspense, type ReactNode } from 'react'

export function RouteBoundary({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="py-16 text-center text-sm text-ink-soft" role="status">Đang mở màn hình…</div>}>
      {children}
    </Suspense>
  )
}
