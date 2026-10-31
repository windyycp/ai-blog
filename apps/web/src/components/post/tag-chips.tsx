import Link from 'next/link'
import type { TagRef } from '@/types'
import { chipClassName, type ChipSize } from './chip-style'

interface TagChipsProps {
  tags: TagRef[]
  size?: ChipSize
  showCount?: boolean
  /** 当前筛选中的标签 slug，命中时切换为选中态 */
  activeSlug?: string
  className?: string
}

export function TagChips({ tags, size = 'md', showCount = false, activeSlug, className }: TagChipsProps) {
  if (tags.length === 0) return null

  return (
    <ul className={className ? `flex flex-wrap gap-2 ${className}` : 'flex flex-wrap gap-2'}>
      {tags.map((tag) => {
        const active = tag.slug === activeSlug

        return (
          <li key={tag.slug}>
            <Link
              href={`/tags/${tag.slug}`}
              aria-current={active ? 'page' : undefined}
              className={chipClassName(size, active ? 'active' : 'outline')}
            >
              <span>#{tag.name}</span>
              {showCount && tag.count !== undefined && <span className="opacity-60">{tag.count}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
