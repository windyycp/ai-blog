import { NextResponse } from 'next/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { revalidatePayloadSchema } from '@ai-blog/shared'

/**
 * 内容更新后的按需失效入口。
 * 鉴权用共享密钥头，避免公网可被随意刷缓存。
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '未配置 REVALIDATE_SECRET' } },
      { status: 500 },
    )
  }

  const provided = request.headers.get('x-revalidate-secret')
  if (provided !== secret) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: '密钥校验失败' } },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = revalidatePayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: 'tags / paths 需提供其一，各 1~20 项' } },
      { status: 400 },
    )
  }

  const { tags = [], paths = [] } = parsed.data

  for (const tag of tags) {
    // Next 16 起 revalidateTag 需要显式缓存档案，'max' 表示按最大生命周期立即失效
    revalidateTag(tag, 'max')
  }

  // 整页缓存（full route cache）只认路径，光失效 tag 不足以让重启后的首屏立刻更新
  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({ success: true, data: { revalidated: tags, paths } })
}
