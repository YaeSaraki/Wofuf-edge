/**
 * Cloudflare Turnstile（人机验证）
 *
 * 用途：Worker 侧的 API 是公开只读的接口，Turnstile 用来把爬虫挡在外面——
 * 前端拿到一个一次性令牌，Worker 用 secret 校验它。
 *
 * **没有配置 sitekey 就整套不启用**：前端不会带令牌，Worker 也不会校验，
 * 所以本地开发、预览环境都可以照常跑。
 *
 * ## 两个容易踩的时序坑（这里都处理了）
 *
 * 1. **不能在脚本加载完就 render**：Turnstile 官方要求用 `?onload=回调` 或
 *    `turnstile.ready()` 之后才能渲染，否则 render 会被静默忽略 → 永远拿不到令牌。
 * 2. **令牌是一次性的**：服务端只能校验一次，所以这里缓存住它给一串请求复用（4 分钟）。
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

/** Turnstile 令牌有效期 5 分钟，这里留 1 分钟余量提前换掉 */
const TOKEN_TTL_MS = 4 * 60 * 1000

/**
 * 单次请求最多为令牌等这么久。
 *
 * Turnstile 的 managed 模式**经常需要用户点一下复选框**，几秒是等不出来的；
 * 这里给到 60 秒，足够人点完。（必须小于 axios 的超时）
 */
const TOKEN_WAIT_MS = 60_000

/** 官方推荐的 onload 回调名 */
const ONLOAD_CALLBACK = '__wofufTurnstileOnload'

interface TurnstileApi {
  ready?: (cb: () => void) => void
  render: (container: HTMLElement | string, options: Record<string, unknown>) => string
  reset?: (widgetId?: string) => void
  remove?: (widgetId?: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptPromise: Promise<void> | null = null
let tokenPromise: Promise<string | null> | null = null
let currentToken: string | null = null
let tokenIssuedAt = 0

export const isTurnstileEnabled = (): boolean => Boolean(SITE_KEY)

const loadScript = (): Promise<void> => {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    // 官方推荐：把 onload 回调名传给脚本，脚本就绪时回调它
    const globals = window as unknown as Record<string, unknown>
    globals[ONLOAD_CALLBACK] = () => resolve()

    const script = document.createElement('script')
    script.src = `https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=${ONLOAD_CALLBACK}`
    script.async = true
    script.defer = true
    // onload 回调没触发时的兜底
    script.onload = () => resolve()
    script.onerror = () =>
      reject(new Error('Turnstile 脚本加载失败（可能被广告拦截器、隐私插件或网络挡住）'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

/**
 * 拿到一个可用的令牌。
 *
 * 令牌是一次性的（服务端只能校验一次），所以这里缓存住它、给这一串请求复用；
 * 过期了再换新的。
 */
export const ensureTurnstileToken = async (): Promise<string | null> => {
  if (!SITE_KEY) return null
  if (currentToken && Date.now() - tokenIssuedAt < TOKEN_TTL_MS) return currentToken
  if (tokenPromise) return tokenPromise

  tokenPromise = (async () => {
    try {
      await loadScript()
      return await new Promise<string | null>((resolve) => {
        const container = document.createElement('div')
        container.style.position = 'fixed'
        container.style.right = '16px'
        container.style.bottom = '16px'
        container.style.zIndex = '9999'
        container.style.display = 'flex'
        container.style.flexDirection = 'column'
        container.style.alignItems = 'flex-end'
        container.style.gap = '6px'

        // 一句人话提示：否则用户根本不知道右下角那个小方块是要点的东西
        const hint = document.createElement('div')
        hint.textContent = '人机验证：请点击下方复选框'
        hint.style.fontSize = '12px'
        hint.style.padding = '4px 8px'
        hint.style.borderRadius = '6px'
        hint.style.background = 'rgba(0,0,0,.72)'
        hint.style.color = '#fff'
        container.appendChild(hint)

        document.body.appendChild(container)
        console.info('[turnstile] 等待人机验证令牌（右下角可能有需要点击的复选框）…')

        const finish = (token: string | null) => {
          container.remove()
          resolve(token)
        }

        const start = () => {
          const api = window.turnstile
          if (!api) {
            console.warn('[turnstile] window.turnstile 不存在，脚本可能没加载成功')
            finish(null)
            return
          }
          try {
            api.render(container, {
              sitekey: SITE_KEY,
              // 交互式执行：需要人操作时弹出复选框
              execution: 'execute',
              // 始终可见：用户得看得见才能点（interaction-only 在很多场景下根本不会出现）
              appearance: 'always',
              callback: (token: string) => {
                currentToken = token
                tokenIssuedAt = Date.now()
                console.info('[turnstile] 拿到令牌')
                hint.remove()
                finish(token)
              },
              'expired-callback': () => {
                currentToken = null
                finish(null)
              },
              'error-callback': (code?: string) => {
                // 最常见的是 invalid-domain：widget 的 Hostnames 里没有当前域名。
                console.warn(
                  `[turnstile] 验证失败（${code ?? '未知'}）—— 检查 widget 的 Hostnames 是否包含当前域名`,
                )
                finish(null)
              },
            })
          } catch (error) {
            console.warn('[turnstile] 渲染组件失败：', error)
            finish(null)
          }
        }

        // 官方时序：等 Turnstile 真正就绪再 render
        const ready = window.turnstile
        if (typeof ready?.ready === 'function') {
          ready.ready(start)
        } else {
          start()
        }

        // 兜底：不让一个请求无限期地等在验证上。
        // 上限必须小于 axios 的超时，否则是「请求超时」而不是「令牌没拿到」。
        window.setTimeout(() => {
          if (currentToken) {
            hint.remove()
            finish(currentToken)
            return
          }
          console.warn('[turnstile] 等待超时，没有拿到令牌')
          // 提示**留在页面上**：它得让用户看见，否则失败就是静默的
          hint.textContent = '人机验证未完成（可能需要点击复选框，或脚本被拦截器挡了）'
          hint.style.background = 'rgba(180,40,40,.92)'
          finish(null)
        }, TOKEN_WAIT_MS)
      })
    } catch (error) {
      console.warn('[turnstile] 获取令牌失败：', error)
      // 页面留一条提示：脚本被拦截器挡掉时，只有这里能看出原因
      const banner = document.createElement('div')
      banner.textContent = '人机验证脚本加载失败（可能被广告拦截器或网络挡住）'
      banner.style.cssText =
        'position:fixed;right:16px;bottom:16px;z-index:9999;font-size:12px;padding:4px 8px;' +
        'border-radius:6px;background:rgba(180,40,40,.92);color:#fff'
      document.body.appendChild(banner)
      return null
    } finally {
      tokenPromise = null
    }
  })()

  return tokenPromise
}
