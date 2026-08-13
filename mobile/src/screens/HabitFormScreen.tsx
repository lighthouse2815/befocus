import { useEffect, useMemo, useState } from 'react'
import DateTimePicker from '@react-native-community/datetimepicker'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Controller, useForm } from 'react-hook-form'
import { router } from 'expo-router'
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { z } from 'zod'
import { RouteHeader } from '@/components/RouteHeader'
import { Button, InlineError, SectionHeader, TextField } from '@/components/ui'
import { colors, radii, spacing, touchTarget, typography } from '@/constants/theme'
import { useTodayKey } from '@/hooks/useTodayKey'
import { Screen } from '@/layouts/Screen'
import { getApiError, getFieldErrors } from '@/services/apiClient'
import { habitKeys, habitService } from '@/services/habitService'
import type { HabitColor, HabitPayload, HabitType, ScheduleType } from '@/types'

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên thói quen.').max(120, 'Tên tối đa 120 ký tự.'),
  description: z.string().max(1000, 'Mô tả tối đa 1000 ký tự.'),
  type: z.enum(['BOOLEAN', 'COUNT', 'DURATION']),
  targetValue: z.string().refine((value) => Number(value) > 0 && Number(value) <= 1_000_000, 'Mục tiêu phải lớn hơn 0.'),
  unit: z.string().max(32, 'Đơn vị tối đa 32 ký tự.'),
  scheduleType: z.enum(['DAILY', 'WEEKDAYS', 'TIMES_PER_WEEK', 'INTERVAL']),
  weekdays: z.array(z.number()),
  timesPerWeek: z.string().refine((value) => Number(value) >= 1 && Number(value) <= 7, 'Chọn từ 1 đến 7 lần.'),
  intervalDays: z.string().refine((value) => Number(value) >= 2 && Number(value) <= 30, 'Khoảng lặp từ 2 đến 30 ngày.'),
  scheduleStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Chọn ngày bắt đầu.'),
  reminderTime: z.string(),
  color: z.enum(['moss', 'clay', 'amber', 'ocean', 'plum', 'ink']),
}).superRefine((values, context) => {
  if (values.scheduleType === 'WEEKDAYS' && values.weekdays.length === 0) {
    context.addIssue({ code: 'custom', path: ['weekdays'], message: 'Chọn ít nhất một ngày.' })
  }
  if (values.type !== 'BOOLEAN' && !values.unit.trim()) {
    context.addIssue({ code: 'custom', path: ['unit'], message: 'Nhập đơn vị.' })
  }
})

type FormValues = z.infer<typeof schema>

export function defaultUnitForHabitType(type: HabitType) {
  return type === 'DURATION' ? 'phút' : 'lần'
}

const weekdayOptions = [
  { value: 1, label: 'T2' }, { value: 2, label: 'T3' }, { value: 3, label: 'T4' },
  { value: 4, label: 'T5' }, { value: 5, label: 'T6' }, { value: 6, label: 'T7' }, { value: 7, label: 'CN' },
]

const colorValues: Array<{ value: HabitColor; label: string; color: string }> = [
  { value: 'moss', label: 'Rêu', color: colors.moss },
  { value: 'clay', label: 'Đất', color: colors.clay },
  { value: 'amber', label: 'Hổ phách', color: colors.amber },
  { value: 'ocean', label: 'Biển', color: colors.ocean },
  { value: 'plum', label: 'Mận', color: colors.plum },
  { value: 'ink', label: 'Mực', color: colors.ink },
]

function dateFromKey(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day, 12) : new Date()
}

