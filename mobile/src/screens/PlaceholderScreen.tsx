import { StyleSheet, Text, View } from 'react-native'
import { BrandMark } from '@/components/BrandMark'
import { colors, spacing, typography } from '@/constants/theme'
import { Screen } from '@/layouts/Screen'

export function PlaceholderScreen({ title, description }: { title: string; description: string }) {
  return (
    <Screen>
      <BrandMark compact />
      <View style={styles.intro}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  intro: { gap: spacing.x2 },
  title: { ...typography.title, color: colors.ink },
  description: { ...typography.body, color: colors.inkSoft },
})
