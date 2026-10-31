import 'dotenv/config'
import { resolve } from 'node:path'
import { z } from 'zod'

const rawSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(120),
  SITE_URL: z.string().url().default('http://localhost:3000'),

  DB_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),
  SQLITE_PATH: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  PG_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  ALLOW_SQLITE_IN_PROD: z.enum(['true', 'false']).optional(),
})

export type DbConfig =
  | { driver: 'sqlite'; path: string }
  | { driver: 'postgres'; url: string; poolMax: number }

export interface AppConfig {
  env: 'development' | 'test' | 'production'
  host: string
  port: number
  logLevel: z.infer<typeof rawSchema>['LOG_LEVEL']
  corsOrigins: string[]
  rateLimitMax: number
  siteUrl: string
  db: DbConfig
}

function fail(message: string): never {
  throw new Error(`环境变量配置错误：${message}`)
}

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = rawSchema.safeParse(source)
  if (!parsed.success) {
    fail(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '))
  }
  const env = parsed.data

  let db: DbConfig
  if (env.DB_DRIVER === 'sqlite') {
    if (!env.SQLITE_PATH) fail('DB_DRIVER=sqlite 时必须提供 SQLITE_PATH')
    if (env.DATABASE_URL) fail('DB_DRIVER=sqlite 时不应提供 DATABASE_URL（两者混配）')
    db = { driver: 'sqlite', path: resolve(process.cwd(), env.SQLITE_PATH) }
  } else {
    if (!env.DATABASE_URL) fail('DB_DRIVER=postgres 时必须提供 DATABASE_URL')
    if (!/^postgres(ql)?:\/\//.test(env.DATABASE_URL)) {
      fail('DATABASE_URL 必须以 postgres:// 或 postgresql:// 开头')
    }
    if (env.SQLITE_PATH) fail('DB_DRIVER=postgres 时不应提供 SQLITE_PATH（两者混配）')
    db = { driver: 'postgres', url: env.DATABASE_URL, poolMax: env.PG_POOL_MAX }
  }

  // 生产护栏：防止本地 SQLite 配置被误带进线上
  if (env.NODE_ENV === 'production' && db.driver === 'sqlite' && env.ALLOW_SQLITE_IN_PROD !== 'true') {
    fail('生产环境禁止使用 SQLite；如确需临时绕过，显式设置 ALLOW_SQLITE_IN_PROD=true')
  }

  return {
    env: env.NODE_ENV,
    host: env.HOST,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    rateLimitMax: env.RATE_LIMIT_MAX,
    siteUrl: env.SITE_URL,
    db,
  }
}
