import Link from 'next/link'
import type { PageMeta } from '@/types'

interface PaginationProps {
  meta: PageMeta
  /** 翻页时保留的筛选参数 */
  basePath: string
  params?: Record<string, string | undefined>
}

function hrefFor(basePath: string, params: Record<string, string | undefined> | undefined, page: number): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value) search.set(key, value)
  }
  if (page > 1) search.set('page', String(page))
  const qs = search.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export function Pagination({ meta, basePath, params }: PaginationProps) {
  const { page, totalPages } = meta
  if (totalPages <= 1) return null

  const hasPrev = page > 1
  const hasNext = page < totalPages

  return (
    <nav aria-label="分页" className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-6 text-sm">
      {hasPrev ? (
        <Link href={hrefFor(basePath, params, page - 1)} rel="prev" className="text-muted transition-colors hover:text-fg">
          ← 上一页
        </Link>
      ) : (
        <span className="text-muted/50">← 上一页</span>
      )}

      <span className="text-xs text-muted">
        {page} / {totalPages}
      </span>

      {hasNext ? (
        <Link href={hrefFor(basePath, params, page + 1)} rel="next" className="text-muted transition-colors hover:text-fg">
          下一页 →
        </Link>
      ) : (
        <span className="text-muted/50">下一页 →</span>
      )}
    </nav>
  )
}
