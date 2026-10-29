export type CacheKey = string

/**
 * 分类缓存服务 - 按功能模块管理缓存
 */
export class CacheService {
  // 单例实例
  private static instance: CacheService

  // 按模块存储Map：Map<模块名, Map<key, value>>
  private moduleCaches = new Map<string, Map<CacheKey, unknown>>()

  // 模块缓存上限（key: 模块名, value: 最大缓存数量）
  private moduleMaxSizes = new Map<string, number>()

  // 全局默认缓存上限（未配置单独上限的模块，使用此值）
  private globalDefaultMaxSize = 300

  // 存储结构：Map<模块名, Map<缓存key, 最后访问时间戳>>
  private moduleAccessTime = new Map<string, Map<CacheKey, number>>()

  // 存储正在进行的请求：Map<模块名, Map<请求key, Promise>>
  private pendingRequests = new Map<string, Map<CacheKey, Promise<unknown>>>()

  /**
   * 设置单个模块的缓存上限（不强制业务调用，使用全局默认也可）
   * @param module 功能模块名称
   * @param maxSize 最大缓存数量
   */
  setModuleMaxSize(module: string, maxSize: number): void {
    if (maxSize > 0) {
      this.moduleMaxSizes.set(module, maxSize)
      // 设置上限后，立即触发一次清理（防止当前模块已超限）
      this.cleanModuleIfOverLimit(module)
    }
  }

  /**
   * 设置全局默认缓存上限
   * @param defaultMaxSize 全局默认最大缓存数量
   */
  setGlobalDefaultMaxSize(defaultMaxSize: number): void {
    if (defaultMaxSize > 0) {
      this.globalDefaultMaxSize = defaultMaxSize
      // 全局上限变更后，清理所有超限模块（可选，根据业务需求决定）
      this.getAllModules().forEach(module => this.cleanModuleIfOverLimit(module))
    }
  }

  /**
   * 设置缓存值
   * @param module 功能模块名称
   * @param key 缓存键
   * @param value 缓存值
   */
  set<V>(module: string, key: CacheKey, value: V): void {
    let moduleCache = this.moduleCaches.get(module)
    if (!moduleCache) {
      moduleCache = new Map<CacheKey, unknown>()
      this.moduleCaches.set(module, moduleCache)
    }
    moduleCache.set(key, value)
    this.updateAccessTime(module, key)
    this.cleanModuleIfOverLimit(module)
  }

  /**
   * 获取缓存值
   * @param module 功能模块名称
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get<V>(module: string, key: CacheKey): V | undefined {
    const moduleCache = this.moduleCaches.get(module)
    if (!moduleCache) return undefined
    // 步骤1：更新访问时间（新增，读取也算访问）
    this.updateAccessTime(module, key)
    // 步骤2：返回缓存值（原有逻辑不变）
    return moduleCache.get(key) as V | undefined
  }

  /**
   * 检查缓存是否存在
   * @param module 功能模块名称
   * @param key 缓存键
   */
  has(module: string, key: CacheKey): boolean {
    const moduleCache = this.moduleCaches.get(module)
    // 可选：检查存在性是否算「访问」，根据业务需求决定（这里不更新，避免无意义的访问记录）
    return moduleCache ? moduleCache.has(key) : false
  }

  /**
   * 删除缓存
   * @param module 功能模块名称
   * @param key 缓存键
   */
  delete(module: string, key: CacheKey): boolean {
    const moduleCache = this.moduleCaches.get(module)
    const accessTimeMap = this.moduleAccessTime.get(module)
    // 步骤1：删除访问时间记录（新增）
    accessTimeMap?.delete(key)
    // 步骤2：删除缓存（原有逻辑不变）
    return moduleCache ? moduleCache.delete(key) : false
  }

  /**
   * 获取整个模块的Map
   */
  getModule<V>(module: string): Map<CacheKey, V> | undefined {
    return this.moduleCaches.get(module) as Map<CacheKey, V> | undefined
  }

