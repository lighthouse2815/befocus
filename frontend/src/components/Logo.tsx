import { Link } from 'react-router-dom'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="inline-flex min-h-11 items-center gap-3 rounded-control" aria-label="BeFocus, về hôm nay">
      <svg
        width="30"
        height="30"
        viewBox="0 0 30 30"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect x="1" y="1" width="28" height="28" rx="7" stroke="currentColor" />
        <path d="M8 20.5C11.8 20.5 12.3 15 15 15C17.7 15 18.2 9.5 22 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="8" cy="20.5" r="2" fill="var(--clay)" />
        <circle cx="22" cy="9.5" r="2" fill="var(--moss)" />
      </svg>
      {!compact && <span className="text-lg font-bold tracking-[-0.02em]">BeFocus</span>}
    </Link>
  )
}
