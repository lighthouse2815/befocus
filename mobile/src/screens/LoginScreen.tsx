import { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput } from 'react-native'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { router } from 'expo-router'
import { z } from 'zod'
import { Button, TextField } from '@/components/ui'
import { colors, spacing, typography } from '@/constants/theme'
import { AuthLayout } from '@/layouts/AuthLayout'
import { getApiError, getFieldErrors } from '@/services/apiClient'
import { authService } from '@/services/authService'
import { useAuthStore } from '@/store/authStore'

export const loginSchema = z.object({
  email: z.email('Nhập địa chỉ email hợp lệ.'),
  password: z.string().min(1, 'Nhập mật khẩu.'),
})

type FormValues = z.infer<typeof loginSchema>

export function LoginScreen() {
  const passwordRef = useRef<TextInput>(null)
  const [submitError, setSubmitError] = useState('')
  const setSession = useAuthStore((state) => state.setSession)
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('')
    try {
      const session = await authService.login({ email: values.email.trim(), password: values.password })
      await setSession(session)
      router.replace('/(tabs)')
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (field === 'email' || field === 'password') setError(field, { message })
      })
      setSubmitError(getApiError(error, 'Đăng nhập không thành công. Kiểm tra email và mật khẩu.'))
    }
  })

  return (
    <AuthLayout
      title="Trở lại nhịp tập trung"
      subtitle="Đăng nhập để tiếp tục thói quen, dự án và phiên đang dở."
      footer={
        <Pressable accessibilityRole="link" onPress={() => router.push('/register')} hitSlop={12}>
          <Text style={styles.link}>Chưa có tài khoản? Tạo tài khoản</Text>
        </Pressable>
      }
    >
      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            label="Email"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.email?.message}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            ref={passwordRef}
            label="Mật khẩu"
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            error={errors.password?.message}
            autoCapitalize="none"
            autoComplete="current-password"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={() => void onSubmit()}
          />
        )}
      />
      {submitError ? <Text accessibilityRole="alert" style={styles.error}>{submitError}</Text> : null}
      <Button label="Đăng nhập" loading={isSubmitting} onPress={() => void onSubmit()} />
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  error: { ...typography.small, color: colors.danger },
  link: { ...typography.bodyStrong, color: colors.mossDark, padding: spacing.x2, textAlign: 'center' },
})
