<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useLocale } from '@S/services/i18n/useLocale.ts'
import { siteConfig } from '@S/config/site.ts'
import AppCard from '@S/components/ui/AppCard.vue'

const { translate } = useLocale()

// 服务器统计
const stats = ref([
  { label: translate('app', 'about.stats.version'), value: siteConfig.version, icon: 'box' },
  { label: translate('app', 'about.stats.core'), value: siteConfig.core, icon: 'server' },
  { label: translate('app', 'about.stats.uptime'), value: '24/7', icon: 'clock' },
  { label: translate('app', 'about.stats.founded'), value: siteConfig.founded, icon: 'calendar' },
])

// 动画效果
const isVisible = ref(false)
const textVisible = ref(false)

onMounted(() => {
  setTimeout(() => {
    isVisible.value = true
  }, 100)

  setTimeout(() => {
    textVisible.value = true
  }, 300)
})
</script>

<template>
  <div class="page-container">
    <!-- Hero Section -->
    <section class="hero-section">
      <div class="hero-gradient"></div>

      <div class="hero-content" :class="{ visible: textVisible }">
        <div class="badge ui-badge ui-glass">
          <div class="badge-icon ui-icon ui-icon-sm">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <span>{{ translate('app', 'about.heroTitle') }}</span>
        </div>
        <h1 class="hero-title">
          <span class="title-line">{{ siteConfig.name }}</span>
          <span class="title-line italic">{{ siteConfig.tagline }}</span>
        </h1>
        <p class="hero-subtitle">
          {{ translate('app', 'about.heroSubtitle') }}
        </p>
      </div>

      <div class="hero-fade"></div>
    </section>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 服务器介绍 -->
      <section class="section" :class="{ visible: isVisible }">
        <div class="section-header">
          <div class="badge ui-badge ui-glass">
            <div class="badge-icon ui-icon ui-icon-sm">
              <svg viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span>{{ translate('app', 'about.badge.intro') }}</span>
          </div>
          <h2 class="section-title">{{ translate('app', 'about.intro') }}</h2>
        </div>
        <AppCard class="intro-content" size="lg">
          <p>{{ siteConfig.intro || translate('app', 'about.introText1') }}</p>
        </AppCard>
      </section>

      <!-- 服务器统计 -->
      <section class="section" :class="{ visible: isVisible }">
        <div class="section-header">
          <div class="badge ui-badge ui-glass">
            <div class="badge-icon ui-icon ui-icon-sm">
              <svg viewBox="0 0 24 24">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <span>{{ translate('app', 'about.badge.stats') }}</span>
          </div>
          <h2 class="section-title">{{ translate('app', 'about.stats.title') }}</h2>
        </div>
        <div class="stats-grid">
          <AppCard
            v-for="(stat, index) in stats"
            :key="index"
            class="stat-card"
            interactive
          >
            <div
              class="stat-icon-well ui-icon-well"
              :style="{ '--ui-block': `var(--ui-block-${(index % 3) + 1})` }"
            >
              <div class="ui-icon ui-icon-lg">
                <!-- Box -->
                <svg v-if="stat.icon === 'box'" viewBox="0 0 24 24">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                <!-- Server -->
                <svg v-else-if="stat.icon === 'server'" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                  <line x1="6" y1="6" x2="6.01" y2="6" />
                  <line x1="6" y1="18" x2="6.01" y2="18" />
                </svg>
                <!-- Clock -->
                <svg v-else-if="stat.icon === 'clock'" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <!-- Calendar -->
                <svg v-else-if="stat.icon === 'calendar'" viewBox="0 0 24 24">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
            </div>
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </AppCard>
        </div>
      </section>

      <!-- 联系我们 -->
      <section class="section" :class="{ visible: isVisible }">
        <div class="section-header">
          <div class="badge ui-badge ui-glass">
            <div class="badge-icon ui-icon ui-icon-sm">
              <svg viewBox="0 0 24 24">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <span>{{ translate('app', 'about.badge.contact') }}</span>
          </div>
          <h2 class="section-title">{{ translate('app', 'about.contact.title') }}</h2>
        </div>
        <AppCard class="contact-content" size="lg">
          <p>{{ translate('app', 'about.contact.description') }}</p>
          <div class="contact-links">
            <a href="mailto:contact@wofuf.com" class="contact-link ui-glass">
              <div class="contact-icon ui-icon ui-icon-md">
                <svg viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </div>
              <span>{{ translate('app', 'about.contact.email') }}</span>
            </a>
          </div>
        </AppCard>
      </section>
    </div>
  </div>
