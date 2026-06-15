# Known Issues / 已知问题

本文档记录 Kotomachi 项目中已知的问题、bad cases 及当前处理策略。

---

## 1. Expression Hint safety filter / VNL case

### Symptom / 现象

某些包含英文缩写、专有名词或语音识别碎片的句子，可能导致 `/api/feedback` 返回失败。已观察到 `VNL` 这样的 token 在某些句子中可能触发失败。其他缩写不一定失败，因此不适合写死 whitelist。

### Likely cause / 可能原因

LLM 的安全过滤机制对某些特定 token 组合比较敏感，尤其是短字母序列。

### Current strategy / 当前策略

不为了单个 VNL edge case 大改 `/api/feedback`。该问题暂时作为 known issue，靠失败文案和 bad-case collection 管理。如果未来高频出现，再基于真实 bad cases 统一处理。

### Failure message / 失败文案

```text
表达提示暂时没生成出来。可能是英文缩写、专有名词或语音识别片段触发了安全过滤。可以把句子拆短一点，或把这句话反馈给开发者作为 bad case。
```

### Future handling / 后续处理

待收集更多真实 bad cases 后，再决定是调整提示词规则、添加针对性过滤，还是改进 fallback 策略。

---

## 2. Taisho / 〆 case

### Symptom / 现象

`〆` 是真实的日语符号，读作「しめ」，常用于表示"结束"或"关门"。但对于日语学习者来说，这个符号看起来很像乱码。

### Likely cause / 可能原因

学习者对日语特殊符号不熟悉，容易误认为是字符编码错误。

### Current strategy / 当前策略

NPC 默认避免裸用 `〆`，改用 `締め` 或 `しめ`。小食/下酒菜优先用 `おつまみ` / `つまみ` / `一品`。

### Product judgment / 产品判断

不是禁止「締め / しめ」这个表达，而是避免使用裸符号 `〆`。学习者友好优先于日语符号的原生感。

---

## 3. WordPopover / drawer layering

### Symptom / 现象

查词弹窗在 drawer / card / overflow 容器中容易被压住或裁切。Expression Hint 接入查词后曾出现 WordPopover 被卡片压住的问题。

### Likely cause / 可能原因

局部容器（如 drawer、card）创建了自己的 stacking context，导致内部浮层被限制在容器范围内。

### Current strategy / 当前策略

已通过 portal 到 `document.body` + fixed positioning + high z-index 解决。

### Engineering judgment / 工程判断

查词弹窗属于全局浮层，不应困在局部 card / drawer 的 stacking context 中。后续新增浮层类功能时要优先考虑 portal。

---

## 4. Build type-check / eventTarget undefined

### Symptom / 现象

`use-word-lookup` 中 `eventTarget` 可能是 `EventTarget | null | undefined`。`toElement` helper 如果只接受 `EventTarget | null`，会导致 Vercel build type error。

### Likely cause / 可能原因

hook 抽离后，事件来源变得更泛化，helper 类型定义不够宽松。本地轻量类型检查可能忽略某些边界情况。

### Current strategy / 当前策略

让 `toElement` 安全接受 `undefined`，确保类型定义覆盖所有可能的输入情况。

### Lesson / 经验

Vercel build 会暴露本地轻量检查没发现的 TypeScript 类型问题。hook 重构后要特别注意类型定义的完整性。

---

## 5. Mobile selection experience

### Symptom / 现象

移动端文本选择体验可能不够流畅，尤其是在滚动容器内选择文本时。

### Current strategy / 当前策略

待收集真实使用反馈后再优化。当前优先保证功能可用。

---

## 6. Saved word context display

### Symptom / 现象

收藏词的来源上下文（原聊天消息）显示不够清晰，用户可能记不清某个词是在哪里学到的。

### Current strategy / 当前策略

作为 Next 阶段的优化项，计划增强保存词的来源显示和上下文展示。

---

## Issue Severity Legend / 严重程度说明

- **P0**: 阻塞性问题，影响核心功能使用
- **P1**: 严重问题，影响用户体验或功能完整性
- **P2**: 中等问题，需要修复但不紧急
- **P3**: 轻微问题，可延后处理

| Issue | Severity | Status |
|-------|----------|--------|
| Expression Hint safety filter | P2 | Monitoring |
| Taisho / 〆 case | P3 | Resolved |
| WordPopover layering | P2 | Resolved |
| Build type-check | P2 | Resolved |
| Mobile selection | P3 | Pending feedback |
| Saved word context | P3 | Planned |
