import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { ProjectEditor } from '@/components/ProjectEditor'
import { RouteHeader } from '@/components/RouteHeader'
import { TaskEditor } from '@/components/TaskEditor'
import { Button, EmptyState, InlineError, SectionHeader, Surface } from '@/components/ui'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'
import { Screen } from '@/layouts/Screen'
import { getApiError } from '@/services/apiClient'
import { projectKeys, projectService } from '@/services/projectService'
import type { ProjectPayload, Task, TaskPayload } from '@/types'
import { formatShortDate } from '@/utils/date'

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}g ${rest}p` : `${hours} giờ`
}

export function ProjectDetailScreen({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const [editingProject, setEditingProject] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const query = useQuery({ queryKey: projectKeys.detail(id), queryFn: () => projectService.get(id), enabled: Boolean(id) })

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.all }),
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }),
      queryClient.invalidateQueries({ queryKey: projectKeys.tasks(id) }),
      queryClient.invalidateQueries({ queryKey: ['analytics'] }),
    ])
  }
  const updateProject = useMutation({ mutationFn: (payload: ProjectPayload) => projectService.update(id, payload), onSuccess: async () => { setEditingProject(false); await invalidate() } })
  const archive = useMutation({ mutationFn: () => projectService.archive(id), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: projectKeys.all }); router.replace('/(tabs)/projects') } })
  const createTask = useMutation({ mutationFn: (payload: TaskPayload) => projectService.createTask(payload), onSuccess: async () => { setAddingTask(false); await invalidate() } })
  const updateTask = useMutation({ mutationFn: ({ taskId, payload }: { taskId: string; payload: TaskPayload }) => projectService.updateTask(taskId, payload), onSuccess: async () => { setEditingTask(null); await invalidate() } })
  const completeTask = useMutation({ mutationFn: projectService.completeTask, onSuccess: invalidate })

  const project = query.data
  const maxWeek = useMemo(() => Math.max(1, ...(project?.weeklyActivity ?? []).map((point) => point.minutes)), [project?.weeklyActivity])
  if (query.error) return <Screen><RouteHeader title="Chi tiết dự án" /><InlineError message={getApiError(query.error)} onRetry={() => void query.refetch()} /></Screen>
  if (!project) return <Screen><RouteHeader title="Chi tiết dự án" /><Text style={styles.loading}>Đang tải dự án…</Text></Screen>

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.moss} />}>
      <RouteHeader title={project.name} action={<Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa dự án" onPress={() => setEditingProject(true)} style={styles.iconButton}><Ionicons name="create-outline" size={iconSizes.control} color={colors.ink} /></Pressable>} />
      <View style={styles.intro}><Text style={styles.eyebrow}>{project.archived ? 'Đã lưu trữ' : 'Dự án'}</Text><Text style={styles.title}>{project.name}</Text><Text style={styles.subtitle}>{project.description || 'Một vùng rõ ràng cho những việc cần tiến triển.'}</Text></View>

      {editingProject ? <Surface style={styles.formSurface}><SectionHeader eyebrow="Chỉnh sửa" title="Thông tin dự án" /><ProjectEditor initial={{ name: project.name, description: project.description ?? '', color: project.color ?? 'moss', icon: project.icon ?? 'folder' }} loading={updateProject.isPending} submitLabel="Lưu thay đổi" onCancel={() => setEditingProject(false)} onSubmit={(payload) => updateProject.mutate(payload)} /></Surface> : null}

      <Surface style={styles.metrics}>
        <Metric value={minutesLabel(project.totalFocusMinutes)} label="tập trung" />
        <View style={styles.verticalRule} />
        <Metric value={`${project.completedTasks}`} label="việc xong" />
        <View style={styles.verticalRule} />
        <Metric value={`${project.pendingTasks}`} label="đang mở" />
      </Surface>

      <View style={styles.section}>
        <SectionHeader eyebrow="Danh sách" title="Công việc" action={<Button label="Thêm" variant="quiet" onPress={() => { setEditingTask(null); setAddingTask(true) }} />} />
        {addingTask ? <Surface><TaskEditor projectId={id} loading={createTask.isPending} onCancel={() => setAddingTask(false)} onSubmit={(payload) => createTask.mutate(payload)} />{createTask.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(createTask.error)}</Text> : null}</Surface> : null}
        {editingTask ? <Surface><TaskEditor key={editingTask.id} projectId={id} initial={editingTask} loading={updateTask.isPending} onCancel={() => setEditingTask(null)} onSubmit={(payload) => updateTask.mutate({ taskId: editingTask.id, payload })} />{updateTask.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(updateTask.error)}</Text> : null}</Surface> : null}
        {project.tasks.length ? <Surface style={styles.taskList}>{project.tasks.map((task, index) => (
          <View key={task.id} style={[styles.taskRow, index > 0 ? styles.rule : null]}>
            <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: task.completed, disabled: task.completed || completeTask.isPending }} accessibilityLabel={task.completed ? `${task.title}, đã hoàn thành` : `Hoàn thành ${task.title}`} disabled={task.completed || completeTask.isPending} onPress={() => completeTask.mutate(task.id)} style={styles.check}><Ionicons name={task.completed ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={task.completed ? colors.moss : colors.inkSoft} /></Pressable>
            <View style={styles.taskCopy}><Text style={[styles.taskTitle, task.completed ? styles.taskDone : null]}>{task.title}</Text><Text style={styles.taskMeta}>{task.dueDate ? `Hạn ${formatShortDate(task.dueDate)}` : 'Chưa đặt hạn'} · {minutesLabel(task.focusMinutes)}</Text></View>
            {!task.completed ? <View style={styles.taskActions}><Pressable accessibilityRole="button" accessibilityLabel={`Sửa ${task.title}`} onPress={() => { setAddingTask(false); setEditingTask(task) }} style={styles.smallAction}><Ionicons name="create-outline" size={iconSizes.inline} color={colors.ink} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Tập trung vào ${task.title}`} onPress={() => router.push({ pathname: '/(tabs)/focus', params: { projectId: id, taskId: task.id } })} style={styles.smallAction}><Ionicons name="timer-outline" size={iconSizes.inline} color={colors.mossDark} /></Pressable></View> : null}
          </View>
        ))}</Surface> : <EmptyState title="Chưa có công việc" description="Thêm việc đầu tiên để một phiên tập trung có nơi cập nhật." action={<Button label="Thêm công việc" variant="secondary" onPress={() => setAddingTask(true)} />} />}
        {completeTask.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(completeTask.error)}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="7 ngày" title="Hoạt động tập trung" />
        <Surface style={styles.weekList}>{project.weeklyActivity.map((point) => <View key={point.date} style={styles.weekRow}><Text style={styles.weekLabel}>{formatShortDate(point.date)}</Text><View style={styles.bar}><View style={[styles.barFill, { width: `${(point.minutes / maxWeek) * 100}%` }]} /></View><Text style={styles.weekValue}>{point.minutes}p</Text></View>)}</Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Dấu vết" title="Phiên gần nhất" />
        {project.recentSessions.length ? <Surface style={styles.sessionList}>{project.recentSessions.slice(0, 5).map((session, index) => <View key={session.id} style={[styles.sessionRow, index > 0 ? styles.rule : null]}><Ionicons name="timer-outline" size={iconSizes.control} color={colors.mossDark} /><View style={styles.taskCopy}><Text style={styles.taskTitle}>{session.taskTitle || 'Phiên độc lập'}</Text><Text style={styles.taskMeta}>{session.actualDurationMinutes ?? session.plannedDurationMinutes} phút · {session.status === 'COMPLETED' ? 'Hoàn thành' : 'Đã hủy'}</Text></View></View>)}</Surface> : <EmptyState title="Chưa có phiên tập trung" />}
      </View>

      {!project.archived ? <Button label="Lưu trữ dự án" variant="secondary" loading={archive.isPending} onPress={() => Alert.alert('Lưu trữ dự án?', 'Dữ liệu và công việc vẫn được giữ, nhưng dự án không còn xuất hiện trong lựa chọn phiên mới.', [{ text: 'Hủy', style: 'cancel' }, { text: 'Lưu trữ', onPress: () => archive.mutate() }])} /> : null}
      {archive.error || updateProject.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(archive.error || updateProject.error)}</Text> : null}
    </Screen>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>
}

