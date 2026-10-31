/**
 * 采集数据巡检。按 ARCHITECTURE.md §6.2：只在生产 PG 执行，SQLite 上直接跳过。
 * 退出码 1 表示发现问题，可挂到 cron / CI。
 */
import { Client } from 'pg'
import { loadConfig } from '../config/env'

interface Check {
  name: string
  sql: string
  args: unknown[]
}

const checks: Check[] = [
  {
    name: '已发布但正文为空',
    sql: "select slug from posts where status = 'published' and (content_md is null or trim(content_md) = '')",
    args: [],
  },
  {
    name: '已发布但没有标签',
    sql: "select p.slug from posts p left join post_tags pt on pt.post_id = p.id where p.status = 'published' and pt.post_id is null",
    args: [],
  },
  {
    name: 'slug 重复',
    sql: 'select slug from posts group by slug having count(*) > 1',
    args: [],
  },
  {
    name: '发布时间在未来',
    sql: 'select slug from posts where published_at is not null and published_at > $1',
    args: [Date.now()],
  },
]

async function main(): Promise<void> {
  const config = loadConfig()
  if (config.db.driver !== 'postgres') {
    console.log('[check] 当前为 SQLite，跳过巡检（仅生产 PG 执行）')
    return
  }

  const client = new Client({ connectionString: config.db.url })
  await client.connect()
  let failed = 0

  try {
    for (const check of checks) {
      const result = await client.query<Record<string, unknown>>(check.sql, check.args)
      if (result.rowCount === 0) {
        console.log(`  ok   ${check.name}`)
        continue
      }
      failed += 1
      console.error(`  FAIL ${check.name}（${result.rowCount} 行）`)
      for (const row of result.rows.slice(0, 10)) {
        console.error(`       ${JSON.stringify(row)}`)
      }
    }
  } finally {
    await client.end()
  }

  if (failed > 0) {
    console.error(`[check] ${failed} 项未通过`)
    process.exit(1)
  }
  console.log('[check] 全部通过')
}

main().catch((error) => {
  console.error('[check] 执行失败：', error)
  process.exit(1)
})
