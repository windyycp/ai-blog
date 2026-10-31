/**
 * 方言助手：全项目唯一允许出现「引擎专属 SQL」的地方之一（另一半是 repository 里的单边分支）。
 * service 及以上不得出现任何 engine 判断。
 */
import { sql, type AnyColumn, type SQL } from 'drizzle-orm'
import type { DialectKind } from './port'

export interface DialectHelpers {
  readonly kind: DialectKind
  /** 大小写不敏感匹配 */
  ciLike(column: AnyColumn, term: string): SQL
  /** PG 的 count() 返回 string，统一归一为 number */
  toNumber(value: unknown): number
}

export const sqliteDialect: DialectHelpers = {
  kind: 'sqlite',
  ciLike: (column, term) => sql`lower(${column}) like lower(${term})`,
  toNumber: (value) => Number(value ?? 0),
}

export const pgDialect: DialectHelpers = {
  kind: 'postgres',
  ciLike: (column, term) => sql`${column} ilike ${term}`,
  toNumber: (value) => Number(value ?? 0),
}
