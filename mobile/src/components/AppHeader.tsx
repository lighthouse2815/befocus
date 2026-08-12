import Ionicons from '@expo/vector-icons/Ionicons'
import { router } from 'expo-router'
import { Pressable, StyleSheet, View } from 'react-native'
import { BrandMark } from './BrandMark'
import { colors, iconSizes, radii, touchTarget } from '@/constants/theme'

export function AppHeader() {
  return (
    <View style={styles.row}>
      <BrandMark compact />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở cài đặt"
        hitSlop={8}
        onPress={() => router.push('/settings')}
        style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
      >
        <Ionicons name="settings-outline" color={colors.ink} size={iconSizes.control} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  action: { width: touchTarget, height: touchTarget, borderRadius: radii.control, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperRaised, alignItems: 'center', justifyContent: 'center' },
  actionPressed: { backgroundColor: colors.mossWash },
})
