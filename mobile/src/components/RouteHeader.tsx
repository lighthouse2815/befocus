import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'

export function RouteHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quay lại"
        onPress={() => router.back()}
        style={({ pressed }) => [styles.back, pressed ? styles.pressed : null]}
      >
        <Ionicons name="arrow-back" color={colors.ink} size={iconSizes.control} />
      </Pressable>
      <Text numberOfLines={1} style={styles.title}>{title}</Text>
      <View style={styles.action}>{action}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  back: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radii.control, backgroundColor: colors.paperRaised },
  pressed: { opacity: 0.72 },
  title: { ...typography.subheading, color: colors.ink, flex: 1 },
  action: { minWidth: touchTarget, alignItems: 'flex-end' },
})
