<script lang="ts" setup>
import {onMounted, ref} from 'vue'
import {useRoute} from 'vue-router'
import PlayerProfileCard from '@M/players/components/playerProfile/PlayerProfilePanel.vue'
import StatisticsPanel from '@M/players/components/statistics/StatisticsPanel.vue'
import AdvancementsPanel from '@M/players/components/advancements/AdvancementsPanel.vue'
import {PlayerService} from '@M/players/services/PlayerService.ts'
import type {Player} from '@M/players/dtos/Player.ts'
import {useAsyncLoader} from '@SU/async/useAsyncLoader.ts'
import router from '@S/infra/router'

/* ---------------- 路由参数 ---------------- */
const route = useRoute()
const playerName = ref((route.params.name as string) || '')
const playerService = new PlayerService()
const player = ref<Player | null>(null)

/* ---------------- 复用通用加载逻辑 ---------------- */
const {isLoading, errorMsg, executeAsync} = useAsyncLoader()

// 获取玩家信息
async function fetchPlayerProfile() {
  if (!playerName.value) return

  try {
    const playerData = await executeAsync(async (signal) => {
      const apiResult = await playerService.getPlayerProfile(playerName.value, {signal})

      if (apiResult.isSuccess) {
        const realPlayerData = apiResult.getValue()

        if (playerName.value.length < 36) {
          await router.replace(`/players/${encodeURIComponent(realPlayerData.id)}`)
        }
        return realPlayerData
      }

      throw new Error('玩家信息获取失败（玩家不存在或权限不足）')
    }, '获取玩家信息失败')

    if (playerData) {
      player.value = playerData
    }
  } catch (error) {
    console.error('获取玩家信息兜底异常：', error)
  }
}

onMounted(() => {
  fetchPlayerProfile()
})
</script>

<template>
  <div class="player-page">
    <div v-if="isLoading" class="flex justify-center items-center h-40">
      <div
        class="animate-spin h-6 w-6 rounded-full border-2 border-[var(--ui-accent)] border-t-transparent"
      ></div>
    </div>
    <div v-else-if="errorMsg" class="player-error">
      {{ errorMsg }}
    </div>
    <div v-else>
      <div class="w-full h-full flex justify-center items-center">
        <!-- 父容器 -->
        <div class="player-layout">
          <!-- 左侧栏：玩家资料 -->
          <div class="player-column player-column--profile">
            <PlayerProfileCard :player="player || null" />
          </div>
          <!-- 右侧栏：成就 + 统计 -->
          <div class="player-column player-column--detail">
            <AdvancementsPanel :player-uuid="player?.id || ''" />
            <div class="h-4" />
            <StatisticsPanel :player-uuid="player?.id || ''" />
            <!-- 空数据 -->
            <div v-if="!player?.name" class="flex justify-center items-center h-full">
              <p class="player-empty">暂无玩家数据</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-page {
  min-height: 100vh;
  padding: 1rem;
  background: var(--ui-bg);
  color: var(--ui-text);
  font-family: var(--ui-font-body);
}

.player-error {
  text-align: center;
  color: var(--ui-danger);
  padding: var(--ui-space-xl) var(--ui-space-md);
}

.player-empty {
  text-align: center;
  color: var(--ui-text-muted);
}

/* 两栏：卡片本身由各面板组件负责，这里只管排版 */
.player-layout {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: center;
  align-items: stretch;
  overflow-x: hidden;
  gap: var(--ui-space-md);
  width: 100%;
  height: 100%;
}

.player-column {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

@media (min-width: 768px) {
  .player-layout {
    flex-direction: row;
  }

  .player-column--profile {
    flex: 1;
    width: auto;
  }

  .player-column--detail {
    flex: 4;
  }
}

@media (min-width: 1280px) {
  .player-layout {
    width: 80%;
  }
}
</style>
