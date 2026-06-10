# Kotomachi / 言街

Kotomachi 是一个低压力的 AI-native 日语口语练习 prototype。用户可以用中文、英文、日语或混合输入开始对话，听 NPC 用自然日语回复，并在不把体验变成课堂或考试的前提下，逐步过渡到语音输入。

Kotomachi is a low-pressure, AI-native Japanese speaking practice prototype. Users can start with Chinese, English, Japanese, or mixed-language input, listen to natural Japanese NPC replies, and gradually move toward voice input without turning the experience into a classroom or exam.

它尤其面向已经学过一些日语、但受 JLPT / 自学 / 课堂体系影响而输入强、输出弱的学习者。Kotomachi 把“找日本人线上聊天练口语”这件事转化成一个更低压力、随时可进入的 AI 练习街区：像 LINE 一样和不同关系语境的 NPC 聊几句，把学过的词汇和语法慢慢变成能说出口的日常表达。

It is especially for learners who already know some Japanese, but whose input skills are stronger than their output skills after JLPT-style, self-study, or classroom learning. Kotomachi turns the common advice of "chat with Japanese people online" into a lower-pressure, always-available AI practice town: users can chat with NPCs in a LINE-like flow and gradually turn learned vocabulary and grammar into everyday spoken expression.

## 当前投放状态 / Current Deployment Target

Kotomachi 当前以 **PWA-style mobile web app** 的方式用于自用和少量朋友测试（beta / polish）。

Kotomachi is currently deployed as a **PWA-style mobile web app** for self-use and small friend testing (beta / polish).

- 手机上打开链接后可添加到主屏幕，获得接近 app 的使用体验。
- Open the link on mobile and add it to the home screen for app-like usage.
- 这不是 App Store / Play Store 原生发布版本。
- This is **not** an App Store / Play Store native release.
- 可以通过 alpha access code gate 做小范围测试。
- An alpha access code gate can be enabled for limited testing.
- 当前状态：MVP v1.x 已可用，6 NPC 已接入，小范围 beta / polish 正在进行。
- Current state: MVP v1.x is usable, six NPCs are available, and small beta / polish work is ongoing.

## 核心理念 / Core Ideas

- **低压力输出**：聊天层保持自然，NPC 用轻松的日语接话并继续聊天。
- **Low-pressure output**: The chat layer stays natural. NPC replies in casual Japanese and keeps the conversation going.
- **允许混合输入**：用户可以用日语、英语、中文或混合语言输入；NPC 仍然只用自然日语回复。
- **Mixed-language input is allowed**: Users can type or speak in Japanese, English, Chinese, or mixed language. NPC still replies in natural Japanese.
- **学习支持不打断聊天**：表达提示、划词查词、回顾卡、收藏和翻译都放在独立层里，由用户自己决定何时打开。
- **Learning support should not interrupt conversation**: Expression hints, word explanations, review cards, saved items, and translation live in separate layers. Users choose when to open them.
- **学习资产来自真实对话**：收藏的词语、表达和回顾卡都来自用户真实说过的话，不是预制课程。
- **Learning assets come from real chat context**: Saved words, expressions, and review cards are generated from what users actually said, not from pre-made lessons.
- **真人交流前的练习层**：Kotomachi 不发展陪伴或恋爱路线，而是为真实交流前的开口、接话和冷场恢复提供低压力练习。
- **Practice layer before real conversation**: Kotomachi does not pursue companionship or romance. It focuses on low-pressure practice for opening, continuing, and recovering from pauses before real-world conversation.

## 当前功能 / Current Features

