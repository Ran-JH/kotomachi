# Kotomachi Memory System v0

## 1. Product purpose

The memory system exists to increase the user's willingness to speak again.

When an NPC remembers relevant things from past conversations, the user feels they are talking to a familiar practice partner instead of restarting from zero every time.

The goal is friendship-like familiarity, not romance, dependence, exclusivity, or emotional possession.

核心目标：让用户更愿意再次开口。

NPC 记住用户，是为了降低表达门槛，让下次对话更自然。

这是一种“熟悉的练习伙伴”关系，不是 AI 恋人关系。

对 Kotomachi 来说，memory 不是为了做“更会演的角色扮演”，而是为了让用户感到：

- 这个住民记得我一点点；
- 我不用每次都从零开始解释自己；
- 我可以更自然地继续说下去。

## 2. Design references

ChatGPT-like principles:

- memory is derived from conversations, not raw chat logs;
- memory can be used in future replies;
- memory should be user-visible and manageable;
- users should be able to delete memory;
- memory should not preserve every detail;
- memory should distinguish durable facts from temporary context.

Kotomachi adaptation:

- memory is per-NPC, not global;
- each NPC remembers only what was shared with that NPC;
- memories support language practice and conversation continuity;
- no affection score, romance route, intimacy level, dependency loop, or exclusive relationship language.

Fable-like storage inspiration:

- use derived memories, not full chat transcripts;
- use key-value storage;
- use hierarchical keys;
- batch related data when practical;
- include reset/delete paths;
- handle missing or invalid storage gracefully.

补充原则：

- memory 是“对真实聊天的提炼结果”，不是“完整聊天记录的另一个名字”；
- memory 要短、小、可控，不能把系统推向沉重的长期人格画像；
- Kotomachi 继续坚持低压练习，不把 memory 做成关系养成系统。

## 3. Current implementation

Kotomachi 已经不是从零开始做 memory。当前已有 hidden per-NPC facts system，可视为 memory v0-pre。

Current localStorage keys:

- `kotomachi_facts_${npcId}`: `string[]`, max 10
- `kotomachi_history_${npcId}`: `StoredMessage[]`, max 20
- `kotomachi_last_time_${npcId}`: `number`
- `kotomachi_count_${npcId}`: `number`

Current injection:

- chat API reads NPC facts and injects them into system prompt.

Current extraction:

- client calls memory extraction after user messages;
- welcome API can also analyze history and merge facts.

Current deletion:

- reset chat clears chat data and facts together;
- no single-memory deletion;
- no memory-only clearing.

根据当前代码审计，可确认：

- 每个 NPC 都有独立 `facts`；
- 每个 NPC 都有独立 chat history；
- 每个 NPC 都有独立 conversation count；
- `facts` 已经会进入 chat system prompt；
- welcome API 已经会基于 history 提取/合并 facts；
- chat page 当前只有“重开这段对话”，没有“查看/删除某条 memory”的入口。

当前问题不是“没有 memory”，而是：

- 它是隐藏的；
- 用户不可控；
- UI 没有单独心智模型；
- 产品边界还没明确写死，容易向亲密关系叙事漂移。

## 4. Target behavior

Each NPC has their own memory list.

The user can open a panel and see what that NPC remembers.

The user can:

- delete one memory;
- clear all memories for this NPC.

The user cannot:

- manually add a memory;
- manually edit memory text;
- create fake relationship facts;
- tune the NPC's affection or intimacy.

Deleted memories must no longer be injected into chat prompts.

目标状态可以概括为：

- 现有 hidden facts 升级为 `per-NPC controllable memory system`；
- 记忆继续来自真实聊天，不来自用户手动捏造；
- 用户终于能看见和管理“这个住民记得什么”；
- 但用户不能把系统调成恋爱养成或关系脚本编辑器。

## 5. Non-goals

Non-goals:

- no global user memory in v0;
- no account/cloud sync in v0;
- no manual memory editing;
- no manual memory creation;
- no affection score;
- no intimacy level;
- no romance system;
- no relationship route;
- no daily streak pressure;
- no “NPC misses you” system;
- no vector database in v0;
- no server database in v0.

补充说明：

- v0 不做 ChatGPT 那种“跨全部会话的统一用户画像”；
- v0 不做“我和这个 NPC 的关系等级”；
- v0 不做“来晚了，NPC 很想你”这类 attachment pressure；
- v0 不需要为 memory 引入新依赖、新后端或复杂检索层。

## 6. Memory model

### v0 model

```ts
type NpcMemoryV0 = string;
```