</template>

<style scoped>
/* 页面容器 */
.page-container {
  min-height: 100vh;
  background: var(--ui-bg);
  color: var(--ui-text);
  font-family: var(--ui-font-body);
  overflow-x: hidden;
  padding-top: 5rem;
}

/* Hero Section */
.hero-section {
  position: relative;
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6rem 2rem 4rem;
  overflow: hidden;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, var(--ui-hero-glow) 0%, transparent 50%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 900px;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.hero-content.visible {
  opacity: 1;
  transform: translateY(0);
}

.badge {
  margin-bottom: 0.875rem;
}

.badge-icon {
  opacity: 0.9;
  color: var(--ui-accent);
}

.hero-title {
  font-family: var(--ui-font-heading);
  font-size: 4rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  font-weight: 400;
  color: var(--ui-text);
  letter-spacing: -0.03em;
}

@media (min-width: 768px) {
  .hero-title {
    font-size: 5.5rem;
  }
}

.title-line {
  display: block;
  letter-spacing: -0.02em;
}

.title-line.italic {
  font-style: italic;
}

.hero-subtitle {
  font-size: 1.25rem;
  font-weight: 400;
  color: var(--ui-text-secondary);
  line-height: 1.7;
}

.hero-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 200px;
  background: linear-gradient(to top, var(--ui-bg), transparent);
  pointer-events: none;
}

/* 主内容区域 */
.main-content {
  position: relative;
  z-index: 10;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem 4rem;
}

/* Section */
.section {
  margin-bottom: 4rem;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.section.visible {
  opacity: 1;
  transform: translateY(0);
}

.section:nth-child(2) { transition-delay: 0.1s; }
.section:nth-child(3) { transition-delay: 0.2s; }
.section:nth-child(4) { transition-delay: 0.3s; }
.section:nth-child(5) { transition-delay: 0.4s; }

.section-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-family: var(--ui-font-heading);
  font-size: 2.25rem;
  font-weight: 400;
  font-style: italic;
  letter-spacing: -0.01em;
  color: var(--ui-text);
}

@media (min-width: 768px) {
  .section-title {
    font-size: 2.75rem;
  }
}

/* 介绍内容 */
.intro-content {
  line-height: 1.9;
}

.intro-content p {
  margin-bottom: 1.75rem;
  font-size: 1.0625rem;
  color: var(--ui-text-secondary);
}

.intro-content p:last-child {
  margin-bottom: 0;
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.5rem;
}

@media (min-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* 只管排版；底色/描边/图标色由主题的 .ui-icon-well 决定 */
.stat-icon-well {
  margin-bottom: 1.25rem;
}

.stat-value {
  display: block;
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.625rem;
  color: var(--ui-text);
  font-family: var(--ui-font-heading);
  font-style: italic;
}

.stat-label {
  font-size: 0.9375rem;
  color: var(--ui-text-muted);
  font-weight: 500;
}

/* 联系区域 */
.contact-content {
  text-align: center;
}

.contact-content p {
  margin-bottom: 2rem;
  color: var(--ui-text-secondary);
  font-size: 1.0625rem;
  line-height: 1.7;
}

.contact-links {
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.contact-link {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2.25rem;
  border-radius: var(--ui-radius-full);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: transform var(--ui-transition-normal);
  color: var(--ui-text);
}

.contact-link:hover {
  transform: translateY(-2px);
}

.contact-icon {
  opacity: 0.9;
}
</style>
