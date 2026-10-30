# 界面主题系统（Theme System）

> 一套 token 契约 + N 个主题文件 + **构建期**选择。
> 主题决定「长什么样」，明暗模式决定「亮还是暗」，两者正交。

---

## 1. 两条轴，别搞混

| | 是什么 | 什么时候定 | 怎么改 |
|---|---|---|---|
| **明暗模式** | light / dark / system | 运行时 | 页面右下角设置弹窗（存 localStorage） |
| **界面主题** | liquid-glass / memphis | **构建期** | `config.env` 的 `UI_THEME`，改完重新 `scripts/build.sh` |

---

## 2. 部署时怎么选

`config.env`（唯一要改的配置文件）：

```bash
# ───────────────────────── 界面主题 ─────────────────────────
# 可选值：
#   memphis —— Memphis 孟菲斯：波点 / 撞色 / 硬投影（默认）
#   liquid-glass —— 液态玻璃：通透玻璃 + 火焰橙，站点原本的样子
UI_THEME="memphis"
```

改完：

```bash
./wofuf build      # 构建（会把 UI_THEME 注进前端）
./wofuf upload     # 上传
```

也可以用命令行：

```bash
./wofuf config set UI_THEME memphis
./wofuf config check        # 会校验主题名是否合法
./wofuf doctor              # 体检时会显示当前主题
```

**配错了不会白屏**：构建时校验不通过会自动退回 `liquid-glass` 并打印警告。
`frontend/index.html` 里还有一段内联脚本，在首屏渲染前就把 `data-theme` 写上，所以不会闪一下默认主题。

---

## 3. 目录结构

```
frontend/src/shared/
├── themes/
│   ├── base.css       ← 结构刻度（间距/圆角/动效）+ 共享原语类 + 语义契约定义
│   ├── liquid-glass.css ← 主题：液态玻璃
│   ├── memphis.css    ← 主题：Memphis 孟菲斯（默认）
│   ├── _template.css  ← 主题模板：新增主题照抄这份
│   └── index.css      ← 入口：@import base + 各主题
├── config/
│   └── theme.ts       ← 主题注册表 + 构建期解析 + 运行时写 data-theme
└── components/ui/
    └── AppCard.vue    ← 统一卡片原语：全站卡片外观的唯一来源
```

加载顺序（`shared/main.ts`）：

```
main.css (Tailwind)
  → themes/index.css (base + liquid-glass + memphis)
  → styles/global.css (外壳层：字体/图标/玻璃/关键帧)
  → layout (浮动菜单)
```

---

## 4. 主题是怎么被选中的

CSS 靠 `<html>` 上的属性区分：

```css
html[data-theme='liquid-glass']         { /* 浅色 */ }
html[data-theme='liquid-glass'].dark     { /* 深色 */ }
html[data-theme='memphis']                { /* 浅色 */ }
html[data-theme='memphis'].dark            { /* 深色 */ }
```

> **写主题时注意**：深色变体必须写成 `html[data-theme='xxx'].dark`
> （而不是 `.dark`），否则优先级压不住浅色那一组。

新增主题要登记两处：

1. `frontend/src/shared/config/theme.ts` 的 `THEME_REGISTRY`
2. `scripts/lib.sh` 的 `UI_THEMES`

---

## 5. Token 契约

主题**只负责语义层**（颜色、表面、描边、阴影、图案、动效时长/曲线）。
间距和圆角刻度在 `base.css`，主题一般不覆盖。

### 页面与表面

| Token | 含义 |
|---|---|
| `--ui-bg` | 页面底色 |
| `--ui-surface` | 卡片/面板底色 |
| `--ui-surface-raised` | 抬升表面（图标井、内嵌块） |
| `--ui-surface-sunken` | 下沉表面（输入框、进度条槽） |
| `--ui-surface-hover` / `--ui-surface-active` | 悬停 / 按下叠色 |
| `--ui-surface-glass` | 半透明浮层（弹窗、导航、结果容器） |

### 描边与文字

| Token | 含义 |
|---|---|
| `--ui-border` / `--ui-border-subtle` / `--ui-border-accent` | 三档描边 |
| `--ui-text` | 主文字 |
| `--ui-text-secondary` | 次文字 |
| `--ui-text-muted` | 弱文字（标签、说明） |
| `--ui-text-faint` | 最弱文字（脚注、时间戳） |
| `--ui-text-accent` | 强调色文字 |
| `--ui-text-on-accent` | 强调色块**上面**的文字色 |

### 主色与状态色

| Token | 含义 |
|---|---|
| `--ui-accent` / `--ui-accent-light` / `--ui-accent-dark` | 主色三档 |
| `--ui-accent-glow` | 主色光晕（阴影用） |
| `--ui-accent-gradient` / `--ui-accent-gradient-subtle` | 主色渐变（实 / 淡） |
| `--ui-highlight` / `--ui-highlight-light` | 次强调色 |
| `--ui-block-1` / `--ui-block-2` / `--ui-block-3` | **成组色块**（卡片/图标井用的高饱和色） |
| `--ui-success` / `--ui-warning` / `--ui-danger` / `--ui-info` | 状态色，各带 `-light` 和 `-bg` 两件套 |

### 卡片

