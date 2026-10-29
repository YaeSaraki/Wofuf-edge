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
  <div class="min-h-screen p-4">
    <div v-if="isLoading" class="flex justify-center items-center h-40">
      <div
        class="animate-spin h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent"
      ></div>
    </div>
    <div v-else-if="errorMsg" class="text-center text-red-500">
      {{ errorMsg }}
    </div>
    <div v-else>
      <div class="w-full h-full flex justify-center items-center">
        <!-- 父容器-->
        <div
          class="flex flex-col md:flex-row flex-wrap justify-center items-stretch overflow-x-hidden xl:w-[80%] gap-4 md:w-full h-full"
        >
          <!-- 左侧栏 -->
          <div
            class="flex justify-center items-center p-4 rounded-xl w-auto flex-1 h-full bg-zinc-100 dark:bg-zinc-800"
          >
            <PlayerProfileCard :player="player || null"/>
          </div>
          <!-- 右侧栏 -->
          <div class="p-4 rounded-xl w-full md:w-full flex-4 h-full bg-zinc-100 dark:bg-zinc-800">
            <AdvancementsPanel :player-uuid="player?.id || ''"/>
            <div class="h-4"/>
            <StatisticsPanel :player-uuid="player?.id || ''"/>
            <!-- 空数据 -->
            <div v-if="!player?.name" class="flex justify-center items-center h-full">
              <p class="text-center text-zinc-400">暂无玩家数据</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
