/**
 * web 容器启动后的自愈预热。
 *
 * 构建镜像时用的是临时空 sqlite 库，所以 /、/tags、/archive、/about 这些静态页
 * 会把「空状态」烘焙进产物；容器重启后 Full Route Cache 又回到构建期版本，
 * 于是首屏点击这些页面会看到空白，必须等 ISR 过期（60s ~ 1h）或手动刷新才恢复。
 *
 * 这里在 web 起来后主动失效一次 tag + 路径，并逐个请求把新内容生成出来，
 * 让重启后的第一次点击就是实时数据。失败只记日志，不影响服务启动。
 */

const BASE = process.env.WARMUP_BASE ?? 'http://127.0.0.1:3000'
const SECRET = process.env.REVALIDATE_SECRET

const TAGS = ['list', 'site', 'archive']
const PATHS = ['/', '/tags', '/archive', '/about', '/posts']

const log = (message) => console.log(`[warmup] ${message}`)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForServer(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/robots.txt`, { signal: AbortSignal.timeout(3000) })
      if (response.ok) return true
    } catch {
      // 还没监听，继续等
    }
    await sleep(1000)
  }

  return false
}

async function main() {
  if (!(await waitForServer())) {
    log('web 未在超时内就绪，跳过预热')
    return
  }

  if (!SECRET) {
    log('未配置 REVALIDATE_SECRET，跳过失效（静态页会沿用构建期内容直到 ISR 过期）')
    return
  }

  try {
    const response = await fetch(`${BASE}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-secret': SECRET },
      body: JSON.stringify({ tags: TAGS, paths: PATHS }),
      signal: AbortSignal.timeout(15_000),
    })
    log(`失效 tags=${TAGS.join(',')} paths=${PATHS.join(',')} → ${response.status}`)

    if (!response.ok) {
      log(`失效失败：${await response.text()}`)
      return
    }
  } catch (error) {
    log(`失效请求异常：${error.message}`)
    return
  }

  // 失效只标记过期，真正重新生成发生在下一次请求，所以这里把首屏页面逐个拉一遍
  for (const path of PATHS) {
    try {
      const response = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(30_000) })
      log(`预热 ${path} → ${response.status}`)
    } catch (error) {
      log(`预热 ${path} 失败：${error.message}`)
    }
  }

  log('完成')
}

main().catch((error) => log(`异常：${error.message}`))
