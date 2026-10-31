import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState } from '@/components/common/empty-state'
import { getArchive } from '@/lib/api'
import { formatDate, formatMonth } from '@/lib/format'
import { buildMetadata } from '@/lib/seo'
import type { ArchiveYear } from '@/types'

export const revalidate = 300

export const metadata: Metadata = buildMetadata({
  title: '归档',
  description: '按年份与月份浏览全部文章。',
  path: '/archive',
})

export default async function ArchivePage() {
  let years: ArchiveYear[] = []
  try {
    years = await getArchive()
  } catch (error) {
    console.error('[archive] 数据加载失败：', (error as Error).message)
    throw error
  }

  const total = years.reduce((sum, year) => sum + year.count, 0)

  return (
    <div className="pt-12 sm:pt-16">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">归档</h1>
        <p className="mt-2 text-sm text-muted">共 {total} 篇文章，按时间排列。</p>
      </header>

      {years.length === 0 ? (
        <EmptyState title="还没有可归档的文章" action={{ href: '/posts', label: '去看看最新文章' }} />
      ) : (
        <div className="space-y-12">
          {years.map((year) => (
            <section key={year.year} aria-labelledby={`year-${year.year}`}>
              <div className="mb-4 flex items-baseline gap-3">
                <h2 id={`year-${year.year}`} className="text-xl font-semibold tracking-tight">
                  {year.year}
                </h2>
                <span className="text-xs text-muted">{year.count} 篇</span>
              </div>

              <div className="space-y-6 border-l border-line pl-5">
                {year.months.map((month) => (
                  <div key={`${year.year}-${month.month}`}>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                      {formatMonth(month.month)} · {month.count} 篇
                    </p>
                    <ul className="space-y-2">
                      {month.posts.map((post) => (
                        <li key={post.slug} className="flex flex-wrap items-baseline gap-x-3">
                          <time
                            dateTime={post.publishedAt ?? undefined}
                            className="text-xs tabular-nums text-muted/80"
                          >
                            {formatDate(post.publishedAt)}
                          </time>
                          <Link
                            href={`/posts/${post.slug}`}
                            className="text-sm leading-snug transition-colors hover:text-accent"
                          >
                            {post.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
