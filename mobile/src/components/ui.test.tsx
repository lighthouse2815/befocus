import { fireEvent, render, screen } from '@testing-library/react-native'
import { InlineError, ProgressBar } from './ui'

describe('shared UI states', () => {
  it('exposes a bounded progress value to assistive technology', async () => {
    await render(<ProgressBar value={12} target={20} label="Đọc sách" />)
    expect(screen.getByRole('progressbar', { name: 'Đọc sách' })).toHaveAccessibilityValue({ min: 0, max: 100, now: 60 })
  })

  it('renders an actionable error state', async () => {
    const retry = jest.fn()
    await render(<InlineError message="Mất kết nối" onRetry={retry} />)
    expect(screen.getByRole('alert')).toBeTruthy()
    expect(screen.getByText('Mất kết nối')).toBeTruthy()
    await fireEvent.press(screen.getByRole('button', { name: 'Thử lại' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
