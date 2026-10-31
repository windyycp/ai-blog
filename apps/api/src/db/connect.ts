import type { DbConfig } from '../config/env'
import { createSqlitePort } from './client.sqlite'
import { createPgPort } from './client.pg'
import type { DbPort } from './port'

/** 唯一工厂：DB_DRIVER 决定用哪套 client 与迁移目录 */
export function createDbPort(cfg: DbConfig): DbPort {
  return cfg.driver === 'sqlite'
    ? createSqlitePort(cfg.path)
    : createPgPort(cfg.url, cfg.poolMax)
}
