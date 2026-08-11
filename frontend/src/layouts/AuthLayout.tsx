import { Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex h-20 max-w-[1180px] items-center px-5 sm:px-8">
        <Logo />
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-[1180px] items-start gap-12 px-5 pb-16 pt-8 md:grid-cols-[minmax(0,1fr)_minmax(360px,460px)] md:items-center md:px-8 md:pt-0">
        <section className="hidden max-w-xl md:block" aria-labelledby="auth-intro-title">
          <p className="section-kicker mb-4">Một khoảng yên để làm việc</p>
          <h1 id="auth-intro-title" className="text-5xl font-semibold leading-[1.05] tracking-[-0.055em] lg:text-6xl">
            Điều cần làm,
            <br />ở đúng chỗ.
          </h1>
          <div className="mt-10 max-w-md border-l-2 border-moss pl-5 text-lg leading-relaxed text-ink-soft">
            Theo dõi thói quen, phiên tập trung và công việc bằng dữ liệu thật — không thêm tiếng ồn vào ngày của bạn.
          </div>
        </section>
        <Outlet />
      </main>
    </div>
  )
}
