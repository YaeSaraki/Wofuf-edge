/**
 * HTTP 边界层 —— 对应 Kotlin 侧 `ApiResponse` + `BaseController`。
 *
 * 关键修复（原审计 S2）：Kotlin 侧全仓缺少 `@RestControllerAdvice`，
 * 所有业务错误在 HTTP 边界退化为 500；这里按错误码语义映射到 4xx。
 */
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { UseCaseError, type Result } from './result'

export type ApiResponse<T> = {
  success: boolean
  code: string | null
  data: T | null
  message: string | null
}

export const apiSuccess = <T>(data: T, message?: string): ApiResponse<T> => ({
  success: true,
  code: 'Success',
  data,
  message: message ?? 'Operation successful',
})

export const apiError = (error: UseCaseError): ApiResponse<null> => ({
  success: false,
  code: error.code,
  data: null,
  message: error.message,
})

/** 错误码 -> HTTP 状态码 */
export const statusFromCode = (code: string): number => {
  const upper = code.toUpperCase()
  if (upper.includes('NOT_FOUND')) return 404
  if (upper.includes('PERMISSION') || upper.includes('ADMIN') || upper.includes('FORBIDDEN')) return 403
  if (
    upper.includes('UNAUTHORIZED') ||
    upper.includes('AUTHENTICATION') ||
    upper.includes('TOKEN') ||
    upper.includes('SESSION') ||
    upper.includes('EXPIRED') ||
    upper.includes('REVOKED')
  )
    return 401
  if (upper.includes('DUPLICATE') || upper.includes('EXISTS') || upper.includes('CONFLICT')) return 409
  if (upper.includes('EMPTY') || upper.includes('INVALID') || upper.includes('REQUIRED') || upper.includes('FORMAT'))
    return 400
  if (upper.includes('RATE_LIMIT') || upper.includes('TOO_MANY')) return 429
  return 500
}

/**
 * 统一的用例执行包装：Result -> HTTP 响应。
 * 保持 Kotlin 侧 `useCase.execute(...).getOrThrow()` 的行为语义，但不再抛出未映射的异常。
 */
export const respond = <T>(c: Context, result: Result<T>, successMessage?: string): Response => {
  if (result.ok) {
    return c.json(apiSuccess(result.value, successMessage), 200)
  }
  return c.json(apiError(result.error), statusFromCode(result.error.code) as ContentfulStatusCode)
}
