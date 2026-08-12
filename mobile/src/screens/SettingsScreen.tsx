import { zodResolver } from '@hookform/resolvers/zod'
import React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Linking, Platform, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native'
import { z } from 'zod'
import { ChoiceField } from '@/components/ChoiceField'
import { RouteHeader } from '@/components/RouteHeader'
import { Button, InlineError, LoadingBlock, SectionHeader, Surface, TextField } from '@/components/ui'
import { colors, spacing, typography } from '@/constants/theme'
import { Screen } from '@/layouts/Screen'
import { getApiError } from '@/services/apiClient'
import { authService } from '@/services/authService'
import { notificationService, type LocalNotificationPermission } from '@/services/notificationService'
import { settingsKeys, settingsService } from '@/services/settingsService'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/store/authStore'
import { useTimerStore } from '@/store/timerStore'
import type { NotificationPreference, Settings, User } from '@/types'

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Tên cần ít nhất 2 ký tự.').max(80, 'Tên tối đa 80 ký tự.'),
  timezone: z.string().trim().min(1, 'Hãy chọn múi giờ.'),
})

export const pomodoroSchema = z.object({
  defaultFocusMinutes: z.string().regex(/^\d+$/, 'Từ 1 đến 240 phút.').refine((value) => Number(value) >= 1 && Number(value) <= 240, 'Từ 1 đến 240 phút.'),
  defaultBreakMinutes: z.string().regex(/^\d+$/, 'Từ 1 đến 120 phút.').refine((value) => Number(value) >= 1 && Number(value) <= 120, 'Từ 1 đến 120 phút.'),
  longBreakMinutes: z.string().regex(/^\d+$/, 'Từ 1 đến 120 phút.').refine((value) => Number(value) >= 1 && Number(value) <= 120, 'Từ 1 đến 120 phút.'),
  sessionsBeforeLongBreak: z.string().regex(/^\d+$/, 'Từ 1 đến 12 phiên.').refine((value) => Number(value) >= 1 && Number(value) <= 12, 'Từ 1 đến 12 phiên.'),
})

type ProfileFields = z.infer<typeof profileSchema>
type PomodoroFields = z.infer<typeof pomodoroSchema>

const baseTimezones = [
  'Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Tokyo', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'UTC',
]

function ProfileForm({ user }: { user: User }) {
  const setUser = useAuthStore((state) => state.setUser)
  const form = useForm<ProfileFields>({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, timezone: user.timezone } })
  const mutation = useMutation({
    mutationFn: userService.update,
    onSuccess: async (updated) => {
      await setUser(updated)
      form.reset({ name: updated.name, timezone: updated.timezone })
    },
  })
  const timezones = Array.from(new Set([user.timezone, ...baseTimezones])).map((value) => ({ value, label: value.replaceAll('_', ' ') }))
  return (
    <Surface style={styles.formSurface}>
      <SectionHeader eyebrow="Tài khoản" title="Hồ sơ" />
      <Controller control={form.control} name="name" render={({ field, fieldState }) => <TextField label="Tên hiển thị" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} autoCapitalize="words" error={fieldState.error?.message} />} />
      <Controller control={form.control} name="timezone" render={({ field, fieldState }) => <View style={styles.field}><ChoiceField label="Múi giờ" value={field.value} options={timezones} placeholder="Chọn múi giờ" onChange={field.onChange} />{fieldState.error ? <Text accessibilityRole="alert" style={styles.error}>{fieldState.error.message}</Text> : null}</View>} />
      {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(mutation.error, 'Không thể lưu hồ sơ.')}</Text> : null}
      {mutation.isSuccess && !form.formState.isDirty ? <Text accessibilityLiveRegion="polite" style={styles.success}>Đã lưu hồ sơ.</Text> : null}
      <Button label="Lưu hồ sơ" loading={mutation.isPending} disabled={!form.formState.isDirty} onPress={form.handleSubmit((values) => mutation.mutate(values))} />
    </Surface>
  )
}

