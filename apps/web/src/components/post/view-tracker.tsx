'use client'

import { useEffect } from 'react'

/** 同一会话内同一篇文章只上报一次，避免刷新刷量 */
export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `viewed:${slug}`
    try {
      if (window.sessionStorage.getItem(key)) return
      window.sessionStorage.setItem(key, '1')
    } catch {
      // 隐私模式下 sessionStorage 不可用，直接上报
    }

    const controller = new AbortController()
    // 走同源代理，容器部署时 api 不必对外暴露
    fetch(`/api/views/${encodeURIComponent(slug)}`, {
      method: 'POST',
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // 浏览量是尽力而为，失败不影响阅读
    })

    return () => controller.abort()
  }, [slug])

  return null
}
