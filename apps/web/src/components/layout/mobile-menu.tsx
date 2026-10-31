'use client'

import { useEffect, useState } from 'react'
import { NavLinks, type NavItem } from './nav-links'

export function MobileMenu({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="打开导航菜单"
        aria-expanded={open}
        className="grid size-9 place-items-center rounded-full border border-line text-muted md:hidden"
      >
        <span aria-hidden="true">☰</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="站点导航"
            className="absolute inset-x-0 top-0 border-b border-line bg-bg p-4 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium">导航</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="关闭导航菜单"
                className="grid size-9 place-items-center rounded-full border border-line text-muted"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </div>
            <NavLinks items={items} onNavigate={() => setOpen(false)} className="flex-col items-stretch" />
          </div>
        </div>
      )}
    </>
  )
}
