/**
 * 本地 / 测试连接：单文件单连接。
 * 只开 foreign_keys，其余 PRAGMA 一律不设（不启用 WAL、不设 busy_timeout）—— 见 ARCHITECTURE.md §5.6。
 */
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.sqlite'
import { sqliteDialect } from './dialect'
import type { DbPort } from './port'

export function createSqlitePort(filePath: string): DbPort {
  // better-sqlite3 不会自动建目录，首次启动（空 data/）需要先补上
  if (filePath !== ':memory:') mkdirSync(dirname(filePath), { recursive: true })
  const sqlite = new Database(filePath)
  sqlite.pragma('foreign_keys = ON')
  const db = drizzle(sqlite, { schema })

  return {
    kind: 'sqlite',
    db,
    schema,
    dialect: sqliteDialect,
    capabilities: { fts: false },
    async ping() {
      try {
        sqlite.prepare('select 1').get()
        return true
      } catch {
        return false
      }
    },
    async close() {
      sqlite.close()
    },
  }
}
