# Kotomachi / 言街

Kotomachi 是一个低压力的 AI-native 日语口语练习产品。用户可以用中文、英文、日语或混合输入开始对话，听 NPC 用自然日语回复，并在不把体验变成课堂或考试的前提下，逐步过渡到语音输入。

Kotomachi is a low-pressure, AI-native Japanese speaking practice app. Users can start with Chinese, English, Japanese, or mixed-language input, listen to natural Japanese NPC replies, and gradually move toward voice input without turning the experience into a classroom or exam.

## 当前投放状态 / Current Deployment Target

Kotomachi 当前以 **PWA-style mobile web app** 的方式用于自用和少量朋友测试（alpha）。

Kotomachi is currently deployed as a **PWA-style mobile web app** for self-use and small friend testing (alpha).

- 手机上打开链接后可添加到主屏幕，获得接近 app 的使用体验。
- Open the link on mobile and add it to the home screen for app-like usage.
- 这不是 App Store / Play Store 原生发布版本。
- This is **not** an App Store / Play Store native release.
- 可以通过 alpha access code gate 做小范围测试。
- An alpha access code gate can be enabled for limited testing.
- 当前状态：MVP v1 已可用，手机自用已可用，小范围外测已经开始。
- Current state: MVP v1 is usable, mobile self-use is ready, and a small external beta has started.

## 核心理念 / Core Ideas

- **低压力输出**：聊天层保持自然，NPC 用轻松的日语接话并继续聊天。
- **Low-pressure output**: The chat layer stays natural. NPC replies in casual Japanese and keeps the conversation going.
- **允许混合输入**：用户可以用日语、英语、中文或混合语言输入；NPC 仍然只用自然日语回复。
- **Mixed-language input is allowed**: Users can type or speak in Japanese, English, Chinese, or mixed language. NPC still replies in natural Japanese.
- **学习支持不打断聊天**：表达提示、划词查词、回顾卡、收藏和翻译都放在独立层里，由用户自己决定何时打开。
- **Learning support should not interrupt conversation**: Expression hints, word explanations, review cards, saved items, and translation live in separate layers. Users choose when to open them.
- **学习资产来自真实对话**：收藏的词语、表达和回顾卡都来自用户真实说过的话，不是预制课程。
- **Learning assets come from real chat context**: Saved words, expressions, and review cards are generated from what users actually said, not from pre-made lessons.

## 当前功能 / Current Features

- **Hybrid homepage v1**：雨后街区 hero 氛围层 + 结构化 scene/NPC 入口 + continue last chat + daily inspiration。
- **Hybrid homepage v1**: Rainy-street hero atmosphere layer with structured scene/NPC entry, continue last chat, and daily inspiration sections.
- **NPC chat**：三位街区角色——美咲（咖啡馆）、木村（便利店）、大将（居酒屋）——各自有不同性格、life arc 和说话风格。
- **NPC chat**: Three street people — Misaki (cafe), Kimura (convenience store), Taisho (izakaya) — each with their own personality, life arc, and speaking style.
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
- **Topic ideas**：首聊 starter prompts + action menu 话题灵感，降低“不知道说什么”的门槛。
- **Topic ideas**: First-chat starter prompts plus action-menu topic ideas to reduce “I don’t know what to say” friction.
- **Continue last chat**：快速回到最近聊过的 NPC。
- **Continue last chat**: Quick entry to resume conversations with NPCs you spoke with recently.
- **UI language toggle**：中文 / English 界面切换，日语学习内容保持日语。
- **UI language toggle**: Chinese / English interface. Japanese learning content stays in Japanese.
- **Responsive chat / sidebar**：桌面侧栏和手机抽屉统一管理街区人物、学习资产和回顾卡。
- **Responsive chat / sidebar**: Desktop sidebar and mobile drawer with unified navigation for people in town, learning assets, and review cards.
- **Voice interaction**：NPC 播放 TTS，用户可用 STT 输入；标点和大小写会做基础后处理。
- **Voice interaction**: TTS playback for NPC messages and expression samples, plus STT input with punctuation / casing post-processing.
- **Onboarding / help hints**：轻量引导，覆盖低压力开口、功能发现和 PWA 安装说明。
- **Onboarding / help hints**: Lightweight guidance for low-pressure entry, feature discovery, and PWA install help.
- **Recent polish**：Word lookup partial selection correction、Audio playback hardening、Mobile beta usability fixes。
- **Recent polish**: Word lookup partial selection correction, audio playback hardening, and mobile beta usability fixes.
- **NPC life arc system**：每个 NPC 都有持续变化的生活状态，让对话在不同日期之间保持连续感。
- **NPC life arc system**: Each NPC has ongoing life situations that change daily, making conversations feel connected across sessions.
- **Shared world state**：天气和氛围按天变化；所有 NPC 共享同一天，但反应不同。
- **Shared world state**: Weather and atmosphere change daily; all NPCs experience the same day but react differently.

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
