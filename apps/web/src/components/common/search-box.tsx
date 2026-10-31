'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { cn } from '@/lib/format'

interface SearchBoxProps {
  /** header 只做跳转，page 变体边输入边更新 URL */
  variant?: 'header' | 'page'
  initialQuery?: string
  className?: string
}

export function SearchBox({ variant = 'header', initialQuery = '', className }: SearchBoxProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)
  const [pending, startTransition] = useTransition()
  const mounted = useRef(false)

  useEffect(() => {
    if (variant !== 'page' || !mounted.current) return
    const timer = setTimeout(() => {
      const keyword = value.trim()
      startTransition(() => {
        router.replace(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search', { scroll: false })
      })
    }, 320)
    return () => clearTimeout(timer)
  }, [value, variant, router])

  useEffect(() => {
    mounted.current = true
  }, [])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const keyword = value.trim()
    startTransition(() => {
      router.push(keyword ? `/search?q=${encodeURIComponent(keyword)}` : '/search')
    })
  }

  return (
    <form role="search" onSubmit={submit} className={cn('relative', className)}>
      <label htmlFor={`search-${variant}`} className="sr-only">
        搜索文章
      </label>
      <input
        id={`search-${variant}`}
        type="search"
        name="q"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="搜索文章…"
        autoComplete="off"
        className={cn(
          'w-full rounded-full border border-line bg-surface px-3.5 text-sm text-fg placeholder:text-muted',
          'transition-colors focus:border-accent focus:bg-bg focus:outline-none',
          variant === 'header' ? 'h-9' : 'h-11',
        )}
      />
      <span aria-live="polite" className="sr-only">
        {pending ? '正在搜索' : ''}
      </span>
    </form>
  )
}
