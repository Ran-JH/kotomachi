# ふりかえり / Session Summary Card Spec

## 1. Feature Name

- UI name: `ふりかえり`
- Engineering name: `Session Summary Card`

## 2. Product Positioning

`ふりかえり` 不是学习打卡、分数报告或纠错清单。它是一张在一次真实对话之后生成的轻量复习卡，用来帮用户回看今天聊了什么、哪些表达可以继续使用、哪些表达下次可以说得更自然。

这个功能的核心不是“低压力所以内容很浅”，而是：在低压力语气中保留真实学习信息。它应该像 ChatGPT-like 对话助手里的个人表达复习卡，而不是传统学习软件里的严肃课堂报告。

`ふりかえり` 也应该是 evidence-based summary。它不应该让模型完全自由挑学习点，而应优先使用用户真实行为信号，例如非日语表达片段、用户打开或播放过的 `表現ヒント`、用户主动查过的词。

产品边界：

- 不是打卡系统。
- 不是分数报告。
- 不是错误清单。
- 不是老师批改。
- 是一次对话后的轻量复习卡。
- 目标是在温和语气中沉淀可复习、可复用的语言信息。

## 3. User Problem

通用 AI 可以陪用户聊天，但不一定会把一次对话中有学习价值的内容沉淀下来。用户聊完之后，往往很难回看：

- 今天到底聊了什么；
- 哪些表达其实已经可以继续使用；
- 哪些表达下次可以更自然；
- 哪些词是自己主动查过、值得复习的；
- 下次可以接着聊什么。

用户真实行为信号比模型自由挑选更可靠：

- 用户输入中的英文或明显中文片段，通常代表表达缺口。
- 用户打开或播放过的 `表現ヒント`，代表用户主动关注过某句表达。
- 用户主动查过的词，通常比模型自己挑的词更能代表用户不熟悉、值得复习的内容。

## 4. MVP Scope

### 第一版要做

- 用户手动生成 `ふりかえり`。
- 基于当前 NPC 的最近对话生成卡片。
- 支持传入 `recentLookups`。
- 支持传入 `recentExpressionHints`。
- 支持传入 `nonJapaneseSpans`。
- 卡片保存到 LocalStorage。
- sidebar 显示最近卡片。
- 点击卡片打开详情。
- 支持删除卡片。
- 最多保存 50 张卡片。

### 第一版不做

- 登录。
- 云同步。
- 搜索。
- 标签。
- 打卡。
- 分数。
- 发音评分。
- 自动弹出。
- 复杂统计。

## 5. Card Content Structure

### A. 今日の話

要求：

- 1 到 2 句话。
- 总结本次聊天话题。
- 语气自然，不写成报告。

```ts
todayTopic: string;
```

### B. そのまま使える表現

说明用户已经用得不错、可以继续复用的表达。

要求：

- 最多 2 条。
- 必须来自用户真实输入或本次对话中的可复用表达。
- 每条包含 `expression` 和 `note`。
- 不要空泛鼓励，例如“你说得很好”。

```ts
usableExpressions: Array<{
  expression: string;
  note: string;
}>;
```

### C. 次はこう言える

说明下次可以更自然的表达。

要求：

- 最多 2 条。
- 必须基于用户真实输入或真实行为信号。
- 优先使用非日语片段、用户打开或播放过的 `表現ヒント`。
- 每条包含：原表达、更自然表达、学习点、source。
- 不要做空泛纠错。
- 不要列错误清单。
- 更自然表达必须适合日常口语。

```ts
expressionUpgrades: ExpressionUpgrade[];
```

### D. 今日のことば

复习今天值得记住的词或常用说法。

要求：

- 优先使用用户查过的词，即 `recentLookups`。
- 最多 3 到 5 条。
- 如果 `recentLookups` 不足，再从 conversation 中补充。
- 每条包含 `word`、`reading`、`meaning`、`example`、`source`。
- `source` 为 `looked_up` 或 `conversation`。
- 每张卡最多引用 3 到 5 个查词记录。

```ts
reviewWords: ReviewWord[];
```

### E. 次に話してみること

给一个低压力的下次话题建议。

要求：

