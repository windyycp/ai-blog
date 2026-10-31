import { loadConfig } from './config/env'
import { buildApp } from './app'

const config = loadConfig()
const app = await buildApp(config)

let closing = false
async function shutdown(signal: string): Promise<void> {
  if (closing) return
  closing = true
  app.log.info({ signal }, '开始优雅关闭')
  try {
    await app.close()
    process.exit(0)
  } catch (error) {
    app.log.error({ err: error }, '关闭时出错')
    process.exit(1)
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => void shutdown(signal))
}

try {
  await app.listen({ host: config.host, port: config.port })
} catch (error) {
  app.log.error({ err: error }, '启动失败')
  process.exit(1)
}
