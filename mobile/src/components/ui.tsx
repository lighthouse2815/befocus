import { forwardRef } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type ViewProps, type ViewStyle } from 'react-native'
import { colors, radii, spacing, surface, touchTarget, typography } from '@/constants/theme'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string
  variant?: ButtonVariant
  loading?: boolean
}

const buttonPalette: Record<ButtonVariant, { background: string; border: string; text: string }> = {
  primary: { background: colors.moss, border: colors.moss, text: colors.white },
  secondary: { background: colors.paperRaised, border: colors.lineStrong, text: colors.ink },
  quiet: { background: 'transparent', border: 'transparent', text: colors.mossDark },
  danger: { background: colors.danger, border: colors.danger, text: colors.white },
}

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...props }: ButtonProps) {
  const palette = buttonPalette[variant]
  const blocked = disabled || loading
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked, busy: loading }}
      disabled={blocked}
      style={(state) => [
        styles.button,
        { backgroundColor: palette.background, borderColor: palette.border, opacity: blocked ? 0.55 : state.pressed ? 0.82 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={palette.text} /> : <Text style={[styles.buttonLabel, { color: palette.text }]}>{label}</Text>}
    </Pressable>
  )
}

interface TextFieldProps extends TextInputProps {
  label: string
  error?: string
  hint?: string
  containerStyle?: StyleProp<ViewStyle>
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, error, hint, containerStyle, style, ...props }, ref) {
  const errorId = error ? `${label}-error` : undefined
  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ disabled: !props.editable }}
        aria-describedby={errorId}
        placeholderTextColor={colors.inkSoft}
        selectionColor={colors.moss}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...props}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text nativeID={errorId} accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    </View>
  )
})

export function SectionHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action}
    </View>
  )
}

export function Surface({ style, ...props }: ViewProps) {
  return <View style={[styles.surface, style]} {...props} />
}

export function ProgressBar({ value, target, label }: { value: number; target: number; label?: string }) {
  const ratio = target <= 0 ? 0 : Math.min(1, Math.max(0, value / target))
  const percentage = Math.round(ratio * 100)
  return (
    <View accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percentage }}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
      </View>
    </View>
  )
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Surface accessibilityRole="alert" style={styles.errorSurface}>
      <Text style={styles.errorTitle}>Có vấn đề khi tải dữ liệu</Text>
      <Text style={styles.errorBody}>{message}</Text>
      {onRetry ? <Button label="Thử lại" variant="secondary" onPress={onRetry} /> : null}
    </Surface>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}
      {action}
    </View>
  )
}

const styles = StyleSheet.create({
  button: { minHeight: touchTarget, paddingHorizontal: spacing.x4, paddingVertical: spacing.x3, borderRadius: radii.control, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  buttonLabel: { ...typography.bodyStrong, textAlign: 'center' },
  fieldGroup: { gap: spacing.x2 },
  fieldLabel: { ...typography.smallStrong, color: colors.ink },
  input: { minHeight: touchTarget, borderWidth: 1, borderColor: colors.lineStrong, borderRadius: radii.control, backgroundColor: colors.paperRaised, color: colors.ink, paddingHorizontal: spacing.x3, paddingVertical: spacing.x3, ...typography.body },
  inputError: { borderColor: colors.danger },
  hint: { ...typography.small, color: colors.inkSoft },
  errorText: { ...typography.small, color: colors.danger },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.x3 },
  sectionHeaderText: { flex: 1, gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  sectionTitle: { ...typography.heading, color: colors.ink },
  surface: { ...surface, padding: spacing.x4 },
  progressTrack: { height: 8, overflow: 'hidden', borderRadius: radii.round, backgroundColor: colors.line },
  progressFill: { height: '100%', borderRadius: radii.round, backgroundColor: colors.moss },
  errorSurface: { backgroundColor: colors.dangerWash, borderColor: '#efc2c2', gap: spacing.x3 },
  errorTitle: { ...typography.subheading, color: colors.danger },
  errorBody: { ...typography.body, color: colors.ink },
  emptyState: { paddingVertical: spacing.x8, alignItems: 'center', gap: spacing.x3 },
  emptyTitle: { ...typography.subheading, color: colors.ink, textAlign: 'center' },
  emptyDescription: { ...typography.body, color: colors.inkSoft, textAlign: 'center', maxWidth: 300 },
})
