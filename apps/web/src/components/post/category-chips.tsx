import Link from 'next/link'
import type { CategoryRef } from '@/types'
import { chipClassName, type ChipSize } from './chip-style'

interface CategoryChipsProps {
  categories: CategoryRef[]
  size?: ChipSize
  showCount?: boolean
  /** 当前筛选中的分类 slug，命中时切换为选中态 */
  activeSlug?: string
  className?: string
}

/** 分类与标签同款胶囊卡，用浅底 + 圆点区分 */
export function CategoryChips({
  categories,
  size = 'md',
  showCount = false,
  activeSlug,
  className,
}: CategoryChipsProps) {
  if (categories.length === 0) return null

  return (
    <ul className={className ? `flex flex-wrap gap-2 ${className}` : 'flex flex-wrap gap-2'}>
      {categories.map((category) => {
        const active = category.slug === activeSlug

        return (
          <li key={category.slug}>
            <Link
              href={`/categories/${category.slug}`}
              aria-current={active ? 'page' : undefined}
              className={chipClassName(size, active ? 'active' : 'solid')}
            >
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-accent/70" />
              <span>{category.name}</span>
              {showCount && category.count !== undefined && (
                <span className={active ? 'text-[0.75rem] text-accent/70' : 'text-[0.75rem] text-muted'}>
                  {category.count}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
