import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { colors, spacing, typography } from '@/constants/theme'

export function LoadingScreen({ label = 'Đang chuẩn bị FocusFlow…' }: { label?: string }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} style={styles.root}>
      <ActivityIndicator color={colors.moss} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper, gap: spacing.x4, padding: spacing.x6 },
  label: { ...typography.body, color: colors.inkSoft, textAlign: 'center' },
})
