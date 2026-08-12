import Ionicons from '@expo/vector-icons/Ionicons'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { AppHeader } from '@/components/AppHeader'
import { ProjectEditor } from '@/components/ProjectEditor'
import { Button, EmptyState, InlineError, SectionHeader, Surface } from '@/components/ui'
import { colors, iconSizes, radii, spacing, touchTarget, typography } from '@/constants/theme'
import { Screen } from '@/layouts/Screen'
import { getApiError } from '@/services/apiClient'
import { projectKeys, projectService } from '@/services/projectService'
import type { ProjectPayload } from '@/types'

const markerColors: Record<string, string> = { moss: colors.moss, clay: colors.clay, amber: colors.amber, ocean: colors.ocean, plum: colors.plum, ink: colors.ink }

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `${hours}g ${rest}p` : `${hours} giờ`
}

export function ProjectsScreen() {
  const [creating, setCreating] = useState(false)
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: projectKeys.list, queryFn: projectService.list })
  const create = useMutation({
    mutationFn: (payload: ProjectPayload) => projectService.create(payload),
    onSuccess: async (project) => {
      await queryClient.invalidateQueries({ queryKey: projectKeys.all })
      setCreating(false)
      router.push({ pathname: '/projects/[id]', params: { id: project.id } })
    },
  })
  const active = (query.data ?? []).filter((project) => !project.archived)

  return (
    <Screen refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={colors.moss} />}>
      <AppHeader />
      <View style={styles.titleRow}>
        <View style={styles.intro}><Text style={styles.eyebrow}>Không gian làm việc</Text><Text style={styles.title}>Dự án</Text><Text style={styles.subtitle}>Gom công việc và thời gian tập trung vào một dòng tiến độ rõ ràng.</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tạo dự án" onPress={() => setCreating(true)} style={({ pressed }) => [styles.add, pressed ? styles.pressed : null]}><Ionicons name="add" size={iconSizes.feature} color={colors.white} /></Pressable>
      </View>

      {creating ? <Surface style={styles.editor}><SectionHeader eyebrow="Dự án mới" title="Bạn muốn tiến triển điều gì?" /><ProjectEditor submitLabel="Tạo dự án" loading={create.isPending} onCancel={() => setCreating(false)} onSubmit={(payload) => create.mutate(payload)} />{create.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(create.error, 'Không thể tạo dự án.')}</Text> : null}</Surface> : null}

      {query.error ? <InlineError message={getApiError(query.error)} onRetry={() => void query.refetch()} /> : active.length ? (
        <View style={styles.section}>
          <SectionHeader eyebrow="Đang mở" title="Nhịp làm việc" action={<Text style={styles.count}>{active.length}</Text>} />
          <Surface style={styles.list}>
            {active.map((project, index) => (
              <Pressable key={project.id} accessibilityRole="link" onPress={() => router.push({ pathname: '/projects/[id]', params: { id: project.id } })} style={({ pressed }) => [styles.row, index > 0 ? styles.rule : null, pressed ? styles.pressed : null]}>
                <View style={[styles.marker, { backgroundColor: markerColors[project.color ?? 'ink'] ?? colors.ink }]} />
                <View style={styles.copy}><Text style={styles.projectName}>{project.name}</Text><Text numberOfLines={2} style={styles.projectDescription}>{project.description || 'Một vùng rõ ràng cho những việc cần tiến triển.'}</Text><Text style={styles.projectMeta}>{minutesLabel(project.totalFocusMinutes)} tập trung · {project.completedTasks} việc xong</Text></View>
                <Ionicons name="chevron-forward" size={iconSizes.inline} color={colors.inkSoft} />
              </Pressable>
            ))}
          </Surface>
        </View>
      ) : (
        <EmptyState title="Chưa có dự án" description="Tạo một dự án nhỏ cho điều bạn muốn tiến triển trong tuần này." action={<Button label="Tạo dự án đầu tiên" onPress={() => setCreating(true)} />} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.x4 },
  intro: { flex: 1, gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.x1 },
  add: { width: touchTarget, height: touchTarget, borderRadius: radii.control, backgroundColor: colors.moss, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.72 },
  editor: { gap: spacing.x4 },
  error: { ...typography.small, color: colors.danger },
  section: { gap: spacing.x4 },
  count: { ...typography.data, color: colors.inkSoft },
  list: { paddingVertical: 0 },
  row: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: spacing.x3, paddingVertical: spacing.x3 },
  rule: { borderTopWidth: 1, borderTopColor: colors.line },
  marker: { width: 10, height: 44, borderRadius: radii.control },
  copy: { flex: 1 },
  projectName: { ...typography.subheading, color: colors.ink },
  projectDescription: { ...typography.small, color: colors.inkSoft },
  projectMeta: { ...typography.data, fontSize: 12, color: colors.inkSoft, marginTop: spacing.x1 },
})