- 只给 1 条。
- 像自然延续，而不是作业。
- 不要写成“请完成以下练习”。

```ts
nextTopicSuggestion: string;
```

## 6. Learning Signal Priority

`ふりかえり` 的学习点必须尽量来自真实用户行为，而不是让模型自由发挥。模型可以整理、压缩和改写，但优先级应由 evidence signals 决定。

### 表达建议区：`次はこう言える`

优先级：

1. 用户输入中的非日语片段，例如英文或明显中文。
   - 这通常表示用户还不会用日语表达这部分意思。
   - 这些片段应优先进入 `次はこう言える`，转成可复用的自然日语表达。
2. 用户打开过或播放过的 `表現ヒント`。
   - 打开 hint 表示用户主动关注过这句话。
   - 播放过的 suggestion 优先级高于只打开过的 suggestion。
   - Summary 不应该机械复制三档建议，而应该把这些建议整理成更干净、更可复用的表达复习内容。
3. 如果以上信号不足，再由模型从用户日语输入中挑选值得优化的表达。
   - 这类条目的 `source` 应标记为 `model_selected`。
   - 信息不足时可以少写，不要为了填满两条而凑数。

### 单词区：`今日のことば`

优先级：

1. 用户主动查过的词。
   - 查词是强学习信号。
   - 每张卡最多引用 3 到 5 个查词记录。
2. 对话中出现的高频、实用词。
   - 应优先选择日常口语中可复用的词或说法。
3. 模型自行挑选的词。
   - 只能在前两个信号不足时补充。
   - 不要挑生僻词或与本次对话关系很弱的词。

### Recent Lookups

`recentLookups` 是 session summary request 的可选输入。

说明：

- 用户查过的词是强学习信号。
- Summary card 应优先把查过的词放入 `今日のことば`。
- 每张卡最多引用 3 到 5 个查词记录。
- Lookup history 保存到 LocalStorage。
- Lookup history 只保存精简字段，不保存完整第三方响应。
- 如果查词记录不足，可以从 conversation 中补充，但不能忽略已有查词记录。

### Expression Hint History

`recentExpressionHints` 是 session summary request 的可选输入。

说明：

- 用户打开过或播放过的三档建议，代表用户对该表达感兴趣。
- Played suggestions 优先级高于只 opened 的 suggestions。
- Summary 不应该机械复制三档建议。
- Summary 应把这些 hint 作为参考信号，重新整理成更干净、更可复用的表达复习内容。
- 如果同一句有多档 hint，可以优先选最适合日常复用的一档，而不是把三档全部放进卡片。

### Non-Japanese Span Detection

`nonJapaneseSpans` 是 session summary request 的可选输入。

说明：

- 英文片段通常容易检测。
- 中文片段与日语汉字存在歧义，第一版应使用保守检测。
- 可以先提取 `candidateNonJapaneseSpans`，再让 LLM 判断哪些片段真正值得放进 summary。
- 不要把普通日语汉字词误判为中文。
- 非日语片段是表达缺口的重要信号，应优先进入 `次はこう言える`。

## 7. Learning Quality Rules

生成卡片时必须遵守：

- 低压力不等于低信息量。
- 卡片必须提供可复用的学习内容。
- 不要空泛鼓励。
- 不要打分。
- 不要列错误清单。
- 不要为了填满结构而凑数。
- 每条建议必须可复用。
- 每条自然表达必须适合日常口语。
- 解释要有学习信息，但不要写成语法论文。
- 优先纳入 `recentLookups`。
- 优先使用 `recentExpressionHints` 和 `nonJapaneseSpans`。
- 每条建议必须基于用户真实输入、查词记录或已打开的 hint。
- 如果信息不足，宁可少写，不要编造。
- 不要编造用户没说过的话。
- 不要编造用户没查过的词。
- 不要把卡片写成课堂批改。
- 不要使用过强的“任务”“作业”“必须复习”语气。

合格的卡片应该让用户觉得：“这次聊天里确实有东西可以留下来复习。”

## 8. Data Model Draft

