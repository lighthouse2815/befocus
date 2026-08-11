import { useMemo } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { ErrorState, Input, LoadingBlock, PageHeader, ProgressBar, Select, Stat } from '../components/ui'
import { getApiError } from '../services/api'
import { analyticsKeys, analyticsService } from '../services/analytics'
import { useDateRange } from '../hooks/useDateRange'

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}g ${remainder}p` : `${hours} giờ`
}

export function AnalyticsPage() {
  const { preset, setPreset, range, custom, setCustomFrom, setCustomTo } = useDateRange('30d')
  const focusQuery = useQuery({ queryKey: analyticsKeys.focus(range), queryFn: () => analyticsService.focus(range) })
  const habitQuery = useQuery({ queryKey: analyticsKeys.habits(range), queryFn: () => analyticsService.habits(range) })
  const maxDaily = useMemo(() => Math.max(1, ...(habitQuery.data?.heatmap ?? []).map((cell) => cell.value)), [habitQuery.data?.heatmap])

  if (focusQuery.isPending || habitQuery.isPending) return <LoadingBlock rows={8} label="Đang tính nhịp của bạn" />
  if (focusQuery.isError) return <ErrorState message={getApiError(focusQuery.error, 'Không thể tải phân tích tập trung.')} onRetry={() => void focusQuery.refetch()} />
  if (habitQuery.isError) return <ErrorState message={getApiError(habitQuery.error, 'Không thể tải phân tích thói quen.')} onRetry={() => void habitQuery.refetch()} />
  const focus = focusQuery.data
  const habits = habitQuery.data

  return (
    <div>
      <PageHeader eyebrow="Nhìn lại có chủ đích" title="Phân tích nhịp làm việc" description="Dữ liệu thật từ các phiên tập trung và lần hoàn thành thói quen, trong khoảng bạn chọn." action={<div className="flex flex-wrap items-end justify-end gap-3"><Select label="Khoảng thời gian" value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}><option value="7d">7 ngày</option><option value="30d">30 ngày</option><option value="today">Hôm nay</option><option value="custom">Tuỳ chọn</option></Select>{preset === 'custom' && <><Input label="Từ ngày" type="date" value={custom.from} onChange={(event) => setCustomFrom(event.target.value)} /><Input label="Đến ngày" type="date" value={custom.to} onChange={(event) => setCustomTo(event.target.value)} /></>}</div>} />
      <p className="mb-6 text-sm text-ink-soft">{range.from} → {range.to}</p>

      <section className="grid gap-5 border-b border-line pb-7 sm:grid-cols-2 lg:grid-cols-4" aria-label="Tổng quan phân tích">
        <Stat label="Tập trung" value={minutesLabel(focus.totalMinutes)} detail={`${focus.completedSessions} phiên hoàn thành`} />
        <Stat label="Trung bình phiên" value={`${focus.averageSessionMinutes}p`} detail={`${focus.completionRate.toFixed(0)}% tỷ lệ hoàn thành`} />
        <Stat label="Thói quen" value={`${habits.completionRate.toFixed(0)}%`} detail={`${habits.currentStreak} ngày streak hiện tại`} />
        <Stat label="Gián đoạn" value={typeof focus.interruptions === 'number' ? focus.interruptions : focus.interruptions.length} detail="Trong các phiên đã chọn" />
      </section>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <section aria-labelledby="focus-breakdown-title"><div className="mb-4 flex items-end justify-between gap-4"><div><p className="section-kicker">Tập trung</p><h2 id="focus-breakdown-title" className="mt-1 text-xl font-semibold">Bạn dành thời gian cho đâu?</h2></div><BarChart3 className="h-5 w-5 text-moss" aria-hidden="true" /></div><Breakdown title="Dự án" items={focus.byProject} /><Breakdown title="Thói quen" items={focus.byHabit} /></section>
        <aside className="space-y-9"><section aria-labelledby="insights-title"><div className="mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5 text-moss" aria-hidden="true" /><div><p className="section-kicker">Gợi ý</p><h2 id="insights-title" className="mt-1 text-xl font-semibold">Điều đáng chú ý</h2></div></div>{(focus.insights ?? []).length ? <ul className="space-y-3">{(focus.insights ?? []).map((insight) => <li key={insight} className="border-l-2 border-moss pl-4 text-sm text-ink-soft">{insight}</li>)}</ul> : <p className="text-sm text-ink-soft">Chưa đủ dữ liệu để rút ra một gợi ý riêng.</p>}</section><section aria-labelledby="habit-progress-title"><div className="mb-4"><p className="section-kicker">Tính đều</p><h2 id="habit-progress-title" className="mt-1 text-xl font-semibold">Tiến độ theo ngày</h2></div><div className="space-y-2">{habits.heatmap.slice(-7).map((cell) => <div key={cell.date} className="grid grid-cols-[70px_minmax(0,1fr)_32px] items-center gap-3 text-xs"><time className="text-ink-soft" dateTime={cell.date}>{new Date(`${cell.date}T00:00:00`).toLocaleDateString('vi-VN', { weekday: 'short' })}</time><ProgressBar value={cell.value} max={maxDaily} label={`Tiến độ ${cell.date}`} /><span className="font-mono text-right">{cell.value}</span></div>)}</div></section><section aria-labelledby="habit-weekly-title"><div className="mb-4"><p className="section-kicker">Nhịp tuần</p><h2 id="habit-weekly-title" className="mt-1 text-xl font-semibold">Tiến độ theo tuần</h2></div>{(habits.weeklyProgress ?? []).length ? <ul className="space-y-3">{(habits.weeklyProgress ?? []).map((week) => <li key={week.week} className="flex items-center justify-between gap-4 border-b border-line pb-3 text-sm"><span className="text-ink-soft">Tuần từ {week.week}</span><span className="font-mono">{week.completed} / {week.total} <span className="font-sans text-xs text-ink-soft">({(week.rate ?? 0).toFixed(0)}%)</span></span></li>)}</ul> : <p className="text-sm text-ink-soft">Chưa có tuần nào trong khoảng này.</p>}</section></aside>
      </div>
    </div>
  )
}

function Breakdown({ title, items }: { title: string; items: Array<{ label?: string; minutes?: number; count?: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.minutes ?? 0))
  return <section className="mb-8"><h3 className="mb-3 text-sm font-semibold text-ink-soft">{title}</h3>{items.length ? <ul className="divide-y divide-line border-y border-line">{items.slice(0, 6).map((item) => <li key={item.label} className="grid grid-cols-[minmax(0,1fr)_52px] gap-4 py-3"><div><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate">{item.label}</span><span className="font-mono text-xs text-ink-soft">{item.minutes ?? 0}p</span></div><ProgressBar value={item.minutes ?? 0} max={max} label={`${item.label ?? title} ${item.minutes ?? 0} phút`} /></div><span className="self-center text-right text-xs text-ink-soft">{item.count ?? 0} phiên</span></li>)}</ul> : <p className="border-y border-line py-5 text-sm text-ink-soft">Chưa có dữ liệu trong khoảng này.</p>}</section>
}
