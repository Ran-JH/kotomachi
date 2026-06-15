# Kotomachi / 言街

**A low-pressure AI-native Japanese output practice town where learners chat with NPCs, receive expression hints, look up words in context, and turn conversations into reusable learning assets.**

**Kotomachi / 言街是一个低压力日语输出练习小镇：用户和 NPC 自然聊天，在需要时获得表达提示、查词解释、收藏复习和回顾卡片。**

## Opening

Kotomachi / 言街是一个围绕 **“先开口，再学习”** 设计的 AI-native 日语输出练习原型。

它不是课程平台，不是考试工具，也不试图把每一句聊天都变成纠错任务。它更像一个低压力街区：用户先和 NPC 聊起来，再在需要的时候打开表达提示、查词、收藏和回顾，把真实对话慢慢沉淀成自己的学习资产。

从 portfolio 视角看，这个项目主要展示三件事：

- 产品判断：把聊天层和学习层拆开，降低输出压力
- 交互设计：让查词、提示、回顾围绕真实对话出现，而不是强行打断
- 工程拆分：把对话、表达提示、选词浮层、收藏复习、Review Card 接成一个轻量闭环

## Demo Placeholder

> TODO: 在这里放首页 / 聊天页 / 表达提示 / 收藏复习 / Review Card 的截图或 GIF。
>
> 可选布局：
> - Home / NPC entry
> - Chat with NPC
> - Expression Hint
> - Selectable Lookup
> - Saved Items / Review
> - Review Card

## 当前状态 / Current Status

当前状态：**真实使用测试 + 小 bug 收口 + 文档沉淀**。

Kotomachi 现在更适合被理解为一个：

- personal learning tool
- portfolio MVP
- AI-native Japanese output practice prototype

它不是成熟商业化 SaaS，也不是完整课程型语言学习产品。

## Why Kotomachi?

很多日语学习者都会遇到一个很具体的问题：**输入能力往往先于输出能力**。看得懂、背过词、刷过题，不代表能自然地把一句话说出来。

传统教材、 JLPT 训练和自学资料很擅长帮助用户积累词汇、阅读和语法知识，但“真正开口聊天”仍然常常是另一层门槛。你需要组织话题、控制语气、承担犯错压力，还要担心把对话聊死。

直接找真人练口语当然有效，但对很多人来说启动成本很高。另一边，普通 AI chat 又很容易滑向“老师式纠错”，或者只有一轮回复，没有后续的查词、表达沉淀和复习链路。

Kotomachi 想做的不是把聊天做成考试，也不是把 AI 做成纠错老师，而是提供一个**真人交流前的低压力练习层**：先把想说的话说出来，再决定要不要打开学习支持。

## Product Principles

- **Low-pressure output first**
  先让用户把话说出来，而不是先被纠错和评价卡住。
- **NPCs keep the main chat natural**
  NPC 在主聊天里继续对话，不主动把气氛切成课堂。
- **Learning support is user-triggered, not forced**
  表达提示、查词、收藏、回顾都由用户主动打开。
- **Corrections live in a separate layer**
  表达建议和结构说明属于辅助层，不侵入主聊天流。
- **Learning assets come from real conversations**
  收藏词、收藏表达、回顾卡都来自真实对话，不是预制题库。
- **Small reusable gains matter more than course-like completion**
  比起“通关课程”，更重视用户带走一两个下次真能复用的表达。

## Core User Flow

1. 选择一个 NPC，进入一种明确的关系语境和说话 register。
2. 如果不知道第一句怎么开口，可以先从 Guided Scenario / 今日街角小事进入一个很小的生活情境。
3. 如果已经有想说的内容，但不会用日语表达，可以先打开“我想说…… / pre-send expression support”。
4. 输入中文、英文、日语碎片或混合表达，拿到一条自然、可编辑、可发送的日语建议。
5. 用户确认或微调后再发送，而不是被系统自动代发。
6. NPC 用自然日语接住，主聊天保持对话感而不是课堂感。
7. 如果不知道下一句怎么接，可以打开 continuation hints / response options，拿到贴着当前上下文的接话短句。
8. 发送后，用户还可以主动打开“表达提示 / Expression Hint”，回看这一句如果换一种语气会怎么说。
9. 在聊天、表达提示、收藏区或回顾卡中选中文本查词。
10. 保存单词或表达，形成自己的学习资产。
11. 在收藏区继续复习、做标记、写笔记、筛选来源。
12. 用最近的真实对话生成一张 Review Card，回看这次聊了什么、学到了什么。

