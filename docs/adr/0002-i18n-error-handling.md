# ADR-0002：错误文案的 i18n 归属与语言包防复发

- 状态：已采纳
- 日期：2026-10-30
- 相关：[docs/I18N.md](../I18N.md)、`frontend/src/shared/infra/api/apiErrors.ts`、`frontend/src/shared/services/i18n/index.ts`、`scripts/check-i18n.sh`

## 背景

界面文案硬编码中文不只出现在组件里，还藏在**错误信息链路**上：

```
后端 {success, code, data, message}   ← code 稳定、message 中文
  → http.ts 抛 new Error(message)     ← code 在这里被丢掉
  → service Result.failure(message)
  → 组件 errorMsg = result.error      ← 页面显示中文原文
```

只看前端自己的文案，会得出"错误提示已经 i18n 了"的错觉 —— 但英文界面看到的
仍然是后端的中文原文。

同时，语言包有 **80 个定义了却从未被使用**的 key（`app` 51 + `players` 29），
说明这个仓库一直在"写了不接"：没有机制阻止下一处硬编码中文进来，
也没有机制发现"新增条目忘了写英文"。

## 决策

1. **翻译发生在 service 层，组件层零改动。**
   service 把失败变成当前语言的文案，`Result.error` 仍然是字符串，
   组件照旧显示 `errorMsg`。组件不需要知道"这个错误对应哪个 key"。

2. **按后端的错误码翻译，而不是按 message 翻译。**
   后端错误响应本来就带稳定的 `code`（`TURNSTILE_REQUIRED_ERROR` 等），
   前端只是没接住。两级查找：

   - 先查**全局映射**（`app` 命名空间的 `error.*`）：后端说的那种错
   - 没有 code（或 code 没登记）→ 查**接口级兜底 key**（`players` 命名空间的
     `error.player-profile` 等）：这个接口自己挂了
   - 两级都没有 → 退回 code 原文

   **后端一行不用改**。后端加新 code 时前端加一条映射即可 ——
   后端的 `statusFromCode` 本来就是模式匹配而不是穷举，不需要同步维护。

3. **`translate()` 扩展可选的插值参数**：`translate(ns, key, params?)`，
   把条目里的 `{name}` 替换成值。第三参数可选，现有 2300+ 条目与所有调用点零影响。
   没提供对应参数的占位符**原样保留**，界面上能直接看出漏传了什么。

4. **语言选择要持久化**：`setLocale()` 原本只写 `localStorage` 却从没人读，
   刷新页面语言就弹回浏览器语言。现在启动时读回（与 `useTheme.ts` 同一模式）。

5. **防复发靠 CI 脚本，不靠自觉**：`scripts/check-i18n.sh` 检查两件事 ——
   语言包每条都要有 `zh` 和 `en`；用户可见的文案不许硬编码中文。
   现存的欠账走 `scripts/i18n-allowlist.txt`，**白名单长度就是欠账数**，
   还完就删掉对应行（脚本会检查白名单是否还有效）。

## 后果

- **组件层不用动**：`Result.error` 的类型和语义都没变，现有组件零回归风险。
- **service 层依赖了 i18n**：`i18n` 服务本来就在 `shared/services/` 下，
  与 service 同层，不算破坏分层；但 service 从此不是纯数据层了。
- **插值只用于文本节点**：用户输入（比如搜索关键词）会进文案，
  所以绝不能用 `v-html` 渲染插值结果 —— 文本节点由 Vue 自动转义，是安全的。
- **`fallback` 保持英文**：当前语言缺文案时回落英文，而不是漏出一串键名。
  代价是中文界面下漏写中文会显示英文 —— 比漏出键名好。
- **语言包条目必须同时写两种语言**，CI 会拦。确实不需要英文的显式写 `en: ''`，
  会被记账但不算失败。
- **欠账是显式的**：`docs/I18N.md` 里列着 6 处用户可见的硬编码中文和 80 个未使用的 key，
  都在白名单或清单里记着，不是"没人知道的坑"。
