# Kotomachi Conversation Rhythm v0

## 1. Purpose

这份规格的目标是：

- 帮助用户和单个 NPC 更自然地多聊几轮；
- 让一次 3-15 分钟的短对话也有轻微的完成感；
- 把现有 `topic pool / starter prompts` 逐步升级成更系统的 `conversation seed library`；
- 不把 Kotomachi 做成显式课程系统、任务系统或阶段 UI；
- 保持低压力、可进入、可退出、可重复。

Conversation Rhythm v0 不是新功能名，而是一种内容与 prompt 的设计框架。  
Topic Seed System 是它的内容基础。

## 2. Core Idea: Topic Pool -> Conversation Seed Library

当前的 fixed topic pool 不应只是一组静态 starter。

更合适的方向是：把它逐步整理成每个 NPC 的 `Conversation Seed Library / 对话种子库`。

一个 topic seed 不是课程，也不是任务，而是一个可以自然展开的小对话场景。  
它可以同时服务多个位置：

| 使用位置 | 使用 seed 的方式 |
| --- | --- |
| 首页 Today Inspiration | 只取 `user opening line` |
| 开场 `+ -> 找话题` | 只取 `user opening line` |
| AI context-aware topic ideas | 取 `theme / continuation hints / register notes` |
| NPC 自然延展 | 取 `npc hook / scene detail` |
| Review Card | 取 `theme / reusable expressions / soft landing angle` |
| future relationship-aware expression hints | 取 `register notes` |

重点：

- 不另起一套和 topic pool 冲突的主题系统；
- v0 先把现有 `starter-prompts.ts` 视作 seed 素材来源；
- 后续优先做 audit / polish / regroup，而不是新造一套课程内容。

## 3. What Is a Topic Seed?

推荐的 topic seed 结构：

```ts
{
  id: "recent_favorites",
  npcId: "aoi",
  theme: "最近ハマってるもの",
  phase: ["opening", "development"],
  userOpeningLines: [
    "最近、何かハマってるものってある？",
    "それ、ちょっと気になる。"
  ],
  npcHooks: [
    "いいよ、最近ちょっとハマってるのがあるんだよね。",
    "それ聞くと、ちょっと話したくなるかも。"
  ],
  continuationHints: [
    "おすすめを聞く",
    "自分は詳しくないけど興味があると言う",
    "週末に試してみたいと言う"
  ],
  reusableExpressions: [
    "それ、ちょっと気になる。",
    "正直あんまり詳しくないけど、聞いてみたい。"
  ],
  softLandingAngle: "好きなものを一つ聞けた / 自分の興味を軽く言えた",
  registerNotes: "Aoi uses natural tameguchi as a same-age friend, not clingy or romantic.",
  avoid: [
    "恋愛っぽくしない",
    "特定のサークルに固定しない",
    "二次元口癖にしない"
  ]
}
```

说明：

- 这只是方向，不要求现在立刻把代码改成这个结构；
- v0 先用文档定义和评估框架，后续再决定是否做渐进式结构迁移。

## 4. Relationship to Existing `lib/starter-prompts.ts`

当前 `starter-prompts.ts` 里的多数内容，本质上是：

- `user can say this`

未来如果把它升级成 seed library，同一个 seed 可以派生出多种用途：

### User opening line

`最近、何かハマってるものってある？`

### NPC hook

`そういえば、最近なんかハマってるものある？`

### AI continuation idea

`それ、ちょっと気になる。もう少し聞いてもいい？`

### Review Card angle

练到了：

- 如何表达兴趣；
- 如何请对方推荐；
- 如何用轻松口语接话。

重点：

- 不要把用户 starter 直接塞进 NPC 回复；
- 同一个 seed 可以支持 opening、continuation、review，不是单一文案条目。

## 5. Product Principle

Kotomachi 的一段理想短对话，不是无限陪聊，而是一个轻量 loop：

1. `opening`：用户容易说出第一句；
2. `development`：围绕一个小场景自然多聊几轮；
3. `soft landing`：用户可以停下来，并感到“刚才真的表达了一点东西”。

这三个阶段不做显式 UI，不显示给用户。  
它们只是帮助：

- welcome
- fixed starters
- context-aware topic ideas
- NPC reply rhythm
- review cards

更协调。

## 6. Non-goals

Conversation Rhythm v0 明确不做：

- 显式课程列表；
- 阶段进度条；
- 任务系统；
- 今日任务；
- 关卡 / 完成度；
- NPC 好感度；
- 剧情节点；
- 聊天时长 KPI；
- “完成练习”按钮；
- 打卡 / streak；
- 把 topic seeds 包装成可见课程。

