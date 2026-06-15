# Kotomachi / 言街

Kotomachi 是一个低压力的 AI-native 日语输出练习小镇。用户可以和不同 NPC 进行自然日语聊天，支持中英日混输，NPC 用自然日语回应。

Kotomachi is a low-pressure, AI-native Japanese output practice prototype. Users can chat naturally with different NPCs in Japanese, with support for mixed Chinese, English, and Japanese input. NPCs respond in natural Japanese.

## 当前状态 / Current State

Kotomachi 当前处于 **真实使用测试 + 小 bug 收口 + 文档沉淀** 阶段。

Kotomachi is currently in **real-user testing + bug fixing + documentation** phase.

## 核心能力 / Core Features

- **自然日语聊天**：与六位街区角色（美咲、木村、大将、遥、葵、七海）进行低压力对话；支持中日英混合输入，NPC 只用自然日语回应。
- **Expression Hints**：用户消息发送后，可查看三档语气建议（亲近随和 / 普通自然 / 严肃正式），支持播放和分析。
- **表达结构说明 (structureNote)**：当表达包含可复用的日语句型时，提供轻量结构说明（pattern / explanation / examples）。
- **划词查词**：在聊天消息、表达提示、收藏页、回顾卡片等学习文本区域选中词语，可查看读音、释义、上下文和语感说明，并保存到收藏。
- **收藏词管理**：支持复习、记笔记、标注已掌握；已掌握词默认不进入待复习队列；支持筛选和排序；Smart review session（看 5 个、看 10 个、全部待复习）。
- **收藏表达管理**：Expression Hints 中的表达可以收藏，保存原文、建议表达、学习点和结构说明；支持筛选和排序。
- **Review Cards**：根据对话生成回顾卡片，包含聊了什么、可复用表达、建议和新词。
- **语音输入确认发送**：语音识别结果先填入输入框，用户确认或编辑后再手动发送。
- **语音播放控制**：NPC 语音播放中再次点击可停止/暂停；播放另一个音频时自动停止前一个。

## 产品原则 / Product Principles

- **低压力输出优先**：聊天层保持自然，NPC 用轻松的日语接话并继续聊天。
- **NPC 不在主聊天中主动纠错**：学习支持放在独立层，由用户自己决定何时打开。
- **学习资产来自真实对话**：收藏的词语、表达和回顾卡都来自用户真实说过的话。
- **真人交流前的练习层**：为真实交流前的开口、接话提供低压力练习。

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
- `/api/feedback`：Expression Hints 三档表达建议。
- `/api/explain`：词语解释，返回读音、释义、上下文和语感说明。
- `/api/session-summary`：根据对话生成回顾卡。
- `/api/tts`：语音合成。
- `/api/stt`：语音识别。

## 本地开发 / Local Development

```powershell
npm install
copy .env.example .env.local
npm run dev
```

打开： <http://localhost:3000>

## 当前限制 / Current Limitations

- 没有登录系统，数据只保存在浏览器本地。
- 这是一个面向小范围测试的 portfolio MVP / prototype，不是商业化完整产品。

## 公共文档 / Public Docs

- [Development Plan](docs/development-plan.md): 产品范围、当前阶段和后续维护节奏。
- [System Map](docs/system-map.md): 系统导航地图，帮助快速定位功能代码。
- [NPC Prompt Policy](docs/npc-prompt-policy-v0.md): NPC 行为准则。
- [Saved Learning Items Spec](docs/saved-learning-items-spec.md): 收藏系统设计规格。