## Features

### Natural NPC Conversations

- 与 8 位街区角色聊天：美咲、木村、大将、遥、葵、七海、莲、真央。
- 支持中文 / 英文 / 日文混输。
- NPC 主回复保持自然日语输出。
- 主聊天层不主动变成老师式纠错。

8 个 NPC 的差异不只是头像和文案风格，而是不同的 scene、关系距离和可练习 register：

| NPC | Scene | Relationship / register | Main practice value |
| --- | --- | --- | --- |
| 美咲 | 咖啡馆 | 轻丁寧、安静熟客感 | 慢聊天、休息、轻情绪表达 |
| 木村 | 便利店 | casual、年轻熟人感 | 生活琐事、轻吐槽、夜晚节奏 |
| 大将 | 居酒屋 | 熟客口语、年长店主 | 吃喝、疲惫、下班后寒暄 |
| 遥 | 校园 / 研究室 | 轻丁寧、前辈 | 请教、发表、学习压力 |
| 葵 | student lounge | タメ口、同级朋友 | 兴趣、推荐、朋友式闲聊 |
| 七海 | 生活支援 | 轻丁寧、生活协助 | 租房、手续、窗口表达 |
| 莲 | 旅居者 / 小镇观察 | 自然闲聊 | 旅行规划、地方观察、旅行经历 |
| 真央 | 社区空间 / 兼职 | 轻职场丁寧、兼职前辈 | 确认、请求、报告、轻道歉、访客应对 |

### Guided Scenarios / 今日街角小事

- 用户可以从一个很小的生活情境开始，而不是直接面对空白输入框。
- 每个场景包含 micro situation、starter intent 和一条可编辑的日语 sample line。
- 进入场景时由 NPC 先开场，用户在 sample line 基础上改写后再发送。
- 它不是任务系统、课程流程、评分机制或通关结构。
- 它的作用只是降低第一句压力，让用户更容易进入真实对话。

### Pre-send Expression Support / 我想说……

- 这个能力发生在发送前，不是发送后的回看工具。
- 用户可以先输入中文、英文、日语碎片，甚至混合表达。
- 系统会结合当前 NPC、关系语境、register 和上下文，生成自然日语建议。
- 用户可以确认、编辑后再发送，保留“这是我自己说出去的”感觉。
- 它更像一个低压力表达扶手，不是普通翻译器。

### Continuation Hints / 下一句怎么接

- 这个能力发生在 NPC 回复之后，帮助用户接第二句、第三句。
- 生成的是基于当前上下文、NPC 关系语气和最近对话的可发送短句。
- 在自由聊天里，它更像 continuation hints。
- 在 Guided Scenario 里，它更像 response options。
- 它不是泛泛的“找话题推荐”，而是帮助用户继续当前对话的 conversation move。

### Expression Hints

- 用户发送消息后可主动打开表达提示。
- 提供三档语气：亲近随和 / 普通自然 / 更正式。
- 每档建议都尽量保持“可直接拿来再说一次”的风格。
- 建议表达支持播放语音，也可以直接收藏。
- 它和“我想说……”不同：前者是发送前扶手，后者是发送后回看和优化。

### Lightweight Expression Structure

- 当某条建议里包含值得复用的句型时，会附带 `structureNote`。
- 结构说明是轻量附着在具体表达上的，不是独立大语法模块。
- 内容通常包括 `pattern / explanation / examples`。
- 重点是帮助用户“下次复用”，而不是系统讲解语法。

### Selectable Lookup Across Learning Text

- 查词能力已经从单一聊天气泡中抽离成通用能力。
- 可在聊天消息、Expression Hint、Saved Items、Review Card 中选中文本查词。
- 返回读音、释义、句内解释、语感说明等信息。
- 查词是 **opt-in wrapper**，不是全站全局 selection listener。

### Saved Words Review

