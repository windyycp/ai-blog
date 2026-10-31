import type { AppConfig } from '../config/env'
import type { DbPort } from '../db/port'

declare module 'fastify' {
  interface FastifyInstance {
    /** 由 buildApp 注入，路由中直接取用，避免每个模块自己 new 连接 */
    db: DbPort
    config: AppConfig
  }
}
