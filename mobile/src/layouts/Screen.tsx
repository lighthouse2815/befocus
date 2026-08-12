import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewProps } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { colors, spacing } from '@/constants/theme'
import { OfflineBanner } from '@/components/OfflineBanner'

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode
  scroll?: boolean
  contentContainerStyle?: ScrollViewProps['contentContainerStyle']
}

export function Screen({ children, scroll = true, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          {...props}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, styles.fill]}>{children}</View>
      )}
    </SafeAreaView>
  )
}

export function ScreenBody({ style, ...props }: ViewProps) {
  return <View style={[styles.body, style]} {...props} />
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.x4, paddingTop: spacing.x4, paddingBottom: spacing.x12, gap: spacing.x6 },
  fill: { flex: 1 },
  body: { gap: spacing.x4 },
})
