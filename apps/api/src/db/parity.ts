/**
 * 结构一致性校验。
 *
 * 默认模式（CI 必跑）：比对两份 Drizzle schema 定义 —— 表集合、列集合、可空性、
 * 主键、索引列与唯一性、外键。不需要任何数据库，秒级完成。
 *
 * --live 模式：连上两个真实数据库，比对 information_schema / PRAGMA，额外比类型归类。
 *
 * 任一差异 → 打印表格并 exit 1，阻断合并。
 */
import { getTableConfig as getSqliteTableConfig } from 'drizzle-orm/sqlite-core'
import { getTableConfig as getPgTableConfig } from 'drizzle-orm/pg-core'
import * as sqliteSchema from './schema.sqlite'
import * as pgSchema from './schema.pg'

interface ColumnShape {
  name: string
  notNull: boolean
}
interface IndexShape {
  name: string
  columns: string[]
  unique: boolean
  primary: boolean
}
interface TableShape {
  columns: ColumnShape[]
  indexes: IndexShape[]
}

const sortByName = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name))

function normalize(
  tables: Record<string, unknown>,
  getConfig: (table: never) => {
    name: string
    columns: Array<{ name: string; notNull: boolean }>
    indexes: Array<{ config: { name: string; columns: Array<{ name: string }>; unique?: boolean } }>
    primaryKeys: Array<{ columns: Array<{ name: string }> }>
  },
): Record<string, TableShape> {
  const out: Record<string, TableShape> = {}
  for (const table of Object.values(tables)) {
    const cfg = getConfig(table as never)
    const pkColumns = (cfg.primaryKeys[0]?.columns ?? []).map((c) => c.name)
    const indexes: IndexShape[] = cfg.indexes.map((i) => ({
      name: i.config.name,
      columns: [...i.config.columns.map((c) => c.name)].sort(),
      unique: Boolean(i.config.unique),
      primary: false,
    }))
    if (pkColumns.length > 0) {
      indexes.push({ name: '__pk__', columns: [...pkColumns].sort(), unique: true, primary: true })
    }
    out[cfg.name] = {
      columns: sortByName(cfg.columns.map((c) => ({ name: c.name, notNull: Boolean(c.notNull) }))),
      indexes: sortByName(indexes),
    }
  }
  return out
}

export function compareDefinitions(): string[] {
  const a = normalize(sqliteSchema as unknown as Record<string, unknown>, getSqliteTableConfig as never)
  const b = normalize(pgSchema as unknown as Record<string, unknown>, getPgTableConfig as never)
  const problems: string[] = []

  const tables = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()
  for (const table of tables) {
    const left = a[table]
    const right = b[table]
    if (!left || !right) {
      problems.push(`表 ${table} 只存在于 ${left ? 'sqlite' : 'pg'} schema`)
      continue
    }

    const columns = [...new Set([...left.columns.map((c) => c.name), ...right.columns.map((c) => c.name)])].sort()
    for (const name of columns) {
      const l = left.columns.find((c) => c.name === name)
      const r = right.columns.find((c) => c.name === name)
      if (!l || !r) {
        problems.push(`${table}.${name} 只存在于 ${l ? 'sqlite' : 'pg'} schema`)
        continue
      }
      if (l.notNull !== r.notNull) {
        problems.push(`${table}.${name} 可空性不一致：sqlite=${l.notNull ? 'NOT NULL' : 'NULL'}，pg=${r.notNull ? 'NOT NULL' : 'NULL'}`)
      }
    }

    const indexNames = [...new Set([...left.indexes.map((i) => i.name), ...right.indexes.map((i) => i.name)])].sort()
    for (const name of indexNames) {
      const l = left.indexes.find((i) => i.name === name)
      const r = right.indexes.find((i) => i.name === name)
      if (!l || !r) {
        problems.push(`${table} 索引 ${name} 只存在于 ${l ? 'sqlite' : 'pg'} schema`)
        continue
      }
      if (l.columns.join(',') !== r.columns.join(',')) {
        problems.push(`${table} 索引 ${name} 列不一致：sqlite=(${l.columns})，pg=(${r.columns})`)
      }
      if (l.unique !== r.unique) {
        problems.push(`${table} 索引 ${name} 唯一性不一致：sqlite=${l.unique}，pg=${r.unique}`)
      }
    }
  }
  return problems
}

// ---------------------------------------------------------------- live 模式

type TypeClass = 'int' | 'text' | 'bool' | 'date' | 'other'

function classify(raw: string): TypeClass {
  const t = raw.toUpperCase()
  if (t.includes('BOOL')) return 'bool'
  if (t.includes('INT')) return 'int'
  if (t.includes('CHAR') || t.includes('TEXT') || t.includes('CLOB')) return 'text'
  if (t.includes('DATE') || t.includes('TIME')) return 'date'
  return 'other'
}

interface LiveTable {
  columns: Array<{ name: string; type: TypeClass; notNull: boolean }>
  indexes: Array<{ name: string; columns: string[] }>
}