  /**
   * 获取或创建模块Map
   */
  getOrCreateModule<V>(module: string): Map<CacheKey, V> {
    let moduleCache = this.moduleCaches.get(module) as Map<CacheKey, V> | undefined
    if (!moduleCache) {
      moduleCache = new Map<CacheKey, V>()
      this.moduleCaches.set(module, moduleCache as Map<CacheKey, unknown>)
    }
    return moduleCache
  }

  /**
   * 清空模块所有缓存
   */
  clearModule(module: string): boolean {
    const moduleCache = this.moduleCaches.get(module)
    const accessTimeMap = this.moduleAccessTime.get(module)
    // 步骤1：清空访问时间记录（新增）
    accessTimeMap?.clear()
    // 步骤2：清空缓存（原有逻辑不变）
    if (moduleCache) {
      moduleCache.clear()
      return true
    }
    return false
  }

  /**
   * 删除整个模块
   */
  deleteModule(module: string): boolean {
    // 步骤1：删除访问时间记录（新增）
    this.moduleAccessTime.delete(module)
    this.moduleMaxSizes.delete(module) // 同时删除模块单独上限配置
    // 步骤2：删除缓存（原有逻辑不变）
    return this.clearModule(module) && this.moduleCaches.delete(module)
  }

  /**
   * 批量设置缓存
   */
  setBatch<V>(module: string, items: Array<[CacheKey, V]>): void {
    const moduleCache = this.getOrCreateModule<V>(module)
    // 步骤1：批量设置缓存（原有逻辑不变）
    items.forEach(([key, value]) => {
      moduleCache.set(key, value)
      // 步骤2：更新每条数据的访问时间（新增）
      this.updateAccessTime(module, key)
    })
    // 步骤3：检查并清理超限数据（新增，对外无感知）
    this.cleanModuleIfOverLimit(module)
  }

  /**
   * 批量获取缓存
   */
  getBatch<V>(module: string, keys: CacheKey[]): Map<CacheKey, V | undefined> {
    const result = new Map<CacheKey, V | undefined>()
    const moduleCache = this.moduleCaches.get(module)

    if (moduleCache) {
      keys.forEach(key => {
        // 步骤1：更新访问时间（新增）
        this.updateAccessTime(module, key)
        // 步骤2：设置返回结果（原有逻辑不变）
        result.set(key, moduleCache.get(key) as V | undefined)
      })
    } else {
      keys.forEach(key => {
        result.set(key, undefined)
      })
    }

    return result
  }

  /**
   * 清空所有模块的所有缓存
   */
  clearAll(): void {
    // 步骤1：清空所有访问时间记录（新增）
    this.moduleAccessTime.clear()
    // 步骤2：清空所有缓存（原有逻辑不变）
    this.moduleCaches.forEach(moduleCache => {
      moduleCache.clear()
    })
  }

  /**
   * 删除所有模块
   */
  deleteAll(): void {
    // 步骤1：清空所有辅助数据（新增）
    this.moduleAccessTime.clear()
    this.moduleMaxSizes.clear()
    // 步骤2：删除所有缓存（原有逻辑不变）
    this.clearAll()
    this.moduleCaches.clear()
  }

  /**
   * 获取所有模块名称
   */
  getAllModules(): string[] {
    return Array.from(this.moduleCaches.keys())
  }

  /**
   * 获取模块大小（缓存数量）
   */
  getModuleSize(module: string): number {
    const moduleCache = this.moduleCaches.get(module)
    return moduleCache ? moduleCache.size : 0
  }

  /**
   * 获取所有模块的统计信息
   */
  getStats(): Array<{
    module: string
    size: number
    keys: CacheKey[]
  }> {
    const stats: Array<{
      module: string
      size: number
      keys: CacheKey[]
    }> = []

    this.moduleCaches.forEach((moduleCache, module) => {
      stats.push({
        module,
        size: moduleCache.size,
        keys: Array.from(moduleCache.keys())
      })
    })

    return stats
  }

  // ============ 查询和统计（原有逻辑不变，无需改动） ============

  /**
   * 获取模块的所有键
   */
  getModuleKeys(module: string): CacheKey[] {
    const moduleCache = this.moduleCaches.get(module)
    return moduleCache ? Array.from(moduleCache.keys()) : []
  }

