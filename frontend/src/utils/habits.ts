import type { Habit, HabitColor } from '../types'

const colorClasses: Record<HabitColor, string> = {
  moss: 'bg-moss',
  clay: 'bg-clay',
  amber: 'bg-amber',
  ocean: 'bg-ocean',
  plum: 'bg-plum',
  ink: 'bg-ink',
}

export function habitColorClass(color: HabitColor | null | undefined) {
  return colorClasses[color ?? 'moss']
}

export function scheduleLabel(habit: Habit) {
  if (habit.scheduleType === 'DAILY') return 'Mỗi ngày'
  if (habit.scheduleType === 'TIMES_PER_WEEK') return `${habit.timesPerWeek ?? 1} lần mỗi tuần`
  if (habit.scheduleType === 'INTERVAL') return `Mỗi ${habit.intervalDays ?? 2} ngày`
  const labels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  return (habit.weekdays ?? []).map((day) => labels[day - 1] ?? day).join(' · ') || 'Theo ngày đã chọn'
}