function localDateKey(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function timeDate(value: string) {
  const [hours = 9, minutes = 0] = value.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date
}

function localTimeKey(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}

export function HabitFormScreen({ id }: { id?: string }) {
  const editing = Boolean(id)
  const today = useTodayKey()
  const compact = useWindowDimensions().width < 380
  const queryClient = useQueryClient()
  const [generalError, setGeneralError] = useState('')
  const detail = useQuery({ queryKey: habitKeys.detail(id ?? ''), queryFn: () => habitService.get(id!), enabled: editing })
  const defaults = useMemo<FormValues>(() => ({
    name: '', description: '', type: 'BOOLEAN', targetValue: '1', unit: 'lần', scheduleType: 'DAILY',
    weekdays: [1, 3, 5], timesPerWeek: '3', intervalDays: '2', scheduleStartDate: today, reminderTime: '', color: 'moss',
  }), [today])
  const { control, handleSubmit, reset, setError, setValue, watch, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: defaults })
  const type = watch('type')
  const scheduleType = watch('scheduleType')

  useEffect(() => {
    if (!detail.data) return
    reset({
      name: detail.data.name,
      description: detail.data.description ?? '',
      type: detail.data.type,
      targetValue: String(detail.data.targetValue),
      unit: detail.data.unit ?? (detail.data.type === 'DURATION' ? 'phút' : 'lần'),
      scheduleType: detail.data.scheduleType,
      weekdays: detail.data.weekdays ?? [],
      timesPerWeek: String(detail.data.timesPerWeek ?? 3),
      intervalDays: String(detail.data.intervalDays ?? 2),
      scheduleStartDate: detail.data.scheduleStartDate ?? today,
      reminderTime: detail.data.reminderTime?.slice(0, 5) ?? '',
      color: detail.data.color,
    })
  }, [detail.data, reset, today])

  const save = useMutation({
    mutationFn: (payload: HabitPayload) => editing ? habitService.update(id!, payload) : habitService.create(payload),
    onSuccess: async (habit) => {
      await queryClient.invalidateQueries({ queryKey: habitKeys.all })
      router.replace({ pathname: '/habits/[id]', params: { id: habit.id } })
    },
    onError: (error) => {
      Object.entries(getFieldErrors(error)).forEach(([field, message]) => {
        if (field in defaults) setError(field as keyof FormValues, { message })
      })
      setGeneralError(getApiError(error, 'Không thể lưu thói quen.'))
    },
  })

  const submit = handleSubmit((values) => {
    setGeneralError('')
    save.mutate({
      name: values.name.trim(),
      description: values.description.trim(),
      type: values.type,
      targetValue: values.type === 'BOOLEAN' ? 1 : Number(values.targetValue),
      unit: values.type === 'BOOLEAN' ? 'lần' : values.unit.trim(),
      scheduleType: values.scheduleType,
      weekdays: values.scheduleType === 'WEEKDAYS' ? values.weekdays : null,
      timesPerWeek: values.scheduleType === 'TIMES_PER_WEEK' ? Number(values.timesPerWeek) : null,
      intervalDays: values.scheduleType === 'INTERVAL' ? Number(values.intervalDays) : null,
      scheduleStartDate: values.scheduleType === 'INTERVAL' ? values.scheduleStartDate : null,
      reminderTime: values.reminderTime || null,
      color: values.color,
    })
  })

  if (detail.error) return <Screen><RouteHeader title="Chỉnh sửa thói quen" /><InlineError message={getApiError(detail.error)} onRetry={() => void detail.refetch()} /></Screen>

  return (
    <Screen>
      <RouteHeader title={editing ? 'Chỉnh sửa thói quen' : 'Thói quen mới'} />
      <View style={styles.intro}>
        <Text style={styles.title}>{editing ? 'Điều chỉnh cho vừa nhịp' : 'Một việc đủ rõ để lặp lại'}</Text>
        <Text style={styles.subtitle}>Mục tiêu và lịch được backend kiểm tra; ứng dụng chỉ giúp nhập nhanh, đúng ngữ cảnh mobile.</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="01" title="Thói quen nào?" />
        <Controller control={control} name="name" render={({ field: { onBlur, onChange, value } }) => (
          <TextField label="Tên" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.name?.message} returnKeyType="next" />
        )} />
        <Controller control={control} name="description" render={({ field: { onBlur, onChange, value } }) => (
          <TextField label="Mô tả (không bắt buộc)" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.description?.message} multiline textAlignVertical="top" style={styles.textarea} />
        )} />
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="02" title="Đo tiến độ thế nào?" />
        <Controller control={control} name="type" render={({ field: { onChange, value } }) => (
          <OptionGroup<HabitType> value={value} onChange={(nextType) => {
            onChange(nextType)
            setValue('unit', defaultUnitForHabitType(nextType), { shouldDirty: true, shouldValidate: true })
          }} options={[
            { value: 'BOOLEAN', label: 'Có / Không' }, { value: 'COUNT', label: 'Số lượng' }, { value: 'DURATION', label: 'Thời lượng' },
          ]} />
        )} />
        {type !== 'BOOLEAN' ? (
          <View style={[styles.twoColumns, compact ? styles.stackedColumns : null]}>
            <Controller control={control} name="targetValue" render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Mục tiêu" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.targetValue?.message} keyboardType="decimal-pad" containerStyle={[styles.flexInput, compact ? styles.fullInput : null]} />
            )} />
            <Controller control={control} name="unit" render={({ field: { onBlur, onChange, value } }) => (
              <TextField label="Đơn vị" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.unit?.message} containerStyle={[styles.flexInput, compact ? styles.fullInput : null]} />
            )} />
          </View>
        ) : null}
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="03" title="Khi nào xuất hiện?" />
        <Controller control={control} name="scheduleType" render={({ field: { onChange, value } }) => (
          <OptionGroup<ScheduleType> value={value} onChange={onChange} options={[
            { value: 'DAILY', label: 'Mỗi ngày' }, { value: 'WEEKDAYS', label: 'Ngày trong tuần' },
            { value: 'TIMES_PER_WEEK', label: 'Số lần / tuần' }, { value: 'INTERVAL', label: 'Khoảng ngày' },
          ]} />
        )} />

        {scheduleType === 'WEEKDAYS' ? (
          <Controller control={control} name="weekdays" render={({ field: { onChange, value } }) => (
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Chọn ngày</Text>
              <View style={styles.weekdays}>
                {weekdayOptions.map((day) => {
                  const selected = value.includes(day.value)
                  return <Pressable key={day.value} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => onChange(selected ? value.filter((item) => item !== day.value) : [...value, day.value].sort())} style={[styles.weekday, selected ? styles.optionSelected : null]}><Text style={[styles.weekdayText, selected ? styles.optionTextSelected : null]}>{day.label}</Text></Pressable>
                })}
              </View>
              {errors.weekdays?.message ? <Text accessibilityRole="alert" style={styles.error}>{errors.weekdays.message}</Text> : null}
            </View>
          )} />
        ) : null}
        {scheduleType === 'TIMES_PER_WEEK' ? <Controller control={control} name="timesPerWeek" render={({ field: { onBlur, onChange, value } }) => <TextField label="Số lần mỗi tuần" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.timesPerWeek?.message} keyboardType="number-pad" />} /> : null}
        {scheduleType === 'INTERVAL' ? (
          <>
            <Controller control={control} name="intervalDays" render={({ field: { onBlur, onChange, value } }) => <TextField label="Lặp lại mỗi (ngày)" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.intervalDays?.message} keyboardType="number-pad" />} />
            <Controller control={control} name="scheduleStartDate" render={({ field: { onChange, value } }) => <DatePickerField label="Bắt đầu từ" value={value} onChange={onChange} />} />
          </>
        ) : null}
        <Controller control={control} name="reminderTime" render={({ field: { onChange, value } }) => <TimePickerField value={value} onChange={onChange} />} />
      </View>

      <View style={styles.section}>
        <SectionHeader eyebrow="04" title="Màu nhận diện" />
        <Controller control={control} name="color" render={({ field: { onChange, value } }) => (
          <View style={styles.colors}>
            {colorValues.map((item) => (
              <Pressable key={item.value} accessibilityRole="radio" accessibilityLabel={item.label} accessibilityState={{ checked: value === item.value }} onPress={() => onChange(item.value)} style={[styles.colorOption, value === item.value ? styles.colorSelected : null]}>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} /><Text style={styles.colorLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
        )} />
      </View>

      {generalError ? <Text accessibilityRole="alert" style={styles.error}>{generalError}</Text> : null}
      <Button label={editing ? 'Lưu thay đổi' : 'Tạo thói quen'} loading={save.isPending} onPress={() => void submit()} />
    </Screen>
  )
}

function OptionGroup<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: Array<{ value: T; label: string }> }) {
  return <View accessibilityRole="radiogroup" style={styles.optionGroup}>{options.map((option) => {
    const selected = value === option.value
    return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option.value)} style={[styles.option, selected ? styles.optionSelected : null]}><Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{option.label}</Text></Pressable>
  })}</View>
}