用户不应感觉自己点开了一节课。  
用户应感觉自己只是自然进入一个小场景，说了几句日语。

## 7. Current Building Blocks

当前已有能力，以及它们如何支持 conversation rhythm：

- `initial / revisit welcome`
  - 负责 opening atmosphere
- `fixed starter pool`
  - 负责还没进入本轮对话时的开场
- `context-aware topic ideas`
  - 负责对话中途接话
- `Expression Hints`
  - 负责用户想知道更自然说法时的按需辅助
- `Word Explanation`
  - 负责理解 NPC 的自然日语
- `TTS / self playback`
  - 负责语音感
- `Review Cards`
  - 负责 soft landing
- `Saved Items`
  - 负责轻量积累
- `NPC life arc / world state`
  - 负责场景新鲜感
- `cross mentions`
  - 负责街区感

## 8. Opening

Opening 要解决的问题：

- 用户不知道第一句说什么；
- 用户怕说错；
- 用户可能只想说一句；
- 用户可能中 / 英 / 日混合输入；
- 用户可能只是路过一下。

Opening 设计要求：

- 给用户一个轻松入口；
- 不要求完整日语；
- 不像老师上课；
- 不像 NPC 在催用户；
- 不要过度熟人化；
- 不要让 initial welcome 带回访语气。

Opening 主要由这些部分支持：

- initial welcome
- revisit welcome
- fixed starter pool / opening lines
- 首页 scene card copy
- Today Inspiration

## 9. Development

Development 要解决的问题：

- 用户已经说了一句，但不知道怎么继续；
- NPC 只回一刀句会让对话立刻冷掉；
- 用户需要一个顺着当前话题继续的支点；
- 用户不想被连续追问。

Development 设计要求：

- NPC 先接住用户短句；
- 再轻轻补一层场景细节；
- 必要时给一个自然的小追问；
- 不要一口气问多个问题；
- 不要突然讲语法；
- 不要过早总结；
- 不要把用户推入深情绪处理；
- 不要让 Aoi / Kimura / Haruka 之类的 register 串味。

Development 主要由这些部分支持：

- chat system prompt
- context-aware topic ideas
- NPC-specific scene spec
- topic seeds 的 continuation hints
- life arc / world state

## 10. Soft Landing

Soft landing 要解决的问题：

- 用户聊了几句后想停；
- 用户不想被要求继续；
- 用户希望感觉这次不是白聊；
- 但又不想进入正式学习总结。

Soft landing 设计要求：

- 允许短对话自然结束；
- 不强制生成成果；
- Review Card 即使内容不多，也不要让用户尴尬；
- 可以强调“这次先带走一句也可以”这种感觉，但不显式做成 One Takeaway；
- 不评分；
- 不做任务完成；
- 不做老师式总结。

Soft landing 主要由这些部分支持：

- Review Cards
- Saved Items
- chat ending tone
- failure-friendly copy

## 11. NPC-specific Topic Seed Directions

这些不是显式课程标题，只是 seed 设计参考。

### Misaki / 美咲

- coffee taste / coffee recommendation
- quiet time / resting at a cafe
- rainy cafe atmosphere
- books / movies / small cultural talk
- saying you want to slow down

### Kimura / 木村

- convenience-store new items
- night shift and tiredness
- rainy-day customers
- daily rhythm and small fatigue
- buying something quickly before going home

### Taisho / 大将

- end of the day
- choosing something to eat
- tired after work / school
- regular-customer small talk
- rainy evening / izakaya atmosphere

### Haruka / 遥

- first time visiting a lab
- literature / presentation
- study-abroad uncertainty
- not fully understanding class
- a campus place to breathe

### Aoi / 葵

- 最近ハマってるもの
- after-school plans
- weekend plans
- recommendations
- “I do not know much, but I am curious”
- light friend-to-friend banter

## 12. Example Topic Seeds

### Aoi example

- `theme`: 最近ハマってるもの
- `userOpeningLines`:
  - `最近、何かハマってるものってある？`
  - `それ、ちょっと気になる。`
- `npcHooks`:
  - `そういえば、最近なんかハマってるものある？`
  - `それ聞くと、ちょっと話したくなるかも。`
- `continuationHints`:
  - おすすめを聞く
  - 自分は詳しくないけど興味があると言う
  - 週末に試してみたいと言う
- `reusableExpressions`:
  - `それ、ちょっと気になる。`
  - `正直あんまり詳しくないけど、聞いてみたい。`
- `registerNotes`:
  - 同级朋友式タメ口
  - 不恋爱
  - 不黏人
  - 不锁死具体社团
- `avoid`:
  - 恋爱感
  - 二次元口癖
  - “等你很久了”式陪伴感

