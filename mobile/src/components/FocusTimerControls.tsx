import { StyleSheet, Text, View } from 'react-native'
import { Button } from './ui'
import { colors, spacing, typography } from '@/constants/theme'
import { formatTimer, timerAccessibilityLabel } from '@/store/timerStore'
import type { FocusSession } from '@/types'

export function FocusTimerControls({
  session,
  remainingSeconds,
  pausePending = false,
  resumePending = false,
  completePending = false,
  onPause,
  onResume,
  onComplete,
}: {
  session: FocusSession
  remainingSeconds: number
  pausePending?: boolean
  resumePending?: boolean
  completePending?: boolean
  onPause: () => void
  onResume: () => void
  onComplete: () => void
}) {
  return (
    <>
      <View style={styles.context}>
        <Text style={styles.status}>{session.status === 'PAUSED' ? 'Đang tạm dừng' : remainingSeconds === 0 ? 'Đang đồng bộ hoàn thành' : 'Đang tập trung'}</Text>
        <Text numberOfLines={2} style={styles.contextTitle}>{session.taskTitle || session.habitName || session.projectName || 'Phiên độc lập'}</Text>
        <Text style={styles.contextMeta}>{session.plannedDurationMinutes} phút{session.projectName ? ` · ${session.projectName}` : ''}</Text>
      </View>
      <Text accessible accessibilityLabel={timerAccessibilityLabel(remainingSeconds)} accessibilityLiveRegion="polite" style={styles.timer}>{formatTimer(remainingSeconds)}</Text>
      <View style={styles.primaryControls}>
        {session.status === 'PAUSED'
          ? <Button label="Tiếp tục" loading={resumePending} onPress={onResume} />
          : <Button label="Tạm dừng" variant="secondary" loading={pausePending} disabled={remainingSeconds === 0} onPress={onPause} />}
        <Button label="Hoàn thành" loading={completePending} onPress={onComplete} />
      </View>
    </>
  )
}

const styles = StyleSheet.create({
  context: { alignItems: 'center', gap: spacing.x1 },
  status: { ...typography.eyebrow, color: colors.mossDark },
  contextTitle: { ...typography.heading, color: colors.ink, textAlign: 'center' },
  contextMeta: { ...typography.small, color: colors.inkSoft, textAlign: 'center' },
  timer: { ...typography.timer, color: colors.ink, textAlign: 'center', fontVariant: ['tabular-nums'] },
  primaryControls: { gap: spacing.x3 },
})
