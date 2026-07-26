(function () {
  "use strict";
  const data = {
  "meta": {
    "title": "Kotomachi Audit",
    "subtitle": "AI 产品、用户旅程、Prompt、Eval、数据与工程的独立审计工作台",
    "auditDate": "原报告未显式记录",
    "branch": "main",
    "commit": "ff06b45",
    "stage": "Alpha / portfolio MVP",
    "auditConfidence": "代码与仓库证据为主；运行态结论按原报告标记",
    "highestSeverity": "Critical",
    "strategicPriority": "先修生产消息链与 API 边界，再建立 3–5 轮生产一致 Eval",
    "overallJudgment": "功能完整度较高、产品边界清晰，但尚不能被证据支持为“质量已验证的 Beta”或可持续使用的产品。",
    "largestAdvantage": "“先输出、后学习”的分层设计，以及 Guided Scenario 的结构化内容和人工校准 Eval。",
    "largestRisk": "真实生产消息链与 Guided Eval 链不一致，且付费 API 缺少真正的服务端访问边界。",
    "nextStep": "先修生产链和 API 安全边界，再建立生产一致的 3–5 轮 Guided Eval 与最小行为数据闭环。",
    "stopNow": "不要继续增加 NPC、语言、世界观、RAG、Pronunciation Score 或更多学习卡片。",
    "source": "artifacts/kotomachi-audit-report.md"
  },
  "overview": {
    "strengths": [
      "NPC 主聊天不主动纠错，学习辅助留在用户主动打开的工具层。",
      "不同 NPC 已具备关系距离与 register 差异。",
      "Guided Scenario 的结构化内容与人工校准 Eval 是最值得继续加深的资产。"
    ],
    "caveats": [
      "仓库静态证据不能确认真实留存、学习效果、线上部署暴露程度和音频主观自然度。",
      "原报告中的“已验证事实 / 高置信推断 / 待确认”在结构化层继续保留。"
    ]
  },
  "sections": [
    {
      "number": 1,
      "title": "Executive Summary",
      "heading": "# 1. Executive Summary",
      "markdown": "# 1. Executive Summary\n\nKotomachi 当前是一个功能完整度较高、产品边界清晰的 **Alpha / portfolio MVP**，仓库也记录了少量外部 beta 反馈；但它还不能被证据支持为“质量已验证的 Beta”或可持续使用的产品。它已实现 9 个公开 NPC、1 个隐藏 NPC、73 个 Guided Scenarios、混合语言聊天、表达提示、查词、收藏复习、回顾卡、记忆、TTS/STT 等能力，工程量与产品思考都明显超过普通聊天壳。\n\n最大优势不是功能数量，而是“先输出、后学习”的分层设计：NPC 主聊天不主动纠错，用户主动打开提示、查词和复习；不同 NPC 也确有关系距离与 register 差异。Guided Scenario 的结构化内容和人工校准 Eval 是仓库里最有价值的 AI 产品资产。\n\n最大问题是：**真实生产消息链与 Guided Eval 链不一致**。前端把当前用户消息同时放入 history，后端又追加一次，导致模型看到重复输入；`isFirstGuidedTurn` 也不会按评测条件触发。因此“73 个场景首轮回复达到 beta 水平”的结论没有覆盖真实浏览器路径。与此同时，场景没有持久的轮次、目标或自然收束，学习资产也没有重新回流到后续输出；产品拥有丰富功能，却尚未形成可验证的留存闭环。\n\n最值得做的下一步是：先修生产链和 API 安全边界，再建立生产一致的 3–5 轮 Guided Eval 与最小行为数据闭环。最不该做的是继续增加 NPC、语言、世界观、RAG、Pronunciation Score 或更多学习卡片。\n\n审计标记：**已验证事实**＝代码或仓库直接支持；**高置信推断**＝代码结构强烈指向但未做运行验证；**待确认**＝需要真实用户、部署或音频试听数据。"
    },
    {
      "number": 2,
      "title": "Repository Truth Map",
      "heading": "# 2. Repository Truth Map",
      "markdown": "# 2. Repository Truth Map\n\n## 2.1 仓库基线\n\n- **已验证事实**：仓库根目录为 `D:\\LucasRan\\AI\\kotomachi`。\n- 分支：`main`；HEAD：`ff06b45`；与 `origin/main` 对齐。\n- 工作区 clean，无 staged 或 unstaged 内容。\n- 289 个 commits，时间跨度为 2026-05-26 至 2026-06-29，基本为单人 ownership。\n- 技术栈：Next.js 14、React 18、TypeScript strict、Tailwind、OpenAI SDK、DeepSeek、火山方舟、火山语音、Edge TTS、Vercel Analytics。[package.json](</D:/LucasRan/AI/kotomachi/package.json:5>)\n- 没有 test/eval npm script、测试框架或 `.test/.spec` 文件。\n- 本次未运行 build、lint、真实 provider 或浏览器测试。\n\n## 2.2 真实功能地图\n\n| 区域 | 实际状态 | 核心文件 |\n|---|---|---|\n| 首页 | Hero、世界氛围、公开 NPC、每日场景、自由话题、继续聊天、Saku 彩蛋 | [首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:41>)、[SceneEntrySection](</D:/LucasRan/AI/kotomachi/components/home/scene-entry-section.tsx:144>)、[InspirationSection](</D:/LucasRan/AI/kotomachi/components/home/inspiration-section.tsx:54>) |\n| NPC 聊天 | 9 个公开 NPC，非法 ID 静默回落到 Misaki | [ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:311>)、[NPC 配置](</D:/LucasRan/AI/kotomachi/lib/npc.ts:1>) |\n| Hidden NPC | Saku 可通过夜间 rumor / 隐藏热点发现 | [RumorEntry](</D:/LucasRan/AI/kotomachi/components/home/rumor-entry.tsx:135>) |\n| Guided Scenario | 73 个结构化场景；NPC 静态开场、sample line 预填、scene prompt、手动退出 | [场景配置](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:3>)、[启动逻辑](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1133>) |\n| 主聊天 AI | DeepSeek 主 provider，Volc Ark 顺序 fallback | [Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:603>)、[LLM provider](</D:/LucasRan/AI/kotomachi/lib/llm.ts:211>) |\n| 表达扶手 | 发送前“我想说……”、发送后 Expression Hint、下一句建议 | [Pre-send API](</D:/LucasRan/AI/kotomachi/app/api/pre-send-expression/route.ts:144>)、[Feedback API](</D:/LucasRan/AI/kotomachi/app/api/feedback/route.ts:934>) |\n| 查词与收藏 | 选中文本查词、自动记录 lookup、手动收藏、复习、mastered、笔记 | [WordPopover](</D:/LucasRan/AI/kotomachi/components/word-popover.tsx:90>)、[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:21>) |\n| 回顾卡 | 最近对话、lookup、hint、混合语言 span 生成复习资产 | [Summary API](</D:/LucasRan/AI/kotomachi/app/api/session-summary/route.ts:1017>)、[Summary schema](</D:/LucasRan/AI/kotomachi/lib/session-summary.ts:68>) |\n| Memory | 每 NPC durable facts、可见可删、4 条用户消息触发 curator、welcome merge | [Memory](</D:/LucasRan/AI/kotomachi/lib/memory.ts:207>)、[Memory API](</D:/LucasRan/AI/kotomachi/app/api/memory/route.ts:266>) |\n| TTS | 火山优先、Edge fallback、voice profile、文本 normalization、前端 session cache | [TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:37>)、[Voice profile](</D:/LucasRan/AI/kotomachi/lib/tts-voice-profiles.ts:3>) |\n| STT | MediaRecorder、火山按 ja→en→zh 尝试、转录后进入输入框确认 | [录音链](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1208>)、[STT provider](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:346>) |\n| Voice Advice | API、类型与文档存在，但没有产品 UI 调用 | [Voice Advice API](</D:/LucasRan/AI/kotomachi/app/api/voice-advice/route.ts:480>) |\n| 数据分析 | 只有自动 pageview Analytics，没有功能事件 | [Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:36>) |\n\n## 2.3 核心调用链\n\n```mermaid\nflowchart LR\n    Home[\"首页：NPC / Scene / Starter\"] --> Chat[\"ChatPage\"]\n    Chat --> Scene[\"静态 NPC opening + sample line\"]\n    Chat --> Send[\"sendToNpc\"]\n    Send --> API[\"POST /api/chat\"]\n    API --> Persona[\"NPC persona\"]\n    API --> Shared[\"共同低压力与安全规则\"]\n    API --> ScenePrompt[\"可选 scenePrompt\"]\n    API --> History[\"history + 最终 user\"]\n    History --> LLM[\"DeepSeek → Volc Ark\"]\n    LLM --> Clean[\"前端清理括号内容\"]\n    Clean --> TTS[\"POST /api/tts\"]\n    TTS --> Display[\"保存历史并显示回复\"]\n\n    Display --> Hint[\"Expression Hint\"]\n    Display --> Lookup[\"划词解释\"]\n    Hint --> Saved[\"收藏 / 复习\"]\n    Lookup --> Saved\n    Saved --> Summary[\"Review Card\"]\n```\n\n生产消息数组实际为：\n\n1. NPC persona system。\n2. shared baseline + safety system。\n3. 可选 scene system。\n4. 客户端传入的 history。\n5. 后端再追加 `{ role: \"user\", content: text }`。[组装位置](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:740>)\n\n## 2.4 数据与状态\n\n- `kotomachi_history_${npcId}`：每 NPC 最后 20 条，无 schema version/元素校验。[memory.ts](</D:/LucasRan/AI/kotomachi/lib/memory.ts:453>)\n- `kotomachi_facts_${npcId}`：最多 10 条字符串 facts。\n- `kotomachi_count_${npcId}`：消息计数。\n- `kotomachi_last_time_${npcId}`：上次聊天时间。\n- `kotomachi_arc_${npcId}`：NPC life arc 偏移。\n- `kotomachi_saved_items_v1`：收藏词、表达、回顾卡引用，最多 200。\n- `kotomachi.summaryCards.v1`、`wordLookups.v1`、`expressionHints.v1`：各自独立 schema。\n- active Guided Scene 只在 React state，刷新后丢失。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:353>)\n- 语音 blob 仅当前页面存在，不写 LocalStorage，这是正确的隐私与生命周期判断。\n\n## 2.5 文档与代码一致性\n\n| 文档说法 | 代码事实 | 判断 |\n|---|---|---|\n| README：8 个 NPC | 9 个公开 NPC + Saku，共 10 个 | 过期。[README](</D:/LucasRan/AI/kotomachi/README.md:85>) |\n| 首页规范：Continue 在 Inspiration 前 | 代码为 Inspiration → Continue | 已漂移。[规范](</D:/LucasRan/AI/kotomachi/docs/homepage-architecture-spec.md:36>)、[代码](</D:/LucasRan/AI/kotomachi/app/page.tsx:88>) |\n| Guided Eval：beta acceptable | 只评 `opening → prefill → response1`，且采样 payload 与浏览器 payload 不同 | 结论范围过宽。[回顾](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:20>) |\n| REG-VOICE-004：TTS/STT timeout Fixed | 当前 Volc TTS/STT 和 Edge TTS 无超时 | 错误状态。[Regression](</D:/LucasRan/AI/kotomachi/docs/regression-cases.md:395>) |\n| “safe prompt injection implemented” | in-app curator 有过滤，但 `/api/chat` 仍直接信任客户端 memories/history/system role | 只部分成立。[计划](</D:/LucasRan/AI/kotomachi/docs/development-plan.md:54>) |\n| Eval calibration plan 仍是待执行 | 本地 `.tmp` 已存在 8-case comparison，但没有纳入版本控制 | 文档状态落后、结果不可复现 |\n| README Demo | 仍是截图/GIF TODO | 作品集展示未完成。[README](</D:/LucasRan/AI/kotomachi/README.md:19>) |\n| System Map | 主要调用链基本准确 | 值得保留；但指向了一些被 `.gitignore` 排除的 local eval 脚本 |"
    },
    {
      "number": 3,
      "title": "Top Findings",
      "heading": "# 3. Top Findings",
      "markdown": "# 3. Top Findings\n\n成本口径：XS＜1 天；S＝1–2 天；M＝3–5 天；L＝1–2 周。\n\n## F1. 付费 AI/语音 API 没有真正的服务端访问边界\n\n- **发现与证据**：Alpha code 使用 `NEXT_PUBLIC_ALPHA_ACCESS_CODE`，在客户端比较并写 LocalStorage，code 会进入浏览器 bundle。[Alpha gate](</D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12>) 扫描 12 个 API route 未发现统一 auth、签名 session、rate limit 或 quota。\n- **严重度·对象·后果**：**Critical**；部署者、成本与用户隐私。若线上配置了 provider 凭证，调用者可绕过首页直接请求 `/api/chat`、TTS、STT、feedback 等。\n- **根因与建议**：把 UI gate 当成了 API gate。改为服务端 secret 验证并签发 httpOnly signed session；所有付费 API 校验 session，配置平台级速率限制、provider 配额和输入上限。\n- **成本·回归风险·置信度**：M；访问/部署回归高；**高置信推断**，待确认线上是否公开且已配置 provider。\n\n## F2. 真实聊天会把当前用户消息发送给模型两次\n\n- **发现与证据**：前端先把当前消息 push 到 `historyForApi`，[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983>)；API 又在 history 后追加同一 `text`。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>)\n- **严重度·对象·后果**：**Critical**；所有聊天用户、Prompt/Eval。模型看到重复输入，可能复述、过度回应、权重异常，并增加 token。\n- **根因与建议**：当前消息归属没有单一契约。规定 history 永远不包含本轮 user，或 API 不再追加；增加 deterministic payload test，断言最终用户消息只出现一次。\n- **成本·回归风险·置信度**：S；聊天历史回归高；**已验证事实**。\n\n## F3. Guided 首轮规则在生产路径下无法按 Eval 条件触发\n\n- **发现与证据**：API 用 `history.length <= 1` 判断首轮，[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650>)；浏览器首轮 history 至少包含 scene opening + 当前 user，因此长度为 2。采样器只放 opening，再把 user 单独作为 text。\n- **严重度·对象·后果**：**High**；Guided 用户、Prompt 质量。专门防止过早收场的首轮规则在真实路径失效。\n- **根因与建议**：Eval 只验证 sampler→route，没有验证 browser→route。修 F2 后，把真实 payload assembly 抽成可复用函数，评测和前端共同使用。\n- **成本·回归风险·置信度**：S；Guided 回归高；**已验证事实**。\n\n## F4. “73 场景 beta 可接受”没有覆盖真实 3–5 轮体验\n\n- **发现与证据**：v10 的评测单位明确只有 `npcOpening → sampleUserLineJa → npcResponse1`，[Retrospective](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22>)，却把目标表述为 3–5 轮。39/73 为 R3，仍有 16 个 `too_closed`、6 个弱 hook。[结果](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155>)\n- **严重度·对象·后果**：**High**；产品判断、roadmap、作品集可信度。首轮高分不能证明用户会发第二、三句或自然结束。\n- **根因与建议**：把易采样的 turn quality 代替了 episode outcome。保留 73 首轮集，但增加 12–20 条生产一致的 3–5 轮 episode eval、场景漂移和收束指标。\n- **成本·回归风险·置信度**：M；Eval 规则回归中；**已验证事实**。\n\n## F5. Guided Scenario 是丰富配置，不是完整 episode system\n\n- **发现与证据**：配置含 `userGoal / possibleBeats / usefulIntents / softLanding`，[scene schema](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17>)；主 chat prompt 只使用 title、setup、intent、moment、avoid，[buildScenePrompt](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504>)。active scene 不持久、无 turn count、进度、完成或自动 soft landing，只能手动退出。\n- **严重度·对象·后果**：**High**；快速场景练习用户。场景开始后仍像普通聊天，无法保证 3–5 轮有意义输出。\n- **根因与建议**：内容 schema 领先于运行状态。新增极轻量 episode state：sceneId、startedAt、userTurnCount、phase、endedReason；不做任务 UI，只用于 Prompt、自然收束和数据。\n- **成本·回归风险·置信度**：M/L；对话自然度回归高；**已验证事实**。\n\n## F6. 产品无法回答最核心的行为问题\n\n- **发现与证据**：仅挂载 `<Analytics />`，没有 `track()` 或 feature event。[Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:39>) 体验日志记录了少量 external beta feedback，但没有参与人数、session、漏斗或变化前后数据。[Experience Log](</D:/LucasRan/AI/kotomachi/docs/experience-log.md:86>)\n- **严重度·对象·后果**：**High**；产品负责人、实验与 roadmap。无法判断第一句发送率、3 轮率、Guided 增益、工具使用、回访和学习资产复用。\n- **根因与建议**：功能开发快于验证。先采 10–12 个无内容事件，并做 5–10 人任务观察；禁止采原始消息和音频。\n- **成本·回归风险·置信度**：M；隐私风险中；**已验证事实**。\n\n## F7. 每条 NPC 回复都自动生成 TTS，并阻塞文本出现\n\n- **发现与证据**：`useVoice = true`，等待 `fetchTtsUrl` 后才构建并显示 assistant message。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033>) 输入框在整个期间 disabled。[输入框](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437>) TTS 响应明确 `no-cache`。[TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118>)\n- **严重度·对象·后果**：**High**；所有用户、延迟与费用。即使用户不播放语音也会付费并等待；TTS 故障拖慢文本聊天。\n- **根因与建议**：把语音资产生成当作回复完成条件。先显示文本并解锁输入；TTS 改为按需或后台预取，失败不能影响聊天。\n- **成本·回归风险·置信度**：M；音频状态回归高；**已验证事实**。\n\n## F8. 音频当前最关键的问题是可靠性与交互，不是继续挑声线\n\n- **发现与证据**：Volc TTS、STT 和 Edge stream 无 AbortSignal/timeout；录音 permission await 存在“用户已松手但 recorder 后启动”的 race；mp4 被标成 mp3、webm 被标成 ogg 但没有转码。[录音](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213>)、[格式映射](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249>)。STT 还会把所有拉丁词小写化。[后处理](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265>)\n- **严重度·对象·后果**：**High**；移动端和混合语言用户。首次录音、Safari mp4、JLPT/AI/ChatGPT 等专有词可能失败或失真。\n- **根因与建议**：浏览器容器格式、provider codec 和 UI gesture 生命周期没有统一契约。先加 timeout、permission cancellation、最长录音、真实容器支持/转码策略，移除破坏性 lowercase。\n- **成本·回归风险·置信度**：M；跨浏览器回归高；格式失败为**高置信推断**，需真机验证。\n\n## F9. 首页内容丰富，但首屏没有清楚说“这是什么、我该做什么”\n\n- **发现与证据**：Hero 只有品牌、时间与氛围，[首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:46>)；随后是 9 NPC、featured scene、9 个自由话题，Continue 最后出现且最多只显示 1 个。[Continue](</D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42>)\n- **严重度·对象·后果**：**High**；首次用户和回访用户。新用户面对多个相似入口，回访用户的主任务反而被埋底。\n- **根因与建议**：首页同时承担世界观、NPC 展示、场景推荐、话题推荐和恢复会话。首屏补一句明确价值；有历史时把 Continue 提到 Scene 前；默认只显示一个主要场景和少量 NPC。\n- **成本·回归风险·置信度**：S/M；视觉层级回归中；**高置信推断**，未做截图/可用性测试。\n\n## F10. 学习工具形成了资产库，但没有形成“资产重新进入输出”的闭环\n\n- **发现与证据**：收藏支持 review/mastered/notes，回顾卡也有 `nextTalkPrompt`；但主聊天 payload 只注入 memories，不注入 saved words/expressions/review history。[send payload](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028>) 没有检测收藏词是否重新出现在用户输出。\n- **严重度·对象·后果**：**High**；学习工具用户与留存。收藏、复习和聊天成为并行系统，无法证明学习资产提升了表达。\n- **根因与建议**：闭环停在“保存/看过”。先做一个小实验：从最近收藏中生成可编辑的下一次开场，或在本地检测后续输出是否复用了某个资产，只上报 boolean。\n- **成本·回归风险·置信度**：M；可能增加学习压力，回归中；**已验证事实**。\n\n## F11. `/api/chat` 信任客户端提供的角色、上下文和长度\n\n- **发现与证据**：request 直接接受 `ChatCompletionMessageParam[]`、memories、lifeArc、worldDescription 等，[类型](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21>)；随后原样插入 messages。[组装](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>) text、history 内容和总长度没有上限，history 也可包含 system/tool role。\n- **严重度·对象·后果**：**High**；Prompt 安全、费用与稳定性。调用者能插入额外 system message、构造巨型上下文或伪造世界/记忆。\n- **根因与建议**：服务端类型断言代替运行时校验。只接受 user/assistant、截断每条和总条数；npc/scene 必须验证匹配；日期、世界和 familiarity 在服务端计算。\n- **成本·回归风险·置信度**：M；旧 payload 回归高；**已验证事实**。\n\n## F12. LocalStorage 是合理 MVP 选择，但当前 schema 与清理边界已开始失控\n\n- **发现与证据**：history 只检查 array，不校验元素；Saved Items key 带 v1 但 load 同样只检查 array。[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96>) “重新开始”清 history/facts/time，但不清 `kotomachi_count_*`，[reset helper](</D:/LucasRan/AI/kotomachi/lib/memory.ts:493>)，导致新欢迎仍可能带熟悉度。\n- **严重度·对象·后果**：**Medium/High**；回访用户、数据迁移、隐私。损坏旧数据可污染 UI；“重新开始”语义不一致；用户没有一键导出/删除全部本地数据。\n- **根因与建议**：每项功能自行增加 key。先建小型 storage registry、runtime parser 和迁移入口；明确 reset chat、delete memory、delete all 三种语义。\n- **成本·回归风险·置信度**：M；历史数据回归高；**已验证事实**。\n\n## F13. 集成点和 Prompt 已达到高改动扩散风险\n\n- **发现与证据**：ChatPage 2618 行、SavedItemsPanel 2181 行、ChatBubble 1544 行、conversation-scenes 3254 行。ChatPage 有 40+ state/ref；persona 又在 chat 与 welcome 重复维护。Aoi 在 `buildSystemPrompt` 有一套 Prompt，[Aoi branch](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224>)，运行时又由另一套专用 Prompt 覆盖。[runtime Aoi](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688>)\n- **严重度·对象·后果**：**Medium/High**；后续维护者、Prompt Lead。改一处可能没有生效，状态变更容易影响音频、场景、回顾、记忆和欢迎。\n- **根因与建议**：功能连续叠加在原集成组件。不要重写；先抽 `buildChatPayload`、`useChatSession`、`useVoiceInput`、Prompt registry 和 scene session reducer。\n- **成本·回归风险·置信度**：L，分步实施；回归高；**已验证事实**。\n\n## F14. 输出与失败路径没有保护核心产品契约\n\n- **发现与证据**：主聊天只取 `aiText` 并返回，无 Japanese ratio、长度、emoji、teacher-tone 或空字符串校验。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818>) 前端清理会删除所有括号/方括号内容，而非只识别动作描写。[sanitize](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157>) 失败 fallback 带 emoji，且失败 turn 不保存。[错误路径](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051>)\n- **严重度·对象·后果**：**Medium/High**；异常输入和 provider 故障用户。可出现空回复、非日语回复、合法括号内容丢失、刷新后失败 turn 消失。\n- **根因与建议**：核心契约只写在 Prompt，没有 deterministic guard。增加轻量 post-check 与不破坏原文的 fallback；失败消息和重试操作要明确，不伪装成正常 NPC 回复。\n- **成本·回归风险·置信度**：S/M；日语文本误判风险中；**已验证事实**。\n\n## F15. 移动可用性、文档证据和作品集呈现仍不够专业\n\n- **发现与证据**：根 `<html lang=\"ja\">`，但 UI 默认中文；大量 8–10px 文本、36×36 主控件，[输入控件](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210>)；多个 overlay 缺 `role=\"dialog\"`、focus trap 和 Escape，例如 Saved Items。[overlay](</D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785>) 英文 UI 的 active scene 仍显示中文 `title/setup`。[scene card](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062>) README 没有 demo 图片。\n- **严重度·对象·后果**：**Medium**；移动端、键盘/辅助技术用户、招聘方。产品显得功能多但完成度不稳定。\n- **根因与建议**：组件局部 polish 多，端到端 accessibility 和 portfolio evidence 少。做一次真机/桌面任务截图审计，统一对话框语义、字号、点击区、语言与 README 证据。\n- **成本·回归风险·置信度**：M；视觉回归中；代码事实已验证，实际可见严重度**待浏览器确认**。"
    },
    {
      "number": 4,
      "title": "User Journey Audit",
      "heading": "# 4. User Journey Audit",
      "markdown": "# 4. User Journey Audit\n\n## 4.1 首次用户\n\n**有效设计**\n\n- Guided Scene 和 starter 都能预填而不自动发送，保留用户 ownership。\n- 进入场景由 NPC 先开口，显著优于空白输入框。\n- 聊天页有一次性 onboarding card。\n- 多种输入语言可进入，NPC 仍被要求使用日语。\n\n**关键断点**\n\n1. Hero 没有立刻解释“低压力日语输出练习”。\n2. NPC、日常场景、今日场景、随便聊一句是多个相似入口。\n3. 9 个 NPC 的 register 差异虽然存在，但首次用户需要读大量小字才能理解。\n4. 进入聊天后可能先等待 welcome；核心输入区与多个辅助入口同时出现。\n5. 系统没有询问“你想随便聊，还是练一个具体场景”。\n\n**判断**：启动扶手很多，但首页没有替用户做第一次选择。\n\n## 4.2 回访用户\n\n**有效设计**\n\n- 按 NPC 保存聊天、上次时间和记忆。\n- 两小时后可生成 revisit welcome。\n- 首页能恢复最近一次聊天。\n- NPC life arc、world context 和 memory 试图制造连续感。\n\n**关键断点**\n\n- Continue 被放在首页最底部，只显示 1 个最近 NPC。\n- revisit welcome 是额外 LLM 调用，也可能让用户觉得 NPC 自说自话。\n- “重新开始”不清 familiarity count。\n- 收藏和回顾没有自然成为回访任务。\n- 当前没有证据说明 life arc/world state 被用户注意到或促成留存。\n\n**判断**：有恢复能力，但没有被验证的第二周回访理由。\n\n## 4.3 Guided Scenario 用户\n\n**有效设计**\n\n- 73 个场景覆盖点单、校园、职场、生活支援、旅行、运动和 mystery。\n- scene query、NPC-first opening、editable sample line 都已实现。\n- Prompt 明确避免任务/考试化。\n\n**关键断点**\n\n- 当前 user 重复进入 Prompt，首轮规则失效。\n- scene state 刷新即丢。\n- 新场景 opening 直接追加到旧聊天，旧话题仍在 history。\n- 无 3–5 轮 episode phase、完成或 soft landing。\n- `softLanding` 等字段没有进入主 chat prompt。\n- 场景一直 active，直到用户手动退出。\n\n**判断**：入口体验接近产品，后续多轮仍是普通聊天加 scene label。\n\n## 4.4 学习工具用户\n\n**有效设计**\n\n- 主聊天与教学层分离，是最强产品决策。\n- Expression Hint 为用户主动触发，分 casual/neutral/polite。\n- 查词有读音、句义、语感和来源。\n- 收藏复习支持筛选、review count、mastered 和 notes。\n- Review Card 能利用 lookup/hint 作为强信号。\n\n**关键断点**\n\n- 学习入口很多：Hint、translate、lookup、pre-send、next line、save、review、summary。\n- 收藏项来源上下文不够清楚，仓库也已记录该问题。\n- 资产没有进入下一次聊天输出。\n- 当前无法知道哪种工具真正帮助了用户，哪种只是被打开。\n- SavedItemsPanel 过于复杂，可能把轻量练习变成管理学习数据库。\n\n**判断**：学习资产生成强于学习资产复用。\n\n## 4.5 混合语言与错误用户\n\n- 中英日混合输入是明确支持的，Chat Prompt 也要求日语回复。\n- Pre-send 和 Expression Hint 有大量混输 normalizer/fallback。\n- 但主聊天没有输出 contract check。\n- STT 会错误 lower-case 拉丁词。\n- 对 AI 回复不满意时没有 regenerate、dislike、report bad case 或“换一种更短回复”；只有 Expression Hint 可重生成。\n- 网络失败同时出现 error banner 和伪 NPC fallback bubble，且 fallback 带 emoji。\n\n## 4.6 移动端\n\n静态代码判断的五个最大风险：\n\n1. 首次麦克风权限期间松手可能产生录音 race。\n2. 麦克风/+ 按钮为 36px，低于常见 44px 触控建议。\n3. 大量 8–10px 文案和低 opacity secondary text。\n4. 文本 selection、查词 popover 在移动端本身难操作。\n5. 多层 fixed menu、drawer、soft keyboard 和 safe-area 可能互相挤压；多数 overlay 缺 focus/Escape 管理。\n\n## 4.7 桌面端\n\n- 固定 sidebar、宽聊天区、右侧 drawer 比移动端更适合管理收藏和回顾。\n- 但首页仍大量使用横向滚动 rail，在宽屏上信息层级不够聚焦。\n- 侧栏、+ 菜单和气泡操作共同暴露很多能力，长期用户可能形成“到处都是工具”的疲劳。\n\n## 4.8 五类 UX 结论\n\n**首次最可能困惑的 5 点**\n\n1. 这是聊天产品、口语产品还是收藏复习产品？\n2. SceneEntry 和“今日街角小事”有什么区别？\n3. 应该先选 NPC 还是先选场景？\n4. “我想说”“下一句怎么接”“表达提示”分别发生在什么时候？\n5. NPC 为什么自动说话/自动生成语音？\n\n**高频用户最可能厌烦的 5 点**\n\n1. 每轮都等 TTS 才看到文字。\n2. 回复期间不能提前输入下一句。\n3. 首页继续聊天入口太低。\n4. revisit welcome 不一定是用户想要的。\n5. 收藏、回顾和筛选逐渐变成管理负担。\n\n**看起来精致但当前价值较低**\n\n- 隐藏 Saku 热点和彩蛋。\n- 每日伪随机 world weather/life arc。\n- 73 个场景的数量扩张。\n- PWA install guidance。\n- 过多学习卡内部标签和层级。\n\n**小改动高收益**\n\n- Hero 增加一行明确定位和单一主 CTA。\n- 有历史时把 Continue 提到第一内容区。\n- 修复消息重复，让回复文字先显示。\n- chat busy 时仍允许用户在输入框起草。\n- 统一 44px 控件、12px 以上辅助文本。\n- active scene 用本地化 title/microEpisode，而非中文 setup。"
    },
    {
      "number": 5,
      "title": "AI / Prompt Audit",
      "heading": "# 5. AI / Prompt Audit",
      "markdown": "# 5. AI / Prompt Audit\n\n## 5.1 当前消息链\n\n- Persona system：NPC 身份、语体、关系距离、memory、日期、life arc、邻居与世界状态。\n- Shared system：低压力、先回应用户、不要教学/建议机，以及较长的世界安全规则。\n- Scene system：场景 title/setup/intent/moment/avoid 和首轮 continuation 规则。\n- History：客户端提供。\n- Final user：服务端追加。\n\n主要问题不是“scenePrompt 丢失”。本地 runtime snapshot 已证明 scenePrompt 会到达 provider；真正问题是：\n\n1. 浏览器 payload 和 sampler payload 不一致。\n2. persona/shared/scene 约束竞争。\n3. Prompt 过长且重复。\n4. 没有输出端 contract。\n5. 没有 Prompt version 或 production trace。\n\n## 5.2 Prompt 架构风险\n\n| 风险 | 类型 | 判断 |\n|---|---|---|\n| 当前 user 重复 | 工程/Prompt assembly | 确定性 bug，不是模型问题 |\n| Aoi 两套 Prompt | 工程/维护 | 修改旧 branch 可能完全无效 |\n| Welcome 单独维护 NPC_PERSONALITIES | 工程/角色漂移 | chat 与 welcome 可产生不同角色 |\n| Shared safety 超长 | Prompt | 规则竞争和 token 成本增加 |\n| 大量禁止项 | Prompt | 能压坏例，但可能让回复过度保守/too closed |\n| 任意 history/system role | 安全/工程 | 可绕过原始 system 优先级 |\n| 无 Prompt version | 质量治理 | 无法把 bad case 绑定到具体版本 |\n| 无 provider/model/usage 返回 | 数据/工程 | 无法分辨 Prompt、模型、provider 与延迟问题 |\n| 无输出校验 | 产品/工程 | Prompt 失效后没有第二层保护 |\n\n## 5.3 NPC 差异化判断\n\n**差异不是只有头像**。Aoi 的同龄 casual、Haruka 的轻丁寧前辈、Kimura 的便利店距离、Taisho 的年长熟客、Mao 的轻职场、Riku 的运动伙伴、Nana 的生活支援、Ren 的旅行观察、Saku 的轻神秘，都有行为规则和禁止漂移。\n\n但差异仍有三个上限：\n\n- 大多数 NPC 共享“短句→回应→问一个小问题”的行为骨架。\n- Practical NPC 容易滑向客服/顾问；v10 中 Nana 仍最弱，平均 23.13。\n- 没有多轮 episode state 时，NPC 的 register 主要体现在语气，不一定形成不同的用户行为闭环。\n\n结论：**NPC 差异化已超过换皮，但还没有被用户选择、回访和留存数据证明。**\n\n## 5.4 Guided Scenario 状态\n\n- Scene ID 能进入 API。\n- scene avoid/intent/moment 进入 Prompt。\n- topic ideas 和 pre-send 会使用 userGoal、beats、softLanding。\n- 主聊天本身不使用这些 episode 字段。\n- 无场景结束检测。\n- 无“已完成一次低压力输出”的产品反馈。\n- 无多轮 regression。\n\n## 5.5 模型/provider 风险\n\n- DeepSeek 8 秒后顺序尝试 Ark 10 秒，理论上可等待约 18 秒。[LLM](</D:/LucasRan/AI/kotomachi/lib/llm.ts:215>)\n- Chat 未设置 `maxTokens`，但前端 history 限制为最后 10 条；任意 API 调用者仍可发送超长内容。\n- createChatCompletion 只返回 string，丢失 provider、model、usage、latency。\n- 不同 provider 的行为差异没有单独 Eval。\n- 当前无法判断某个坏例来自 Prompt、model 或 fallback provider。\n\n## 5.6 Memory readiness\n\n**已经做对的部分**\n\n- 每 NPC 隔离。\n- durable fact 与 temporary context 有清晰理念。\n- 可见、可删。\n- curator 支持 ignore/add/replace。\n- 对敏感、短期、购物话题做保守过滤。\n\n**不适合直接继续扩展的部分**\n\n- facts 仍是 `string[]`，没有 id/type/source/timestamp/confidence。\n- welcome 与 memory curator 有两条 extraction 路径。\n- 客户端可伪造 memory。\n- 无版本、审核记录和来源 message ID。\n- history、facts、count、arc 各自独立。\n\n在加入更强 memory 前，应先做 schema/version/provenance，而不是 RAG。"
    },
    {
      "number": 6,
      "title": "Eval & Data Blueprint",
      "heading": "# 6. Eval & Data Blueprint",
      "markdown": "# 6. Eval & Data Blueprint\n\n## 6.1 评测单位\n\n| 单位 | 核心问题 |\n|---|---|\n| Turn | 这一句是否自然、短、先回应用户、可继续 |\n| Guided Episode | 3–5 轮是否持续、符合场景并自然收束 |\n| Tool Artifact | Hint、lookup、summary 是否 grounded、可复用 |\n| Audio Clip | 可懂度、自然度、首播延迟与发音 |\n| Failure Episode | provider 失败后用户是否仍能继续 |\n| User Session | 用户是否真的发送、继续、复用和回访 |\n\n## 6.2 指标按判断方式区分\n\n| 指标 | 自动规则 | LLM Judge | 人工 | 行为数据 |\n|---|---:|---:|---:|---:|\n| 日语输出比例、emoji、句数、字符数 | ✓ |  | 抽查 |  |\n| 当前 user 是否重复 | ✓ |  |  |  |\n| 先回应用户 |  | ✓ | 校准 |  |\n| continuation hook | 可检测问号/长度 | ✓ | 校准 | 下一轮发送率 |\n| teacher/advisor/service tone | 部分关键词 | ✓ | ✓ |  |\n| 角色一致性/register |  | ✓ | ✓ 必须 | NPC 回访 |\n| 低压力程度 |  | ✓ | ✓ 必须 | 用户评分 |\n| 场景一致性与进展 | 状态/sceneId | ✓ | ✓ | 3/5 轮率 |\n| 自然收束 | phase/turn | ✓ | ✓ | exit reason |\n| 混合语言理解 | Japanese ratio | ✓ | ✓ | 首句发送 |\n| Hint/lookup/summary groundedness | schema/引用检查 | ✓ | ✓ | 使用/保存 |\n| TTS 发音与自然度 | 时延/失败率 | 有限 | ✓ 必须 | 播放/中止 |\n| 错误 fallback | status/latency |  | ✓ | 重试/退出 |\n\n## 6.3 最小样本体系\n\n第一版不需要庞大平台：\n\n- 30 个 core turn cases：每 NPC 3 个，覆盖自由聊、混输、角色高风险。\n- 12 个 Guided episodes：每个 3–5 轮，优先 Nana、Kimura、Riku、Aoi、Saku、Mao。\n- 12 个 learning tool cases：Hint 4、lookup 4、summary 4。\n- 8 个 audio cases：日期、JLPT、AI、混合专有词、长短句、男女声。\n- 6 个 failure cases：LLM timeout、TTS timeout、STT no-speech、格式失败、空回复、LocalStorage failure。\n- 原有 73 个首轮场景继续作为 weekly/full regression。\n\n每个 case 必须保存：\n\n- `caseId`\n- `promptVersion`\n- `sceneSchemaVersion`\n- `provider/model`\n- 完整但脱敏的 input context\n- expected / forbidden\n- 自动指标\n- judge score\n- 人审状态\n- badCaseType\n- introducedAt / fixedAt\n\n## 6.4 评分与 bad case\n\n建议 1–5 分：\n\n- 1：明显破坏体验。\n- 2：可理解但用户难接、角色明显漂移。\n- 3：可用，有可见缺陷。\n- 4：自然稳定。\n- 5：非常符合角色且低压力、容易接。\n\n硬失败标签独立于总分：\n\n- `context_duplicate_user`\n- `non_japanese_output`\n- `teacher_correction`\n- `advisor_or_service_takeover`\n- `overlong`\n- `no_acknowledgement`\n- `weak_or_no_hook`\n- `interrogative_rhythm`\n- `character_or_register_drift`\n- `scene_no_progress`\n- `scene_early_close`\n- `scene_never_closes`\n- `invented_fact_or_policy`\n- `tool_not_grounded`\n- `audio_timeout`\n- `audio_container_mismatch`\n- `fallback_dead_end`\n\n## 6.5 人审校准\n\n- 建立 20 条 gold set，至少两名评审。\n- 先各自独立评分，再只讨论差异≥2或硬标签不同的 case。\n- 保留 adjudicated gold。\n- Judge 每次升级都跑 gold；目标不是完全一致，而是：\n\n  - hard failure recall ≥90%；\n  - 主标签一致率 ≥75%；\n  - 评分差≤1 的 case ≥80%；\n  - 对 atmosphere、intent narrowing、teacher tone 的已知 bias 单独记录。\n\n现有 8-case calibration 的 75% primary match 是良好起点，但样本不足，且已发现 Judge 会忽略 intent narrowing、过度奖励氛围。\n\n## 6.6 Regression gate\n\n每次 Prompt/model/provider/scene 变更：\n\n1. 100% 跑与改动相关的 targeted cases。\n2. 跑 30 个 core turn。\n3. 若影响 Guided，跑 12 个 multi-turn episodes。\n4. 自动 hard check 必须 100% 通过。\n5. 不允许新增 R0。\n6. LLM Judge 不得显著劣化。\n7. 至少人工抽查 10 条。\n8. 发布后对行为指标观察 3–7 天。\n\n## 6.7 最小行为数据闭环\n\n**North Star**\n\n`Low-pressure output session rate`：打开聊天后，在 10 分钟内成功发送第一句，并累计至少 3 条用户消息的 session 比例。\n\n**核心漏斗**\n\n- `home_view`\n- `npc_chat_open`\n- `scene_start`\n- `starter_prefilled`\n- `message_send`\n- `npc_reply_received`\n- `turn_milestone_2/3/5`\n- `aid_open`\n- `suggestion_applied`\n- `lookup_success`\n- `item_saved`\n- `review_started/completed`\n- `saved_item_reused`\n- `session_end`\n- `return_d1/d7`\n\n**只记录**\n\n- NPC/scene ID\n- UI/input mode\n- language-mix bucket\n- 字符数 bucket\n- turn number\n- latency、provider、fallback\n- boolean 结果\n\n**不记录**\n\n- 原始消息\n- 音频\n- 查词原句\n- memory 内容\n- API key 或 Authorization\n- 可识别个人信息\n\n`saved_item_reused` 可在浏览器本地匹配，只上报 boolean 和资产年龄 bucket。"
    },
    {
      "number": 7,
      "title": "Engineering Audit",
      "heading": "# 7. Engineering Audit",
      "markdown": "# 7. Engineering Audit\n\n## 7.1 现在必须修\n\n| 问题 | 不改后果 | 最小范围 | 风险 |\n|---|---|---|---|\n| 当前 user 重复、Guided 首轮失效 | 核心 AI 质量与 Eval 无效 | ChatPage payload + API contract + deterministic test | 高 |\n| 付费 API 无服务端 gate/rate/input cap | 成本滥用与攻击面 | middleware/API guard、signed cookie、route validation | 高 |\n| TTS 阻塞文本回复 | 每轮延迟与无效费用 | 先显示文本，TTS 后台或按需 | 高 |\n| TTS/STT 无 timeout | 页面/Serverless 卡住 | AbortController + UI timeout fallback | 中 |\n| 录音 permission/format race | 移动端核心语音失败 | recorder state machine + format contract | 高 |\n\n## 7.2 下一个重要功能前必须修\n\n| 问题 | 最小修改 |\n|---|---|\n| 无生产一致 Eval | 抽出共享 payload builder，tracked evaluator 默认 dry-run |\n| 无 Prompt/model/version trace | API 响应加入非敏感 meta，结果文件记录版本 |\n| Guided 无 episode state | 小 reducer：scene/turn/phase/end |\n| Prompt/NPC 配置重复 | 统一 Prompt registry，welcome 派生精简 persona |\n| LocalStorage 无统一版本 | storage registry、runtime parser、migration、delete all |\n| 巨型 ChatPage | 先抽 voice、session、payload 三个 hook，不做 UI 重写 |\n\n## 7.3 可以暂缓\n\n- Account、云同步和数据库。\n- 跨 NPC memory。\n- Manual memory edit。\n- 更精细的 affection/familiarity。\n- 全量组件设计系统重构。\n- 更换状态管理库。\n- 德语或其他语言扩展。\n- 更高级语音声学评分。\n\n## 7.4 不值得做\n\n- Vector DB / RAG memory。\n- 微服务、事件总线或复杂 provider plugin architecture。\n- 为每个 bad case 增加新的 Prompt 分支。\n- 大规模重写 73 个场景。\n- 为作品集“看起来高级”而增加实时语音、Live2D、排行榜、连续签到。\n- 在没有 activation 数据前建设推荐系统。"
    },
    {
      "number": 8,
      "title": "Product Positioning",
      "heading": "# 8. Product Positioning",
      "markdown": "# 8. Product Positioning\n\n## 最核心用户\n\n- N3–N1 左右或等效能力。\n- 输入明显强于输出。\n- 能理解短日语，但组织第一句困难。\n- 真人社交压力较高。\n- 想练关系距离和自然 register，而非只学语法。\n\n## 核心价值\n\n> 在不会说、怕说错、找不到话题时，提供足够轻的表达扶手，让用户仍感觉“这句话是我自己说出去的”。\n\n确认后发送、NPC 不纠错、学习层后置，是这个价值最可信的实现。\n\n## 与直接使用 ChatGPT 的差异\n\n**真实差异**\n\n- 关系/register 固定的 NPC。\n- 低压力对话契约。\n- Guided micro-scene。\n- 用户确认后发送。\n- 上下文查词和表达提示。\n- 对话资产收藏/回顾。\n- 可见可删的 per-NPC memory。\n\n**尚未形成壁垒的差异**\n\n- NPC 数量。\n- 世界观和彩蛋。\n- 73 个场景。\n- TTS/STT 本身。\n- 多种卡片和筛选。\n\n这些都能被 ChatGPT 自定义 Prompt 或其他语言 App 快速复制。真正难复制的是：**生产一致的质量治理 + 真实用户行为数据 + 不破坏自然聊天的学习闭环**。\n\n## 不适合服务的人群\n\n- 完全零基础学习者。\n- 需要系统课程/JLPT 刷题的人。\n- 希望每句被纠错或需要发音评分的人。\n- 追求真人实时语音对练的人。\n- 需要多设备同步、严格数据保管的人。\n- 想把 NPC 当事实顾问、医疗/租房/行政咨询的人。\n\n## 当前产品阶段\n\n独立判断：**feature-rich Alpha / portfolio MVP，带小范围 beta 使用痕迹；不是已验证的 Beta 产品。**\n\n## 最大留存障碍\n\n用户第一次可能因为新鲜、NPC 或场景进入；第二周回来需要“今天有一件小事想告诉某个人”的动机。当前仓库已提出 Daily Share Motivation，但未形成清晰入口和行为证据。\n\n## 最值得强化的闭环\n\n`现实中有一句想说 → 低压力扶手 → 用户自己发送 → NPC 自然接住 3–5 轮 → 带走一个表达 → 下一次真正复用`\n\n这比继续增加 NPC、卡片或世界 lore 更重要。\n\n## 扩展到德语时\n\n**可复用**：聊天/教学分层、confirm-before-send、scene state、事件体系、Eval pipeline、LocalStorage 框架、provider fallback。\n\n**不能复制**：register、礼貌距离、场景文化、词形/查词、TTS normalization、STT 语言策略、Prompt rubric、NPC 社会关系。\n\n现在不应扩语言；否则会把尚未验证的日语闭环复制成多套技术债。"
    },
    {
      "number": 9,
      "title": "Prioritized Roadmap",
      "heading": "# 9. Prioritized Roadmap",
      "markdown": "# 9. Prioritized Roadmap\n\n## 未来 72 小时\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | 修复 production/eval 消息契约 | 恢复真实对话和 Guided 首轮质量 | 当前 user 在 provider messages 中只出现一次；真实首轮 history=1；6 个 deterministic cases | S | 对历史组装高风险；先固定 contract |\n| P0 | 保护全部付费 API | 防滥用、费用和隐私事故 | 服务端 signed access、route guard、role/length validation；未授权/超长请求被拒绝 | M | 部署配置；不需要账户/数据库 |\n| P0 | 定义核心事件与版本字段 | 后续改动可被验证 | 事件 schema、prompt/model/scene version、禁止采集字段；至少本地可检查 payload | S | 先做设计与最小埋点，不建数据平台 |\n\n## 未来两周\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | 生产一致 Eval Harness | 让质量结论可信 | tracked dry-run harness；30 core turns + targeted cases；sampler 共用生产 payload builder | M | 依赖消息契约 |\n| P1 | 12 个 3–5 轮 Guided Eval | 验证场景是否真能持续 | episode trace、progress/closure rubric、2 人校准；不再以首轮代表整段 | M | 少量真实 API 成本需人工授权 |\n| P1 | 非阻塞音频与录音稳定性 | 更快看到回复、移动语音可用 | 文本先显示；TTS/STT timeout；permission cancel；Safari/Chrome 格式矩阵 | M/L | 跨浏览器风险 |\n| P1 | 首页 activation 收敛 | 用户立即知道怎么开始 | Hero 一句话；Continue 前置；默认入口减少；5 人任务中都能在 30 秒内找到第一步 | M | 需要浏览器测试 |\n| P1 | 小样本可用性研究 | 找到真实退出点 | 5–10 名目标用户、任务录像/笔记、首次发送/3 轮/压力评分基线 | M | 招募和隐私同意 |\n\n## 未来一个月\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | Guided 3–5 轮 episode v1 | 让场景成为完整练习而非开场贴纸 | scene/turn/phase/end state、自然 soft landing；Guided 相对 free chat 的 3-turn rate 有方向性提升 | L | 依赖 Eval 与事件 |\n| P1 | 学习资产复用实验 | 验证收藏是否提高下一次输出 | 最近收藏生成可编辑 starter 或本地 reuse 检测；测 save→reuse | M | 避免变成强制复习 |\n| P1 | Storage v2 与隐私控制 | 防旧数据失效、增强信任 | schema parser/migration、export/delete all、reset 语义修复 | M | 历史数据迁移 |\n| P2 | 真机 Accessibility/移动端 pass | 提升实际可用性 | 44px targets、dialog/focus/Escape、动态 lang、关键文本字号；移动任务无 blocker | M | 需浏览器/真机 |\n| P1 | 作品集 flagship 发布材料 | 把能力变成可见证据 | 90 秒 demo、架构图、Eval before/after、真实行为结果、bad-case 复盘和局限 | M | 必须建立在真实结果上 |"
    },
    {
      "number": 10,
      "title": "Stop Doing List",
      "heading": "# 10. Stop Doing List",
      "markdown": "# 10. Stop Doing List\n\n当前应停止或冻结：\n\n1. 新增 NPC，至少在各 NPC 的选择率和 3-turn rate 可见前停止。\n2. 新增德语或其他语言。\n3. 扩写 Saku lore、隐藏热点和彩蛋。\n4. 增加新的学习卡片、字段和筛选器。\n5. 继续基于 sampler 做全局 Prompt tuning。\n6. 继续挑声线而不先修 TTS/STT 交互与可靠性。\n7. 推进 Voice Advice / Pronunciation Score。\n8. Account、数据库、多端同步和 RAG memory。\n9. 用 daily world state/life arc 替代真正的回访机制。\n10. 把“73 个场景”“10 个 NPC”“12 个 API”当成产品成熟度证据。\n11. 在没有 production-parity trace 时写“beta acceptable”。\n12. 写更多 roadmap 文档而不更新已有过期状态。"
    },
    {
      "number": 11,
      "title": "Flagship Autumn-Recruitment Case",
      "heading": "# 11. Flagship Autumn-Recruitment Case",
      "markdown": "# 11. Flagship Autumn-Recruitment Case\n\n## 推荐方向\n\n**“把 73 个场景内容库，升级为可测量的 3–5 轮低压力日语输出系统”**\n\n这是最能同时提升产品、AI 质量、数据能力和作品集可信度的方向。\n\n## 完整故事结构\n\n**问题**\n\n输入型学习者知道词和语法，却在第一句、第二句和对话延续上卡住；普通 AI 又容易纠错、解释或把场景过早解决。\n\n**用户**\n\nN3–N1、输入强输出弱、真人交流压力较高，希望短暂练习而非上课的人。\n\n**产品假设**\n\nNPC-first opening + editable starter + relationship-aware response + low-pressure hook，会提高第一句发送率和 3-turn completion；用户主动调用学习层比强制纠错压力更低。\n\n**设计**\n\n- Guided micro-scenario。\n- 自由编辑而非自动发送。\n- 关系/register 明确的 NPC。\n- 隐形 episode phase，不显示任务或评分。\n- 3–5 轮自然 soft landing。\n- 学习提示仍留在辅助层。\n\n**AI 能力**\n\n- 生产一致 Prompt assembly。\n- Persona/shared/scene 分层。\n- Prompt/model/scene version。\n- provider fallback。\n- deterministic contract check。\n- multi-turn judge。\n\n**数据/Eval**\n\n- 30 core turns。\n- 12 multi-turn episodes。\n- 人工 gold calibration。\n- 自动 hard checks。\n- Guided vs free-chat first-send/3-turn 比较。\n- pressure micro-rating。\n- latency/fallback guardrail。\n\n**代表 bad case**\n\n1. 当前 user 被重复发送。\n2. 首轮规则因 history length 失效。\n3. Nana 变成流程说明书。\n4. Kimura 编造店铺事实。\n5. 场景第一轮就结束。\n6. TTS 阻塞回复。\n7. 用户保存表达但从未复用。\n\n**迭代**\n\n先修 production parity，再做针对场景/角色的最小规则；如果是产品入口问题，不继续堆 Prompt；如果是 provider 差异，单独记录模型结果。\n\n**结果**\n\n当前尚无真实结果，不能提前编写。建议成功门槛：\n\n- payload contract 100% 通过；\n- 无新增 R0；\n- Guided first-send 相对自由入口有方向性提升；\n- 3-turn session rate 提升；\n- teacher/advisor tone 不恶化；\n- P95 文本可见延迟下降；\n- 至少出现可观察的 saved-item reuse。\n\n**局限**\n\n小样本、单语言、无账户、模型依赖、用户可能有新鲜感效应，不能泛化为长期学习成效。\n\n## 为什么它能被追问 20 分钟\n\n可以深入讨论：\n\n- 为什么不主动纠错；\n- 为什么先修生产链而非继续调 Prompt；\n- 如何校准 LLM Judge；\n- 如何区分 Prompt/模型/产品/工程问题；\n- 为什么 3-turn rate 比消息总量更重要；\n- 怎样在不采聊天内容时验证闭环；\n- 如何处理 provider 成本、延迟和失败；\n- 为什么不做 RAG、课程或游戏化；\n- small-N 实验的局限；\n- 一次真实 bad case 如何变成 regression。\n\n这会比“做了一个 AI 日语聊天网站”有说服力得多。"
    },
    {
      "number": 12,
      "title": "Next Codex Tasks",
      "heading": "# 12. Next Codex Tasks",
      "markdown": "# 12. Next Codex Tasks\n\n暂不执行，按优先级排序。\n\n## Task 1：修复并验证主聊天消息契约\n\n- **目标**：消除当前 user 重复，恢复 Guided 首轮判断。\n- **读取文件**：`app/chat/[npcId]/page.tsx`、`app/api/chat/route.ts`、`scripts/sample-guided-response-traces.local.mjs`、`docs/system-map.md`。\n- **权限**：允许修改。\n- **风险**：高，影响全部聊天。\n- **验收**：最终 messages 只含一次当前 user；free/guided/revisit 三条 payload snapshot 通过。\n\n## Task 2：设计并实现 API 服务端边界\n\n- **目标**：保护 12 个付费/敏感 API。\n- **读取文件**：`app/alpha-access-gate.tsx`、`app/layout.tsx`、全部 `app/api/**/route.ts`、`.env.example`。\n- **权限**：先审计方案，批准后修改。\n- **风险**：高，可能导致线上无法访问。\n- **验收**：signed session、统一 guard、输入上限、role allowlist、部署说明；不暴露 access code。\n\n## Task 3：建立 tracked production-parity Eval Harness\n\n- **目标**：让浏览器、sampler 和 route 使用相同 payload contract。\n- **读取文件**：ChatPage、Chat API、`lib/conversation-scenes.ts`、`docs/eval/*`、当前 local sampler。\n- **权限**：允许修改；默认不得调用真实 API。\n- **风险**：中。\n- **验收**：dry-run 可生成 30 core payload；版本字段完整；targeted regression 可自动失败。\n\n## Task 4：设计 Guided Episode v1\n\n- **目标**：让场景在 3–5 轮内推进并自然收束。\n- **读取文件**：`lib/conversation-scenes.ts`、ChatPage、Chat API、topic-ideas、pre-send、Guided Eval docs。\n- **权限**：先审计/设计，确认后修改。\n- **风险**：高，容易任务化。\n- **验收**：明确 scene/turn/phase/end schema；无评分/通关 UI；12 个 episode cases 通过。\n\n## Task 5：最小行为事件与隐私方案\n\n- **目标**：验证 first-send、3-turn、工具使用和回访。\n- **读取文件**：layout、home、ChatPage、ChatBubble、SavedItems、SessionSummary、README。\n- **权限**：先审计事件 schema，再允许修改。\n- **风险**：中，隐私与数据噪声。\n- **验收**：不采原文/音频；事件字典、触发点、去重、匿名标识与删除策略清楚。\n\n## Task 6：音频可靠性专项\n\n- **目标**：让文本不等语音，修复录音 race、格式与 timeout。\n- **读取文件**：ChatPage、ChatBubble、TTS/STT routes、`lib/volcengine.ts`、`lib/edge-tts.ts`、voice profiles、TTS normalization。\n- **权限**：允许修改。\n- **风险**：高，跨浏览器。\n- **验收**：文本先显示；录音取消安全；Chrome/Safari 格式矩阵；无无限等待；专有词大小写保留。\n\n## Task 7：Storage v2 与隐私清理审计\n\n- **目标**：统一本地数据版本、reset 和 delete-all。\n- **读取文件**：`lib/memory.ts`、`lib/saved-items.ts`、`lib/session-summary.ts`、expression cache、所有 panel。\n- **权限**：先只审计迁移设计，批准后修改。\n- **风险**：高，可能损坏用户旧数据。\n- **验收**：key registry、schema parser、迁移/rollback、export/delete all、reset count 修复。\n\n## Task 8：浏览器真机 UX/Accessibility 审计\n\n- **目标**：验证静态审计无法确认的视觉与交互问题。\n- **读取文件**：首页、ChatPage、所有 drawer/modal、globals.css、manifest。\n- **权限**：只审计；浏览器测试需单独授权。\n- **风险**：低。\n- **验收**：移动/桌面截图证据、首次/Guided/查词/语音任务、键盘焦点、点击区、字号与对比度问题清单。\n\n---\n\n审计执行记录：\n\n- **文件修改**：无。\n- **`docs/system-map.md`**：未更新，因为本次是严格只读审计，没有结构性代码变更。\n- **只读检查**：`pwd`、仓库根目录、分支、status、log、diff、blame、tracked/ignored 文件、目录/文件搜索、UTF-8 源码与文档读取。\n- **未执行**：build、lint、npm install、真实 LLM/TTS/STT 请求、浏览器启动、音频试听。\n- **静态审计限制**：视觉层级、真实声线、发音自然度、真机录音兼容性、线上访问配置、真实留存和学习效果仍需运行验证。\n- **Rollback**：无变更，无需回滚。"
    }
  ],
  "findings": [
    {
      "id": "F1",
      "number": 1,
      "title": "付费 AI/语音 API 没有真正的服务端访问边界",
      "domain": "Engineering / Security",
      "severity": "Critical",
      "confidence": "高置信推断",
      "status": "待确认",
      "finding": "Alpha code 使用 `NEXT_PUBLIC_ALPHA_ACCESS_CODE`，在客户端比较并写 LocalStorage，code 会进入浏览器 bundle。[Alpha gate](</D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12>) 扫描 12 个 API route 未发现统一 auth、签名 session、rate limit 或 quota。",
      "evidence": "Alpha code 使用 `NEXT_PUBLIC_ALPHA_ACCESS_CODE`，在客户端比较并写 LocalStorage，code 会进入浏览器 bundle。[Alpha gate](</D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12>) 扫描 12 个 API route 未发现统一 auth、签名 session、rate limit 或 quota。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12",
        "/api/chat"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12",
        "/api/chat"
      ],
      "affectedUsers": "部署者、成本与用户隐私",
      "userImpact": "若线上配置了 provider 凭证，调用者可绕过首页直接请求 `/api/chat`、TTS、STT、feedback 等。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "把 UI gate 当成了 API gate。",
      "recommendation": "改为服务端 secret 验证并签发 httpOnly signed session；所有付费 API 校验 session，配置平台级速率限制、provider 配额和输入上限。",
      "implementationCost": "M",
      "regressionRisk": "访问/部署回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F1. 付费 AI/语音 API 没有真正的服务端访问边界\n\n- **发现与证据**：Alpha code 使用 `NEXT_PUBLIC_ALPHA_ACCESS_CODE`，在客户端比较并写 LocalStorage，code 会进入浏览器 bundle。[Alpha gate](</D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12>) 扫描 12 个 API route 未发现统一 auth、签名 session、rate limit 或 quota。\n- **严重度·对象·后果**：**Critical**；部署者、成本与用户隐私。若线上配置了 provider 凭证，调用者可绕过首页直接请求 `/api/chat`、TTS、STT、feedback 等。\n- **根因与建议**：把 UI gate 当成了 API gate。改为服务端 secret 验证并签发 httpOnly signed session；所有付费 API 校验 session，配置平台级速率限制、provider 配额和输入上限。\n- **成本·回归风险·置信度**：M；访问/部署回归高；**高置信推断**，待确认线上是否公开且已配置 provider。"
    },
    {
      "id": "F2",
      "number": 2,
      "title": "真实聊天会把当前用户消息发送给模型两次",
      "domain": "AI / Prompt",
      "severity": "Critical",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "前端先把当前消息 push 到 `historyForApi`，[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983>)；API 又在 history 后追加同一 `text`。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>)",
      "evidence": "前端先把当前消息 push 到 `historyForApi`，[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983>)；API 又在 history 后追加同一 `text`。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765"
      ],
      "affectedUsers": "所有聊天用户、Prompt/Eval",
      "userImpact": "模型看到重复输入，可能复述、过度回应、权重异常，并增加 token。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "当前消息归属没有单一契约。",
      "recommendation": "规定 history 永远不包含本轮 user，或 API 不再追加；增加 deterministic payload test，断言最终用户消息只出现一次。",
      "implementationCost": "S",
      "regressionRisk": "聊天历史回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F2. 真实聊天会把当前用户消息发送给模型两次\n\n- **发现与证据**：前端先把当前消息 push 到 `historyForApi`，[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983>)；API 又在 history 后追加同一 `text`。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>)\n- **严重度·对象·后果**：**Critical**；所有聊天用户、Prompt/Eval。模型看到重复输入，可能复述、过度回应、权重异常，并增加 token。\n- **根因与建议**：当前消息归属没有单一契约。规定 history 永远不包含本轮 user，或 API 不再追加；增加 deterministic payload test，断言最终用户消息只出现一次。\n- **成本·回归风险·置信度**：S；聊天历史回归高；**已验证事实**。"
    },
    {
      "id": "F3",
      "number": 3,
      "title": "Guided 首轮规则在生产路径下无法按 Eval 条件触发",
      "domain": "Guided Scenarios",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "API 用 `history.length <= 1` 判断首轮，[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650>)；浏览器首轮 history 至少包含 scene opening + 当前 user，因此长度为 2。采样器只放 opening，再把 user 单独作为 text。",
      "evidence": "API 用 `history.length <= 1` 判断首轮，[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650>)；浏览器首轮 history 至少包含 scene opening + 当前 user，因此长度为 2。采样器只放 opening，再把 user 单独作为 text。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650"
      ],
      "affectedUsers": "Guided 用户、Prompt 质量",
      "userImpact": "专门防止过早收场的首轮规则在真实路径失效。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "Eval 只验证 sampler→route，没有验证 browser→route。",
      "recommendation": "修 F2 后，把真实 payload assembly 抽成可复用函数，评测和前端共同使用。",
      "implementationCost": "S",
      "regressionRisk": "Guided 回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F3. Guided 首轮规则在生产路径下无法按 Eval 条件触发\n\n- **发现与证据**：API 用 `history.length <= 1` 判断首轮，[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650>)；浏览器首轮 history 至少包含 scene opening + 当前 user，因此长度为 2。采样器只放 opening，再把 user 单独作为 text。\n- **严重度·对象·后果**：**High**；Guided 用户、Prompt 质量。专门防止过早收场的首轮规则在真实路径失效。\n- **根因与建议**：Eval 只验证 sampler→route，没有验证 browser→route。修 F2 后，把真实 payload assembly 抽成可复用函数，评测和前端共同使用。\n- **成本·回归风险·置信度**：S；Guided 回归高；**已验证事实**。"
    },
    {
      "id": "F4",
      "number": 4,
      "title": "“73 场景 beta 可接受”没有覆盖真实 3–5 轮体验",
      "domain": "Eval / Guided",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "v10 的评测单位明确只有 `npcOpening → sampleUserLineJa → npcResponse1`，[Retrospective](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22>)，却把目标表述为 3–5 轮。39/73 为 R3，仍有 16 个 `too_closed`、6 个弱 hook。[结果](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155>)",
      "evidence": "v10 的评测单位明确只有 `npcOpening → sampleUserLineJa → npcResponse1`，[Retrospective](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22>)，却把目标表述为 3–5 轮。39/73 为 R3，仍有 16 个 `too_closed`、6 个弱 hook。[结果](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22",
        "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22",
        "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155"
      ],
      "affectedUsers": "产品判断、roadmap、作品集可信度",
      "userImpact": "首轮高分不能证明用户会发第二、三句或自然结束。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "把易采样的 turn quality 代替了 episode outcome。",
      "recommendation": "保留 73 首轮集，但增加 12–20 条生产一致的 3–5 轮 episode eval、场景漂移和收束指标。",
      "implementationCost": "M",
      "regressionRisk": "Eval 规则回归中",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F4. “73 场景 beta 可接受”没有覆盖真实 3–5 轮体验\n\n- **发现与证据**：v10 的评测单位明确只有 `npcOpening → sampleUserLineJa → npcResponse1`，[Retrospective](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22>)，却把目标表述为 3–5 轮。39/73 为 R3，仍有 16 个 `too_closed`、6 个弱 hook。[结果](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155>)\n- **严重度·对象·后果**：**High**；产品判断、roadmap、作品集可信度。首轮高分不能证明用户会发第二、三句或自然结束。\n- **根因与建议**：把易采样的 turn quality 代替了 episode outcome。保留 73 首轮集，但增加 12–20 条生产一致的 3–5 轮 episode eval、场景漂移和收束指标。\n- **成本·回归风险·置信度**：M；Eval 规则回归中；**已验证事实**。"
    },
    {
      "id": "F5",
      "number": 5,
      "title": "Guided Scenario 是丰富配置，不是完整 episode system",
      "domain": "Product / Guided",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "配置含 `userGoal / possibleBeats / usefulIntents / softLanding`，[scene schema](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17>)；主 chat prompt 只使用 title、setup、intent、moment、avoid，[buildScenePrompt](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504>)。active scene 不持久、无 turn count、进度、完成或自动 soft landing，只能手动退出。",
      "evidence": "配置含 `userGoal / possibleBeats / usefulIntents / softLanding`，[scene schema](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17>)；主 chat prompt 只使用 title、setup、intent、moment、avoid，[buildScenePrompt](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504>)。active scene 不持久、无 turn count、进度、完成或自动 soft landing，只能手动退出。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504",
        "userGoal / possibleBeats / usefulIntents / softLanding"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504",
        "userGoal / possibleBeats / usefulIntents / softLanding"
      ],
      "affectedUsers": "快速场景练习用户",
      "userImpact": "场景开始后仍像普通聊天，无法保证 3–5 轮有意义输出。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "内容 schema 领先于运行状态。",
      "recommendation": "新增极轻量 episode state：sceneId、startedAt、userTurnCount、phase、endedReason；不做任务 UI，只用于 Prompt、自然收束和数据。",
      "implementationCost": "M/L",
      "regressionRisk": "对话自然度回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F5. Guided Scenario 是丰富配置，不是完整 episode system\n\n- **发现与证据**：配置含 `userGoal / possibleBeats / usefulIntents / softLanding`，[scene schema](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17>)；主 chat prompt 只使用 title、setup、intent、moment、avoid，[buildScenePrompt](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504>)。active scene 不持久、无 turn count、进度、完成或自动 soft landing，只能手动退出。\n- **严重度·对象·后果**：**High**；快速场景练习用户。场景开始后仍像普通聊天，无法保证 3–5 轮有意义输出。\n- **根因与建议**：内容 schema 领先于运行状态。新增极轻量 episode state：sceneId、startedAt、userTurnCount、phase、endedReason；不做任务 UI，只用于 Prompt、自然收束和数据。\n- **成本·回归风险·置信度**：M/L；对话自然度回归高；**已验证事实**。"
    },
    {
      "id": "F6",
      "number": 6,
      "title": "产品无法回答最核心的行为问题",
      "domain": "Data",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "仅挂载 `<Analytics />`，没有 `track()` 或 feature event。[Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:39>) 体验日志记录了少量 external beta feedback，但没有参与人数、session、漏斗或变化前后数据。[Experience Log](</D:/LucasRan/AI/kotomachi/docs/experience-log.md:86>)",
      "evidence": "仅挂载 `<Analytics />`，没有 `track()` 或 feature event。[Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:39>) 体验日志记录了少量 external beta feedback，但没有参与人数、session、漏斗或变化前后数据。[Experience Log](</D:/LucasRan/AI/kotomachi/docs/experience-log.md:86>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/layout.tsx:39",
        "/D:/LucasRan/AI/kotomachi/docs/experience-log.md:86",
        "<Analytics />"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/layout.tsx:39",
        "/D:/LucasRan/AI/kotomachi/docs/experience-log.md:86",
        "<Analytics />"
      ],
      "affectedUsers": "产品负责人、实验与 roadmap",
      "userImpact": "无法判断第一句发送率、3 轮率、Guided 增益、工具使用、回访和学习资产复用。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "功能开发快于验证。",
      "recommendation": "先采 10–12 个无内容事件，并做 5–10 人任务观察；禁止采原始消息和音频。",
      "implementationCost": "M",
      "regressionRisk": "隐私风险中",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F6. 产品无法回答最核心的行为问题\n\n- **发现与证据**：仅挂载 `<Analytics />`，没有 `track()` 或 feature event。[Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:39>) 体验日志记录了少量 external beta feedback，但没有参与人数、session、漏斗或变化前后数据。[Experience Log](</D:/LucasRan/AI/kotomachi/docs/experience-log.md:86>)\n- **严重度·对象·后果**：**High**；产品负责人、实验与 roadmap。无法判断第一句发送率、3 轮率、Guided 增益、工具使用、回访和学习资产复用。\n- **根因与建议**：功能开发快于验证。先采 10–12 个无内容事件，并做 5–10 人任务观察；禁止采原始消息和音频。\n- **成本·回归风险·置信度**：M；隐私风险中；**已验证事实**。"
    },
    {
      "id": "F7",
      "number": 7,
      "title": "每条 NPC 回复都自动生成 TTS，并阻塞文本出现",
      "domain": "Audio / UX",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "`useVoice = true`，等待 `fetchTtsUrl` 后才构建并显示 assistant message。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033>) 输入框在整个期间 disabled。[输入框](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437>) TTS 响应明确 `no-cache`。[TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118>)",
      "evidence": "`useVoice = true`，等待 `fetchTtsUrl` 后才构建并显示 assistant message。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033>) 输入框在整个期间 disabled。[输入框](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437>) TTS 响应明确 `no-cache`。[TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437",
        "/D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437",
        "/D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118"
      ],
      "affectedUsers": "所有用户、延迟与费用",
      "userImpact": "即使用户不播放语音也会付费并等待；TTS 故障拖慢文本聊天。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "把语音资产生成当作回复完成条件。",
      "recommendation": "先显示文本并解锁输入；TTS 改为按需或后台预取，失败不能影响聊天。",
      "implementationCost": "M",
      "regressionRisk": "音频状态回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F7. 每条 NPC 回复都自动生成 TTS，并阻塞文本出现\n\n- **发现与证据**：`useVoice = true`，等待 `fetchTtsUrl` 后才构建并显示 assistant message。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033>) 输入框在整个期间 disabled。[输入框](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437>) TTS 响应明确 `no-cache`。[TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118>)\n- **严重度·对象·后果**：**High**；所有用户、延迟与费用。即使用户不播放语音也会付费并等待；TTS 故障拖慢文本聊天。\n- **根因与建议**：把语音资产生成当作回复完成条件。先显示文本并解锁输入；TTS 改为按需或后台预取，失败不能影响聊天。\n- **成本·回归风险·置信度**：M；音频状态回归高；**已验证事实**。"
    },
    {
      "id": "F8",
      "number": 8,
      "title": "音频当前最关键的问题是可靠性与交互，不是继续挑声线",
      "domain": "Audio / UX",
      "severity": "High",
      "confidence": "高置信推断",
      "status": "高置信推断",
      "finding": "Volc TTS、STT 和 Edge stream 无 AbortSignal/timeout；录音 permission await 存在“用户已松手但 recorder 后启动”的 race；mp4 被标成 mp3、webm 被标成 ogg 但没有转码。[录音](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213>)、[格式映射](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249>)。STT 还会把所有拉丁词小写化。[后处理](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265>)",
      "evidence": "Volc TTS、STT 和 Edge stream 无 AbortSignal/timeout；录音 permission await 存在“用户已松手但 recorder 后启动”的 race；mp4 被标成 mp3、webm 被标成 ogg 但没有转码。[录音](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213>)、[格式映射](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249>)。STT 还会把所有拉丁词小写化。[后处理](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213",
        "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249",
        "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213",
        "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249",
        "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265"
      ],
      "affectedUsers": "移动端和混合语言用户",
      "userImpact": "首次录音、Safari mp4、JLPT/AI/ChatGPT 等专有词可能失败或失真。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "浏览器容器格式、provider codec 和 UI gesture 生命周期没有统一契约。",
      "recommendation": "先加 timeout、permission cancellation、最长录音、真实容器支持/转码策略，移除破坏性 lowercase。",
      "implementationCost": "M",
      "regressionRisk": "跨浏览器回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F8. 音频当前最关键的问题是可靠性与交互，不是继续挑声线\n\n- **发现与证据**：Volc TTS、STT 和 Edge stream 无 AbortSignal/timeout；录音 permission await 存在“用户已松手但 recorder 后启动”的 race；mp4 被标成 mp3、webm 被标成 ogg 但没有转码。[录音](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213>)、[格式映射](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249>)。STT 还会把所有拉丁词小写化。[后处理](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265>)\n- **严重度·对象·后果**：**High**；移动端和混合语言用户。首次录音、Safari mp4、JLPT/AI/ChatGPT 等专有词可能失败或失真。\n- **根因与建议**：浏览器容器格式、provider codec 和 UI gesture 生命周期没有统一契约。先加 timeout、permission cancellation、最长录音、真实容器支持/转码策略，移除破坏性 lowercase。\n- **成本·回归风险·置信度**：M；跨浏览器回归高；格式失败为**高置信推断**，需真机验证。"
    },
    {
      "id": "F9",
      "number": 9,
      "title": "首页内容丰富，但首屏没有清楚说“这是什么、我该做什么”",
      "domain": "Product / UX",
      "severity": "High",
      "confidence": "高置信推断",
      "status": "高置信推断",
      "finding": "Hero 只有品牌、时间与氛围，[首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:46>)；随后是 9 NPC、featured scene、9 个自由话题，Continue 最后出现且最多只显示 1 个。[Continue](</D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42>)",
      "evidence": "Hero 只有品牌、时间与氛围，[首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:46>)；随后是 9 NPC、featured scene、9 个自由话题，Continue 最后出现且最多只显示 1 个。[Continue](</D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/page.tsx:46",
        "/D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/page.tsx:46",
        "/D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42"
      ],
      "affectedUsers": "首次用户和回访用户",
      "userImpact": "新用户面对多个相似入口，回访用户的主任务反而被埋底。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "首页同时承担世界观、NPC 展示、场景推荐、话题推荐和恢复会话。",
      "recommendation": "首屏补一句明确价值；有历史时把 Continue 提到 Scene 前；默认只显示一个主要场景和少量 NPC。",
      "implementationCost": "S/M",
      "regressionRisk": "视觉层级回归中",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F9. 首页内容丰富，但首屏没有清楚说“这是什么、我该做什么”\n\n- **发现与证据**：Hero 只有品牌、时间与氛围，[首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:46>)；随后是 9 NPC、featured scene、9 个自由话题，Continue 最后出现且最多只显示 1 个。[Continue](</D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42>)\n- **严重度·对象·后果**：**High**；首次用户和回访用户。新用户面对多个相似入口，回访用户的主任务反而被埋底。\n- **根因与建议**：首页同时承担世界观、NPC 展示、场景推荐、话题推荐和恢复会话。首屏补一句明确价值；有历史时把 Continue 提到 Scene 前；默认只显示一个主要场景和少量 NPC。\n- **成本·回归风险·置信度**：S/M；视觉层级回归中；**高置信推断**，未做截图/可用性测试。"
    },
    {
      "id": "F10",
      "number": 10,
      "title": "学习工具形成了资产库，但没有形成“资产重新进入输出”的闭环",
      "domain": "Learning / Product",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "收藏支持 review/mastered/notes，回顾卡也有 `nextTalkPrompt`；但主聊天 payload 只注入 memories，不注入 saved words/expressions/review history。[send payload](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028>) 没有检测收藏词是否重新出现在用户输出。",
      "evidence": "收藏支持 review/mastered/notes，回顾卡也有 `nextTalkPrompt`；但主聊天 payload 只注入 memories，不注入 saved words/expressions/review history。[send payload](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028>) 没有检测收藏词是否重新出现在用户输出。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028"
      ],
      "affectedUsers": "学习工具用户与留存",
      "userImpact": "收藏、复习和聊天成为并行系统，无法证明学习资产提升了表达。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "闭环停在“保存/看过”。",
      "recommendation": "先做一个小实验：从最近收藏中生成可编辑的下一次开场，或在本地检测后续输出是否复用了某个资产，只上报 boolean。",
      "implementationCost": "M",
      "regressionRisk": "可能增加学习压力，回归中",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F10. 学习工具形成了资产库，但没有形成“资产重新进入输出”的闭环\n\n- **发现与证据**：收藏支持 review/mastered/notes，回顾卡也有 `nextTalkPrompt`；但主聊天 payload 只注入 memories，不注入 saved words/expressions/review history。[send payload](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028>) 没有检测收藏词是否重新出现在用户输出。\n- **严重度·对象·后果**：**High**；学习工具用户与留存。收藏、复习和聊天成为并行系统，无法证明学习资产提升了表达。\n- **根因与建议**：闭环停在“保存/看过”。先做一个小实验：从最近收藏中生成可编辑的下一次开场，或在本地检测后续输出是否复用了某个资产，只上报 boolean。\n- **成本·回归风险·置信度**：M；可能增加学习压力，回归中；**已验证事实**。"
    },
    {
      "id": "F11",
      "number": 11,
      "title": "`/api/chat` 信任客户端提供的角色、上下文和长度",
      "domain": "Engineering / Security",
      "severity": "High",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "request 直接接受 `ChatCompletionMessageParam[]`、memories、lifeArc、worldDescription 等，[类型](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21>)；随后原样插入 messages。[组装](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>) text、history 内容和总长度没有上限，history 也可包含 system/tool role。",
      "evidence": "request 直接接受 `ChatCompletionMessageParam[]`、memories、lifeArc、worldDescription 等，[类型](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21>)；随后原样插入 messages。[组装](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>) text、history 内容和总长度没有上限，history 也可包含 system/tool role。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765",
        "/api/chat"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765",
        "/api/chat"
      ],
      "affectedUsers": "Prompt 安全、费用与稳定性",
      "userImpact": "调用者能插入额外 system message、构造巨型上下文或伪造世界/记忆。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "服务端类型断言代替运行时校验。",
      "recommendation": "只接受 user/assistant、截断每条和总条数；npc/scene 必须验证匹配；日期、世界和 familiarity 在服务端计算。",
      "implementationCost": "M",
      "regressionRisk": "旧 payload 回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F11. `/api/chat` 信任客户端提供的角色、上下文和长度\n\n- **发现与证据**：request 直接接受 `ChatCompletionMessageParam[]`、memories、lifeArc、worldDescription 等，[类型](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21>)；随后原样插入 messages。[组装](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>) text、history 内容和总长度没有上限，history 也可包含 system/tool role。\n- **严重度·对象·后果**：**High**；Prompt 安全、费用与稳定性。调用者能插入额外 system message、构造巨型上下文或伪造世界/记忆。\n- **根因与建议**：服务端类型断言代替运行时校验。只接受 user/assistant、截断每条和总条数；npc/scene 必须验证匹配；日期、世界和 familiarity 在服务端计算。\n- **成本·回归风险·置信度**：M；旧 payload 回归高；**已验证事实**。"
    },
    {
      "id": "F12",
      "number": 12,
      "title": "LocalStorage 是合理 MVP 选择，但当前 schema 与清理边界已开始失控",
      "domain": "Engineering / Data",
      "severity": "Medium",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "history 只检查 array，不校验元素；Saved Items key 带 v1 但 load 同样只检查 array。[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96>) “重新开始”清 history/facts/time，但不清 `kotomachi_count_*`，[reset helper](</D:/LucasRan/AI/kotomachi/lib/memory.ts:493>)，导致新欢迎仍可能带熟悉度。",
      "evidence": "history 只检查 array，不校验元素；Saved Items key 带 v1 但 load 同样只检查 array。[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96>) “重新开始”清 history/facts/time，但不清 `kotomachi_count_*`，[reset helper](</D:/LucasRan/AI/kotomachi/lib/memory.ts:493>)，导致新欢迎仍可能带熟悉度。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96",
        "/D:/LucasRan/AI/kotomachi/lib/memory.ts:493"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96",
        "/D:/LucasRan/AI/kotomachi/lib/memory.ts:493"
      ],
      "affectedUsers": "回访用户、数据迁移、隐私",
      "userImpact": "损坏旧数据可污染 UI；“重新开始”语义不一致；用户没有一键导出/删除全部本地数据。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "每项功能自行增加 key。",
      "recommendation": "先建小型 storage registry、runtime parser 和迁移入口；明确 reset chat、delete memory、delete all 三种语义。",
      "implementationCost": "M",
      "regressionRisk": "历史数据回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F12. LocalStorage 是合理 MVP 选择，但当前 schema 与清理边界已开始失控\n\n- **发现与证据**：history 只检查 array，不校验元素；Saved Items key 带 v1 但 load 同样只检查 array。[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96>) “重新开始”清 history/facts/time，但不清 `kotomachi_count_*`，[reset helper](</D:/LucasRan/AI/kotomachi/lib/memory.ts:493>)，导致新欢迎仍可能带熟悉度。\n- **严重度·对象·后果**：**Medium/High**；回访用户、数据迁移、隐私。损坏旧数据可污染 UI；“重新开始”语义不一致；用户没有一键导出/删除全部本地数据。\n- **根因与建议**：每项功能自行增加 key。先建小型 storage registry、runtime parser 和迁移入口；明确 reset chat、delete memory、delete all 三种语义。\n- **成本·回归风险·置信度**：M；历史数据回归高；**已验证事实**。"
    },
    {
      "id": "F13",
      "number": 13,
      "title": "集成点和 Prompt 已达到高改动扩散风险",
      "domain": "Engineering / AI",
      "severity": "Medium",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "ChatPage 2618 行、SavedItemsPanel 2181 行、ChatBubble 1544 行、conversation-scenes 3254 行。ChatPage 有 40+ state/ref；persona 又在 chat 与 welcome 重复维护。Aoi 在 `buildSystemPrompt` 有一套 Prompt，[Aoi branch](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224>)，运行时又由另一套专用 Prompt 覆盖。[runtime Aoi](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688>)",
      "evidence": "ChatPage 2618 行、SavedItemsPanel 2181 行、ChatBubble 1544 行、conversation-scenes 3254 行。ChatPage 有 40+ state/ref；persona 又在 chat 与 welcome 重复维护。Aoi 在 `buildSystemPrompt` 有一套 Prompt，[Aoi branch](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224>)，运行时又由另一套专用 Prompt 覆盖。[runtime Aoi](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224",
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688"
      ],
      "affectedUsers": "后续维护者、Prompt Lead",
      "userImpact": "改一处可能没有生效，状态变更容易影响音频、场景、回顾、记忆和欢迎。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "功能连续叠加在原集成组件。",
      "recommendation": "不要重写；先抽 `buildChatPayload`、`useChatSession`、`useVoiceInput`、Prompt registry 和 scene session reducer。",
      "implementationCost": "L，分步实施",
      "regressionRisk": "回归高",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F13. 集成点和 Prompt 已达到高改动扩散风险\n\n- **发现与证据**：ChatPage 2618 行、SavedItemsPanel 2181 行、ChatBubble 1544 行、conversation-scenes 3254 行。ChatPage 有 40+ state/ref；persona 又在 chat 与 welcome 重复维护。Aoi 在 `buildSystemPrompt` 有一套 Prompt，[Aoi branch](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224>)，运行时又由另一套专用 Prompt 覆盖。[runtime Aoi](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688>)\n- **严重度·对象·后果**：**Medium/High**；后续维护者、Prompt Lead。改一处可能没有生效，状态变更容易影响音频、场景、回顾、记忆和欢迎。\n- **根因与建议**：功能连续叠加在原集成组件。不要重写；先抽 `buildChatPayload`、`useChatSession`、`useVoiceInput`、Prompt registry 和 scene session reducer。\n- **成本·回归风险·置信度**：L，分步实施；回归高；**已验证事实**。"
    },
    {
      "id": "F14",
      "number": 14,
      "title": "输出与失败路径没有保护核心产品契约",
      "domain": "AI / Engineering",
      "severity": "Medium",
      "confidence": "已验证事实",
      "status": "已验证事实",
      "finding": "主聊天只取 `aiText` 并返回，无 Japanese ratio、长度、emoji、teacher-tone 或空字符串校验。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818>) 前端清理会删除所有括号/方括号内容，而非只识别动作描写。[sanitize](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157>) 失败 fallback 带 emoji，且失败 turn 不保存。[错误路径](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051>)",
      "evidence": "主聊天只取 `aiText` 并返回，无 Japanese ratio、长度、emoji、teacher-tone 或空字符串校验。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818>) 前端清理会删除所有括号/方括号内容，而非只识别动作描写。[sanitize](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157>) 失败 fallback 带 emoji，且失败 turn 不保存。[错误路径](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051>)",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051"
      ],
      "affectedUsers": "异常输入和 provider 故障用户",
      "userImpact": "可出现空回复、非日语回复、合法括号内容丢失、刷新后失败 turn 消失。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "核心契约只写在 Prompt，没有 deterministic guard。",
      "recommendation": "增加轻量 post-check 与不破坏原文的 fallback；失败消息和重试操作要明确，不伪装成正常 NPC 回复。",
      "implementationCost": "S/M",
      "regressionRisk": "日语文本误判风险中",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F14. 输出与失败路径没有保护核心产品契约\n\n- **发现与证据**：主聊天只取 `aiText` 并返回，无 Japanese ratio、长度、emoji、teacher-tone 或空字符串校验。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818>) 前端清理会删除所有括号/方括号内容，而非只识别动作描写。[sanitize](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157>) 失败 fallback 带 emoji，且失败 turn 不保存。[错误路径](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051>)\n- **严重度·对象·后果**：**Medium/High**；异常输入和 provider 故障用户。可出现空回复、非日语回复、合法括号内容丢失、刷新后失败 turn 消失。\n- **根因与建议**：核心契约只写在 Prompt，没有 deterministic guard。增加轻量 post-check 与不破坏原文的 fallback；失败消息和重试操作要明确，不伪装成正常 NPC 回复。\n- **成本·回归风险·置信度**：S/M；日语文本误判风险中；**已验证事实**。"
    },
    {
      "id": "F15",
      "number": 15,
      "title": "移动可用性、文档证据和作品集呈现仍不够专业",
      "domain": "UX / Mobile / Portfolio",
      "severity": "Medium",
      "confidence": "待确认",
      "status": "待确认",
      "finding": "根 `<html lang=\"ja\">`，但 UI 默认中文；大量 8–10px 文本、36×36 主控件，[输入控件](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210>)；多个 overlay 缺 `role=\"dialog\"`、focus trap 和 Escape，例如 Saved Items。[overlay](</D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785>) 英文 UI 的 active scene 仍显示中文 `title/setup`。[scene card](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062>) README 没有 demo 图片。",
      "evidence": "根 `<html lang=\"ja\">`，但 UI 默认中文；大量 8–10px 文本、36×36 主控件，[输入控件](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210>)；多个 overlay 缺 `role=\"dialog\"`、focus trap 和 Escape，例如 Saved Items。[overlay](</D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785>) 英文 UI 的 active scene 仍显示中文 `title/setup`。[scene card](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062>) README 没有 demo 图片。",
      "filePaths": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210",
        "/D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062",
        "title/setup"
      ],
      "codeReferences": [
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210",
        "/D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785",
        "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062",
        "title/setup"
      ],
      "affectedUsers": "移动端、键盘/辅助技术用户、招聘方",
      "userImpact": "产品显得功能多但完成度不稳定。",
      "engineeringImpact": "原报告未将工程影响拆成独立字段；请查看“严重度·对象·后果”和完整原文。",
      "rootCause": "组件局部 polish 多，端到端 accessibility 和 portfolio evidence 少。",
      "recommendation": "做一次真机/桌面任务截图审计，统一对话框语义、字号、点击区、语言与 README 证据。",
      "implementationCost": "M",
      "regressionRisk": "视觉回归中",
      "dependencies": "原报告未在 Finding 中单列；相关风险与依赖见 Roadmap。",
      "timeHorizon": "原报告未把单个 Finding 与时间范围一一映射。",
      "relatedFindings": [],
      "originalText": "## F15. 移动可用性、文档证据和作品集呈现仍不够专业\n\n- **发现与证据**：根 `<html lang=\"ja\">`，但 UI 默认中文；大量 8–10px 文本、36×36 主控件，[输入控件](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210>)；多个 overlay 缺 `role=\"dialog\"`、focus trap 和 Escape，例如 Saved Items。[overlay](</D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785>) 英文 UI 的 active scene 仍显示中文 `title/setup`。[scene card](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062>) README 没有 demo 图片。\n- **严重度·对象·后果**：**Medium**；移动端、键盘/辅助技术用户、招聘方。产品显得功能多但完成度不稳定。\n- **根因与建议**：组件局部 polish 多，端到端 accessibility 和 portfolio evidence 少。做一次真机/桌面任务截图审计，统一对话框语义、字号、点击区、语言与 README 证据。\n- **成本·回归风险·置信度**：M；视觉回归中；代码事实已验证，实际可见严重度**待浏览器确认**。"
    }
  ],
  "roadmap": {
    "72 小时": [
      {
        "priority": "P0",
        "item": "修复 production/eval 消息契约",
        "purposeUserValue": "恢复真实对话和 Guided 首轮质量",
        "deliverableSuccess": "当前 user 在 provider messages 中只出现一次；真实首轮 history=1；6 个 deterministic cases",
        "effort": "S",
        "riskDependencies": "对历史组装高风险；先固定 contract",
        "originalRow": "| P0 | 修复 production/eval 消息契约 | 恢复真实对话和 Guided 首轮质量 | 当前 user 在 provider messages 中只出现一次；真实首轮 history=1；6 个 deterministic cases | S | 对历史组装高风险；先固定 contract |"
      },
      {
        "priority": "P0",
        "item": "保护全部付费 API",
        "purposeUserValue": "防滥用、费用和隐私事故",
        "deliverableSuccess": "服务端 signed access、route guard、role/length validation；未授权/超长请求被拒绝",
        "effort": "M",
        "riskDependencies": "部署配置；不需要账户/数据库",
        "originalRow": "| P0 | 保护全部付费 API | 防滥用、费用和隐私事故 | 服务端 signed access、route guard、role/length validation；未授权/超长请求被拒绝 | M | 部署配置；不需要账户/数据库 |"
      },
      {
        "priority": "P0",
        "item": "定义核心事件与版本字段",
        "purposeUserValue": "后续改动可被验证",
        "deliverableSuccess": "事件 schema、prompt/model/scene version、禁止采集字段；至少本地可检查 payload",
        "effort": "S",
        "riskDependencies": "先做设计与最小埋点，不建数据平台",
        "originalRow": "| P0 | 定义核心事件与版本字段 | 后续改动可被验证 | 事件 schema、prompt/model/scene version、禁止采集字段；至少本地可检查 payload | S | 先做设计与最小埋点，不建数据平台 |"
      }
    ],
    "两周": [
      {
        "priority": "P0",
        "item": "生产一致 Eval Harness",
        "purposeUserValue": "让质量结论可信",
        "deliverableSuccess": "tracked dry-run harness；30 core turns + targeted cases；sampler 共用生产 payload builder",
        "effort": "M",
        "riskDependencies": "依赖消息契约",
        "originalRow": "| P0 | 生产一致 Eval Harness | 让质量结论可信 | tracked dry-run harness；30 core turns + targeted cases；sampler 共用生产 payload builder | M | 依赖消息契约 |"
      },
      {
        "priority": "P1",
        "item": "12 个 3–5 轮 Guided Eval",
        "purposeUserValue": "验证场景是否真能持续",
        "deliverableSuccess": "episode trace、progress/closure rubric、2 人校准；不再以首轮代表整段",
        "effort": "M",
        "riskDependencies": "少量真实 API 成本需人工授权",
        "originalRow": "| P1 | 12 个 3–5 轮 Guided Eval | 验证场景是否真能持续 | episode trace、progress/closure rubric、2 人校准；不再以首轮代表整段 | M | 少量真实 API 成本需人工授权 |"
      },
      {
        "priority": "P1",
        "item": "非阻塞音频与录音稳定性",
        "purposeUserValue": "更快看到回复、移动语音可用",
        "deliverableSuccess": "文本先显示；TTS/STT timeout；permission cancel；Safari/Chrome 格式矩阵",
        "effort": "M/L",
        "riskDependencies": "跨浏览器风险",
        "originalRow": "| P1 | 非阻塞音频与录音稳定性 | 更快看到回复、移动语音可用 | 文本先显示；TTS/STT timeout；permission cancel；Safari/Chrome 格式矩阵 | M/L | 跨浏览器风险 |"
      },
      {
        "priority": "P1",
        "item": "首页 activation 收敛",
        "purposeUserValue": "用户立即知道怎么开始",
        "deliverableSuccess": "Hero 一句话；Continue 前置；默认入口减少；5 人任务中都能在 30 秒内找到第一步",
        "effort": "M",
        "riskDependencies": "需要浏览器测试",
        "originalRow": "| P1 | 首页 activation 收敛 | 用户立即知道怎么开始 | Hero 一句话；Continue 前置；默认入口减少；5 人任务中都能在 30 秒内找到第一步 | M | 需要浏览器测试 |"
      },
      {
        "priority": "P1",
        "item": "小样本可用性研究",
        "purposeUserValue": "找到真实退出点",
        "deliverableSuccess": "5–10 名目标用户、任务录像/笔记、首次发送/3 轮/压力评分基线",
        "effort": "M",
        "riskDependencies": "招募和隐私同意",
        "originalRow": "| P1 | 小样本可用性研究 | 找到真实退出点 | 5–10 名目标用户、任务录像/笔记、首次发送/3 轮/压力评分基线 | M | 招募和隐私同意 |"
      }
    ],
    "一个月": [
      {
        "priority": "P0",
        "item": "Guided 3–5 轮 episode v1",
        "purposeUserValue": "让场景成为完整练习而非开场贴纸",
        "deliverableSuccess": "scene/turn/phase/end state、自然 soft landing；Guided 相对 free chat 的 3-turn rate 有方向性提升",
        "effort": "L",
        "riskDependencies": "依赖 Eval 与事件",
        "originalRow": "| P0 | Guided 3–5 轮 episode v1 | 让场景成为完整练习而非开场贴纸 | scene/turn/phase/end state、自然 soft landing；Guided 相对 free chat 的 3-turn rate 有方向性提升 | L | 依赖 Eval 与事件 |"
      },
      {
        "priority": "P1",
        "item": "学习资产复用实验",
        "purposeUserValue": "验证收藏是否提高下一次输出",
        "deliverableSuccess": "最近收藏生成可编辑 starter 或本地 reuse 检测；测 save→reuse",
        "effort": "M",
        "riskDependencies": "避免变成强制复习",
        "originalRow": "| P1 | 学习资产复用实验 | 验证收藏是否提高下一次输出 | 最近收藏生成可编辑 starter 或本地 reuse 检测；测 save→reuse | M | 避免变成强制复习 |"
      },
      {
        "priority": "P1",
        "item": "Storage v2 与隐私控制",
        "purposeUserValue": "防旧数据失效、增强信任",
        "deliverableSuccess": "schema parser/migration、export/delete all、reset 语义修复",
        "effort": "M",
        "riskDependencies": "历史数据迁移",
        "originalRow": "| P1 | Storage v2 与隐私控制 | 防旧数据失效、增强信任 | schema parser/migration、export/delete all、reset 语义修复 | M | 历史数据迁移 |"
      },
      {
        "priority": "P2",
        "item": "真机 Accessibility/移动端 pass",
        "purposeUserValue": "提升实际可用性",
        "deliverableSuccess": "44px targets、dialog/focus/Escape、动态 lang、关键文本字号；移动任务无 blocker",
        "effort": "M",
        "riskDependencies": "需浏览器/真机",
        "originalRow": "| P2 | 真机 Accessibility/移动端 pass | 提升实际可用性 | 44px targets、dialog/focus/Escape、动态 lang、关键文本字号；移动任务无 blocker | M | 需浏览器/真机 |"
      },
      {
        "priority": "P1",
        "item": "作品集 flagship 发布材料",
        "purposeUserValue": "把能力变成可见证据",
        "deliverableSuccess": "90 秒 demo、架构图、Eval before/after、真实行为结果、bad-case 复盘和局限",
        "effort": "M",
        "riskDependencies": "必须建立在真实结果上",
        "originalRow": "| P1 | 作品集 flagship 发布材料 | 把能力变成可见证据 | 90 秒 demo、架构图、Eval before/after、真实行为结果、bad-case 复盘和局限 | M | 必须建立在真实结果上 |"
      }
    ]
  },
  "stopDoing": [
    {
      "number": 1,
      "text": "新增 NPC，至少在各 NPC 的选择率和 3-turn rate 可见前停止。",
      "originalText": "1. 新增 NPC，至少在各 NPC 的选择率和 3-turn rate 可见前停止。"
    },
    {
      "number": 2,
      "text": "新增德语或其他语言。",
      "originalText": "2. 新增德语或其他语言。"
    },
    {
      "number": 3,
      "text": "扩写 Saku lore、隐藏热点和彩蛋。",
      "originalText": "3. 扩写 Saku lore、隐藏热点和彩蛋。"
    },
    {
      "number": 4,
      "text": "增加新的学习卡片、字段和筛选器。",
      "originalText": "4. 增加新的学习卡片、字段和筛选器。"
    },
    {
      "number": 5,
      "text": "继续基于 sampler 做全局 Prompt tuning。",
      "originalText": "5. 继续基于 sampler 做全局 Prompt tuning。"
    },
    {
      "number": 6,
      "text": "继续挑声线而不先修 TTS/STT 交互与可靠性。",
      "originalText": "6. 继续挑声线而不先修 TTS/STT 交互与可靠性。"
    },
    {
      "number": 7,
      "text": "推进 Voice Advice / Pronunciation Score。",
      "originalText": "7. 推进 Voice Advice / Pronunciation Score。"
    },
    {
      "number": 8,
      "text": "Account、数据库、多端同步和 RAG memory。",
      "originalText": "8. Account、数据库、多端同步和 RAG memory。"
    },
    {
      "number": 9,
      "text": "用 daily world state/life arc 替代真正的回访机制。",
      "originalText": "9. 用 daily world state/life arc 替代真正的回访机制。"
    },
    {
      "number": 10,
      "text": "把“73 个场景”“10 个 NPC”“12 个 API”当成产品成熟度证据。",
      "originalText": "10. 把“73 个场景”“10 个 NPC”“12 个 API”当成产品成熟度证据。"
    },
    {
      "number": 11,
      "text": "在没有 production-parity trace 时写“beta acceptable”。",
      "originalText": "11. 在没有 production-parity trace 时写“beta acceptable”。"
    },
    {
      "number": 12,
      "text": "写更多 roadmap 文档而不更新已有过期状态。",
      "originalText": "12. 写更多 roadmap 文档而不更新已有过期状态。"
    }
  ],
  "nextTasks": [
    {
      "priority": 1,
      "title": "修复并验证主聊天消息契约",
      "originalMarkdown": "## Task 1：修复并验证主聊天消息契约\n\n- **目标**：消除当前 user 重复，恢复 Guided 首轮判断。\n- **读取文件**：`app/chat/[npcId]/page.tsx`、`app/api/chat/route.ts`、`scripts/sample-guided-response-traces.local.mjs`、`docs/system-map.md`。\n- **权限**：允许修改。\n- **风险**：高，影响全部聊天。\n- **验收**：最终 messages 只含一次当前 user；free/guided/revisit 三条 payload snapshot 通过。"
    },
    {
      "priority": 2,
      "title": "设计并实现 API 服务端边界",
      "originalMarkdown": "## Task 2：设计并实现 API 服务端边界\n\n- **目标**：保护 12 个付费/敏感 API。\n- **读取文件**：`app/alpha-access-gate.tsx`、`app/layout.tsx`、全部 `app/api/**/route.ts`、`.env.example`。\n- **权限**：先审计方案，批准后修改。\n- **风险**：高，可能导致线上无法访问。\n- **验收**：signed session、统一 guard、输入上限、role allowlist、部署说明；不暴露 access code。"
    },
    {
      "priority": 3,
      "title": "建立 tracked production-parity Eval Harness",
      "originalMarkdown": "## Task 3：建立 tracked production-parity Eval Harness\n\n- **目标**：让浏览器、sampler 和 route 使用相同 payload contract。\n- **读取文件**：ChatPage、Chat API、`lib/conversation-scenes.ts`、`docs/eval/*`、当前 local sampler。\n- **权限**：允许修改；默认不得调用真实 API。\n- **风险**：中。\n- **验收**：dry-run 可生成 30 core payload；版本字段完整；targeted regression 可自动失败。"
    },
    {
      "priority": 4,
      "title": "设计 Guided Episode v1",
      "originalMarkdown": "## Task 4：设计 Guided Episode v1\n\n- **目标**：让场景在 3–5 轮内推进并自然收束。\n- **读取文件**：`lib/conversation-scenes.ts`、ChatPage、Chat API、topic-ideas、pre-send、Guided Eval docs。\n- **权限**：先审计/设计，确认后修改。\n- **风险**：高，容易任务化。\n- **验收**：明确 scene/turn/phase/end schema；无评分/通关 UI；12 个 episode cases 通过。"
    },
    {
      "priority": 5,
      "title": "最小行为事件与隐私方案",
      "originalMarkdown": "## Task 5：最小行为事件与隐私方案\n\n- **目标**：验证 first-send、3-turn、工具使用和回访。\n- **读取文件**：layout、home、ChatPage、ChatBubble、SavedItems、SessionSummary、README。\n- **权限**：先审计事件 schema，再允许修改。\n- **风险**：中，隐私与数据噪声。\n- **验收**：不采原文/音频；事件字典、触发点、去重、匿名标识与删除策略清楚。"
    },
    {
      "priority": 6,
      "title": "音频可靠性专项",
      "originalMarkdown": "## Task 6：音频可靠性专项\n\n- **目标**：让文本不等语音，修复录音 race、格式与 timeout。\n- **读取文件**：ChatPage、ChatBubble、TTS/STT routes、`lib/volcengine.ts`、`lib/edge-tts.ts`、voice profiles、TTS normalization。\n- **权限**：允许修改。\n- **风险**：高，跨浏览器。\n- **验收**：文本先显示；录音取消安全；Chrome/Safari 格式矩阵；无无限等待；专有词大小写保留。"
    },
    {
      "priority": 7,
      "title": "Storage v2 与隐私清理审计",
      "originalMarkdown": "## Task 7：Storage v2 与隐私清理审计\n\n- **目标**：统一本地数据版本、reset 和 delete-all。\n- **读取文件**：`lib/memory.ts`、`lib/saved-items.ts`、`lib/session-summary.ts`、expression cache、所有 panel。\n- **权限**：先只审计迁移设计，批准后修改。\n- **风险**：高，可能损坏用户旧数据。\n- **验收**：key registry、schema parser、迁移/rollback、export/delete all、reset count 修复。"
    },
    {
      "priority": 8,
      "title": "浏览器真机 UX/Accessibility 审计",
      "originalMarkdown": "## Task 8：浏览器真机 UX/Accessibility 审计\n\n- **目标**：验证静态审计无法确认的视觉与交互问题。\n- **读取文件**：首页、ChatPage、所有 drawer/modal、globals.css、manifest。\n- **权限**：只审计；浏览器测试需单独授权。\n- **风险**：低。\n- **验收**：移动/桌面截图证据、首次/Guided/查词/语音任务、键盘焦点、点击区、字号与对比度问题清单。\n\n---\n\n审计执行记录：\n\n- **文件修改**：无。\n- **`docs/system-map.md`**：未更新，因为本次是严格只读审计，没有结构性代码变更。\n- **只读检查**：`pwd`、仓库根目录、分支、status、log、diff、blame、tracked/ignored 文件、目录/文件搜索、UTF-8 源码与文档读取。\n- **未执行**：build、lint、npm install、真实 LLM/TTS/STT 请求、浏览器启动、音频试听。\n- **静态审计限制**：视觉层级、真实声线、发音自然度、真机录音兼容性、线上访问配置、真实留存和学习效果仍需运行验证。\n- **Rollback**：无变更，无需回滚。"
    }
  ],
  "journeys": [
    {
      "id": "first",
      "label": "首次用户",
      "sectionPrefix": "4.1",
      "markdown": "## 4.1 首次用户\n\n**有效设计**\n\n- Guided Scene 和 starter 都能预填而不自动发送，保留用户 ownership。\n- 进入场景由 NPC 先开口，显著优于空白输入框。\n- 聊天页有一次性 onboarding card。\n- 多种输入语言可进入，NPC 仍被要求使用日语。\n\n**关键断点**\n\n1. Hero 没有立刻解释“低压力日语输出练习”。\n2. NPC、日常场景、今日场景、随便聊一句是多个相似入口。\n3. 9 个 NPC 的 register 差异虽然存在，但首次用户需要读大量小字才能理解。\n4. 进入聊天后可能先等待 welcome；核心输入区与多个辅助入口同时出现。\n5. 系统没有询问“你想随便聊，还是练一个具体场景”。\n\n**判断**：启动扶手很多，但首页没有替用户做第一次选择。"
    },
    {
      "id": "returning",
      "label": "回访用户",
      "sectionPrefix": "4.2",
      "markdown": "## 4.2 回访用户\n\n**有效设计**\n\n- 按 NPC 保存聊天、上次时间和记忆。\n- 两小时后可生成 revisit welcome。\n- 首页能恢复最近一次聊天。\n- NPC life arc、world context 和 memory 试图制造连续感。\n\n**关键断点**\n\n- Continue 被放在首页最底部，只显示 1 个最近 NPC。\n- revisit welcome 是额外 LLM 调用，也可能让用户觉得 NPC 自说自话。\n- “重新开始”不清 familiarity count。\n- 收藏和回顾没有自然成为回访任务。\n- 当前没有证据说明 life arc/world state 被用户注意到或促成留存。\n\n**判断**：有恢复能力，但没有被验证的第二周回访理由。"
    },
    {
      "id": "guided",
      "label": "Guided Scenario 用户",
      "sectionPrefix": "4.3",
      "markdown": "## 4.3 Guided Scenario 用户\n\n**有效设计**\n\n- 73 个场景覆盖点单、校园、职场、生活支援、旅行、运动和 mystery。\n- scene query、NPC-first opening、editable sample line 都已实现。\n- Prompt 明确避免任务/考试化。\n\n**关键断点**\n\n- 当前 user 重复进入 Prompt，首轮规则失效。\n- scene state 刷新即丢。\n- 新场景 opening 直接追加到旧聊天，旧话题仍在 history。\n- 无 3–5 轮 episode phase、完成或 soft landing。\n- `softLanding` 等字段没有进入主 chat prompt。\n- 场景一直 active，直到用户手动退出。\n\n**判断**：入口体验接近产品，后续多轮仍是普通聊天加 scene label。"
    },
    {
      "id": "learning",
      "label": "学习工具用户",
      "sectionPrefix": "4.4",
      "markdown": "## 4.4 学习工具用户\n\n**有效设计**\n\n- 主聊天与教学层分离，是最强产品决策。\n- Expression Hint 为用户主动触发，分 casual/neutral/polite。\n- 查词有读音、句义、语感和来源。\n- 收藏复习支持筛选、review count、mastered 和 notes。\n- Review Card 能利用 lookup/hint 作为强信号。\n\n**关键断点**\n\n- 学习入口很多：Hint、translate、lookup、pre-send、next line、save、review、summary。\n- 收藏项来源上下文不够清楚，仓库也已记录该问题。\n- 资产没有进入下一次聊天输出。\n- 当前无法知道哪种工具真正帮助了用户，哪种只是被打开。\n- SavedItemsPanel 过于复杂，可能把轻量练习变成管理学习数据库。\n\n**判断**：学习资产生成强于学习资产复用。"
    },
    {
      "id": "mobile",
      "label": "移动端用户",
      "sectionPrefix": "4.6",
      "markdown": "## 4.6 移动端\n\n静态代码判断的五个最大风险：\n\n1. 首次麦克风权限期间松手可能产生录音 race。\n2. 麦克风/+ 按钮为 36px，低于常见 44px 触控建议。\n3. 大量 8–10px 文案和低 opacity secondary text。\n4. 文本 selection、查词 popover 在移动端本身难操作。\n5. 多层 fixed menu、drawer、soft keyboard 和 safe-area 可能互相挤压；多数 overlay 缺 focus/Escape 管理。"
    }
  ],
  "systemMap": {
    "sourceMarkdown": "## 2.3 核心调用链\n\n```mermaid\nflowchart LR\n    Home[\"首页：NPC / Scene / Starter\"] --> Chat[\"ChatPage\"]\n    Chat --> Scene[\"静态 NPC opening + sample line\"]\n    Chat --> Send[\"sendToNpc\"]\n    Send --> API[\"POST /api/chat\"]\n    API --> Persona[\"NPC persona\"]\n    API --> Shared[\"共同低压力与安全规则\"]\n    API --> ScenePrompt[\"可选 scenePrompt\"]\n    API --> History[\"history + 最终 user\"]\n    History --> LLM[\"DeepSeek → Volc Ark\"]\n    LLM --> Clean[\"前端清理括号内容\"]\n    Clean --> TTS[\"POST /api/tts\"]\n    TTS --> Display[\"保存历史并显示回复\"]\n\n    Display --> Hint[\"Expression Hint\"]\n    Display --> Lookup[\"划词解释\"]\n    Hint --> Saved[\"收藏 / 复习\"]\n    Lookup --> Saved\n    Saved --> Summary[\"Review Card\"]\n```\n\n生产消息数组实际为：\n\n1. NPC persona system。\n2. shared baseline + safety system。\n3. 可选 scene system。\n4. 客户端传入的 history。\n5. 后端再追加 `{ role: \"user\", content: text }`。[组装位置](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:740>)",
    "primaryFlow": [
      "首页：NPC / Scene / Starter",
      "ChatPage：静态 NPC opening + sample line",
      "sendToNpc",
      "POST /api/chat",
      "NPC persona + 共同低压力与安全规则 + 可选 scenePrompt + history + 最终 user",
      "DeepSeek → Volc Ark",
      "前端清理括号内容",
      "POST /api/tts → 保存历史并显示回复"
    ],
    "learningBranch": [
      "Expression Hint → 收藏 / 复习",
      "划词解释 → 收藏 / 复习",
      "收藏 / 复习 → Review Card"
    ]
  },
  "evalDataMarkdown": "# 6. Eval & Data Blueprint\n\n## 6.1 评测单位\n\n| 单位 | 核心问题 |\n|---|---|\n| Turn | 这一句是否自然、短、先回应用户、可继续 |\n| Guided Episode | 3–5 轮是否持续、符合场景并自然收束 |\n| Tool Artifact | Hint、lookup、summary 是否 grounded、可复用 |\n| Audio Clip | 可懂度、自然度、首播延迟与发音 |\n| Failure Episode | provider 失败后用户是否仍能继续 |\n| User Session | 用户是否真的发送、继续、复用和回访 |\n\n## 6.2 指标按判断方式区分\n\n| 指标 | 自动规则 | LLM Judge | 人工 | 行为数据 |\n|---|---:|---:|---:|---:|\n| 日语输出比例、emoji、句数、字符数 | ✓ |  | 抽查 |  |\n| 当前 user 是否重复 | ✓ |  |  |  |\n| 先回应用户 |  | ✓ | 校准 |  |\n| continuation hook | 可检测问号/长度 | ✓ | 校准 | 下一轮发送率 |\n| teacher/advisor/service tone | 部分关键词 | ✓ | ✓ |  |\n| 角色一致性/register |  | ✓ | ✓ 必须 | NPC 回访 |\n| 低压力程度 |  | ✓ | ✓ 必须 | 用户评分 |\n| 场景一致性与进展 | 状态/sceneId | ✓ | ✓ | 3/5 轮率 |\n| 自然收束 | phase/turn | ✓ | ✓ | exit reason |\n| 混合语言理解 | Japanese ratio | ✓ | ✓ | 首句发送 |\n| Hint/lookup/summary groundedness | schema/引用检查 | ✓ | ✓ | 使用/保存 |\n| TTS 发音与自然度 | 时延/失败率 | 有限 | ✓ 必须 | 播放/中止 |\n| 错误 fallback | status/latency |  | ✓ | 重试/退出 |\n\n## 6.3 最小样本体系\n\n第一版不需要庞大平台：\n\n- 30 个 core turn cases：每 NPC 3 个，覆盖自由聊、混输、角色高风险。\n- 12 个 Guided episodes：每个 3–5 轮，优先 Nana、Kimura、Riku、Aoi、Saku、Mao。\n- 12 个 learning tool cases：Hint 4、lookup 4、summary 4。\n- 8 个 audio cases：日期、JLPT、AI、混合专有词、长短句、男女声。\n- 6 个 failure cases：LLM timeout、TTS timeout、STT no-speech、格式失败、空回复、LocalStorage failure。\n- 原有 73 个首轮场景继续作为 weekly/full regression。\n\n每个 case 必须保存：\n\n- `caseId`\n- `promptVersion`\n- `sceneSchemaVersion`\n- `provider/model`\n- 完整但脱敏的 input context\n- expected / forbidden\n- 自动指标\n- judge score\n- 人审状态\n- badCaseType\n- introducedAt / fixedAt\n\n## 6.4 评分与 bad case\n\n建议 1–5 分：\n\n- 1：明显破坏体验。\n- 2：可理解但用户难接、角色明显漂移。\n- 3：可用，有可见缺陷。\n- 4：自然稳定。\n- 5：非常符合角色且低压力、容易接。\n\n硬失败标签独立于总分：\n\n- `context_duplicate_user`\n- `non_japanese_output`\n- `teacher_correction`\n- `advisor_or_service_takeover`\n- `overlong`\n- `no_acknowledgement`\n- `weak_or_no_hook`\n- `interrogative_rhythm`\n- `character_or_register_drift`\n- `scene_no_progress`\n- `scene_early_close`\n- `scene_never_closes`\n- `invented_fact_or_policy`\n- `tool_not_grounded`\n- `audio_timeout`\n- `audio_container_mismatch`\n- `fallback_dead_end`\n\n## 6.5 人审校准\n\n- 建立 20 条 gold set，至少两名评审。\n- 先各自独立评分，再只讨论差异≥2或硬标签不同的 case。\n- 保留 adjudicated gold。\n- Judge 每次升级都跑 gold；目标不是完全一致，而是：\n\n  - hard failure recall ≥90%；\n  - 主标签一致率 ≥75%；\n  - 评分差≤1 的 case ≥80%；\n  - 对 atmosphere、intent narrowing、teacher tone 的已知 bias 单独记录。\n\n现有 8-case calibration 的 75% primary match 是良好起点，但样本不足，且已发现 Judge 会忽略 intent narrowing、过度奖励氛围。\n\n## 6.6 Regression gate\n\n每次 Prompt/model/provider/scene 变更：\n\n1. 100% 跑与改动相关的 targeted cases。\n2. 跑 30 个 core turn。\n3. 若影响 Guided，跑 12 个 multi-turn episodes。\n4. 自动 hard check 必须 100% 通过。\n5. 不允许新增 R0。\n6. LLM Judge 不得显著劣化。\n7. 至少人工抽查 10 条。\n8. 发布后对行为指标观察 3–7 天。\n\n## 6.7 最小行为数据闭环\n\n**North Star**\n\n`Low-pressure output session rate`：打开聊天后，在 10 分钟内成功发送第一句，并累计至少 3 条用户消息的 session 比例。\n\n**核心漏斗**\n\n- `home_view`\n- `npc_chat_open`\n- `scene_start`\n- `starter_prefilled`\n- `message_send`\n- `npc_reply_received`\n- `turn_milestone_2/3/5`\n- `aid_open`\n- `suggestion_applied`\n- `lookup_success`\n- `item_saved`\n- `review_started/completed`\n- `saved_item_reused`\n- `session_end`\n- `return_d1/d7`\n\n**只记录**\n\n- NPC/scene ID\n- UI/input mode\n- language-mix bucket\n- 字符数 bucket\n- turn number\n- latency、provider、fallback\n- boolean 结果\n\n**不记录**\n\n- 原始消息\n- 音频\n- 查词原句\n- memory 内容\n- API key 或 Authorization\n- 可识别个人信息\n\n`saved_item_reused` 可在浏览器本地匹配，只上报 boolean 和资产年龄 bucket。",
  "engineeringMarkdown": "# 7. Engineering Audit\n\n## 7.1 现在必须修\n\n| 问题 | 不改后果 | 最小范围 | 风险 |\n|---|---|---|---|\n| 当前 user 重复、Guided 首轮失效 | 核心 AI 质量与 Eval 无效 | ChatPage payload + API contract + deterministic test | 高 |\n| 付费 API 无服务端 gate/rate/input cap | 成本滥用与攻击面 | middleware/API guard、signed cookie、route validation | 高 |\n| TTS 阻塞文本回复 | 每轮延迟与无效费用 | 先显示文本，TTS 后台或按需 | 高 |\n| TTS/STT 无 timeout | 页面/Serverless 卡住 | AbortController + UI timeout fallback | 中 |\n| 录音 permission/format race | 移动端核心语音失败 | recorder state machine + format contract | 高 |\n\n## 7.2 下一个重要功能前必须修\n\n| 问题 | 最小修改 |\n|---|---|\n| 无生产一致 Eval | 抽出共享 payload builder，tracked evaluator 默认 dry-run |\n| 无 Prompt/model/version trace | API 响应加入非敏感 meta，结果文件记录版本 |\n| Guided 无 episode state | 小 reducer：scene/turn/phase/end |\n| Prompt/NPC 配置重复 | 统一 Prompt registry，welcome 派生精简 persona |\n| LocalStorage 无统一版本 | storage registry、runtime parser、migration、delete all |\n| 巨型 ChatPage | 先抽 voice、session、payload 三个 hook，不做 UI 重写 |\n\n## 7.3 可以暂缓\n\n- Account、云同步和数据库。\n- 跨 NPC memory。\n- Manual memory edit。\n- 更精细的 affection/familiarity。\n- 全量组件设计系统重构。\n- 更换状态管理库。\n- 德语或其他语言扩展。\n- 更高级语音声学评分。\n\n## 7.4 不值得做\n\n- Vector DB / RAG memory。\n- 微服务、事件总线或复杂 provider plugin architecture。\n- 为每个 bad case 增加新的 Prompt 分支。\n- 大规模重写 73 个场景。\n- 为作品集“看起来高级”而增加实时语音、Live2D、排行榜、连续签到。\n- 在没有 activation 数据前建设推荐系统。",
  "positioningMarkdown": "# 8. Product Positioning\n\n## 最核心用户\n\n- N3–N1 左右或等效能力。\n- 输入明显强于输出。\n- 能理解短日语，但组织第一句困难。\n- 真人社交压力较高。\n- 想练关系距离和自然 register，而非只学语法。\n\n## 核心价值\n\n> 在不会说、怕说错、找不到话题时，提供足够轻的表达扶手，让用户仍感觉“这句话是我自己说出去的”。\n\n确认后发送、NPC 不纠错、学习层后置，是这个价值最可信的实现。\n\n## 与直接使用 ChatGPT 的差异\n\n**真实差异**\n\n- 关系/register 固定的 NPC。\n- 低压力对话契约。\n- Guided micro-scene。\n- 用户确认后发送。\n- 上下文查词和表达提示。\n- 对话资产收藏/回顾。\n- 可见可删的 per-NPC memory。\n\n**尚未形成壁垒的差异**\n\n- NPC 数量。\n- 世界观和彩蛋。\n- 73 个场景。\n- TTS/STT 本身。\n- 多种卡片和筛选。\n\n这些都能被 ChatGPT 自定义 Prompt 或其他语言 App 快速复制。真正难复制的是：**生产一致的质量治理 + 真实用户行为数据 + 不破坏自然聊天的学习闭环**。\n\n## 不适合服务的人群\n\n- 完全零基础学习者。\n- 需要系统课程/JLPT 刷题的人。\n- 希望每句被纠错或需要发音评分的人。\n- 追求真人实时语音对练的人。\n- 需要多设备同步、严格数据保管的人。\n- 想把 NPC 当事实顾问、医疗/租房/行政咨询的人。\n\n## 当前产品阶段\n\n独立判断：**feature-rich Alpha / portfolio MVP，带小范围 beta 使用痕迹；不是已验证的 Beta 产品。**\n\n## 最大留存障碍\n\n用户第一次可能因为新鲜、NPC 或场景进入；第二周回来需要“今天有一件小事想告诉某个人”的动机。当前仓库已提出 Daily Share Motivation，但未形成清晰入口和行为证据。\n\n## 最值得强化的闭环\n\n`现实中有一句想说 → 低压力扶手 → 用户自己发送 → NPC 自然接住 3–5 轮 → 带走一个表达 → 下一次真正复用`\n\n这比继续增加 NPC、卡片或世界 lore 更重要。\n\n## 扩展到德语时\n\n**可复用**：聊天/教学分层、confirm-before-send、scene state、事件体系、Eval pipeline、LocalStorage 框架、provider fallback。\n\n**不能复制**：register、礼貌距离、场景文化、词形/查词、TTS normalization、STT 语言策略、Prompt rubric、NPC 社会关系。\n\n现在不应扩语言；否则会把尚未验证的日语闭环复制成多套技术债。",
  "roadmapMarkdown": "# 9. Prioritized Roadmap\n\n## 未来 72 小时\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | 修复 production/eval 消息契约 | 恢复真实对话和 Guided 首轮质量 | 当前 user 在 provider messages 中只出现一次；真实首轮 history=1；6 个 deterministic cases | S | 对历史组装高风险；先固定 contract |\n| P0 | 保护全部付费 API | 防滥用、费用和隐私事故 | 服务端 signed access、route guard、role/length validation；未授权/超长请求被拒绝 | M | 部署配置；不需要账户/数据库 |\n| P0 | 定义核心事件与版本字段 | 后续改动可被验证 | 事件 schema、prompt/model/scene version、禁止采集字段；至少本地可检查 payload | S | 先做设计与最小埋点，不建数据平台 |\n\n## 未来两周\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | 生产一致 Eval Harness | 让质量结论可信 | tracked dry-run harness；30 core turns + targeted cases；sampler 共用生产 payload builder | M | 依赖消息契约 |\n| P1 | 12 个 3–5 轮 Guided Eval | 验证场景是否真能持续 | episode trace、progress/closure rubric、2 人校准；不再以首轮代表整段 | M | 少量真实 API 成本需人工授权 |\n| P1 | 非阻塞音频与录音稳定性 | 更快看到回复、移动语音可用 | 文本先显示；TTS/STT timeout；permission cancel；Safari/Chrome 格式矩阵 | M/L | 跨浏览器风险 |\n| P1 | 首页 activation 收敛 | 用户立即知道怎么开始 | Hero 一句话；Continue 前置；默认入口减少；5 人任务中都能在 30 秒内找到第一步 | M | 需要浏览器测试 |\n| P1 | 小样本可用性研究 | 找到真实退出点 | 5–10 名目标用户、任务录像/笔记、首次发送/3 轮/压力评分基线 | M | 招募和隐私同意 |\n\n## 未来一个月\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | Guided 3–5 轮 episode v1 | 让场景成为完整练习而非开场贴纸 | scene/turn/phase/end state、自然 soft landing；Guided 相对 free chat 的 3-turn rate 有方向性提升 | L | 依赖 Eval 与事件 |\n| P1 | 学习资产复用实验 | 验证收藏是否提高下一次输出 | 最近收藏生成可编辑 starter 或本地 reuse 检测；测 save→reuse | M | 避免变成强制复习 |\n| P1 | Storage v2 与隐私控制 | 防旧数据失效、增强信任 | schema parser/migration、export/delete all、reset 语义修复 | M | 历史数据迁移 |\n| P2 | 真机 Accessibility/移动端 pass | 提升实际可用性 | 44px targets、dialog/focus/Escape、动态 lang、关键文本字号；移动任务无 blocker | M | 需浏览器/真机 |\n| P1 | 作品集 flagship 发布材料 | 把能力变成可见证据 | 90 秒 demo、架构图、Eval before/after、真实行为结果、bad-case 复盘和局限 | M | 必须建立在真实结果上 |",
  "flagshipMarkdown": "# 11. Flagship Autumn-Recruitment Case\n\n## 推荐方向\n\n**“把 73 个场景内容库，升级为可测量的 3–5 轮低压力日语输出系统”**\n\n这是最能同时提升产品、AI 质量、数据能力和作品集可信度的方向。\n\n## 完整故事结构\n\n**问题**\n\n输入型学习者知道词和语法，却在第一句、第二句和对话延续上卡住；普通 AI 又容易纠错、解释或把场景过早解决。\n\n**用户**\n\nN3–N1、输入强输出弱、真人交流压力较高，希望短暂练习而非上课的人。\n\n**产品假设**\n\nNPC-first opening + editable starter + relationship-aware response + low-pressure hook，会提高第一句发送率和 3-turn completion；用户主动调用学习层比强制纠错压力更低。\n\n**设计**\n\n- Guided micro-scenario。\n- 自由编辑而非自动发送。\n- 关系/register 明确的 NPC。\n- 隐形 episode phase，不显示任务或评分。\n- 3–5 轮自然 soft landing。\n- 学习提示仍留在辅助层。\n\n**AI 能力**\n\n- 生产一致 Prompt assembly。\n- Persona/shared/scene 分层。\n- Prompt/model/scene version。\n- provider fallback。\n- deterministic contract check。\n- multi-turn judge。\n\n**数据/Eval**\n\n- 30 core turns。\n- 12 multi-turn episodes。\n- 人工 gold calibration。\n- 自动 hard checks。\n- Guided vs free-chat first-send/3-turn 比较。\n- pressure micro-rating。\n- latency/fallback guardrail。\n\n**代表 bad case**\n\n1. 当前 user 被重复发送。\n2. 首轮规则因 history length 失效。\n3. Nana 变成流程说明书。\n4. Kimura 编造店铺事实。\n5. 场景第一轮就结束。\n6. TTS 阻塞回复。\n7. 用户保存表达但从未复用。\n\n**迭代**\n\n先修 production parity，再做针对场景/角色的最小规则；如果是产品入口问题，不继续堆 Prompt；如果是 provider 差异，单独记录模型结果。\n\n**结果**\n\n当前尚无真实结果，不能提前编写。建议成功门槛：\n\n- payload contract 100% 通过；\n- 无新增 R0；\n- Guided first-send 相对自由入口有方向性提升；\n- 3-turn session rate 提升；\n- teacher/advisor tone 不恶化；\n- P95 文本可见延迟下降；\n- 至少出现可观察的 saved-item reuse。\n\n**局限**\n\n小样本、单语言、无账户、模型依赖、用户可能有新鲜感效应，不能泛化为长期学习成效。\n\n## 为什么它能被追问 20 分钟\n\n可以深入讨论：\n\n- 为什么不主动纠错；\n- 为什么先修生产链而非继续调 Prompt；\n- 如何校准 LLM Judge；\n- 如何区分 Prompt/模型/产品/工程问题；\n- 为什么 3-turn rate 比消息总量更重要；\n- 怎样在不采聊天内容时验证闭环；\n- 如何处理 provider 成本、延迟和失败；\n- 为什么不做 RAG、课程或游戏化；\n- small-N 实验的局限；\n- 一次真实 bad case 如何变成 regression。\n\n这会比“做了一个 AI 日语聊天网站”有说服力得多。",
  "reportMarkdown": "# 1. Executive Summary\n\nKotomachi 当前是一个功能完整度较高、产品边界清晰的 **Alpha / portfolio MVP**，仓库也记录了少量外部 beta 反馈；但它还不能被证据支持为“质量已验证的 Beta”或可持续使用的产品。它已实现 9 个公开 NPC、1 个隐藏 NPC、73 个 Guided Scenarios、混合语言聊天、表达提示、查词、收藏复习、回顾卡、记忆、TTS/STT 等能力，工程量与产品思考都明显超过普通聊天壳。\n\n最大优势不是功能数量，而是“先输出、后学习”的分层设计：NPC 主聊天不主动纠错，用户主动打开提示、查词和复习；不同 NPC 也确有关系距离与 register 差异。Guided Scenario 的结构化内容和人工校准 Eval 是仓库里最有价值的 AI 产品资产。\n\n最大问题是：**真实生产消息链与 Guided Eval 链不一致**。前端把当前用户消息同时放入 history，后端又追加一次，导致模型看到重复输入；`isFirstGuidedTurn` 也不会按评测条件触发。因此“73 个场景首轮回复达到 beta 水平”的结论没有覆盖真实浏览器路径。与此同时，场景没有持久的轮次、目标或自然收束，学习资产也没有重新回流到后续输出；产品拥有丰富功能，却尚未形成可验证的留存闭环。\n\n最值得做的下一步是：先修生产链和 API 安全边界，再建立生产一致的 3–5 轮 Guided Eval 与最小行为数据闭环。最不该做的是继续增加 NPC、语言、世界观、RAG、Pronunciation Score 或更多学习卡片。\n\n审计标记：**已验证事实**＝代码或仓库直接支持；**高置信推断**＝代码结构强烈指向但未做运行验证；**待确认**＝需要真实用户、部署或音频试听数据。\n\n# 2. Repository Truth Map\n\n## 2.1 仓库基线\n\n- **已验证事实**：仓库根目录为 `D:\\LucasRan\\AI\\kotomachi`。\n- 分支：`main`；HEAD：`ff06b45`；与 `origin/main` 对齐。\n- 工作区 clean，无 staged 或 unstaged 内容。\n- 289 个 commits，时间跨度为 2026-05-26 至 2026-06-29，基本为单人 ownership。\n- 技术栈：Next.js 14、React 18、TypeScript strict、Tailwind、OpenAI SDK、DeepSeek、火山方舟、火山语音、Edge TTS、Vercel Analytics。[package.json](</D:/LucasRan/AI/kotomachi/package.json:5>)\n- 没有 test/eval npm script、测试框架或 `.test/.spec` 文件。\n- 本次未运行 build、lint、真实 provider 或浏览器测试。\n\n## 2.2 真实功能地图\n\n| 区域 | 实际状态 | 核心文件 |\n|---|---|---|\n| 首页 | Hero、世界氛围、公开 NPC、每日场景、自由话题、继续聊天、Saku 彩蛋 | [首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:41>)、[SceneEntrySection](</D:/LucasRan/AI/kotomachi/components/home/scene-entry-section.tsx:144>)、[InspirationSection](</D:/LucasRan/AI/kotomachi/components/home/inspiration-section.tsx:54>) |\n| NPC 聊天 | 9 个公开 NPC，非法 ID 静默回落到 Misaki | [ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:311>)、[NPC 配置](</D:/LucasRan/AI/kotomachi/lib/npc.ts:1>) |\n| Hidden NPC | Saku 可通过夜间 rumor / 隐藏热点发现 | [RumorEntry](</D:/LucasRan/AI/kotomachi/components/home/rumor-entry.tsx:135>) |\n| Guided Scenario | 73 个结构化场景；NPC 静态开场、sample line 预填、scene prompt、手动退出 | [场景配置](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:3>)、[启动逻辑](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1133>) |\n| 主聊天 AI | DeepSeek 主 provider，Volc Ark 顺序 fallback | [Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:603>)、[LLM provider](</D:/LucasRan/AI/kotomachi/lib/llm.ts:211>) |\n| 表达扶手 | 发送前“我想说……”、发送后 Expression Hint、下一句建议 | [Pre-send API](</D:/LucasRan/AI/kotomachi/app/api/pre-send-expression/route.ts:144>)、[Feedback API](</D:/LucasRan/AI/kotomachi/app/api/feedback/route.ts:934>) |\n| 查词与收藏 | 选中文本查词、自动记录 lookup、手动收藏、复习、mastered、笔记 | [WordPopover](</D:/LucasRan/AI/kotomachi/components/word-popover.tsx:90>)、[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:21>) |\n| 回顾卡 | 最近对话、lookup、hint、混合语言 span 生成复习资产 | [Summary API](</D:/LucasRan/AI/kotomachi/app/api/session-summary/route.ts:1017>)、[Summary schema](</D:/LucasRan/AI/kotomachi/lib/session-summary.ts:68>) |\n| Memory | 每 NPC durable facts、可见可删、4 条用户消息触发 curator、welcome merge | [Memory](</D:/LucasRan/AI/kotomachi/lib/memory.ts:207>)、[Memory API](</D:/LucasRan/AI/kotomachi/app/api/memory/route.ts:266>) |\n| TTS | 火山优先、Edge fallback、voice profile、文本 normalization、前端 session cache | [TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:37>)、[Voice profile](</D:/LucasRan/AI/kotomachi/lib/tts-voice-profiles.ts:3>) |\n| STT | MediaRecorder、火山按 ja→en→zh 尝试、转录后进入输入框确认 | [录音链](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1208>)、[STT provider](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:346>) |\n| Voice Advice | API、类型与文档存在，但没有产品 UI 调用 | [Voice Advice API](</D:/LucasRan/AI/kotomachi/app/api/voice-advice/route.ts:480>) |\n| 数据分析 | 只有自动 pageview Analytics，没有功能事件 | [Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:36>) |\n\n## 2.3 核心调用链\n\n```mermaid\nflowchart LR\n    Home[\"首页：NPC / Scene / Starter\"] --> Chat[\"ChatPage\"]\n    Chat --> Scene[\"静态 NPC opening + sample line\"]\n    Chat --> Send[\"sendToNpc\"]\n    Send --> API[\"POST /api/chat\"]\n    API --> Persona[\"NPC persona\"]\n    API --> Shared[\"共同低压力与安全规则\"]\n    API --> ScenePrompt[\"可选 scenePrompt\"]\n    API --> History[\"history + 最终 user\"]\n    History --> LLM[\"DeepSeek → Volc Ark\"]\n    LLM --> Clean[\"前端清理括号内容\"]\n    Clean --> TTS[\"POST /api/tts\"]\n    TTS --> Display[\"保存历史并显示回复\"]\n\n    Display --> Hint[\"Expression Hint\"]\n    Display --> Lookup[\"划词解释\"]\n    Hint --> Saved[\"收藏 / 复习\"]\n    Lookup --> Saved\n    Saved --> Summary[\"Review Card\"]\n```\n\n生产消息数组实际为：\n\n1. NPC persona system。\n2. shared baseline + safety system。\n3. 可选 scene system。\n4. 客户端传入的 history。\n5. 后端再追加 `{ role: \"user\", content: text }`。[组装位置](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:740>)\n\n## 2.4 数据与状态\n\n- `kotomachi_history_${npcId}`：每 NPC 最后 20 条，无 schema version/元素校验。[memory.ts](</D:/LucasRan/AI/kotomachi/lib/memory.ts:453>)\n- `kotomachi_facts_${npcId}`：最多 10 条字符串 facts。\n- `kotomachi_count_${npcId}`：消息计数。\n- `kotomachi_last_time_${npcId}`：上次聊天时间。\n- `kotomachi_arc_${npcId}`：NPC life arc 偏移。\n- `kotomachi_saved_items_v1`：收藏词、表达、回顾卡引用，最多 200。\n- `kotomachi.summaryCards.v1`、`wordLookups.v1`、`expressionHints.v1`：各自独立 schema。\n- active Guided Scene 只在 React state，刷新后丢失。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:353>)\n- 语音 blob 仅当前页面存在，不写 LocalStorage，这是正确的隐私与生命周期判断。\n\n## 2.5 文档与代码一致性\n\n| 文档说法 | 代码事实 | 判断 |\n|---|---|---|\n| README：8 个 NPC | 9 个公开 NPC + Saku，共 10 个 | 过期。[README](</D:/LucasRan/AI/kotomachi/README.md:85>) |\n| 首页规范：Continue 在 Inspiration 前 | 代码为 Inspiration → Continue | 已漂移。[规范](</D:/LucasRan/AI/kotomachi/docs/homepage-architecture-spec.md:36>)、[代码](</D:/LucasRan/AI/kotomachi/app/page.tsx:88>) |\n| Guided Eval：beta acceptable | 只评 `opening → prefill → response1`，且采样 payload 与浏览器 payload 不同 | 结论范围过宽。[回顾](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:20>) |\n| REG-VOICE-004：TTS/STT timeout Fixed | 当前 Volc TTS/STT 和 Edge TTS 无超时 | 错误状态。[Regression](</D:/LucasRan/AI/kotomachi/docs/regression-cases.md:395>) |\n| “safe prompt injection implemented” | in-app curator 有过滤，但 `/api/chat` 仍直接信任客户端 memories/history/system role | 只部分成立。[计划](</D:/LucasRan/AI/kotomachi/docs/development-plan.md:54>) |\n| Eval calibration plan 仍是待执行 | 本地 `.tmp` 已存在 8-case comparison，但没有纳入版本控制 | 文档状态落后、结果不可复现 |\n| README Demo | 仍是截图/GIF TODO | 作品集展示未完成。[README](</D:/LucasRan/AI/kotomachi/README.md:19>) |\n| System Map | 主要调用链基本准确 | 值得保留；但指向了一些被 `.gitignore` 排除的 local eval 脚本 |\n\n# 3. Top Findings\n\n成本口径：XS＜1 天；S＝1–2 天；M＝3–5 天；L＝1–2 周。\n\n## F1. 付费 AI/语音 API 没有真正的服务端访问边界\n\n- **发现与证据**：Alpha code 使用 `NEXT_PUBLIC_ALPHA_ACCESS_CODE`，在客户端比较并写 LocalStorage，code 会进入浏览器 bundle。[Alpha gate](</D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12>) 扫描 12 个 API route 未发现统一 auth、签名 session、rate limit 或 quota。\n- **严重度·对象·后果**：**Critical**；部署者、成本与用户隐私。若线上配置了 provider 凭证，调用者可绕过首页直接请求 `/api/chat`、TTS、STT、feedback 等。\n- **根因与建议**：把 UI gate 当成了 API gate。改为服务端 secret 验证并签发 httpOnly signed session；所有付费 API 校验 session，配置平台级速率限制、provider 配额和输入上限。\n- **成本·回归风险·置信度**：M；访问/部署回归高；**高置信推断**，待确认线上是否公开且已配置 provider。\n\n## F2. 真实聊天会把当前用户消息发送给模型两次\n\n- **发现与证据**：前端先把当前消息 push 到 `historyForApi`，[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983>)；API 又在 history 后追加同一 `text`。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>)\n- **严重度·对象·后果**：**Critical**；所有聊天用户、Prompt/Eval。模型看到重复输入，可能复述、过度回应、权重异常，并增加 token。\n- **根因与建议**：当前消息归属没有单一契约。规定 history 永远不包含本轮 user，或 API 不再追加；增加 deterministic payload test，断言最终用户消息只出现一次。\n- **成本·回归风险·置信度**：S；聊天历史回归高；**已验证事实**。\n\n## F3. Guided 首轮规则在生产路径下无法按 Eval 条件触发\n\n- **发现与证据**：API 用 `history.length <= 1` 判断首轮，[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650>)；浏览器首轮 history 至少包含 scene opening + 当前 user，因此长度为 2。采样器只放 opening，再把 user 单独作为 text。\n- **严重度·对象·后果**：**High**；Guided 用户、Prompt 质量。专门防止过早收场的首轮规则在真实路径失效。\n- **根因与建议**：Eval 只验证 sampler→route，没有验证 browser→route。修 F2 后，把真实 payload assembly 抽成可复用函数，评测和前端共同使用。\n- **成本·回归风险·置信度**：S；Guided 回归高；**已验证事实**。\n\n## F4. “73 场景 beta 可接受”没有覆盖真实 3–5 轮体验\n\n- **发现与证据**：v10 的评测单位明确只有 `npcOpening → sampleUserLineJa → npcResponse1`，[Retrospective](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22>)，却把目标表述为 3–5 轮。39/73 为 R3，仍有 16 个 `too_closed`、6 个弱 hook。[结果](</D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155>)\n- **严重度·对象·后果**：**High**；产品判断、roadmap、作品集可信度。首轮高分不能证明用户会发第二、三句或自然结束。\n- **根因与建议**：把易采样的 turn quality 代替了 episode outcome。保留 73 首轮集，但增加 12–20 条生产一致的 3–5 轮 episode eval、场景漂移和收束指标。\n- **成本·回归风险·置信度**：M；Eval 规则回归中；**已验证事实**。\n\n## F5. Guided Scenario 是丰富配置，不是完整 episode system\n\n- **发现与证据**：配置含 `userGoal / possibleBeats / usefulIntents / softLanding`，[scene schema](</D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17>)；主 chat prompt 只使用 title、setup、intent、moment、avoid，[buildScenePrompt](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504>)。active scene 不持久、无 turn count、进度、完成或自动 soft landing，只能手动退出。\n- **严重度·对象·后果**：**High**；快速场景练习用户。场景开始后仍像普通聊天，无法保证 3–5 轮有意义输出。\n- **根因与建议**：内容 schema 领先于运行状态。新增极轻量 episode state：sceneId、startedAt、userTurnCount、phase、endedReason；不做任务 UI，只用于 Prompt、自然收束和数据。\n- **成本·回归风险·置信度**：M/L；对话自然度回归高；**已验证事实**。\n\n## F6. 产品无法回答最核心的行为问题\n\n- **发现与证据**：仅挂载 `<Analytics />`，没有 `track()` 或 feature event。[Layout](</D:/LucasRan/AI/kotomachi/app/layout.tsx:39>) 体验日志记录了少量 external beta feedback，但没有参与人数、session、漏斗或变化前后数据。[Experience Log](</D:/LucasRan/AI/kotomachi/docs/experience-log.md:86>)\n- **严重度·对象·后果**：**High**；产品负责人、实验与 roadmap。无法判断第一句发送率、3 轮率、Guided 增益、工具使用、回访和学习资产复用。\n- **根因与建议**：功能开发快于验证。先采 10–12 个无内容事件，并做 5–10 人任务观察；禁止采原始消息和音频。\n- **成本·回归风险·置信度**：M；隐私风险中；**已验证事实**。\n\n## F7. 每条 NPC 回复都自动生成 TTS，并阻塞文本出现\n\n- **发现与证据**：`useVoice = true`，等待 `fetchTtsUrl` 后才构建并显示 assistant message。[ChatPage](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033>) 输入框在整个期间 disabled。[输入框](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437>) TTS 响应明确 `no-cache`。[TTS API](</D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118>)\n- **严重度·对象·后果**：**High**；所有用户、延迟与费用。即使用户不播放语音也会付费并等待；TTS 故障拖慢文本聊天。\n- **根因与建议**：把语音资产生成当作回复完成条件。先显示文本并解锁输入；TTS 改为按需或后台预取，失败不能影响聊天。\n- **成本·回归风险·置信度**：M；音频状态回归高；**已验证事实**。\n\n## F8. 音频当前最关键的问题是可靠性与交互，不是继续挑声线\n\n- **发现与证据**：Volc TTS、STT 和 Edge stream 无 AbortSignal/timeout；录音 permission await 存在“用户已松手但 recorder 后启动”的 race；mp4 被标成 mp3、webm 被标成 ogg 但没有转码。[录音](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213>)、[格式映射](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249>)。STT 还会把所有拉丁词小写化。[后处理](</D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265>)\n- **严重度·对象·后果**：**High**；移动端和混合语言用户。首次录音、Safari mp4、JLPT/AI/ChatGPT 等专有词可能失败或失真。\n- **根因与建议**：浏览器容器格式、provider codec 和 UI gesture 生命周期没有统一契约。先加 timeout、permission cancellation、最长录音、真实容器支持/转码策略，移除破坏性 lowercase。\n- **成本·回归风险·置信度**：M；跨浏览器回归高；格式失败为**高置信推断**，需真机验证。\n\n## F9. 首页内容丰富，但首屏没有清楚说“这是什么、我该做什么”\n\n- **发现与证据**：Hero 只有品牌、时间与氛围，[首页](</D:/LucasRan/AI/kotomachi/app/page.tsx:46>)；随后是 9 NPC、featured scene、9 个自由话题，Continue 最后出现且最多只显示 1 个。[Continue](</D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42>)\n- **严重度·对象·后果**：**High**；首次用户和回访用户。新用户面对多个相似入口，回访用户的主任务反而被埋底。\n- **根因与建议**：首页同时承担世界观、NPC 展示、场景推荐、话题推荐和恢复会话。首屏补一句明确价值；有历史时把 Continue 提到 Scene 前；默认只显示一个主要场景和少量 NPC。\n- **成本·回归风险·置信度**：S/M；视觉层级回归中；**高置信推断**，未做截图/可用性测试。\n\n## F10. 学习工具形成了资产库，但没有形成“资产重新进入输出”的闭环\n\n- **发现与证据**：收藏支持 review/mastered/notes，回顾卡也有 `nextTalkPrompt`；但主聊天 payload 只注入 memories，不注入 saved words/expressions/review history。[send payload](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028>) 没有检测收藏词是否重新出现在用户输出。\n- **严重度·对象·后果**：**High**；学习工具用户与留存。收藏、复习和聊天成为并行系统，无法证明学习资产提升了表达。\n- **根因与建议**：闭环停在“保存/看过”。先做一个小实验：从最近收藏中生成可编辑的下一次开场，或在本地检测后续输出是否复用了某个资产，只上报 boolean。\n- **成本·回归风险·置信度**：M；可能增加学习压力，回归中；**已验证事实**。\n\n## F11. `/api/chat` 信任客户端提供的角色、上下文和长度\n\n- **发现与证据**：request 直接接受 `ChatCompletionMessageParam[]`、memories、lifeArc、worldDescription 等，[类型](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21>)；随后原样插入 messages。[组装](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765>) text、history 内容和总长度没有上限，history 也可包含 system/tool role。\n- **严重度·对象·后果**：**High**；Prompt 安全、费用与稳定性。调用者能插入额外 system message、构造巨型上下文或伪造世界/记忆。\n- **根因与建议**：服务端类型断言代替运行时校验。只接受 user/assistant、截断每条和总条数；npc/scene 必须验证匹配；日期、世界和 familiarity 在服务端计算。\n- **成本·回归风险·置信度**：M；旧 payload 回归高；**已验证事实**。\n\n## F12. LocalStorage 是合理 MVP 选择，但当前 schema 与清理边界已开始失控\n\n- **发现与证据**：history 只检查 array，不校验元素；Saved Items key 带 v1 但 load 同样只检查 array。[Saved Items](</D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96>) “重新开始”清 history/facts/time，但不清 `kotomachi_count_*`，[reset helper](</D:/LucasRan/AI/kotomachi/lib/memory.ts:493>)，导致新欢迎仍可能带熟悉度。\n- **严重度·对象·后果**：**Medium/High**；回访用户、数据迁移、隐私。损坏旧数据可污染 UI；“重新开始”语义不一致；用户没有一键导出/删除全部本地数据。\n- **根因与建议**：每项功能自行增加 key。先建小型 storage registry、runtime parser 和迁移入口；明确 reset chat、delete memory、delete all 三种语义。\n- **成本·回归风险·置信度**：M；历史数据回归高；**已验证事实**。\n\n## F13. 集成点和 Prompt 已达到高改动扩散风险\n\n- **发现与证据**：ChatPage 2618 行、SavedItemsPanel 2181 行、ChatBubble 1544 行、conversation-scenes 3254 行。ChatPage 有 40+ state/ref；persona 又在 chat 与 welcome 重复维护。Aoi 在 `buildSystemPrompt` 有一套 Prompt，[Aoi branch](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224>)，运行时又由另一套专用 Prompt 覆盖。[runtime Aoi](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688>)\n- **严重度·对象·后果**：**Medium/High**；后续维护者、Prompt Lead。改一处可能没有生效，状态变更容易影响音频、场景、回顾、记忆和欢迎。\n- **根因与建议**：功能连续叠加在原集成组件。不要重写；先抽 `buildChatPayload`、`useChatSession`、`useVoiceInput`、Prompt registry 和 scene session reducer。\n- **成本·回归风险·置信度**：L，分步实施；回归高；**已验证事实**。\n\n## F14. 输出与失败路径没有保护核心产品契约\n\n- **发现与证据**：主聊天只取 `aiText` 并返回，无 Japanese ratio、长度、emoji、teacher-tone 或空字符串校验。[Chat API](</D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818>) 前端清理会删除所有括号/方括号内容，而非只识别动作描写。[sanitize](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157>) 失败 fallback 带 emoji，且失败 turn 不保存。[错误路径](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051>)\n- **严重度·对象·后果**：**Medium/High**；异常输入和 provider 故障用户。可出现空回复、非日语回复、合法括号内容丢失、刷新后失败 turn 消失。\n- **根因与建议**：核心契约只写在 Prompt，没有 deterministic guard。增加轻量 post-check 与不破坏原文的 fallback；失败消息和重试操作要明确，不伪装成正常 NPC 回复。\n- **成本·回归风险·置信度**：S/M；日语文本误判风险中；**已验证事实**。\n\n## F15. 移动可用性、文档证据和作品集呈现仍不够专业\n\n- **发现与证据**：根 `<html lang=\"ja\">`，但 UI 默认中文；大量 8–10px 文本、36×36 主控件，[输入控件](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210>)；多个 overlay 缺 `role=\"dialog\"`、focus trap 和 Escape，例如 Saved Items。[overlay](</D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785>) 英文 UI 的 active scene 仍显示中文 `title/setup`。[scene card](</D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062>) README 没有 demo 图片。\n- **严重度·对象·后果**：**Medium**；移动端、键盘/辅助技术用户、招聘方。产品显得功能多但完成度不稳定。\n- **根因与建议**：组件局部 polish 多，端到端 accessibility 和 portfolio evidence 少。做一次真机/桌面任务截图审计，统一对话框语义、字号、点击区、语言与 README 证据。\n- **成本·回归风险·置信度**：M；视觉回归中；代码事实已验证，实际可见严重度**待浏览器确认**。\n\n# 4. User Journey Audit\n\n## 4.1 首次用户\n\n**有效设计**\n\n- Guided Scene 和 starter 都能预填而不自动发送，保留用户 ownership。\n- 进入场景由 NPC 先开口，显著优于空白输入框。\n- 聊天页有一次性 onboarding card。\n- 多种输入语言可进入，NPC 仍被要求使用日语。\n\n**关键断点**\n\n1. Hero 没有立刻解释“低压力日语输出练习”。\n2. NPC、日常场景、今日场景、随便聊一句是多个相似入口。\n3. 9 个 NPC 的 register 差异虽然存在，但首次用户需要读大量小字才能理解。\n4. 进入聊天后可能先等待 welcome；核心输入区与多个辅助入口同时出现。\n5. 系统没有询问“你想随便聊，还是练一个具体场景”。\n\n**判断**：启动扶手很多，但首页没有替用户做第一次选择。\n\n## 4.2 回访用户\n\n**有效设计**\n\n- 按 NPC 保存聊天、上次时间和记忆。\n- 两小时后可生成 revisit welcome。\n- 首页能恢复最近一次聊天。\n- NPC life arc、world context 和 memory 试图制造连续感。\n\n**关键断点**\n\n- Continue 被放在首页最底部，只显示 1 个最近 NPC。\n- revisit welcome 是额外 LLM 调用，也可能让用户觉得 NPC 自说自话。\n- “重新开始”不清 familiarity count。\n- 收藏和回顾没有自然成为回访任务。\n- 当前没有证据说明 life arc/world state 被用户注意到或促成留存。\n\n**判断**：有恢复能力，但没有被验证的第二周回访理由。\n\n## 4.3 Guided Scenario 用户\n\n**有效设计**\n\n- 73 个场景覆盖点单、校园、职场、生活支援、旅行、运动和 mystery。\n- scene query、NPC-first opening、editable sample line 都已实现。\n- Prompt 明确避免任务/考试化。\n\n**关键断点**\n\n- 当前 user 重复进入 Prompt，首轮规则失效。\n- scene state 刷新即丢。\n- 新场景 opening 直接追加到旧聊天，旧话题仍在 history。\n- 无 3–5 轮 episode phase、完成或 soft landing。\n- `softLanding` 等字段没有进入主 chat prompt。\n- 场景一直 active，直到用户手动退出。\n\n**判断**：入口体验接近产品，后续多轮仍是普通聊天加 scene label。\n\n## 4.4 学习工具用户\n\n**有效设计**\n\n- 主聊天与教学层分离，是最强产品决策。\n- Expression Hint 为用户主动触发，分 casual/neutral/polite。\n- 查词有读音、句义、语感和来源。\n- 收藏复习支持筛选、review count、mastered 和 notes。\n- Review Card 能利用 lookup/hint 作为强信号。\n\n**关键断点**\n\n- 学习入口很多：Hint、translate、lookup、pre-send、next line、save、review、summary。\n- 收藏项来源上下文不够清楚，仓库也已记录该问题。\n- 资产没有进入下一次聊天输出。\n- 当前无法知道哪种工具真正帮助了用户，哪种只是被打开。\n- SavedItemsPanel 过于复杂，可能把轻量练习变成管理学习数据库。\n\n**判断**：学习资产生成强于学习资产复用。\n\n## 4.5 混合语言与错误用户\n\n- 中英日混合输入是明确支持的，Chat Prompt 也要求日语回复。\n- Pre-send 和 Expression Hint 有大量混输 normalizer/fallback。\n- 但主聊天没有输出 contract check。\n- STT 会错误 lower-case 拉丁词。\n- 对 AI 回复不满意时没有 regenerate、dislike、report bad case 或“换一种更短回复”；只有 Expression Hint 可重生成。\n- 网络失败同时出现 error banner 和伪 NPC fallback bubble，且 fallback 带 emoji。\n\n## 4.6 移动端\n\n静态代码判断的五个最大风险：\n\n1. 首次麦克风权限期间松手可能产生录音 race。\n2. 麦克风/+ 按钮为 36px，低于常见 44px 触控建议。\n3. 大量 8–10px 文案和低 opacity secondary text。\n4. 文本 selection、查词 popover 在移动端本身难操作。\n5. 多层 fixed menu、drawer、soft keyboard 和 safe-area 可能互相挤压；多数 overlay 缺 focus/Escape 管理。\n\n## 4.7 桌面端\n\n- 固定 sidebar、宽聊天区、右侧 drawer 比移动端更适合管理收藏和回顾。\n- 但首页仍大量使用横向滚动 rail，在宽屏上信息层级不够聚焦。\n- 侧栏、+ 菜单和气泡操作共同暴露很多能力，长期用户可能形成“到处都是工具”的疲劳。\n\n## 4.8 五类 UX 结论\n\n**首次最可能困惑的 5 点**\n\n1. 这是聊天产品、口语产品还是收藏复习产品？\n2. SceneEntry 和“今日街角小事”有什么区别？\n3. 应该先选 NPC 还是先选场景？\n4. “我想说”“下一句怎么接”“表达提示”分别发生在什么时候？\n5. NPC 为什么自动说话/自动生成语音？\n\n**高频用户最可能厌烦的 5 点**\n\n1. 每轮都等 TTS 才看到文字。\n2. 回复期间不能提前输入下一句。\n3. 首页继续聊天入口太低。\n4. revisit welcome 不一定是用户想要的。\n5. 收藏、回顾和筛选逐渐变成管理负担。\n\n**看起来精致但当前价值较低**\n\n- 隐藏 Saku 热点和彩蛋。\n- 每日伪随机 world weather/life arc。\n- 73 个场景的数量扩张。\n- PWA install guidance。\n- 过多学习卡内部标签和层级。\n\n**小改动高收益**\n\n- Hero 增加一行明确定位和单一主 CTA。\n- 有历史时把 Continue 提到第一内容区。\n- 修复消息重复，让回复文字先显示。\n- chat busy 时仍允许用户在输入框起草。\n- 统一 44px 控件、12px 以上辅助文本。\n- active scene 用本地化 title/microEpisode，而非中文 setup。\n\n# 5. AI / Prompt Audit\n\n## 5.1 当前消息链\n\n- Persona system：NPC 身份、语体、关系距离、memory、日期、life arc、邻居与世界状态。\n- Shared system：低压力、先回应用户、不要教学/建议机，以及较长的世界安全规则。\n- Scene system：场景 title/setup/intent/moment/avoid 和首轮 continuation 规则。\n- History：客户端提供。\n- Final user：服务端追加。\n\n主要问题不是“scenePrompt 丢失”。本地 runtime snapshot 已证明 scenePrompt 会到达 provider；真正问题是：\n\n1. 浏览器 payload 和 sampler payload 不一致。\n2. persona/shared/scene 约束竞争。\n3. Prompt 过长且重复。\n4. 没有输出端 contract。\n5. 没有 Prompt version 或 production trace。\n\n## 5.2 Prompt 架构风险\n\n| 风险 | 类型 | 判断 |\n|---|---|---|\n| 当前 user 重复 | 工程/Prompt assembly | 确定性 bug，不是模型问题 |\n| Aoi 两套 Prompt | 工程/维护 | 修改旧 branch 可能完全无效 |\n| Welcome 单独维护 NPC_PERSONALITIES | 工程/角色漂移 | chat 与 welcome 可产生不同角色 |\n| Shared safety 超长 | Prompt | 规则竞争和 token 成本增加 |\n| 大量禁止项 | Prompt | 能压坏例，但可能让回复过度保守/too closed |\n| 任意 history/system role | 安全/工程 | 可绕过原始 system 优先级 |\n| 无 Prompt version | 质量治理 | 无法把 bad case 绑定到具体版本 |\n| 无 provider/model/usage 返回 | 数据/工程 | 无法分辨 Prompt、模型、provider 与延迟问题 |\n| 无输出校验 | 产品/工程 | Prompt 失效后没有第二层保护 |\n\n## 5.3 NPC 差异化判断\n\n**差异不是只有头像**。Aoi 的同龄 casual、Haruka 的轻丁寧前辈、Kimura 的便利店距离、Taisho 的年长熟客、Mao 的轻职场、Riku 的运动伙伴、Nana 的生活支援、Ren 的旅行观察、Saku 的轻神秘，都有行为规则和禁止漂移。\n\n但差异仍有三个上限：\n\n- 大多数 NPC 共享“短句→回应→问一个小问题”的行为骨架。\n- Practical NPC 容易滑向客服/顾问；v10 中 Nana 仍最弱，平均 23.13。\n- 没有多轮 episode state 时，NPC 的 register 主要体现在语气，不一定形成不同的用户行为闭环。\n\n结论：**NPC 差异化已超过换皮，但还没有被用户选择、回访和留存数据证明。**\n\n## 5.4 Guided Scenario 状态\n\n- Scene ID 能进入 API。\n- scene avoid/intent/moment 进入 Prompt。\n- topic ideas 和 pre-send 会使用 userGoal、beats、softLanding。\n- 主聊天本身不使用这些 episode 字段。\n- 无场景结束检测。\n- 无“已完成一次低压力输出”的产品反馈。\n- 无多轮 regression。\n\n## 5.5 模型/provider 风险\n\n- DeepSeek 8 秒后顺序尝试 Ark 10 秒，理论上可等待约 18 秒。[LLM](</D:/LucasRan/AI/kotomachi/lib/llm.ts:215>)\n- Chat 未设置 `maxTokens`，但前端 history 限制为最后 10 条；任意 API 调用者仍可发送超长内容。\n- createChatCompletion 只返回 string，丢失 provider、model、usage、latency。\n- 不同 provider 的行为差异没有单独 Eval。\n- 当前无法判断某个坏例来自 Prompt、model 或 fallback provider。\n\n## 5.6 Memory readiness\n\n**已经做对的部分**\n\n- 每 NPC 隔离。\n- durable fact 与 temporary context 有清晰理念。\n- 可见、可删。\n- curator 支持 ignore/add/replace。\n- 对敏感、短期、购物话题做保守过滤。\n\n**不适合直接继续扩展的部分**\n\n- facts 仍是 `string[]`，没有 id/type/source/timestamp/confidence。\n- welcome 与 memory curator 有两条 extraction 路径。\n- 客户端可伪造 memory。\n- 无版本、审核记录和来源 message ID。\n- history、facts、count、arc 各自独立。\n\n在加入更强 memory 前，应先做 schema/version/provenance，而不是 RAG。\n\n# 6. Eval & Data Blueprint\n\n## 6.1 评测单位\n\n| 单位 | 核心问题 |\n|---|---|\n| Turn | 这一句是否自然、短、先回应用户、可继续 |\n| Guided Episode | 3–5 轮是否持续、符合场景并自然收束 |\n| Tool Artifact | Hint、lookup、summary 是否 grounded、可复用 |\n| Audio Clip | 可懂度、自然度、首播延迟与发音 |\n| Failure Episode | provider 失败后用户是否仍能继续 |\n| User Session | 用户是否真的发送、继续、复用和回访 |\n\n## 6.2 指标按判断方式区分\n\n| 指标 | 自动规则 | LLM Judge | 人工 | 行为数据 |\n|---|---:|---:|---:|---:|\n| 日语输出比例、emoji、句数、字符数 | ✓ |  | 抽查 |  |\n| 当前 user 是否重复 | ✓ |  |  |  |\n| 先回应用户 |  | ✓ | 校准 |  |\n| continuation hook | 可检测问号/长度 | ✓ | 校准 | 下一轮发送率 |\n| teacher/advisor/service tone | 部分关键词 | ✓ | ✓ |  |\n| 角色一致性/register |  | ✓ | ✓ 必须 | NPC 回访 |\n| 低压力程度 |  | ✓ | ✓ 必须 | 用户评分 |\n| 场景一致性与进展 | 状态/sceneId | ✓ | ✓ | 3/5 轮率 |\n| 自然收束 | phase/turn | ✓ | ✓ | exit reason |\n| 混合语言理解 | Japanese ratio | ✓ | ✓ | 首句发送 |\n| Hint/lookup/summary groundedness | schema/引用检查 | ✓ | ✓ | 使用/保存 |\n| TTS 发音与自然度 | 时延/失败率 | 有限 | ✓ 必须 | 播放/中止 |\n| 错误 fallback | status/latency |  | ✓ | 重试/退出 |\n\n## 6.3 最小样本体系\n\n第一版不需要庞大平台：\n\n- 30 个 core turn cases：每 NPC 3 个，覆盖自由聊、混输、角色高风险。\n- 12 个 Guided episodes：每个 3–5 轮，优先 Nana、Kimura、Riku、Aoi、Saku、Mao。\n- 12 个 learning tool cases：Hint 4、lookup 4、summary 4。\n- 8 个 audio cases：日期、JLPT、AI、混合专有词、长短句、男女声。\n- 6 个 failure cases：LLM timeout、TTS timeout、STT no-speech、格式失败、空回复、LocalStorage failure。\n- 原有 73 个首轮场景继续作为 weekly/full regression。\n\n每个 case 必须保存：\n\n- `caseId`\n- `promptVersion`\n- `sceneSchemaVersion`\n- `provider/model`\n- 完整但脱敏的 input context\n- expected / forbidden\n- 自动指标\n- judge score\n- 人审状态\n- badCaseType\n- introducedAt / fixedAt\n\n## 6.4 评分与 bad case\n\n建议 1–5 分：\n\n- 1：明显破坏体验。\n- 2：可理解但用户难接、角色明显漂移。\n- 3：可用，有可见缺陷。\n- 4：自然稳定。\n- 5：非常符合角色且低压力、容易接。\n\n硬失败标签独立于总分：\n\n- `context_duplicate_user`\n- `non_japanese_output`\n- `teacher_correction`\n- `advisor_or_service_takeover`\n- `overlong`\n- `no_acknowledgement`\n- `weak_or_no_hook`\n- `interrogative_rhythm`\n- `character_or_register_drift`\n- `scene_no_progress`\n- `scene_early_close`\n- `scene_never_closes`\n- `invented_fact_or_policy`\n- `tool_not_grounded`\n- `audio_timeout`\n- `audio_container_mismatch`\n- `fallback_dead_end`\n\n## 6.5 人审校准\n\n- 建立 20 条 gold set，至少两名评审。\n- 先各自独立评分，再只讨论差异≥2或硬标签不同的 case。\n- 保留 adjudicated gold。\n- Judge 每次升级都跑 gold；目标不是完全一致，而是：\n\n  - hard failure recall ≥90%；\n  - 主标签一致率 ≥75%；\n  - 评分差≤1 的 case ≥80%；\n  - 对 atmosphere、intent narrowing、teacher tone 的已知 bias 单独记录。\n\n现有 8-case calibration 的 75% primary match 是良好起点，但样本不足，且已发现 Judge 会忽略 intent narrowing、过度奖励氛围。\n\n## 6.6 Regression gate\n\n每次 Prompt/model/provider/scene 变更：\n\n1. 100% 跑与改动相关的 targeted cases。\n2. 跑 30 个 core turn。\n3. 若影响 Guided，跑 12 个 multi-turn episodes。\n4. 自动 hard check 必须 100% 通过。\n5. 不允许新增 R0。\n6. LLM Judge 不得显著劣化。\n7. 至少人工抽查 10 条。\n8. 发布后对行为指标观察 3–7 天。\n\n## 6.7 最小行为数据闭环\n\n**North Star**\n\n`Low-pressure output session rate`：打开聊天后，在 10 分钟内成功发送第一句，并累计至少 3 条用户消息的 session 比例。\n\n**核心漏斗**\n\n- `home_view`\n- `npc_chat_open`\n- `scene_start`\n- `starter_prefilled`\n- `message_send`\n- `npc_reply_received`\n- `turn_milestone_2/3/5`\n- `aid_open`\n- `suggestion_applied`\n- `lookup_success`\n- `item_saved`\n- `review_started/completed`\n- `saved_item_reused`\n- `session_end`\n- `return_d1/d7`\n\n**只记录**\n\n- NPC/scene ID\n- UI/input mode\n- language-mix bucket\n- 字符数 bucket\n- turn number\n- latency、provider、fallback\n- boolean 结果\n\n**不记录**\n\n- 原始消息\n- 音频\n- 查词原句\n- memory 内容\n- API key 或 Authorization\n- 可识别个人信息\n\n`saved_item_reused` 可在浏览器本地匹配，只上报 boolean 和资产年龄 bucket。\n\n# 7. Engineering Audit\n\n## 7.1 现在必须修\n\n| 问题 | 不改后果 | 最小范围 | 风险 |\n|---|---|---|---|\n| 当前 user 重复、Guided 首轮失效 | 核心 AI 质量与 Eval 无效 | ChatPage payload + API contract + deterministic test | 高 |\n| 付费 API 无服务端 gate/rate/input cap | 成本滥用与攻击面 | middleware/API guard、signed cookie、route validation | 高 |\n| TTS 阻塞文本回复 | 每轮延迟与无效费用 | 先显示文本，TTS 后台或按需 | 高 |\n| TTS/STT 无 timeout | 页面/Serverless 卡住 | AbortController + UI timeout fallback | 中 |\n| 录音 permission/format race | 移动端核心语音失败 | recorder state machine + format contract | 高 |\n\n## 7.2 下一个重要功能前必须修\n\n| 问题 | 最小修改 |\n|---|---|\n| 无生产一致 Eval | 抽出共享 payload builder，tracked evaluator 默认 dry-run |\n| 无 Prompt/model/version trace | API 响应加入非敏感 meta，结果文件记录版本 |\n| Guided 无 episode state | 小 reducer：scene/turn/phase/end |\n| Prompt/NPC 配置重复 | 统一 Prompt registry，welcome 派生精简 persona |\n| LocalStorage 无统一版本 | storage registry、runtime parser、migration、delete all |\n| 巨型 ChatPage | 先抽 voice、session、payload 三个 hook，不做 UI 重写 |\n\n## 7.3 可以暂缓\n\n- Account、云同步和数据库。\n- 跨 NPC memory。\n- Manual memory edit。\n- 更精细的 affection/familiarity。\n- 全量组件设计系统重构。\n- 更换状态管理库。\n- 德语或其他语言扩展。\n- 更高级语音声学评分。\n\n## 7.4 不值得做\n\n- Vector DB / RAG memory。\n- 微服务、事件总线或复杂 provider plugin architecture。\n- 为每个 bad case 增加新的 Prompt 分支。\n- 大规模重写 73 个场景。\n- 为作品集“看起来高级”而增加实时语音、Live2D、排行榜、连续签到。\n- 在没有 activation 数据前建设推荐系统。\n\n# 8. Product Positioning\n\n## 最核心用户\n\n- N3–N1 左右或等效能力。\n- 输入明显强于输出。\n- 能理解短日语，但组织第一句困难。\n- 真人社交压力较高。\n- 想练关系距离和自然 register，而非只学语法。\n\n## 核心价值\n\n> 在不会说、怕说错、找不到话题时，提供足够轻的表达扶手，让用户仍感觉“这句话是我自己说出去的”。\n\n确认后发送、NPC 不纠错、学习层后置，是这个价值最可信的实现。\n\n## 与直接使用 ChatGPT 的差异\n\n**真实差异**\n\n- 关系/register 固定的 NPC。\n- 低压力对话契约。\n- Guided micro-scene。\n- 用户确认后发送。\n- 上下文查词和表达提示。\n- 对话资产收藏/回顾。\n- 可见可删的 per-NPC memory。\n\n**尚未形成壁垒的差异**\n\n- NPC 数量。\n- 世界观和彩蛋。\n- 73 个场景。\n- TTS/STT 本身。\n- 多种卡片和筛选。\n\n这些都能被 ChatGPT 自定义 Prompt 或其他语言 App 快速复制。真正难复制的是：**生产一致的质量治理 + 真实用户行为数据 + 不破坏自然聊天的学习闭环**。\n\n## 不适合服务的人群\n\n- 完全零基础学习者。\n- 需要系统课程/JLPT 刷题的人。\n- 希望每句被纠错或需要发音评分的人。\n- 追求真人实时语音对练的人。\n- 需要多设备同步、严格数据保管的人。\n- 想把 NPC 当事实顾问、医疗/租房/行政咨询的人。\n\n## 当前产品阶段\n\n独立判断：**feature-rich Alpha / portfolio MVP，带小范围 beta 使用痕迹；不是已验证的 Beta 产品。**\n\n## 最大留存障碍\n\n用户第一次可能因为新鲜、NPC 或场景进入；第二周回来需要“今天有一件小事想告诉某个人”的动机。当前仓库已提出 Daily Share Motivation，但未形成清晰入口和行为证据。\n\n## 最值得强化的闭环\n\n`现实中有一句想说 → 低压力扶手 → 用户自己发送 → NPC 自然接住 3–5 轮 → 带走一个表达 → 下一次真正复用`\n\n这比继续增加 NPC、卡片或世界 lore 更重要。\n\n## 扩展到德语时\n\n**可复用**：聊天/教学分层、confirm-before-send、scene state、事件体系、Eval pipeline、LocalStorage 框架、provider fallback。\n\n**不能复制**：register、礼貌距离、场景文化、词形/查词、TTS normalization、STT 语言策略、Prompt rubric、NPC 社会关系。\n\n现在不应扩语言；否则会把尚未验证的日语闭环复制成多套技术债。\n\n# 9. Prioritized Roadmap\n\n## 未来 72 小时\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | 修复 production/eval 消息契约 | 恢复真实对话和 Guided 首轮质量 | 当前 user 在 provider messages 中只出现一次；真实首轮 history=1；6 个 deterministic cases | S | 对历史组装高风险；先固定 contract |\n| P0 | 保护全部付费 API | 防滥用、费用和隐私事故 | 服务端 signed access、route guard、role/length validation；未授权/超长请求被拒绝 | M | 部署配置；不需要账户/数据库 |\n| P0 | 定义核心事件与版本字段 | 后续改动可被验证 | 事件 schema、prompt/model/scene version、禁止采集字段；至少本地可检查 payload | S | 先做设计与最小埋点，不建数据平台 |\n\n## 未来两周\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | 生产一致 Eval Harness | 让质量结论可信 | tracked dry-run harness；30 core turns + targeted cases；sampler 共用生产 payload builder | M | 依赖消息契约 |\n| P1 | 12 个 3–5 轮 Guided Eval | 验证场景是否真能持续 | episode trace、progress/closure rubric、2 人校准；不再以首轮代表整段 | M | 少量真实 API 成本需人工授权 |\n| P1 | 非阻塞音频与录音稳定性 | 更快看到回复、移动语音可用 | 文本先显示；TTS/STT timeout；permission cancel；Safari/Chrome 格式矩阵 | M/L | 跨浏览器风险 |\n| P1 | 首页 activation 收敛 | 用户立即知道怎么开始 | Hero 一句话；Continue 前置；默认入口减少；5 人任务中都能在 30 秒内找到第一步 | M | 需要浏览器测试 |\n| P1 | 小样本可用性研究 | 找到真实退出点 | 5–10 名目标用户、任务录像/笔记、首次发送/3 轮/压力评分基线 | M | 招募和隐私同意 |\n\n## 未来一个月\n\n| 优先级 | 事项 | 目的/用户价值 | 具体交付与成功标准 | 工作量 | 风险/依赖 |\n|---|---|---|---|---|---|\n| P0 | Guided 3–5 轮 episode v1 | 让场景成为完整练习而非开场贴纸 | scene/turn/phase/end state、自然 soft landing；Guided 相对 free chat 的 3-turn rate 有方向性提升 | L | 依赖 Eval 与事件 |\n| P1 | 学习资产复用实验 | 验证收藏是否提高下一次输出 | 最近收藏生成可编辑 starter 或本地 reuse 检测；测 save→reuse | M | 避免变成强制复习 |\n| P1 | Storage v2 与隐私控制 | 防旧数据失效、增强信任 | schema parser/migration、export/delete all、reset 语义修复 | M | 历史数据迁移 |\n| P2 | 真机 Accessibility/移动端 pass | 提升实际可用性 | 44px targets、dialog/focus/Escape、动态 lang、关键文本字号；移动任务无 blocker | M | 需浏览器/真机 |\n| P1 | 作品集 flagship 发布材料 | 把能力变成可见证据 | 90 秒 demo、架构图、Eval before/after、真实行为结果、bad-case 复盘和局限 | M | 必须建立在真实结果上 |\n\n# 10. Stop Doing List\n\n当前应停止或冻结：\n\n1. 新增 NPC，至少在各 NPC 的选择率和 3-turn rate 可见前停止。\n2. 新增德语或其他语言。\n3. 扩写 Saku lore、隐藏热点和彩蛋。\n4. 增加新的学习卡片、字段和筛选器。\n5. 继续基于 sampler 做全局 Prompt tuning。\n6. 继续挑声线而不先修 TTS/STT 交互与可靠性。\n7. 推进 Voice Advice / Pronunciation Score。\n8. Account、数据库、多端同步和 RAG memory。\n9. 用 daily world state/life arc 替代真正的回访机制。\n10. 把“73 个场景”“10 个 NPC”“12 个 API”当成产品成熟度证据。\n11. 在没有 production-parity trace 时写“beta acceptable”。\n12. 写更多 roadmap 文档而不更新已有过期状态。\n\n# 11. Flagship Autumn-Recruitment Case\n\n## 推荐方向\n\n**“把 73 个场景内容库，升级为可测量的 3–5 轮低压力日语输出系统”**\n\n这是最能同时提升产品、AI 质量、数据能力和作品集可信度的方向。\n\n## 完整故事结构\n\n**问题**\n\n输入型学习者知道词和语法，却在第一句、第二句和对话延续上卡住；普通 AI 又容易纠错、解释或把场景过早解决。\n\n**用户**\n\nN3–N1、输入强输出弱、真人交流压力较高，希望短暂练习而非上课的人。\n\n**产品假设**\n\nNPC-first opening + editable starter + relationship-aware response + low-pressure hook，会提高第一句发送率和 3-turn completion；用户主动调用学习层比强制纠错压力更低。\n\n**设计**\n\n- Guided micro-scenario。\n- 自由编辑而非自动发送。\n- 关系/register 明确的 NPC。\n- 隐形 episode phase，不显示任务或评分。\n- 3–5 轮自然 soft landing。\n- 学习提示仍留在辅助层。\n\n**AI 能力**\n\n- 生产一致 Prompt assembly。\n- Persona/shared/scene 分层。\n- Prompt/model/scene version。\n- provider fallback。\n- deterministic contract check。\n- multi-turn judge。\n\n**数据/Eval**\n\n- 30 core turns。\n- 12 multi-turn episodes。\n- 人工 gold calibration。\n- 自动 hard checks。\n- Guided vs free-chat first-send/3-turn 比较。\n- pressure micro-rating。\n- latency/fallback guardrail。\n\n**代表 bad case**\n\n1. 当前 user 被重复发送。\n2. 首轮规则因 history length 失效。\n3. Nana 变成流程说明书。\n4. Kimura 编造店铺事实。\n5. 场景第一轮就结束。\n6. TTS 阻塞回复。\n7. 用户保存表达但从未复用。\n\n**迭代**\n\n先修 production parity，再做针对场景/角色的最小规则；如果是产品入口问题，不继续堆 Prompt；如果是 provider 差异，单独记录模型结果。\n\n**结果**\n\n当前尚无真实结果，不能提前编写。建议成功门槛：\n\n- payload contract 100% 通过；\n- 无新增 R0；\n- Guided first-send 相对自由入口有方向性提升；\n- 3-turn session rate 提升；\n- teacher/advisor tone 不恶化；\n- P95 文本可见延迟下降；\n- 至少出现可观察的 saved-item reuse。\n\n**局限**\n\n小样本、单语言、无账户、模型依赖、用户可能有新鲜感效应，不能泛化为长期学习成效。\n\n## 为什么它能被追问 20 分钟\n\n可以深入讨论：\n\n- 为什么不主动纠错；\n- 为什么先修生产链而非继续调 Prompt；\n- 如何校准 LLM Judge；\n- 如何区分 Prompt/模型/产品/工程问题；\n- 为什么 3-turn rate 比消息总量更重要；\n- 怎样在不采聊天内容时验证闭环；\n- 如何处理 provider 成本、延迟和失败；\n- 为什么不做 RAG、课程或游戏化；\n- small-N 实验的局限；\n- 一次真实 bad case 如何变成 regression。\n\n这会比“做了一个 AI 日语聊天网站”有说服力得多。\n\n# 12. Next Codex Tasks\n\n暂不执行，按优先级排序。\n\n## Task 1：修复并验证主聊天消息契约\n\n- **目标**：消除当前 user 重复，恢复 Guided 首轮判断。\n- **读取文件**：`app/chat/[npcId]/page.tsx`、`app/api/chat/route.ts`、`scripts/sample-guided-response-traces.local.mjs`、`docs/system-map.md`。\n- **权限**：允许修改。\n- **风险**：高，影响全部聊天。\n- **验收**：最终 messages 只含一次当前 user；free/guided/revisit 三条 payload snapshot 通过。\n\n## Task 2：设计并实现 API 服务端边界\n\n- **目标**：保护 12 个付费/敏感 API。\n- **读取文件**：`app/alpha-access-gate.tsx`、`app/layout.tsx`、全部 `app/api/**/route.ts`、`.env.example`。\n- **权限**：先审计方案，批准后修改。\n- **风险**：高，可能导致线上无法访问。\n- **验收**：signed session、统一 guard、输入上限、role allowlist、部署说明；不暴露 access code。\n\n## Task 3：建立 tracked production-parity Eval Harness\n\n- **目标**：让浏览器、sampler 和 route 使用相同 payload contract。\n- **读取文件**：ChatPage、Chat API、`lib/conversation-scenes.ts`、`docs/eval/*`、当前 local sampler。\n- **权限**：允许修改；默认不得调用真实 API。\n- **风险**：中。\n- **验收**：dry-run 可生成 30 core payload；版本字段完整；targeted regression 可自动失败。\n\n## Task 4：设计 Guided Episode v1\n\n- **目标**：让场景在 3–5 轮内推进并自然收束。\n- **读取文件**：`lib/conversation-scenes.ts`、ChatPage、Chat API、topic-ideas、pre-send、Guided Eval docs。\n- **权限**：先审计/设计，确认后修改。\n- **风险**：高，容易任务化。\n- **验收**：明确 scene/turn/phase/end schema；无评分/通关 UI；12 个 episode cases 通过。\n\n## Task 5：最小行为事件与隐私方案\n\n- **目标**：验证 first-send、3-turn、工具使用和回访。\n- **读取文件**：layout、home、ChatPage、ChatBubble、SavedItems、SessionSummary、README。\n- **权限**：先审计事件 schema，再允许修改。\n- **风险**：中，隐私与数据噪声。\n- **验收**：不采原文/音频；事件字典、触发点、去重、匿名标识与删除策略清楚。\n\n## Task 6：音频可靠性专项\n\n- **目标**：让文本不等语音，修复录音 race、格式与 timeout。\n- **读取文件**：ChatPage、ChatBubble、TTS/STT routes、`lib/volcengine.ts`、`lib/edge-tts.ts`、voice profiles、TTS normalization。\n- **权限**：允许修改。\n- **风险**：高，跨浏览器。\n- **验收**：文本先显示；录音取消安全；Chrome/Safari 格式矩阵；无无限等待；专有词大小写保留。\n\n## Task 7：Storage v2 与隐私清理审计\n\n- **目标**：统一本地数据版本、reset 和 delete-all。\n- **读取文件**：`lib/memory.ts`、`lib/saved-items.ts`、`lib/session-summary.ts`、expression cache、所有 panel。\n- **权限**：先只审计迁移设计，批准后修改。\n- **风险**：高，可能损坏用户旧数据。\n- **验收**：key registry、schema parser、迁移/rollback、export/delete all、reset count 修复。\n\n## Task 8：浏览器真机 UX/Accessibility 审计\n\n- **目标**：验证静态审计无法确认的视觉与交互问题。\n- **读取文件**：首页、ChatPage、所有 drawer/modal、globals.css、manifest。\n- **权限**：只审计；浏览器测试需单独授权。\n- **风险**：低。\n- **验收**：移动/桌面截图证据、首次/Guided/查词/语音任务、键盘焦点、点击区、字号与对比度问题清单。\n\n---\n\n审计执行记录：\n\n- **文件修改**：无。\n- **`docs/system-map.md`**：未更新，因为本次是严格只读审计，没有结构性代码变更。\n- **只读检查**：`pwd`、仓库根目录、分支、status、log、diff、blame、tracked/ignored 文件、目录/文件搜索、UTF-8 源码与文档读取。\n- **未执行**：build、lint、npm install、真实 LLM/TTS/STT 请求、浏览器启动、音频试听。\n- **静态审计限制**：视觉层级、真实声线、发音自然度、真机录音兼容性、线上访问配置、真实留存和学习效果仍需运行验证。\n- **Rollback**：无变更，无需回滚。\n",
  "paths": {
    "explicitEvidenceLinks": [
      "/D:/LucasRan/AI/kotomachi/package.json:5",
      "/D:/LucasRan/AI/kotomachi/app/page.tsx:41",
      "/D:/LucasRan/AI/kotomachi/components/home/scene-entry-section.tsx:144",
      "/D:/LucasRan/AI/kotomachi/components/home/inspiration-section.tsx:54",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:311",
      "/D:/LucasRan/AI/kotomachi/lib/npc.ts:1",
      "/D:/LucasRan/AI/kotomachi/components/home/rumor-entry.tsx:135",
      "/D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:3",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1133",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:603",
      "/D:/LucasRan/AI/kotomachi/lib/llm.ts:211",
      "/D:/LucasRan/AI/kotomachi/app/api/pre-send-expression/route.ts:144",
      "/D:/LucasRan/AI/kotomachi/app/api/feedback/route.ts:934",
      "/D:/LucasRan/AI/kotomachi/components/word-popover.tsx:90",
      "/D:/LucasRan/AI/kotomachi/lib/saved-items.ts:21",
      "/D:/LucasRan/AI/kotomachi/app/api/session-summary/route.ts:1017",
      "/D:/LucasRan/AI/kotomachi/lib/session-summary.ts:68",
      "/D:/LucasRan/AI/kotomachi/lib/memory.ts:207",
      "/D:/LucasRan/AI/kotomachi/app/api/memory/route.ts:266",
      "/D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:37",
      "/D:/LucasRan/AI/kotomachi/lib/tts-voice-profiles.ts:3",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1208",
      "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:346",
      "/D:/LucasRan/AI/kotomachi/app/api/voice-advice/route.ts:480",
      "/D:/LucasRan/AI/kotomachi/app/layout.tsx:36",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:740",
      "/D:/LucasRan/AI/kotomachi/lib/memory.ts:453",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:353",
      "/D:/LucasRan/AI/kotomachi/README.md:85",
      "/D:/LucasRan/AI/kotomachi/docs/homepage-architecture-spec.md:36",
      "/D:/LucasRan/AI/kotomachi/app/page.tsx:88",
      "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:20",
      "/D:/LucasRan/AI/kotomachi/docs/regression-cases.md:395",
      "/D:/LucasRan/AI/kotomachi/docs/development-plan.md:54",
      "/D:/LucasRan/AI/kotomachi/README.md:19",
      "/D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650",
      "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22",
      "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155",
      "/D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504",
      "/D:/LucasRan/AI/kotomachi/app/layout.tsx:39",
      "/D:/LucasRan/AI/kotomachi/docs/experience-log.md:86",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437",
      "/D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213",
      "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249",
      "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265",
      "/D:/LucasRan/AI/kotomachi/app/page.tsx:46",
      "/D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21",
      "/D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96",
      "/D:/LucasRan/AI/kotomachi/lib/memory.ts:493",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210",
      "/D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062",
      "/D:/LucasRan/AI/kotomachi/lib/llm.ts:215"
    ],
    "allCandidates": [
      "/D:/LucasRan/AI/kotomachi/package.json:5",
      "/D:/LucasRan/AI/kotomachi/app/page.tsx:41",
      "/D:/LucasRan/AI/kotomachi/components/home/scene-entry-section.tsx:144",
      "/D:/LucasRan/AI/kotomachi/components/home/inspiration-section.tsx:54",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:311",
      "/D:/LucasRan/AI/kotomachi/lib/npc.ts:1",
      "/D:/LucasRan/AI/kotomachi/components/home/rumor-entry.tsx:135",
      "/D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:3",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1133",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:603",
      "/D:/LucasRan/AI/kotomachi/lib/llm.ts:211",
      "/D:/LucasRan/AI/kotomachi/app/api/pre-send-expression/route.ts:144",
      "/D:/LucasRan/AI/kotomachi/app/api/feedback/route.ts:934",
      "/D:/LucasRan/AI/kotomachi/components/word-popover.tsx:90",
      "/D:/LucasRan/AI/kotomachi/lib/saved-items.ts:21",
      "/D:/LucasRan/AI/kotomachi/app/api/session-summary/route.ts:1017",
      "/D:/LucasRan/AI/kotomachi/lib/session-summary.ts:68",
      "/D:/LucasRan/AI/kotomachi/lib/memory.ts:207",
      "/D:/LucasRan/AI/kotomachi/app/api/memory/route.ts:266",
      "/D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:37",
      "/D:/LucasRan/AI/kotomachi/lib/tts-voice-profiles.ts:3",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1208",
      "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:346",
      "/D:/LucasRan/AI/kotomachi/app/api/voice-advice/route.ts:480",
      "/D:/LucasRan/AI/kotomachi/app/layout.tsx:36",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:740",
      "/D:/LucasRan/AI/kotomachi/lib/memory.ts:453",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:353",
      "/D:/LucasRan/AI/kotomachi/README.md:85",
      "/D:/LucasRan/AI/kotomachi/docs/homepage-architecture-spec.md:36",
      "/D:/LucasRan/AI/kotomachi/app/page.tsx:88",
      "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:20",
      "/D:/LucasRan/AI/kotomachi/docs/regression-cases.md:395",
      "/D:/LucasRan/AI/kotomachi/docs/development-plan.md:54",
      "/D:/LucasRan/AI/kotomachi/README.md:19",
      "/D:/LucasRan/AI/kotomachi/app/alpha-access-gate.tsx:12",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:983",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:765",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:650",
      "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:22",
      "/D:/LucasRan/AI/kotomachi/docs/eval/guided-scenario-response-eval-v10-retrospective.md:155",
      "/D:/LucasRan/AI/kotomachi/lib/conversation-scenes.ts:17",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:504",
      "/D:/LucasRan/AI/kotomachi/app/layout.tsx:39",
      "/D:/LucasRan/AI/kotomachi/docs/experience-log.md:86",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1033",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2437",
      "/D:/LucasRan/AI/kotomachi/app/api/tts/route.ts:118",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1213",
      "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:249",
      "/D:/LucasRan/AI/kotomachi/lib/volcengine.ts:265",
      "/D:/LucasRan/AI/kotomachi/app/page.tsx:46",
      "/D:/LucasRan/AI/kotomachi/components/home/continue-section.tsx:42",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1028",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:21",
      "/D:/LucasRan/AI/kotomachi/lib/saved-items.ts:96",
      "/D:/LucasRan/AI/kotomachi/lib/memory.ts:493",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:224",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:688",
      "/D:/LucasRan/AI/kotomachi/app/api/chat/route.ts:818",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:157",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:1051",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2210",
      "/D:/LucasRan/AI/kotomachi/components/saved-items-panel.tsx:1785",
      "/D:/LucasRan/AI/kotomachi/app/chat/[npcId]/page.tsx:2062",
      "/D:/LucasRan/AI/kotomachi/lib/llm.ts:215",
      "D:\\LucasRan\\AI\\kotomachi",
      "origin/main",
      ".test/.spec",
      "/api/chat",
      "userGoal / possibleBeats / usefulIntents / softLanding",
      "<Analytics />",
      "title/setup",
      "provider/model",
      "turn_milestone_2/3/5",
      "review_started/completed",
      "return_d1/d7",
      "app/chat/[npcId]/page.tsx",
      "app/api/chat/route.ts",
      "scripts/sample-guided-response-traces.local.mjs",
      "docs/system-map.md",
      "app/alpha-access-gate.tsx",
      "app/layout.tsx",
      "app/api/**/route.ts",
      "lib/conversation-scenes.ts",
      "docs/eval/*",
      "lib/volcengine.ts",
      "lib/edge-tts.ts",
      "lib/memory.ts",
      "lib/saved-items.ts",
      "lib/session-summary.ts"
    ]
  },
  "integrity": {
    "markdownChars": 32157,
    "topLevelSections": 12,
    "findings": 15,
    "roadmap72h": 3,
    "roadmap2w": 5,
    "roadmap1m": 5,
    "stopDoing": 12,
    "nextCodexTasks": 8,
    "explicitFilePaths": 66,
    "allPathCandidates": 91
  }
};
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.getOwnPropertyNames(value).forEach(function (key) { deepFreeze(value[key]); });
    return Object.freeze(value);
  }
  Object.defineProperty(window, "KOTOMACHI_AUDIT_DATA", {
    value: deepFreeze(data),
    writable: false,
    configurable: false,
    enumerable: true
  });
})();
