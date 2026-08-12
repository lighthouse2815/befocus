import { format } from 'date-fns'

export function toLocalDateKey(date = new Date()) {
  return format(date, 'yyyy-MM-dd')
}

export function dateRange(days: number, now = new Date()) {
  const to = toLocalDateKey(now)
  const fromDate = new Date(now)
  fromDate.setDate(fromDate.getDate() - Math.max(0, days - 1))
  return { from: toLocalDateKey(fromDate), to }
}

export function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(year, month - 1, day))
}
