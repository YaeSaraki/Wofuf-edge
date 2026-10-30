# ADR-0001：主题真源唯一 + 首屏注入单一路径

- 状态：已采纳
- 日期：2026-10-30
- 相关：[docs/THEMES.md](../THEMES.md)、`scripts/lib.sh`、`frontend/vite.config.ts`、`scripts/check-theme.sh`

## 背景

界面主题这条链路横跨五处：bash 脚本（`scripts/lib.sh`、`scripts/build.sh`）、
Node 构建配置（`frontend/vite.config.ts`）、前端注册表（`frontend/src/shared/config/theme.ts`）、
首屏内联脚本（`frontend/index.html`）和文档（`docs/THEMES.md`）。

同一个「默认主题是谁」被写了四遍，其中三遍是 `memphis`、一遍是 `liquid-glass`；
「有哪些主题 id」被写了两遍。没有约束它们不许漂移，于是：

- 非法 `UI_THEME`（比如 `bogus`）会让 `scripts/build.sh` 的
  `UI_THEME_RESOLVED="$(resolve_ui_theme)"` 把 `warn` 的输出一起吞进变量，
  主题值被污染成一段带 ANSI 转义的多行文本；
- 这段文本被写进 `index.html` 的 `var t = '…'`，首屏内联脚本直接语法错误、不执行，
  `data-theme` 压根没设上；
- 所有 `--ui-*` token 都挂在 `html[data-theme=…]` 下，token 全部失效 → 白屏。

也就是说：**用户把主题名写错一个字母，站点就白屏**，而 CI 全程绿灯。

## 决策

1. **真源唯一**：`scripts/lib.sh` 的 `UI_THEMES` / `DEFAULT_UI_THEME` 是唯一真源。
   `frontend/vite.config.ts`、`theme.ts`、`index.html`、`docs/THEMES.md` 都是它的副本。

2. **注入单一路径**：`frontend/vite.config.ts` 读仓库根的 `config.env`，取出 `UI_THEME`，
   按自己的清单校验后写进 `process.env.VITE_UI_THEME`。
   `index.html` 的 `%VITE_UI_THEME%` 和前端 `import.meta.env.VITE_UI_THEME` 都从这一处取值，
   于是 dev（`npm run dev`）和 build（`npm run build`）走同一条路，裸跑构建也不会漏注入。

   优先级：构建脚本显式注入 > 根 `config.env` > 内置默认。

3. **副本靠 CI 断言，不靠自觉**：`scripts/check-theme.sh` 断言
   默认主题在五处一致、主题清单在三处一致；CI 在构建之后跑它，不一致就红。

4. **产物也要断言**：构建完检查 `deploy/web/index.html` 里注入的主题值是合法 id
   （不是占位符、不是空），并把首屏内联脚本抽出来 `node --check` 一次。
   这是唯一直接针对「白屏」这个后果的检查。

5. **非法值一律退回默认主题并告警**，绝不把非法值写进产物。校验发生在
   bash 侧（`lib.sh`）和 Node 侧（`vite.config.ts`）两处，两边都按同一份清单。

6. **运维脚本的输出流有规矩**：`warn` / `err` 写 stderr，`step` / `sub` / `ok` / `note` 写 stdout；
   `resolve_ui_theme` 把结果写进全局变量 `UI_THEME_RESOLVED`，不用 stdout 返回
   ——命令替换会把警告一起吞进去，这是第 1 条事故的直接成因。

## 后果

- **加一个主题要改 3 处**（`lib.sh`、`vite.config.ts`、`theme.ts`）再加 CSS 与注册表，
  改完跑 `scripts/check-theme.sh` 确认没漂移。改漏了 CI 会拦下来，不用靠记忆。
- **Node 侧仍有一份清单副本**。彻底消除副本需要把注册表挪成共享 JSON 文件，
  本次不做（真源放在 `lib.sh` 是刻意的选择，bash 侧不必引入 JSON 解析）。
- **`config.env` 仍然不入库**，仍是唯一定制点；`vite.config.ts` 只读它，不写它。
- **白屏风险从「用户配错就中招」降为「CI 拦得住」**：非法主题值在构建期就被退回默认主题，
  且产物层有一道直接针对首屏脚本的语法断言。
- **只迁了 `VITE_UI_THEME`**。其余 8 个 `VITE_*` 仍由 `scripts/build.sh` 注入：
  主题配错会白屏，其余变量配错只是站点信息显示不对（`site.ts` 有内联默认值兜底）。
