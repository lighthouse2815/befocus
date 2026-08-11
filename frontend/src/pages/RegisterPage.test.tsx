import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { authService } from '../services/auth'
import { useAuthStore } from '../store/authStore'
import { RegisterPage } from './RegisterPage'

vi.mock('../services/auth', () => ({
  authService: {
    register: vi.fn(),
  },
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/register']}>
        <Routes>
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={<div>Authenticated dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.mocked(authService.register).mockReset()
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: true,
    })
  })

  it('blocks submission and explains invalid fields', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Tạo tài khoản/ }))

    expect(await screen.findByText('Nhập tên của bạn.')).toBeInTheDocument()
    expect(screen.getByText('Nhập email của bạn.')).toBeInTheDocument()
    expect(screen.getByText('Tạo mật khẩu để bảo vệ tài khoản.')).toBeInTheDocument()
    expect(authService.register).not.toHaveBeenCalled()
  })

  it('stores a valid session and navigates into the app', async () => {
    const user = userEvent.setup()
    vi.mocked(authService.register).mockResolvedValue({
      user: { id: 'user-1', name: 'Nguyễn An', email: 'an@example.com', timezone: 'Asia/Ho_Chi_Minh' },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    })
    renderPage()

    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn An')
    await user.type(screen.getByLabelText('Email'), 'an@example.com')
    await user.type(screen.getByLabelText('Mật khẩu'), 'StrongPass123')
    await user.click(screen.getByRole('button', { name: /Tạo tài khoản/ }))

    expect(await screen.findByText('Authenticated dashboard')).toBeInTheDocument()
    await waitFor(() => expect(useAuthStore.getState().accessToken).toBe('access-token'))
  })
})
