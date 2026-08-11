import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute() {
  const { hydrated, accessToken } = useAuthStore()
  const location = useLocation()
  if (!hydrated) return <div className="flex min-h-screen items-center justify-center" role="status"><LoaderCircle className="h-6 w-6 animate-spin text-moss" aria-hidden="true" /><span className="sr-only">Đang khôi phục phiên đăng nhập</span></div>
  if (!accessToken) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  return <Outlet />
}
