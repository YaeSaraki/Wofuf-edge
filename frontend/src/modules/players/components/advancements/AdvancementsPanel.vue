<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useAsyncLoader} from '@SU/async/useAsyncLoader.ts'
import {useLocale} from '@S/services/i18n/useLocale.ts'
import type {PlayerAdvancement, PlayerAdvancementList} from '@M/players/dtos/PlayerAdvancement.ts'
import {advancementService} from '@M/players/services'
import DraggablePopup from '@S/components/DraggablePopup.vue'
import AppCard from '@S/components/ui/AppCard.vue'

const props = defineProps<{ playerUuid: string }>()

/* ---------------- 复用通用加载逻辑 ---------------- */
const {isLoading, errorMsg, executeAsync} = useAsyncLoader()

/* ---------------- 弹窗相关逻辑 ---------------- */
const popupState = ref({
  visible: false,
  currentAdvancement: null as PlayerAdvancement | null,
  initX: 0,
  initY: 0,
})

const openPopup = (advancement: PlayerAdvancement, event: MouseEvent) => {
  event.stopPropagation()
  popupState.value = {
    visible: true,
    currentAdvancement: advancement,
    initX: event.clientX,
    initY: event.clientY,
  }
}

const closePopup = () => {
  popupState.value = {
    visible: false,
    currentAdvancement: null,
    initX: 0,
    initY: 0,
  }
}

/* ---------------- 业务状态 ---------------- */

const playerAdvancementList = ref<PlayerAdvancementList | null>(null)

// 展示未分组的成就
const showUngrouped = ref(false)

// 控制显示/隐藏未完成成就的状态
const showIncomplete = ref(false) // 默认隐藏未完成成就

// 国际化
const {translate} = useLocale()

// 获取玩家成就数据
async function fetchPlayerAdvancements() {
  if (!props.playerUuid) return
  const result = await executeAsync(
    async (signal) => {
      const result = await advancementService.getPlayerAdvancements(props.playerUuid, {signal})
      if (result.isSuccess) {
        return result.getValue()
      }
    },
    translate('players', 'error.loading-advancements'),
  )

  if (result?.advancements) {
    playerAdvancementList.value = result
  }
}

// 监听玩家名变化，重新获取数据
watch(
  () => props.playerUuid,
  () => {
    fetchPlayerAdvancements()
  },
)

// 过滤后的成就列表
const filteredAdvancements = computed(() => {
  if (!playerAdvancementList?.value?.advancements) return []
  return advancementService.filterNonGroupedAdvancements(playerAdvancementList.value.advancements)
})

// 成就统计
const advancementStats = computed(() => {
  if (!filteredAdvancements.value.length) return {total: 0, completed: 0, percentage: 0}

  // 以分组中的成就总数为基础计算
  const total = advancementService.getTotalAdvancementCount()
  const completed = filteredAdvancements.value.filter((adv) => adv.done).length
  const percentage = Math.round((completed / total) * 100)

  return {total, completed, percentage}
})

// 按分类分组的成就
const advancementsByCategory = computed(() => {
  if (!filteredAdvancements.value.length) return []
  return advancementService.calculateAdvancementGroupTotals(
    playerAdvancementList.value!.advancements,
  )
})

// 未分组的成就
const ungroupedAdvancements = computed(() => {
  if (!playerAdvancementList?.value?.advancements) return []
  return advancementService.getUngroupedAdvancements(playerAdvancementList.value.advancements)
})

// 获取分类的未完成成就
const getGroupIncompleteAdvancements = (categoryId: string) => {
  const groupAdvancements = advancementService.getAdvancementsByGroup(
    playerAdvancementList.value!.advancements,
    categoryId,
  )
  return groupAdvancements.filter((adv) => !adv.done)
}

// 获取分类的完成成就
const getGroupCompleteAdvancements = (categoryId: string) => {
  const groupAdvancements = advancementService.getAdvancementsByGroup(
    playerAdvancementList.value!.advancements,
    categoryId,
  )
  return groupAdvancements.filter((adv) => adv.done)
}

