import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001/api/v1'

/**
 * 浏览量上报的同源代理。
 * 容器部署时 api 只在内部网络可达，浏览器不该直连它，这里由服务端转发一次。
 */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug) return new NextResponse(null, { status: 204 })

  try {
    await fetch(`${API_BASE_URL}/posts/${encodeURIComponent(slug)}/view`, {
      method: 'POST',
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // 浏览量是尽力而为的指标，失败不打扰阅读
  }

  return new NextResponse(null, { status: 204 })
}
