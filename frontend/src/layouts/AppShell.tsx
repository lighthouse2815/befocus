import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { BarChart3, CheckCircle2, CircleDot, FolderKanban, LogOut, Menu, Settings, TimerReset, X } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui'
import { FocusSessionSync } from '../components/FocusSessionSync'
import { authService } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { useTimerStore } from '../store/timerStore'

const navItems = [
  { to: '/', label: 'Hôm nay', icon: CircleDot, end: true },
  { to: '/habits', label: 'Thói quen', icon: CheckCircle2 },
  { to: '/focus', label: 'Tập trung', icon: TimerReset },
  { to: '/projects', label: 'Dự án', icon: FolderKanban },
  { to: '/analytics', label: 'Phân tích', icon: BarChart3 },
]

function NavItems({ onNavigate, mobile = false }: { onNavigate?: () => void; mobile?: boolean }) {
  return (
    <nav aria-label="Điều hướng chính" className={mobile ? 'grid grid-cols-5' : 'space-y-1'}>
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) => clsx(
            'group rounded-control font-medium transition-colors duration-150',
            mobile
              ? 'flex min-h-[62px] flex-col items-center justify-center gap-1 px-1 text-xs'
              : 'flex min-h-11 items-center gap-3 px-3 text-sm',
            isActive ? 'bg-moss-wash text-moss-dark' : 'text-ink-soft hover:bg-paper-raised hover:text-ink',
          )}
        >
          <Icon className={mobile ? 'h-5 w-5' : 'h-[18px] w-[18px]'} strokeWidth={1.8} aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, refreshToken, clearSession } = useAuthStore()

  const logout = useMutation({
    mutationFn: async () => {
      if (refreshToken) await authService.logout(refreshToken)
    },
    onSettled: () => {
      useTimerStore.getState().clear()
      clearSession()
      queryClient.clear()
      navigate('/login', { replace: true })
    },
  })

  return (
    <div className="min-h-screen md:pl-[232px]">
      <FocusSessionSync />
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-control bg-ink px-4 py-2 text-sm font-semibold text-paper transition-transform focus:translate-y-0"
      >
        Bỏ qua điều hướng
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] border-r border-line bg-paper px-4 py-6 md:flex md:flex-col" aria-label="Thanh bên">
        <div className="px-2"><Logo /></div>
        <div className="mt-9 flex-1"><NavItems /></div>
        <div className="border-t border-line pt-4">
          <div className="flex items-center gap-3 px-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line-strong bg-paper-raised text-sm font-bold text-moss-dark" aria-hidden="true">
              {user?.name?.trim().charAt(0).toUpperCase() || 'B'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{user?.name || 'BeFocus'}</p>
              <p className="truncate text-xs text-ink-soft">{user?.email}</p>
            </div>
            <NavLink to="/settings" className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-paper-raised hover:text-ink" aria-label="Cài đặt">
              <Settings className="h-4 w-4" aria-hidden="true" />
            </NavLink>
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-paper-raised hover:text-danger"
              aria-label="Đăng xuất"
              disabled={logout.isPending}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-paper px-4 backdrop-blur-sm md:hidden">
        <Logo compact />
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-paper-raised"
          aria-expanded={menuOpen}
          aria-controls="mobile-account-menu"
          aria-label={menuOpen ? 'Đóng menu tài khoản' : 'Mở menu tài khoản'}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
        {menuOpen && (
          <div id="mobile-account-menu" className="absolute right-4 top-14 w-[min(300px,calc(100vw-2rem))] rounded-surface border border-line bg-paper-raised p-4 shadow-dialog">
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-ink-soft">{user?.email}</p>
            <NavLink to="/settings" onClick={() => setMenuOpen(false)} className="mt-4 flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-soft hover:bg-paper"><Settings className="h-4 w-4" aria-hidden="true" />Cài đặt</NavLink>
            <Button className="mt-4 w-full" variant="secondary" onClick={() => logout.mutate()} loading={logout.isPending}>
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        )}
      </header>

      <main id="main-content" className="mx-auto w-full max-w-[1180px] px-4 pb-28 pt-7 sm:px-6 md:px-8 md:pb-20 md:pt-10">
        <Outlet />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised backdrop-blur-sm md:hidden">
        <NavItems mobile />
      </div>
    </div>
  )
}
