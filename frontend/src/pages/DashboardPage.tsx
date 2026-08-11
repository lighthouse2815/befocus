import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Plus, Undo2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, EmptyState, ErrorState, LoadingBlock, PageHeader, ProgressBar, Stat } from '../components/ui'
import { useToast } from '../components/Toast'
import { habitKeys, habitsService } from '../services/habits'
import { getApiError } from '../services/api'
import { dateLabel, isoToday } from '../hooks/useDateRange'
import { useAuthStore } from '../store/authStore'
import type { Habit } from '../types'

function HabitLedgerRow({
  habit,
  onToggle,
  loading,
}: {
  habit: Habit
  onToggle: (habit: Habit) => void
  loading: boolean
}) {
  const weekly = habit.scheduleType === 'TIMES_PER_WEEK'
  const progress = weekly ? (habit.weeklyCompletedOccurrences ?? 0) : habit.todayProgress
  const target = weekly ? (habit.weeklyTargetOccurrences ?? habit.timesPerWeek ?? 1) : habit.todayTarget
  const unit = weekly ? 'lần' : (habit.unit || '')
  const goalMet = weekly ? habit.weeklyTargetMet : habit.completedToday

  return (
    <div className="grid gap-3 border-b border-line py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-center">
      <div className="min-w-0">
        <Link to={`/habits/${habit.id}`} className="font-semibold hover:text-moss-dark hover:underline hover:underline-offset-4">
          {habit.name}
        </Link>
        <p className="mt-0.5 truncate text-sm text-ink-soft">
          {habit.description || (weekly ? `${target} lần trong tuần` : `${target} ${unit}`)}
        </p>
      </div>
      <div>
        <div className="mb-1 flex justify-between gap-2 text-xs text-ink-soft">
          <span>{progress} / {target} {unit}</span>
          <span>{goalMet ? 'Đạt mục tiêu' : 'Đang tiến hành'}</span>
        </div>
        <ProgressBar
          value={progress}
          max={target}
          label={weekly ? `Tiến độ tuần này của ${habit.name}` : `Tiến độ hôm nay của ${habit.name}`}
        />
      </div>
      <Button
        variant={habit.completedToday ? 'quiet' : 'secondary'}
        size="sm"
        onClick={() => onToggle(habit)}
        loading={loading}
        aria-label={habit.completedToday ? `Hoàn tác ${habit.name}` : `Đánh dấu ${habit.name} hoàn thành`}
      >
        {habit.completedToday
          ? <><Undo2 className="h-4 w-4 text-moss" aria-hidden="true" />Hoàn tác</>
          : <><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Hoàn thành</>}
      </Button>
    </div>
  )
}

export function DashboardPage() {
  const today = isoToday()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const user = useAuthStore((state) => state.user)
  const habits = useQuery({
    queryKey: habitKeys.list(false),
    queryFn: () => habitsService.list(false),
  })

  const completeHabit = useMutation({
    mutationFn: async (habit: Habit) => {
      if (habit.completedToday) await habitsService.removeEntry(habit.id, today)
      else await habitsService.setEntry(habit.id, today, { value: habit.todayTarget, note: '' })
    },
    onSuccess: (_, habit) => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.all })
      notify(habit.completedToday ? 'Đã hoàn tác tiến độ hôm nay.' : 'Đã cập nhật thói quen hôm nay.')
    },
    onError: (error) => notify(getApiError(error), 'error'),
  })

  const todayHabits = useMemo(
    () => (habits.data ?? []).filter((habit) => habit.scheduledToday),
    [habits.data],
  )
  const completedCount = todayHabits.filter((habit) => habit.completedToday).length
  const bestStreak = (habits.data ?? []).reduce((best, habit) => Math.max(best, habit.currentStreak), 0)
  const reminders = todayHabits.filter((habit) => Boolean(habit.reminderTime)).length
  const firstName = user?.name.trim().split(/\s+/).at(-1) || 'bạn'

  if (habits.isPending) return <LoadingBlock rows={7} label="Đang tải trang hôm nay" />
  if (habits.isError) {
    return <ErrorState message={getApiError(habits.error, 'Không thể tải tổng quan hôm nay.')} onRetry={() => void habits.refetch()} />
  }

  return (
    <>
      <PageHeader
        eyebrow={dateLabel(today)}
        title={`Chào ${firstName}, hôm nay mình giữ nhịp nào?`}
        description="Những việc lặp lại đúng lịch được đặt ở đây để bạn bắt đầu mà không phải tìm kiếm."
        action={(
          <Button onClick={() => navigate('/habits/new')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Thêm thói quen
          </Button>
        )}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]" aria-label="Tổng quan hôm nay">
        <div className="surface p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="section-kicker">Sổ theo dõi hôm nay</p>
              <h2 className="mt-1 text-xl font-semibold">Điều cần lặp lại</h2>
            </div>
            <Link to="/habits" className="inline-flex min-h-11 items-center gap-1 rounded-control px-2 text-sm font-semibold text-moss-dark hover:bg-moss-wash">
              Xem tất cả
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-3">
            {(habits.data ?? []).length === 0 ? (
              <EmptyState
                title="Bạn chưa có thói quen nào"
                description="Tạo thói quen đầu tiên để bắt đầu theo dõi tiến độ mỗi ngày."
                actionLabel="Tạo thói quen"
                onAction={() => navigate('/habits/new')}
              />
            ) : todayHabits.length === 0 ? (
              <div className="border-y border-line py-10">
                <p className="font-semibold">Hôm nay không có thói quen theo lịch.</p>
                <p className="mt-1 text-sm text-ink-soft">Khoảng trống này là có chủ đích. Các thói quen sẽ trở lại đúng ngày đã chọn.</p>
              </div>
            ) : (
              todayHabits.map((habit) => (
                <HabitLedgerRow
                  key={habit.id}
                  habit={habit}
                  onToggle={(item) => completeHabit.mutate(item)}
                  loading={completeHabit.isPending && completeHabit.variables?.id === habit.id}
                />
              ))
            )}
          </div>
        </div>

        <aside className="surface flex flex-col justify-between p-5 sm:p-6">
          <div>
            <p className="section-kicker">Nhịp hôm nay</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-mono text-5xl font-semibold tracking-[-0.08em]">{completedCount}</span>
              <span className="mb-2 text-ink-soft">/ {todayHabits.length} hoàn thành</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-soft">
              Tiến độ chỉ tính từ dữ liệu bạn đã ghi nhận, không dùng số liệu mẫu.
            </p>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-line pt-5">
            <Stat label="Chuỗi tốt nhất" value={bestStreak} detail="nhịp theo lịch" />
            <Stat label="Có nhắc giờ" value={reminders} detail="trong hôm nay" />
          </div>
        </aside>
      </section>

      <section className="mt-8 border-t border-line pt-6">
        <p className="section-kicker">Bước tiếp theo</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Điều chỉnh lịch khi nhịp sống thay đổi</h2>
            <p className="mt-1 text-sm text-ink-soft">Mục tiêu vừa sức và lịch đúng thực tế giúp streak có ý nghĩa hơn.</p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/habits')}>
            Quản lý thói quen
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </section>
    </>
  )
}
