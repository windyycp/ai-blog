'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[web] 页面渲染失败：', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-start justify-center py-20">
      <p className="text-sm font-medium text-muted">出错了</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">内容暂时取不到</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
        可能是内容服务未启动或响应超时。稍等片刻再试一次。
      </p>
      {error.digest && <p className="mt-2 text-xs text-muted/70">错误编号：{error.digest}</p>}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-full bg-fg px-4 py-1.5 text-sm font-medium text-bg transition-opacity hover:opacity-85"
      >
        重试
      </button>
    </div>
  )
}
