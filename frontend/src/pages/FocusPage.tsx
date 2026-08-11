import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Ban,
  Check,
  Link2,
  MessageCircleWarning,
  Pause,
  Play,
  RotateCcw,
  TimerReset,
} from 'lucide-react'
import { ConfirmDialog } from '../components/Dialog'
import { useToast } from '../components/Toast'
import {
  Button,
  EmptyState,
  ErrorState,
  Input,
  LoadingBlock,
  PageHeader,
  ProgressBar,
  Select,
} from '../components/ui'
import { useTimerTicker } from '../hooks/useTimerTicker'
import { focusKeys, focusService } from '../services/focus'
import { habitKeys, habitsService } from '../services/habits'
import { projectKeys, projectsService } from '../services/projects'
import { getApiError } from '../services/api'
import { formatTimer, useTimerStore } from '../store/timerStore'
import type { FocusSession, FocusStatus, InterruptionKind, Project, Task } from '../types'

const presets = [25, 50, 90]

const interruptionLabels: Record<InterruptionKind, string> = {
  PHONE: 'Điện thoại',
  MESSAGE: 'Tin nhắn',
  NOISE: 'Tiếng ồn',
  MEETING: 'Cuộc họp',
  OTHER: 'Khác',
}

const statusLabels: Record<FocusStatus, string> = {
  READY: 'Sẵn sàng',
  RUNNING: 'Đang tập trung',
  PAUSED: 'Đang tạm dừng',
  COMPLETED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
}

const dateTime = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function timerAria(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `Còn ${minutes} phút ${remainder} giây`
}

