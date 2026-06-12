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
- 当前 Windows Codex 环境中，不运行 `npm run build`。
- Do not run long commands unless the user explicitly asks.
- If a command may take a long time, ask first or provide the exact command for the user to run manually.
- If a command hangs, report it as a possible execution-environment or subprocess-management issue; do not directly infer that the code is broken.
- Avoid touching `.env.local` or printing secrets.
- Do not introduce new dependencies unless the task explicitly requires them.
- Prefer read-only inspection before making changes.

## 当前 Codex 执行限制

- 除非用户给出非常明确的单次授权，否则 Codex 不在本项目中执行 Git 写操作：
  - `git checkout`
  - `git switch`
  - `git branch`
  - `git add`
  - `git commit`
  - `git push`
  - `git reset`
  - `git clean`
- Codex 可以：
  - 修改用户明确要求修改的文件；
  - 运行只读搜索和检查命令；
  - 运行 `git status --short`；
  - 运行 `git diff`；
  - 汇报修改内容；
  - 给出用户可在本机运行的验证命令。
- build、commit、push 通常由用户通过 GitHub Desktop、Trae 或本机终端完成。
- 不修改 `.env.local`。
- 不输出 secrets、access token、API key、Authorization header 或真实环境变量值。

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

## Documentation Language

- 面向项目维护者、用户本人、公开项目复盘和后续 Codex 协作的文档，默认使用中文为主。
- 可以保留必要英文技术名词、路径、命令、case ID、状态字段和标题英文别名。
- 不要把给用户看的项目文档默认写成全英文，除非用户明确要求英文版。
- README 如果面向公开 GitHub 访客，可以中英文结合；内部 docs 默认中文优先。

## System Map / AI Navigation Maintenance

Kotomachi uses `docs/system-map.md` as a lightweight AI navigation map / codegraph-lite.

Before making code changes, identify the relevant feature area and read the smallest related file set from `docs/system-map.md`. Do not scan the whole repository unless the task explicitly requires a cross-cutting review.

Update `docs/system-map.md` when a change affects feature-to-file ownership, API route behavior, UI entry points, shared data flow, stable/risky zones, deferred features, or task context recipes.

Do not duplicate the full system map inside this file. Keep the detailed navigation map in `docs/system-map.md`.

In the final report, state whether `docs/system-map.md` was updated. If it was not updated after a structural change, briefly explain why it was not necessary.

## After Changes Reporting Format

After making changes, report:

1. Files changed.
2. What each file is for.
3. How the user should check the change.
4. Any commands run, excluding sensitive output.
5. Known limitations or follow-up work.
6. Rollback plan when relevant.

Keep reports concise and focused on what changed, why it changed, and how to verify it.
