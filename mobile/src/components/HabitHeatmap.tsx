import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/constants/theme'
import type { HabitEntry } from '@/types'
import { formatShortDate } from '@/utils/date'

function intensity(value: number, target: number) {
  const ratio = target <= 0 ? 0 : value / target
  if (ratio >= 1) return colors.moss
  if (ratio >= 0.66) return '#72a58c'
  if (ratio > 0) return '#b9d2c2'
  return colors.line
}

export function HabitHeatmap({ entries, target }: { entries: HabitEntry[]; target: number }) {
  const cells = entries.slice(-84)
  const columns = Array.from({ length: Math.ceil(cells.length / 7) }, (_, index) => cells.slice(index * 7, index * 7 + 7))
  return (
    <View style={styles.root}>
      <View accessibilityRole="summary" style={styles.grid}>
        {columns.map((column, columnIndex) => (
          <View key={`column-${columnIndex}`} style={styles.column}>
            {column.map((entry) => (
              <View
                key={entry.date}
                accessible
                accessibilityLabel={`${formatShortDate(entry.date)}: ${entry.value} trên ${target}${entry.completed ? ', hoàn thành' : ''}`}
                style={[styles.cell, { backgroundColor: intensity(entry.value, target) }]}
              />
            ))}
          </View>
        ))}
      </View>
      <Text style={styles.caption}>Mỗi ô là một ngày; màu đậm hơn biểu thị tiến độ cao hơn.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { gap: spacing.x3 },
  grid: { flexDirection: 'row', gap: 4 },
  column: { gap: 4 },
  cell: { width: 16, height: 16, borderRadius: radii.control / 2 },
  caption: { ...typography.small, color: colors.inkSoft },
})
