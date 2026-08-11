import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '../store/authStore'
import { ProtectedRoute } from './ProtectedRoute'

function LoginTarget() {
  const location = useLocation()
  return <div>Login target: {(location.state as { from?: string } | null)?.from}</div>
}

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/private?tab=today']}>
      <Routes>
        <Route path="/login" element={<LoginTarget />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<div>Private content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: true,
    })
  })

  it('redirects signed-out users and preserves the requested URL', () => {
    renderRoute()

    expect(screen.getByText('Login target: /private?tab=today')).toBeInTheDocument()
  })

  it('shows an accessible bootstrap state before auth hydration', () => {
    useAuthStore.setState({ hydrated: false })
    renderRoute()

    expect(screen.getByRole('status')).toHaveTextContent('Đang khôi phục phiên đăng nhập')
  })

  it('renders protected content for an authenticated session', () => {
    useAuthStore.setState({ accessToken: 'access-token', hydrated: true })
    renderRoute()

    expect(screen.getByText('Private content')).toBeInTheDocument()
  })
})
