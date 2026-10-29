/**
 * Result / UseCaseError —— 对应 Kotlin 侧 `dev.saraki.wofuf.shared.core.Result` 与 `UseCaseError`。
 *
 * 保留「用例返回 Result、边界层转 HTTP」的约定，避免业务错误退化成 500。
 */
export class UseCaseError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'UseCaseError'
    this.code = code
  }
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: UseCaseError }

export const Ok = <T>(value: T): Result<T> => ({ ok: true, value })

export const Err = <T = never>(code: string, message: string): Result<T> => ({
  ok: false,
  error: new UseCaseError(code, message),
})

export const isOk = <T>(result: Result<T>): result is { ok: true; value: T } => result.ok

export const unwrap = <T>(result: Result<T>): T => {
  if (result.ok) return result.value
  throw result.error
}
