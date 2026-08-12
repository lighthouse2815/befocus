import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Button, ProgressBar, Surface } from './ui'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'
import type { Habit } from '@/types'

const habitColors: Record<string, string> = {
  moss: colors.moss,
  clay: colors.clay,
  amber: colors.amber,
  ocean: colors.ocean,
  plum: colors.plum,
  ink: colors.ink,
}

interface HabitItemProps {
  habit: Habit
  pending?: boolean
  onOpen?: () => void
  onSetValue: (value: number) => void
  onUndo: () => void
  onStartFocus?: () => void
}

export function HabitItem({ habit, pending = false, onOpen, onSetValue, onUndo, onStartFocus }: HabitItemProps) {
  const target = Number(habit.todayTarget || habit.targetValue)
  const progress = Number(habit.todayProgress)
  const unit = habit.unit || (habit.type === 'DURATION' ? 'phút' : 'lần')

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        {onOpen ? (
          <Pressable accessibilityRole="link" onPress={onOpen} style={styles.titleButton} hitSlop={6}>
            <HabitTitle habit={habit} />
            <Ionicons name="chevron-forward" size={iconSizes.inline} color={colors.inkSoft} />
          </Pressable>
        ) : (
          <View style={styles.titleButton}><HabitTitle habit={habit} /></View>
        )}
      </View>

      {habit.type === 'BOOLEAN' ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: habit.completedToday, disabled: pending }}
          accessibilityLabel={`${habit.name}, ${habit.completedToday ? 'đã hoàn thành' : 'chưa hoàn thành'}`}
          disabled={pending}
          onPress={habit.completedToday ? onUndo : () => onSetValue(target)}
          style={({ pressed }) => [styles.booleanAction, habit.completedToday ? styles.booleanDone : null, pressed ? styles.pressed : null]}
        >
          <Ionicons name={habit.completedToday ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={habit.completedToday ? colors.moss : colors.inkSoft} />
          <Text style={[styles.booleanText, habit.completedToday ? styles.doneText : null]}>{habit.completedToday ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}</Text>
        </Pressable>
      ) : (
        <View style={styles.progressBlock}>
          <View style={styles.progressLine}>
            <Text style={styles.progressValue}>{progress} / {target} {unit}</Text>
            {habit.completedToday ? <Text style={styles.completeLabel}>Hoàn thành</Text> : null}
          </View>
          <ProgressBar value={progress} target={target} label={`Tiến độ ${habit.name}`} />
          {habit.type === 'COUNT' ? (
            <View style={styles.counter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Giảm tiến độ ${habit.name}`}
                disabled={pending || progress <= 0}
                onPress={progress <= 1 ? onUndo : () => onSetValue(progress - 1)}
                style={({ pressed }) => [styles.counterButton, (pending || progress <= 0) ? styles.disabled : null, pressed ? styles.pressed : null]}
              >
                <Ionicons name="remove" size={iconSizes.control} color={colors.ink} />
              </Pressable>
              <Text accessibilityLiveRegion="polite" style={styles.counterValue}>{progress}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Tăng tiến độ ${habit.name}`}
                disabled={pending}
                onPress={() => onSetValue(progress + 1)}
                style={({ pressed }) => [styles.counterButton, pending ? styles.disabled : null, pressed ? styles.pressed : null]}
              >
                <Ionicons name="add" size={iconSizes.control} color={colors.ink} />
              </Pressable>
            </View>
          ) : onStartFocus ? (
            <Button label="Bắt đầu tập trung" variant="secondary" onPress={onStartFocus} />
          ) : null}
        </View>
      )}
    </Surface>
  )
}

function HabitTitle({ habit }: { habit: Habit }) {
  return (
    <>
      <View style={[styles.dot, { backgroundColor: habitColors[habit.color] ?? colors.moss }]} />
      <View style={styles.titleText}>
        <Text style={styles.title}>{habit.name}</Text>
        <Text style={styles.meta}>{habit.currentStreak} ngày streak · {habit.scheduleType === 'DAILY' ? 'Hằng ngày' : 'Theo lịch'}</Text>
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  card: { gap: spacing.x4 },
  header: { gap: spacing.x2 },
  titleButton: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  dot: { width: 10, height: 10, borderRadius: radii.round },
  titleText: { flex: 1 },
  title: { ...typography.bodyStrong, color: colors.ink },
  meta: { ...typography.small, color: colors.inkSoft },
  booleanAction: { minHeight: touchTarget, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.x3, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  booleanDone: { borderTopColor: colors.mossWash },
  booleanText: { ...typography.body, color: colors.ink },
  doneText: { color: colors.mossDark },
  progressBlock: { gap: spacing.x3 },
  progressLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.x2 },
  progressValue: { ...typography.data, color: colors.ink },
  completeLabel: { ...typography.smallStrong, color: colors.mossDark },
  counter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.x4 },
  counterButton: { width: touchTarget, height: touchTarget, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radii.control, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paperRaised },
  counterValue: { ...typography.data, color: colors.ink, minWidth: 56, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.72 },
})
