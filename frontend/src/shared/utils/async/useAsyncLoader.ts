import {onUnmounted, ref} from 'vue'

/**
 * 通用异步加载状态管理组合式函数
 * @returns 加载状态、错误信息、通用加载执行方法、取消请求方法
 */
export function useAsyncLoader() {
  // 通用加载状态
  const isLoading = ref(false)
  // 通用错误信息
  const errorMsg = ref<string | null>(null)
  // 取消请求控制器
  let abortController: AbortController | null = null

  /**
   * 执行异步操作的通用方法
   * @param asyncFn 要执行的异步函数（需接收 AbortSignal 参数）
   * @param errorTip 自定义错误提示文案
   * @returns 异步函数的返回值
   */
  async function executeAsync<T>(
    asyncFn: (signal: AbortSignal) => Promise<T>,
    errorTip = '操作失败，请稍后重试',
  ): Promise<T | null> {
    // 重置状态
    isLoading.value = true
    errorMsg.value = null

    // 取消上一次未完成的请求
    abortController?.abort()
    abortController = new AbortController()
    const signal = abortController.signal

    try {
      // 执行传入的异步函数并返回结果
      const result = await asyncFn(signal)
      return result
    } catch (err: any) {
      // 过滤取消请求的错误
      if (err?.name === 'AbortError' || err?.name === 'CanceledError') {
        console.debug('异步请求已取消')
        return null
      }
      // 捕获业务错误并设置提示
      console.error('异步操作失败:', err)
      errorMsg.value = err?.message || errorTip
      return null
    } finally {
      // 无论成功/失败，结束加载状态
      isLoading.value = false
    }
  }

  /**
   * 手动取消当前异步请求
   */
  function cancelAsync() {
    abortController?.abort()
    isLoading.value = false
  }

  // 组件卸载时自动取消请求，防止内存泄漏
  onUnmounted(() => {
    cancelAsync()
  })

  return {
    isLoading,
    errorMsg,
    executeAsync,
    cancelAsync,
  }
}
