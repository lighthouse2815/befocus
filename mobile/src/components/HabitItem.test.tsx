import { fireEvent, render, screen } from '@testing-library/react-native'
import { HabitItem } from './HabitItem'
import type { Habit } from '@/types'

const base: Habit = {
  id: 'habit-1',
  name: 'Đọc sách',
  type: 'COUNT',
  targetValue: 20,
  unit: 'trang',
  scheduleType: 'DAILY',
  color: 'moss',
  scheduledToday: true,
  todayProgress: 12,
  todayTarget: 20,
  completedToday: false,
  weeklyTargetMet: false,
  currentStreak: 4,
  longestStreak: 8,
  entries: [],
}

describe('HabitItem', () => {
  it('exposes fast count increment and decrement actions', async () => {
    const onSetValue = jest.fn()
    await render(<HabitItem habit={base} onOpen={jest.fn()} onSetValue={onSetValue} onUndo={jest.fn()} />)

    await fireEvent.press(screen.getByRole('button', { name: 'Tăng tiến độ Đọc sách' }))
    expect(onSetValue).toHaveBeenLastCalledWith(13)
    await fireEvent.press(screen.getByRole('button', { name: 'Giảm tiến độ Đọc sách' }))
    expect(onSetValue).toHaveBeenLastCalledWith(11)
  })

  it('completes a boolean habit directly from the list', async () => {
    const onSetValue = jest.fn()
    const booleanHabit: Habit = { ...base, type: 'BOOLEAN', targetValue: 1, todayTarget: 1, todayProgress: 0, unit: 'lần' }
    await render(<HabitItem habit={booleanHabit} onOpen={jest.fn()} onSetValue={onSetValue} onUndo={jest.fn()} />)

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Đọc sách, chưa hoàn thành' }))
    expect(onSetValue).toHaveBeenCalledWith(1)
  })

  it('undoes a completed boolean habit without opening its detail', async () => {
    const onUndo = jest.fn()
    const done: Habit = { ...base, type: 'BOOLEAN', targetValue: 1, todayTarget: 1, todayProgress: 1, completedToday: true, unit: 'lần' }
    await render(<HabitItem habit={done} onOpen={jest.fn()} onSetValue={jest.fn()} onUndo={onUndo} />)

    await fireEvent.press(screen.getByRole('checkbox', { name: 'Đọc sách, đã hoàn thành' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })
})