当前项目已经稳定使用 `string[] facts`。v0 先复用这个形态，风险最低。

建议把 v0 看成：

- 存储层仍是 `string[]`;
- UI 层把每条 string 当作一条可显示、可删除的 memory；
- 删除能力先从“按文本删除”或“按 index 删除”开始；
- 暂不强制迁移到复杂 schema。

### future model

```ts
type NpcMemoryRecord = {
  id: string;
  npcId: NpcId;
  text: string;
  type:
    | "user_fact"
    | "preference"
    | "interest"
    | "learning_goal"
    | "shared_history"
    | "caution";
  status: "active" | "archived" | "deleted";
  sensitivity: "normal" | "caution";
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  source: "chat" | "welcome" | "migration";
};
```

说明：

- `v0 should not migrate to this full schema immediately unless necessary.`
- `The schema is a north star for future phases.`

为什么先不迁移：

- 当前系统已经有稳定 `facts` 注入链路；
- 现在最缺的是“可见性与可删除性”，不是复杂数据建模；
- 过早上 schema 会把这次低风险任务变成存量迁移任务。

## 7. Memory lifecycle

1. User chats with an NPC.
2. Memory extractor proposes a small number of durable facts.
3. Existing memories are checked for duplication or conflict.
4. The memory list is updated.
5. On future chats with the same NPC, a small set of relevant memories is injected.
6. User can delete memory from panel.
7. Deleted memory is no longer injected.

对 Kotomachi 的解释：

- 记忆不是每轮都新增；
- 只有“值得留到下次”的内容才进入 memory；
- memory 应该少而稳，而不是多而乱；
- 用户删除后，系统要立刻尊重这个决定。

## 8. User control model

Control model:

- visible by NPC;
- delete single memory;
- clear all memories for this NPC;
- no edit;
- no add;
- no global memory in v0.

Reason for no edit:

- memory should come from actual chat;
- no manual roleplay tuning;
- prevents fake intimacy or relationship scripting;
- simpler conflict handling.

进一步说明：

- “可见 + 可删”已经能显著提升用户的信任感；
- “可编辑 + 可新增”会把产品从 practice partner 推向 roleplay tuning tool；
- 对 Kotomachi v0 来说，用户控制的重点是撤回记忆，而不是编排记忆。

## 9. Memory panel UX

### Entry

- from chat page, near header or plus menu;
- label: `这个住民记住的事` / `住民メモ` / `What this resident remembers`.

### Panel copy

“这个住民会根据你们的聊天记住一些事，用来让下次对话更自然。你可以删除这些记忆。”

### Empty state

“这个住民还没有记住什么。多聊几次后，这里会出现一些记录。”

### Each memory item

- memory text;
- delete button;
- optional small label: `来自聊天` / `From your chats`.

### Actions

- delete single memory;
- clear all memories for this NPC;
- confirm before clear all.

### Copy boundaries

文案必须避免以下词汇和暗示：

- 亲密度
- 羁绊
- 想你
- 关系升级
- 专属回忆

文案方向应该更像：

- 住民记住的事
- 聊天里留下的记忆
- 让下次更自然
- 你可以删除

而不是：

- 我们关系变深了
- 这是你们之间的重要回忆
- 他会一直记得你

## 10. Prompt injection rules

When injecting memories into an NPC prompt:

- These are things this NPC remembers about the user.
- Use them only when relevant.
- Do not mention all memories at once.
- Do not repeatedly remind the user that you remember them.
- Do not sound possessive, romantic, jealous, dependent, or emotionally exclusive.
- Use memories to make language practice easier and more continuous.
- If a memory involves health, distress, or sensitive context, use it cautiously and avoid diagnosis or advice.

建议 prompt 文案：

```text
この住民がユーザーについて覚えていること：
{memories}

これらは、会話を自然につなげるための手がかりです。
関連するときだけ軽く使ってください。
毎回すべて言及しないでください。
恋愛関係、独占、嫉妬、依存のような表現は避けてください。
```

实现层建议：

- memory 注入应从“整包 facts 全塞进 prompt”逐步收敛到“只注入少量相关项”；
- v0 可先注入最多 3 到 6 条；
- prompt 里明确把 memory 定义成“会话衔接线索”，而不是“关系进度条”。

## 11. Extraction and merge rules

Good memory candidates:

- stable interests;
- repeated topics;
- language learning goals;
- preferred correction style;
- long-term hobbies;
- recurring life context;
- shared history with this NPC.

Weak or bad candidates:

