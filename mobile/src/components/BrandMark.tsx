import { StyleSheet, Text, View } from 'react-native'
import { colors, radii, spacing, typography } from '@/constants/theme'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View accessibilityLabel="FocusFlow" style={styles.row}>
      <View style={styles.mark} accessibilityElementsHidden>
        <View style={styles.markLineWide} />
        <View style={styles.markLineShort} />
      </View>
      {!compact ? <Text style={styles.name}>FocusFlow</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  mark: { width: 36, height: 36, borderRadius: radii.control, backgroundColor: colors.moss, justifyContent: 'center', paddingHorizontal: 8, gap: 5 },
  markLineWide: { height: 3, width: 20, borderRadius: radii.round, backgroundColor: colors.white },
  markLineShort: { height: 3, width: 12, borderRadius: radii.round, backgroundColor: colors.white },
  name: { ...typography.heading, color: colors.ink },
})
