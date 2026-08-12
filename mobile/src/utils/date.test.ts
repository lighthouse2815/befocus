import { addDaysToDateKey, dateRangeEndingOn, dateRangeInTimeZone, dateTimeInTimeZone, previousDateRange, toDateKeyInTimeZone, weekToDateRange, weekToDateRangeInTimeZone } from './date'

describe('user timezone date keys', () => {
  it('uses the user timezone at the UTC day boundary', () => {
    const instant = new Date('2026-08-12T17:30:00.000Z')
    expect(toDateKeyInTimeZone('Asia/Ho_Chi_Minh', instant)).toBe('2026-08-13')
    expect(toDateKeyInTimeZone('UTC', instant)).toBe('2026-08-12')
  })

  it('returns an inclusive date range in the requested timezone', () => {
    const range = dateRangeInTimeZone(7, 'Asia/Ho_Chi_Minh', new Date('2026-08-12T17:30:00.000Z'))
    expect(range).toEqual({ from: '2026-08-07', to: '2026-08-13' })
  })

  it('changes the calendar day exactly at local midnight', () => {
    expect(toDateKeyInTimeZone('Asia/Ho_Chi_Minh', new Date('2026-08-12T16:59:59.999Z'))).toBe('2026-08-12')
    expect(toDateKeyInTimeZone('Asia/Ho_Chi_Minh', new Date('2026-08-12T17:00:00.000Z'))).toBe('2026-08-13')
  })

  it('derives week-to-date and previous comparison ranges with calendar math', () => {
    const now = new Date('2026-08-12T17:30:00.000Z') // Thursday in Ho Chi Minh City
    expect(weekToDateRangeInTimeZone('Asia/Ho_Chi_Minh', now)).toEqual({ from: '2026-08-10', to: '2026-08-13' })
    expect(weekToDateRange('2026-08-13')).toEqual({ from: '2026-08-10', to: '2026-08-13' })
    expect(dateRangeEndingOn('2026-08-13', 7)).toEqual({ from: '2026-08-07', to: '2026-08-13' })
    expect(previousDateRange({ from: '2026-08-07', to: '2026-08-13' }, 7)).toEqual({ from: '2026-07-31', to: '2026-08-06' })
    expect(addDaysToDateKey('2024-02-28', 1)).toBe('2024-02-29')
  })

  it('converts wall time to an absolute instant across fixed and DST offsets', () => {
    expect(dateTimeInTimeZone('2026-08-13', 20, 0, 'Asia/Ho_Chi_Minh')?.toISOString()).toBe('2026-08-13T13:00:00.000Z')
    expect(dateTimeInTimeZone('2026-03-08', 9, 0, 'America/New_York')?.toISOString()).toBe('2026-03-08T13:00:00.000Z')
    expect(dateTimeInTimeZone('2026-11-01', 9, 0, 'America/New_York')?.toISOString()).toBe('2026-11-01T14:00:00.000Z')
  })
})
