export async function renderAvatar(skinUrlOrBase64: string, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      reject(new Error('Canvas context not supported'))
      return
    }

    const image = new Image()
    image.crossOrigin = 'anonymous' // 如果从其他域名加载图片

    image.onload = () => {
      ctx.imageSmoothingEnabled = false
      // 绘制头部正面（8,8,8,8）
      ctx.drawImage(image, 8, 8, 8, 8, 0, 0, size, size)
      // 绘制头部侧面（40,8,8,8）
      ctx.drawImage(image, 40, 8, 8, 8, 0, 0, size, size)

      // 转换为 base64 或 blob
      const dataUrl = canvas.toDataURL('image/png')
      resolve(dataUrl)
    }

    image.onerror = () => {
      reject(new Error('Failed to load image'))
    }

    // 如果是纯 base64 字符串（不以 data: 开头），添加前缀
    if (skinUrlOrBase64.startsWith('data:')) {
      image.src = skinUrlOrBase64
    } else {
      image.src = `data:image/png;base64,${skinUrlOrBase64}`
    }
  })
}