```ts
type NpcId = "misaki" | "kimura" | "taisho";

type ExpressionUpgradeSource =
  | "non_japanese_span"
  | "expression_hint"
  | "model_selected";

type ReviewWordSource = "looked_up" | "conversation";

interface RecentLookup {
  id: string;
  word: string;
  reading?: string;
  meaning?: string;
  example?: string;
  sourceSentence?: string;
  npcId: NpcId;
  createdAt: string;
}

interface ExpressionHintRecord {
  id: string;
  npcId: NpcId;
  sourceMessageId?: string;
  originalUserText: string;
  level: "casual" | "normal" | "formal";
  suggestedExpression: string;
  note?: string;
  openedAt?: string;
  playedAt?: string;
}

interface NonJapaneseSpan {
  id: string;
  sourceMessageId?: string;
  text: string;
  language: "en" | "zh" | "mixed" | "unknown";
  context?: string;
  detectionStage: "candidate" | "llm_confirmed";
}

interface ReviewWord {
  word: string;
  reading?: string;
  meaning: string;
  example?: string;
  source: ReviewWordSource;
  evidenceId?: string;
}

interface ExpressionUpgrade {
  original: string;
  natural: string;
  point: string;
  source: ExpressionUpgradeSource;
  evidenceId?: string;
}

interface SessionSummaryCard {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  npcId: NpcId;
  title: string;
  todayTopic: string;
  usableExpressions: Array<{
    expression: string;
    note: string;
  }>;
  expressionUpgrades: ExpressionUpgrade[];
  reviewWords: ReviewWord[];
  nextTopicSuggestion: string;
}

interface SessionSummaryRequest {
  schemaVersion: 1;
  npcId: NpcId;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt?: string;
  }>;
  recentLookups?: RecentLookup[];
  recentExpressionHints?: ExpressionHintRecord[];
  nonJapaneseSpans?: NonJapaneseSpan[];
}
```

Data constraints:

- 包含 `schemaVersion`，方便后续迁移。
- 包含 `id`、`createdAt`、`npcId`、`title`。
- 不保存音频。
- 不保存完整长对话。
- 不保存完整第三方查词响应。
- 不保存完整 `表現ヒント` API 原始响应。
- `reviewWords` 必须包含 `source` 字段。
- `expressionUpgrades` 必须包含 `source` 字段。
- `messages` 只传最近必要上下文，不传全量历史。

## 9. API Design Draft

### Endpoint

```txt
POST /api/session-summary
```

### Input

```ts
interface SessionSummaryRequest {
  schemaVersion: 1;
  npcId: NpcId;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    createdAt?: string;
  }>;
  recentLookups?: RecentLookup[];
  recentExpressionHints?: ExpressionHintRecord[];
  nonJapaneseSpans?: NonJapaneseSpan[];
}
```

### Output

```ts
interface SessionSummaryResponse {
  card: Omit<SessionSummaryCard, "id" | "createdAt">;
}
```

Notes:

- API 只负责生成卡片内容。
- 前端负责生成 `id`、写入 `createdAt`、保存到 LocalStorage。
- 前端负责收集 `recentLookups`、`recentExpressionHints` 和 `nonJapaneseSpans` 等学习信号。
- API 不负责数据库。
- API 不保存用户数据。
- API 不返回音频。
- API 不返回完整长对话。
- API prompt 应要求模型优先使用这些 evidence signals，但不要凑数。

## 10. LocalStorage Strategy

### Key naming

建议：

```txt
kotomachi_summary_cards
kotomachi_lookup_history
kotomachi_expression_hint_history
```

如果未来需要按 NPC 分开，也可以迁移为：

```txt
kotomachi_summary_cards_${npcId}
kotomachi_lookup_history_${npcId}
kotomachi_expression_hint_history_${npcId}
```

### Storage rules

- 最多保存 50 张 summary cards。
- 最多保存 100 条 lookup history。
- Expression hint history 只保存精简字段，例如原句、建议表达、level、openedAt、playedAt。
- 使用 try/catch 包裹 `localStorage.setItem`。
- 不保存音频。
- 不保存 secret。
- 不保存完整长对话。
- 不保存完整第三方响应。
- 删除卡片时只删除对应 card。
- 如果 LocalStorage 写入失败，页面不应崩溃。

### Suggested helpers

