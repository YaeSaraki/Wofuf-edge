import {hasTranslation, translate} from '@S/services/i18n'

/**
 * API 错误的文案化
 *
 * 后端的错误响应是 `{success, code, data, message}`：`code` 是稳定的错误标识
 * （如 `TURNSTILE_REQUIRED_ERROR`），`message` 是中文原文。**前端要的是 code**——
 * message 是给人读的一句话，不该被拿来当判断依据，也不该被直接显示给英文界面。
 *
 * 这里做两级查找：
 *   1. 后端的 code → 全局文案（`app` 命名空间）。后端加新 code 时，
 *      前端在这里加一条映射即可，后端不用动。
 *   2. 没有 code（或 code 没登记）→ 调用方给的接口级兜底 key
 *      （`players` 命名空间，如 `error.player-profile`），
 *      用来区分「这个接口自己挂了」和「后端说的某种错」。
 *
 * 都没有就退回 code 原文 —— 至少比空白强。
 */

/** 后端错误码 → `app` 命名空间的文案 key */
const API_ERROR_KEYS: Record<string, string> = {
  TURNSTILE_REQUIRED_ERROR: 'error.turnstileRequired',
  TURNSTILE_FAILED_ERROR: 'error.turnstileFailed',
  NOT_FOUND_ERROR: 'error.notFound',
  INTERNAL_ERROR: 'error.internal',
}

/**
 * 把一次失败变成当前语言的文案。
 *
 * @param fallbackKey 接口级兜底 key（命名空间默认 `players`）
 * @param code        后端错误码（有就用它查全局映射）
 * @param namespace   兜底 key 所在命名空间
 */
export function formatApiError(
  fallbackKey: string,
  code?: string,
  namespace: string = 'players',
): string {
  if (code) {
    const globalKey = API_ERROR_KEYS[code]
    if (globalKey && hasTranslation('app', globalKey)) {
      return translate('app', globalKey)
    }
  }
  if (hasTranslation(namespace, fallbackKey)) {
    return translate(namespace, fallbackKey)
  }
  return code || fallbackKey
}

/** 从任意错误对象里取后端错误码（http.ts 会把 code 挂在 Error 上） */
export function errorCodeOf(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as {code?: unknown}).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}
