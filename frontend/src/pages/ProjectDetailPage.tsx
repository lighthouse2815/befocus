import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Archive, Check, Edit3, Plus, TimerReset } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog, Dialog } from '../components/Dialog'
import { useToast } from '../components/Toast'
import { Button, EmptyState, ErrorState, Input, LoadingBlock, PageHeader, Stat, Textarea } from '../components/ui'
import { getApiError } from '../services/api'
import { projectKeys, projectsService } from '../services/projects'
import type { HabitColor, ProjectPayload } from '../types'

function minutesLabel(minutes = 0) {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}g ${remainder}p` : `${hours} giờ`
}

const statusLabel = (status: string) => status === 'COMPLETED' ? 'Hoàn thành' : status === 'CANCELLED' ? 'Đã huỷ' : 'Đang chạy'

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [editOpen, setEditOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [editForm, setEditForm] = useState<ProjectPayload>({ name: '', description: '', color: 'moss' })

  const projectQuery = useQuery({ queryKey: projectKeys.detail(id), queryFn: () => projectsService.get(id), enabled: Boolean(id) })
  const project = projectQuery.data
  const maxWeek = useMemo(() => Math.max(1, ...(project?.weeklyActivity ?? []).map((point) => point.minutes)), [project?.weeklyActivity])

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: projectKeys.all })
    void queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) })
    void queryClient.invalidateQueries({ queryKey: projectKeys.tasks(id) })
  }
  const createTask = useMutation({
    mutationFn: () => projectsService.createTask({ projectId: id, title: taskTitle.trim(), dueDate: taskDueDate || null }),
    onSuccess: () => { setTaskTitle(''); setTaskDueDate(''); invalidate(); notify('Đã thêm việc.', 'success') },
    onError: (error) => notify(getApiError(error, 'Không thể thêm việc.'), 'error'),
  })
  const completeTask = useMutation({
    mutationFn: (taskId: string) => projectsService.completeTask(taskId),
    onSuccess: () => { invalidate(); notify('Đã đánh dấu việc hoàn thành.', 'success') },
    onError: (error) => notify(getApiError(error, 'Không thể cập nhật việc.'), 'error'),
  })
  const updateProject = useMutation({
    mutationFn: () => projectsService.update(id, editForm),
    onSuccess: () => { setEditOpen(false); invalidate(); notify('Đã cập nhật dự án.', 'success') },
    onError: (error) => notify(getApiError(error, 'Không thể cập nhật dự án.'), 'error'),
  })
  const archiveProject = useMutation({
    mutationFn: () => projectsService.archive(id),
    onSuccess: () => { setArchiveOpen(false); notify('Đã lưu trữ dự án.', 'success'); void queryClient.invalidateQueries({ queryKey: projectKeys.all }); navigate('/projects') },
    onError: (error) => notify(getApiError(error, 'Không thể lưu trữ dự án.'), 'error'),
  })

  if (projectQuery.isPending) return <LoadingBlock rows={6} label="Đang tải dự án" />
  if (projectQuery.isError || !project) return <ErrorState message={getApiError(projectQuery.error, 'Không thể tải dự án.')} onRetry={() => void projectQuery.refetch()} />

  const submitTask = (event: FormEvent) => { event.preventDefault(); if (taskTitle.trim()) createTask.mutate() }
  const openEdit = () => { setEditForm({ name: project.name, description: project.description ?? '', color: (project.color ?? 'moss') as HabitColor, icon: project.icon ?? '' }); setEditOpen(true) }

  return (
    <div>
      <Link to="/projects" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Tất cả dự án</Link>
      <PageHeader eyebrow={project.archived ? 'Đã lưu trữ' : 'Dự án'} title={project.name} description={project.description || 'Một vùng rõ ràng cho những việc cần tiến triển.'} action={
        <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={openEdit} disabled={project.archived}><Edit3 className="h-4 w-4" aria-hidden="true" />Sửa</Button>{!project.archived && <Button variant="quiet" onClick={() => setArchiveOpen(true)}><Archive className="h-4 w-4" aria-hidden="true" />Lưu trữ</Button>}</div>
      } />

      <section className="grid gap-5 border-b border-line pb-7 sm:grid-cols-3" aria-label="Tổng quan dự án">
        <Stat label="Tổng tập trung" value={minutesLabel(project.totalFocusMinutes)} detail="Từ các phiên đã hoàn thành" />
        <Stat label="Việc đã xong" value={project.completedTasks} detail={`${project.pendingTasks} việc đang mở`} />
        <Stat label="Phiên gần đây" value={project.recentSessions?.length ?? 0} detail="Tối đa 10 phiên" />
      </section>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
        <section aria-labelledby="tasks-title">
          <div className="mb-4 flex items-end justify-between gap-4"><div><p className="section-kicker">Danh sách</p><h2 id="tasks-title" className="mt-1 text-xl font-semibold">Việc cần tiến triển</h2></div><span className="text-sm text-ink-soft">{project.pendingTasks} đang mở</span></div>
          <form onSubmit={submitTask} className="mb-5 grid gap-3 rounded-surface border border-line bg-paper-raised p-4 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
            <Input label="Tên việc mới" value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} maxLength={200} placeholder="Ví dụ: Viết phần phương pháp" />
            <Input label="Hạn (không bắt buộc)" type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} />
            <Button type="submit" loading={createTask.isPending}><Plus className="h-4 w-4" aria-hidden="true" />Thêm việc</Button>
          </form>
          {project.tasks?.length ? <ul className="divide-y divide-line border-y border-line">{project.tasks.map((task) => <li key={task.id} className="flex items-start gap-3 py-4"><button type="button" className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${task.completed ? 'border-moss bg-moss text-white' : 'border-line-strong text-transparent hover:border-moss'}`} onClick={() => !task.completed && completeTask.mutate(task.id)} aria-label={task.completed ? `${task.title} đã hoàn thành` : `Đánh dấu ${task.title} hoàn thành`} disabled={task.completed || completeTask.isPending}>{task.completed && <Check className="h-4 w-4" aria-hidden="true" />}</button><div className="min-w-0 flex-1"><p className={task.completed ? 'text-ink-soft line-through' : 'font-semibold'}>{task.title}</p><p className="mt-1 text-xs text-ink-soft">{task.dueDate ? `Hạn ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString('vi-VN')}` : 'Chưa đặt hạn'} · {minutesLabel(task.focusMinutes)} tập trung</p></div></li>)}</ul> : <EmptyState title="Chưa có việc" description="Thêm việc đầu tiên để phiên tập trung có nơi cập nhật." />}
        </section>

        <aside className="space-y-9">
          <section aria-labelledby="week-title"><div className="mb-4"><p className="section-kicker">7 ngày gần đây</p><h2 id="week-title" className="mt-1 text-xl font-semibold">Hoạt động tập trung</h2></div><div className="space-y-3">{(project.weeklyActivity ?? []).map((point) => <div key={point.date} className="grid grid-cols-[72px_minmax(0,1fr)_42px] items-center gap-3 text-sm"><time className="text-ink-soft" dateTime={point.date}>{new Date(`${point.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' })}</time><div className="h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-moss" style={{ width: `${(point.minutes / maxWeek) * 100}%` }} /></div><span className="font-mono text-right text-xs">{point.minutes}p</span></div>)}</div></section>
          <section aria-labelledby="recent-title"><div className="mb-4"><p className="section-kicker">Dấu vết</p><h2 id="recent-title" className="mt-1 text-xl font-semibold">Phiên gần nhất</h2></div>{project.recentSessions?.length ? <ol className="divide-y divide-line border-y border-line">{project.recentSessions.slice(0, 5).map((session) => <li key={session.id} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="flex min-w-0 items-center gap-2"><TimerReset className="h-4 w-4 shrink-0 text-moss" aria-hidden="true" /><span className="truncate">{session.taskTitle || 'Phiên độc lập'}</span></span><span className="shrink-0 font-mono text-xs text-ink-soft">{session.actualDurationMinutes ?? 0}p · {statusLabel(session.status)}</span></li>)}</ol> : <p className="border-y border-line py-5 text-sm text-ink-soft">Chưa có phiên nào gắn với dự án này.</p>}</section>
        </aside>
      </div>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Sửa dự án"><form className="space-y-4" onSubmit={(event) => { event.preventDefault(); updateProject.mutate() }}><Input label="Tên dự án" value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} required maxLength={120} /><Textarea label="Mô tả" value={editForm.description ?? ''} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} maxLength={1000} /><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Để sau</Button><Button type="submit" loading={updateProject.isPending}>Lưu thay đổi</Button></div></form></Dialog>
      <ConfirmDialog open={archiveOpen} onClose={() => setArchiveOpen(false)} onConfirm={() => archiveProject.mutate()} title="Lưu trữ dự án?" description="Dữ liệu, việc và phiên tập trung vẫn được giữ lại. Dự án sẽ không còn xuất hiện trong lựa chọn phiên mới." confirmLabel="Lưu trữ" loading={archiveProject.isPending} />
    </div>
  )
}
