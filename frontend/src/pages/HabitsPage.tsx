import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/Dialog'
import { HabitCard } from '../components/HabitCard'
import { useToast } from '../components/Toast'
import { Button, EmptyState, ErrorState, LoadingBlock, PageHeader } from '../components/ui'
import { isoToday } from '../hooks/useDateRange'
import { getApiError } from '../services/api'
import { habitKeys, habitsService } from '../services/habits'
import type { Habit } from '../types'

export function HabitsPage() {
  const [includeArchived, setIncludeArchived] = useState(false)
  const [archiveTarget, setArchiveTarget] = useState<Habit | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const today = isoToday()
  const query = useQuery({ queryKey: habitKeys.list(includeArchived), queryFn: () => habitsService.list(includeArchived) })
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: habitKeys.all }); void queryClient.invalidateQueries({ queryKey: ['analytics'] }) }
  const entryMutation = useMutation({
    mutationFn: async (habit: Habit) => {
      if (habit.completedToday) await habitsService.removeEntry(habit.id, today)
      else await habitsService.setEntry(habit.id, today, { value: habit.todayTarget, note: '' })
    },
    onSuccess: (_, habit) => { refresh(); notify(habit.completedToday ? 'Đã hoàn tác tiến độ hôm nay.' : 'Đã hoàn thành thói quen hôm nay.') },
    onError: (error) => notify(getApiError(error), 'error'),
  })
  const archiveMutation = useMutation({
    mutationFn: (habit: Habit) => habitsService.archive(habit.id),
    onSuccess: () => { setArchiveTarget(null); refresh(); notify('Đã lưu trữ thói quen.') },
    onError: (error) => notify(getApiError(error), 'error'),
  })

  return (
    <>
      <PageHeader eyebrow="Thói quen" title="Nhịp đều tạo nên tiến bộ" description="Theo dõi điều bạn muốn lặp lại, với mục tiêu và lịch phù hợp." action={<Button onClick={() => navigate('/habits/new')}><Plus className="h-4 w-4" />Tạo thói quen</Button>} />
      <div className="mb-5 flex items-center justify-between gap-4">
        <p className="text-sm text-ink-soft">{query.data ? `${query.data.length} thói quen${includeArchived ? ' gồm mục đã lưu trữ' : ' đang hoạt động'}` : 'Danh sách thói quen'}</p>
        <button type="button" className="inline-flex min-h-11 items-center gap-2 rounded-control px-3 text-sm font-semibold text-ink-soft hover:bg-paper-raised hover:text-ink" onClick={() => setIncludeArchived((value) => !value)} aria-pressed={includeArchived}><Archive className="h-4 w-4" />{includeArchived ? 'Ẩn mục lưu trữ' : 'Xem mục lưu trữ'}</button>
      </div>
      {query.isPending ? <LoadingBlock rows={5} /> : query.isError ? <ErrorState message={getApiError(query.error, 'Không thể tải thói quen.')} onRetry={() => void query.refetch()} /> : query.data.length === 0 ? <EmptyState title={includeArchived ? 'Không có thói quen đã lưu' : 'Bạn chưa có thói quen nào'} description={includeArchived ? 'Các thói quen được lưu trữ sẽ xuất hiện ở đây.' : 'Tạo thói quen đầu tiên để bắt đầu theo dõi tiến độ mỗi ngày.'} actionLabel={!includeArchived ? 'Tạo thói quen đầu tiên' : undefined} onAction={!includeArchived ? () => navigate('/habits/new') : undefined} /> : <div>{query.data.map((habit) => <HabitCard key={habit.id} habit={habit} onToggle={(item) => entryMutation.mutate(item)} onArchive={setArchiveTarget} busy={entryMutation.isPending && entryMutation.variables?.id === habit.id} />)}</div>}
      <ConfirmDialog open={Boolean(archiveTarget)} onClose={() => setArchiveTarget(null)} onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)} title="Lưu trữ thói quen?" description={`“${archiveTarget?.name ?? ''}” sẽ rời khỏi danh sách hôm nay nhưng vẫn giữ toàn bộ lịch sử.`} confirmLabel="Lưu trữ" loading={archiveMutation.isPending} />
    </>
  )
}