function PomodoroForm({ settings }: { settings: Settings }) {
  const queryClient = useQueryClient()
  const compact = useWindowDimensions().width < 380
  const form = useForm<PomodoroFields>({
    resolver: zodResolver(pomodoroSchema),
    defaultValues: {
      defaultFocusMinutes: String(settings.defaultFocusMinutes),
      defaultBreakMinutes: String(settings.defaultBreakMinutes),
      longBreakMinutes: String(settings.longBreakMinutes),
      sessionsBeforeLongBreak: String(settings.sessionsBeforeLongBreak),
    },
  })
  const mutation = useMutation({
    mutationFn: (values: PomodoroFields) => settingsService.update({
      ...settings,
      defaultFocusMinutes: Number(values.defaultFocusMinutes),
      defaultBreakMinutes: Number(values.defaultBreakMinutes),
      longBreakMinutes: Number(values.longBreakMinutes),
      sessionsBeforeLongBreak: Number(values.sessionsBeforeLongBreak),
    }),
    onSuccess: (updated) => {
      queryClient.setQueryData(settingsKeys.settings, updated)
      form.reset({
        defaultFocusMinutes: String(updated.defaultFocusMinutes),
        defaultBreakMinutes: String(updated.defaultBreakMinutes),
        longBreakMinutes: String(updated.longBreakMinutes),
        sessionsBeforeLongBreak: String(updated.sessionsBeforeLongBreak),
      })
    },
  })
  return (
    <Surface style={styles.formSurface}>
      <SectionHeader eyebrow="Nhịp mặc định" title="Pomodoro" />
      <View style={[styles.twoColumns, compact ? styles.stackedColumns : null]}>
        <Controller control={form.control} name="defaultFocusMinutes" render={({ field, fieldState }) => <TextField containerStyle={[styles.column, compact ? styles.fullColumn : null]} label="Tập trung (phút)" value={String(field.value)} onBlur={field.onBlur} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />} />
        <Controller control={form.control} name="defaultBreakMinutes" render={({ field, fieldState }) => <TextField containerStyle={[styles.column, compact ? styles.fullColumn : null]} label="Nghỉ ngắn (phút)" value={String(field.value)} onBlur={field.onBlur} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />} />
      </View>
      <View style={[styles.twoColumns, compact ? styles.stackedColumns : null]}>
        <Controller control={form.control} name="longBreakMinutes" render={({ field, fieldState }) => <TextField containerStyle={[styles.column, compact ? styles.fullColumn : null]} label="Nghỉ dài (phút)" value={String(field.value)} onBlur={field.onBlur} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />} />
        <Controller control={form.control} name="sessionsBeforeLongBreak" render={({ field, fieldState }) => <TextField containerStyle={[styles.column, compact ? styles.fullColumn : null]} label="Phiên trước nghỉ dài" value={String(field.value)} onBlur={field.onBlur} onChangeText={field.onChange} keyboardType="number-pad" error={fieldState.error?.message} />} />
      </View>
      {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(mutation.error, 'Không thể lưu nhịp Pomodoro.')}</Text> : null}
      {mutation.isSuccess && !form.formState.isDirty ? <Text accessibilityLiveRegion="polite" style={styles.success}>Đã lưu nhịp mặc định.</Text> : null}
      <Button label="Lưu nhịp mặc định" loading={mutation.isPending} disabled={!form.formState.isDirty} onPress={form.handleSubmit((values) => mutation.mutate(values))} />
    </Surface>
  )
}

function ToggleRow({ label, description, value, disabled, onChange }: { label: string; description: string; value: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}><Text style={styles.toggleLabel}>{label}</Text><Text style={styles.toggleDescription}>{description}</Text></View>
      <Switch accessibilityLabel={label} value={value} disabled={disabled} onValueChange={onChange} trackColor={{ false: colors.lineStrong, true: colors.moss }} thumbColor={colors.white} />
    </View>
  )
}

function NotificationsForm({ settings, preferences }: { settings: Settings; preferences: NotificationPreference }) {
  const queryClient = useQueryClient()
  const [permission, setPermission] = React.useState<LocalNotificationPermission>('undetermined')
  const [permissionLoading, setPermissionLoading] = React.useState(true)
  React.useEffect(() => {
    let active = true
    void notificationService.permission().then((status) => { if (active) setPermission(status) }).finally(() => { if (active) setPermissionLoading(false) })
    return () => { active = false }
  }, [])
  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const [updatedSettings, updatedPreferences] = await Promise.all([
        settingsService.update({ ...settings, notificationsEnabled: enabled }),
        settingsService.updateNotifications({ ...preferences, enabled }),
      ])
      return { updatedSettings, updatedPreferences }
    },
    onSuccess: ({ updatedSettings, updatedPreferences }) => {
      queryClient.setQueryData(settingsKeys.settings, updatedSettings)
      queryClient.setQueryData(settingsKeys.notifications, updatedPreferences)
      if (!updatedSettings.notificationsEnabled) void notificationService.cancelAll()
    },
  })
  const enabled = settings.notificationsEnabled && preferences.enabled
  const request = async () => {
    setPermissionLoading(true)
    try { setPermission(await notificationService.requestPermission()) } finally { setPermissionLoading(false) }
  }
  const permissionText = permission === 'granted' ? 'Đã được hệ điều hành cho phép' : permission === 'denied' ? 'Đã bị chặn trong cài đặt thiết bị' : permission === 'unsupported' ? 'Không hỗ trợ trên nền tảng web' : 'Chưa hỏi quyền trên thiết bị này'
  return (
    <Surface style={styles.formSurface}>
      <SectionHeader eyebrow="Nhắc đúng lúc" title="Thông báo" />
      <ToggleRow label="Thông báo FocusFlow" description="Cho phép app lên lịch kết thúc phiên, giờ nghỉ và reminder thói quen." value={enabled} disabled={mutation.isPending} onChange={(value) => mutation.mutate(value)} />
      <View style={styles.permissionBox}>
        <Text style={styles.permissionLabel}>Quyền trên thiết bị</Text>
        <Text style={styles.permissionValue}>{permissionLoading ? 'Đang kiểm tra…' : permissionText}</Text>
        {permission === 'undetermined' ? <Button label="Cho phép trên thiết bị" variant="secondary" loading={permissionLoading} onPress={() => void request()} /> : null}
        {permission === 'denied' ? <Button label="Mở cài đặt hệ thống" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}
      </View>
      <Text style={styles.note}>FocusFlow chỉ xin quyền khi bạn bấm nút. Tắt công tắc sẽ huỷ các lịch cục bộ do app đã tạo.</Text>
      {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(mutation.error, 'Không thể cập nhật thông báo.')}</Text> : null}
    </Surface>
  )
}

