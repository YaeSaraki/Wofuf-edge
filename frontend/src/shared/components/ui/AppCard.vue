<script lang="ts" setup>
/**
 * 统一卡片原语 —— 全站卡片外观的唯一来源。
 *
 * 卡片长什么样（表面、描边、阴影、图案、圆角）全部由主题的 --ui-* token 决定，
 * 组件本身不写死任何颜色。液态玻璃 / Memphis 切换时卡片自动跟着变。
 *
 * 用法：
 *   <AppCard variant="raised" size="md" pattern> ... </AppCard>
 *   <AppCard as="button" interactive @click="..."> ... </AppCard>
 *
 * 注意：别在父组件的 scoped 样式里再写 background/border-radius/box-shadow，
 * 那会盖掉主题。要调样式请走 variant / size，或者加一个自己的 class 只调布局。
 */
withDefaults(
  defineProps<{
    /** 表面变体：default 标准 / flat 无阴影 / raised 抬升 / accent 主色氛围 / quiet 无装饰（密集信息用） */
    variant?: 'default' | 'flat' | 'raised' | 'accent' | 'quiet'
    /** 内边距 */
    size?: 'sm' | 'md' | 'lg'
    /** 可点击：悬停抬起 */
    interactive?: boolean
    /** 叠一层主题图案（波点等）—— 只用在装饰位，别压正文 */
    pattern?: boolean
    /** 右上角加几何块（孟菲斯的不对称装饰） */
    shaped?: boolean
    /** 渲染成什么标签 */
    as?: string
  }>(),
  {
    variant: 'default',
    size: 'md',
    interactive: false,
    pattern: false,
    shaped: false,
    as: 'div',
  },
)
</script>

<template>
  <component
    :is="as"
    class="ui-card"
    :class="[
      `ui-card--${variant}`,
      `ui-card--${size}`,
      {
        'ui-card--interactive': interactive,
        'ui-card--pattern': pattern,
        'ui-card--shaped': shaped,
      },
    ]"
  >
    <slot />
  </component>
</template>
