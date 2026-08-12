import { fireEvent, render, screen } from '@testing-library/react-native'
import { FocusTimerControls } from './FocusTimerControls'
import type { FocusSession } from '@/types'

const running: FocusSession = {
  id: 'session-1', status: 'RUNNING', plannedDurationMinutes: 25, actualDurationMinutes: null,
  startedAt: '2026-08-13T10:00:00Z', expectedEndAt: '2026-08-13T10:25:00Z', pausedAt: null,
  totalPausedSeconds: 0, completedAt: null, cancelledAt: null, projectId: 'project-1', projectName: 'Mobile',
  taskId: 'task-1', taskTitle: 'Kiểm tra timer', habitId: null, habitName: null, interruptions: [],
}

describe('FocusTimerControls', () => {
  it('shows timestamp-derived progress and invokes running controls', async () => {
    const onPause = jest.fn()
    const onComplete = jest.fn()
    await render(<FocusTimerControls session={running} remainingSeconds={754} onPause={onPause} onResume={jest.fn()} onComplete={onComplete} />)

    expect(screen.getByLabelText('Còn 12 phút 34 giây')).toHaveTextContent('12:34')
    await fireEvent.press(screen.getByRole('button', { name: 'Tạm dừng' }))
    await fireEvent.press(screen.getByRole('button', { name: 'Hoàn thành' }))
    expect(onPause).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('offers resume instead of pause for a paused session', async () => {
    const onResume = jest.fn()
    await render(<FocusTimerControls session={{ ...running, status: 'PAUSED', pausedAt: '2026-08-13T10:05:00Z' }} remainingSeconds={1200} onPause={jest.fn()} onResume={onResume} onComplete={jest.fn()} />)

    expect(screen.queryByRole('button', { name: 'Tạm dừng' })).toBeNull()
    await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục' }))
    expect(onResume).toHaveBeenCalledTimes(1)
  })
})