  /**
   * 获取模块的所有值
   */
  getModuleValues<V>(module: string): V[] {
    const moduleCache = this.moduleCaches.get(module)
    if (!moduleCache) return []

    return Array.from(moduleCache.values()) as V[]
  }

  /**
   * 获取模块的所有条目
   */
  getModuleEntries<V>(module: string): Array<[CacheKey, V]> {
    const moduleCache = this.moduleCaches.get(module)
    if (!moduleCache) return []

    return Array.from(moduleCache.entries()) as Array<[CacheKey, V]>
  }

  /**
   * 搜索模块中符合条件的缓存
   */
  search<V>(
    module: string,
    predicate: (value: V, key: CacheKey) => boolean
  ): Array<[CacheKey, V]> {
    const entries = this.getModuleEntries<V>(module)
    return entries.filter(([key, value]) => predicate(value, key))
  }

  /**
   * 获取模块的缓存上
   */
  private getModuleMaxSize(module: string): number {
    return this.moduleMaxSizes.get(module) || this.globalDefaultMaxSize
  }

  /**
   * 更新缓存的最后访问时间（所有读取/写入操作都要更新）
   */
  private updateAccessTime(module: string, key: CacheKey): void {
    let accessTimeMap = this.moduleAccessTime.get(module)
    if (!accessTimeMap) {
      accessTimeMap = new Map<CacheKey, number>()
      this.moduleAccessTime.set(module, accessTimeMap)
    }
    accessTimeMap.set(key, Date.now())
  }

  // ============ 搜索功能（原有逻辑不变，无需改动） ============

  /**
   * 模块缓存超限清理（LRU 策略）
   */
  private cleanModuleIfOverLimit(module: string): void {
    const moduleCache = this.moduleCaches.get(module)
    const accessTimeMap = this.moduleAccessTime.get(module)
    if (!moduleCache || moduleCache.size === 0) return

    const maxSize = this.getModuleMaxSize(module)
    const currentSize = moduleCache.size

    if (currentSize <= maxSize) return

    const needDeleteCount = currentSize - maxSize
    if (needDeleteCount <= 0) return

    const sortedKeys = Array.from(moduleCache.keys())
      .map(key => ({
        key,
        time: accessTimeMap?.get(key) || 0 // 无访问时间的视为最旧
      }))
      .sort((a, b) => a.time - b.time) // 旧的在前，新的在后

    sortedKeys.slice(0, needDeleteCount).forEach(item => {
      moduleCache.delete(item.key)
      accessTimeMap?.delete(item.key)
    })
  }

  /**
   * 执行带有缓存和请求去重的异步操作
   * @param module 功能模块名称
   * @param key 缓存键
   * @param fetcher 异步获取数据的函数
   * @returns 操作结果
   */
  async withCacheAndDeduplication<V>(module: string, key: CacheKey, fetcher: () => Promise<V>): Promise<V> {
    // 1. 尝试从缓存获取
    const cached = this.get<V>(module, key)
    if (cached !== undefined) {
      return cached
    }

    // 2. 获取或创建模块的请求Map
    let moduleRequests = this.pendingRequests.get(module)
    if (!moduleRequests) {
      moduleRequests = new Map<CacheKey, Promise<unknown>>()
      this.pendingRequests.set(module, moduleRequests)
    }

    // 3. 检查是否已有相同的请求正在进行
    if (moduleRequests.has(key)) {
      // 如果有，等待该请求完成
      return moduleRequests.get(key) as Promise<V>
    }

    // 4. 创建新的请求
    const request = fetcher()

    // 5. 存储正在进行的请求
    moduleRequests.set(key, request)

    try {
      // 6. 执行请求
      const result = await request
      // 7. 缓存结果
      this.set(module, key, result)
      return result
    } finally {
      // 8. 无论成功失败，都移除正在进行的请求
      moduleRequests.delete(key)
      // 如果模块的请求Map为空，清理掉
      if (moduleRequests.size === 0) {
        this.pendingRequests.delete(module)
      }
    }
  }
}
