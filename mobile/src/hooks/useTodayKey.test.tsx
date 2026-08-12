import { act, renderHook } from '@testing-library/react-native'
import { useTodayKey } from './useTodayKey'
import { useAuthStore } from '@/store/authStore'

describe('useTodayKey', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-12T16:59:59.500Z'))
    useAuthStore.setState({ user: { id: 'user-1', name: 'An', email: 'an@example.com', timezone: 'Asia/Ho_Chi_Minh' } })
  })

  afterEach(() => jest.useRealTimers())

  it('switches query date at midnight in the profile timezone without a navigation rerender', async () => {
    const { result, unmount } = await renderHook(() => useTodayKey())
    expect(result.current).toBe('2026-08-12')

    await act(async () => { jest.advanceTimersByTime(600) })
    expect(result.current).toBe('2026-08-13')
    await unmount()
  })
})
