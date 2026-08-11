import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Check } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Button, ErrorState, Input, LoadingBlock, PageHeader, Select, Textarea } from '../components/ui'
import { useToast } from '../components/Toast'
import { getApiError, getFieldErrors } from '../services/api'
import { habitKeys, habitsService } from '../services/habits'
import { isoToday } from '../hooks/useDateRange'
import type { HabitColor, HabitPayload, HabitType, ScheduleType } from '../types'

interface HabitFormFields {
  name: string
  description: string
  type: HabitType
  targetValue: number
  unit: string
  scheduleType: ScheduleType
  weekdays: number[]
  timesPerWeek: number
  intervalDays: number
  scheduleStartDate: string
  reminderTime: string
  color: HabitColor
}

const defaults: HabitFormFields = {
  name: '',
  description: '',
  type: 'BOOLEAN',
  targetValue: 1,
  unit: 'lần',
  scheduleType: 'DAILY',
  weekdays: [1, 3, 5],
  timesPerWeek: 3,
  intervalDays: 2,
  scheduleStartDate: isoToday(),
  reminderTime: '',
  color: 'moss',
}

const weekdayOptions = [
  { value: 1, label: 'T2' },
  { value: 2, label: 'T3' },
  { value: 3, label: 'T4' },
  { value: 4, label: 'T5' },
  { value: 5, label: 'T6' },
  { value: 6, label: 'T7' },
  { value: 7, label: 'CN' },
]

const colorOptions: Array<{ value: HabitColor; label: string; className: string }> = [
  { value: 'moss', label: 'Rêu', className: 'bg-moss' },
  { value: 'clay', label: 'Đất nung', className: 'bg-clay' },
  { value: 'amber', label: 'Hổ phách', className: 'bg-amber' },
  { value: 'ocean', label: 'Xanh biển', className: 'bg-ocean' },
  { value: 'plum', label: 'Mận', className: 'bg-plum' },
]

const typeOptions = [
  { value: 'BOOLEAN', title: 'Hoàn thành', detail: 'Có hoặc chưa' },
  { value: 'COUNT', title: 'Số lượng', detail: 'Trang, cốc, lượt…' },
  { value: 'DURATION', title: 'Thời lượng', detail: 'Phút tập trung' },
] as const

