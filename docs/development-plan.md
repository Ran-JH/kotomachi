# Kotomachi / 言街 后续开发计划

> 用途：记录当前产品阶段、已完成里程碑、近期优先级，以及公开 roadmap / maintenance 口径。
> 原则：保留当前状态判断，避免把已实现功能继续写成“纯计划”。

---

## 0. Current Status / 当前阶段

Kotomachi 当前处于 **真实使用测试 + 小 bug 收口 + 文档同步** 阶段。

- [x] 可以运行
- [x] 可以自用
- [x] 可以给少量朋友测试
- [x] 核心聊天与学习辅助闭环已形成
- [x] 多个街上人物与场景入口已成型
- [x] Memory System v0 已落地到可见、可删、可控层

这不是正式大规模商业上线状态。
当前更接近：**产品边界逐步稳定，持续做 QA 和坏例收集。**

---

## 1. Done / 已完成

### 1.1 Chat + learning baseline

- [x] 首页与场景入口
- [x] NPC 聊天主链路
- [x] mixed-language input
- [x] NPC 主回复保持日语
- [x] topic ideas / response support
- [x] TTS / STT 基础可用
- [x] review cards / saved items 基础能力

### 1.2 Guided scenarios

- [x] Free Chat + Guided Scenario 双入口
- [x] 首页日常小场景入口
- [x] scene query launch
- [x] NPC-first opening
- [x] sample user line prefill

### 1.3 Saved words / saved expressions

- [x] Saved words review v0
- [x] saved expressions basic management
- [x] expression hint structure note
- [x] selectable lookup across learning text

### 1.4 Memory System v0

- [x] per-NPC localStorage memories
- [x] memory utility helpers
- [x] current NPC memory panel
- [x] panel 内 all-residents memory view
- [x] inline clear confirmation polish
- [x] curator-style extraction flow
- [x] safe prompt injection
- [x] memory terminology polish

---

## 2. Memory System v0 — Implemented, in QA

Current status:

- per-NPC visible memory panel implemented;
- all-residents view implemented inside panel;
- `/memories` route retained, but no longer primary entry;
- curator-style extraction implemented;
- `/api/memory` supports `ignore` / `add` / `replace`;
- safe prompt injection implemented;
- terminology and inline clear confirmation polished.

What v0 currently means:

- visible durable memories only;
- local per-NPC control, not global user memory;
- delete and clear are supported;
- manual add/edit is still intentionally not supported;
- storage remains `kotomachi_facts_${npcId}: string[]`.

Next:

- real conversation QA;
- bad-case collection;
- check whether curator misses good long-term signals;
- verify that temporary food / shopping / weather fragments stay out of memory;
- decide later whether schema v1 is needed.

---

## 3. Next / 下一阶段

### 3.1 High-priority QA and polish

- [ ] 真实对话 QA
- [ ] bad case collection
- [ ] memory curator 命中率与误杀率观察
- [ ] 小范围 bugfix
- [ ] 移动端体验复查
- [ ] 文档继续收敛到当前实现状态

### 3.2 Product boundary protection

- [ ] 持续压住 AI 恋人化漂移
- [ ] 持续压住教学层侵入主聊天层
- [ ] 持续压住 memory 变成聊天流水账

---

## 4. Deferred / 暂缓

- [ ] global user memory
- [ ] cross-NPC memory sharing
- [ ] account / cloud sync
- [ ] manual memory add/edit
- [ ] schema migration for memory v1
- [ ] vector database / RAG-style memory search
- [ ] affection score / intimacy level / romance route
- [ ] 大范围 prompt 重写
- [ ] 为了技术展示而加的重型系统

---

## 5. Current Product Judgment / 当前产品判断

Kotomachi 的核心不是把系统做得越来越重，而是把“低压力开口”做得越来越顺。

当前最值得继续守住的是：

- 聊天层和教学层分开；
- memory 帮助下次更自然，而不是制造关系压力；
- 多个街上人物代表不同生活语境，而不是多皮肤聊天机器人；
- 用户可以短短说几句，也能感觉自己完成了一次表达练习。

---

## 6. Future Candidates / 后续可探索方向

不是立即要做，只是保留方向：

- memory schema v1：`id / type / source / createdAt / updatedAt`
- visible durable memory 与 temporary per-NPC context summary 分层
- memory debug / curator review mode
- 更系统化的 memory bad-case 数据集
- 更细的 per-NPC shared-history handling
