import axios from 'axios'
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { ensureTurnstileToken } from '@S/turnstile/turnstile.ts'
import { translate } from '@S/services/i18n'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  // 令牌等待最多 60s（见 turnstile.ts，用户可能要点复选框），留够请求本身的时间
  timeout: 75_000,
})

// 带上 Turnstile 令牌（没配置 sitekey 时是 no-op）
http.interceptors.request.use(async (config) => {
  const token = await ensureTurnstileToken()
  if (token) {
    config.headers.set('CF-Turnstile-Response', token)
  }
  return config
})

/**
 * The API answers JSON, always.
 *
 * When `VITE_API_BASE_URL` is empty the requests are relative, and a relative `/api/v1/...`
 * that lands on a static host comes back as the SPA's `index.html` instead of JSON. The old
 * behaviour turned that into an unreadable `InvalidOperation` deep inside the Result type;
 * this says what actually happened.
 */
const isApiCall = (response: AxiosResponse): boolean =>
  response.config.url?.includes('/api/') ?? false

http.interceptors.response.use(
  (response) => {
    if (isApiCall(response) && (typeof response.data !== 'object' || response.data === null)) {
      throw new Error(
        translate('app', 'error.apiNotJson', {url: response.config.url ?? ''}),
      )
    }
    return response
  },
  async (error: AxiosError) => {
    const data = error.response?.data
    const envelope = data as { success?: boolean; code?: string; message?: string } | undefined

    // 缺令牌 → 等用户点完右下角的复选框 → 自动重试一次。
    // 用户不需要手动刷新页面，点完复选框数据自己就出来了。
    if (
      error.response?.status === 403 &&
      envelope?.code === 'TURNSTILE_REQUIRED_ERROR' &&
      !(error.config as (InternalAxiosRequestConfig & { __turnstileRetried?: boolean }) | undefined)
        ?.__turnstileRetried
    ) {
      const token = await ensureTurnstileToken()
      if (token) {
        const config = error.config as (InternalAxiosRequestConfig & { __turnstileRetried?: boolean }) | undefined
        if (config) {
          config.__turnstileRetried = true
          config.headers.set('CF-Turnstile-Response', token)
          return http.request(config)
        }
      }
    }

    if (error.response && (typeof data !== 'object' || data === null)) {
      return Promise.reject(
        new Error(
          translate('app', 'error.apiRequestFailed', {
            status: error.response.status,
            url: error.config?.url ?? '',
          }),
        ),
      )
    }
    // 后端返回的是 {success, code, data, message}：把它的 message 透出来，
    // 否则用户只会看到 "Request failed with status code 403" 这种没有信息量的话。
    // message 是中文原文，只适合当兜底；**code 才是能翻译的东西**，所以一起挂上去。
    if (envelope && typeof envelope.message === 'string' && envelope.message.length > 0) {
      const failure = new Error(envelope.message)
      if (typeof envelope.code === 'string') {
        ;(failure as Error & {code?: string}).code = envelope.code
      }
      return Promise.reject(failure)
    }
    return Promise.reject(error)
  },
)

if (!import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '[http] VITE_API_BASE_URL 为空：请求会走相对路径 /api/v1/**。' +
      '只有前端与 API 同域时才对；分开部署请在构建时设置 API_BASE_URL。',
  )
}

