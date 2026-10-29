// 确保 base64 字符串格式正确
export function addImagePrefixToBase64(base64: string): string {
  // 如果已经是 data:image 格式，直接返回
  if (base64.startsWith('data:image')) {
    return base64
  }
  // 否则假定是 PNG 格式并添加前缀
  return `data:image/png;base64,${base64}`
}