// 获取未分组的完成成就
const ungroupedCompleteAdvancements = computed(() => {
  if (!ungroupedAdvancements.value.length) return []
  return ungroupedAdvancements.value.filter((adv) => adv.done)
})

// 获取未分组的未完成成就
const ungroupedIncompleteAdvancements = computed(() => {
  if (!ungroupedAdvancements.value.length) return []
  return ungroupedAdvancements.value.filter((adv) => !adv.done)
})

</script>

<template>
  <AppCard class="ui-advancements-panel" variant="default" size="md">
    <div class="ui-panel-header">
      <h3 class="ui-panel-title">
        {{ translate('players', 'advancements.title') }}
      </h3>

      <button
        :title="
          showIncomplete
            ? translate('players', 'advancements.hide-incomplete')
            : translate('players', 'advancements.show-incomplete')
        "
        class="ui-toggle-btn"
        @click="showIncomplete = !showIncomplete"
      >
        <svg
          v-if="!showIncomplete"
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
        <svg
          v-else
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
        <span class="ui-toggle-text">
          {{
            showIncomplete
              ? translate('players', 'advancements.incomplete-show')
              : translate('players', 'advancements.incomplete-hidden')
          }}
        </span>
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
    <div v-else-if="playerAdvancementList">
      <!-- 成就统计概览 -->
      <div class="mb-6">
        <h4 class="ui-section-subtitle">
          {{ translate('players', 'advancements.overview') }}
        </h4>

        <!-- 统计卡片 -->
        <div class="ui-adv-stats">
          <AppCard class="ui-adv-stat-card ui-adv-stat-card--primary" variant="flat" size="sm">
            <div class="ui-adv-stat-label">
              {{ translate('players', 'advancements.total') }}
            </div>
            <div class="ui-adv-stat-value">
              {{ advancementStats.total }}
            </div>
          </AppCard>
          <AppCard class="ui-adv-stat-card ui-adv-stat-card--success" variant="flat" size="sm">
            <div class="ui-adv-stat-label">
              {{ translate('players', 'advancements.completed') }}
            </div>
            <div class="ui-adv-stat-value">
              {{ advancementStats.completed }}
            </div>
          </AppCard>
          <AppCard class="ui-adv-stat-card ui-adv-stat-card--accent" variant="flat" size="sm">
            <div class="ui-adv-stat-label">
              {{ translate('players', 'advancements.completion-rate') }}
            </div>
            <div class="ui-adv-stat-value">
              {{ advancementStats.percentage }}%
            </div>
          </AppCard>
        </div>

        <!-- 进度条 -->
        <div class="ui-progress-bar">
          <div
            :style="{ width: `${advancementStats.percentage}%` }"
            class="ui-progress-fill"
          ></div>
        </div>
      </div>

      <!-- 成就分类展示 -->
      <div class="ui-adv-groups">
        <AppCard
          v-for="group in advancementsByCategory"
          :key="group.category"
          class="ui-adv-group"
          variant="quiet"
          size="sm"
        >
          <h4 class="ui-group-header">
            <span class="ui-group-indicator ui-group-indicator--success"></span>
            {{ group.name }}
            <span class="ui-group-count">
              ({{ group.completed }}/{{ group.total }})
            </span>
          </h4>

          <!-- 已完成的成就 -->
          <div v-if="getGroupCompleteAdvancements(group.category).length > 0" class="mb-3">
            <div class="ui-adv-complete-label">
              {{ translate('players', 'advancements.completed') }}
            </div>
            <div class="ui-adv-items">
              <div
                v-for="adv in getGroupCompleteAdvancements(group.category)"
                :key="adv.key"
                class="ui-adv-item ui-adv-item--complete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="ui-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="ui-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="ui-adv-icon"
                  />
                </div>
                <span class="ui-adv-name">
                  {{ advancementService.translateAdvancement(adv) }}
                </span>
                <!-- 完成状态 -->
                <span class="ui-adv-status ui-adv-status--complete">
                  {{ adv.completed.length }} {{ adv.remaining.length > 0 ? ':' : '/' }}
                  {{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="showIncomplete && getGroupIncompleteAdvancements(group.category).length > 0"
            class="ui-adv-incomplete-section"
          >
            <div class="ui-adv-incomplete-label">
              {{ translate('players', 'advancements.not-completed') }}
            </div>
            <div class="ui-adv-items">
              <div
                v-for="adv in getGroupIncompleteAdvancements(group.category)"
                :key="adv.key"
                class="ui-adv-item ui-adv-item--incomplete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="ui-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="ui-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="ui-adv-icon"
                  />
                </div>
                <span class="ui-adv-name">
                  {{ advancementService.translateAdvancement(adv) }}
                </span>
                <!-- 完成状态 -->
                <span class="ui-adv-status ui-adv-status--incomplete">
                  {{ adv.completed.length }}/{{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="!showIncomplete && getGroupIncompleteAdvancements(group.category).length > 0"
            class="ui-show-incomplete-btn"
          >
            <button
              class="ui-expand-btn"
              @click="showIncomplete = !showIncomplete"
            >
              <svg class="ui-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M19 9l-7 7-7-7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              {{ getGroupIncompleteAdvancements(group.category).length }}
              {{ translate('players', 'advancements.show-incomplete') }}
            </button>
          </div>

          <!-- 无数据提示 -->
          <div
            v-if="
              advancementService.getAdvancementsByGroup(
                playerAdvancementList.advancements,
                group.category,
              ).length === 0
            "
            class="ui-no-data"
          >
            {{ translate('players', 'advancements.no-data') }}
          </div>
        </AppCard>
      </div>

      <!-- 其他未分组成就 -->
      <div v-if="ungroupedAdvancements.length > 0 && showUngrouped" class="ui-other-adv">
        <h4 class="ui-group-header">
          <span class="ui-group-indicator ui-group-indicator--secondary"></span>
          {{ translate('players', 'advancements.other') }}
        </h4>

        <AppCard class="ui-adv-group" variant="quiet" size="sm">
          <!-- 已完成的成就 -->
          <div v-if="ungroupedCompleteAdvancements.length > 0" class="mb-3">
            <div class="ui-adv-complete-label">
              {{ translate('players', 'advancements.completed') }}
            </div>
            <div class="ui-adv-items">
              <div
                v-for="adv in ungroupedCompleteAdvancements"
                :key="adv.key"
                class="ui-adv-item ui-adv-item--complete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="ui-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="ui-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="ui-adv-icon"
                  />
                </div>
                <div class="flex-1">
                  <span class="ui-adv-name">
                    {{ advancementService.translateAdvancement(adv) }}
                  </span>
                </div>
                <!-- 完成状态 -->
                <span class="ui-adv-status ui-adv-status--complete">
                  {{ adv.completed.length }}/{{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <!-- 未完成的成就（根据 showIncomplete 状态决定是否显示） -->
          <div
            v-if="showIncomplete && ungroupedIncompleteAdvancements.length > 0"
            class="ui-adv-incomplete-section"
          >
            <div class="ui-adv-incomplete-label">
              {{ translate('players', 'advancements.not-completed') }}
            </div>
            <div class="ui-adv-items">
              <div
                v-for="adv in ungroupedIncompleteAdvancements"
                :key="adv.key"
                class="ui-adv-item ui-adv-item--incomplete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="ui-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="ui-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="ui-adv-icon"
                  />
                </div>
                <div class="flex-1">
                  <span class="ui-adv-name">
                    {{ advancementService.translateAdvancement(adv) }}
                  </span>
                </div>
                <!-- 完成状态 -->
                <span class="ui-adv-status ui-adv-status--incomplete">
                  {{ adv.completed.length }}/{{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <!-- 显示未完成成就提示 -->
          <div
            v-if="!showIncomplete && ungroupedIncompleteAdvancements.length > 0"
            class="ui-show-incomplete-btn"
          >
            <button
              class="ui-expand-btn"
              @click="showIncomplete = !showIncomplete"
            >
              <svg class="ui-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M19 9l-7 7-7-7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                />
              </svg>
              {{ ungroupedIncompleteAdvancements.length }}
              {{ translate('players', 'advancements.incomplete-hidden') }}
            </button>
          </div>
        </AppCard>
      </div>

      <!-- 无数据提示 -->
      <div
        v-if="filteredAdvancements.length === 0"
        class="ui-empty-state"
      >
        {{ translate('players', 'advancements.no-data') }}
      </div>
    </div>

    <!-- 引入封装后的弹窗组件，填充业务内容 -->
    <DraggablePopup
      :init-x="popupState.initX"
      :init-y="popupState.initY"
      :visible="popupState.visible"
      max-height="400px"
      width="320px"
      @close="closePopup"
    >
      <template #content="{ handleDragStart }">
        <div
          class="ui-popup-header"
          @mousedown="handleDragStart"
          @touchstart="handleDragStart"
        >
          <div class="ui-popup-header-content">
            <div class="ui-popup-icon-wrapper">
              <img
                v-if="popupState.currentAdvancement"
                :alt="advancementService.translateAdvancement(popupState.currentAdvancement)"
                :src="advancementService.getAdvancementImagePath(popupState.currentAdvancement)"
                class="ui-popup-icon"
              />
              <div v-if="popupState.currentAdvancement" class="ui-popup-title-wrapper">
                <h5 class="ui-popup-title">
                  {{ advancementService.translateAdvancement(popupState.currentAdvancement) }}
                </h5>
                <div class="ui-popup-subtitle">
                  {{ popupState.currentAdvancement.completed.length }} /
                  {{
                    popupState.currentAdvancement.completed.length +
                    popupState.currentAdvancement.remaining.length
                  }}
                  {{ translate('players', 'advancements.completion-items') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="popupState.currentAdvancement" class="ui-popup-content">
          <div
            v-if="
              popupState.currentAdvancement.remaining.length > 0 &&
              !popupState.currentAdvancement.done
            "
            class="ui-popup-section"
          >
            <h6 class="ui-popup-section-title ui-popup-section-title--danger">
              <span class="mr-1"></span>
              {{ translate('players', 'advancements.remaining-items') }}
            </h6>
            <ul class="ui-popup-list">
              <li
                v-for="(item, index) in popupState.currentAdvancement.remaining"
                :key="`remaining-${index}`"
                class="ui-popup-item ui-popup-item--danger"
              >
                {{ translate('players', item) }}
              </li>
            </ul>
          </div>
          <div v-if="popupState.currentAdvancement.completed.length > 0" class="ui-popup-section">
            <h6 class="ui-popup-section-title ui-popup-section-title--success">
              <span class="mr-1"></span>
              {{ translate('players', 'advancements.completed-items') }}
            </h6>
            <ul class="ui-popup-list">
              <li
                v-for="(item, index) in popupState.currentAdvancement.completed"
                :key="`completed-${index}`"
                class="ui-popup-item ui-popup-item--success"
              >
                {{ translate('players', item) }}
              </li>
            </ul>
          </div>
        </div>
      </template>
    </DraggablePopup>
  </AppCard>
</template>

<style scoped>
/* 面板根节点（表面交给 AppCard，这里只管排版） */
.ui-advancements-panel {
  position: relative;
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

.ui-toggle-text {
  font-size: 0.75rem;
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

.ui-adv-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ui-space-3);
  margin-bottom: var(--ui-space-4);
}

/* 概览小卡：孟菲斯的「色块」用法 —— 高饱和色只做色块，文字落在 --ui-text-on-block 上 */
.ui-adv-stat-card--primary {
  background: var(--ui-block-1);
  color: var(--ui-text-on-block);
}

.ui-adv-stat-card--success {
  background: var(--ui-block-2);
  color: var(--ui-text-on-block);
}

.ui-adv-stat-card--accent {
  background: var(--ui-block-3);
  color: var(--ui-text-on-block);
}

.ui-adv-stat-label {
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
  color: var(--ui-text-on-block);
}

.ui-adv-stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--ui-text-on-block);
}

.ui-progress-bar {
  width: 100%;
  background: var(--ui-surface-sunken);
  border-radius: var(--ui-radius-full);
  height: 0.625rem;
}

.ui-progress-fill {
  background: linear-gradient(to right, var(--ui-accent), var(--ui-highlight));
  height: 0.625rem;
  border-radius: var(--ui-radius-full);
  transition: var(--ui-transition-normal);
}

.ui-adv-groups {
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

.ui-group-indicator--success {
  background: var(--ui-success);
}

.ui-group-indicator--secondary {
  background: var(--ui-text-muted);
}

.ui-group-count {
  margin-left: var(--ui-space-2);
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.ui-adv-complete-label {
  font-size: 0.75rem;
  color: var(--ui-success);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.ui-adv-incomplete-label {
  font-size: 0.75rem;
  color: var(--ui-danger);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.ui-adv-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}

.ui-adv-item {
  /* 固定宽高，保证成就列表每行对齐 */
  width: 220px;
  height: 80px;
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: var(--ui-radius-sm);
  transition: var(--ui-transition-fast);
  cursor: pointer;
  position: relative;
}

.ui-adv-item:hover {
  transform: scale(1.05);
}

.ui-adv-icon-wrapper {
  position: relative;
  width: 3rem;
  height: 3rem;
  margin-right: var(--ui-space-2);
  transform: translateY(0.5rem);
}

.ui-adv-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
  transform: translate(-0.5rem, -0.5rem);
}

.ui-adv-icon {
  position: absolute;
  width: 2rem;
  height: 2rem;
  margin-right: var(--ui-space-2);
  object-fit: contain;
  border-radius: var(--ui-radius-sm);
  z-index: 1;
}

.ui-adv-name {
  font-size: 1rem;
  color: var(--ui-text-secondary);
}

.ui-adv-status {
  margin-left: auto;
  font-size: 0.75rem;
}

.ui-adv-status--complete {
  color: var(--ui-success);
}

.ui-adv-status--incomplete {
  color: var(--ui-danger);
}

.ui-adv-incomplete-section {
  margin-top: var(--ui-space-3);
  padding-top: var(--ui-space-3);
  border-top: 1px solid var(--ui-border);
}

.ui-show-incomplete-btn {
  margin-top: var(--ui-space-3);
  padding-top: var(--ui-space-3);
  border-top: 1px solid var(--ui-border);
}

.ui-expand-btn {
  width: 100%;
  font-size: 0.75rem;
  color: var(--ui-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.25rem 0;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color var(--ui-transition-fast);
}

.ui-expand-btn:hover {
  color: var(--ui-accent-dark);
}

.ui-icon-sm {
  width: 0.75rem;
  height: 0.75rem;
}

.ui-no-data {
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  font-style: italic;
}

.ui-other-adv {
  margin-top: var(--ui-space-2);
}

.ui-empty-state {
  text-align: center;
  font-size: 0.875rem;
  color: var(--ui-text-muted);
  padding: 1rem 0;
  font-style: italic;
}

/* Popup Styles */
.ui-popup-header {
  padding: var(--ui-space-3);
  border-bottom: 1px solid var(--ui-border);
  cursor: move;
  flex-shrink: 0;
}

.ui-popup-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ui-popup-icon-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.ui-popup-icon {
  width: 2.5rem;
  height: 2.5rem;
  margin-right: var(--ui-space-2);
  border-radius: var(--ui-radius-sm);
  z-index: 1;
}

.ui-popup-title-wrapper {
  min-width: 0;
  flex: 1;
}

.ui-popup-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--ui-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ui-popup-subtitle {
  font-size: 0.75rem;
  color: var(--ui-text-muted);
}

.ui-popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.ui-popup-section {
  padding: var(--ui-space-3);
}

.ui-popup-section-title {
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: var(--ui-space-2);
  display: flex;
  align-items: center;
}

.ui-popup-section-title--danger {
  color: var(--ui-danger);
}

.ui-popup-section-title--success {
  color: var(--ui-success);
}

.ui-popup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.ui-popup-item {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--ui-radius-sm);
}

.ui-popup-item--danger {
  color: var(--ui-text);
  background: color-mix(in srgb, var(--ui-danger) 10%, transparent);
}

.ui-popup-item--success {
  color: var(--ui-text);
  background: color-mix(in srgb, var(--ui-success) 10%, transparent);
}
</style>
