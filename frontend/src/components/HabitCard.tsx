import { Archive, Check, ChevronRight, Undo2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Habit } from '../types'
import { habitColorClass, scheduleLabel } from '../utils/habits'
import { Button, ProgressBar } from './ui'

export function HabitCard({
  habit,
  onToggle,
  onArchive,
  busy,
}: {
  habit: Habit
  onToggle: (habit: Habit) => void
  onArchive: (habit: Habit) => void
  busy?: boolean
}) {
  const archived = Boolean(habit.archivedAt)
  const weekly = habit.scheduleType === 'TIMES_PER_WEEK'
  const value = weekly ? (habit.weeklyCompletedOccurrences ?? 0) : habit.todayProgress
  const target = weekly ? (habit.weeklyTargetOccurrences ?? habit.timesPerWeek ?? 1) : habit.todayTarget
  const completed = weekly ? habit.weeklyTargetMet : habit.completedToday
  const progressUnit = weekly ? 'lần' : (habit.unit || '')

  return (
    <article className="border-b border-line py-5 first:border-t">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,260px)_auto] sm:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${habitColorClass(habit.color)}`} aria-hidden="true" />
            <Link to={`/habits/${habit.id}`} className="truncate text-lg font-semibold tracking-[-0.02em] hover:text-moss-dark hover:underline hover:underline-offset-4">
              {habit.name}
            </Link>
            {archived && <span className="rounded-control border border-line px-2 py-0.5 text-xs text-ink-soft">Đã lưu trữ</span>}
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {scheduleLabel(habit)}
            {habit.reminderTime ? ` · Nhắc ${habit.reminderTime.slice(0, 5)}` : ''}
            {!archived && !habit.scheduledToday && habit.scheduleType !== 'TIMES_PER_WEEK' ? ' · Nghỉ hôm nay' : ''}
          </p>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="font-mono font-medium">{value} / {target} {progressUnit}</span>
            <span className={completed ? 'font-medium text-moss-dark' : 'text-ink-soft'}>
              {completed ? (weekly ? 'Đạt tuần' : 'Hoàn thành') : `${habit.currentStreak} ${weekly ? 'tuần' : 'nhịp'}`}
            </span>
          </div>
          <ProgressBar value={value} max={target} label={weekly ? `Tiến độ tuần này của ${habit.name}` : `Tiến độ hôm nay của ${habit.name}`} />
        </div>

        <div className="flex items-center justify-end gap-1">
          {!archived && habit.scheduledToday && (
            <Button
              variant={habit.completedToday ? 'quiet' : 'secondary'}
              size="sm"
              onClick={() => onToggle(habit)}
              loading={busy}
              aria-label={habit.completedToday ? `Hoàn tác ${habit.name}` : `Hoàn thành ${habit.name}`}
            >
              {habit.completedToday
                ? <><Undo2 className="h-4 w-4" />Hoàn tác</>
                : <><Check className="h-4 w-4" />Xong</>}
            </Button>
          )}
          {!archived && (
            <button
              type="button"
              onClick={() => onArchive(habit)}
              className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-paper-raised hover:text-ink"
              aria-label={`Lưu trữ ${habit.name}`}
            >
              <Archive className="h-4 w-4" />
            </button>
          )}
          <Link
            to={`/habits/${habit.id}`}
            className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-paper-raised hover:text-ink"
            aria-label={`Xem chi tiết ${habit.name}`}
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </article>
  )
}
