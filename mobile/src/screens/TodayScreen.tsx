import Ionicons from '@expo/vector-icons/Ionicons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/AppHeader'
import { HabitItem } from '@/components/HabitItem'
import { Button, EmptyState, InlineError, LoadingBlock, SectionHeader, Surface } from '@/components/ui'
import { colors, iconSizes, spacing, typography } from '@/constants/theme'
import { useHabitProgress } from '@/hooks/useHabitProgress'
import { useTodayKey } from '@/hooks/useTodayKey'
import { Screen } from '@/layouts/Screen'
import { analyticsKeys, analyticsService } from '@/services/analyticsService'
import { getApiError } from '@/services/apiClient'
import { habitKeys, habitService } from '@/services/habitService'
import { projectKeys, projectService } from '@/services/projectService'
import { useAuthStore } from '@/store/authStore'

function longDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day))
}

export function TodayScreen() {
  const today = useTodayKey()
  const user = useAuthStore((state) => state.user)
  const queryClient = useQueryClient()
  const dashboard = useQuery({ queryKey: analyticsKeys.dashboard(today), queryFn: () => analyticsService.dashboard(today) })
  const habits = useQuery({ queryKey: habitKeys.list(false), queryFn: () => habitService.list(false) })
  const tasks = useQuery({ queryKey: projectKeys.tasks(), queryFn: () => projectService.tasks() })
  const progress = useHabitProgress(today)
  const completeTask = useMutation({
    mutationFn: projectService.completeTask,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: projectKeys.tasks() }),
        queryClient.invalidateQueries({ queryKey: analyticsKeys.dashboard(today) }),
      ])
    },
  })

  const scheduledHabits = (habits.data ?? []).filter((habit) => habit.scheduledToday)
  const pendingTasks = (tasks.data ?? [])
    .filter((task) => !task.completed && (!task.dueDate || task.dueDate <= today))
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
    .slice(0, 4)
  const refreshing = dashboard.isRefetching || habits.isRefetching || tasks.isRefetching
  const refresh = () => void Promise.all([dashboard.refetch(), habits.refetch(), tasks.refetch()])

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.moss} />}>
      <AppHeader />
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>{longDate(today)}</Text>
        <Text style={styles.title}>Hôm nay{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</Text>
        <Text style={styles.subtitle}>Chọn một việc rõ ràng, rồi dành cho nó một khoảng tập trung.</Text>
      </View>

      {dashboard.isPending ? <LoadingBlock label="Đang tải tổng quan hôm nay" rows={2} /> : dashboard.error ? <InlineError message={getApiError(dashboard.error)} onRetry={() => void dashboard.refetch()} /> : (
        <Surface style={styles.focusTray}>
          <View style={styles.focusCopy}>
            <Text style={styles.trayEyebrow}>{dashboard.data?.activeSession ? 'Phiên đang chạy' : 'Bắt đầu nhanh'}</Text>
            <Text style={styles.trayTitle}>{dashboard.data?.activeSession ? dashboard.data.activeSession.taskTitle || dashboard.data.activeSession.habitName || 'Phiên tập trung' : 'Sẵn sàng tập trung?'}</Text>
            <Text style={styles.trayBody}>{dashboard.data?.activeSession ? `${dashboard.data.activeSession.plannedDurationMinutes} phút · mở để tiếp tục` : 'Chọn thời lượng và liên kết công việc ngay trên màn hình timer.'}</Text>
          </View>
          <Button
            label={dashboard.data?.activeSession ? 'Mở timer' : 'Bắt đầu'}
            onPress={() => router.push('/(tabs)/focus')}
          />
        </Surface>
      )}

      <View style={styles.section}>
        <SectionHeader eyebrow="Ưu tiên" title="Thói quen hôm nay" action={<Text style={styles.sectionCount}>{scheduledHabits.filter((habit) => habit.completedToday).length}/{scheduledHabits.length}</Text>} />
        {habits.isPending ? <LoadingBlock label="Đang tải thói quen hôm nay" rows={3} /> : habits.error ? <InlineError message={getApiError(habits.error)} onRetry={() => void habits.refetch()} /> : scheduledHabits.length ? (
          <View style={styles.list}>
            {scheduledHabits.map((habit) => (
              <HabitItem
                key={habit.id}
                habit={habit}
                pending={progress.isPending && progress.variables?.habitId === habit.id}
                onOpen={() => router.push({ pathname: '/habits/[id]', params: { id: habit.id } })}
                onSetValue={(value) => progress.mutate({ habitId: habit.id, value })}
                onUndo={() => progress.mutate({ habitId: habit.id, value: 0 })}
                onStartFocus={() => router.push({ pathname: '/(tabs)/focus', params: { habitId: habit.id } })}
              />
            ))}
          </View>
        ) : (
          <EmptyState title="Chưa có thói quen hôm nay" action={<Button label="Tạo thói quen" variant="secondary" onPress={() => router.push('/habits/new')} />} />
        )}
        {progress.error ? <Text accessibilityRole="alert" style={styles.errorText}>{getApiError(progress.error, 'Không thể cập nhật tiến độ.')}</Text> : null}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Tiếp theo" title="Công việc cần làm" />
        {tasks.isPending ? <LoadingBlock label="Đang tải công việc" rows={3} /> : tasks.error ? <InlineError message={getApiError(tasks.error)} onRetry={() => void tasks.refetch()} /> : pendingTasks.length ? (
          <Surface style={styles.taskList}>
            {pendingTasks.map((task, index) => (
              <View key={task.id} style={[styles.taskRow, index > 0 ? styles.rowRule : null]}>
                <View style={styles.taskCopy}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskMeta}>{task.projectName || 'Dự án'}{task.dueDate ? ` · ${task.dueDate === today ? 'Hôm nay' : task.dueDate}` : ''}</Text>
                </View>
                <Button label="Xong" variant="quiet" loading={completeTask.isPending && completeTask.variables === task.id} onPress={() => completeTask.mutate(task.id)} />
              </View>
            ))}
          </Surface>
        ) : <EmptyState title="Không có công việc đến hạn" description="Khoảng trống này là chủ ý—hãy tập trung vào việc quan trọng nhất." />}
      </View>

      {dashboard.data ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Tiến độ" title="Nhịp hôm nay" />
          <Surface style={styles.metrics}>
            <Metric icon="timer-outline" value={`${dashboard.data.focusMinutes}`} label="phút tập trung" />
            <Metric icon="checkmark-done-outline" value={`${dashboard.data.habits.completed}/${dashboard.data.habits.total}`} label="thói quen" />
            <Metric icon="flame-outline" value={`${dashboard.data.currentStreak}`} label="ngày streak" />
          </Surface>
        </View>
      ) : null}

      {dashboard.data?.recentActivity.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Gần đây" title="Hoạt động" />
          <Surface style={styles.activityList}>
            {dashboard.data.recentActivity.slice(0, 5).map((activity, index) => (
              <View key={activity.id ?? `${activity.type}-${index}`} style={[styles.activityRow, index > 0 ? styles.rowRule : null]}>
                <View style={styles.activityMark} />
                <View style={styles.activityCopy}>
                  <Text style={styles.taskTitle}>{activity.title || 'Hoạt động'}</Text>
                  {activity.description ? <Text style={styles.taskMeta}>{activity.description}</Text> : null}
                </View>
              </View>
            ))}
          </Surface>
        </View>
      ) : null}
    </Screen>
  )
}

