<script lang="ts" setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import type { Player } from '@M/players/dtos/Player.ts'
import { PlayerService } from '@M/players/services/PlayerService.ts'
import { useAsyncLoader } from '@SU/async/useAsyncLoader.ts'
import { Render, WalkingAnimation } from 'skin3d'
import type { PlayerSkin } from '@M/players/dtos/PlayerSkin.ts'
import { translate } from '@S/services/i18n'
import { addImagePrefixToBase64 } from '@SU/Base64Util.ts'

const props = defineProps<{ player: Player | null }>()
const playerService = new PlayerService()
const hasSkinViewerResizeListener = ref(false)

/* ---------------- 复用通用加载逻辑 ---------------- */
const { isLoading, errorMsg, executeAsync } = useAsyncLoader()
/* ---------------- 获取玩家皮肤 ---------------- */

const playerSkin = ref<PlayerSkin | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
let viewer: Render | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

// 监听玩家变化，重新获取皮肤
watch(
  () => props.player?.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      await fetchPlayerSkin()
    } else if (!newId) {
      // 如果没有玩家ID，清除皮肤
      playerSkin.value = null
      destroyViewer()
    }
  },
  { immediate: true },
)

// 监听皮肤数据变化，初始化/更新查看器
watch(playerSkin, (newSkin) => {
  if (newSkin) {
    nextTick(() => {
      initOrUpdateViewer(newSkin)
    })
  } else {
    destroyViewer()
  }
})

async function fetchPlayerSkin() {
  if (!props.player?.id) {
    playerSkin.value = null
    return
  }
  try {
    const playerSkinData = await executeAsync(async (signal) => {
      const apiResult = await playerService.getPlayerSkin(props.player!.id, { signal })
      if (apiResult.isSuccess) {
        return apiResult.getValue()
      }
      throw new Error('玩家皮肤获取失败')
    }, '获取玩家皮肤失败')

    playerSkin.value = playerSkinData || null
  } catch (error) {
    console.error('获取玩家皮肤异常：', error)
    playerSkin.value = null
  }
}

/* ---------------- 3D皮肤展示 ---------------- */
function getOptimalDimensions() {
  if (window.innerWidth < 768) {
    return {
      width: Math.min(window.innerWidth * 0.3, 300),
      height: Math.min(window.innerWidth * 0.6, 600),
      quality: window.devicePixelRatio || 1,
    }
  }
  return {
    width: Math.min(window.innerWidth * 0.1, 200),
    height: Math.min(window.innerWidth * 0.2, 400),
    quality: 1,
  }
}

const dims = getOptimalDimensions()

function initOrUpdateViewer(skinData: PlayerSkin) {
  if (!canvas.value) {
    console.error('Canvas element not found')
    return
  }

  if (viewer) {
    // 更新现有查看器
    viewer.setSize(dims.width, dims.height)
    viewer.loadSkin(skinData.skin || '')
    if (skinData.cape) {
      viewer.loadCape(skinData.cape)
    }
  } else {
    // 创建新查看器
    viewer = new Render({
      canvas: canvas.value,
      width: dims.width,
      height: dims.height,
      skin: addImagePrefixToBase64(skinData.skin || ''),
      cape: addImagePrefixToBase64(skinData.cape || ''),
    })

    viewer.animation = new WalkingAnimation()
    viewer.animation.speed = 0.5

    // 确保事件监听只添加一次
    if (!hasSkinViewerResizeListener.value) {
      window.addEventListener('resize', onResize)
      hasSkinViewerResizeListener.value = true
    }
  }
}

function resizeViewer() {
  if (!viewer || !canvas.value) return

  const dims = getOptimalDimensions()
  viewer.setSize(dims.width, dims.height)
}

function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(resizeViewer, 150)
}

function destroyViewer() {
  if (viewer) {
    viewer.dispose()
    viewer = null
  }
}

// 清理函数
function cleanup() {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

  destroyViewer()

  // 移除全局事件监听
  if (hasSkinViewerResizeListener.value) {
    window.removeEventListener('resize', onResize)
    hasSkinViewerResizeListener.value = false
  }
}

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <div v-if="isLoading" class="bf-loading">
    <div class="bf-loading__spinner"></div>
  </div>
  <div v-else-if="errorMsg" class="bf-error">
    {{ errorMsg }}
  </div>
  <div v-else-if="player" class="bf-player-profile">
    <!-- 玩家名称 -->
    <h2 class="bf-player-name">
      {{ player.name }}
    </h2>

    <!-- 3D皮肤展示 -->
    <div class="bf-skin-viewer">
      <canvas ref="canvas" :height="dims.height" :width="dims.width" class="bf-skin-canvas" />
    </div>

    <!-- 信息面板 -->
    <div class="bf-info-grid">
      <!-- 游玩时长 -->
      <div class="bf-info-card">
        <p class="bf-info-label">
          {{ translate('players', 'player.playtime') }}
        </p>
        <p class="bf-info-value">
          {{ (player.totalPlaytimeSeconds / (20 * 60 * 60)).toFixed(1) }} h
        </p>

        <!-- 上次游玩 -->
        <p class="bf-info-label">
          {{ translate('players', 'player.last-login') }}
        </p>
        <p class="bf-info-value">
          {{ new Date(player.lastLogin).toLocaleString().split(',')[0] }}
        </p>

        <!-- 注册时间 -->
        <p class="bf-info-label">
          {{ translate('players', 'player.register-time') }}
        </p>
        <p class="bf-info-value">
          {{ new Date(player.firstLogin).toLocaleString().split(',')[0] }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 加载状态 */
.bf-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
}

.bf-loading__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--bf-border-default);
  border-top-color: var(--bf-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 错误状态 */
.bf-error {
  text-align: center;
  color: #ef4444;
  padding: var(--bf-space-lg, 24px);
}

/* 玩家资料容器 */
.bf-player-profile {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: var(--bf-space-lg, 24px);
  padding: var(--bf-space-xl, 32px) var(--bf-space-md, 16px);
  width: 100%;
}

/* 玩家名称 */
.bf-player-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--bf-text-primary);
  letter-spacing: -0.02em;
  margin: 0;
  background: var(--bf-fire-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 768px) {
  .bf-player-name {
    font-size: 2rem;
  }
}

/* 皮肤查看器 */
.bf-skin-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
}

.bf-skin-canvas {
  border-radius: var(--bf-card-radius, 16px);
  transition: all var(--bf-transition-fast, 0.15s ease);
}

.bf-skin-canvas:hover {
  border: 2px solid var(--bf-border-default);
  border-color: var(--bf-border-accent);
  transform: scale(1.02);
}

/* 信息网格 */
.bf-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--bf-space-md, 16px);
  width: 100%;
  max-width: 280px;
}

/* 信息卡片 */
.bf-info-card {
  border: 1px solid var(--bf-card-border);
  border-radius: var(--bf-card-radius-sm, 12px);
  padding: var(--bf-space-md, 16px);
  transition: all var(--bf-transition-fast, 0.15s ease);
}

.bf-info-card:hover {
  border-color: var(--bf-border-accent);
  transform: translateY(-2px);
}

.bf-info-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--bf-text-muted);
  margin: 0 0 var(--bf-space-xs, 4px) 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.bf-info-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bf-text-primary);
  margin: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .bf-player-profile {
    padding: var(--bf-space-lg, 24px) var(--bf-space-sm, 8px);
  }

  .bf-info-grid {
    max-width: 240px;
  }
}
</style>
