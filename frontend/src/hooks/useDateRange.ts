import { useMemo, useState } from 'react'
import { addDays, format, subDays } from 'date-fns'
import type { DateRange } from '../types'

export type RangePreset = 'today' | '7d' | '30d' | 'custom'

export function useDateRange(defaultPreset: Exclude<RangePreset, 'custom'> = '7d') {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [preset, setPreset] = useState<RangePreset>(defaultPreset)
  const [custom, setCustom] = useState<DateRange>({ from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today })
  const range = useMemo<DateRange>(() => {
    if (preset === 'today') return { from: today, to: today }
    if (preset === '30d') return { from: format(subDays(new Date(), 29), 'yyyy-MM-dd'), to: today }
    if (preset === 'custom') return custom
    return { from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today }
  }, [custom, preset, today])
  const setCustomFrom = (from: string) => setCustom((current) => ({ ...current, from }))
  const setCustomTo = (to: string) => setCustom((current) => ({ ...current, to }))
  return { preset, setPreset, range, custom, setCustomFrom, setCustomTo }
}

export function isoToday() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function dateLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`)
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(parsed)
}

export function weekDates(end = new Date()) {
  return Array.from({ length: 7 }, (_, index) => format(addDays(end, index - 6), 'yyyy-MM-dd'))
}
