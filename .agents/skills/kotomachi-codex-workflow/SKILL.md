---
name: kotomachi-codex-workflow
description: Use this skill when modifying the Kotomachi project, especially for safe code changes, UI polish, bug fixes, QA case updates, documentation boundaries, and short prompt workflows.
---

# Kotomachi Codex Workflow

## When to use this skill

Use this skill for any Kotomachi code or documentation task, especially:

- Bug fixes
- UI polish
- LLM behavior changes
- Regression case maintenance
- Public/private docs boundary checks
- Short prompt workflows after project rules have been documented

## Project safety rules

- Do not modify `.env.local`.
- Do not expose secrets.
- Do not modify `package.json` or `package-lock.json` unless explicitly requested.
- Do not touch `docs/private/`.
- Do not run `npm install`.
- Do not run `npm run build` unless explicitly requested.
- Do not run `git add`, `git commit`, or `git push` unless the user explicitly asks.
- Avoid large unrelated refactors.
- Prefer minimal targeted changes.
- Never invent screenshots, production claims, user numbers, or private interview materials.

## Required first checks

Before editing:

1. Run `git status --short`.
2. Identify expected modified files.
3. Read relevant docs before changing behavior.
4. For LLM behavior work, read `docs/prompt-eval-cases.md`.
5. For bug/UI regression work, read `docs/regression-cases.md`.
6. For workflow rules, read `docs/qa-workflow.md`.
7. For session summary work, read `docs/session-summary-spec.md`.
8. Confirm `docs/private/` is not touched.

## Change workflow

1. Inspect before editing.
2. Make minimal targeted changes.
3. Preserve existing product principles.
4. Do not change API, prompt, data structure, package, env, or private docs unless the task explicitly requires it.
5. Keep product operation UI in Chinese/English when relevant; Japanese remains learning content or atmosphere.
6. For UI language toggle work, only translate fixed UI copy, not NPC replies, user messages, or AI-generated learning content.
7. For summary cards, preserve evidence-based summary principles.

## QA documentation rule

- Product, UI, state, storage, TTS, or STT regressions go to `docs/regression-cases.md`.
- LLM output behavior or prompt quality issues go to `docs/prompt-eval-cases.md`.
- If no docs update is needed, explain why.
- Never touch `docs/private/`.
- Every task report must include whether regression docs and prompt eval docs were updated.

## Public/private docs boundary

- `README.md` and public docs may describe product, architecture, roadmap, eval templates, and regression cases.
- `docs/private/` is for interview notes, resume bullets, job strategy, and private career materials.
- Do not read, summarize, move, or modify `docs/private/`.
- If `docs/private/` appears tracked, report it and recommend `git rm --cached -r docs/private`, but do not execute it unless explicitly asked.

## Git rule

- Do not commit or push unless the user explicitly asks.
- Prefer user-controlled GitHub Desktop for commits and pushes.
- If asked to provide Git instructions, include both GitHub Desktop steps and terminal fallback.
- If git errors occur, stop and report the exact error; do not retry repeatedly.

## Required report format

Every task must end with:

1. Modified files
2. What changed
3. What was not changed
4. API / prompt / package / env changed: yes/no
5. Private docs touched: no
6. Manual test steps
7. Regression docs updated: yes/no + reason
8. Prompt eval docs updated: yes/no + reason
9. git diff summary
10. Recommended commit message