export function HabitFormPage() {
  const { id } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [generalError, setGeneralError] = useState('')
  const detail = useQuery({
    queryKey: habitKeys.detail(id || ''),
    queryFn: () => habitsService.get(id || ''),
    enabled: editing,
  })
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<HabitFormFields>({ defaultValues: defaults })

  const type = watch('type')
  const unit = watch('unit')
  const scheduleType = watch('scheduleType')
  const selectedWeekdays = watch('weekdays')
  const color = watch('color')
  const typeLocked = editing && Boolean(detail.data?.entries.length)

  useEffect(() => {
    if (!detail.data) return
    reset({
      name: detail.data.name,
      description: detail.data.description || '',
      type: detail.data.type,
      targetValue: detail.data.targetValue,
      unit: detail.data.unit || '',
      scheduleType: detail.data.scheduleType,
      weekdays: detail.data.weekdays || [],
      timesPerWeek: detail.data.timesPerWeek || 3,
      intervalDays: detail.data.intervalDays || 2,
      scheduleStartDate: detail.data.scheduleStartDate || isoToday(),
      reminderTime: detail.data.reminderTime?.slice(0, 5) || '',
      color: detail.data.color || 'moss',
    })
  }, [detail.data, reset])

  useEffect(() => {
    if (type === 'BOOLEAN') {
      setValue('targetValue', 1)
      setValue('unit', 'lần')
    } else if (type === 'DURATION' && (unit === 'lần' || !unit)) {
      setValue('unit', 'phút')
    } else if (type === 'COUNT' && unit === 'lần') {
      setValue('unit', '')
    }
  }, [setValue, type, unit])

  const save = useMutation({
    mutationFn: (payload: HabitPayload) => editing && id
      ? habitsService.update(id, payload)
      : habitsService.create(payload),
    onSuccess: (habit) => {
      void queryClient.invalidateQueries({ queryKey: habitKeys.all })
      notify(editing ? 'Đã lưu thay đổi.' : 'Đã tạo thói quen.')
      navigate(`/habits/${habit.id}`, { replace: true })
    },
    onError: (error) => {
      Object.entries(getFieldErrors(error)).forEach(([field, message]) => {
        if (field in defaults) setError(field as keyof HabitFormFields, { message })
      })
      setGeneralError(getApiError(error, 'Không thể lưu thói quen.'))
    },
  })

  if (editing && detail.isPending) return <LoadingBlock rows={6} />
  if (editing && detail.isError) {
    return <ErrorState message={getApiError(detail.error, 'Không thể tải thói quen.')} onRetry={() => void detail.refetch()} />
  }

  const submit = (values: HabitFormFields) => {
    setGeneralError('')
    if (values.scheduleType === 'WEEKDAYS' && values.weekdays.length === 0) {
      setError('weekdays', { message: 'Chọn ít nhất một ngày.' })
      return
    }

    const payload: HabitPayload = {
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
    }
    save.mutate(payload)
  }

  return (
    <>
      <Link
        to={editing && id ? `/habits/${id}` : '/habits'}
        className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-control text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </Link>

      <PageHeader
        eyebrow={editing ? 'Chỉnh sửa' : 'Thói quen mới'}
        title={editing ? `Điều chỉnh ${detail.data?.name ?? 'thói quen'}` : 'Tạo một nhịp mới'}
        description="Chọn một mục tiêu đủ rõ để biết khi nào bạn đã hoàn thành."
      />

      <form className="mx-auto max-w-3xl space-y-9" onSubmit={handleSubmit(submit)} noValidate>
        <section className="space-y-5">
          <div>
            <p className="section-kicker">01 · Nội dung</p>
            <h2 className="mt-1 text-xl font-semibold">Bạn muốn duy trì điều gì?</h2>
          </div>
          <Input
            label="Tên thói quen"
            placeholder="Ví dụ: Học tiếng Anh"
            error={errors.name?.message}
            {...register('name', {
              required: 'Nhập tên thói quen.',
              minLength: { value: 2, message: 'Tên cần ít nhất 2 ký tự.' },
              maxLength: { value: 120, message: 'Tên không quá 120 ký tự.' },
            })}
          />
          <Textarea
            label="Mô tả (không bắt buộc)"
            placeholder="Một ghi chú ngắn về cách thực hiện"
            maxLength={1000}
            error={errors.description?.message}
            {...register('description')}
          />
        </section>

        <section className="quiet-rule space-y-5 pt-8">
          <div>
            <p className="section-kicker">02 · Mục tiêu</p>
            <h2 className="mt-1 text-xl font-semibold">Cách đo tiến độ</h2>
            {typeLocked && <p className="mt-2 text-sm text-ink-soft">Loại đo được giữ nguyên vì thói quen đã có lịch sử.</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Loại thói quen">
            {typeOptions.map((option) => {
              const disabled = typeLocked && detail.data?.type !== option.value
              return (
                <label
                  key={option.value}
                  className={clsx(
                    'rounded-surface border p-4 transition-colors',
                    disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer',
                    type === option.value ? 'border-moss bg-moss-wash' : 'border-line hover:border-line-strong',
                  )}
                >
                  <input type="radio" value={option.value} className="sr-only" disabled={disabled} {...register('type')} />
                  <span className="flex items-center justify-between font-semibold">
                    {option.title}
                    {type === option.value && <Check className="h-4 w-4 text-moss" aria-hidden="true" />}
                  </span>
                  <span className="mt-1 block text-sm text-ink-soft">{option.detail}</span>
                </label>
              )
            })}
          </div>

          {type !== 'BOOLEAN' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Mục tiêu"
                type="number"
                min={1}
                max={1000000}
                step="any"
                error={errors.targetValue?.message}
                {...register('targetValue', {
                  valueAsNumber: true,
                  required: 'Nhập mục tiêu.',
                  min: { value: 1, message: 'Mục tiêu phải lớn hơn 0.' },
                  max: { value: 1000000, message: 'Mục tiêu quá lớn.' },
                })}
              />
              <Input
                label="Đơn vị"
                maxLength={32}
                placeholder={type === 'DURATION' ? 'phút' : 'trang'}
                error={errors.unit?.message}
                {...register('unit', { required: 'Nhập đơn vị.' })}
              />
            </div>
          )}
        </section>

        <section className="quiet-rule space-y-5 pt-8">
          <div>
            <p className="section-kicker">03 · Lịch</p>
            <h2 className="mt-1 text-xl font-semibold">Khi nào thói quen xuất hiện?</h2>
          </div>
          <Select label="Tần suất" {...register('scheduleType')}>
            <option value="DAILY">Mỗi ngày</option>
            <option value="WEEKDAYS">Một số ngày trong tuần</option>
            <option value="TIMES_PER_WEEK">Số lần mỗi tuần</option>
            <option value="INTERVAL">Lặp theo khoảng ngày</option>
          </Select>

          {scheduleType === 'WEEKDAYS' && (
            <fieldset>
              <legend className="field-label">Chọn ngày</legend>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {weekdayOptions.map((day) => {
                  const checked = selectedWeekdays.includes(day.value)
                  return (
                    <button
                      key={day.value}
                      type="button"
                      className={clsx(
                        'min-h-11 rounded-control border text-sm font-semibold',
                        checked ? 'border-moss bg-moss text-white' : 'border-line-strong bg-paper-raised text-ink-soft',
                      )}
                      aria-pressed={checked}
                      onClick={() => setValue(
                        'weekdays',
                        checked
                          ? selectedWeekdays.filter((value) => value !== day.value)
                          : [...selectedWeekdays, day.value].sort(),
                        { shouldDirty: true },
                      )}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
              {errors.weekdays?.message && <p className="field-error" role="alert">{errors.weekdays.message}</p>}
            </fieldset>
          )}

          {scheduleType === 'TIMES_PER_WEEK' && (
            <Input
              label="Số lần mỗi tuần"
              type="number"
              min={1}
              max={7}
              error={errors.timesPerWeek?.message}
              {...register('timesPerWeek', {
                valueAsNumber: true,
                min: { value: 1, message: 'Ít nhất 1 lần.' },
                max: { value: 7, message: 'Tối đa 7 lần.' },
              })}
            />
          )}

          {scheduleType === 'INTERVAL' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Lặp lại mỗi (ngày)"
                type="number"
                min={2}
                max={30}
                error={errors.intervalDays?.message}
                {...register('intervalDays', {
                  valueAsNumber: true,
                  min: { value: 2, message: 'Khoảng lặp ít nhất 2 ngày.' },
                  max: { value: 30, message: 'Khoảng lặp tối đa 30 ngày.' },
                })}
              />
              <Input
                label="Bắt đầu từ"
                type="date"
                error={errors.scheduleStartDate?.message}
                {...register('scheduleStartDate', {
                  required: scheduleType === 'INTERVAL' ? 'Chọn ngày bắt đầu.' : false,
                })}
              />
            </div>
          )}

          <Input label="Giờ nhắc (không bắt buộc)" type="time" {...register('reminderTime')} />
        </section>

        <section className="quiet-rule space-y-4 pt-8">
          <div>
            <p className="section-kicker">04 · Dấu hiệu</p>
            <h2 className="mt-1 text-xl font-semibold">Màu nhận diện</h2>
          </div>
          <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Màu thói quen">
            {colorOptions.map((option) => (
              <label
                key={option.value}
                className={clsx(
                  'flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3 text-sm font-medium',
                  color === option.value ? 'border-ink' : 'border-line',
                )}
              >
                <input type="radio" value={option.value} className="sr-only" {...register('color')} />
                <span className={`h-3 w-3 rounded-full ${option.className}`} aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
        </section>

        {generalError && (
          <p className="rounded-control border border-danger bg-clay-wash p-4 text-sm text-danger" role="alert">
            {generalError}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:justify-end">
          <Button variant="secondary" type="button" onClick={() => navigate(editing && id ? `/habits/${id}` : '/habits')}>
            Hủy
          </Button>
          <Button type="submit" loading={save.isPending}>{editing ? 'Lưu thay đổi' : 'Tạo thói quen'}</Button>
        </div>
      </form>
    </>
  )
}
