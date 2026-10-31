import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CodeCopy } from '@/components/post/code-copy'
import { PostMetaAside, PostMetaInline } from '@/components/post/post-meta'
import { ReadingProgress } from '@/components/post/reading-progress'
import { TableOfContents } from '@/components/post/table-of-contents'
import { ViewTracker } from '@/components/post/view-tracker'
import { ApiError, getPost, getSiteMeta } from '@/lib/api'
import { renderMarkdown } from '@/lib/markdown'
import { blogPostingJsonLd, buildMetadata } from '@/lib/seo'
import type { PostDetail } from '@/types'

export const revalidate = 300

interface PageProps {
  params: Promise<{ slug: string }>
}

async function loadPost(slug: string): Promise<PostDetail> {
  try {
    return await getPost(slug)
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound()
    throw error
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const post = await getPost(slug)
    return buildMetadata({
      title: post.title,
      description: post.excerpt ?? post.title,
      path: `/posts/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      tags: post.tags.map((tag) => tag.name),
    })
  } catch {
    return { title: '文章未找到' }
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const post = await loadPost(slug)
  const [rendered, site] = await Promise.all([renderMarkdown(post.contentMd), getSiteMeta().catch(() => null)])

  return (
    <>
      <ReadingProgress />
      <ViewTracker slug={post.slug} />
      <CodeCopy containerId="post-content" />
      {site && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: blogPostingJsonLd(post, site) }} />
      )}

      <article className="pt-12 sm:pt-16">
        {/* 标题、封面、正文共用左列与同一条左基线，避免标题居中而正文靠左 */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,46rem)_14rem] lg:justify-between lg:gap-8">
          <div className="min-w-0">
            <nav aria-label="面包屑" className="mb-5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
              <Link href="/posts" className="transition-colors hover:text-fg">
                文章
              </Link>
              {post.category && (
                <>
                  <span aria-hidden="true">/</span>
                  <Link href={`/categories/${post.category.slug}`} className="transition-colors hover:text-fg">
                    {post.category.name}
                  </Link>
                </>
              )}
            </nav>

            <h1 className="text-[2rem] font-semibold leading-snug tracking-tight sm:text-[2.6rem]">{post.title}</h1>

            <div className="mt-4">
              <PostMetaInline post={post} />
            </div>

            {post.coverUrl && (
              <div className="relative mt-8 aspect-[16/8] w-full overflow-hidden rounded-xl border border-line bg-surface">
                <Image
                  src={post.coverUrl}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className="object-cover"
                />
              </div>
            )}

            <div id="post-content" className="prose mt-10">
              {rendered.content}
            </div>

            <nav aria-label="上下篇" className="mt-16 grid gap-4 border-t border-line pt-8 sm:grid-cols-2">
              {post.prev ? (
                <Link
                  href={`/posts/${post.prev.slug}`}
                  className="group rounded-lg border border-line p-4 transition-colors hover:border-accent/40"
                >
                  <span className="text-xs text-muted">← 上一篇</span>
                  <p className="mt-1 text-sm font-medium leading-snug transition-colors group-hover:text-accent">
                    {post.prev.title}
                  </p>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}
              {post.next && (
                <Link
                  href={`/posts/${post.next.slug}`}
                  className="group rounded-lg border border-line p-4 text-right transition-colors hover:border-accent/40"
                >
                  <span className="text-xs text-muted">下一篇 →</span>
                  <p className="mt-1 text-sm font-medium leading-snug transition-colors group-hover:text-accent">
                    {post.next.title}
                  </p>
                </Link>
              )}
            </nav>
          </div>

          {/* 元信息与目录固定在右栏；移动端退化为正文之后，元信息由标题下方的行内版本承担 */}
          <aside className="min-w-0">
            <div className="space-y-8 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:pr-1">
              <div className="hidden lg:block">
                <PostMetaAside post={post} />
              </div>
              <TableOfContents items={rendered.toc} />
            </div>
          </aside>
        </div>
      </article>
    </>
  )
}
