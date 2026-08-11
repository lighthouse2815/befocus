import { expect, test } from '@playwright/test'

test('registers, creates a project task, completes linked focus, and sees analytics', async ({ page }) => {
  const suffix = Date.now()
  const projectName = `E2E project ${suffix}`

  await page.goto('/register')
  await page.getByLabel('Họ và tên').fill('E2E Focus User')
  await page.getByLabel('Email').fill(`e2e.${suffix}@example.test`)
  await page.getByLabel('Mật khẩu').fill('FocusFlow2026!')
  await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
  await expect(page.getByRole('heading', { name: 'Điều cần lặp lại' })).toBeVisible()

  await page.getByRole('link', { name: 'Dự án', exact: true }).click()
  await page.getByRole('button', { name: 'Tạo dự án' }).first().click()
  await page.getByPlaceholder('Ví dụ: Luận văn tốt nghiệp').fill(projectName)
  await page.getByRole('button', { name: 'Tạo dự án' }).last().click()
  await expect(page.getByRole('link', { name: new RegExp(projectName) })).toBeVisible()
  await page.getByRole('link', { name: new RegExp(projectName) }).click()

  await page.getByPlaceholder('Ví dụ: Viết phần phương pháp').fill('E2E task')
  await page.getByRole('button', { name: 'Thêm việc' }).click()
  await expect(page.getByText('E2E task', { exact: true })).toBeVisible()

  await page.getByRole('link', { name: 'Tập trung', exact: true }).click()
  await page.getByLabel('Dự án (không bắt buộc)').selectOption({ label: projectName })
  await page.getByLabel('Việc đang mở (không bắt buộc)').selectOption({ label: 'E2E task' })
  await page.getByLabel('Thời lượng tùy chỉnh').fill('1')
  await page.getByRole('button', { name: 'Bắt đầu tập trung' }).click()
  await expect(page.getByRole('timer')).toBeVisible()
  await page.waitForTimeout(1_500)
  await page.getByRole('button', { name: 'Kết thúc & ghi nhận' }).click()
  await expect(page.getByText('Đã ghi nhận 1 phút tập trung.')).toBeVisible()

  await page.getByRole('link', { name: 'Phân tích', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Phân tích nhịp làm việc' })).toBeVisible()
  await expect(page.getByText('E2E project', { exact: false })).toBeVisible()

  await page.getByRole('link', { name: 'Cài đặt', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Cài đặt' })).toBeVisible()
})