### Haruka example

- `theme`: 研究室でどうやって話す
- `userOpeningLines`:
  - `研究室で最初って、どう話しかければ自然ですか。`
  - `先輩に相談したいんですが、少し緊張しています。`
- `npcHooks`:
  - `最初はあいさつだけでも十分自然ですよ。`
  - `重くならない聞き方って、少し考えますよね。`
- `continuationHints`:
  - 具体的なあいさつを聞く
  - 発表や授業の不安につなげる
  - 研究室の雰囲気をもう少し聞く
- `reusableExpressions`:
  - `最初はあいさつだけでも十分自然です。`
  - `少し相談してもいいですか。`
- `registerNotes`:
  - 轻丁寧
  - 前辈请教
  - 不像教授
  - 不像留学顾问
- `avoid`:
  - 权威指导感
  - 检查进度
  - 长篇建议

### Misaki example

- `theme`: 少しゆっくりしたい
- `userOpeningLines`:
  - `今日は少しゆっくりしたい気分です。`
  - `静かな場所で話したいです。`
- `npcHooks`:
  - `そういう日、ありますよね。`
  - `今日は少し落ち着いた時間にしたい感じですか。`
- `continuationHints`:
  - 最近疲れていることを少し話す
  - 飲み物や店内の雰囲気につなげる
  - 本や映画の話に軽く広げる
- `reusableExpressions`:
  - `今日は少しゆっくりしたい気分です。`
  - `静かな場所で話したいです。`
- `registerNotes`:
  - 轻丁寧
  - 安静闲聊
  - 不心理咨询
- `avoid`:
  - 过度情绪分析
  - 老师式安慰

## 13. Relationship / Register Constraints

Conversation rhythm 和 topic seeds 必须尊重 NPC 的关系语气：

- `Misaki`：轻丁寧，不心理咨询；
- `Kimura`：随意口语，年轻熟人感，不变同级朋友；
- `Taisho`：熟客口语，不人生导师；
- `Haruka`：轻丁寧，前辈请教，不教授 / 顾问；
- `Aoi`：タメ口，同级朋友，不恋爱 / 不黏人 / 不二次元。

同一句 idea，即使语法正确，如果关系语气错了，也算体验失败。

## 14. Failure-friendly Rules

当用户出现以下情况时，系统应保持 failure-friendly：

- 只说一句；
- 说得很短；
- 中 / 英 / 日混合；
- STT 识别乱；
- 不知道怎么接；
- 聊两句就停；
- 只想查词；
- 只想听 NPC 语音；
- Review Card 内容很少。

原则：

- 不评价；
- 不打分；
- 不说失败；
- 不催用户多说；
- 不说“内容不足”；
- 先接住，再给一个非常小的继续入口。

## 15. How This Could Be Implemented Later

v0 先是文档和评估框架，不立刻实现新功能。

后续如果要实现，优先做：

### Step 1: Topic pool audit

审查 `lib/starter-prompts.ts`，把现有 prompts 分类：

- good opening starter
- good continuation seed
- too meta / too learning-tool-like
- too generic
- register mismatch
- keep as fallback

### Step 2: Topic pool polish

不改结构，先只优化文案：

- Aoi 减少元学习句，增加真实朋友开场；
- Kimura 保持便利店距离；
- Haruka 保持前辈请教；
- Misaki 避免心理咨询；
- Taisho 避免人生导师。

### Step 3: Structured topic seeds

未来再考虑把 topic pool 结构化成 seed objects。

### Step 4: Use seeds in AI topic ideas

把 seed 的 `theme / continuationHints / registerNotes` 传给 `/api/topic-ideas`，让 AI 生成更贴合 NPC 的接话。

### Step 5: Use seeds in NPC natural extension

如果真实测试显示 NPC 经常接不住，再考虑让 chat prompt 或 API 使用 `npcHooks`。  
但不要让 NPC 主动频繁换题或像主持人推进流程。

## 16. Implementation Boundary

明确：

- v0 先做文档和评估框架；
- 不立刻实现显式课程或阶段 UI；
- 不改数据库；
- 不引入复杂 session state；
- 不做强提醒或强收束。

## 17. Evaluation Checklist

一段对话是否成功，不看聊了多久，而看：

- 用户是否容易说出第一句；
- NPC 是否接住了；
- 用户是否至少有一个继续说的入口；
- topic ideas 是否贴合上下文；
- topic ideas 是否符合 NPC register；
- NPC 是否轻轻延展，而不是教学或催促；
- 没有变老师 / 顾问 / 恋爱 / 陪伴；
- 用户即使只聊几句，也不觉得失败；
- Review Card / Saved Items 是否能留下轻量收获。
