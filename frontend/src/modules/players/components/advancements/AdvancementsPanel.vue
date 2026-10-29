<script lang="ts" setup>
import {computed, ref, watch} from 'vue'
import {useAsyncLoader} from '@SU/async/useAsyncLoader.ts'
import {useLocale} from '@S/services/i18n/useLocale.ts'
import type {PlayerAdvancement, PlayerAdvancementList} from '@M/players/dtos/PlayerAdvancement.ts'
import {advancementService} from '@M/players/services'
import DraggablePopup from '@S/components/DraggablePopup.vue'

import './styles'

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
  <div class="bf-advancements-panel">
    <div class="bf-panel-header">
      <h3 class="bf-panel-title">
        {{ translate('players', 'advancements.title') }}
      </h3>

      <button
        :title="
          showIncomplete
            ? translate('players', 'advancements.hide-incomplete')
            : translate('players', 'advancements.show-incomplete')
        "
        class="bf-toggle-btn"
        @click="showIncomplete = !showIncomplete"
      >
        <svg
          v-if="!showIncomplete"
          class="bf-icon"
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
          class="bf-icon"
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
        <span class="bf-toggle-text">
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
      class="bf-loading-container"
    >
      <div class="bf-spinner"></div>
    </div>
    <div
      v-else-if="errorMsg"
      class="bf-error-message"
    >
      {{ errorMsg }}
    </div>
    <div v-else-if="playerAdvancementList">
      <!-- 成就统计概览 -->
      <div class="mb-6">
        <h4 class="bf-section-subtitle">
          {{ translate('players', 'advancements.overview') }}
        </h4>

        <!-- 统计卡片 -->
        <div class="bf-adv-stats">
          <div class="bf-adv-stat-card bf-adv-stat-card--primary">
            <div class="bf-adv-stat-label">
              {{ translate('players', 'advancements.total') }}
            </div>
            <div class="bf-adv-stat-value">
              {{ advancementStats.total }}
            </div>
          </div>
          <div class="bf-adv-stat-card bf-adv-stat-card--success">
            <div class="bf-adv-stat-label">
              {{ translate('players', 'advancements.completed') }}
            </div>
            <div class="bf-adv-stat-value">
              {{ advancementStats.completed }}
            </div>
          </div>
          <div class="bf-adv-stat-card bf-adv-stat-card--accent">
            <div class="bf-adv-stat-label">
              {{ translate('players', 'advancements.completion-rate') }}
            </div>
            <div class="bf-adv-stat-value">
              {{ advancementStats.percentage }}%
            </div>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="bf-progress-bar">
          <div
            :style="{ width: `${advancementStats.percentage}%` }"
            class="bf-progress-fill"
          ></div>
        </div>
      </div>

      <!-- 成就分类展示 -->
      <div class="bf-adv-groups">
        <div
          v-for="group in advancementsByCategory"
          :key="group.category"
          class="bf-adv-group"
        >
          <h4 class="bf-group-header">
            <span class="bf-group-indicator bf-group-indicator--success"></span>
            {{ group.name }}
            <span class="bf-group-count">
              ({{ group.completed }}/{{ group.total }})
            </span>
          </h4>

          <!-- 已完成的成就 -->
          <div v-if="getGroupCompleteAdvancements(group.category).length > 0" class="mb-3">
            <div class="bf-adv-complete-label">
              {{ translate('players', 'advancements.completed') }}
            </div>
            <div class="bf-adv-items">
              <div
                v-for="adv in getGroupCompleteAdvancements(group.category)"
                :key="adv.key"
                class="bf-adv-item bf-adv-item--complete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="bf-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="bf-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="bf-adv-icon"
                  />
                </div>
                <span class="bf-adv-name">
                  {{ advancementService.translateAdvancement(adv) }}
                </span>
                <!-- 完成状态 -->
                <span class="bf-adv-status bf-adv-status--complete">
                  {{ adv.completed.length }} {{ adv.remaining.length > 0 ? ':' : '/' }}
                  {{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="showIncomplete && getGroupIncompleteAdvancements(group.category).length > 0"
            class="bf-adv-incomplete-section"
          >
            <div class="bf-adv-incomplete-label">
              {{ translate('players', 'advancements.not-completed') }}
            </div>
            <div class="bf-adv-items">
              <div
                v-for="adv in getGroupIncompleteAdvancements(group.category)"
                :key="adv.key"
                class="bf-adv-item bf-adv-item--incomplete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="bf-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="bf-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="bf-adv-icon"
                  />
                </div>
                <span class="bf-adv-name">
                  {{ advancementService.translateAdvancement(adv) }}
                </span>
                <!-- 完成状态 -->
                <span class="bf-adv-status bf-adv-status--incomplete">
                  {{ adv.completed.length }}/{{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="!showIncomplete && getGroupIncompleteAdvancements(group.category).length > 0"
            class="bf-show-incomplete-btn"
          >
            <button
              class="bf-expand-btn"
              @click="showIncomplete = !showIncomplete"
            >
              <svg class="bf-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            class="bf-no-data"
          >
            {{ translate('players', 'advancements.no-data') }}
          </div>
        </div>
      </div>

      <!-- 其他未分组成就 -->
      <div v-if="ungroupedAdvancements.length > 0 && showUngrouped" class="bf-other-adv">
        <h4 class="bf-group-header">
          <span class="bf-group-indicator bf-group-indicator--secondary"></span>
          {{ translate('players', 'advancements.other') }}
        </h4>

        <div class="bf-adv-group">
          <!-- 已完成的成就 -->
          <div v-if="ungroupedCompleteAdvancements.length > 0" class="mb-3">
            <div class="bf-adv-complete-label">
              {{ translate('players', 'advancements.completed') }}
            </div>
            <div class="bf-adv-items">
              <div
                v-for="adv in ungroupedCompleteAdvancements"
                :key="adv.key"
                class="bf-adv-item bf-adv-item--complete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="bf-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="bf-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="bf-adv-icon"
                  />
                </div>
                <div class="flex-1">
                  <span class="bf-adv-name">
                    {{ advancementService.translateAdvancement(adv) }}
                  </span>
                </div>
                <!-- 完成状态 -->
                <span class="bf-adv-status bf-adv-status--complete">
                  {{ adv.completed.length }}/{{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <!-- 未完成的成就（根据 showIncomplete 状态决定是否显示） -->
          <div
            v-if="showIncomplete && ungroupedIncompleteAdvancements.length > 0"
            class="bf-adv-incomplete-section"
          >
            <div class="bf-adv-incomplete-label">
              {{ translate('players', 'advancements.not-completed') }}
            </div>
            <div class="bf-adv-items">
              <div
                v-for="adv in ungroupedIncompleteAdvancements"
                :key="adv.key"
                class="bf-adv-item bf-adv-item--incomplete"
                @click="openPopup(adv, $event)"
              >
                <!-- 成就图标框和图标 -->
                <div class="bf-adv-icon-wrapper">
                  <!-- 图标框 -->
                  <img
                    :alt="`${advancementService.translateAdvancement(adv)} frame`"
                    :src="advancementService.getAdvancementFramePath(adv)"
                    class="bf-adv-frame"
                  />
                  <!-- 成就图标 -->
                  <img
                    :alt="advancementService.translateAdvancement(adv)"
                    :src="advancementService.getAdvancementImagePath(adv)"
                    class="bf-adv-icon"
                  />
                </div>
                <div class="flex-1">
                  <span class="bf-adv-name">
                    {{ advancementService.translateAdvancement(adv) }}
                  </span>
                </div>
                <!-- 完成状态 -->
                <span class="bf-adv-status bf-adv-status--incomplete">
                  {{ adv.completed.length }}/{{ adv.completed.length + adv.remaining.length }}
                </span>
              </div>
            </div>
          </div>

          <!-- 显示未完成成就提示 -->
          <div
            v-if="!showIncomplete && ungroupedIncompleteAdvancements.length > 0"
            class="bf-show-incomplete-btn"
          >
            <button
              class="bf-expand-btn"
              @click="showIncomplete = !showIncomplete"
            >
              <svg class="bf-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </div>
      </div>

      <!-- 无数据提示 -->
      <div
        v-if="filteredAdvancements.length === 0"
        class="bf-empty-state"
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
          class="bf-popup-header"
          @mousedown="handleDragStart"
          @touchstart="handleDragStart"
        >
          <div class="bf-popup-header-content">
            <div class="bf-popup-icon-wrapper">
              <img
                v-if="popupState.currentAdvancement"
                :alt="advancementService.translateAdvancement(popupState.currentAdvancement)"
                :src="advancementService.getAdvancementImagePath(popupState.currentAdvancement)"
                class="bf-popup-icon"
              />
              <div v-if="popupState.currentAdvancement" class="bf-popup-title-wrapper">
                <h5 class="bf-popup-title">
                  {{ advancementService.translateAdvancement(popupState.currentAdvancement) }}
                </h5>
                <div class="bf-popup-subtitle">
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

        <div v-if="popupState.currentAdvancement" class="bf-popup-content">
          <div
            v-if="
              popupState.currentAdvancement.remaining.length > 0 &&
              !popupState.currentAdvancement.done
            "
            class="bf-popup-section"
          >
            <h6 class="bf-popup-section-title bf-popup-section-title--danger">
              <span class="mr-1"></span>
              {{ translate('players', 'advancements.remaining-items') }}
            </h6>
            <ul class="bf-popup-list">
              <li
                v-for="(item, index) in popupState.currentAdvancement.remaining"
                :key="`remaining-${index}`"
                class="bf-popup-item bf-popup-item--danger"
              >
                {{ translate('players', item) }}
              </li>
            </ul>
          </div>
          <div v-if="popupState.currentAdvancement.completed.length > 0" class="bf-popup-section">
            <h6 class="bf-popup-section-title bf-popup-section-title--success">
              <span class="mr-1"></span>
              {{ translate('players', 'advancements.completed-items') }}
            </h6>
            <ul class="bf-popup-list">
              <li
                v-for="(item, index) in popupState.currentAdvancement.completed"
                :key="`completed-${index}`"
                class="bf-popup-item bf-popup-item--success"
              >
                {{ translate('players', item) }}
              </li>
            </ul>
          </div>
        </div>
      </template>
    </DraggablePopup>
  </div>
</template>

<style scoped>
.bf-advancements-panel {
  background: var(--bf-card-bg);
  border-radius: var(--bf-radius-lg);
  box-shadow: var(--bf-shadow-sm);
  padding: var(--bf-space-4);
  position: relative;
}

.bf-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--bf-space-4);
}

.bf-panel-title {
  font-weight: bold;
  font-size: 1.125rem;
  color: var(--bf-text-primary);
}

.bf-toggle-btn {
  display: flex;
  align-items: center;
  gap: var(--bf-space-2);
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  background: var(--bf-surface-hover);
  border-radius: var(--bf-radius-md);
  border: 1px solid var(--bf-border);
  color: var(--bf-text-secondary);
  transition: all 0.2s ease;
  cursor: pointer;
}

.bf-toggle-btn:hover {
  background: var(--bf-surface-active);
}

.bf-toggle-text {
  font-size: 0.75rem;
}

.bf-icon {
  width: 1rem;
  height: 1rem;
}

.bf-loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 10rem;
  background: var(--bf-surface);
  border-radius: var(--bf-radius-md);
}

.bf-spinner {
  animation: spin 1s linear infinite;
  height: 2rem;
  width: 2rem;
  border-radius: 50%;
  border: 2px solid var(--bf-primary);
  border-top-color: transparent;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.bf-error-message {
  text-align: center;
  color: var(--bf-danger);
  padding: var(--bf-space-4);
  background: color-mix(in srgb, var(--bf-danger) 10%, transparent);
  border-radius: var(--bf-radius-md);
}

.bf-section-subtitle {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--bf-text-secondary);
  margin-bottom: var(--bf-space-2);
}

.bf-adv-stats {
  display: flex;
  flex-wrap: wrap;
  gap: var(--bf-space-3);
  margin-bottom: var(--bf-space-4);
}

.bf-adv-stat-card {
  padding: var(--bf-space-3);
  border-radius: var(--bf-radius-md);
  border: 1px solid var(--bf-border);
}

.bf-adv-stat-card--primary {
  background: var(--bf-gradient-primary);
}

.bf-adv-stat-card--success {
  background: var(--bf-gradient-success);
}

.bf-adv-stat-card--accent {
  background: var(--bf-gradient-accent);
}

.bf-adv-stat-label {
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.bf-adv-stat-card--primary .bf-adv-stat-label {
  color: var(--bf-primary);
}

.bf-adv-stat-card--success .bf-adv-stat-label {
  color: var(--bf-success);
}

.bf-adv-stat-card--accent .bf-adv-stat-label {
  color: var(--bf-accent);
}

.bf-adv-stat-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--bf-text-primary);
}

.bf-progress-bar {
  width: 100%;
  background: var(--bf-surface-hover);
  border-radius: 9999px;
  height: 0.625rem;
}

.bf-progress-fill {
  background: linear-gradient(to right, var(--bf-primary), var(--bf-accent));
  height: 0.625rem;
  border-radius: 9999px;
  transition: all 0.5s ease;
}

.bf-adv-groups {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.bf-adv-group {
  background: var(--bf-surface-hover);
  border-radius: var(--bf-radius-md);
  padding: var(--bf-space-3);
  border: 1px solid var(--bf-border);
}

.bf-group-header {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--bf-text-secondary);
  margin-bottom: var(--bf-space-3);
  display: flex;
  align-items: center;
}

.bf-group-indicator {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  margin-right: var(--bf-space-2);
}

.bf-group-indicator--success {
  background: var(--bf-success);
}

.bf-group-indicator--secondary {
  background: var(--bf-text-muted);
}

.bf-group-count {
  margin-left: var(--bf-space-2);
  font-size: 0.75rem;
  color: var(--bf-text-muted);
}

.bf-adv-complete-label {
  font-size: 0.75rem;
  color: var(--bf-success);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.bf-adv-incomplete-label {
  font-size: 0.75rem;
  color: var(--bf-danger);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
}

.bf-adv-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}

.bf-adv-item {
  display: flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border-radius: var(--bf-radius-sm);
  transition: all 0.2s ease;
  cursor: pointer;
  position: relative;
}

.bf-adv-item:hover {
  transform: scale(1.05);
}

.bf-adv-icon-wrapper {
  position: relative;
  width: 3rem;
  height: 3rem;
  margin-right: var(--bf-space-2);
  transform: translateY(0.5rem);
}

.bf-adv-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  z-index: 0;
  transform: translate(-0.5rem, -0.5rem);
}

.bf-adv-icon {
  position: absolute;
  width: 2rem;
  height: 2rem;
  margin-right: var(--bf-space-2);
  object-fit: contain;
  border-radius: var(--bf-radius-sm);
  z-index: 1;
}

.bf-adv-name {
  font-size: 1rem;
  color: var(--bf-text-secondary);
}

.bf-adv-status {
  margin-left: auto;
  font-size: 0.75rem;
}

.bf-adv-status--complete {
  color: var(--bf-success);
}

.bf-adv-status--incomplete {
  color: var(--bf-danger);
}

.bf-adv-incomplete-section {
  margin-top: var(--bf-space-3);
  padding-top: var(--bf-space-3);
  border-top: 1px solid var(--bf-border);
}

.bf-show-incomplete-btn {
  margin-top: var(--bf-space-3);
  padding-top: var(--bf-space-3);
  border-top: 1px solid var(--bf-border);
}

.bf-expand-btn {
  width: 100%;
  font-size: 0.75rem;
  color: var(--bf-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.25rem 0;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: color 0.2s ease;
}

.bf-expand-btn:hover {
  color: var(--bf-primary-hover);
}

.bf-icon-sm {
  width: 0.75rem;
  height: 0.75rem;
}

.bf-no-data {
  font-size: 0.875rem;
  color: var(--bf-text-muted);
  font-style: italic;
}

.bf-other-adv {
  margin-top: var(--bf-space-2);
}

.bf-empty-state {
  text-align: center;
  font-size: 0.875rem;
  color: var(--bf-text-muted);
  padding: 1rem 0;
  font-style: italic;
}

/* Popup Styles */
.bf-popup-header {
  padding: var(--bf-space-3);
  border-bottom: 1px solid var(--bf-border);
  cursor: move;
  flex-shrink: 0;
}

.bf-popup-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.bf-popup-icon-wrapper {
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.bf-popup-icon {
  width: 2.5rem;
  height: 2.5rem;
  margin-right: var(--bf-space-2);
  border-radius: var(--bf-radius-sm);
  z-index: 1;
}

.bf-popup-title-wrapper {
  min-width: 0;
  flex: 1;
}

.bf-popup-title {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--bf-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bf-popup-subtitle {
  font-size: 0.75rem;
  color: var(--bf-text-muted);
}

.bf-popup-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.bf-popup-section {
  padding: var(--bf-space-3);
}

.bf-popup-section-title {
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: var(--bf-space-2);
  display: flex;
  align-items: center;
}

.bf-popup-section-title--danger {
  color: var(--bf-danger);
}

.bf-popup-section-title--success {
  color: var(--bf-success);
}

.bf-popup-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.bf-popup-item {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: var(--bf-radius-sm);
}

.bf-popup-item--danger {
  color: var(--bf-text-primary);
  background: color-mix(in srgb, var(--bf-danger) 10%, transparent);
}

.bf-popup-item--success {
  color: var(--bf-text-primary);
  background: color-mix(in srgb, var(--bf-success) 10%, transparent);
}
</style>
