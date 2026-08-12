import Ionicons from '@expo/vector-icons/Ionicons'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/AppHeader'
import { HabitItem } from '@/components/HabitItem'
import { Button, EmptyState, InlineError, LoadingBlock } from '@/components/ui'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'
import { useHabitProgress } from '@/hooks/useHabitProgress'
import { useTodayKey } from '@/hooks/useTodayKey'
import { Screen } from '@/layouts/Screen'
import { getApiError } from '@/services/apiClient'
import { habitKeys, habitService } from '@/services/habitService'

export function HabitsScreen() {
  const today = useTodayKey()
  const query = useQuery({ queryKey: habitKeys.list(false), queryFn: () => habitService.list(false) })
  const progress = useHabitProgress(today)
  const active = (query.data ?? []).filter((habit) => !habit.archivedAt)

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.moss} />}>
      <AppHeader />
      <View style={styles.titleRow}>
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>Nhịp đều</Text>
          <Text style={styles.title}>Thói quen</Text>
          <Text style={styles.subtitle}>Các thao tác thường xuyên nằm ngay trên danh sách.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tạo thói quen"
          onPress={() => router.push('/habits/new')}
          style={({ pressed }) => [styles.addButton, pressed ? styles.pressed : null]}
        >
          <Ionicons name="add" size={iconSizes.feature} color={colors.white} />
        </Pressable>
      </View>

      {query.isPending ? <LoadingBlock label="Đang tải thói quen" rows={4} /> : query.error ? <InlineError message={getApiError(query.error)} onRetry={() => void query.refetch()} /> : active.length ? (
        <View style={styles.list}>
          {active.map((habit) => (
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
        <EmptyState
          title="Chưa có thói quen"
          description="Tạo một thói quen đủ nhỏ để bắt đầu ngay hôm nay."
          action={<Button label="Tạo thói quen đầu tiên" onPress={() => router.push('/habits/new')} />}
        />
      )}
      {progress.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(progress.error, 'Không thể cập nhật tiến độ.')}</Text> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.x4 },
  intro: { flex: 1, gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.x1 },
  addButton: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, backgroundColor: colors.moss },
  pressed: { opacity: 0.76 },
  list: { gap: spacing.x3 },
  error: { ...typography.small, color: colors.danger },
})
