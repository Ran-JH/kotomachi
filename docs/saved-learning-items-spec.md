# Saved Learning Items Spec

## Purpose

Saved Learning Items 的目标是把聊天中的学习瞬间沉淀为可复习资产：

- 把"看完即走"的学习内容保存下来；
- 支持后续低压力复习；
- 让 Kotomachi 从聊天助手演进为可积累的学习工具；
- 保持轻量，不做打卡压力和考试感——不能变成高压力打卡软件。

## Product Principles

1. Low-pressure, high-learning-value.
2. 收藏是轻量行为，不打断聊天。
3. 收藏对象必须来自真实上下文，不凭空生成。
4. 先做 localStorage MVP，不做账号、云同步、数据库。
5. 不保存音频文件。
6. 不收藏私人敏感信息提示，但 MVP 阶段不做复杂隐私分类。
7. 日语学习内容保持日语；解释语言后续跟随 UI language。

## Item Types

### 1) Saved Summary Card

来源：回顾卡片（Session Summary Card）

字段建议：

- `id`
- `type: "summary_card"`
- `npcId`
- `title`
- `createdAt`
- `sourceMessageIds` 或 `sourceFingerprint`
- `summaryCardId`
- `tags`（可选）
- `favorite: true`

说明：MVP 可复用现有 summary 历史，不强制单独建复杂收藏层。`favorite` 标记用于区分"自动保留在回顾历史"和"用户主动收藏"。

### 2) Saved Expression

来源：

- 表达提示三档建议
- 回顾卡片「下次可以这样说」

字段建议：

- `id`
- `type: "expression"`
- `npcId`
- `original`
- `suggestion`
- `level: "casual" | "neutral" | "polite" | "summary_upgrade"`
- `note`
- `source: "feedback" | "summary_card"`
- `sourceMessageId` 或 `summaryCardId`
- `createdAt`
- `uiLanguageAtSave`（可选，记录收藏时 UI 语言，后续 Pack N1 用）

要求：

- 收藏对象是具体日语表达，不是整段解释。
- `note` 没有学习价值时允许为空。

### 3) Saved Word

来源：

- 查词 popover
- 回顾卡片「今日词语」

字段建议：

- `id`
- `type: "word"`
- `npcId`
- `word`
- `reading`
- `meaning`
- `meaningLanguage: "zh" | "en"`
- `example`
- `source: "lookup" | "summary_card"`
- `sourceMessageId` 或 `summaryCardId`
- `createdAt`

要求：

- `word` 必须是词或短语，不能是整句。
- `meaning` 跟随保存时 UI language 或当时生成解释语言。
- `example` 保持日语。

## LocalStorage Design

MVP key：

- `kotomachi_saved_items_v1`

结构建议：

- 可用单数组（`SavedItem[]`）或按 type 分组存储（如 `{ expressions: [], words: [], summaryCards: [] }`），按 type 分组查询更方便。
- 必须有去重策略：
  - expression：`normalizedSuggestion + npcId`
  - word：`normalizedWord + reading`
  - summary card：`summaryCardId` 或 `sourceFingerprint`
- 容量限制：
  - MVP 建议总量上限 200，或每类上限 100。
- 支持删除和取消收藏。

## UI Placement

1. Sidebar 增加轻量入口：`收藏 / Saved`
2. 表达提示卡片增加收藏按钮
3. 查词 popover 增加收藏按钮
4. 回顾卡片支持收藏标记，或直接复用回顾历史作为收藏入口
5. 暂不做复杂复习模式

## Review Page / Panel MVP

收藏面板 MVP：

- 按类型筛选：全部 / 表达 / 词语 / 回顾卡片
- 显示最近收藏
- 点击查看详情
- 支持删除
- 不做 spaced repetition
- 不做打卡
- 先不做复杂复习模式

## UI Language Rule

1. UI labels follow UI language（zh / en）。
2. Japanese learning content remains Japanese。
3. Meaning / note / explanation 逐步跟随 UI language。
4. 已收藏项保留保存时语言，不自动回译；除非用户触发再生成。
5. 不翻译 NPC replies 或用户原消息。

## Pack Plan

### Pack M1: Saved Items LocalStorage helper

- 新增 saved item types / helper
- 仅做数据层与最小调用，不扩 UI

### Pack M2: Save Word from Explain Popover

- 在查词 popover 收藏词语
- 收藏按钮放在读音/释义行旁边

### Pack M3: Save Expression from Expression Hints

- 在表达提示收藏推荐句
- 每档建议卡片增加收藏按钮

### Pack M4: Saved Items Sidebar Panel

- sidebar 增加收藏入口与列表
- 按类型筛选、查看详情、删除

### Pack N1: Generated Explanation Language

- meaning / note / explanation 跟随 UI language
- 不翻译日语学习内容本体
- 已收藏项保留保存时语言

## Risks

- localStorage 膨胀：总量上限和每类上限可缓解，但长期仍需考虑清理策略
- 重复收藏：去重规则需覆盖 normalized 文本匹配，避免同一表达因微小差异被重复收藏
- 收藏低质量内容：用户可能收藏无学习价值的表达或词语，MVP 先不做质量过滤
- 英文 UI 下残留中文解释：已收藏项的 meaningLanguage 可能与当前 UI language 不一致
- 过度"学习软件化"，破坏低压力聊天感：收藏入口应轻量、不打断，不做打卡或复习提醒

## Manual QA Ideas

- 收藏词语（lookup / summary 来源）
- 收藏表达（feedback / summary 来源）
- 删除收藏与去重行为
- 切换 UI language 后已收藏内容显示一致性
- localStorage 旧数据兼容（版本迁移或 fallback）
- 不影响 TTS/STT、表达提示、查词、回顾卡片主链路
