import type { FastifyInstance } from 'fastify'
import { ERROR_CODES } from '@ai-blog/shared'
import { AppError, normalizeDbError } from './errors'
import { fail } from './response'

interface ZodIssueLike {
  path: Array<string | number | symbol>
  message: string
}

/** 用结构判断而不是 instanceof：依赖树里出现两份 zod 时 instanceof 会失效 */
function zodIssuesOf(error: unknown): ZodIssueLike[] | null {
  const candidate = error as { name?: string; issues?: unknown }
  if (candidate?.name !== 'ZodError' || !Array.isArray(candidate.issues)) return null
  return candidate.issues as ZodIssueLike[]
}

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(fail(error.code, error.message, error.details))
    }

    const issues = zodIssuesOf(error)
    if (issues) {
      const details = issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      return reply.status(400).send(fail(ERROR_CODES.VALIDATION_ERROR, '请求参数不合法', details))
    }

    const dbError = normalizeDbError(error)
    if (dbError) {
      return reply.status(dbError.statusCode).send(fail(dbError.code, dbError.message))
    }

    // Fastify 自身的 4xx（如限流、body 解析失败）保留状态码，统一响应体
    const fastifyError = error as Error & { statusCode?: number }
    const statusCode = fastifyError.statusCode ?? 500
    if (statusCode === 429) {
      return reply.status(429).send(fail(ERROR_CODES.RATE_LIMITED, '请求过于频繁'))
    }
    if (statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send(fail(ERROR_CODES.VALIDATION_ERROR, fastifyError.message))
    }

    request.log.error({ err: error }, 'unhandled error')
    return reply.status(500).send(fail(ERROR_CODES.INTERNAL_ERROR, '服务器内部错误'))
  })

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(fail(ERROR_CODES.NOT_FOUND, `接口不存在：${request.method} ${request.url}`))
  })
}
