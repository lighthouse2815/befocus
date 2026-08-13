import { act, renderHook, waitFor } from '@testing-library/react-native'
import { AppState, type AppStateStatus } from 'react-native'
import { notificationService } from '@/services/notificationService'
import { useNotificationPermission } from './useNotificationPermission'

jest.mock('@/services/notificationService', () => ({
  notificationService: {
    permission: jest.fn(),
    requestPermission: jest.fn(),
  },
}))

describe('useNotificationPermission', () => {
  afterEach(() => jest.restoreAllMocks())

  it('refreshes permission when the app returns from system settings', async () => {
    let listener: ((state: AppStateStatus) => void) | undefined
    const remove = jest.fn()
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, nextListener) => {
      listener = nextListener
      return { remove }
    })
    const permission = notificationService.permission as jest.MockedFunction<typeof notificationService.permission>
    permission.mockResolvedValueOnce('denied').mockResolvedValueOnce('granted')

    const onError = jest.fn()
    const { result, unmount } = await renderHook(() => useNotificationPermission(onError))
    await waitFor(() => expect(result.current.permission).toBe('denied'))

    await act(async () => listener?.('background'))
    expect(permission).toHaveBeenCalledTimes(1)
    await act(async () => listener?.('active'))
    await waitFor(() => expect(result.current.permission).toBe('granted'))

    await unmount()
    expect(remove).toHaveBeenCalledTimes(1)
  })
})
