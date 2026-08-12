import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router as mockedRouter } from 'expo-router'
import { LoginScreen } from './LoginScreen'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }))

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useAuthStore.setState({ user: null, accessToken: null, refreshToken: null, status: 'anonymous' })
  })

  it('validates required credentials before calling the API', async () => {
    const login = jest.spyOn(authService, 'login')
    await render(<LoginScreen />)
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))
    expect(await screen.findByText('Nhập địa chỉ email hợp lệ.')).toBeTruthy()
    expect(await screen.findByText('Nhập mật khẩu.')).toBeTruthy()
    expect(login).not.toHaveBeenCalled()
  })

  it('stores a valid session and navigates to the protected tabs', async () => {
    const login = jest.spyOn(authService, 'login').mockResolvedValue({
      user: { id: 'user-1', name: 'An', email: 'an@example.com', timezone: 'Asia/Ho_Chi_Minh' },
      accessToken: 'access', refreshToken: 'refresh',
    })
    await render(<LoginScreen />)
    await fireEvent.changeText(screen.getByLabelText('Email'), 'an@example.com')
    await fireEvent.changeText(screen.getByLabelText('Mật khẩu'), 'secret123')
    await fireEvent.press(screen.getByRole('button', { name: 'Đăng nhập' }))

    await waitFor(() => expect(login).toHaveBeenCalledWith({ email: 'an@example.com', password: 'secret123' }))
    await waitFor(() => expect(useAuthStore.getState().status).toBe('authenticated'))
    await waitFor(() => expect(mockedRouter.replace).toHaveBeenCalledWith('/(tabs)'))
    expect(useAuthStore.getState().status).toBe('authenticated')
  })
})