- 收藏单词包含 `reviewCount`、`lastReviewedAt`、`note`、`masteredAt` 等状态。
- 已掌握单词默认不进入待复习队列。
- 支持按 NPC、复习状态、时间、复习次数筛选和排序。
- 支持 `5 / 10 / all` 的轻量 Smart Review session。

### Saved Expressions

- 收藏表达保存 `original / suggestion / level / npcId / source`。
- 表达卡片可保留 `structureNote`，方便回看可复用句型。
- 支持复习计数、用户备注、来源区分。
- 适合回看“我当时本来想说什么，以及更自然可以怎么说”。

### Review Cards

- 基于最近真实对话生成回顾卡，而不是凭空生成学习摘要。
- 包含这次聊了什么、可复用表达、表达升级点、新词和下一步延续话题。
- 生成逻辑偏 evidence-based，不把产品做成评分器。
- 回顾卡里的学习文本同样支持选中文本查词。

### Voice Input with Confirmation

- STT 结果先填入输入框。
- 用户确认或编辑后再手动发送。
- 这比“识别完直接发出”更符合低压力练习定位。
- 语音识别阶段不会伪装成 NPC 已经回复。

### Audio Playback

- NPC 回复支持语音播放。
- Expression Hint 和查词结果里的关键文本也可播放。
- 再次点击可暂停 / 停止当前音频。
- 播放新音频时会停止前一个，避免多路声音叠加。

### Translation Support for NPC Replies

- NPC 回复可按 UI 语言打开翻译辅助。
- 翻译层是理解辅助，不改写主聊天的日语输出规则。
- 仍然保持“主对话是日语，学习辅助另开一层”的产品边界。

## AI-native Design Highlights

- **Separate conversation layer and learning layer**
  对话继续对话，学习支持另开一层。
- **User-triggered feedback instead of forced correction**
  用户在想学的时候才打开提示，而不是每句都被打断。
- **Mixed-language input -> natural Japanese output**
  允许用户从最容易表达的语言出发，再把输出逐步拉向日语。
- **Expression alternatives by relationship and register**
  同一句意思，会按语气和关系距离给不同版本。
- **Contextual lookup rather than dictionary-only lookup**
  查词不只给字典义，也看它在当前句子里的意思和语感。
- **Learning assets generated from real interaction history**
  收藏、提示、回顾都来自用户真实说过的话。
- **Review cards as conversation-derived learning summaries**
  回顾卡是从真实聊天里抽取的学习资产，而不是另起一套课程内容。

## Technical Architecture

### Frontend

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- LocalStorage as the current persistence layer

### AI / API Routes

- `/api/chat`
  负责 NPC 主对话，保证角色感、自然日语输出和非教师边界。
- `/api/feedback`
  负责 Expression Hint 三档表达建议和可选结构说明。
- `/api/explain`
  负责选中文本查词与上下文解释。
- `/api/session-summary`
  负责 Review Card / session summary。
- `/api/tts`
  负责 NPC、表达提示、查词文本的语音合成。
- `/api/stt`
  负责语音转文字，结果先进入输入框等待确认。
- `/api/topic-ideas`
  负责 continuation hints / response options。
- `/api/translate`
  负责 NPC 回复的辅助翻译层。

### Core Client Modules

- `app/chat/[npcId]/page.tsx`
  聊天页集成入口，串起 welcome、chat、hint、voice、review。
- `components/chat-bubble.tsx`
  聊天气泡、Expression Hint drawer、TTS 播放、翻译切换。
- `components/selectable-lookup-text.tsx`
  学习文本的 opt-in 查词包装器。
- `components/word-popover.tsx`
  选词后的浮层解释 UI。
- `components/saved-items-panel.tsx`
  收藏单词、收藏表达、复习与筛选入口。

### Lookup UI Decisions

- `WordPopover` 通过 portal 挂到 `document.body`。
- 浮层使用 fixed positioning + high z-index，避免被 drawer / card / overflow 裁切。
- `SelectableLookupText` 只包裹学习文本，不做全局选区监听。
- 这样能把查词能力扩展到多个区域，同时避免全站误触。

## Key Engineering Decisions

1. **Extract first, expand later**
   先把查词能力从聊天气泡里抽离，再逐步接到 Expression Hint、Saved Items、Review Card。