export function FocusPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const { session, phase, remainingSeconds } = useTimerTicker()
  const hydrated = useTimerStore((state) => state.hydrated)
  const completedFocusCount = useTimerStore((state) => state.completedFocusCount)
  const setSession = useTimerStore((state) => state.setSession)
  const completeFocus = useTimerStore((state) => state.completeFocus)
  const finishBreak = useTimerStore((state) => state.finishBreak)
  const [duration, setDuration] = useState(25)
  const [habitId, setHabitId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [durationError, setDurationError] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [interruptionKind, setInterruptionKind] = useState<InterruptionKind>('PHONE')
  const [interruptionNote, setInterruptionNote] = useState('')

  const activeQuery = useQuery({ queryKey: focusKeys.active, queryFn: focusService.active })
  const habitsQuery = useQuery({ queryKey: habitKeys.list(false), queryFn: () => habitsService.list(false) })
  const projectsQuery = useQuery({ queryKey: projectKeys.list, queryFn: projectsService.list })
  const tasksQuery = useQuery({
    queryKey: projectKeys.tasks(projectId || undefined),
    queryFn: () => projectsService.tasks(projectId),
    enabled: Boolean(projectId),
  })
  const recentQuery = useQuery({ queryKey: focusKeys.recent(10), queryFn: () => focusService.recent(10) })

  const durationHabits = useMemo(
    () => (habitsQuery.data ?? []).filter(
      (habit) => habit.type === 'DURATION' && habit.scheduledToday && !habit.archivedAt,
    ),
    [habitsQuery.data],
  )
  const activeProjects = useMemo(() => (projectsQuery.data ?? []).filter((project) => !project.archived), [projectsQuery.data])
  const openTasks = useMemo(() => (tasksQuery.data ?? []).filter((task) => !task.completed && task.status !== 'COMPLETED'), [tasksQuery.data])

  const syncSession = (next: FocusSession | null) => {
    setSession(next)
    queryClient.setQueryData(focusKeys.active, next)
    if (next) {
      queryClient.setQueryData<FocusSession[]>(focusKeys.recent(10), (current) =>
        current?.map((item) => item.id === next.id ? next : item),
      )
    }
  }

  const refreshAfterTerminalState = () => {
    void queryClient.invalidateQueries({ queryKey: focusKeys.all })
    void queryClient.invalidateQueries({ queryKey: habitKeys.all })
  }

  const start = useMutation({
    mutationFn: (payload: Parameters<typeof focusService.start>[0]) => focusService.start(payload),
    onSuccess: (started) => {
      syncSession(started)
      void queryClient.invalidateQueries({ queryKey: focusKeys.recent(10) })
      notify('Phiên tập trung đã bắt đầu.', 'success')
    },
    onError: (error) => notify(getApiError(error, 'Không thể bắt đầu phiên tập trung.'), 'error'),
  })

  const pause = useMutation({
    mutationFn: (sessionId: string) => focusService.pause(sessionId),
    onSuccess: syncSession,
    onError: (error) => notify(getApiError(error, 'Không thể tạm dừng phiên.'), 'error'),
  })

  const resume = useMutation({
    mutationFn: (sessionId: string) => focusService.resume(sessionId),
    onSuccess: syncSession,
    onError: (error) => notify(getApiError(error, 'Không thể tiếp tục phiên.'), 'error'),
  })

  const complete = useMutation({
    mutationFn: (sessionId: string) => focusService.complete(sessionId),
    onSuccess: (completed) => {
      completeFocus(completed.id)
      queryClient.setQueryData(focusKeys.active, null)
      refreshAfterTerminalState()
      notify(`Đã ghi nhận ${completed.actualDurationMinutes ?? 0} phút tập trung.`, 'success')
    },
    onError: (error) => notify(getApiError(error, 'Không thể hoàn thành phiên.'), 'error'),
  })

  const cancel = useMutation({
    mutationFn: (sessionId: string) => focusService.cancel(sessionId),
    onSuccess: () => {
      syncSession(null)
      setCancelOpen(false)
      refreshAfterTerminalState()
      notify('Phiên tập trung đã được hủy.', 'success')
    },
    onError: (error) => notify(getApiError(error, 'Không thể hủy phiên.'), 'error'),
  })

  const addInterruption = useMutation({
    mutationFn: ({ sessionId, kind, note }: { sessionId: string; kind: InterruptionKind; note: string }) =>
      focusService.addInterruption(sessionId, { kind, note }),
    onSuccess: (interruption) => {
      const current = useTimerStore.getState().session
      if (current) syncSession({ ...current, interruptions: [...current.interruptions, interruption] })
      setInterruptionNote('')
      notify('Đã ghi lại gián đoạn.', 'success')
    },
    onError: (error) => notify(getApiError(error, 'Không thể ghi lại gián đoạn.'), 'error'),
  })

  const submitStart = (event: FormEvent) => {
    event.preventDefault()
    if (!Number.isInteger(duration) || duration < 1 || duration > 240) {
      setDurationError('Chọn thời lượng từ 1 đến 240 phút.')
      return
    }
    setDurationError('')
    start.mutate({
      plannedDurationMinutes: duration,
      projectId: projectId || null,
      taskId: taskId || null,
      habitId: habitId || null,
    })
  }

  const transitionPending = pause.isPending || resume.isPending || complete.isPending || cancel.isPending
  const bootstrapPending = !hydrated || (activeQuery.isPending && !session)

  return (
    <div>
      <PageHeader
        eyebrow="Nhịp làm việc"
        title="Một khoảng tập trung"
        description="Chọn việc cần tiến triển, để timestamp giữ nhịp chính xác và chỉ quan tâm đến khoảng thời gian trước mắt."
      />

      {bootstrapPending ? (
        <LoadingBlock rows={5} label="Đang khôi phục phiên tập trung" />
      ) : (
        <>
          {session ? (
            <ActiveFocus
              session={session}
              remainingSeconds={remainingSeconds}
              pending={transitionPending}
              interruptionPending={addInterruption.isPending}
              interruptionKind={interruptionKind}
              interruptionNote={interruptionNote}
              onInterruptionKind={setInterruptionKind}
              onInterruptionNote={setInterruptionNote}
              onAddInterruption={() => addInterruption.mutate({
                sessionId: session.id,
                kind: interruptionKind,
                note: interruptionNote,
              })}
              onPause={() => pause.mutate(session.id)}
              onResume={() => resume.mutate(session.id)}
              onComplete={() => complete.mutate(session.id)}
              onCancel={() => setCancelOpen(true)}
            />
          ) : phase === 'SHORT_BREAK' || phase === 'LONG_BREAK' ? (
            <BreakView
              phase={phase}
              remainingSeconds={remainingSeconds}
              completedFocusCount={completedFocusCount}
              onSkip={finishBreak}
            />
          ) : (
            <ReadyView
              duration={duration}
              durationError={durationError}
              habitId={habitId}
              projectId={projectId}
              taskId={taskId}
              projects={activeProjects}
              tasks={openTasks}
              projectsLoading={projectsQuery.isPending}
              tasksLoading={tasksQuery.isPending}
              durationHabits={durationHabits}
              habitsLoading={habitsQuery.isPending}
              pending={start.isPending}
              onDuration={(value) => {
                setDuration(value)
                setDurationError('')
              }}
              onHabit={setHabitId}
              onProject={(value) => {
                setProjectId(value)
                setTaskId('')
              }}
              onTask={setTaskId}
              onSubmit={submitStart}
            />
          )}

          <SessionHistory
            sessions={recentQuery.data ?? []}
            loading={recentQuery.isPending}
            error={recentQuery.isError ? getApiError(recentQuery.error, 'Không thể tải lịch sử tập trung.') : ''}
            onRetry={() => void recentQuery.refetch()}
          />
        </>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={() => session && cancel.mutate(session.id)}
        title="Hủy phiên đang chạy?"
        description="Khoảng thời gian này sẽ không được cộng vào thói quen hay tổng phút tập trung."
        confirmLabel="Hủy phiên"
        loading={cancel.isPending}
      />
    </div>
  )
}

function ReadyView({
  duration,
  durationError,
  habitId,
  projectId,
  taskId,
  durationHabits,
  projects,
  tasks,
  habitsLoading,
  projectsLoading,
  tasksLoading,
  pending,
  onDuration,
  onHabit,
  onProject,
  onTask,
  onSubmit,
}: {
  duration: number
  durationError: string
  habitId: string
  projectId: string
  taskId: string
  durationHabits: Array<{ id: string; name: string; todayProgress: number; todayTarget: number }>
  projects: Project[]
  tasks: Task[]
  habitsLoading: boolean
  projectsLoading: boolean
  tasksLoading: boolean
  pending: boolean
  onDuration: (value: number) => void
  onHabit: (value: string) => void
  onProject: (value: string) => void
  onTask: (value: string) => void
  onSubmit: (event: FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
      <section className="surface px-5 py-6 sm:px-8 sm:py-8" aria-labelledby="focus-setup-title">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-moss-wash text-moss-dark">
            <TimerReset className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="section-kicker">Phiên mới</p>
            <h2 id="focus-setup-title" className="mt-1 text-xl font-semibold">Bạn muốn dành bao lâu?</h2>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2" aria-label="Thời lượng gợi ý">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={`${preset} phút`}
              aria-pressed={duration === preset}
              onClick={() => onDuration(preset)}
              className={`min-h-14 rounded-control border px-3 font-mono text-lg font-semibold transition-colors ${
                duration === preset
                  ? 'border-moss bg-moss-wash text-moss-dark'
                  : 'border-line-strong bg-paper-raised text-ink hover:border-moss'
              }`}
            >
              {preset}<span className="ml-1 font-sans text-xs font-medium">phút</span>
            </button>
          ))}
        </div>

        <Input
          className="mt-5 max-w-xs"
          id="focus-duration"
          label="Thời lượng tùy chỉnh"
          type="number"
          min={1}
          max={240}
          value={duration}
          onChange={(event) => onDuration(Number(event.target.value))}
          error={durationError}
          hint="Từ 1 đến 240 phút."
        />
      </section>

      <aside className="border-y border-line py-6 lg:border-y-0 lg:border-l lg:py-2 lg:pl-8" aria-labelledby="focus-link-title">
        <p className="section-kicker">Tự động ghi nhận</p>
        <h2 id="focus-link-title" className="mt-2 text-xl font-semibold">Gắn với thói quen</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Khi hoàn thành, số phút thực tế được cộng thẳng vào thói quen thời lượng đã chọn.
        </p>
        <Select
          className="mt-6"
          id="focus-project"
          label="Dự án (không bắt buộc)"
          value={projectId}
          onChange={(event) => onProject(event.target.value)}
          disabled={projectsLoading}
        >
          <option value="">Không liên kết dự án</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </Select>
        {projectId && (
          <Select
            className="mt-4"
            id="focus-task"
            label="Việc đang mở (không bắt buộc)"
            value={taskId}
            onChange={(event) => onTask(event.target.value)}
            disabled={tasksLoading}
          >
            <option value="">Không liên kết việc</option>
            {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
          </Select>
        )}
        <Select
          className="mt-4"
          id="focus-habit"
          label="Thói quen hôm nay"
          value={habitId}
          onChange={(event) => onHabit(event.target.value)}
          disabled={habitsLoading}
        >
          <option value="">Không liên kết</option>
          {durationHabits.map((habit) => (
            <option key={habit.id} value={habit.id}>
              {habit.name} · {habit.todayProgress}/{habit.todayTarget} phút
            </option>
          ))}
        </Select>
        {!habitsLoading && durationHabits.length === 0 && (
          <p className="mt-2 text-sm text-ink-soft">Chưa có thói quen thời lượng nào được lên lịch hôm nay.</p>
        )}
        <Button className="mt-8 w-full" type="submit" loading={pending}>
          <Play className="h-4 w-4" aria-hidden="true" />
          Bắt đầu tập trung
        </Button>
      </aside>
    </form>
  )
}

function ActiveFocus({
  session,
  remainingSeconds,
  pending,
  interruptionPending,
  interruptionKind,
  interruptionNote,
  onInterruptionKind,
  onInterruptionNote,
  onAddInterruption,
  onPause,
  onResume,
  onComplete,
  onCancel,
}: {
  session: FocusSession
  remainingSeconds: number
  pending: boolean
  interruptionPending: boolean
  interruptionKind: InterruptionKind
  interruptionNote: string
  onInterruptionKind: (kind: InterruptionKind) => void
  onInterruptionNote: (note: string) => void
  onAddInterruption: () => void
  onPause: () => void
  onResume: () => void
  onComplete: () => void
  onCancel: () => void
}) {
  const totalSeconds = session.plannedDurationMinutes * 60
  const elapsedSeconds = Math.max(0, totalSeconds - remainingSeconds)
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(290px,0.65fr)]">
      <section className="surface overflow-hidden" aria-labelledby="active-focus-title">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 sm:px-8">
          <div>
            <p className="section-kicker">{statusLabels[session.status]}</p>
            <h2 id="active-focus-title" className="mt-1 font-semibold">
              {session.habitName || session.taskTitle || session.projectName || 'Khoảng tập trung độc lập'}
            </h2>
          </div>
          <span className={`h-2.5 w-2.5 rounded-full ${session.status === 'RUNNING' ? 'bg-moss' : 'bg-amber'}`} aria-hidden="true" />
        </div>

        <div className="px-5 py-10 text-center sm:px-10 sm:py-14">
          <p
            className="font-mono text-[clamp(4rem,14vw,8.5rem)] font-semibold leading-none tracking-[-0.08em] tabular-nums text-ink"
            role="timer"
            aria-label={timerAria(remainingSeconds)}
          >
            {formatTimer(remainingSeconds)}
          </p>
          <p className="mt-4 text-sm text-ink-soft">
            {session.status === 'PAUSED'
              ? 'Timer đang đứng yên. Thời gian nghỉ không bị tính vào phiên.'
              : 'Timestamp trên máy chủ là nguồn sự thật; bạn có thể đổi tab hoặc khóa máy.'}
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <ProgressBar value={elapsedSeconds} max={totalSeconds} label="Tiến độ phiên tập trung" />
          </div>

          <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
            {session.status === 'RUNNING' ? (
              <Button type="button" variant="secondary" onClick={onPause} disabled={pending || remainingSeconds === 0}>
                <Pause className="h-4 w-4" aria-hidden="true" />
                Tạm dừng
              </Button>
            ) : (
              <Button type="button" onClick={onResume} disabled={pending}>
                <Play className="h-4 w-4" aria-hidden="true" />
                Tiếp tục
              </Button>
            )}
            <Button type="button" onClick={onComplete} loading={pending}>
              <Check className="h-4 w-4" aria-hidden="true" />
              Kết thúc & ghi nhận
            </Button>
            <Button type="button" variant="quiet" onClick={onCancel} disabled={pending}>
              <Ban className="h-4 w-4" aria-hidden="true" />
              Hủy phiên
            </Button>
          </div>
        </div>

        {(session.habitName || session.taskTitle || session.projectName) && (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line px-5 py-4 text-sm text-ink-soft sm:px-8">
            <Link2 className="h-4 w-4 text-moss" aria-hidden="true" />
            {session.projectName && <span>Dự án: <strong className="text-ink">{session.projectName}</strong></span>}
            {session.taskTitle && <span>Việc: <strong className="text-ink">{session.taskTitle}</strong></span>}
            {session.habitName && <span>Thói quen: <strong className="text-ink">{session.habitName}</strong></span>}
          </div>
        )}
      </section>

      <aside className="border-y border-line py-6 lg:border-y-0 lg:border-l lg:py-2 lg:pl-8" aria-labelledby="interruptions-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker">Nhận diện nhiễu</p>
            <h2 id="interruptions-title" className="mt-1 text-xl font-semibold">Gián đoạn</h2>
          </div>
          <span className="font-mono text-2xl font-semibold">{session.interruptions.length}</span>
        </div>
        <p className="mt-2 text-sm text-ink-soft">Ghi nhanh, rồi quay lại việc đang làm. Dữ liệu này giúp nhận ra mẫu gây mất tập trung.</p>

        <div className="mt-6 space-y-3">
          <Select
            id="interruption-kind"
            label="Loại gián đoạn"
            value={interruptionKind}
            onChange={(event) => onInterruptionKind(event.target.value as InterruptionKind)}
          >
            {(Object.keys(interruptionLabels) as InterruptionKind[]).map((kind) => (
              <option key={kind} value={kind}>{interruptionLabels[kind]}</option>
            ))}
          </Select>
          <Input
            id="interruption-note"
            label="Ghi chú (không bắt buộc)"
            maxLength={500}
            value={interruptionNote}
            onChange={(event) => onInterruptionNote(event.target.value)}
            placeholder="Ví dụ: cuộc gọi từ nhóm"
          />
          <Button className="w-full" type="button" variant="secondary" onClick={onAddInterruption} loading={interruptionPending}>
            <MessageCircleWarning className="h-4 w-4" aria-hidden="true" />
            Ghi lại gián đoạn
          </Button>
        </div>

        {session.interruptions.length > 0 && (
          <ol className="mt-6 divide-y divide-line border-y border-line">
            {session.interruptions.map((interruption) => (
              <li key={interruption.id} className="py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <strong>{interruptionLabels[interruption.kind]}</strong>
                  <time className="font-mono text-xs text-ink-soft" dateTime={interruption.occurredAt}>
                    {new Date(interruption.occurredAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </time>
                </div>
                {interruption.note && <p className="mt-1 text-ink-soft">{interruption.note}</p>}
              </li>
            ))}
          </ol>
        )}
      </aside>
    </div>
  )
}

function BreakView({
  phase,
  remainingSeconds,
  completedFocusCount,
  onSkip,
}: {
  phase: 'SHORT_BREAK' | 'LONG_BREAK'
  remainingSeconds: number
  completedFocusCount: number
  onSkip: () => void
}) {
  const longBreak = phase === 'LONG_BREAK'
  return (
    <section className="surface mx-auto max-w-3xl overflow-hidden text-center" aria-labelledby="break-title">
      <div className="border-b border-line px-5 py-4">
        <p className="section-kicker">Hồi phục có chủ đích</p>
        <h2 id="break-title" className="mt-1 text-xl font-semibold">{longBreak ? 'Nghỉ dài' : 'Nghỉ ngắn'}</h2>
      </div>
      <div className="px-5 py-12 sm:py-16">
        <p className="font-mono text-[clamp(4rem,14vw,8rem)] font-semibold leading-none tracking-[-0.08em] tabular-nums" role="timer" aria-label={timerAria(remainingSeconds)}>
          {formatTimer(remainingSeconds)}
        </p>
        <p className="mx-auto mt-5 max-w-md text-ink-soft">
          {longBreak ? 'Đứng dậy, uống nước và rời khỏi màn hình một lúc.' : 'Thả lỏng mắt và vai. Đừng mở thêm một luồng thông tin mới.'}
        </p>
        <p className="mt-3 text-sm font-medium text-moss-dark">Đã hoàn thành {completedFocusCount} phiên trong chu kỳ này.</p>
        <Button className="mt-8" type="button" variant="secondary" onClick={onSkip}>
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Bỏ qua nghỉ
        </Button>
      </div>
    </section>
  )
}

function SessionHistory({
  sessions,
  loading,
  error,
  onRetry,
}: {
  sessions: FocusSession[]
  loading: boolean
  error: string
  onRetry: () => void
}) {
  return (
    <section className="mt-12 border-t border-line pt-7" aria-labelledby="focus-history-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="section-kicker">Dấu vết gần đây</p>
          <h2 id="focus-history-title" className="mt-1 text-xl font-semibold">Lịch sử tập trung</h2>
        </div>
        <span className="text-sm text-ink-soft">Tối đa 10 phiên gần nhất</span>
      </div>

      {loading ? (
        <LoadingBlock rows={3} label="Đang tải lịch sử tập trung" />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : sessions.length === 0 ? (
        <EmptyState title="Chưa có phiên nào" description="Phiên đầu tiên bạn hoàn thành hoặc hủy sẽ xuất hiện tại đây." />
      ) : (
        <ol className="divide-y divide-line border-y border-line">
          {sessions.map((item) => (
            <li key={item.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    item.status === 'COMPLETED' ? 'bg-moss-wash text-moss-dark' : item.status === 'CANCELLED' ? 'bg-clay-wash text-clay' : 'bg-amber-wash text-amber'
                  }`}>
                    {statusLabels[item.status]}
                  </span>
                  <strong className="truncate">{item.habitName || item.taskTitle || item.projectName || 'Phiên độc lập'}</strong>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {item.interruptions.length} gián đoạn
                  {item.habitName ? ` · Đã nối với ${item.habitName}` : ''}
                </p>
              </div>
              <div className="flex items-center justify-between gap-5 sm:text-right">
                <time className="text-sm text-ink-soft" dateTime={item.startedAt}>{dateTime.format(new Date(item.startedAt))}</time>
                <span className="min-w-20 font-mono text-lg font-semibold">
                  {item.actualDurationMinutes ?? 0}<span className="ml-1 font-sans text-xs font-medium text-ink-soft">/{item.plannedDurationMinutes}p</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
