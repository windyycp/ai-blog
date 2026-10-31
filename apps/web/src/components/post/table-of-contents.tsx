'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/format'
import type { TocItem } from '@/types'

export function TableOfContents({ items }: { items: TocItem[] }) {
  const [activeId, setActiveId] = useState('')

  useEffect(() => {
    if (items.length === 0) return
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActiveId(visible[0].target.id)
      },
      { rootMargin: '-88px 0px -68% 0px', threshold: [0, 1] },
    )

    headings.forEach((heading) => observer.observe(heading))
    return () => observer.disconnect()
  }, [items])

  if (items.length === 0) return null

  return (
    <nav aria-label="本文目录" className="text-sm">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">目录</p>
      <ul className="space-y-1 border-l border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={activeId === item.id ? 'location' : undefined}
              className={cn(
                '-ml-px block border-l py-1 leading-snug transition-colors',
                item.depth === 2 ? 'pl-3' : 'pl-6',
                activeId === item.id
                  ? 'border-accent text-fg'
                  : 'border-transparent text-muted hover:text-fg',
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
