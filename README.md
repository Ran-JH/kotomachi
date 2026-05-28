# Kotomachi / 言街

Kotomachi is a low-pressure AI-native Japanese speaking practice app. Chat with neighbors on a quiet Japanese street, get optional expression hints and word explanations, and build a personal collection of learning moments from real conversations.

## Live Demo

[https://kotomachi.vercel.app/](https://kotomachi.vercel.app/)

## Core Ideas

- **Low-pressure output**: The chat flow stays natural. NPC responds in casual Japanese and keeps the conversation going.
- **Mixed-language input is allowed**: Type or speak in Japanese, English, or Chinese. NPC always replies in natural Japanese.
- **Learning support should not interrupt conversation**: Expression hints, word explanations, and review cards live in separate layers. You choose when to look at them.
- **Learning assets are generated from real chat context**: Saved words, expressions, and review cards come from what you actually said, not from pre-made lessons.

## Current Features

- **NPC chat**: Three neighbors — Misaki (cafe), Kimura (convenience store), Taisho (izakaya) — each with their own personality, life arc, and speaking style.
- **Expression hints**: Three register levels (casual / neutral / formal) for each message you send, with audio playback and analysis.
- **Word explanation**: Double-click or select any word to see reading, meaning, sentence context, and nuance explanation.
- **Review cards**: Generate a session summary card from your conversation — what you talked about, good expressions, suggestions, and new words.
- **Saved words and expressions**: Save items from word explanations and expression hints to a personal collection. Filter, review, and delete.
- **UI language toggle**: Chinese / English interface. Japanese learning content stays in Japanese.
- **Responsive chat / sidebar**: Desktop sidebar and mobile drawer with unified navigation for residents, learning assets, and review cards.
- **Voice interaction**: TTS playback for NPC messages and expression samples. STT input with post-processing for punctuation and casing.
- **NPC life arc system**: Each NPC has ongoing life situations that change daily, making conversations feel connected across sessions.
- **Shared world state**: Weather and atmosphere change daily; all NPCs experience the same day but react differently.

## Product Principles

- Low-pressure output first.
- NPC never corrects in the main chat.
- Chat layer and learning layer are separate.
- Transition from text to voice gradually.
- No scoring, rankings, or exam-style evaluation.

## Tech Stack

- Next.js App Router
- React / TypeScript
- Tailwind CSS
- Vercel deployment
- DeepSeek / Volcengine Ark (LLM)
- Volcengine TTS / STT
- Edge-TTS fallback
- LocalStorage

## AI Architecture

- `/api/chat`: NPC conversation with character behavior, memory context, and pure Japanese output.
- `/api/feedback`: Expression suggestions in three register levels.
- `/api/explain`: Word explanation with reading, meaning, context, and nuance.
- `/api/session-summary`: Review card generation from conversation context.
- `/api/tts`: Speech synthesis with Volcengine priority and Edge-TTS fallback.
- `/api/stt`: Speech recognition with ja/en/zh language priority and post-processing.
- `/api/memory`: Lightweight fact extraction for local NPC memory.
- `/api/welcome`: Cold-start greeting based on recent history and memory.

Stability: provider fallback, request timeout, safe error logging, explicit Node runtime, STT upload size limit.

## Local Development

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Open: [http://localhost:3000](http://localhost:3000)

Optional build check:

```powershell
npm run build
```

Notes:

- Do not commit `.env.local`.
- Vercel secrets go in Project Settings -> Environment Variables.
- Server-side keys must not use `NEXT_PUBLIC_`.

## Environment Variables

| Variable | Purpose | Required |
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

## Current Limitations

- No login system.
- No database; memory is browser-local only.
- No production-grade rate limiting.
- Mobile experience still being improved.
- Voice features depend on external TTS / STT providers.
- Prompt eval is manual cases and experience logs, not an automated suite.
- This is a portfolio MVP / prototype ready for small user testing, not a commercial product.

## Public Docs

- [Development Plan](docs/development-plan.md): Product scope and phased development plan.
- [Saved Learning Items Spec](docs/saved-learning-items-spec.md): Design spec for the saved items system.
- [Experience Log](docs/experience-log.md): Product observations, diagnoses, fixes, and eval cases.
- [Prompt Eval Cases](docs/prompt-eval-cases.md): Manual regression cases for NPC and feedback behavior.
