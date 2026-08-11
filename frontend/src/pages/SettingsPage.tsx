import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Save } from 'lucide-react'
import { useToast } from '../components/Toast'
import { Button, ErrorState, Input, LoadingBlock, PageHeader, Select } from '../components/ui'
import { getApiError } from '../services/api'
import { settingsService } from '../services/settings'
import type { Settings } from '../types'

const defaults: Settings = { defaultFocusMinutes: 25, defaultBreakMinutes: 5, longBreakMinutes: 15, sessionsBeforeLongBreak: 4, timezone: 'Asia/Ho_Chi_Minh', notificationsEnabled: false, browserNotifications: false, inAppNotifications: true, theme: 'SYSTEM' }

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const query = useQuery({ queryKey: ['settings'], queryFn: settingsService.get })
  const [form, setForm] = useState<Settings>(defaults)
  useEffect(() => { if (query.data) setForm({ ...defaults, ...query.data }) }, [query.data])
  const update = useMutation({
    mutationFn: () => settingsService.update(form),
    onSuccess: (data) => { setForm({ ...defaults, ...data }); void queryClient.invalidateQueries({ queryKey: ['settings'] }); notify('Đã lưu cài đặt.', 'success') },
    onError: (error) => notify(getApiError(error, 'Không thể lưu cài đặt.'), 'error'),
  })
  if (query.isPending) return <LoadingBlock rows={7} label="Đang tải cài đặt" />
  if (query.isError) return <ErrorState message={getApiError(query.error, 'Không thể tải cài đặt.')} onRetry={() => void query.refetch()} />
  const submit = (event: FormEvent) => { event.preventDefault(); update.mutate() }
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) => setForm((current) => ({ ...current, [key]: value }))
  return <div><PageHeader eyebrow="Không gian cá nhân" title="Cài đặt" description="Chọn nhịp mặc định để ứng dụng phục vụ cách bạn làm việc, không ngược lại." /><form onSubmit={submit} className="max-w-3xl space-y-10"><section aria-labelledby="timer-settings-title"><div className="mb-5"><p className="section-kicker">Timer</p><h2 id="timer-settings-title" className="mt-1 text-xl font-semibold">Nhịp nghỉ và tập trung</h2></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Tập trung mặc định (phút)" type="number" min={1} max={240} value={form.defaultFocusMinutes} onChange={(event) => change('defaultFocusMinutes', Number(event.target.value))} /><Input label="Nghỉ ngắn (phút)" type="number" min={1} max={120} value={form.defaultBreakMinutes} onChange={(event) => change('defaultBreakMinutes', Number(event.target.value))} /><Input label="Nghỉ dài (phút)" type="number" min={1} max={120} value={form.longBreakMinutes} onChange={(event) => change('longBreakMinutes', Number(event.target.value))} /><Input label="Số phiên trước nghỉ dài" type="number" min={1} max={12} value={form.sessionsBeforeLongBreak} onChange={(event) => change('sessionsBeforeLongBreak', Number(event.target.value))} /></div></section><section aria-labelledby="locale-settings-title"><div className="mb-5"><p className="section-kicker">Bối cảnh</p><h2 id="locale-settings-title" className="mt-1 text-xl font-semibold">Múi giờ và giao diện</h2></div><div className="grid gap-4 sm:grid-cols-2"><Input label="Múi giờ IANA" value={form.timezone} onChange={(event) => change('timezone', event.target.value)} hint="Ví dụ: Asia/Ho_Chi_Minh" /><Select label="Giao diện" value={form.theme.toUpperCase()} onChange={(event) => change('theme', event.target.value as Settings['theme'])}><option value="SYSTEM">Theo hệ thống</option><option value="LIGHT">Sáng</option><option value="DARK">Tối</option></Select></div></section><section aria-labelledby="notifications-title"><div className="mb-5 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-control bg-moss-wash text-moss-dark"><Bell className="h-5 w-5" aria-hidden="true" /></span><div><p className="section-kicker">Thông báo</p><h2 id="notifications-title" className="mt-1 text-xl font-semibold">Giữ tín hiệu vừa đủ</h2><p className="mt-1 text-sm text-ink-soft">Bạn có thể tắt toàn bộ bất cứ lúc nào.</p></div></div><div className="space-y-3">{([['notificationsEnabled', 'Cho phép thông báo'], ['browserNotifications', 'Thông báo trên trình duyệt'], ['inAppNotifications', 'Thông báo trong ứng dụng']] as const).map(([key, label]) => <label key={key} className="flex min-h-12 items-center gap-3 rounded-control border border-line px-4 hover:bg-paper-raised"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => change(key, event.target.checked)} className="h-4 w-4 accent-moss" /><span className="text-sm font-medium">{label}</span></label>)}</div></section><div className="flex justify-end border-t border-line pt-5"><Button type="submit" loading={update.isPending}><Save className="h-4 w-4" aria-hidden="true" />Lưu cài đặt</Button></div></form></div>
}
