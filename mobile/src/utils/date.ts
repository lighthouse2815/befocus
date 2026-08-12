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
  return dateRangeEndingOn(toDateKeyInTimeZone(timezone, now), days)
}

export function addDaysToDateKey(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  const shifted = new Date(Date.UTC(year, month - 1, day + days, 12))
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
}

export function previousDateRange(range: { from: string; to: string }, days: number) {
  return {
    from: addDaysToDateKey(range.from, -Math.max(1, days)),
    to: addDaysToDateKey(range.from, -1),
  }
}

export function dateRangeEndingOn(to: string, days: number) {
  return { from: addDaysToDateKey(to, -Math.max(0, days - 1)), to }
}

export function weekToDateRange(to: string) {
  const weekday = isoWeekday(to) ?? 1
  return { from: addDaysToDateKey(to, -(weekday - 1)), to }
}

export function weekToDateRangeInTimeZone(timezone: string, now = new Date()) {
  return weekToDateRange(toDateKeyInTimeZone(timezone, now))
}

export function isoWeekday(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay()
  return weekday === 0 ? 7 : weekday
}

export function calendarDaysBetween(from: string, to: string) {
  const start = Date.parse(`${from}T12:00:00.000Z`)
  const end = Date.parse(`${to}T12:00:00.000Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.round((end - start) / 86_400_000)
}

/** Converts a wall-clock date/time in an IANA timezone to an absolute instant. */
export function dateTimeInTimeZone(dateKey: string, hour: number, minute: number, timezone: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  try {
    const desiredWallTime = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
    let candidate = desiredWallTime
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hourCycle: 'h23',
    })
    // Two passes handle offset transitions between the initial UTC guess and the target wall time.
    for (let pass = 0; pass < 2; pass += 1) {
      const parts = formatter.formatToParts(new Date(candidate))
      const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
      const actualWallTime = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
      candidate += desiredWallTime - actualWallTime
    }
    return new Date(candidate)
  } catch {
    return null
  }
}

export function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return value
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: 'short' }).format(new Date(year, month - 1, day))
}
