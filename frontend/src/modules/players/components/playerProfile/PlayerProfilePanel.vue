<script lang="ts" setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import type { Player } from '@M/players/dtos/Player.ts'
import { PlayerService } from '@M/players/services/PlayerService.ts'
import { useAsyncLoader } from '@SU/async/useAsyncLoader.ts'
import { Render, WalkingAnimation } from 'skin3d'
import type { PlayerSkin } from '@M/players/dtos/PlayerSkin.ts'
import { translate } from '@S/services/i18n'
import { addImagePrefixToBase64 } from '@SU/Base64Util.ts'
import AppCard from '@S/components/ui/AppCard.vue'

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
  <div v-if="isLoading" class="ui-loading">
    <div class="ui-loading__spinner"></div>
  </div>
  <div v-else-if="errorMsg" class="ui-error">
    {{ errorMsg }}
  </div>
  <AppCard v-else-if="player" class="ui-player-profile" variant="default" size="md">
    <!-- 玩家名称 -->
    <h2 class="ui-player-name">
      {{ player.name }}
    </h2>

    <!-- 3D皮肤展示 -->
    <div class="ui-skin-viewer">
      <canvas ref="canvas" :height="dims.height" :width="dims.width" class="ui-skin-canvas" />
    </div>

    <!-- 信息面板 -->
    <div class="ui-info-grid">
      <!-- 游玩时长 -->
      <AppCard class="ui-info-card" variant="quiet" size="sm">
        <p class="ui-info-label">
          {{ translate('players', 'player.playtime') }}
        </p>
        <p class="ui-info-value">
          {{ (player.totalPlaytimeSeconds / (20 * 60 * 60)).toFixed(1) }} h
        </p>

        <!-- 上次游玩 -->
        <p class="ui-info-label">
          {{ translate('players', 'player.last-login') }}
        </p>
        <p class="ui-info-value">
          {{ new Date(player.lastLogin).toLocaleString().split(',')[0] }}
        </p>

        <!-- 注册时间 -->
        <p class="ui-info-label">
          {{ translate('players', 'player.register-time') }}
        </p>
        <p class="ui-info-value">
          {{ new Date(player.firstLogin).toLocaleString().split(',')[0] }}
        </p>
      </AppCard>
    </div>
  </AppCard>
</template>

<style scoped>
/* 加载状态 */
.ui-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 160px;
}

.ui-loading__spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--ui-border);
  border-top-color: var(--ui-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* 错误状态 */
.ui-error {
  text-align: center;
  color: var(--ui-danger);
  padding: var(--ui-space-lg, 24px);
}

/* 玩家资料容器（表面交给 AppCard，这里只管排版） */
.ui-player-profile {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: var(--ui-space-lg, 24px);
  width: 100%;
}

/* 玩家名称 */
.ui-player-name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ui-text);
  letter-spacing: -0.02em;
  margin: 0;
  background: var(--ui-accent-gradient);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

@media (min-width: 768px) {
  .ui-player-name {
    font-size: 2rem;
  }
}

/* 皮肤查看器 */
.ui-skin-viewer {
  display: flex;
  justify-content: center;
  align-items: center;
}

.ui-skin-canvas {
  border-radius: var(--ui-card-radius, 16px);
  transition: all var(--ui-transition-fast, 0.15s ease);
}

.ui-skin-canvas:hover {
  border: 2px solid var(--ui-border-accent);
  transform: scale(1.02);
}

/* 信息网格 */
.ui-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--ui-space-md, 16px);
  width: 100%;
  max-width: 280px;
}

/* 信息卡片（表面交给 AppCard 的 quiet 变体） */
.ui-info-card {
  transition: all var(--ui-transition-fast, 0.15s ease);
}

.ui-info-card:hover {
  border-color: var(--ui-border-accent);
  transform: translateY(-2px);
}

.ui-info-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--ui-text-muted);
  margin: 0 0 var(--ui-space-xs, 4px) 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.ui-info-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--ui-text);
  margin: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .ui-info-grid {
    max-width: 240px;
  }
}
</style>
