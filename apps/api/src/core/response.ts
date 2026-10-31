import type { ApiFailure, ApiSuccess, PageMeta } from '@ai-blog/shared'
import type { ErrorCode } from '@ai-blog/shared'

export function ok<T>(data: T, meta?: PageMeta): ApiSuccess<T> {
  return meta ? { success: true, data, meta } : { success: true, data }
}

export function fail(code: ErrorCode, message: string, details?: unknown): ApiFailure {
  return { success: false, error: details === undefined ? { code, message } : { code, message, details } }
}
