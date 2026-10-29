import {cacheService} from '@S/infra/cache'

export interface IImageImportService {
  /**
   * 初始化图片资源扫描
   */
  init(): void

  /**
   * 获取图片URL
   * @param path 图片相对路径（相对于src目录）
   * @returns 图片URL
   */
  getImageUrl(path: string): string | null

  /**
   * 预加载图片
   * @param path 图片路径
   */
  preload(path: string): void

  /**
   * 批量预加载图片
   * @param paths 图片路径数组
   */
  preloadBatch(paths: string[]): void

  /**
   * 获取服务状态
   */
  getStatus(): {
    initialized: boolean
    totalImages: number
    lastInitTime?: number
  }

  /**
   * 获取所有图片路径
   */
  getAllImagePaths(): string[]

  /**
   * 根据关键词搜索图片
   */
  searchImages(keyword: string): string[]
}

export class ImageImportService implements IImageImportService {
  private static readonly MODULE_NAME = 'images'
  private initialized = false
  private lastInitTime?: number

  init(): void {
    if (this.initialized) return

    console.time('扫描图片资源')

    const imageModules = import.meta.glob('/src/**/*.{jpg,jpeg,png,gif,webp,svg}', {
      eager: true,
      query: {url: true},
      import: 'default',
    }) as Record<string, string>

    Object.entries(imageModules).forEach(([fullPath, url]) => {
      const relativeKey = fullPath.replace(/^\/src\//, '')
      // 使用新的缓存服务API
      cacheService.set(ImageImportService.MODULE_NAME, relativeKey, url)
    })

    this.initialized = true
    this.lastInitTime = Date.now()

    console.timeEnd('扫描图片资源')
    if (import.meta.env.DEV) {
      const totalImages = cacheService.getModuleSize(ImageImportService.MODULE_NAME)
      console.log('图片资源初始化完成，共找到', totalImages, '张图片')

      // 验证前几张图片
      const sampleKeys = Array.from(
        {length: Math.min(3, totalImages)},
        (_, i) => this.getAllImagePaths()[i],
      )

      console.log('样本验证：')
      sampleKeys.forEach((key) => {
        const url = cacheService.get<string>(ImageImportService.MODULE_NAME, key!)
        console.log(`  ${key}: ${url}`)
      })
    }
  }

  getImageUrl(path: string): string | null {
    if (!this.initialized) {
      this.init()
    }

    const url = cacheService.get<string>(ImageImportService.MODULE_NAME, path) || null
    if (import.meta.env.DEV && !url) {
      console.warn(`图片未找到：${path}`)
      const availableImages = this.getAllImagePaths()
      console.warn(
        `   可用图片（部分）：`,
        availableImages.filter((k) => k.includes(path.split('/')[0] || '')).slice(0, 5),
      )
    }

    return url
  }

  preload(path: string): void {
    const url = this.getImageUrl(path)
    if (url) {
      const img = new Image()
      img.src = url
    }
  }

  preloadBatch(paths: string[]): void {
    paths.forEach((path) => this.preload(path))
  }

  getStatus() {
    return {
      initialized: this.initialized,
      totalImages: cacheService.getModuleSize(ImageImportService.MODULE_NAME),
      lastInitTime: this.lastInitTime,
    }
  }

  getAllImagePaths(): string[] {
    return cacheService.getModuleKeys(ImageImportService.MODULE_NAME)
  }

  searchImages(keyword: string): string[] {
    // 简单的关键词搜索
    const allPaths = this.getAllImagePaths()
    return allPaths.filter((path) => path.toLowerCase().includes(keyword.toLowerCase()))
  }

  /**
   * 获取图片模块的所有条目（用于调试或导出）
   */
  getAllImageEntries(): Array<[string, string]> {
    return cacheService.getModuleEntries<string>(ImageImportService.MODULE_NAME)
  }

  /**
   * 清空图片缓存（谨慎使用）
   */
  clearCache(): void {
    cacheService.clearModule(ImageImportService.MODULE_NAME)
    this.initialized = false
    this.lastInitTime = undefined
  }
}

// 如果需要单例模式，可以导出单例实例
export const imageImportService = new ImageImportService()
