/**
 * 数据访问端口：上层只依赖这个接口，不依赖具体 dialect 实例。
 *
 * 关于 `queryContext()` 的类型断言：
 * TypeScript 无法把 SQLiteDatabase 与 NodePgDatabase 统一成同一可查询类型，
 * 而两侧 schema 的字段形状（string / number / boolean / null）完全一致，
 * 因此这里借用 sqlite 的「类型形状」，但**运行时对象始终来自 port 自己**，
 * 不会出现把 sqlite 列对象喂给 pg 查询构造器导致布尔/大整数编码错配的问题。
 * 该断言由「同一批集成测试在两种引擎上各跑一遍」兜底。
 */
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import * as sqliteSchema from './schema.sqlite'
import * as pgSchema from './schema.pg'
import type { DialectHelpers } from './dialect'

export type DialectKind = 'sqlite' | 'postgres'
export type SqliteDb = BetterSQLite3Database<typeof sqliteSchema>
export type PgDb = NodePgDatabase<typeof pgSchema>
export type SqliteSchema = typeof sqliteSchema
export type PgSchema = typeof pgSchema

export interface DbPort {
  readonly kind: DialectKind
  readonly db: SqliteDb | PgDb
  readonly schema: SqliteSchema | PgSchema
  readonly dialect: DialectHelpers
  /** 一期只有 pg 可能为 true；sqlite 恒为 false（测试覆盖 LIKE 路径） */
  readonly capabilities: { fts: boolean }
  ping(): Promise<boolean>
  close(): Promise<void>
}

export interface QueryContext {
  db: SqliteDb
  s: SqliteSchema
  d: DialectHelpers
}

export function queryContext(port: DbPort): QueryContext {
  return {
    db: port.db as SqliteDb,
    s: port.schema as SqliteSchema,
    d: port.dialect,
  }
}
