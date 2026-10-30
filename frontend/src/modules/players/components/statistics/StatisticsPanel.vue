<script lang="ts" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useAsyncLoader } from '@SU/async/useAsyncLoader.ts'
import { statisticGroups } from '@M/players/config/statisticGroups.ts'
import { useLocale } from '@S/services/i18n/useLocale.ts'
import { hasTranslation } from '@S/services/i18n/index.ts'
import { statisticService } from '@M/players/services'
import type { PlayerStatisticList } from '@M/players/dtos/PlayerStatistic.ts'
import AppCard from '@S/components/ui/AppCard.vue'

const props = defineProps<{ playerUuid: string }>()

/* ---------------- 复用通用加载逻辑 ---------------- */
const { isLoading, errorMsg, executeAsync } = useAsyncLoader()

/* ---------------- 业务状态 ---------------- */
const playerStatisticList = ref<PlayerStatisticList | null>(null)
const useConvertedUnits = ref(true)

// 国际化
const { translate } = useLocale()

// 获取玩家统计数据
async function fetchPlayerStatistics() {
  if (!props.playerUuid) return
  // 从所有分组中提取所有具体统计键
  const allRequiredKeys = statisticGroups.flatMap((group) => group.statistics)

  const result = await executeAsync(
    async (signal) => {
      const result = await statisticService.getPlayerStatistics(props.playerUuid, {
        signal,
        keys: allRequiredKeys, // 使用具体的统计键作为keys参数
      })
      if (result.isSuccess) {
        return result.getValue()
      }
    },
    translate('players', 'error.loading-stats'),
  ) // 使用带模块前缀的翻译键

  if (result) {
    playerStatisticList.value = result
  }
}

// 单位转换函数
function formatValue(value: number, key: string): string {
  if (!useConvertedUnits.value) {
    return value.toString()
  }

  // 路程单位转换为块
  if (key.includes('distance') || key.includes('travel')) {
    return `${value} 块`
  }

  // 其他可能的单位转换
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)} M`
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} K`
  }

  return value.toString()
}

// 监听玩家名变化，重新获取数据
watch(
  () => props.playerUuid,
  () => {
    fetchPlayerStatistics()
  },
)

// 组件挂载时获取数据
onMounted(() => {
  fetchPlayerStatistics()
})

// 获取所有统计项（带翻译）
const allStats = computed(() => {
  if (!playerStatisticList.value) return []

  return Object.values(playerStatisticList.value.statistics).map((stat) => ({
    ...stat,
    translatedKey: translate('players', `stats.item.${stat.key}`), // 使用带模块前缀的翻译键
    // 没有名字的（翻译缺失）不显示：否则界面上会出现 stats.item.AVIATE_ONE_CM 这种原始键
    named: hasTranslation('players', `stats.item.${stat.key}`),
  }))
})

// 「其他」区块：既不在任何分组里、又确实有名字的
const otherStats = computed(() =>
  allStats.value.filter(
    (stat) => stat.named && !statisticGroups.some((group) => group.statistics.includes(stat.key)),
  ),
)

// 计算分组统计
const groupedStats = computed(() => {
  if (!playerStatisticList.value) return []

  return statisticService.calculateGroupTotals(playerStatisticList.value.statistics)
})

