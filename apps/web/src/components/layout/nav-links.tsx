'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/format'

export interface NavItem {
  href: string
  label: string
}

export function NavLinks({ items, onNavigate, className }: { items: NavItem[]; onNavigate?: () => void; className?: string }) {
  const pathname = usePathname()

  return (
    <ul className={cn('flex items-center gap-1', className)}>
      {items.map((item) => {
        const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                active ? 'text-fg font-medium' : 'text-muted hover:text-fg',
              )}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
