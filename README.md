# Kotomachi / 言街

一个 AI-native 日语口语练习应用：低压力输出、NPC 日常聊天、可选学习反馈。

## Live Demo

[https://kotomachi.vercel.app/](https://kotomachi.vercel.app/)

## Overview

Kotomachi / 言街 是一个已部署的日语口语练习 MVP。用户进入一条安静的日式街角，选择三位 NPC 中的一位，通过 LINE 风格的日常聊天进行练习。

主聊天流保持自然、轻量、低压力。NPC 用日语接话并延续对话；表达建议、划词解释等学习功能放在独立辅助层中，由用户主动打开。

## Why I Built This

很多日语学习者能阅读、能打字，但一到口语输出就会犹豫。传统语言学习工具经常强调纠错、分数或教材任务，容易让输出变得更有压力。

Kotomachi 尝试的是另一种交互方式：先让用户说出来或打出来，再在用户需要时提供温和的表达反馈。

## Core Features

- 街角地图首页：咖啡馆、便利店、居酒屋三个 NPC 入口。
- 三位 NPC 聊天对象：美咲、木村、大将。
- LINE 风格聊天界面，适合短句日常对话。
- 支持中文 / 英文 / 日文混合输入，NPC 用自然日语回应。
- 支持 NPC 回复和建议表达的 TTS 播放。
- 支持 STT 语音输入，并处理 no-speech 空语音场景。
- 支持用户语音回放，用于听回自己的原始录音。
- `表現ヒント`：カジュアル / ふつう / フォーマル三档表达建议。
- 划词解释浮窗：查看读音、含义、整句语境和语感说明。
- 基于 LocalStorage 的轻量聊天记录、熟悉度和本地记忆。
- 已部署到 Vercel。

## Product Principles

- 低压力输出优先。
- NPC 不在主聊天中主动纠错。
- 聊天层和学习反馈层分离。
- 让用户从文字输入逐步过渡到语音输入。
- 当前 MVP 不做发音分数、排名或考试化评价。

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Vercel
- DeepSeek / Volcengine Ark
- Volcengine TTS / STT
- Edge-TTS fallback
- LocalStorage

## AI Architecture

- `/api/chat`：NPC 对话、角色行为、记忆上下文和纯日语回复。
- `/api/feedback`：表达建议，提供カジュアル / ふつう / フォーマル三档替代表达。
- `/api/explain`：划词解释，返回读音、含义、整句语境和语感说明。
- `/api/tts`：语音合成，优先使用火山 TTS，并支持 fallback。
- `/api/stt`：语音识别，支持 ja / en / zh 识别优先级。
- `/api/memory`：轻量事实提取，用于本地 NPC 记忆。
- `/api/welcome`：根据近期历史和记忆生成冷启动欢迎语。

稳定性处理包括 provider fallback、请求 timeout、日志安全收敛、API route 显式声明 Node runtime，以及 STT 上传大小限制。

## Local Development

```powershell
npm install
copy .env.example .env.local
npm run dev
```

打开：

[http://localhost:3000](http://localhost:3000)

可选的本地构建检查：

```powershell
npm run build
```

说明：

- 不要提交 `.env.local`。
- Vercel secrets 在 Project Settings -> Environment Variables 中配置。
- 服务端 key 不要使用 `NEXT_PUBLIC_` 暴露到客户端。

## Environment Variables

| 变量 | 用途 | 是否必需 |
| --- | --- | --- |
| `DEEPSEEK_API_KEY` | 主 LLM provider | 推荐 |
| `DEEPSEEK_MODEL` | 覆盖默认 DeepSeek 模型 | 可选 |
| `VOLCENGINE_ARK_API_KEY` | 火山方舟 fallback provider | 推荐 |
| `VOLCENGINE_ARK_ENDPOINT_ID` | 火山方舟推理接入点 ID | 推荐 |
| `VOLCENGINE_ARK_BASE_URL` | 火山方舟 OpenAI 兼容接口地址 | 可选 |
| `VOLCENGINE_ARK_MODEL` | 未使用 Endpoint ID 时的备用模型字段 | 可选 |
| `VOLCENGINE_SPEECH_APP_ID` | 火山语音 App ID | 语音功能需要 |
| `VOLCENGINE_SPEECH_ACCESS_TOKEN` | 火山语音 Access Token | 语音功能需要 |
| `VOLCENGINE_SPEECH_API_KEY` | 火山语音 API Key 兼容字段 | 可选 |
| `VOLCENGINE_SPEECH_CLUSTER` | 火山语音集群 | 可选 |
| `VOLCENGINE_STT_LANGUAGES` | STT 识别语言优先级，如 `ja,en,zh` | 可选 |
| `TTS_PROVIDER` | `auto` / `volcano` / `edge` | 可选 |
| `VOLCENGINE_TTS_VOICE_MISAKI` | 美咲声线 | 可选 |
| `VOLCENGINE_TTS_VOICE_KIMURA` | 木村声线 | 可选 |
| `VOLCENGINE_TTS_VOICE_TAISHO` | 大将声线 | 可选 |

## Current Limitations

- 没有登录系统。
- 没有数据库；记忆只保存在当前浏览器本地。
- 暂无生产级防滥用或 rate limiting。
- 移动端体验仍在持续优化。
- 语音功能依赖外部 TTS / STT provider。
- Prompt eval 目前基于手动 cases 和 experience logs，还不是完整自动化 eval suite。
- 这是作品集 MVP，不是成熟商业产品。

## Roadmap

- 练习后的 summary cards。
- `表現ヒント` Drawer 化。
- 基于 experience log 的 prompt eval 工作流。
- 继续优化移动端体验。
- 聊天页代码拆分和 hook 抽象。
- 为核心行为补充最小测试和 prompt eval cases。

## Public Docs

- [Experience Log](docs/experience-log.md)：记录产品观察、诊断、修复和 eval cases。
- [Prompt Eval Cases](docs/prompt-eval-cases.md)：NPC 和 feedback 行为的手动回归用例。
- [Development Plan](docs/development-plan.md)：产品边界和阶段性开发计划。
