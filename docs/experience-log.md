# Experience Log / 体验日志

## 用途

这个文件用于记录 Kotomachi / 言街 在真实使用、演练和 beta 反馈中观察到的关键问题、判断、修复和公开复盘材料。

它不是流水账，也不是个人简历草稿。重点是把模糊的体验感受整理成可执行的产品和工程记录。

不要记录真实用户隐私。若某条记录来自自测或演练场景，请明确标注。

## 推荐模板

```md
## YYYY-MM-DD - 简短标题
- Source: real use / demo / internal review
- NPC:
- Input mode: text / voice / mixed
- User input:
- NPC reply:
- Feature area: Chat / Feedback / Explain / TTS / STT / Memory / Homepage / Mobile
- Problem type:
- Observation:
- Diagnosis:
- Fix:
- Eval case:
- Public note:
- Severity: Low / Medium / High
- Status: Open / Fixed / Needs eval / Won't fix
```

## Problem categories

- NPC 在主聊天中过于像老师，主动纠错或讲解语言点。
- NPC 回答混入非日语内容。
- 回答过长、过正式，偏离 LINE 风格。
- 混合语言输入处理得不自然。
- `💡 提案` 过密、过像批改作业。
- 划词解释不清楚、过度技术化，或者把整句当成词义。
- TTS / STT 失败时缺少温和降级。
- LocalStorage 记忆显得错误、过时或过强。
- 移动端 / PWA 布局难用。
- 回顾卡片缺少可追溯证据链。

## Current stage note

### 2026-06-02 - MVP stabilization and roadmap reset
- Source: internal status update / public docs sync
- Feature area: cross-project docs / roadmap
- Observation: Kotomachi has already crossed into MVP v1 usable, mobile self-use ready, and a small external beta has started.
- Diagnosis: public docs should not keep reading like an early prototype plan.
- Fix: align README, development plan, and homepage architecture docs with the current stage.
- Public note: the current focus is stability, small maintenance blocks, and gradual content expansion rather than another large rewrite.
- Severity: Low
- Status: Fixed

### 2026-06-02 - Welcome prompt initial / revisit boundary
- Source: internal review
- Feature area: NPC welcome flow
- Observation: initial welcome must feel like a fresh scene entry, not a revisit.
- Diagnosis: generic revisit wording can leak into fresh welcomes if the prompt is not split clearly.
- Fix: separate initial and revisit tone rules, and keep NPC self-name out of the message opening.
- Public note: initial welcome should sound like entering a shop or scene, not like returning to a relationship-style companion chat.
- Severity: Low
- Status: Fixed

### 2026-06-02 - Audio playback hardening
- Source: external beta feedback
- Feature area: TTS / UX
- Observation: repeated play clicks can produce overlapping playback or echo-like first-play issues.
- Diagnosis: loading / playing state and audio cleanup need stricter control.
- Fix: guard repeated clicks, manage a single current audio ref, and recover cleanly on `audio.play()` reject.
- Public note: voice playback is optional, but the first-use experience still needs to feel stable.
- Severity: Medium
- Status: Open / Watchlist

### 2026-06-02 - PWA / mobile beta usability
- Source: mobile self-use and small beta feedback
- Feature area: Homepage / Mobile / PWA
- Observation: mobile and PWA usage is already practical, but install guidance, panel close paths, and input ergonomics need lightweight polish.
- Diagnosis: the product is usable, but the docs should not overpromise polished app-store-level behavior.
- Fix: keep guidance lightweight, keep limitations explicit, and continue small mobile polish.
- Public note: mobile self-use is a real target now, not just a future goal.
- Severity: Low
- Status: Fixed / Watch

## Public note guidance

- When a problem repeats across two or three sessions, document it here before turning it into a prompt or UI fix.
- Keep one entry per clearly separable issue.
- Prefer one concrete eval case over a long paragraph.
- If a problem is intentionally left unresolved, say so directly.

## 2026-06-02 - Word lookup partial selection correction
- Source: real use / internal review
- NPC: Misaki
- Input mode: text
- Feature area: Word Explanation / Saved Items / Review Cards
- Problem type: selected text normalization
- Observation: When selecting only part of a Japanese word, e.g. ���ƥޥ� inside �����ƥޥ�ζ�, the explanation could infer the right meaning from context, but the saved word remained incomplete.
- Diagnosis: API explanation and saved lookup data used different notions of the lookup term; saving still relied on raw selectedText.
- Fix: Let /api/explain return a corrected lookup term based on sourceSentence, and use that term for display, Saved Items, and recent lookup history.
- Eval case: Selecting ���ƥޥ� in ���դϥ����ƥޥ�ζ�����������Ǥ��� should display and save �����ƥޥ�, not ���ƥޥ�.
- Public note: Word lookup now better handles imperfect text selection, which is common on mobile and in real reading flow.
- Severity: Medium
- Status: Fixed / Needs eval

## 2026-06-02 - Context-aware topic ideas for cold moments
- Source: external beta feedback
- Feature area: Chat / Topic Ideas
- Observation: A beta tester reported that NPC chats can reach a cold moment where they do not know what to say next. Existing topic ideas were visible, but many prompts still behaved like fixed opening starters.
- Diagnosis: Fixed starter pools cannot reliably adapt to the current conversation context, especially after the user and NPC have already discussed a concrete topic.
- Fix: Add context-aware topic ideas that generate short user-side continuation lines from recent chat messages, while keeping fixed starters as fallback.
- Eval case: In an ongoing Misaki chat about rain, coffee, and グアテマラの豆, opening topic ideas should suggest lines about taste, recommendations, ordering, or the cafe atmosphere, not only generic opening prompts.
- Public note: Topic ideas now better support low-pressure continuation when a chat reaches a cold moment.
- Severity: Medium
- Status: Fixed / Needs eval

## 2026-06-02 - Haruka NPC for study-abroad and campus talk
- Source: friend beta feedback / internal product planning
- Feature area: NPC expansion / homepage / chat
- Observation: A tester preparing for study abroad wanted a low-pressure NPC for graduate-school, lab, and campus conversation, not another shopkeeper and not a teacher-like character.
- Diagnosis: The current three NPCs cover daily-life, convenience-store, and izakaya talk well, but do not cover campus / seminar / lab Japanese or asking a senior for help.
- Fix: Add `haruka` as a grad-school senpai NPC with a dedicated campus scene, starter prompts, welcome tone, life arcs, and homepage entry.
- Eval case: On the homepage, `Study Abroad & Campus` should appear as a separate scene, and opening Haruka chat should feel like talking to a reliable senpai rather than a professor or language teacher.
- Public note: This NPC is meant to support study-abroad and academic-life Japanese while keeping the chat short, natural, and low-pressure.
- Severity: Medium
- Status: Fixed / Needs eval