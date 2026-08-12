import Ionicons from '@expo/vector-icons/Ionicons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { HabitHeatmap } from '@/components/HabitHeatmap'
import { HabitItem } from '@/components/HabitItem'
import { RouteHeader } from '@/components/RouteHeader'
import { Button, EmptyState, InlineError, SectionHeader, Surface } from '@/components/ui'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'
import { useHabitProgress } from '@/hooks/useHabitProgress'
import { useTodayKey } from '@/hooks/useTodayKey'
import { Screen } from '@/layouts/Screen'
import { getApiError } from '@/services/apiClient'
import { habitKeys, habitService } from '@/services/habitService'
import { useAuthStore } from '@/store/authStore'
import type { HabitEntry } from '@/types'
import { dateRangeInTimeZone, formatShortDate } from '@/utils/date'

function scheduleLabel(scheduleType: string, weekdays?: number[] | null, timesPerWeek?: number | null, intervalDays?: number | null) {
  if (scheduleType === 'DAILY') return 'Mỗi ngày'
  if (scheduleType === 'WEEKDAYS') return `Các ngày ${weekdays?.map((day) => ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'][day - 1]).join(', ')}`
  if (scheduleType === 'TIMES_PER_WEEK') return `${timesPerWeek} lần mỗi tuần`
  return `Lặp lại mỗi ${intervalDays} ngày`
}

function fillHeatmap(entries: HabitEntry[], from: string, to: string) {
  const byDate = new Map(entries.map((entry) => [entry.date, entry]))
  const start = new Date(`${from}T12:00:00Z`)
  const end = new Date(`${to}T12:00:00Z`)
  const result: HabitEntry[] = []
  for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const date = cursor.toISOString().slice(0, 10)
    result.push(byDate.get(date) ?? { date, value: 0, completed: false })
  }
  return result
}

