import Ionicons from '@expo/vector-icons/Ionicons'
import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'

export interface ChoiceOption {
  value: string
  label: string
  description?: string
}

export function ChoiceField({ label, value, options, placeholder, onChange }: { label: string; value: string; options: ChoiceOption[]; placeholder: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const selected = useMemo(() => options.find((option) => option.value === value), [options, value])
  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`} onPress={() => setOpen((current) => !current)} style={styles.trigger}>
        <Text numberOfLines={1} style={[styles.value, !selected ? styles.placeholder : null]}>{selected?.label ?? placeholder}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={iconSizes.inline} color={colors.inkSoft} />
      </Pressable>
      {open ? (
        <View style={styles.options} accessibilityRole="radiogroup">
          {options.map((option, index) => {
            const checked = option.value === value
            return (
              <Pressable
                key={`${option.value}-${index}`}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                onPress={() => { onChange(option.value); setOpen(false) }}
                style={({ pressed }) => [styles.option, index > 0 ? styles.rule : null, pressed ? styles.pressed : null]}
              >
                <View style={styles.optionCopy}>
                  <Text style={[styles.optionLabel, checked ? styles.optionChecked : null]}>{option.label}</Text>
                  {option.description ? <Text style={styles.description}>{option.description}</Text> : null}
                </View>
                {checked ? <Ionicons name="checkmark" size={iconSizes.control} color={colors.mossDark} /> : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  group: { gap: spacing.x2 },
  label: { ...typography.smallStrong, color: colors.ink },
  trigger: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.x2, paddingHorizontal: spacing.x3, borderRadius: radii.control, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paperRaised },
  value: { ...typography.body, color: colors.ink, flex: 1 },
  placeholder: { color: colors.inkSoft },
  options: { borderWidth: 1, borderColor: colors.line, borderRadius: radii.control, backgroundColor: colors.paperRaised, paddingHorizontal: spacing.x3 },
  option: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.x3, paddingVertical: spacing.x2 },
  rule: { borderTopWidth: 1, borderTopColor: colors.line },
  pressed: { opacity: 0.72 },
  optionCopy: { flex: 1 },
  optionLabel: { ...typography.body, color: colors.ink },
  optionChecked: { ...typography.bodyStrong, color: colors.mossDark },
  description: { ...typography.small, color: colors.inkSoft },
})
