import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { Habit } from '../types'
import { HabitCard } from './HabitCard'

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'habit-1',
    name: 'Học tiếng Anh',
    description: null,
    type: 'DURATION',
    targetValue: 60,
    unit: 'phút',
    scheduleType: 'DAILY',
    weekdays: [],
    timesPerWeek: null,
    intervalDays: null,
    scheduleStartDate: null,
    reminderTime: null,
    color: 'moss',
    archivedAt: null,
    scheduledToday: true,
    todayProgress: 25,
    todayTarget: 60,
    completedToday: false,
    weeklyCompletedOccurrences: null,
    weeklyTargetOccurrences: null,
    weeklyTargetMet: false,
    currentStreak: 4,
    longestStreak: 8,
    entries: [],
    ...overrides,
  }
}

function renderCard(value: Habit) {
  render(
    <MemoryRouter>
      <HabitCard habit={value} onToggle={vi.fn()} onArchive={vi.fn()} />
    </MemoryRouter>,
  )
}

describe('HabitCard', () => {
  it('offers a real completion action for a scheduled active habit', () => {
    renderCard(habit())

    expect(screen.getByRole('button', { name: 'Hoàn thành Học tiếng Anh' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25')
  })

  it('does not offer completion on an unscheduled day', () => {
    renderCard(habit({ scheduledToday: false }))

    expect(screen.queryByRole('button', { name: 'Hoàn thành Học tiếng Anh' })).not.toBeInTheDocument()
    expect(screen.getByText(/Nghỉ hôm nay/)).toBeInTheDocument()
  })

  it('shows weekly progress separately from todays completion state', () => {
    renderCard(habit({
      type: 'COUNT',
      targetValue: 1,
      unit: 'lần',
      scheduleType: 'TIMES_PER_WEEK',
      timesPerWeek: 3,
      weeklyCompletedOccurrences: 2,
      weeklyTargetOccurrences: 3,
      currentStreak: 2,
    }))

    expect(screen.getByText(/2 \/ 3 lần/)).toBeInTheDocument()
    expect(screen.getByText('2 tuần')).toBeInTheDocument()
  })

  it('marks archived habits and removes mutating controls', () => {
    renderCard(habit({ archivedAt: '2026-08-12T02:00:00Z' }))

    expect(screen.getByText('Đã lưu trữ')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