- **Hybrid homepage v1**：雨后街区 hero 氛围层 + scene grouping + horizontal NPC cards + continue last chat + daily inspiration。
- **Hybrid homepage v1**: Rainy-street hero atmosphere layer with scene grouping, horizontal NPC cards, continue last chat, and daily inspiration sections.
- **NPC chat**：六位街区角色——美咲（咖啡馆）、木村（便利店）、大将（居酒屋）、遥（研究室）、葵（学生ラウンジ）、七海（生活支援ラウンジ）——覆盖不同关系语境和说话 register。
- **NPC chat**: Six street people — Misaki (cafe), Kimura (convenience store), Taisho (izakaya), Haruka (lab/campus), Aoi (student lounge), and Nana (life-support lounge) — covering different relationship contexts and speaking registers.
- **Guided Scenarios**：Free Chat 之外的第二种开口方式。用户可以选择一个具体生活小场景（便利店结账、咖啡馆点单、居酒屋点菜、研究室打招呼、生活落地问租房/垃圾分类/手机网络等）开始对话。场景不是课程，不是任务，不评分，不通关。用户可以随时回到随便聊。
- **Guided Scenarios**: A second entry mode alongside Free Chat. Users can choose a concrete life micro-scenario (convenience store checkout, cafe ordering, izakaya ordering, lab greeting, life-support topics like rental costs, garbage sorting, phone/internet, etc.) to start. Scenarios are not lessons, tasks, or scored. Users can return to free chat at any time.
- **Expression hints**：每条用户消息都能看到三档语气建议（casual / neutral / formal），并支持播放和分析。
- **Expression hints**: Three register levels (casual / neutral / formal) for each user message, with audio playback and analysis.
- **Word explanation**：可选中或双击词语查看读音、释义、句子上下文和语感说明。
- **Word explanation**: Select or double-click a word to see reading, meaning, sentence context, and nuance explanation.
- **NPC message translation**：可按需翻译 NPC 回复，但不替换原始日语。
- **NPC message translation**: Optional on-demand translation for NPC replies, without replacing the Japanese original.
- **Review cards**：根据对话生成 session summary 卡片，包含聊了什么、可复用表达、建议和新词。
- **Review cards**: Generate a session summary card from the conversation — what was talked about, reusable expressions, suggestions, and new words.
- **Saved words and expressions**：收藏来自查词和表达提示的学习内容，支持筛选、回顾和删除。
- **Saved words and expressions**: Save items from word explanations and expression hints to a personal collection. Filter, review, and delete them later.
- **Context-aware topic ideas**：`找话题` 分成 opening / continuation 两种 mode。首聊或还没回复 latest welcome 时使用固定 starter；已经进入对话后，AI 会按上下文生成接话建议，失败时 fallback 到 fixed topic pool。
- **Context-aware topic ideas**: `Topic ideas` has opening and continuation modes. It uses fixed starters before the user replies to the latest welcome, then switches to context-aware AI follow-up lines, with fallback to the fixed topic pool.
- **Continue last chat**：快速回到最近聊过的 NPC。
- **Continue last chat**: Quick entry to resume conversations with NPCs you spoke with recently.
- **UI language toggle**：中文 / English 界面切换，日语学习内容保持日语。
- **UI language toggle**: Chinese / English interface. Japanese learning content stays in Japanese.
- **Responsive chat / sidebar**：桌面侧栏和手机抽屉统一管理街区人物、学习资产和回顾卡。
- **Responsive chat / sidebar**: Desktop sidebar and mobile drawer with unified navigation for people in town, learning assets, and review cards.
- **Voice interaction**：NPC 播放 TTS，用户可用 STT 输入，也可以回听自己的语音；标点和大小写会做基础后处理。
- **Voice interaction**: TTS playback for NPC messages and expression samples, plus STT input, user voice replay, and punctuation / casing post-processing.
- **Onboarding / help hints**：轻量引导，覆盖低压力开口、功能发现和 PWA 安装说明。
- **Onboarding / help hints**: Lightweight guidance for low-pressure entry, feature discovery, and PWA install help.
- **NPC life arc system**：每个 NPC 都有持续变化的生活状态，让对话在不同日期之间保持连续感。
- **NPC life arc system**: Each NPC has ongoing life situations that change daily, making conversations feel connected across sessions.
- **Shared world state**：天气和氛围按天变化；所有 NPC 共享同一天，但反应不同。
- **Shared world state**: Weather and atmosphere change daily; all NPCs experience the same day but react differently.

## 后续方向 / Next Direction

当前重点是 beta 稳定和小步 polish，而不是继续堆功能或快速增加大量 NPC。后续会优先打磨短对话练习闭环：更容易开口、更容易接着聊、聊完有一点“我带走了什么”的感觉。

Current focus is beta stabilization and small polish, not adding many features or rapidly expanding the NPC count. The next phase focuses on short speaking loops: easier opening, better continuation, and a light sense of taking something useful from a short conversation.

后续重点包括：完善 NPC scene specs、改善 conversation continuation、强化 Kotomachi 作为一个小型 language town 的一致感。主题阶段感、关系语感和语音建议仍是未来方向，不是当前已完成功能。

Future work includes improving NPC scene specs, conversation continuation, and Kotomachi's coherence as a small language town. Conversation rhythm, relationship-aware suggestions, and voice advice are future directions, not completed features.

## 产品原则 / Product Principles

- 低压力输出优先。
- Low-pressure output first.
- NPC 不在主聊天中主动纠错。
- NPC never corrects in the main chat.
- 聊天层和学习层分离。
- Chat layer and learning layer stay separate.
- 从文字慢慢过渡到语音。
- Transition from text to voice gradually.
- 不做评分、排名或考试式评价。
- No scoring, rankings, or exam-style evaluation.

## 技术栈 / Tech Stack

- Next.js App Router
- React / TypeScript
- Tailwind CSS
- Vercel deployment
- DeepSeek / Volcengine Ark (LLM)
- Volcengine TTS / STT
- Edge-TTS fallback
- LocalStorage

## AI 架构 / AI Architecture

