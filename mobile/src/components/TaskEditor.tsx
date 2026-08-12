import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { StyleSheet, View } from 'react-native'
import { z } from 'zod'
import { OptionalDateField } from './OptionalDateField'
import { Button, TextField } from './ui'
import { spacing } from '@/constants/theme'
import type { Task, TaskPayload } from '@/types'

const schema = z.object({
  title: z.string().trim().min(1, 'Nhập tên công việc.').max(200, 'Tên tối đa 200 ký tự.'),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự.'),
  dueDate: z.string().refine((value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value), 'Ngày không hợp lệ.'),
})
type Values = z.infer<typeof schema>

export function TaskEditor({ projectId, initial, loading, onSubmit, onCancel }: { projectId: string; initial?: Task; loading?: boolean; onSubmit: (payload: TaskPayload) => void; onCancel: () => void }) {
  const { control, handleSubmit, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: initial?.title ?? '', description: initial?.description ?? '', dueDate: initial?.dueDate ?? '' },
  })
  const submit = handleSubmit((values) => onSubmit({ projectId, title: values.title.trim(), description: values.description.trim(), dueDate: values.dueDate || null }))
  return (
    <View style={styles.form}>
      <Controller control={control} name="title" render={({ field: { onBlur, onChange, value } }) => <TextField label="Tên công việc" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.title?.message} />} />
      <Controller control={control} name="description" render={({ field: { onBlur, onChange, value } }) => <TextField label="Mô tả (không bắt buộc)" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.description?.message} multiline textAlignVertical="top" style={styles.textarea} />} />
      <Controller control={control} name="dueDate" render={({ field: { onChange, value } }) => <OptionalDateField label="Hạn (không bắt buộc)" value={value} onChange={onChange} />} />
      <View style={styles.actions}><Button label="Hủy" variant="secondary" onPress={onCancel} /><Button label={initial ? 'Lưu công việc' : 'Thêm công việc'} loading={loading} onPress={() => void submit()} /></View>
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: spacing.x4 },
  textarea: { minHeight: 88 },
  actions: { gap: spacing.x2 },
})
