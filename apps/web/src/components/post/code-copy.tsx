'use client'

import { useEffect } from 'react'

/**
 * 正文由服务端渲染成 HTML，这里用事件委托 + 动态按钮，
 * 避免给每个代码块都塞一个客户端组件。
 */
export function CodeCopy({ containerId }: { containerId: string }) {
  useEffect(() => {
    const root = document.getElementById(containerId)
    if (!root) return

    const cleanup: Array<() => void> = []

    for (const pre of Array.from(root.querySelectorAll('pre'))) {
      const host = pre.closest('figure') ?? pre.parentElement
      if (!host) continue

      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'copy-button'
      button.textContent = '复制'

      const onClick = async () => {
        const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? ''
        try {
          await navigator.clipboard.writeText(code)
          button.textContent = '已复制'
        } catch {
          button.textContent = '复制失败'
        }
        window.setTimeout(() => {
          button.textContent = '复制'
        }, 1800)
      }

      button.addEventListener('click', onClick)
      host.style.position = 'relative'
      host.appendChild(button)

      cleanup.push(() => {
        button.removeEventListener('click', onClick)
        button.remove()
      })
    }

    return () => cleanup.forEach((fn) => fn())
  }, [containerId])

  return null
}