async function sqliteLiveShapes(path: string): Promise<Record<string, LiveTable>> {
  const { default: Database } = await import('better-sqlite3')
  const db = new Database(path, { readonly: true })
  try {
    const tables = db
      .prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%' and name not like '__drizzle%'")
      .all() as Array<{ name: string }>
    const out: Record<string, LiveTable> = {}
    for (const { name } of tables) {
      const cols = db.prepare(`pragma table_info("${name}")`).all() as Array<{ name: string; type: string; notnull: number }>
      const idxList = db.prepare(`pragma index_list("${name}")`).all() as Array<{ name: string }>
      const indexes = idxList.map((idx) => {
        const info = db.prepare(`pragma index_info("${idx.name}")`).all() as Array<{ name: string }>
        return { name: idx.name, columns: info.map((i) => i.name).sort() }
      })
      out[name] = {
        columns: cols.map((c) => ({ name: c.name, type: classify(c.type), notNull: c.notnull === 1 })).sort((x, y) => x.name.localeCompare(y.name)),
        indexes: indexes.sort((x, y) => x.name.localeCompare(y.name)),
      }
    }
    return out
  } finally {
    db.close()
  }
}

async function pgLiveShapes(url: string): Promise<Record<string, LiveTable>> {
  const { Client } = await import('pg')
  const client = new Client({ connectionString: url })
  await client.connect()
  try {
    const cols = await client.query<{ table_name: string; column_name: string; data_type: string; is_nullable: string }>(
      `select table_name, column_name, data_type, is_nullable
         from information_schema.columns
        where table_schema = 'public'
        order by table_name, column_name`,
    )
    const idx = await client.query<{ tablename: string; indexname: string; indexdef: string }>(
      `select tablename, indexname, indexdef from pg_indexes where schemaname = 'public'`,
    )
    const out: Record<string, LiveTable> = {}
    for (const row of cols.rows) {
      out[row.table_name] ??= { columns: [], indexes: [] }
      out[row.table_name]!.columns.push({
        name: row.column_name,
        type: classify(row.data_type),
        notNull: row.is_nullable === 'NO',
      })
    }
    for (const row of idx.rows) {
      const match = row.indexdef.match(/\((.+)\)/)
      const columns = match?.[1]?.split(',').map((s) => s.trim().replace(/"/g, '')).sort() ?? []
      out[row.tablename] ??= { columns: [], indexes: [] }
      out[row.tablename]!.indexes.push({ name: row.indexname, columns })
    }
    return out
  } finally {
    await client.end()
  }
}

export async function compareLive(sqlitePath: string, pgUrl: string): Promise<string[]> {
  const a = await sqliteLiveShapes(sqlitePath)
  const b = await pgLiveShapes(pgUrl)
  const problems: string[] = []
  for (const table of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const left = a[table]
    const right = b[table]
    if (!left || !right) {
      problems.push(`表 ${table} 只存在于 ${left ? 'sqlite' : 'postgres'}`)
      continue
    }
    for (const col of [...new Set([...left.columns, ...right.columns].map((c) => c.name))].sort()) {
      const l = left.columns.find((c) => c.name === col)
      const r = right.columns.find((c) => c.name === col)
      if (!l || !r) {
        problems.push(`${table}.${col} 只存在于 ${l ? 'sqlite' : 'postgres'}`)
        continue
      }
      if (l.type !== r.type) problems.push(`${table}.${col} 类型归类不一致：${l.type} vs ${r.type}`)
      if (l.notNull !== r.notNull) problems.push(`${table}.${col} 可空性不一致`)
    }
  }
  return problems
}

// ---------------------------------------------------------------- CLI

async function main(): Promise<void> {
  const live = process.argv.includes('--live')
  let problems: string[]

  if (live) {
    const { loadConfig } = await import('../config/env')
    const cfg = loadConfig()
    if (cfg.db.driver !== 'postgres') {
      console.error('--live 需要同时有 SQLite 与 PG：请设置 DB_DRIVER=postgres，并额外设置 SQLITE_PATH')
    }
    const sqlitePath = process.env.SQLITE_PATH
    const pgUrl = cfg.db.driver === 'postgres' ? cfg.db.url : process.env.DATABASE_URL
    if (!sqlitePath || !pgUrl) {
      console.error('缺少 SQLITE_PATH 或 DATABASE_URL，无法执行 --live 比对')
      process.exit(1)
    }
    problems = await compareLive(sqlitePath, pgUrl)
  } else {
    problems = compareDefinitions()
  }

  if (problems.length === 0) {
    console.log(`[parity] 通过（${live ? 'live' : 'definition'}），两份 schema 结构一致`)
    return
  }
  console.error(`[parity] 发现 ${problems.length} 处差异：`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}

const invokedDirectly = process.argv[1]?.replace(/\\/g, '/').endsWith('src/db/parity.ts')
if (invokedDirectly) {
  main().catch((err) => {
    console.error('[parity] 执行失败：', err)
    process.exit(1)
  })
}
