/**
 * UUID v7（时间有序）—— 对应 Kotlin 侧 `Uuid7Util`。
 * 时间有序可让 D1 的主键插入顺序接近写入顺序，减少 B-tree 页分裂。
 */
export const uuidv7 = (now: number = Date.now()): string => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  const ms = BigInt(now)
  bytes[0] = Number((ms >> 40n) & 0xffn)
  bytes[1] = Number((ms >> 32n) & 0xffn)
  bytes[2] = Number((ms >> 24n) & 0xffn)
  bytes[3] = Number((ms >> 16n) & 0xffn)
  bytes[4] = Number((ms >> 8n) & 0xffn)
  bytes[5] = Number(ms & 0xffn)

  // version 7
  bytes[6] = 0x70 | (bytes[6]! & 0x0f)
  // variant
  bytes[8] = 0x80 | (bytes[8]! & 0x3f)

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
