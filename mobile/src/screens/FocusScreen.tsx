import Ionicons from '@expo/vector-icons/Ionicons'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNetInfo } from '@react-native-community/netinfo'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/AppHeader'
import { ChoiceField, type ChoiceOption } from '@/components/ChoiceField'
import { FocusTimerControls } from '@/components/FocusTimerControls'
import { Button, InlineError, LoadingBlock, SectionHeader, Surface, TextField } from '@/components/ui'
import { colors, iconSizes, spacing, typography } from '@/constants/theme'
import { useTimerTicker } from '@/hooks/useTimerTicker'
import { Screen } from '@/layouts/Screen'
import { getApiError } from '@/services/apiClient'
import { focusKeys, focusService } from '@/services/focusService'
import { habitKeys, habitService } from '@/services/habitService'
import { projectKeys, projectService } from '@/services/projectService'
import { settingsKeys, settingsService } from '@/services/settingsService'
import { formatTimer, timerAccessibilityLabel, useTimerStore } from '@/store/timerStore'
import type { FocusSession, InterruptionKind } from '@/types'

const presets = [25, 50, 90]
const interruptionOptions: Array<{ value: InterruptionKind; label: string }> = [
  { value: 'PHONE', label: 'Điện thoại' }, { value: 'MESSAGE', label: 'Tin nhắn' },
  { value: 'NOISE', label: 'Tiếng ồn' }, { value: 'MEETING', label: 'Cuộc họp' }, { value: 'OTHER', label: 'Khác' },
]

