import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button, Input } from '../components/ui'
import { getApiError, getFieldErrors } from '../services/api'
import { authService } from '../services/auth'
import { useAuthStore } from '../store/authStore'

interface RegisterFields {
  name: string
  email: string
  password: string
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { accessToken, setSession } = useAuthStore()
  const [generalError, setGeneralError] = useState('')
  const { register, handleSubmit, setError, formState: { errors } } = useForm<RegisterFields>({
    defaultValues: { name: '', email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: authService.register,
    onSuccess: (session) => {
      setSession(session)
      navigate('/', { replace: true })
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error)
      Object.entries(fieldErrors).forEach(([name, message]) => {
        if (name === 'name' || name === 'email' || name === 'password') setError(name, { message })
      })
      setGeneralError(getApiError(error, 'Không thể tạo tài khoản. Vui lòng kiểm tra thông tin.'))
    },
  })

  if (accessToken) return <Navigate to="/" replace />

  return (
    <section className="surface w-full p-6 sm:p-8" aria-labelledby="register-title">
      <p className="section-kicker mb-2">Bắt đầu gọn nhẹ</p>
      <h1 id="register-title" className="text-3xl font-semibold tracking-[-0.04em]">Tạo tài khoản</h1>
      <p className="mt-2 text-ink-soft">Thiết lập mất chưa đầy một phút.</p>

      <form
        className="mt-7 space-y-5"
        onSubmit={handleSubmit((values) => {
          setGeneralError('')
          mutation.mutate(values)
        })}
        noValidate
      >
        <Input
          label="Họ và tên"
          autoComplete="name"
          error={errors.name?.message}
          {...register('name', {
            required: 'Nhập tên của bạn.',
            minLength: { value: 2, message: 'Tên cần ít nhất 2 ký tự.' },
            maxLength: { value: 120, message: 'Tên không quá 120 ký tự.' },
          })}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          error={errors.email?.message}
          {...register('email', {
            required: 'Nhập email của bạn.',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Nhập địa chỉ email hợp lệ.' },
          })}
        />
        <Input
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          hint="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số."
          error={errors.password?.message}
          {...register('password', {
            required: 'Tạo mật khẩu để bảo vệ tài khoản.',
            minLength: { value: 8, message: 'Mật khẩu cần ít nhất 8 ký tự.' },
            maxLength: { value: 128, message: 'Mật khẩu không quá 128 ký tự.' },
            validate: (value) => (
              /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value)
            ) || 'Dùng ít nhất một chữ hoa, một chữ thường và một số.',
          })}
        />
        {generalError && (
          <p className="rounded-control border border-danger bg-clay-wash p-3 text-sm text-danger" role="alert">
            {generalError}
          </p>
        )}
        <Button className="w-full" type="submit" loading={mutation.isPending}>
          Tạo tài khoản
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
        Đã có tài khoản?{' '}
        <Link className="font-semibold text-moss-dark underline-offset-4 hover:underline" to="/login">Đăng nhập</Link>
      </p>
    </section>
  )
}