function AccountActions() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: async () => {
      const auth = useAuthStore.getState()
      if (auth.refreshToken) {
        try { await authService.logout(auth.refreshToken) } catch { /* Local logout must still succeed offline. */ }
      }
      await Promise.all([notificationService.cancelAll(), useTimerStore.getState().clear(), auth.clearSession()])
      queryClient.clear()
    },
    onSuccess: () => router.replace('/(auth)/login'),
  })
  return (
    <View style={styles.accountActions}>
      <SectionHeader eyebrow="Phiên đăng nhập" title="Tài khoản" />
      <Button label="Đăng xuất" variant="danger" loading={mutation.isPending} onPress={() => Alert.alert('Đăng xuất khỏi FocusFlow?', 'Token lưu an toàn và dữ liệu timer cục bộ sẽ được xoá khỏi thiết bị này.', [{ text: 'Ở lại', style: 'cancel' }, { text: 'Đăng xuất', style: 'destructive', onPress: () => mutation.mutate() }])} />
      {mutation.error ? <Text accessibilityRole="alert" style={styles.error}>{getApiError(mutation.error, 'Không thể đăng xuất.')}</Text> : null}
    </View>
  )
}

export function SettingsScreen() {
  const user = useAuthStore((state) => state.user)
  const settings = useQuery({ queryKey: settingsKeys.settings, queryFn: settingsService.get })
  const preferences = useQuery({ queryKey: settingsKeys.notifications, queryFn: settingsService.notifications })
  const loading = settings.isPending || preferences.isPending
  return (
    <Screen>
      <RouteHeader title="Cài đặt" />
      <View style={styles.intro}><Text style={styles.eyebrow}>Không gian của bạn</Text><Text style={styles.title}>Cấu hình FocusFlow</Text><Text style={styles.subtitle}>Hồ sơ được đồng bộ với server; quyền thông báo thuộc riêng thiết bị này.</Text></View>
      {loading ? <LoadingBlock label="Đang tải cài đặt" rows={5} /> : null}
      {settings.error ? <InlineError message={getApiError(settings.error, 'Không thể tải cài đặt.')} onRetry={() => void settings.refetch()} /> : null}
      {preferences.error ? <InlineError message={getApiError(preferences.error, 'Không thể tải tùy chọn thông báo.')} onRetry={() => void preferences.refetch()} /> : null}
      {user ? <ProfileForm key={`${user.id}-${user.name}-${user.timezone}`} user={user} /> : null}
      {settings.data ? <PomodoroForm key={`${settings.data.defaultFocusMinutes}-${settings.data.defaultBreakMinutes}-${settings.data.longBreakMinutes}-${settings.data.sessionsBeforeLongBreak}`} settings={settings.data} /> : null}
      {settings.data && preferences.data ? <NotificationsForm settings={settings.data} preferences={preferences.data} /> : null}
      <AccountActions />
      <Text style={styles.buildNote}>FocusFlow Mobile · v1.0.0{Platform.OS === 'web' ? ' · web preview' : ''}</Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  intro: { gap: spacing.x1 },
  eyebrow: { ...typography.eyebrow, color: colors.mossDark },
  title: { ...typography.title, color: colors.ink },
  subtitle: { ...typography.body, color: colors.inkSoft, marginTop: spacing.x1 },
  formSurface: { gap: spacing.x4 },
  field: { gap: spacing.x2 },
  twoColumns: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.x3 },
  stackedColumns: { flexDirection: 'column' },
  column: { flex: 1 },
  fullColumn: { flex: 0, width: '100%' },
  error: { ...typography.small, color: colors.danger },
  success: { ...typography.small, color: colors.mossDark },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.x3 },
  toggleCopy: { flex: 1, gap: spacing.x1 },
  toggleLabel: { ...typography.bodyStrong, color: colors.ink },
  toggleDescription: { ...typography.small, color: colors.inkSoft },
  permissionBox: { gap: spacing.x2, backgroundColor: colors.mossWash, padding: spacing.x3 },
  permissionLabel: { ...typography.eyebrow, color: colors.mossDark },
  permissionValue: { ...typography.body, color: colors.ink },
  note: { ...typography.small, color: colors.inkSoft },
  accountActions: { gap: spacing.x4, borderTopWidth: 1, borderTopColor: colors.lineStrong, paddingTop: spacing.x6 },
  buildNote: { ...typography.small, color: colors.inkSoft, textAlign: 'center' },
})