| Token | 含义 |
|---|---|
| `--ui-card-bg` / `--ui-card-border` / `--ui-card-border-width` | 卡片表面与描边 |
| `--ui-card-radius` / `--ui-card-radius-sm` / `--ui-card-radius-lg` | 卡片圆角 |
| `--ui-card-shadow` / `--ui-card-shadow-hover` | 卡片阴影 |
| `--ui-card-lift` | 悬停抬起多少（负值向上） |
| `--ui-card-ease` | 悬停位移的曲线（孟菲斯用跳切） |
| `--ui-card-pattern` / `--ui-card-pattern-size` | 装饰图案（背景图，永远在文字下面） |

### 其它

`--ui-shadow-sm|md|lg`、`--ui-radius-*`、`--ui-space-*`、`--ui-transition-*`、
`--ui-duration-*`、`--ui-ease-out`、`--ui-ease-step`、
`--ui-input-*`、`--ui-btn-*`、`--ui-nav-*`、`--ui-hero-glow`、
`--ui-icon-well-*`、`--ui-shape-*`、`--ui-font-heading`、`--ui-font-body`。

---

## 6. 统一卡片原语

```vue
<script setup lang="ts">
import AppCard from '@S/components/ui/AppCard.vue'
</script>

<template>
  <AppCard variant="default" size="md" interactive>…</AppCard>
  <AppCard variant="quiet" size="sm">…</AppCard>   <!-- 密集信息，不加装饰 -->
  <AppCard variant="accent" size="sm" shaped>…</AppCard>
</template>
```

| Prop | 取值 | 说明 |
|---|---|---|
| `variant` | `default` / `flat` / `raised` / `accent` / `quiet` | 表面变体 |
| `size` | `sm` / `md` / `lg` | 内边距 |
| `interactive` | boolean | 可点击，悬停抬起 |
| `pattern` | boolean | 叠主题图案（波点） |
| `shaped` | boolean | 右上角加几何块（不对称装饰） |
| `as` | string | 渲染成什么标签 |

> ⚠️ **别在父组件的 scoped 样式里再写 `background` / `border-radius` / `box-shadow`**。
> 父组件 scoped 选择器带 `data-v-*` 属性，优先级高于 `base.css` 的 `.ui-card`，
> 会把主题盖掉。要调样式走 `variant` / `size`，或者自己的 class 只调布局。

---

## 7. 新增一个主题

1. 复制模板：

   ```bash
   cp frontend/src/shared/themes/_template.css frontend/src/shared/themes/<你的主题>.css
   ```

2. 把模板里的 `TEMPLATE` 全部换成你的主题 id，逐个 token 填值（浅色 + 深色都要填）。

3. 在 `frontend/src/shared/themes/index.css` 里 `@import './<你的主题>.css';`

4. 在 `frontend/src/shared/config/theme.ts` 的 `THEME_REGISTRY` 登记：

   ```ts
   mytheme: { id: 'mytheme', label: 'My Theme', description: '一句话说明' },
   ```

5. 在 `scripts/lib.sh` 的 `UI_THEMES` 里加上 id。

6. `config.env` 里 `UI_THEME="mytheme"`，然后 `./wofuf build && ./wofuf upload`。

---

## 8. Memphis 孟菲斯主题的设计约束

这一节是**做主题时该守的规矩**，孟菲斯只是示范：

1. **高饱和色只做色块，不做正文色。**
   文字永远落在安静的浅底上（`--ui-card-bg` / `--ui-surface`）。
   想用珊瑚色写文字，要用压暗过的 `--ui-text-accent`，不是 `--ui-accent`。

2. **图案只出现在装饰位。**
   `.ui-card--pattern` 是整卡叠波点，只用在「概览小卡」这种没多少字的地方；
   密集数据卡片一律 `variant="quiet"`。

3. **移动端自动降密度。**
   窄屏把图案调疏、硬投影收小（见 `memphis.css` 的 `@media (max-width: 640px)`）。

4. **反馈 120–240ms。**
   `--ui-duration-fast/base/slow` = 120 / 180 / 240ms。

5. **跳切只给状态切换用。**
   `--ui-ease-step`（`steps(1, end)`）用在「开/关、选中/未选中」这类**状态跳变**，
   不要拿来做淡入或长距离位移。

6. **不做闪烁、不做快速交替的大面积高反差。**
   避免光敏性风险和阅读负担。

7. **必须有明确的静态完成态。**
   交互结束后元素停在一个稳定的最终状态，不能停在动画中间。

8. **`prefers-reduced-motion` 下一切位移停掉。**
   `base.css` 已经全局处理，主题不需要重复做。

---

## 9. 自查清单

改完主题/卡片后跑一遍：

```bash
cd frontend
npm run type-check
npm run build

# 不该再有旧 token
grep -rn '\--bf-' src/        # 应为空
grep -rn '\--w-' src/          # 应为空（旧死代码）
grep -rn '\--vt-' src/         # 应为空（脚手架残留）

# 不该再有写死的颜色
grep -rnE '#[0-9a-fA-F]{3,8}\b|rgba?\(' src/modules src/views | grep -v 'themes/'
```

然后切主题各看一眼：

```bash
./wofuf config set UI_THEME liquid-glass && ./wofuf build
./wofuf config set UI_THEME memphis  && ./wofuf build
```
