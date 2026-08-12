import { dateRangeInTimeZone, toDateKeyInTimeZone } from './date'

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
})
