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

### 2026-06-03 - Haruka NPC for study-abroad and campus scenes
- Source: beta feedback / content expansion
- Feature area: NPC / Scene / Study-abroad
- Observation: Users needed a low-pressure campus/lab conversation partner for study-abroad situations.
- Diagnosis: The existing three NPCs (cafe, convenience store, izakaya) covered daily life but not academic/campus scenarios.
- Fix: Added Haruka/遥 as the 4th NPC — a grad-school senpai who speaks light polite Japanese, focused on lab, seminar, and campus daily life.
- Public note: Haruka fills the gap for study-abroad conversation practice without being a professor or consultant.
- Severity: Low
- Status: Fixed

### 2026-06-03 - Homepage horizontal cards for scalable NPC expansion
- Source: product design / maintainability
- Feature area: Homepage / Layout / Mobile
- Observation: Adding more NPCs would break the previous vertical layout.
- Diagnosis: A grid or list layout wouldn't scale well for scene-based NPC grouping.
- Fix: Implemented horizontal scroll cards within scene sections — SceneEntrySection, InspirationSection, and ContinueSection now use overflow-x-auto for better scalability.
- Public note: The homepage now supports adding more scenes and NPCs without major layout rewrites.
- Severity: Low
- Status: Fixed

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

### 2026-06-04 - Aoi NPC spec and implementation
- Source: beta feedback / NPC expansion
- Feature area: NPC / Homepage / Campus daily life
- Observation: The product needed a same-age friend NPC for casual hobby talk and low-pressure タメ口, distinct from Haruka's senpai tone.
- Diagnosis: The existing four NPCs covered cafe, convenience store, izakaya, and grad-school senpai scenes, but not same-age campus friendship.
- Fix: Added Aoi / 葵 as the 5th NPC, focused on after-class shared spaces, hobby small talk, soft invitations, and natural casual Japanese.
- Public note: Aoi expands Kotomachi's campus layer without turning it into romance, club recruitment, or teacher-style chat.
- Severity: Low
- Status: Fixed

### 2026-06-04 - Roadmap recalibration after 5-NPC beta
- Source: internal product review / design plugin discussion
- Feature area: Product direction / Roadmap / Portfolio
- Problem type: scope control and learning-loop clarity
- Observation: After adding Haruka and Aoi, Kotomachi now covers five distinct relationship/register contexts. The next risk is not missing features, but losing focus by adding more systems or more NPCs too quickly.
- Diagnosis: The product should focus on making short conversations feel complete: easier opening, better continuation, and a light sense of having expressed something, rather than becoming a task-based learning app.
- Decision: Prioritize beta stabilization, NPC scene spec consolidation, light conversation rhythm, stronger town feeling, relationship-aware expression design, failure-friendly experience, and a golden demo path. Keep One Takeaway, learning preferences, feedback button, and voice advice deferred.
- Public note: Kotomachi's next phase focuses on polishing short, low-pressure speaking loops across different relationship contexts inside a more coherent language town.
- Severity: Low
- Status: Planned