// 获取特定分组的统计项
const getStatsByGroup = (groupId: string) => {
  if (!playerStatisticList.value) return []

  const group = statisticGroups.find((g) => g.category === groupId)
  if (!group) return []

  return group.statistics
    .map((statKey) => playerStatisticList.value?.statistics[statKey])
    .filter((stat) => stat !== undefined)
    .map((stat) => ({
      ...stat!,
      translatedKey: translate('players', `stats.item.${stat!.key}`), // 使用带模块前缀的翻译键
      named: hasTranslation('players', `stats.item.${stat!.key}`),
    }))
    .filter((stat) => stat.named)
}
</script>
<template>
  <AppCard class="ui-statistics-panel" variant="default" size="md">
    <div class="ui-panel-header">
      <h3 class="ui-panel-title">
        {{ translate('players', 'stats.title') }}
      </h3>
      <button
        @click="useConvertedUnits = !useConvertedUnits"
        class="ui-toggle-btn"
      >
        <svg
          v-if="!useConvertedUnits"
          class="ui-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
          <path
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        <svg
          v-else
          class="ui-icon"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
        {{
          useConvertedUnits
            ? translate('players', 'stats.units.original')
            : translate('players', 'stats.units.converted')
        }}
      </button>
    </div>

    <div
      v-if="isLoading"
      class="ui-loading-container"
    >
      <div class="ui-spinner"></div>
    </div>

    <div
      v-else-if="errorMsg"
      class="ui-error-message"
    >
      {{ errorMsg }}
    </div>

    <div v-else>
      <!-- 分组统计概览 - 固定大小 Flex 布局（每行对齐） -->
      <div class="mb-6">
        <h4 class="ui-section-subtitle">
          {{ translate('players', 'stats.overview') }}
        </h4>
        <div class="ui-stats-overview">
          <AppCard
            v-for="group in groupedStats"
            :key="group.category"
            class="ui-stat-card"
            variant="accent"
            size="sm"
          >
            <div class="ui-stat-label">
              {{ translate('players', `stats.group.${group.category.toLowerCase()}`) }}
            </div>
            <div class="ui-stat-value">
              {{ useConvertedUnits ? formatValue(group.total, group.category) : group.total }}
            </div>
          </AppCard>
        </div>
      </div>

      <!-- 详细统计分组展示-->
      <div class="ui-stats-groups">
        <AppCard
          v-for="group in statisticGroups"
          :key="group.category"
          class="ui-stat-group"
          variant="quiet"
          size="sm"
        >
          <h4 class="ui-group-header">
            <span class="ui-group-indicator ui-group-indicator--primary"></span>
            {{ translate('players', `stats.group.${group.category.toLowerCase()}`) }}
          </h4>

          <div class="ui-stat-items">
            <div
              v-for="stat in getStatsByGroup(group.category)"
              :key="stat.key"
              class="ui-stat-item"
            >
              <span class="ui-stat-item-label">{{ stat.translatedKey }}</span>
              <span class="ui-stat-item-value">{{
                formatValue(stat.value, stat.key)
              }}</span>
            </div>
          </div>

          <!-- 无数据提示 -->
          <div
            v-if="getStatsByGroup(group.category).length === 0"
            class="ui-no-data"
          >
            {{ translate('players', 'stats.no-data') }}
          </div>
        </AppCard>
      </div>

      <!-- 其他未分组统计-->
      <AppCard
        v-if="otherStats.length > 0"
        class="ui-other-stats"
        variant="quiet"
        size="sm"
      >
        <h4 class="ui-group-header">
          <span class="ui-group-indicator ui-group-indicator--secondary"></span>
          {{ translate('players', 'stats.other') }}
        </h4>

        <div class="ui-stat-items">
          <div
            v-for="stat in otherStats"
            :key="stat.key"
            class="ui-stat-item"
          >
            <span class="ui-stat-item-label">{{ stat.translatedKey }}</span>
            <span class="ui-stat-item-value">{{
              formatValue(stat.value, stat.key)
            }}</span>
          </div>
        </div>
      </AppCard>
    </div>
  </AppCard>
</template>

<style scoped>
/* 面板根节点（表面交给 AppCard，这里只管排版） */
.ui-statistics-panel {
  display: flex;
  flex-direction: column;
  gap: var(--ui-space-4);
}

.ui-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--ui-space-4);
}

.ui-panel-title {
  font-weight: bold;
  font-size: 1.125rem;
  color: var(--ui-text);
}

.ui-toggle-btn {
  display: flex;
  align-items: center;
  gap: var(--ui-space-2);
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: var(--ui-surface-hover);
  border-radius: var(--ui-radius-md);
  border: 1px solid var(--ui-border);
  color: var(--ui-text-secondary);
  transition: var(--ui-transition-fast);
  cursor: pointer;
}

.ui-toggle-btn:hover {
  background: var(--ui-surface-active);
}

.ui-icon {
  width: 1rem;
  height: 1rem;
}

.ui-loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10rem;
  background: var(--ui-surface-glass);
  border-radius: var(--ui-radius-md);
}

.ui-spinner {
  animation: spin 1s linear infinite;
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  border: 2px solid var(--ui-accent);
  border-top-color: transparent;
}

.ui-error-message {
  text-align: center;
  color: var(--ui-danger);
  padding: var(--ui-space-4);
  background: color-mix(in srgb, var(--ui-danger) 10%, transparent);
  border-radius: var(--ui-radius-md);
}

.ui-section-subtitle {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--ui-text-secondary);
  margin-bottom: var(--ui-space-2);
}

.ui-stats-overview {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-3);
}

.ui-stat-label {
  font-size: 0.75rem;
  color: var(--ui-text-accent);
  margin-bottom: 0.25rem;
}

.ui-stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--ui-text);
}

.ui-stats-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.ui-group-header {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--ui-text-secondary);
  margin-bottom: var(--ui-space-3);
  display: flex;
  align-items: center;
}

.ui-group-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: var(--ui-space-2);
}

.ui-group-indicator--primary {
  background: var(--ui-accent);
}

.ui-group-indicator--secondary {
  background: var(--ui-text-muted);
}

.ui-stat-items {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  justify-content: flex-start;
  align-items: flex-start;
  align-content: flex-start;
}

.ui-stat-item {
  width: 220px;
  height: 45px;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--ui-space-2);
  border-radius: var(--ui-radius-sm);
  transition: var(--ui-transition-fast);
}

.ui-stat-item:hover {
  background: var(--ui-surface-active);
}

.ui-stat-item-label {
  font-size: 0.875rem;
  color: var(--ui-text-secondary);
}

.ui-stat-item-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ui-text);
}

.ui-no-data {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  font-style: italic;
  padding: var(--ui-space-2) 0;
}

.ui-other-stats {
  margin-top: 1.5rem;
}
</style>
