import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { Button, Input } from '../components/ui'
import { authService } from '../services/auth'
import { getApiError, getFieldErrors } from '../services/api'
import { useAuthStore } from '../store/authStore'

interface LoginFields {
  email: string
  password: string
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { accessToken, setSession } = useAuthStore()
  const [generalError, setGeneralError] = useState('')
  const [expired] = useState(() => sessionStorage.getItem('befocus.auth-expired') === '1')
  const { register, handleSubmit, setError, formState: { errors } } = useForm<LoginFields>({
    defaultValues: { email: '', password: '' },
  })

  useEffect(() => {
    if (expired) sessionStorage.removeItem('befocus.auth-expired')
  }, [expired])

  const mutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (session) => {
      setSession(session)
      const next = (location.state as { from?: string } | null)?.from || '/'
      navigate(next, { replace: true })
    },
    onError: (error) => {
      const fieldErrors = getFieldErrors(error)
      Object.entries(fieldErrors).forEach(([name, message]) => {
        if (name === 'email' || name === 'password') setError(name, { message })
      })
      setGeneralError(getApiError(error, 'Email hoặc mật khẩu chưa đúng.'))
    },
  })

  if (accessToken) return <Navigate to="/" replace />

  return (
    <section className="surface w-full p-6 sm:p-8" aria-labelledby="login-title">
      <p className="section-kicker mb-2">Chào bạn trở lại</p>
      <h1 id="login-title" className="text-3xl font-semibold tracking-[-0.04em]">Đăng nhập</h1>
      <p className="mt-2 text-ink-soft">Mở lại bàn làm việc của bạn.</p>

      {expired && (
        <div className="mt-5 flex gap-3 rounded-control border border-amber bg-amber-wash p-3 text-sm" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" aria-hidden="true" />
          Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.
        </div>
      )}

      <form
        className="mt-7 space-y-5"
        onSubmit={handleSubmit((values) => {
          setGeneralError('')
          mutation.mutate(values)
        })}
        noValidate
      >
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password', { required: 'Nhập mật khẩu của bạn.' })}
        />
        {generalError && (
          <p className="rounded-control border border-danger bg-clay-wash p-3 text-sm text-danger" role="alert">
            {generalError}
          </p>
        )}
        <Button className="w-full" type="submit" loading={mutation.isPending}>
          Đăng nhập
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>

      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
        Chưa có tài khoản?{' '}
        <Link className="font-semibold text-moss-dark underline-offset-4 hover:underline" to="/register">Tạo tài khoản</Link>
      </p>
    </section>
  )
}
