import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { AlertTriangle, LoaderCircle, Plus } from 'lucide-react'
import clsx from 'clsx'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
  ref,
) {
  const styles: Record<ButtonVariant, string> = {
    primary: 'border-moss bg-moss text-white hover:bg-moss-dark',
    secondary: 'border-line-strong bg-paper-raised text-ink hover:border-moss hover:text-moss-dark',
    quiet: 'border-transparent bg-transparent text-ink-soft hover:bg-moss-wash hover:text-ink',
    danger: 'border-danger bg-transparent text-danger hover:bg-danger hover:text-white',
  }
  return (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-control border font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'min-h-9 px-3 text-sm' : 'min-h-11 px-4 text-sm',
        styles[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
})

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name
  const messageId = inputId ? `${inputId}-message` : undefined
  return (
    <div className={className}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className="field-control"
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        {...props}
      />
      {(error || hint) && (
        <p id={messageId} className={error ? 'field-error' : 'mt-1 text-sm text-ink-soft'} role={error ? 'alert' : undefined}>
          {error || hint}
        </p>
      )}
    </div>
  )
})

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  children: ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, id, className, children, ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <div className={className}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <select
        ref={ref}
        id={inputId}
        className="field-control"
        aria-invalid={Boolean(error)}
        aria-describedby={error && inputId ? `${inputId}-error` : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={inputId ? `${inputId}-error` : undefined} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, id, className, ...props },
  ref,
) {
  const inputId = id ?? props.name
  return (
    <div className={className}>
      <label className="field-label" htmlFor={inputId}>
        {label}
      </label>
      <textarea
        ref={ref}
        id={inputId}
        className="field-control min-h-24 resize-y"
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  )
})

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="section-kicker mb-2">{eyebrow}</p>}
        <h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-[-0.04em]">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="border-y border-line py-12 text-center">
      <div className="mx-auto max-w-md">
        <div className="mx-auto mb-4 h-px w-12 bg-moss" aria-hidden="true" />
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-ink-soft">{description}</p>
        {actionLabel && onAction && (
          <Button className="mt-5" onClick={onAction}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="surface flex flex-col items-start gap-3 border-amber bg-amber-wash p-5" role="alert">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-5 w-5 text-amber" aria-hidden="true" />
        Có điều chưa ổn
      </div>
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Thử lại</Button>}
    </div>
  )
}

export function LoadingBlock({ rows = 4, label = 'Đang tải dữ liệu' }: { rows?: number; label?: string }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-14 animate-pulse rounded-control border border-line bg-paper-raised" />
      ))}
    </div>
  )
}

export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-sm bg-line" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="h-full bg-moss transition-[width] duration-200" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="border-l border-line pl-4 first:border-l-0 first:pl-0">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tracking-[-0.04em]">{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-soft">{detail}</p>}
    </div>
  )
}
