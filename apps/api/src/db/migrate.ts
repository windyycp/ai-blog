/**
 * 按 DB_DRIVER 选择迁移目录执行。
 * 两份迁移由 drizzle-kit 生成、编号一一对应，必须在同一 PR 中成对提交。
 */
import { migrate as sqliteMigrate } from 'drizzle-orm/better-sqlite3/migrator'
import { migrate as pgMigrate } from 'drizzle-orm/node-postgres/migrator'
import { loadConfig } from '../config/env'
import { createDbPort } from './connect'
import type { PgDb, SqliteDb } from './port'

const config = loadConfig()
const port = createDbPort(config.db)

try {
  if (config.db.driver === 'sqlite') {
    sqliteMigrate(port.db as SqliteDb, { migrationsFolder: 'drizzle/sqlite' })
    console.log(`[migrate] sqlite 完成 → ${config.db.path}`)
  } else {
    await pgMigrate(port.db as PgDb, { migrationsFolder: 'drizzle/pg' })
    console.log('[migrate] postgres 完成')
  }
} finally {
  await port.close()
}
