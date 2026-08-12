import { renderHook, waitFor } from '@testing-library/react-native'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useHabitProgress } from './useHabitProgress'
import { habitService } from '@/services/habitService'

function createWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>
  }
}

describe('useHabitProgress integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('creates progress for a positive value and removes it for undo', async () => {
    const setEntry = jest.spyOn(habitService, 'setEntry').mockResolvedValue({ date: '2026-08-13', value: 3, completed: false })
    const removeEntry = jest.spyOn(habitService, 'removeEntry').mockResolvedValue(undefined as never)
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity }, queries: { retry: false, gcTime: Infinity } } })
    const { result, unmount } = await renderHook(() => useHabitProgress('2026-08-13'), { wrapper: createWrapper(client) })

    result.current.mutate({ habitId: 'habit-1', value: 3 })
    await waitFor(() => expect(setEntry).toHaveBeenCalledWith('habit-1', '2026-08-13', { value: 3, note: '' }))
    result.current.mutate({ habitId: 'habit-1', value: 0 })
    await waitFor(() => expect(removeEntry).toHaveBeenCalledWith('habit-1', '2026-08-13'))
    await unmount()
    client.clear()
  })
})
