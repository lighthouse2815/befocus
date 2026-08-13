import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { AxiosError } from 'axios'
import { FocusScreen } from './FocusScreen'
import { focusService } from '@/services/focusService'
import { habitService } from '@/services/habitService'
import { projectService } from '@/services/projectService'
import { settingsService } from '@/services/settingsService'
import type { FocusSession } from '@/types'

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({}) }))
jest.mock('@react-native-community/netinfo', () => ({
  useNetInfo: () => ({ isConnected: true, isInternetReachable: true }),
}))

const mockRunning: FocusSession = {
  id: 'session-running',
  status: 'RUNNING',
  plannedDurationMinutes: 25,
  actualDurationMinutes: null,
  startedAt: '2026-08-13T01:50:00.000Z',
  expectedEndAt: '2026-08-13T02:15:00.000Z',
  pausedAt: null,
  totalPausedSeconds: 0,
  completedAt: null,
  cancelledAt: null,
  projectId: null,
  projectName: null,
  taskId: null,
  taskTitle: null,
  habitId: null,
  habitName: null,
  interruptions: [],
}

jest.mock('@/hooks/useTimerTicker', () => ({
  useTimerTicker: () => ({ session: mockRunning, phase: 'FOCUS', remainingSeconds: 1_420 }),
}))

describe('FocusScreen network failures', () => {
  afterEach(() => jest.restoreAllMocks())

  it('keeps the running timer and shows an actionable error when pause cannot reach the server', async () => {
    jest.spyOn(focusService, 'active').mockResolvedValue(mockRunning)
    jest.spyOn(focusService, 'recent').mockResolvedValue([])
    const pause = jest.spyOn(focusService, 'pause').mockRejectedValue(new AxiosError('Network Error'))
    jest.spyOn(habitService, 'list').mockResolvedValue([])
    jest.spyOn(projectService, 'list').mockResolvedValue([])
    jest.spyOn(settingsService, 'get').mockResolvedValue({
      defaultFocusMinutes: 25,
      defaultBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsBeforeLongBreak: 4,
    } as never)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })
    const view = await render(<QueryClientProvider client={client}><FocusScreen /></QueryClientProvider>)

    await fireEvent.press(screen.getByRole('button', { name: 'Tạm dừng' }))

    await waitFor(() => expect(pause).toHaveBeenCalledWith('session-running'))
    expect(await screen.findByText('Chưa thể cập nhật phiên')).toBeTruthy()
    expect(screen.getByText(/Kiểm tra mạng/)).toBeTruthy()
    expect(screen.getByText('23:40')).toBeTruthy()
    await view.unmount()
    client.clear()
  })
})
