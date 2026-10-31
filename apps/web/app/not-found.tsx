import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="text-sm font-medium text-muted">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">这一页不存在</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        链接可能已经失效，或者文章被撤下了。去文章列表碰碰运气？
      </p>
      <div className="mt-6 flex gap-3 text-sm">
        <Link
          href="/posts"
          className="rounded-full bg-fg px-4 py-1.5 font-medium text-bg transition-opacity hover:opacity-85"
        >
          全部文章
        </Link>
        <Link href="/" className="rounded-full border border-line px-4 py-1.5 text-muted transition-colors hover:text-fg">
          回到首页
        </Link>
      </div>
    </div>
  )
}
