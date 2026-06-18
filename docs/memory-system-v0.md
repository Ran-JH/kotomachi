# Kotomachi Memory System v0

## 1. Product purpose

The memory system exists to increase the user's willingness to speak again.

When an NPC remembers relevant things from past conversations, the user feels they are talking to a familiar practice partner instead of restarting from zero every time.

The goal is friendship-like familiarity, not romance, dependence, exclusivity, or emotional possession.

核心目标：让用户更愿意再次开口。
NPC 记住用户，是为了降低表达门槛，让下次对话更自然。
这是一种“熟悉的练习伙伴”关系，不是 AI 恋人关系。

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

## 3. Current implementation

Current localStorage keys:

- `kotomachi_facts_${npcId}`: `string[]`, max 10
- `kotomachi_history_${npcId}`: `StoredMessage[]`, max 20
- `kotomachi_last_time_${npcId}`: `number`
- `kotomachi_count_${npcId}`: `number`

Current injection:

- chat API reads current NPC memories and injects them into the system prompt;
- prompt injection is limited to the current NPC only;
- injected memories are capped at max 5.

Current extraction:

- memory extraction no longer behaves like per-message fact append;
- chat page collects recent conversation and triggers curator-style evaluation after enough user messages;
- `/api/memory` returns one of `ignore`, `add`, or `replace`;
- welcome API still has history-based merge responsibility, but should follow the same durable-memory rules.

Current deletion:

- users can delete a single memory;
- users can clear one NPC's memories only;
- chat reset remains a separate behavior and still clears broader chat state.

## Current implementation status

Memory v0 is now implemented as a local, per-NPC, controllable memory layer.

Implemented:

- per-NPC memories are stored in localStorage as `kotomachi_facts_${npcId}`;
- users can view the current NPC's memories in the chat page;
- users can delete a single memory;
- users can clear the current NPC's memories without deleting chat history;
- users can switch from the current NPC panel into an all-residents memory view;
- the homepage no longer exposes Memory Center directly;
- `/memories` route remains available but is not the primary UX entry;
- Saku remains hidden unless already discovered / has history / has count / has last time / has memories;
- memory injection is limited to the current NPC and capped;
- memory usage is instructed to be light, relevant, non-romantic, and non-dependent.

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

## 5. Non-goals

Non-goals:

- no global user memory in v0;
- no cross-NPC memory sharing;
- no account/cloud sync in v0;
- no manual memory editing;
- no manual memory creation;
- no schema migration in v0;
- no vector database in v0;
- no server database in v0;
- no affection score;
- no intimacy level;
- no romance system;
- no relationship route;
- no daily streak pressure;
- no “NPC misses you” system.

Still not included in v0:

- global user memory;
- cross-NPC memory sharing;
- account/cloud sync;
- manual memory creation;
- manual memory editing;
- schema migration;
- vector database;
- affection score;
- intimacy level;
- romance route.

## 6. Memory model

### v0 model

```ts
type NpcMemoryV0 = string;
```

说明：当前项目仍然使用 `string[]` facts 作为 memory v0 的存储层。
v0 不迁移到复杂 schema，继续复用现有 `kotomachi_facts_${npcId}`，以降低风险。

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

v0 should not migrate to this full schema immediately unless necessary.
The schema is a north star for future phases.

## 7. Memory lifecycle

1. User chats with an NPC.
2. Recent conversation is collected for curator review.
3. Existing memories are checked for duplication or conflict.
4. Curator returns one action: `ignore`, `add`, or `replace`.
5. The local memory list is updated if needed.
6. On future chats with the same NPC, a small set of relevant memories is injected.
7. User can delete memory from panel.
8. Deleted memory is no longer injected.

## Curator flow

Memory v0 should not behave like a per-message fact extractor.

Current direction:

- collect several recent user messages in the current session;
- trigger memory curator only after enough user messages;
- send recent conversation + existing memories to `/api/memory`;
- receive one of `ignore`, `add`, or `replace`;
- apply at most one memory change per curator run.

Current implementation note:

- the chat page currently triggers curator evaluation roughly every 4 user messages;
- recent message context is windowed rather than sending the full transcript;
- replace is supported so narrow fragments can collapse into one broader durable memory.

This keeps visible memory closer to ChatGPT-style saved memory rather than chat-log fragments.

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

## 9. Memory panel UX

Current direction:

- current NPC memory panel lives in the chat page;
- panel also contains an in-panel all-residents memory view;
- `/memories` still exists, but is no longer the main entry;
- homepage no longer exposes Memory Center directly.

Entry:

- from chat page, near header or nearby management actions;
- current UX centers on the current NPC panel first.

Panel copy direction:

