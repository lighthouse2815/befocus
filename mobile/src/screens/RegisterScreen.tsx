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

const schema = z.object({
  name: z.string().trim().min(1, 'Nhập tên của bạn.').max(120, 'Tên tối đa 120 ký tự.'),
  email: z.email('Nhập địa chỉ email hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.').max(128, 'Mật khẩu tối đa 128 ký tự.'),
})

type FormValues = z.infer<typeof schema>

export function RegisterScreen() {
  const emailRef = useRef<TextInput>(null)
  const passwordRef = useRef<TextInput>(null)
  const [submitError, setSubmitError] = useState('')
  const setSession = useAuthStore((state) => state.setSession)
  const { control, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError('')
    try {
      const session = await authService.register({ name: values.name.trim(), email: values.email.trim(), password: values.password })
      await setSession(session)
      router.replace('/(tabs)')
    } catch (error) {
      const fieldErrors = getFieldErrors(error)
      Object.entries(fieldErrors).forEach(([field, message]) => {
        if (field === 'name' || field === 'email' || field === 'password') setError(field, { message })
      })
      setSubmitError(getApiError(error, 'Không thể tạo tài khoản. Vui lòng kiểm tra thông tin.'))
    }
  })

  return (
    <AuthLayout
      title="Tạo không gian tập trung"
      subtitle="Một tài khoản cho FocusFlow trên web và điện thoại."
      footer={
        <Pressable accessibilityRole="link" onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.link}>Đã có tài khoản? Đăng nhập</Text>
        </Pressable>
      }
    >
      <Controller control={control} name="name" render={({ field: { onBlur, onChange, value } }) => (
        <TextField label="Tên hiển thị" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.name?.message} autoComplete="name" returnKeyType="next" onSubmitEditing={() => emailRef.current?.focus()} />
      )} />
      <Controller control={control} name="email" render={({ field: { onBlur, onChange, value } }) => (
        <TextField ref={emailRef} label="Email" value={value} onBlur={onBlur} onChangeText={onChange} error={errors.email?.message} autoCapitalize="none" autoComplete="email" keyboardType="email-address" returnKeyType="next" onSubmitEditing={() => passwordRef.current?.focus()} />
      )} />
      <Controller control={control} name="password" render={({ field: { onBlur, onChange, value } }) => (
        <TextField ref={passwordRef} label="Mật khẩu" hint="Từ 8 đến 128 ký tự." value={value} onBlur={onBlur} onChangeText={onChange} error={errors.password?.message} autoCapitalize="none" autoComplete="new-password" secureTextEntry returnKeyType="done" onSubmitEditing={() => void onSubmit()} />
      )} />
      {submitError ? <Text accessibilityRole="alert" style={styles.error}>{submitError}</Text> : null}
      <Button label="Tạo tài khoản" loading={isSubmitting} onPress={() => void onSubmit()} />
    </AuthLayout>
  )
}

const styles = StyleSheet.create({
  error: { ...typography.small, color: colors.danger },
  link: { ...typography.bodyStrong, color: colors.mossDark, padding: spacing.x2, textAlign: 'center' },
})