function Metric({ icon, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; label: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={iconSizes.control} color={colors.mossDark} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  intro: { gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.x1 },
  focusTray: { backgroundColor: colors.ink, borderColor: colors.ink, gap: spacing.x4 },
  focusCopy: { gap: spacing.x1 },
  trayEyebrow: { ...typography.eyebrow, color: '#a9c8b8' },
  trayTitle: { ...typography.heading, color: colors.white },
  trayBody: { ...typography.body, color: '#d8e0dc' },
  section: { gap: spacing.x4 },
  sectionCount: { ...typography.data, color: colors.inkSoft },
  list: { gap: spacing.x3 },
  errorText: { ...typography.small, color: colors.danger },
  taskList: { paddingVertical: 0 },
  taskRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.x3, paddingVertical: spacing.x2 },
  rowRule: { borderTopWidth: 1, borderTopColor: colors.line },
  taskCopy: { flex: 1 },
  taskTitle: { ...typography.bodyStrong, color: colors.ink },
  taskMeta: { ...typography.small, color: colors.inkSoft },
  metrics: { flexDirection: 'row', paddingHorizontal: spacing.x2 },
  metric: { flex: 1, alignItems: 'center', gap: spacing.x1, paddingVertical: spacing.x2 },
  metricValue: { ...typography.data, color: colors.ink, fontSize: 19 },
  metricLabel: { ...typography.small, color: colors.inkSoft, textAlign: 'center' },
  activityList: { paddingVertical: spacing.x2 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3, minHeight: 58 },
  activityMark: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.clay },
  activityCopy: { flex: 1 },
})
