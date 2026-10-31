/**
 * 样例数据：SQLite 与 PG 通用（全部走 DbPort，不写方言 SQL）。
 * 只在开发/测试执行；生产必须显式 ALLOW_SEED=true，避免误清线上数据。
 */
import { readFileSync } from 'node:fs'
import { loadConfig } from '../../config/env'
import { createDbPort } from '../connect'
import { queryContext } from '../port'

interface SeedPost {
  slug: string
  title: string
  excerpt: string
  category: string
  tags: string[]
  featured: boolean
  /** 相对今天的天数，越小越新 */
  daysAgo: number
}

const categories = [
  { slug: 'ai', name: 'AI 实践', description: '模型、检索与工程落地', sortOrder: 1 },
  { slug: 'engineering', name: '工程实践', description: '架构、数据库与前端', sortOrder: 2 },
  { slug: 'notes', name: '随笔', description: '写作与方法论', sortOrder: 3 },
]

const tags = [
  { slug: 'llm', name: 'LLM' },
  { slug: 'rag', name: 'RAG' },
  { slug: 'vector-db', name: '向量数据库' },
  { slug: 'prompt', name: '提示工程' },
  { slug: 'postgres', name: 'PostgreSQL' },
  { slug: 'sqlite', name: 'SQLite' },
  { slug: 'architecture', name: '架构' },
  { slug: 'nextjs', name: 'Next.js' },
  { slug: 'cache', name: '缓存' },
  { slug: 'writing', name: '技术写作' },
]

const posts: SeedPost[] = [
  {
    slug: 'rag-in-practice',
    title: 'RAG 落地：从 Demo 到可用的六个坎',
    excerpt: '检索增强生成真正的难点不在模型调用，而在切分、召回、重排与评测。',
    category: 'ai',
    tags: ['rag', 'llm', 'vector-db'],
    featured: true,
    daysAgo: 3,
  },
  {
    slug: 'dual-database-tradeoffs',
    title: '博客为什么要跑双数据库：PG 与 SQLite 的取舍',
    excerpt: '生产用 PG，本地与 CI 用 SQLite，代价是一层端口抽象和一套 parity 校验。',
    category: 'engineering',
    tags: ['postgres', 'sqlite', 'architecture'],
    featured: true,
    daysAgo: 9,
  },
  {
    slug: 'prompt-engineering-notes',
    title: '提示工程的十条工程化经验',
    excerpt: '把 prompt 当代码管理：版本、评测集、回归与灰度。',
    category: 'ai',
    tags: ['prompt', 'llm'],
    featured: false,
    daysAgo: 16,
  },
  {
    slug: 'nextjs-isr-cache',
    title: 'App Router 下的 ISR 与按需失效',
    excerpt: 'cache tag 的粒度决定了数据一致性，也决定了你要写多少失效代码。',
    category: 'engineering',
    tags: ['nextjs', 'cache'],
    featured: false,
    daysAgo: 24,
  },
  {
    slug: 'vector-index-tradeoffs',
    title: '向量检索的三种索引与适用场景',
    excerpt: 'HNSW、IVF、PQ 不是三选一，而是召回率、内存与时延的三角权衡。',
    category: 'ai',
    tags: ['vector-db', 'rag'],
    featured: false,
    daysAgo: 35,
  },
  {
    slug: 'writing-for-engineers',
    title: '写给工程师的技术写作',
    excerpt: '先写结论，再写证据；能用表格就不用段落。',
    category: 'notes',
    tags: ['writing'],
    featured: false,
    daysAgo: 48,
  },
]

const siteMeta: Array<[string, string]> = [
  ['title', 'AI Blog'],
  ['description', '模型、检索与工程实践的长期笔记'],
  ['author', '站长'],
  ['avatar_url', ''],
  ['socials', JSON.stringify([{ label: 'GitHub', href: 'https://github.com' }])],
  ['about', '# 关于本站\n\n这里记录 AI 应用与工程实践中的可复用结论。\n\n> 不做资讯搬运，只写自己验证过的东西。\n'],
]

const DAY_MS = 86_400_000

async function main(): Promise<void> {
  const config = loadConfig()
  if (config.env === 'production' && process.env.ALLOW_SEED !== 'true') {
    throw new Error('生产环境禁止执行 seed；如确需执行，设置 ALLOW_SEED=true')
  }

  const port = createDbPort(config.db)
  const { db, s } = queryContext(port)

  try {
    // 清空顺序：先关联表，再主表（SQLite 开了外键，PG 有 ON DELETE CASCADE）
    await db.delete(s.postTags)
    await db.delete(s.postViews)
    await db.delete(s.posts)
    await db.delete(s.tags)
    await db.delete(s.categories)
    await db.delete(s.siteMeta)

    const now = Date.now()
    const createdAt = now - 120 * DAY_MS
    await db.insert(s.categories).values(categories.map((c) => ({ ...c, createdAt })))
    await db.insert(s.tags).values(tags.map((t) => ({ ...t, createdAt })))
    await db
      .insert(s.siteMeta)
      .values(siteMeta.map(([key, value]) => ({ key, value })))

    const categoryRows = await db.select().from(s.categories)
    const tagRows = await db.select().from(s.tags)
    const categoryId = new Map(categoryRows.map((c) => [c.slug, c.id]))
    const tagId = new Map(tagRows.map((t) => [t.slug, t.id]))

    for (const post of posts) {
      const contentMd = readFileSync(new URL(`./posts/${post.slug}.md`, import.meta.url), 'utf8')
      const publishedAt = now - post.daysAgo * DAY_MS
      const [row] = await db
        .insert(s.posts)
        .values({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          contentMd,
          coverUrl: null,
          categoryId: categoryId.get(post.category) ?? null,
          status: 'published',
          readingTime: 0,
          viewCount: 0,
          featured: post.featured,
          publishedAt,
          createdAt: publishedAt,
          updatedAt: publishedAt,
        })
        .returning({ id: s.posts.id })
      if (!row) continue
      const relations = post.tags
        .map((slug) => tagId.get(slug))
        .filter((id): id is number => typeof id === 'number')
        .map((id) => ({ postId: row.id, tagId: id }))
      if (relations.length > 0) {
        await db.insert(s.postTags).values(relations)
      }
    }

    console.log(`[seed] 完成：${categories.length} 分类 / ${tags.length} 标签 / ${posts.length} 文章（${config.db.driver}）`)
  } finally {
    await port.close()
  }
}

main().catch((error) => {
  console.error('[seed] 失败：', error)
  process.exit(1)
})
