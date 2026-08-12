import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshControl, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/AppHeader'
import { Button, EmptyState, InlineError, LoadingBlock, ProgressBar, SectionHeader, Surface } from '@/components/ui'
import { colors, spacing, typography } from '@/constants/theme'
import { useTodayKey } from '@/hooks/useTodayKey'
import { Screen } from '@/layouts/Screen'
import { analyticsKeys, analyticsService } from '@/services/analyticsService'
import { getApiError } from '@/services/apiClient'
import type { AnalyticsBreakdown } from '@/types'
import { dateRangeEndingOn, formatShortDate, previousDateRange, weekToDateRange } from '@/utils/date'

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}g ${remainder}p` : `${hours} giờ`
}

function Breakdown({ title, items }: { title: string; items: AnalyticsBreakdown[] }) {
  const shown = items.filter((item) => (item.minutes ?? 0) > 0).slice(0, 5)
  const max = Math.max(1, ...shown.map((item) => item.minutes ?? 0))
  return (
    <View style={styles.breakdown}>
      <Text style={styles.breakdownTitle}>{title}</Text>
      {shown.length ? shown.map((item, index) => {
        const label = item.label ?? item.name ?? item.key ?? 'Không rõ'
        const minutes = item.minutes ?? 0
        return (
          <View key={`${label}-${index}`} style={styles.barRow}>
            <View style={styles.barCopy}><Text numberOfLines={1} style={styles.barLabel}>{label}</Text><Text style={styles.barValue}>{minutes}p · {item.count ?? 0} phiên</Text></View>
            <ProgressBar value={minutes} target={max} label={`${label}, ${minutes} phút`} />
          </View>
        )
      }) : <Text style={styles.muted}>Chưa có dữ liệu trong khoảng này.</Text>}
    </View>
  )
}

export function InsightsScreen() {
  const [days, setDays] = useState<7 | 30>(30)
  const today = useTodayKey()
  const range = useMemo(() => dateRangeEndingOn(today, days), [days, today])
  const priorRange = useMemo(() => previousDateRange(range, days), [days, range])
  const weekRange = useMemo(() => weekToDateRange(today), [today])
  const focus = useQuery({ queryKey: analyticsKeys.focus(range), queryFn: () => analyticsService.focus(range) })
  const priorFocus = useQuery({ queryKey: analyticsKeys.focus(priorRange), queryFn: () => analyticsService.focus(priorRange) })
  const weekFocus = useQuery({ queryKey: analyticsKeys.focus(weekRange), queryFn: () => analyticsService.focus(weekRange) })
  const dashboard = useQuery({ queryKey: analyticsKeys.dashboard(today), queryFn: () => analyticsService.dashboard(today) })
  const habits = useQuery({ queryKey: analyticsKeys.habits(range), queryFn: () => analyticsService.habits(range) })
  const loading = focus.isPending || habits.isPending || priorFocus.isPending || weekFocus.isPending || dashboard.isPending
  const refreshing = focus.isRefetching || habits.isRefetching || priorFocus.isRefetching || weekFocus.isRefetching || dashboard.isRefetching
  const maxDaily = Math.max(1, ...(habits.data?.heatmap ?? []).slice(-7).map((cell) => cell.value))
  const interruptionDelta = focus.data && priorFocus.data ? focus.data.interruptions - priorFocus.data.interruptions : null
  const interruptionTrend = interruptionDelta === null
    ? 'Chưa có dữ liệu so sánh'
    : interruptionDelta === 0
      ? `Không đổi so với ${days} ngày trước`
      : `${interruptionDelta > 0 ? 'Tăng' : 'Giảm'} ${Math.abs(interruptionDelta)} so với ${days} ngày trước`

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void Promise.all([focus.refetch(), priorFocus.refetch(), weekFocus.refetch(), dashboard.refetch(), habits.refetch()])} tintColor={colors.moss} />}>
      <AppHeader />
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>Nhìn lại có chủ đích</Text>
        <Text style={styles.title}>Phân tích nhịp làm việc</Text>
        <Text style={styles.subtitle}>Dữ liệu thật từ phiên tập trung và lần hoàn thành thói quen.</Text>
      </View>
      <View accessibilityRole="radiogroup" accessibilityLabel="Khoảng phân tích" style={styles.rangeControls}>
        <Button label="7 ngày" variant={days === 7 ? 'primary' : 'secondary'} accessibilityRole="radio" accessibilityState={{ checked: days === 7 }} onPress={() => setDays(7)} style={styles.rangeButton} />
        <Button label="30 ngày" variant={days === 30 ? 'primary' : 'secondary'} accessibilityRole="radio" accessibilityState={{ checked: days === 30 }} onPress={() => setDays(30)} style={styles.rangeButton} />
      </View>
      <Text style={styles.rangeLabel}>{formatShortDate(range.from)} → {formatShortDate(range.to)}</Text>

      {loading ? <LoadingBlock label="Đang tính nhịp của bạn" rows={6} /> : null}
      {focus.error ? <InlineError message={getApiError(focus.error, 'Không thể tải phân tích tập trung.')} onRetry={() => void focus.refetch()} /> : null}
      {habits.error ? <InlineError message={getApiError(habits.error, 'Không thể tải phân tích thói quen.')} onRetry={() => void habits.refetch()} /> : null}
      {dashboard.error || weekFocus.error || priorFocus.error ? <InlineError message="Một phần số liệu so sánh chưa tải được." onRetry={() => void Promise.all([dashboard.refetch(), weekFocus.refetch(), priorFocus.refetch()])} /> : null}

      {focus.data && habits.data && dashboard.data && weekFocus.data ? (
        <>
          <View style={styles.stats} accessibilityLabel="Tổng quan phân tích">
            <Surface style={styles.primaryStat}><Text style={styles.statLabel}>Tập trung</Text><Text style={styles.primaryValue}>{minutesLabel(focus.data.totalMinutes)}</Text><Text style={styles.statDetail}>{focus.data.completedSessions} phiên hoàn thành</Text></Surface>
            <View style={styles.statPair}>
              <View style={styles.flatStat}><Text style={styles.statLabel}>Hôm nay</Text><Text style={styles.statValue}>{minutesLabel(dashboard.data.focusMinutes)}</Text><Text style={styles.statDetail}>Theo múi giờ hồ sơ</Text></View>
              <View style={styles.flatStat}><Text style={styles.statLabel}>Tuần này</Text><Text style={styles.statValue}>{minutesLabel(weekFocus.data.totalMinutes)}</Text><Text style={styles.statDetail}>Từ thứ Hai đến nay</Text></View>
            </View>
            <View style={styles.statPair}>
              <View style={styles.flatStat}><Text style={styles.statLabel}>Trung bình</Text><Text style={styles.statValue}>{focus.data.averageSessionMinutes}p</Text><Text style={styles.statDetail}>{focus.data.completionRate.toFixed(0)}% hoàn thành</Text></View>
              <View style={styles.flatStat}><Text style={styles.statLabel}>Thói quen</Text><Text style={styles.statValue}>{habits.data.completionRate.toFixed(0)}%</Text><Text style={styles.statDetail}>{habits.data.currentStreak} ngày streak</Text></View>
            </View>
            <View style={styles.statPair}>
              <View style={styles.flatStat}><Text style={styles.statLabel}>Nhất quán</Text><Text style={styles.statValue}>{habits.data.consistency.toFixed(0)}%</Text><Text style={styles.statDetail}>Theo lịch đã đặt</Text></View>
              <View style={styles.flatStat}><Text style={styles.statLabel}>Gián đoạn</Text><Text style={styles.statValue}>{focus.data.interruptions}</Text><Text style={styles.statDetail}>{interruptionTrend}</Text></View>
            </View>
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Tập trung" title="Bạn dành thời gian cho đâu?" />
            <Breakdown title="Dự án" items={focus.data.byProject} />
            <Breakdown title="Công việc" items={focus.data.byTask} />
            <Breakdown title="Thói quen" items={focus.data.byHabit} />
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Gợi ý từ dữ liệu" title="Điều đáng chú ý" />
            {focus.data.insights.length ? focus.data.insights.map((insight) => <View key={insight} style={styles.insight}><View style={styles.insightRule} /><Text style={styles.insightText}>{insight}</Text></View>) : <EmptyState title="Chưa đủ dữ liệu" description="Hoàn thành thêm vài phiên để nhận gợi ý riêng từ backend." />}
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Tính đều" title="7 ngày gần nhất" />
            {(habits.data.heatmap ?? []).slice(-7).map((cell) => (
              <View key={cell.date} style={styles.dailyRow}>
                <Text style={styles.dailyDate}>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(new Date(`${cell.date}T00:00:00`))}</Text>
                <View style={styles.dailyProgress}><ProgressBar value={cell.value} target={maxDaily} label={`Tiến độ ${cell.date}: ${cell.value}`} /></View>
                <Text style={styles.dailyValue}>{cell.value}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <SectionHeader eyebrow="Phân bố thời gian" title="Khi nào bạn tập trung?" />
            <Breakdown title="Theo thứ" items={focus.data.byWeekday} />
            <Breakdown title="Theo giờ bắt đầu" items={focus.data.byHour} />
          </View>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  intro: { gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.x1 },
  rangeControls: { flexDirection: 'row', gap: spacing.x2 },
  rangeButton: { flex: 1 },
  rangeLabel: { ...typography.small, color: colors.inkSoft },
  stats: { gap: spacing.x4 },
  primaryStat: { backgroundColor: colors.mossWash, gap: spacing.x1 },
  primaryValue: { ...typography.title, color: colors.mossDark },
  statPair: { flexDirection: 'row', gap: spacing.x4 },
  flatStat: { flex: 1, borderTopWidth: 1, borderTopColor: colors.lineStrong, paddingTop: spacing.x3, gap: spacing.x1 },
  statLabel: { ...typography.eyebrow, color: colors.inkSoft },
  statValue: { ...typography.heading, color: colors.ink },
  statDetail: { ...typography.small, color: colors.inkSoft },
  section: { gap: spacing.x4 },
  breakdown: { gap: spacing.x3, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.x3 },
  breakdownTitle: { ...typography.smallStrong, color: colors.inkSoft },
  barRow: { gap: spacing.x2 },
  barCopy: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.x3 },
  barLabel: { ...typography.small, color: colors.ink, flex: 1 },
  barValue: { ...typography.data, fontSize: 12, color: colors.inkSoft },
  muted: { ...typography.small, color: colors.inkSoft, paddingVertical: spacing.x3 },
  insight: { flexDirection: 'row', gap: spacing.x3 },
  insightRule: { width: 2, backgroundColor: colors.moss },
  insightText: { ...typography.body, color: colors.inkSoft, flex: 1 },
  dailyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  dailyDate: { ...typography.small, color: colors.inkSoft, width: 34 },
  dailyProgress: { flex: 1 },
  dailyValue: { ...typography.data, color: colors.ink, width: 26, textAlign: 'right' },
})
