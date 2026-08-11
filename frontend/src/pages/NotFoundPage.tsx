import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col bg-paper px-5 py-7">
      <Logo />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-16">
        <p className="font-mono text-sm font-semibold text-clay">404 / LẠC ĐƯỜNG</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">Trang này không còn ở đây.</h1>
        <p className="mt-4 max-w-md text-lg text-ink-soft">Đường dẫn có thể đã thay đổi. Quay về bàn làm việc để tiếp tục từ một nơi quen thuộc.</p>
        <Link to="/" className="mt-8 inline-flex min-h-11 w-fit items-center gap-2 rounded-control border border-moss bg-moss px-4 text-sm font-semibold text-white hover:bg-moss-dark"><ArrowLeft className="h-4 w-4" />Về hôm nay</Link>
      </div>
    </main>
  )
}