```ts
function loadSummaryCards(): SessionSummaryCard[];
function saveSummaryCards(cards: SessionSummaryCard[]): void;
function deleteSummaryCard(cardId: string): void;
function loadRecentLookups(npcId: NpcId, limit?: number): RecentLookup[];
function saveLookupHistory(lookup: RecentLookup): void;
function loadRecentExpressionHints(npcId: NpcId, limit?: number): ExpressionHintRecord[];
function saveExpressionHintRecord(record: ExpressionHintRecord): void;
```

## 11. UI Placement

### Desktop

- sidebar 新增 `ふりかえり` 区域。
- 增加 `今の会話から作る` 按钮。
- 最近 5 张卡片显示在 sidebar。
- 点击卡片后，在主区域或右侧 panel 打开详情。
- 卡片详情中提供删除入口。

### Mobile

- mobile drawer 中也显示 `ふりかえり` 区域。
- 点击卡片后关闭 drawer，并显示详情。
- `今の会話から作る` 按钮应避免挤压 NPC 切换列表。
- 详情内容需要可滚动，不应遮挡底部输入栏。

## 12. Empty / Disabled States

### 用户消息太少

生成按钮 disabled。

建议文案：

```txt
もう少し話すと、ふりかえりを作れます。
```

### 生成中

按钮进入 loading / disabled 状态。

建议文案：

```txt
ふりかえりを作っています…
```

### 生成失败

温和提示，不暴露技术错误。

建议文案：

```txt
うまく作れませんでした。少し時間をおいて、もう一度試してみてください。
```

### 没有历史卡片

建议文案：

```txt
会話のあとに、ここへふりかえりが残ります。
```

## 13. Prompt Requirements

Summary prompt 应要求模型：

- 低压力但有学习信息。
- 基于真实输入和最近对话。
- 优先使用 `recentLookups`。
- 优先使用 `recentExpressionHints`。
- 优先使用 `nonJapaneseSpans`。
- 不主动批评用户。
- 不输出长篇语法课。
- 不编造用户没说过的话。
- 不编造用户没查过的词。
- 不为了填满结构而凑数。
- 不把用户表达写成错误清单。
- 输出结构化 JSON，便于 UI 渲染。
- 每条自然表达都要适合日常口语。
- 如果某一栏没有足够信息，可以返回空数组或简短内容。

重点：`recentLookups`、`recentExpressionHints` 和 `nonJapaneseSpans` 应被视为 evidence signals。模型可以整理和补充，但不应绕过这些信号自由挑学习点。

## 14. Acceptance Criteria

MVP 验收标准：

- 用户可以手动从当前 NPC 的最近对话生成 `ふりかえり`。
- 用户消息太少时不能生成，并显示温和提示。
- 生成结果包含今日话题、可继续使用的表达、更自然表达建议、今日词汇和下次话题。
- 卡片内容有真实学习信息，不只是形式化总结。
- `今日のことば` 优先包含用户查过的词。
- `次はこう言える` 优先处理非日语片段和用户打开或播放过的 `表現ヒント`。
- 每条 `次はこう言える` 必须基于用户真实输入、hint 记录或 non-Japanese span。
- 卡片保存到 LocalStorage。
- sidebar 显示最近 5 张卡片。
- 点击卡片可以打开详情。
- 用户可以删除卡片。
- 最多保存 50 张卡片。
- 不保存音频。
- 不保存 secret。
- 不保存完整长对话。
- 不保存完整第三方响应。
- API 只生成内容，不负责数据库。
- TTS、STT、聊天、表現ヒント、划词查词原有功能不受影响。

## 15. Future Iterations

- 更完整地接入 `表現ヒント` 历史，让卡片能复用用户看过或播放过的表达建议。
- 支持搜索 summary cards。
- 支持标签，例如 topic、NPC、expression、word。
- 支持导出 Markdown。
- 云同步。
- 统计练习主题和复习词，但不做打分。
- 更强 prompt eval，覆盖：
  - 不打分；
  - 不编造；
  - recentLookups 优先；
  - recentExpressionHints 优先；
  - nonJapaneseSpans 优先；
  - 信息不足时宁可少写；
  - 自然表达是否适合日常口语。
