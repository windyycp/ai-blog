/**
 * 生产连接：pg 连接池。api 无状态，可多实例，实例数 × poolMax 需小于 PG max_connections 的 80%。
 */
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import * as schema from './schema.pg'
import { pgDialect } from './dialect'
import type { DbPort } from './port'

export function createPgPort(url: string, poolMax: number): DbPort {
  const pool = new Pool({
    connectionString: url,
    max: poolMax,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
  const db = drizzle(pool, { schema })

  return {
    kind: 'postgres',
    db,
    schema,
    dialect: pgDialect,
    capabilities: { fts: false },
    async ping() {
      try {
        await pool.query('select 1')
        return true
      } catch {
        return false
      }
    },
    async close() {
      await pool.end()
    },
  }
}