export function FocusScreen() {
  const params = useLocalSearchParams<{ habitId?: string; projectId?: string; taskId?: string }>()
  const queryClient = useQueryClient()
  const network = useNetInfo()
  const { session, phase, remainingSeconds } = useTimerTicker()
  const setSession = useTimerStore((state) => state.setSession)
  const completeFocus = useTimerStore((state) => state.completeFocus)
  const finishBreak = useTimerStore((state) => state.finishBreak)
  const [duration, setDuration] = useState('25')
  const [habitId, setHabitId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [formError, setFormError] = useState('')
  const automaticCompletion = useRef<string | null>(null)

  const activeQuery = useQuery({ queryKey: focusKeys.active, queryFn: focusService.active })
  const settings = useQuery({ queryKey: settingsKeys.settings, queryFn: settingsService.get })
  const habits = useQuery({ queryKey: habitKeys.list(false), queryFn: () => habitService.list(false) })
  const projects = useQuery({ queryKey: projectKeys.list, queryFn: projectService.list })
  const tasks = useQuery({ queryKey: projectKeys.tasks(projectId || undefined), queryFn: () => projectService.tasks(projectId), enabled: Boolean(projectId) })
  const recent = useQuery({ queryKey: focusKeys.recent(10), queryFn: () => focusService.recent(10) })

  useEffect(() => { if (settings.data && !session) setDuration(String(settings.data.defaultFocusMinutes)) }, [session, settings.data])
  useEffect(() => { if (params.habitId) setHabitId(params.habitId) }, [params.habitId])
  useEffect(() => { if (params.projectId) setProjectId(params.projectId) }, [params.projectId])
  useEffect(() => { if (params.taskId) setTaskId(params.taskId) }, [params.taskId])

  const syncSession = async (next: FocusSession | null) => {
    queryClient.setQueryData(focusKeys.active, next)
    await setSession(next)
  }
  const invalidateAfterSession = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: focusKeys.all }),
      queryClient.invalidateQueries({ queryKey: habitKeys.all }),
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
    ])
  }

  const start = useMutation({
    mutationFn: async () => {
      const minutes = Number(duration)
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 240) throw new Error('DURATION_VALIDATION')
      const existing = await focusService.active()
      if (existing) return existing
      return focusService.start({ plannedDurationMinutes: minutes, projectId: projectId || null, taskId: taskId || null, habitId: habitId || null })
    },
    onSuccess: async (started) => { setFormError(''); await syncSession(started) },
    onError: (error) => setFormError(error instanceof Error && error.message === 'DURATION_VALIDATION' ? 'Thời lượng phải từ 1 đến 240 phút.' : getApiError(error, 'Không thể bắt đầu phiên.')),
  })
  const pause = useMutation({ mutationFn: (id: string) => focusService.pause(id), onSuccess: syncSession })
  const resume = useMutation({ mutationFn: (id: string) => focusService.resume(id), onSuccess: syncSession })
  const complete = useMutation({
    mutationFn: (id: string) => focusService.complete(id),
    onSuccess: async (completed) => {
      const config = settings.data ?? { defaultBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4 }
      queryClient.setQueryData(focusKeys.active, null)
      await completeFocus(completed.id, config.defaultBreakMinutes, config.longBreakMinutes, config.sessionsBeforeLongBreak)
      await invalidateAfterSession()
    },
    onError: (error) => {
      automaticCompletion.current = null
      setFormError(getApiError(error, 'Chưa thể xác nhận phiên đã hoàn thành. Timer vẫn được giữ lại.'))
    },
  })
  const cancel = useMutation({
    mutationFn: (id: string) => focusService.cancel(id),
    onSuccess: async () => { await syncSession(null); await invalidateAfterSession() },
    onError: (error) => setFormError(getApiError(error, 'Không thể hủy phiên.')),
  })
  const interruption = useMutation({
    mutationFn: ({ id, kind }: { id: string; kind: InterruptionKind }) => focusService.addInterruption(id, { kind, note: '' }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: focusKeys.active }) },
    onError: (error) => setFormError(getApiError(error, 'Không thể ghi nhận gián đoạn.')),
  })

  useEffect(() => {
    const online = Boolean(network.isConnected && network.isInternetReachable !== false)
    if (!online || phase !== 'FOCUS' || !session || session.status !== 'RUNNING' || remainingSeconds > 0 || complete.isPending) return
    if (automaticCompletion.current === session.id) return
    automaticCompletion.current = session.id
    complete.mutate(session.id)
  }, [complete, network.isConnected, network.isInternetReachable, phase, remainingSeconds, session])
  useEffect(() => {
    if ((phase === 'SHORT_BREAK' || phase === 'LONG_BREAK') && remainingSeconds === 0) void finishBreak()
  }, [finishBreak, phase, remainingSeconds])

  const durationHabits = useMemo(() => (habits.data ?? []).filter((habit) => habit.type === 'DURATION' && habit.scheduledToday && !habit.archivedAt), [habits.data])
  const activeProjects = useMemo(() => (projects.data ?? []).filter((project) => !project.archived), [projects.data])
  const openTasks = useMemo(() => (tasks.data ?? []).filter((task) => !task.completed), [tasks.data])
  const projectOptions: ChoiceOption[] = [{ value: '', label: 'Không gắn dự án' }, ...activeProjects.map((project) => ({ value: project.id, label: project.name }))]
  const taskOptions: ChoiceOption[] = [{ value: '', label: 'Không gắn công việc' }, ...openTasks.map((task) => ({ value: task.id, label: task.title, description: task.dueDate ? `Hạn ${task.dueDate}` : undefined }))]
  const habitOptions: ChoiceOption[] = [{ value: '', label: 'Không gắn thói quen' }, ...durationHabits.map((habit) => ({ value: habit.id, label: habit.name, description: `${habit.todayProgress}/${habit.todayTarget} ${habit.unit || 'phút'}` }))]
  const refreshing = activeQuery.isRefetching || habits.isRefetching || projects.isRefetching || recent.isRefetching

  if (phase === 'SHORT_BREAK' || phase === 'LONG_BREAK') {
    return (
      <Screen>
        <AppHeader />
        <View style={styles.timerIntro}><Text style={styles.eyebrow}>Phiên hoàn thành</Text><Text style={styles.title}>{phase === 'LONG_BREAK' ? 'Nghỉ dài' : 'Nghỉ ngắn'}</Text><Text style={styles.subtitle}>Đứng dậy, thả lỏng mắt và quay lại khi sẵn sàng.</Text></View>
        <Surface style={styles.timerTray}>
          <Text accessible accessibilityLabel={timerAccessibilityLabel(remainingSeconds)} style={styles.timer}>{formatTimer(remainingSeconds)}</Text>
          <Button label="Bỏ qua giờ nghỉ" variant="secondary" onPress={() => void finishBreak()} />
        </Surface>
      </Screen>
    )
  }

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void Promise.all([activeQuery.refetch(), habits.refetch(), projects.refetch(), recent.refetch()])} tintColor={colors.moss} />}>
      <AppHeader />
      <View style={styles.timerIntro}><Text style={styles.eyebrow}>{session ? 'Giữ nhịp' : 'Một việc một lúc'}</Text><Text style={styles.title}>Tập trung</Text><Text style={styles.subtitle}>{session ? 'Timer được dựng lại từ timestamp server, kể cả sau khi khóa màn hình.' : 'Chọn ngữ cảnh vừa đủ rồi bắt đầu.'}</Text></View>

      {!session && (settings.isPending || habits.isPending || projects.isPending) ? <LoadingBlock label="Đang chuẩn bị ngữ cảnh phiên" rows={2} /> : null}

      {session ? (
        <Surface style={styles.timerTray}>
          <FocusTimerControls
            session={session}
            remainingSeconds={remainingSeconds}
            pausePending={pause.isPending}
            resumePending={resume.isPending}
            completePending={complete.isPending}
            onPause={() => pause.mutate(session.id)}
            onResume={() => resume.mutate(session.id)}
            onComplete={() => complete.mutate(session.id)}
          />
          <View style={styles.interruptions}>
            <Text style={styles.fieldLabel}>Ghi gián đoạn</Text>
            <View style={styles.chips}>{interruptionOptions.map((option) => <Button key={option.value} label={option.label} variant="quiet" disabled={interruption.isPending} onPress={() => interruption.mutate({ id: session.id, kind: option.value })} />)}</View>
          </View>
          <Button label="Hủy phiên" variant="quiet" loading={cancel.isPending} onPress={() => Alert.alert('Hủy phiên tập trung?', 'Thời gian đã trôi qua sẽ không được tính là phiên hoàn thành.', [{ text: 'Tiếp tục tập trung', style: 'cancel' }, { text: 'Hủy phiên', style: 'destructive', onPress: () => cancel.mutate(session.id) }])} />
        </Surface>
      ) : (
        <View style={styles.form}>
          <View style={styles.section}>
            <SectionHeader eyebrow="Thời lượng" title="Bạn cần bao lâu?" />
            <View style={styles.presets}>{presets.map((minutes) => <Button key={minutes} label={`${minutes} phút`} variant={duration === String(minutes) ? 'primary' : 'secondary'} onPress={() => setDuration(String(minutes))} />)}</View>
            <TextField label="Hoặc nhập số phút" value={duration} onChangeText={setDuration} keyboardType="number-pad" error={formError.includes('Thời lượng') ? formError : undefined} />
          </View>
          <View style={styles.section}>
            <SectionHeader eyebrow="Ngữ cảnh" title="Phiên này dành cho gì?" />
            <ChoiceField label="Dự án" value={projectId} options={projectOptions} placeholder="Chọn dự án" onChange={(value) => { setProjectId(value); setTaskId('') }} />
            {projectId ? <ChoiceField label="Công việc" value={taskId} options={taskOptions} placeholder="Chọn công việc" onChange={setTaskId} /> : null}
            <ChoiceField label="Thói quen thời lượng" value={habitId} options={habitOptions} placeholder="Chọn thói quen" onChange={setHabitId} />
          </View>
          {formError && !formError.includes('Thời lượng') ? <Text accessibilityRole="alert" style={styles.error}>{formError}</Text> : null}
          <Button label="Bắt đầu phiên" loading={start.isPending} onPress={() => start.mutate()} />
        </View>
      )}

      {activeQuery.error ? <InlineError message={getApiError(activeQuery.error)} onRetry={() => void activeQuery.refetch()} /> : null}
      {recent.data?.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gần đây" title="Các phiên trước" />
          <Surface style={styles.recentList}>{recent.data.slice(0, 5).map((item, index) => (
            <View key={item.id} style={[styles.recentRow, index > 0 ? styles.rule : null]}><Ionicons name="timer-outline" size={iconSizes.control} color={colors.mossDark} /><View style={styles.recentCopy}><Text style={styles.recentTitle}>{item.taskTitle || item.habitName || item.projectName || 'Phiên độc lập'}</Text><Text style={styles.recentMeta}>{item.actualDurationMinutes ?? item.plannedDurationMinutes} phút · {item.status === 'COMPLETED' ? 'Hoàn thành' : item.status === 'CANCELLED' ? 'Đã hủy' : 'Đang hoạt động'}</Text></View></View>
          ))}</Surface>
        </View>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  timerIntro: { gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.x1 },
  timerTray: { gap: spacing.x6, paddingVertical: spacing.x6 },
  timer: { ...typography.timer, color: colors.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  interruptions: { gap: spacing.x2, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.x4 },
  fieldLabel: { ...typography.smallStrong, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.x1 },
  form: { gap: spacing.x6 },
  section: { gap: spacing.x4 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.x2 },
  error: { ...typography.small, color: colors.danger },
  recentList: { paddingVertical: 0 },
  recentRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  rule: { borderTopWidth: 1, borderTopColor: colors.line },
  recentCopy: { flex: 1 },
  recentTitle: { ...typography.bodyStrong, color: colors.ink },
  recentMeta: { ...typography.small, color: colors.inkSoft },
})