function DatePickerField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => setOpen(true)} style={styles.pickerButton}><Text style={styles.pickerValue}>{value}</Text></Pressable>{open ? <DateTimePicker value={dateFromKey(value)} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(_, date) => { if (Platform.OS !== 'ios') setOpen(false); if (date) onChange(localDateKey(date)) }} /> : null}{open && Platform.OS === 'ios' ? <Button label="Xong" variant="quiet" onPress={() => setOpen(false)} /> : null}</View>
}

function TimePickerField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  if (!value) return <Button label="Thêm giờ nhắc" variant="secondary" onPress={() => { onChange('09:00'); setOpen(true) }} />
  return <View style={styles.fieldGroup}><Text style={styles.fieldLabel}>Giờ nhắc</Text><View style={styles.timeRow}><Pressable accessibilityRole="button" accessibilityLabel={`Giờ nhắc: ${value}`} onPress={() => setOpen(true)} style={[styles.pickerButton, styles.timePicker]}><Text style={styles.pickerValue}>{value}</Text></Pressable><Button label="Bỏ" variant="quiet" onPress={() => { onChange(''); setOpen(false) }} /></View>{open ? <DateTimePicker value={timeDate(value)} mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={(_, date) => { if (Platform.OS !== 'ios') setOpen(false); if (date) onChange(localTimeKey(date)) }} /> : null}{open && Platform.OS === 'ios' ? <Button label="Xong" variant="quiet" onPress={() => setOpen(false)} /> : null}</View>
}