- `/api/chat`：NPC 对话，包含角色行为、memory context 和纯日语输出。
- `/api/chat`: NPC conversation with character behavior, memory context, and pure Japanese output.
- `/api/feedback`：三档表达建议。
- `/api/feedback`: Expression suggestions in three register levels.
- `/api/explain`：查词解释，返回读音、释义、上下文和语感说明。
- `/api/explain`: Word explanation with reading, meaning, context, and nuance.
- `/api/session-summary`：根据对话生成回顾卡。
- `/api/session-summary`: Review card generation from conversation context.
- `/api/tts`：Volcengine 优先，Edge-TTS 兜底。
- `/api/tts`: Speech synthesis with Volcengine priority and Edge-TTS fallback.
- `/api/stt`：按 ja/en/zh 优先级做语音识别和后处理。
- `/api/stt`: Speech recognition with ja/en/zh language priority and post-processing.
- `/api/memory`：给本地 NPC memory 做轻量事实提取。
- `/api/memory`: Lightweight fact extraction for local NPC memory.
- `/api/welcome`：根据历史和记忆生成 initial / revisit greeting。
- `/api/welcome`: Initial / revisit greeting based on recent history and memory.

稳定性说明：provider fallback、request timeout、安全日志、明确的 Node runtime、STT 上传大小限制。

## 本地开发 / Local Development

```powershell
npm install
copy .env.example .env.local
npm run dev
```

打开： [http://localhost:3000](http://localhost:3000)

可选 build 检查：

```powershell
npm run build
```

注意：

- 不要提交 `.env.local`。
- Vercel secrets 放在 Project Settings -> Environment Variables。
- 服务端 key 不要使用 `NEXT_PUBLIC_` 前缀。

## 环境变量 / Environment Variables

| 变量 / Variable | 用途 / Purpose | 是否必需 / Required |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | Primary LLM provider | Recommended |
| `DEEPSEEK_MODEL` | Override default DeepSeek model | Optional |
| `VOLCENGINE_ARK_API_KEY` | Volcengine Ark fallback provider | Recommended |
| `VOLCENGINE_ARK_ENDPOINT_ID` | Volcengine Ark inference endpoint ID | Recommended |
| `VOLCENGINE_ARK_BASE_URL` | Volcengine Ark OpenAI-compatible base URL | Optional |
| `VOLCENGINE_ARK_MODEL` | Backup model when no endpoint ID | Optional |
| `VOLCENGINE_SPEECH_APP_ID` | Volcengine speech app ID | For voice |
| `VOLCENGINE_SPEECH_ACCESS_TOKEN` | Volcengine speech access token | For voice |
| `VOLCENGINE_SPEECH_API_KEY` | Volcengine speech API key (compat) | Optional |
| `VOLCENGINE_SPEECH_CLUSTER` | Volcengine speech cluster | Optional |
| `VOLCENGINE_STT_LANGUAGES` | STT language priority, e.g. `ja,en,zh` | Optional |
| `TTS_PROVIDER` | `auto` / `volcano` / `edge` | Optional |
| `VOLCENGINE_TTS_VOICE_MISAKI` | Misaki voice | Optional |
| `VOLCENGINE_TTS_VOICE_KIMURA` | Kimura voice | Optional |
| `VOLCENGINE_TTS_VOICE_TAISHO` | Taisho voice | Optional |
| `NEXT_PUBLIC_ALPHA_ACCESS_CODE` | Optional small-test access code gate (client-side) | Optional |

## 当前限制 / Current Limitations

- 没有登录系统。
- No login system.
- 没有数据库；memory 只保存在浏览器本地。
- No database; memory is browser-local only.
- 没有生产级 rate limiting。
- No production-grade rate limiting.
- 手机体验已经可用于自用，但还会继续根据 beta feedback 做小修。
- Mobile experience is good enough for self-use, but still gets polish from beta feedback.
- 语音功能依赖外部 TTS / STT provider。
- Voice features depend on external TTS / STT providers.
- Prompt eval 仍然主要靠手动 cases 和 experience logs，而不是自动化测试套件。
- Prompt eval is manual cases and experience logs, not an automated suite.
- 安装说明和 beta 引导目前仍然刻意保持轻量，没有做成复杂流程。
- Some beta access / install guidance is still intentionally lightweight rather than fully automated.
- 这是一个面向小范围测试的 portfolio MVP / prototype，不是商业化完整产品。
- This is a portfolio MVP / prototype ready for small user testing, not a commercial product.

## 公共文档 / Public Docs

- [Development Plan](docs/development-plan.md): 产品范围、当前阶段和后续维护节奏。
- [Saved Learning Items Spec](docs/saved-learning-items-spec.md): 收藏系统设计规格。
- [Experience Log](docs/experience-log.md): 产品观察、诊断、修复和评估案例。
- [Prompt Eval Cases](docs/prompt-eval-cases.md): NPC 与反馈行为的手动回归案例。
