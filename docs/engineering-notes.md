# Engineering Notes / 工程经验

本文档记录 Kotomachi 项目开发过程中的工程经验、架构决策和可复用模式。

---

## 1. 高风险 UI 能力先抽离再扩范围

### Background / 背景

查词功能原本绑在 `ChatBubble` 组件中。当需要扩展到 Expression Hint、Saved Items Panel、Review Card 等区域时，直接修改会增加回归风险。

### Approach / 做法

1. 先抽离核心逻辑：将查词相关代码拆分为 `WordPopover` 组件、`useWordLookupSelection` hook 和 `SelectableLookupText` wrapper；
2. 验证原功能：确认聊天查词功能不回归；
3. 逐步扩面：依次接入 Expression Hint、Saved Items Panel、Review Card。

### Principle / 原则

复杂交互能力不要一边抽离一边大范围接入。先重构、再扩面。

---

## 2. 浮层类组件优先考虑 portal

### Background / 背景

`WordPopover` 接入 Expression Hint 后曾被卡片压住，原因是 drawer / card / overflow 容器创建了自己的 stacking context，限制了内部浮层的显示范围。

### Approach / 做法

将查词弹窗通过 React Portal 挂载到 `document.body`，配合 fixed positioning 和高 z-index，使其脱离局部容器的 stacking context。

### Principle / 原则

全局浮层应尽量脱离局部容器。

---

## 3. selection 功能不要全局监听

### Background / 背景

全局监听 `document selection` 容易导致误触问题：按钮、tab、select、input、textarea 等功能性 UI 可能被误判为可查词区域。

### Approach / 做法

采用 `SelectableLookupText` 显式 wrapper 模式，只有被 wrapper 包住的学习文本才可查词。同时在 hook 中过滤以下元素：

- `button`
- `select`
- `input`
- `textarea`
- `a`
- `[role="button"]`
- `[data-lookup-disabled="true"]`

### Principle / 原则

可选中文本能力应 opt-in，不应全站默认启用。

---

## 4. 语言学习产品中，STT 应允许用户确认

### Background / 背景

语音识别如果直接发送，会增加用户压力，也容易发送错误识别文本，导致用户尴尬或需要撤回。

### Approach / 做法

STT 识别结果先填入输入框，用户确认或编辑后再手动发送。STT 识别中不显示"NPC 回复中"状态，避免用户误以为消息已发送。

### Principle / 原则

低压力语言练习产品中，用户应该保留发送前控制权。

---

## 5. 语法功能不要做成大模块

### Background / 背景

最初考虑做一个独立的语法学习模块，但这样会增加产品复杂度，也可能让用户感到压力。

### Approach / 做法

将语法说明（`structureNote`）嵌入 Expression Hint 的具体表达建议中。用户通过具体表达理解句型，而不是进入独立语法课。

`structureNote` 包含：
- `pattern`: 可复用的日语句型，如「〜てみたいです」
- `explanation`: 简短的学习者友好解释
- `examples`: 最多 2 个使用相同句型的日语例句

### Principle / 原则

语法说明服务输出表达，不单独变成高压学习模块。

---

## 6. Codex / Trae 工作流

### Background / 背景

在使用 AI 辅助开发时，需要明确分工和流程，避免混乱和风险。

### Approach / 做法

1. **大改前先只读审查**：充分理解现有代码后再动手；
2. **小 patch 分阶段做**：将大改动拆分为多个小 patch，降低风险；
3. **不默认 npm run build**：避免不必要的构建；
4. **不自动 commit / push**：保持人工确认环节；
5. **工具分工**：Codex 更适合高风险精改；Trae / Cursor 更适合文档、低风险 UI、批量整理。

### Principle / 原则

AI 辅助开发应遵循"先理解、后行动、小步走、人工确认"的流程。

---

## 7. TypeScript 类型检查要完整

### Background / 背景

`use-word-lookup` 抽离后，`eventTarget` 的类型可能是 `EventTarget | null | undefined`，但 `toElement` helper 只接受 `EventTarget | null`，导致 Vercel build 失败。

### Approach / 做法

确保 helper 函数的类型定义覆盖所有可能的输入情况，包括 `undefined`。

### Principle / 原则

hook 重构后要特别注意类型定义的完整性，Vercel build 的类型检查比本地更严格。

---

## 8. 移动端交互要特殊处理

### Background / 背景

移动端文本选择、手势操作与桌面端有很大差异，直接复用桌面端逻辑可能导致体验问题。

### Approach / 做法

1. 移动端菜单和键盘交互需要特殊处理；
2. 浮层定位在移动端要考虑虚拟键盘的影响；
3. 触控目标尺寸要符合移动端标准（至少 44px）。

### Principle / 原则

移动端交互需要独立考虑，不能简单复用桌面端逻辑。

---

## Product Notes / 产品思考

### 当前阶段重点

Kotomachi 当前不追求继续堆功能，而是专注于：

1. **真实使用测试**：观察真实用户如何使用产品；
2. **持续开口观察**：观察用户是否愿意持续开口练习；
3. **bad case 收集**：记录功能失败或体验不佳的情况；
4. **小 bug 修复**：解决影响体验的小问题；
5. **README / portfolio polish**：优化项目展示文档；
6. **定位保持**：保持低压力输出练习的核心定位。

### 产品判断

Kotomachi 不追求把所有学习功能一次性做满。核心是：让用户更容易把想说的话说出来，并在低压力环境中积累表达资产。

### 功能边界

- 不做独立语法模块；
- 不做全站 selection listener；
- 不做强制学习任务；
- 不做评分系统；
- 不做复杂的成就/打卡机制。

---

## Architecture Principles / 架构原则

1. **分层设计**：聊天层与学习层分离，学习功能作为可选入口；
2. **渐进增强**：核心功能可用后，再逐步扩展；
3. **局部优先**：能用局部状态解决的问题，不引入全局状态；
4. **可预测性**：用户操作的结果应该可预测；
5. **优雅降级**：功能失败时提供友好的错误提示和 fallback；
6. **性能优先**：避免不必要的渲染和计算；
7. **可测试性**：设计可独立测试的组件和函数。