- one-time mood;
- today-only plans;
- private/sensitive details;
- medical details;
- relationship dependency;
- body/weight anxiety;
- exact addresses;
- financial/private identifiers.

Merge rules:

- avoid duplicate facts;
- prefer updated version over stale version;
- keep list short;
- max 10 active memories in v0;
- if uncertain, do not save.

额外建议：

- 对“最近有点累”“今天下雨”“明天去超市”这类短期上下文，不要轻易升格为 memory；
- 对“想重新开始打排球”“正在准备面试”“喜欢慢一点的纠正方式”这类跨会话有价值的信息，可优先保留；
- 对敏感或可能误伤用户的内容，宁可不存。

## 12. Safety and anti-romance boundaries

The system should create familiarity, not attachment pressure.

Allowed:

- “前にバレーをまた始めたいって言ってたよね。”
- “この前、カフェで話したことだけど……”
- “前に、ゆっくり直してほしいって言ってたから、今回も軽めに言うね。”

Not allowed:

- “ずっと君のことを考えていた。”
- “君が来ないと寂しい。”
- “僕だけが君を分かっている。”
- “私たちの関係が深まった。”
- “好感度が上がった。”

产品边界说明：

- memory 可以让 NPC 显得“记得你”；
- 但不能让 NPC 显得“占有你”“等待你”“离不开你”；
- familiarity 可以存在；
- exclusivity、dependency、romance framing 不可以存在。

特别注意：

- Aoi、Misaki、Saku 这类容易被模型写得更有情绪氛围的 NPC，更需要防 romantic drift；
- memory panel 文案和 prompt 指令都要同步防漂移；
- 删除记忆能力本身，也是一种安全边界。

## 13. Technical implementation plan

Patch 1:

- add memory deletion helpers in `lib/memory.ts`;
- replace hardcoded legacy `NPC_IDS` with `ALL_NPC_IDS` where safe;
- do not change UI yet.

Patch 2:

- add `NpcMemoryPanel` client component;
- display current NPC memories;
- delete single memory;
- clear current NPC memories;
- mount in chat page.

Patch 3:

- improve prompt injection wording in chat API;
- inject at most 3–6 relevant/current memories;
- anti-romance instruction included.

Patch 4:

- improve extraction/merge quality;
- avoid duplicates;
- prepare future schema migration.

实施思路说明：

- Patch 1 先补 utility，是为了把风险限制在存储层；
- Patch 2 再加 UI，让用户看到“现有 memory”而不是先改生成逻辑；
- Patch 3 再收 prompt，避免 UI 出来后 NPC 继续把 memory 用得太重；
- Patch 4 最后调质量，减少重复 facts、过时 facts 和边界不稳的问题。

## 14. Patch plan

Patch 1: memory utility layer

Files likely involved:

- `lib/memory.ts`

Patch 2: memory panel UI

Files likely involved:

- `components/npc-memory-panel.tsx`
- `app/chat/[npcId]/page.tsx`

Patch 3: prompt injection

Files likely involved:

- `app/api/chat/route.ts`

Patch 4: extraction quality

Files likely involved:

- `app/api/memory/route.ts`
- `app/api/welcome/route.ts`

执行约束：

- Do not run `npm run build` by default.
- Do not change package/env/config.
- Do not commit automatically.

低风险拆分原则：

- 每个 patch 都应可单独 review；
- 每个 patch 都应尽量少碰高耦合区域；
- 先做“用户可见但逻辑不重写”的改动，再做“prompt 与提取质量”改动；
- 如果 `app/api/memory/route.ts` 当前不存在，可在 Patch 4 再判断是扩展现有 memory extraction route，还是新建专用 route。

## 15. QA checklist

Manual QA:

- Open chat with Kimura, Misaki, Riku, Saku.
- Confirm each NPC has independent memory.
- Delete one memory and confirm it disappears.
- Refresh page and confirm deletion persists.
- Clear all memories for one NPC and confirm chat history remains.
- Confirm deleting memory does not delete saved words.
- Confirm Saku remains hidden from homepage standard sections.
- Confirm memories are not used romantically.
- Confirm health-related memories are used cautiously.
- Confirm no global memory panel appears in v0.

补充 QA 观察点：

- reset chat 仍然应保持原有行为，不因为 memory panel 引入回归；
- panel 空状态文案不应制造压力；
- 删除某条 memory 后，welcome / chat 都不应再引用它；
- 同一 memory 不应在一次回复里被反复强调；
- memory 不应让 NPC 主动把对话拉向“我们之间的关系”。
