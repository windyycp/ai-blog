'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/format'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVisible(window.scrollY > 720))
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="回到顶部"
      className={cn(
        'fixed bottom-6 right-6 z-30 grid size-10 place-items-center rounded-full border border-line bg-bg/90 text-muted shadow-sm backdrop-blur transition-all',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0',
      )}
    >
      <span aria-hidden="true">↑</span>
    </button>
  )
}