2. **Portal for floating UI**
   查词浮层属于全局浮层，用 portal 到 `body`，避免 stacking context 和 overflow 问题。

3. **Explicit selection opt-in**
   不做全站 selection listener，只在被 `SelectableLookupText` 包裹的学习文本上启用。

4. **Confirm-before-send voice input**
   STT 结果先进输入框，由用户确认后再发送，降低误发压力。

5. **Grammar as expression support**
   `structureNote` 嵌在表达提示里，作为表达复用辅助，而不是展开成大而重的语法系统。

6. **Evidence-based review summaries**
   Review Card 优先使用真实查词、真实表达提示、真实消息痕迹，不把总结做成想当然的“老师点评”。

## Technical Complexity Behind a Small Surface

从界面上看，Kotomachi 很轻，但它不是简单 CRUD 页面。当前实现里，真正复杂的是这些边界：

- 如何让 NPC 始终保持自然日语，而不是滑向“自动纠错老师”。
- 如何让 mixed-language input 能被接住，但最终主对话仍然保持日语输出。
- 如何把聊天、提示、查词、收藏、回顾接成链路，又不让学习层侵入聊天层。
- 如何在 LocalStorage-only 的前提下，把复习状态、已掌握标记、来源信息和轻量 session 跑顺。

这也是 README 里特别强调 AI-native interaction design 的原因：项目的价值不只是“有几个 API route”，而是**这些 route 和前端交互一起，如何塑造一种低压力输出体验**。

## Current Limitations

- 没有登录系统，数据当前只保存在浏览器 LocalStorage。
- 没有后端数据库，也没有多设备同步。
- AI 输出仍有波动，尤其在混输、专有名词、碎片化口语输入时。
- Expression Hint 可能被英文缩写、专有名词或语音识别碎片拉低质量。
- 语音、翻译、TTS / STT 仍依赖外部 provider 状态。
- 当前仍处于小范围真实使用测试阶段，重点观察用户是否会反复打开、是否能自然使用“我想说……”和“下一句怎么接”、多 NPC 的关系语境是否足够清晰，以及学习资产是否真的会回流到下一次输出。
- 这是一个小范围测试中的 prototype，不是 production SaaS。

## Roadmap / Next

当前更偏维护和打磨导向，而不是盲目堆新功能：

- real-user testing
- bad case collection
- mobile selection / lookup polish
- saved item source / context display polish
- README / demo polish
- small bug fixes

当前明确延后或不急于做的方向：

- 大型独立语法模块
- 全站全局 selection listener
- 精确回跳到原聊天消息的重型导航
- 大规模 NPC prompt 重写
- 登录 / 数据库 / 多端同步

## Local Development

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

Environment variables are required for the LLM / TTS / STT providers.

说明：

- 这是标准本地启动方式。
- 当前仓库在 Windows 环境下开发。
- 本项目的 AI、语音和翻译能力依赖相应 provider 的环境变量。

## Documentation

当前公开文档入口如下：

- [Development Plan](docs/development-plan.md)
- [System Map](docs/system-map.md)
- [Known Issues](docs/known-issues.md)
- [Engineering Notes](docs/engineering-notes.md)
- [NPC Prompt Policy](docs/npc-prompt-policy-v0.md)
- [Saved Learning Items Spec](docs/saved-learning-items-spec.md)
- [Guided Scenarios Spec](docs/guided-scenarios-v0.md)
- [Session Summary Spec](docs/session-summary-spec.md)
- [Feedback / Explain / Summary Quality Spec](docs/feedback-explain-summary-quality-spec.md)
- [Manual QA Checklist](docs/manual-qa-checklist.md)

## Summary

Kotomachi / 言街不是“把日语聊天接上一个大模型”这么简单。

它更像是在验证一个产品判断：

> 如果把主对话、表达支持、查词、收藏和回顾拆成合适的层级，
> 用户也许会更愿意在低压力环境里持续练习日语输出。

这也是它目前最适合被理解的方式：

- 一个真实在打磨中的个人学习工具
- 一个带有明确产品边界的 AI-native prototype
- 一个用于展示产品洞察、交互设计判断和工程拆分能力的 portfolio MVP
