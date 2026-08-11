import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FolderKanban, Plus, ArrowUpRight } from 'lucide-react'
import { Dialog } from '../components/Dialog'
import { useToast } from '../components/Toast'
import { Button, EmptyState, ErrorState, Input, LoadingBlock, PageHeader, Select, Textarea } from '../components/ui'
import { getApiError } from '../services/api'
import { projectKeys, projectsService } from '../services/projects'
import type { HabitColor } from '../types'
import { habitColorClass } from '../utils/habits'
import { Link } from 'react-router-dom'

const colors: Array<{ value: HabitColor; label: string }> = [
  { value: 'moss', label: 'Rêu' },
  { value: 'clay', label: 'Đất nung' },
  { value: 'amber', label: 'Hổ phách' },
  { value: 'ocean', label: 'Biển' },
  { value: 'plum', label: 'Mận' },
  { value: 'ink', label: 'Mực' },
]

function minutesLabel(minutes = 0) {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}g ${remainder}p` : `${hours} giờ`
}

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const { notify } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<HabitColor>('moss')

  const projectsQuery = useQuery({ queryKey: projectKeys.list, queryFn: projectsService.list })
  const create = useMutation({
    mutationFn: () => projectsService.create({ name, description, color }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: projectKeys.all })
      setName('')
      setDescription('')
      setColor('moss')
      setOpen(false)
      notify('Đã tạo dự án mới.', 'success')
    },
    onError: (error) => notify(getApiError(error, 'Không thể tạo dự án.'), 'error'),
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    create.mutate()
  }

  return (
    <div>
      <PageHeader
        eyebrow="Không gian làm việc"
        title="Dự án & việc"
        description="Giữ những việc đang làm ở đúng chỗ, rồi để từng phiên tập trung tạo thành tiến độ có thể nhìn thấy."
        action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" />Tạo dự án</Button>}
      />

      {projectsQuery.isPending ? <LoadingBlock rows={4} label="Đang tải dự án" /> : projectsQuery.isError ? (
        <ErrorState message={getApiError(projectsQuery.error, 'Không thể tải dự án.')} onRetry={() => void projectsQuery.refetch()} />
      ) : projectsQuery.data.length === 0 ? (
        <EmptyState title="Chưa có dự án nào" description="Tạo một dự án nhỏ cho điều bạn muốn tiến triển trong tuần này." actionLabel="Tạo dự án" onAction={() => setOpen(true)} />
      ) : (
        <section aria-labelledby="projects-list-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="section-kicker">Đang mở</p>
              <h2 id="projects-list-title" className="mt-1 text-xl font-semibold">Nhịp làm việc của bạn</h2>
            </div>
            <span className="text-sm text-ink-soft">{projectsQuery.data.length} dự án</span>
          </div>
          <div className="divide-y divide-line border-y border-line">
            {projectsQuery.data.map((project) => (
              <Link key={project.id} to={`/projects/${project.id}`} className="group grid gap-4 py-5 transition-colors hover:bg-paper-raised sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
                <div className="flex min-w-0 items-start gap-4">
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${habitColorClass((project.color ?? 'ink') as HabitColor)}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-lg font-semibold">{project.name}</h3>
                      {project.icon && <span className="text-base" aria-label="Biểu tượng dự án">{project.icon}</span>}
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{project.description || 'Một vùng rõ ràng cho những việc cần tiến triển.'}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-5 sm:justify-end">
                  <div className="flex gap-5 text-sm">
                    <span><strong className="font-mono">{minutesLabel(project.totalFocusMinutes)}</strong><span className="ml-1 text-ink-soft">tập trung</span></span>
                    <span><strong className="font-mono">{project.completedTasks ?? 0}</strong><span className="ml-1 text-ink-soft">việc xong</span></span>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-ink-faint transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Tạo dự án" description="Một tên đủ rõ sẽ giúp bạn quay lại đúng việc nhanh hơn.">
        <form className="space-y-4" onSubmit={submit}>
          <Input label="Tên dự án" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} autoFocus required placeholder="Ví dụ: Luận văn tốt nghiệp" />
          <Textarea label="Mô tả (không bắt buộc)" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={1000} placeholder="Bạn muốn dự án này tiến triển theo hướng nào?" />
          <Select label="Màu đánh dấu" value={color} onChange={(event) => setColor(event.target.value as HabitColor)}>
            {colors.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Để sau</Button>
            <Button type="submit" loading={create.isPending}><FolderKanban className="h-4 w-4" aria-hidden="true" />Tạo dự án</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
