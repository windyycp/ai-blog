import { ERROR_CODES, type ErrorCode } from '@ai-blog/shared'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: ErrorCode
  readonly details?: unknown

  constructor(code: ErrorCode, message: string, statusCode: number, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }

  static validation(message = '请求参数不合法', details?: unknown): AppError {
    return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400, details)
  }

  static notFound(message = '资源不存在'): AppError {
    return new AppError(ERROR_CODES.NOT_FOUND, message, 404)
  }

  static conflict(message = '数据冲突'): AppError {
    return new AppError(ERROR_CODES.CONFLICT, message, 409)
  }

  static internal(message = '服务器内部错误'): AppError {
    return new AppError(ERROR_CODES.INTERNAL_ERROR, message, 500)
  }
}

/** 方言错误码归一：唯一约束冲突在两侧都映射成 409 */
export function normalizeDbError(error: unknown): AppError | null {
  const code = (error as { code?: unknown })?.code
  if (typeof code !== 'string') return null
  if (code === '23505' || code.startsWith('SQLITE_CONSTRAINT')) return AppError.conflict()
  return null
}
