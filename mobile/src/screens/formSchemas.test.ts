import { loginSchema } from './LoginScreen'
import { registerSchema } from './RegisterScreen'
import { pomodoroSchema, profileSchema } from './SettingsScreen'

describe('mobile form validation', () => {
  it('rejects malformed authentication input', () => {
    expect(loginSchema.safeParse({ email: 'not-an-email', password: '' }).success).toBe(false)
    expect(registerSchema.safeParse({ name: 'An', email: 'an@example.com', password: 'short' }).success).toBe(false)
  })

  it('accepts profile and Pomodoro values only inside supported boundaries', () => {
    expect(profileSchema.safeParse({ name: 'An Nguyen', timezone: 'Asia/Ho_Chi_Minh' }).success).toBe(true)
    expect(profileSchema.safeParse({ name: 'An Nguyen', timezone: 'Not/A_Timezone' }).success).toBe(false)
    expect(pomodoroSchema.safeParse({ defaultFocusMinutes: '25', defaultBreakMinutes: '5', longBreakMinutes: '15', sessionsBeforeLongBreak: '4' }).success).toBe(true)
    expect(pomodoroSchema.safeParse({ defaultFocusMinutes: '0', defaultBreakMinutes: '121', longBreakMinutes: '15', sessionsBeforeLongBreak: '4' }).success).toBe(false)
  })
})
