import { eachDayOfInterval, format, parseISO } from 'date-fns'
import type { HabitEntry, HeatmapCell } from '../types'

type Cell = HabitEntry | HeatmapCell

function level(value: number, target: number) {
  if (value <= 0) return 'bg-paper-raised'
  const ratio = target > 0 ? value / target : 1
  if (ratio >= 1) return 'bg-moss'
  if (ratio >= 0.66) return 'bg-moss-strong'
  if (ratio >= 0.33) return 'bg-moss-mid'
  return 'bg-moss-wash'
}

export function HabitHeatmap({
  from,
  to,
  cells,
  target,
  unit,
}: {
  from: string
  to: string
  cells: Cell[]
  target: number
  unit?: string | null
}) {
  const valueMap = new Map(cells.map((cell) => [cell.date, cell]))
  const days = eachDayOfInterval({ start: parseISO(from), end: parseISO(to) })
  return (
    <div>
      <div className="overflow-x-auto pb-2" role="group" aria-label="Lịch sử tiến độ theo ngày">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
          {days.map((day) => {
            const date = format(day, 'yyyy-MM-dd')
            const cell = valueMap.get(date)
            const value = cell?.value ?? 0
            const cellTarget = 'target' in (cell ?? {}) ? (cell as HeatmapCell).target ?? target : target
            const dateText = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(day)
            return <div key={date} className={`h-4 w-4 rounded-[3px] border border-line ${level(value, cellTarget)}`} title={`${dateText}: ${value}/${cellTarget} ${unit || ''}`} aria-label={`${dateText}, ${value} trên ${cellTarget} ${unit || 'đơn vị'}`} role="img" />
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-xs text-ink-soft"><span>Ít</span><span className="h-3 w-3 rounded-[2px] border border-line bg-paper-raised" /><span className="h-3 w-3 rounded-[2px] bg-moss-wash" /><span className="h-3 w-3 rounded-[2px] bg-moss-mid" /><span className="h-3 w-3 rounded-[2px] bg-moss-strong" /><span className="h-3 w-3 rounded-[2px] bg-moss" /><span>Nhiều</span></div>
    </div>
  )
}