- user-facing copy should feel soft and low-pressure;
- prefer “街上的人 / 这个人 / 其他人 / 具体名字”;
- avoid user-facing “居民 / NPC / 亲密度 / 好感度 / 羁绊 / 想你 / 关系升级”.

Empty state:

- should stay quiet and non-pressuring;
- should not imply relationship progression.

Each memory item:

- memory text;
- delete button;
- no manual source badge required if it adds no value.

Actions:

- delete single memory;
- clear all memories for this NPC;
- clear confirmation should be inline and product-styled rather than browser-native confirm.

## 10. Prompt injection rules

When injecting memories into an NPC prompt:

- These are things this NPC remembers about the user.
- Use them only when relevant.
- Do not mention all memories at once.
- Do not repeatedly remind the user that you remember them.
- Do not sound possessive, romantic, jealous, dependent, or emotionally exclusive.
- Use memories to make language practice easier and more continuous.
- If a memory involves health, distress, body/weight, injury, or other sensitive context, use it cautiously and avoid diagnosis or advice.

Suggested prompt block:

```text
この人がユーザーについて覚えていること：
- {memory1}
- {memory2}

これらは、会話を自然につなげるための手がかりです。
関連するときだけ軽く使ってください。
毎回すべて言及しないでください。
恋愛関係、独占、嫉妬、依存、親密度のような表現は避けてください。
健康、不調、けが、体型、強い不安などに関わる記憶は慎重に扱ってください。
ユーザーが削除した記憶は使ってはいけません。
```

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
- private or sensitive details;
- medical details;
- relationship dependency;
- body or weight anxiety;
- exact addresses;
- financial or private identifiers;
- food, drink, shopping, weather, or current-mood fragments that only matter for the current turn.

Merge rules:

- avoid exact duplicates;
- avoid near-duplicates with the same meaning in another language;
- prefer updated or broader version over stale or narrow fragment;
- keep list short;
- max 10 active memories in v0;
- if uncertain, do not save.

Visible memories are durable, user-visible, deletable notes.
Temporary context stays in chat history and should not appear in the memory panel.
Topic-of-the-moment is not memory.

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

## 13. Technical implementation plan

Implemented in v0:

- memory utility helpers in `lib/memory.ts`;
- current NPC memory panel in chat page;
- in-panel all-residents memory view;
- current-NPC-only prompt injection with cap and safety instructions;
- curator-style extraction flow with `ignore` / `add` / `replace`.

Current architecture:

- localStorage remains the storage layer;
- `kotomachi_facts_${npcId}` remains `string[]`;
- chat page triggers curator evaluation after enough user messages;
- `/api/memory` acts as the memory curator endpoint;
- local helper layer applies guardrails, dedupe, replace, and max-10 trimming.

## 14. Patch plan

Patch 1: memory utility layer
Status: implemented

Files involved:

- `lib/memory.ts`

Patch 2: memory panel UI
Status: implemented

Files involved:

- `components/npc-memory-panel.tsx`
- `components/npc-memory-center.tsx`
- `app/chat/[npcId]/page.tsx`

Patch 3: extraction quality and curator flow
Status: implemented, in QA

Files involved:

- `app/api/memory/route.ts`
- `app/api/welcome/route.ts`
- `lib/memory.ts`
- `app/chat/[npcId]/page.tsx`

Patch 4: future schema and temporary-context separation
Status: deferred

Likely future files:

- `lib/memory.ts`
- `app/api/memory/route.ts`
- future dedicated memory schema/helpers if needed

Operational notes:

- Do not run `npm run build` by default in this project workflow.
- Do not change package/env/config for memory v0 docs work.
- Do not commit automatically.

## 15. QA checklist

Manual QA:

- Open chat with Kimura, Misaki, Riku, Saku.
- Confirm each NPC has independent memory.
- Delete one memory and confirm it disappears.
- Refresh page and confirm deletion persists.
- Clear all memories for one NPC and confirm chat history remains.
- Confirm deleting memory does not delete saved words.
- Confirm homepage no longer exposes Memory Center directly.
- Confirm current NPC panel can switch into all-residents memory view.
- Confirm `/memories` route still works, but is not the primary UX entry.
- Confirm Saku remains hidden from homepage standard sections.
- Confirm Saku is not exposed in memory views unless discovered / has history / has count / has last time / has memories.
- Confirm memories are not used romantically.
- Confirm health-related memories are used cautiously.
- Confirm no global memory panel appears in v0.

## Future directions

Future candidates:

- schema v1 with `id`, `type`, `source`, `createdAt`, `updatedAt`;
- temporary per-NPC context summary separate from visible memory;
- memory debug / bad-case review mode;
- stronger curator evaluation cases;
- broader QA datasets for food-ordering, project/interview, and repeated-topic merge behavior.
