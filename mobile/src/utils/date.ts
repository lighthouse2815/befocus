import { format } from 'date-fns'

export function toLocalDateKey(date = new Date()) {
  return format(date, 'yyyy-MM-dd')
}

export function toDateKeyInTimeZone(timezone: string, date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const year = parts.find((part) => part.type === 'year')?.value
    const month = parts.find((part) => part.type === 'month')?.value
    const day = parts.find((part) => part.type === 'day')?.value
    return year && month && day ? `${year}-${month}-${day}` : toLocalDateKey(date)
  } catch {
    return toLocalDateKey(date)
  }
}

export function dateRange(days: number, now = new Date()) {
  const to = toLocalDateKey(now)
  const fromDate = new Date(now)
  fromDate.setDate(fromDate.getDate() - Math.max(0, days - 1))
  return { from: toLocalDateKey(fromDate), to }
}

export function dateRangeInTimeZone(days: number, timezone: string, now = new Date()) {
  const to = toDateKeyInTimeZone(timezone, now)
  const fromDate = new Date(now)
  fromDate.setUTCDate(fromDate.getUTCDate() - Math.max(0, days - 1))
  return { from: toDateKeyInTimeZone(timezone, fromDate), to }
}

export function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(year, month - 1, day))
}