const styles = StyleSheet.create({
  loading: { ...typography.body, color: colors.inkSoft },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperRaised },
  intro: { gap: spacing.x2 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft },
  formSurface: { gap: spacing.x4 },
  metrics: { flexDirection: 'row', alignItems: 'center' },
  metric: { flex: 1, alignItems: 'center', gap: spacing.x1 },
  metricValue: { ...typography.data, color: colors.ink, textAlign: 'center' },
  metricLabel: { ...typography.small, color: colors.inkSoft },
  verticalRule: { width: 1, height: 42, backgroundColor: colors.line },
  section: { gap: spacing.x4 },
  taskList: { paddingVertical: 0 },
  taskRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: spacing.x2, paddingVertical: spacing.x2 },
  rule: { borderTopWidth: 1, borderTopColor: colors.line },
  check: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center' },
  taskCopy: { flex: 1 },
  taskTitle: { ...typography.bodyStrong, color: colors.ink },
  taskDone: { color: colors.inkSoft, textDecorationLine: 'line-through' },
  taskMeta: { ...typography.small, color: colors.inkSoft },
  taskActions: { flexDirection: 'row', gap: spacing.x1 },
  smallAction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control },
  error: { ...typography.small, color: colors.danger },
  weekList: { gap: spacing.x3 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  weekLabel: { ...typography.small, color: colors.inkSoft, width: 48 },
  bar: { flex: 1, height: 8, borderRadius: radii.round, backgroundColor: colors.line, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radii.round, backgroundColor: colors.moss },
  weekValue: { ...typography.data, fontSize: 12, color: colors.ink, width: 36, textAlign: 'right' },
  sessionList: { paddingVertical: 0 },
  sessionRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
})
