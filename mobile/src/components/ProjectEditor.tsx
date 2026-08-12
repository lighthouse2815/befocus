import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { z } from 'zod'
import { Button, TextField } from './ui'
import { colors, radii, spacing, touchTarget, typography } from '@/constants/theme'
import type { HabitColor, ProjectPayload } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên dự án.').max(120, 'Tên tối đa 120 ký tự.'),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự.'),
  color: z.enum(['moss', 'clay', 'amber', 'ocean', 'plum', 'ink']),
})
type Values = z.infer<typeof schema>

const colorOptions: Array<{ value: HabitColor; label: string; color: string }> = [
  { value: 'moss', label: 'Rêu', color: colors.moss }, { value: 'clay', label: 'Đất', color: colors.clay },
  { value: 'amber', label: 'Hổ phách', color: colors.amber }, { value: 'ocean', label: 'Biển', color: colors.ocean },
  { value: 'plum', label: 'Mận', color: colors.plum }, { value: 'ink', label: 'Mực', color: colors.ink },
]

export function ProjectEditor({ initial, loading, submitLabel, onSubmit, onCancel }: { initial?: Partial<ProjectPayload>; loading?: boolean; submitLabel: string; onSubmit: (payload: ProjectPayload) => void; onCancel?: () => void }) {
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: initial?.name ?? '', description: initial?.description ?? '', color: (initial?.color as HabitColor) ?? 'moss' },
  })
  const submit = handleSubmit((values) => onSubmit({ ...values, name: values.name.trim(), description: values.description.trim(), icon: 'folder' }))
  return (
    <View style={styles.form}>
      <Controller control={control} name="name" render={({ field: { onBlur, onChange, value } }) => <TextField label="Tên dự án" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.name?.message} />} />
      <Controller control={control} name="description" render={({ field: { onBlur, onChange, value } }) => <TextField label="Mô tả (không bắt buộc)" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.description?.message} multiline textAlignVertical="top" style={styles.textarea} />} />
      <Controller control={control} name="color" render={({ field: { onChange, value } }) => (
        <View style={styles.group}><Text style={styles.label}>Màu nhận diện</Text><View style={styles.colors}>{colorOptions.map((item) => <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: value === item.value }} onPress={() => onChange(item.value)} style={[styles.colorOption, value === item.value ? styles.selected : null]}><View style={[styles.dot, { backgroundColor: item.color }]} /><Text style={styles.colorLabel}>{item.label}</Text></Pressable>)}</View></View>
      )} />
      <View style={styles.actions}>{onCancel ? <Button label="Hủy" variant="secondary" onPress={onCancel} /> : null}<Button label={submitLabel} loading={loading} onPress={() => void submit()} /></View>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.x4 },
  textarea: { minHeight: 96 },
  group: { gap: spacing.x2 },
  label: { ...typography.smallStrong, color: colors.ink },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.x2 },
  colorOption: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.x2, paddingHorizontal: spacing.x3, borderWidth: 1, borderColor: colors.line, borderRadius: radii.control },
  selected: { borderColor: colors.ink, borderWidth: 2 },
  dot: { width: 14, height: 14, borderRadius: radii.round },
  colorLabel: { ...typography.small, color: colors.ink },
  actions: { gap: spacing.x2 },
})