export function HabitDetailScreen({ id }: { id: string }) {
  const today = useTodayKey()
  const timezone = useAuthStore((state) => state.user?.timezone ?? 'UTC')
  const range = dateRangeInTimeZone(84, timezone)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: habitKeys.detail(id, range.from, range.to), queryFn: () => habitService.get(id, range.from, range.to), enabled: Boolean(id) })
  const progress = useHabitProgress(today)
  const archive = useMutation({
    mutationFn: () => habitService.archive(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: habitKeys.all })
      router.replace('/(tabs)/habits')
    },
  })
  const remove = useMutation({
    mutationFn: () => habitService.remove(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: habitKeys.all })
      router.replace('/(tabs)/habits')
    },
  })

  if (query.error) {
    return <Screen><RouteHeader title="Chi tiết thói quen" /><InlineError message={getApiError(query.error)} onRetry={() => void query.refetch()} /></Screen>
  }
  if (!query.data) return <Screen><RouteHeader title="Chi tiết thói quen" /><Text style={styles.loading}>Đang tải thói quen…</Text></Screen>
  const habit = query.data
  const heatmap = fillHeatmap(habit.entries, range.from, range.to)

  const confirmArchive = () => Alert.alert('Lưu trữ thói quen?', 'Thói quen sẽ không còn xuất hiện trong danh sách hằng ngày.', [
    { text: 'Giữ lại', style: 'cancel' },
    { text: 'Lưu trữ', onPress: () => archive.mutate() },
  ])
  const confirmDelete = () => Alert.alert('Xóa vĩnh viễn?', 'Toàn bộ lịch sử của thói quen này sẽ bị xóa. Thao tác không thể hoàn tác.', [
    { text: 'Hủy', style: 'cancel' },
    { text: 'Xóa', style: 'destructive', onPress: () => remove.mutate() },
  ])

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.moss} />}>
      <RouteHeader
        title={habit.name}
        action={
          <Pressable accessibilityRole="button" accessibilityLabel="Chỉnh sửa thói quen" onPress={() => router.push({ pathname: '/habits/[id]/edit', params: { id } })} style={styles.iconButton}>
            <Ionicons name="create-outline" size={iconSizes.control} color={colors.ink} />
          </Pressable>
        }
      />
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>{habit.type === 'BOOLEAN' ? 'Hoàn thành' : habit.type === 'COUNT' ? 'Số lượng' : 'Thời lượng'}</Text>
        <Text style={styles.title}>{habit.name}</Text>
        {habit.description ? <Text style={styles.description}>{habit.description}</Text> : null}
      </View>

      <HabitItem
        habit={habit}
        pending={progress.isPending}
        onSetValue={(value) => progress.mutate({ habitId: id, value })}
        onUndo={() => progress.mutate({ habitId: id, value: 0 })}
        onStartFocus={() => router.push({ pathname: '/(tabs)/focus', params: { habitId: id } })}
      />
      {progress.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(progress.error)}</Text> : null}

      <View style={styles.section}>
        <SectionHeader eyebrow="Chuỗi" title="Độ bền" />
        <Surface style={styles.streaks}>
          <View style={styles.streakItem}><Text style={styles.data}>{habit.currentStreak}</Text><Text style={styles.meta}>hiện tại</Text></View>
          <View style={styles.verticalRule} />
          <View style={styles.streakItem}><Text style={styles.data}>{habit.longestStreak}</Text><Text style={styles.meta}>dài nhất</Text></View>
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="12 tuần" title="Nhịp thực hiện" />
        <Surface>
          <HabitHeatmap entries={heatmap} target={Number(habit.targetValue)} />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Lịch" title="Khi nào xuất hiện" />
        <Surface style={styles.infoList}>
          <InfoRow icon="calendar-outline" label="Tần suất" value={scheduleLabel(habit.scheduleType, habit.weekdays, habit.timesPerWeek, habit.intervalDays)} />
          <InfoRow icon="alarm-outline" label="Giờ nhắc" value={habit.reminderTime ? habit.reminderTime.slice(0, 5) : 'Chưa đặt'} />
          <InfoRow icon="flag-outline" label="Mục tiêu" value={`${habit.targetValue} ${habit.unit || (habit.type === 'DURATION' ? 'phút' : 'lần')}`} />
        </Surface>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="Gần đây" title="Lịch sử" />
        {habit.entries.filter((entry) => entry.value > 0).length ? (
          <Surface style={styles.history}>
            {habit.entries.filter((entry) => entry.value > 0).slice(-10).reverse().map((entry, index) => (
              <View key={entry.date} style={[styles.historyRow, index > 0 ? styles.rowRule : null]}>
                <Text style={styles.historyDate}>{formatShortDate(entry.date)}</Text>
                <Text style={styles.historyValue}>{entry.value} {habit.unit || ''}</Text>
                <Ionicons name={entry.completed ? 'checkmark-circle' : 'ellipse-outline'} size={iconSizes.control} color={entry.completed ? colors.moss : colors.inkSoft} />
              </View>
            ))}
          </Surface>
        ) : <EmptyState title="Chưa có lịch sử" description="Tiến độ đầu tiên sẽ xuất hiện tại đây." />}
      </View>

      <View style={styles.dangerZone}>
        <Button label="Lưu trữ" variant="secondary" loading={archive.isPending} onPress={confirmArchive} />
        <Button label="Xóa thói quen" variant="quiet" loading={remove.isPending} onPress={confirmDelete} />
      </View>
      {archive.error || remove.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(archive.error || remove.error)}</Text> : null}
    </Screen>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={iconSizes.control} color={colors.mossDark} />
      <View style={styles.infoCopy}><Text style={styles.meta}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { ...typography.body, color: colors.inkSoft },
  iconButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperRaised },
  intro: { gap: spacing.x2 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  description: { ...typography.body, color: colors.inkSoft },
  error: { ...typography.small, color: colors.danger },
  section: { gap: spacing.x4 },
  streaks: { flexDirection: 'row', alignItems: 'center' },
  streakItem: { flex: 1, alignItems: 'center', gap: spacing.x1 },
  verticalRule: { width: 1, height: 48, backgroundColor: colors.line },
  data: { ...typography.data, fontSize: 26, lineHeight: 32, color: colors.ink },
  meta: { ...typography.small, color: colors.inkSoft },
  infoList: { gap: spacing.x4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  infoCopy: { flex: 1 },
  infoValue: { ...typography.bodyStrong, color: colors.ink },
  history: { paddingVertical: 0 },
  historyRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  rowRule: { borderTopWidth: 1, borderTopColor: colors.line },
  historyDate: { ...typography.body, color: colors.ink, flex: 1 },
  historyValue: { ...typography.data, color: colors.inkSoft },
  dangerZone: { gap: spacing.x3, paddingTop: spacing.x4, borderTopWidth: 1, borderTopColor: colors.line },
})