const styles = StyleSheet.create({
  intro: { gap: spacing.x2 },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft },
  section: { gap: spacing.x4, paddingTop: spacing.x4, borderTopWidth: 1, borderTopColor: colors.line },
  textarea: { minHeight: 112 },
  twoColumns: { flexDirection: 'row', gap: spacing.x3 },
  stackedColumns: { flexDirection: 'column' },
  flexInput: { flex: 1 },
  fullInput: { flex: 0, width: '100%' },
  optionGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.x2 },
  option: { minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.x3, borderRadius: radii.control, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paperRaised },
  optionSelected: { borderColor: colors.moss, backgroundColor: colors.moss },
  optionText: { ...typography.smallStrong, color: colors.ink },
  optionTextSelected: { color: colors.white },
  fieldGroup: { gap: spacing.x2 },
  fieldLabel: { ...typography.smallStrong, color: colors.ink },
  weekdays: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.x2 },
  weekday: { width: touchTarget, height: touchTarget, alignItems: 'center', justifyContent: 'center', borderRadius: radii.control, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paperRaised },
  weekdayText: { ...typography.smallStrong, color: colors.ink },
  pickerButton: { minHeight: touchTarget, justifyContent: 'center', paddingHorizontal: spacing.x3, borderRadius: radii.control, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.paperRaised },
  pickerValue: { ...typography.body, color: colors.ink },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  timePicker: { flex: 1 },
  colors: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.x2 },
  colorOption: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacing.x2, paddingHorizontal: spacing.x3, borderWidth: 1, borderColor: colors.line, borderRadius: radii.control, backgroundColor: colors.paperRaised },
  colorSelected: { borderColor: colors.ink, borderWidth: 2 },
  colorDot: { width: 14, height: 14, borderRadius: radii.round },
  colorLabel: { ...typography.small, color: colors.ink },
  error: { ...typography.small, color: colors.danger },
})
