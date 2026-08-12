import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { router as mockedRouter } from 'expo-router'
import { HabitFormScreen } from './HabitFormScreen'
import { habitService } from '@/services/habitService'
import type { Habit } from '@/types'

jest.mock('expo-router', () => ({ router: { back: jest.fn(), replace: jest.fn() } }))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))

const created: Habit = {
  id: 'habit-created', name: 'Uống nước', type: 'BOOLEAN', targetValue: 1, unit: 'lần', scheduleType: 'DAILY',
  color: 'moss', scheduledToday: true, todayProgress: 0, todayTarget: 1, completedToday: false,
  weeklyTargetMet: false, currentStreak: 0, longestStreak: 0, entries: [],
}

describe('HabitFormScreen integration', () => {
  afterEach(() => jest.restoreAllMocks())

  it('creates a valid daily habit through the service and opens its detail', async () => {
    const create = jest.spyOn(habitService, 'create').mockResolvedValue(created)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })
    const view = await render(<QueryClientProvider client={client}><HabitFormScreen /></QueryClientProvider>)

    await fireEvent.changeText(screen.getByLabelText('Tên'), '  Uống nước  ')
    await fireEvent.press(screen.getByRole('button', { name: 'Tạo thói quen' }))

    await waitFor(() => expect(create).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Uống nước', type: 'BOOLEAN', targetValue: 1, scheduleType: 'DAILY', reminderTime: null,
    })))
    await waitFor(() => expect(mockedRouter.replace).toHaveBeenCalledWith({ pathname: '/habits/[id]', params: { id: 'habit-created' } }))
    await view.unmount()
    client.clear()
  })
})
