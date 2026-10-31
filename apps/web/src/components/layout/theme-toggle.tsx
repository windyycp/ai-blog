'use client'

import { useEffect, useState } from 'react'

type Mode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme'
const ORDER: Mode[] = ['light', 'dark', 'system']
const LABEL: Record<Mode, string> = { light: '亮色', dark: '暗色', system: '跟随系统' }
const ICON: Record<Mode, string> = { light: '☀', dark: '☾', system: '◐' }

function resolve(mode: Mode): 'light' | 'dark' {
  if (mode !== 'system') return mode
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function apply(mode: Mode): void {
  const resolved = resolve(mode)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>('system')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const initial: Mode = stored === 'light' || stored === 'dark' ? stored : 'system'
    setMode(initial)
    apply(initial)

    // system 模式下跟随系统变化，避免用户改系统主题后页面不更新
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (window.localStorage.getItem(STORAGE_KEY)) return
      apply('system')
    }
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  function cycle() {
    const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length] as Mode
    setMode(next)
    apply(next)
    if (next === 'system') window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`主题：${LABEL[mode]}，点击切换`}
      title={`主题：${LABEL[mode]}`}
      className="grid size-9 place-items-center rounded-full border border-line text-sm text-muted transition-colors hover:text-fg"
    >
      <span aria-hidden="true">{ICON[mode]}</span>
    </button>
  )
}
