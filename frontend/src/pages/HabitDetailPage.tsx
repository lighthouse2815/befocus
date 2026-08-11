import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Archive, ArrowLeft, CalendarDays, Edit3, Flame, Trash2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog } from '../components/Dialog'
import { HabitHeatmap } from '../components/HabitHeatmap'
import { useToast } from '../components/Toast'
import { Button, ErrorState, Input, LoadingBlock, PageHeader, ProgressBar, Stat, Textarea } from '../components/ui'
import { getApiError } from '../services/api'
import { habitKeys, habitsService } from '../services/habits'
import type { HabitEntry } from '../types'
import { scheduleLabel } from '../utils/habits'

interface EntryFields {
  date: string
  value: number
  note: string
}

export function HabitDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null)
  const to = format(new Date(), 'yyyy-MM-dd')
  const from = format(subDays(new Date(), 89), 'yyyy-MM-dd')
  const query = useQuery({
    queryKey: habitKeys.detail(id, from, to),
    queryFn: () => habitsService.get(id, from, to),
    enabled: Boolean(id),
  })
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EntryFields>({
    defaultValues: { date: to, value: 1, note: '' },
  })

  useEffect(() => {
    if (!query.data) return
    reset({
      date: to,
      value: query.data.type === 'BOOLEAN' ? 1 : query.data.targetValue,
      note: '',
    })
  }, [query.data, reset, to])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: habitKeys.all })
    void queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }

  const entry = useMutation({
    mutationFn: (values: EntryFields) => habitsService.setEntry(id, values.date, {
      value: Number(values.value),
      note: values.note.trim(),
    }),
    onSuccess: () => {
      invalidate()
      reset({
        date: to,
        value: query.data?.type === 'BOOLEAN' ? 1 : query.data?.targetValue || 1,
        note: '',
      })
      notify('Đã lưu tiến độ.')
    },
    onError: (error) => notify(getApiError(error), 'error'),
  })
  const removeEntry = useMutation({
    mutationFn: (date: string) => habitsService.removeEntry(id, date),
    onSuccess: () => {
      invalidate()
      notify('Đã xóa ghi nhận của ngày này.')
    },
    onError: (error) => notify(getApiError(error), 'error'),
  })
  const archive = useMutation({
    mutationFn: () => habitsService.archive(id),
    onSuccess: () => {
      invalidate()
      notify('Đã lưu trữ thói quen.')
      navigate('/habits', { replace: true })
    },
    onError: (error) => notify(getApiError(error), 'error'),
  })
  const remove = useMutation({
    mutationFn: () => habitsService.remove(id),
    onSuccess: () => {
      invalidate()
      notify('Đã xóa thói quen.')
      navigate('/habits', { replace: true })
    },
    onError: (error) => notify(getApiError(error), 'error'),
  })

  if (query.isPending) return <LoadingBlock rows={7} />
  if (query.isError || !query.data) {
    return <ErrorState message={getApiError(query.error, 'Không thể tải chi tiết thói quen.')} onRetry={() => void query.refetch()} />
  }

  const habit = query.data
  const archived = Boolean(habit.archivedAt)
  const weekly = habit.scheduleType === 'TIMES_PER_WEEK'
  const progressValue = weekly ? (habit.weeklyCompletedOccurrences ?? 0) : habit.todayProgress
  const progressTarget = weekly ? (habit.weeklyTargetOccurrences ?? habit.timesPerWeek ?? 1) : habit.todayTarget
  const progressUnit = weekly ? 'lần' : (habit.unit || '')
  const progressComplete = weekly ? habit.weeklyTargetMet : habit.completedToday
  const entries = [...habit.entries].sort((a, b) => b.date.localeCompare(a.date))
  const streakUnit = weekly ? 'tuần đạt mục tiêu' : 'lần theo lịch'

  return (
    <>
      <Link to="/habits" className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-semibold text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        Danh sách thói quen
      </Link>

      <PageHeader
        eyebrow={`${scheduleLabel(habit)}${archived ? ' · Đã lưu trữ' : ''}`}
        title={habit.name}
        description={habit.description || 'Theo dõi tiến độ và lịch sử của thói quen này.'}
        action={(
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate(`/habits/${id}/edit`)}>
              <Edit3 className="h-4 w-4" />
              Chỉnh sửa
            </Button>
            {!archived && (
              <button
                type="button"
                onClick={() => setConfirm('archive')}
                className="flex h-11 w-11 items-center justify-center rounded-control border border-line-strong bg-paper-raised text-ink-soft hover:text-ink"
                aria-label="Lưu trữ thói quen"
              >
                <Archive className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirm('delete')}
              className="flex h-11 w-11 items-center justify-center rounded-control border border-line-strong bg-paper-raised text-ink-soft hover:border-danger hover:text-danger"
              aria-label="Xóa thói quen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      />

      <section className="surface p-5 sm:p-6" aria-labelledby="current-progress-title">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className="section-kicker">{weekly ? 'Tuần này' : 'Hôm nay'}</p>
            <h2 id="current-progress-title" className="mt-1 text-2xl font-semibold">
              {progressComplete
                ? 'Đã đạt mục tiêu'
                : (!weekly && !habit.scheduledToday ? 'Không nằm trong lịch hôm nay' : 'Một bước tiếp theo')}
            </h2>
            <p className="mt-2 font-mono text-3xl font-semibold tracking-[-0.04em]">
              {progressValue} / {progressTarget}{' '}
              <span className="font-sans text-base font-normal text-ink-soft">{progressUnit}</span>
            </p>
            <div className="mt-4 max-w-lg">
              <ProgressBar
                value={progressValue}
                max={progressTarget}
                label={weekly ? `Tiến độ tuần này của ${habit.name}` : `Tiến độ hôm nay của ${habit.name}`}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <Stat label="Chuỗi hiện tại" value={habit.currentStreak} detail={streakUnit} />
            <Stat label="Dài nhất" value={habit.longestStreak} detail={streakUnit} />
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="heatmap-title">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="section-kicker">Lịch sử 90 ngày</p>
              <h2 id="heatmap-title" className="mt-1 text-xl font-semibold">Dấu vết đều đặn</h2>
            </div>
            <CalendarDays className="h-5 w-5 text-ink-soft" aria-hidden="true" />
          </div>
          <div className="surface p-5">
            <HabitHeatmap from={from} to={to} cells={habit.entries} target={habit.targetValue} unit={habit.unit} />
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-clay" aria-hidden="true" />
              <h2 className="text-xl font-semibold">Ghi nhận gần đây</h2>
            </div>
            {entries.length === 0 ? (
              <p className="border-t border-line py-5 text-sm text-ink-soft">Chưa có tiến độ nào được ghi nhận trong khoảng này.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {entries.slice(0, 12).map((item: HabitEntry) => (
                  <li key={item.date} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {new Intl.DateTimeFormat('vi-VN', { dateStyle: 'full' }).format(new Date(`${item.date}T12:00:00`))}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-soft">
                        {item.value} / {habit.targetValue} {habit.unit || ''}
                        {item.note ? ` · ${item.note}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="quiet"
                      size="sm"
                      onClick={() => removeEntry.mutate(item.date)}
                      loading={removeEntry.isPending && removeEntry.variables === item.date}
                    >
                      Xóa
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="surface h-fit p-5 sm:p-6" aria-labelledby="entry-title">
          <p className="section-kicker">Ghi tiến độ</p>
          <h2 id="entry-title" className="mt-1 text-xl font-semibold">Cập nhật một ngày</h2>
          {archived ? (
            <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
              Thói quen đã lưu trữ nên không nhận thêm tiến độ mới. Bạn vẫn có thể sửa hoặc xóa các ghi nhận cũ.
            </p>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleSubmit((values) => entry.mutate(values))}>
              <Input label="Ngày" type="date" max={to} error={errors.date?.message} {...register('date', { required: 'Chọn ngày.' })} />
              {habit.type === 'BOOLEAN' ? (
                <input type="hidden" value={1} {...register('value', { valueAsNumber: true })} />
              ) : (
                <Input
                  label={`Giá trị (${habit.unit || 'đơn vị'})`}
                  type="number"
                  min={0}
                  max={1000000}
                  step="any"
                  error={errors.value?.message}
                  {...register('value', {
                    valueAsNumber: true,
                    required: 'Nhập giá trị.',
                    min: { value: 0, message: 'Giá trị không thể âm.' },
                    max: { value: 1000000, message: 'Giá trị quá lớn.' },
                  })}
                />
              )}
              <Textarea label="Ghi chú (không bắt buộc)" maxLength={1000} {...register('note')} />
              <Button className="w-full" type="submit" loading={entry.isPending}>Lưu tiến độ</Button>
            </form>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'archive'}
        onClose={() => setConfirm(null)}
        onConfirm={() => archive.mutate()}
        title="Lưu trữ thói quen?"
        description="Thói quen sẽ không còn xuất hiện trong danh sách hôm nay nhưng lịch sử vẫn được giữ lại."
        confirmLabel="Lưu trữ"
        loading={archive.isPending}
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={() => remove.mutate()}
        title="Xóa vĩnh viễn?"
        description="Toàn bộ lịch sử của thói quen này sẽ bị xóa và không thể khôi phục."
        confirmLabel="Xóa thói quen"
        loading={remove.isPending}
      />
    </>
  )
}
