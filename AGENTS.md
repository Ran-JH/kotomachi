# AGENTS.md

## Project

Kotomachi / 言街 is a Next.js AI-native Japanese speaking practice product.
It is designed for low-pressure output practice: users can start with text,
listen to NPC voice replies, and gradually move toward voice input without
turning the experience into a classroom or exam.

Core product layers:

- Street-map entry with three NPCs.
- LINE-style NPC chat.
- LocalStorage memory and familiarity.
- TTS / STT voice interaction.
- Separate learning aids such as `💡 提案`, word explanations, and future summary cards.

## Product Principles

- Preserve low-pressure Japanese output practice.
- NPC chat must never proactively correct the user.
- Keep the chat layer and teaching layer separate.
- Users may input Chinese, English, Japanese, or mixed language.
- NPC replies in the main chat must remain pure Japanese.
- Learning guidance belongs only in auxiliary layers: `💡 提案`, word lookup, summary cards, or explicitly requested learning UI.
- Do not add database, Auth, WebRTC, Live2D, pronunciation scoring, heavy gamification, or complex RAG unless the user explicitly requests it.
- Prefer small, reversible changes over broad rewrites.
- Do not add features just for technical showmanship if they weaken the current product boundary.

## Command Policy

- This project is developed on Windows.
- Use PowerShell syntax for commands.
- Do not use `&&`; use `;` for command sequencing.
- Do not default to running `npm run build`.
- Do not run long commands unless the user explicitly asks.
- If a command may take a long time, ask first or provide the exact command for the user to run manually.
- If a command hangs, report it as a possible execution-environment or subprocess-management issue; do not directly infer that the code is broken.
- Avoid touching `.env.local` or printing secrets.
- Do not introduce new dependencies unless the task explicitly requires them.
- Prefer read-only inspection before making changes.

## Coding Policy

- Do not modify business code when the task is documentation-only.
- Keep changes scoped to the requested issue.
- Preserve existing UX unless the task explicitly asks to change it.
- Protect the core product rule: NPC chat continues the conversation; teaching feedback stays outside the chat flow.
- Do not expose API keys or server-only environment variables to client code.
- Use LocalStorage for current memory/state needs unless a future task explicitly changes storage architecture.
- Keep API failures non-blocking where possible: TTS, feedback, explain, memory, and welcome failures should not break the main text chat.
- When editing, follow existing TypeScript, Next.js App Router, and Tailwind patterns.
- Avoid large component rewrites unless the user asks for a refactor plan or explicitly approves the scope.
- Do not change `package.json` or dependency versions without explicit instruction.

## After Changes Reporting Format

After making changes, report:

1. Files changed.
2. What each file is for.
3. How the user should check the change.
4. Any commands run, excluding sensitive output.
5. Known limitations or follow-up work.
6. Rollback plan when relevant.

Keep reports concise and focused on what changed, why it changed, and how to verify it.
