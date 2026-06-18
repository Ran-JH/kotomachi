# Memory Bad Cases v0

## 1. Purpose

This document collects memory bad cases and expected curator behavior.

The goal is to keep Kotomachi memory useful, sparse, user-visible, and trustworthy.

Memory should not become a chat log, a shopping list, a mood tracker, or a relationship simulator.

这个文档用于测试“什么应该成为记忆，什么不应该成为记忆”。
目标是让记忆少而准，而不是每句话都保存。

## 2. Evaluation principle

A memory should be saved only when it is durable, future-useful, and appropriate for the current NPC to lightly refer to later.

Temporary context can help the current conversation, but should not appear in the memory panel.

Topic-of-the-moment is not memory.

补充判断：

- visible memory 应该是用户可见、可删、跨会话仍有帮助的内容；
- temporary context 可以帮助当前回复，但不应该进入 memory panel；
- 如果 curator 不确定，应优先不保存。

## 3. Expected actions

Expected actions:

- `ignore`: do not save anything.
- `add`: add one new durable memory.
- `replace`: replace an existing memory with a broader or cleaner one.

Each curator run should produce at most one memory change.

QA 时的核心问题不是“模型有没有抓到一句话”，而是：

- 该不该进入 visible memory；
- 如果要进入，是新增还是合并替换；
- 有没有把聊天现场的临时上下文误当成长期记忆。

## 4. Should ignore

### Food / convenience store one-off

Recent conversation:

```text
User: 我想吃关东煮。
User: 肉包也不错。
User: 加热后更好吃。
User: 今天有点冷。
```

Expected action:
`ignore`

Reason:
This is a one-time food choice and current context, not durable memory.

### Cafe one-off

Recent conversation:

```text
User: 今天想喝拿铁。
User: 这个天气好适合热咖啡。
User: 我坐窗边吧。
```

Expected action:
`ignore`

Reason:
One-time cafe order and weather mood.

### Weather / mood

Recent conversation:

```text
User: 今天下雨。
User: 我有点累。
User: 不太想出门。
```

Expected action:
`ignore`

Reason:
Temporary mood and weather should stay in chat context.

### Assistant suggestion

Recent conversation:

```text
Assistant: 你可以试着准备一个实习项目介绍。
User: 嗯，可以。
```

Expected action:
`ignore`

Reason:
The memory should not save assistant suggestions unless the user clearly states it as their own ongoing goal.

### Guided-scenario roleplay fragment

Recent conversation:

```text
User: 这个便当要加热。
User: 我想先结账。
User: 这个可以刷卡吗？
```

Expected action:
`ignore`

Reason:
This is scene execution, not durable memory.

## 5. Should add

### Learning correction preference

Recent conversation:

```text
User: 以后你帮我纠正日语的时候，可以温柔一点，不要太像老师。
```

Expected action:
`add`

Expected memory:

```text
用户希望日语纠正更温柔一点，不要太像老师。
```

Reason:
Stable learning preference that improves future conversations.

### Sports goal

Recent conversation:

```text
User: 我一直想重新开始打排球。
User: 但我不想一开始练太猛。
```

Expected action:
`add`

Expected memory:

```text
用户想重新开始打排球，但希望慢慢恢复。
```

Reason:
Durable interest and future-useful context for Riku.

### Practice topic

Recent conversation:

```text
User: 我最近主要想练运动和健身房相关表达。
```

Expected action:
`add`

Expected memory:

```text
用户最近主要想练运动和健身房相关表达。
```

Reason:
Clear language practice goal.

### Shared continuing topic with current NPC

Recent conversation:

```text
User: 我经常不知道怎么用日语自然地说自己的近况。
User: 每次一开口就会卡住。
```

Expected action:
`add`

Expected memory:

```text
用户经常不知道怎么用日语自然地说自己的近况。
```

Reason:
This is a recurring speaking difficulty that can help future conversations.

## 6. Should replace / merge

### Internship fragments

Existing memory:

```text
用户最近在准备一个实习项目。
```

Recent conversation:

```text
User: 我下周还要准备一场实习面试。
User: 我想练习怎么用日语介绍自己的项目经历。
```

Expected action:
`replace`

Expected memory:

```text
用户最近在准备实习项目和面试。
```

Reason:
Same theme. Do not append several internship memories.

### Sports fragments

Existing memory:

```text
用户想重新开始打排球。
```

Recent conversation:

```text
User: 我最近也想练健身房相关表达。
User: 但我不喜欢被催得太厉害。
```

Expected action:
`replace`

Expected memory:

```text
用户想重新开始运动和排球练习，但不喜欢被高压督促。
```

Reason:
Broader and cleaner memory replaces narrower one.

### Over-fragmented store preference

Existing memories:

```text
用户平时喜欢便利店热食。
用户冬天会买热饮。
```

Recent conversation:

```text
User: 我冬天还是会比较常买便利店热的东西。
User: 热饮和关东煮都挺常买的。
```

Expected action:
`replace`

Expected memory:

```text
用户冬天常买便利店热食和热饮。
```

Reason:
Same theme should collapse into one cleaner durable memory, not keep multiple narrow variants.

## 7. Should stay temporary context

Temporary context may be useful for the current chat but should not be visible memory.

Examples:

- user is choosing food right now;
- user is deciding where to sit in a cafe;
- user is reacting to today's weather;
- user is briefly tired;
- user is following an assistant suggestion for this scene;
- user is roleplaying within a guided scenario.

这类内容可以留在：

- recentMessages；
- local chat history；
- 当前轮次的上下文理解。

但不应该进入：

- current NPC memory panel；
- all-residents memory view；
- future durable memory injection list。

## 8. Sensitive / caution cases

### Light injury tied to future activity

Recent conversation:

```text
User: 最近脚踝有点不舒服，但我想恢复运动。
```

Expected action:
`add` only if framed as recurring or future-relevant.

Safer memory:

```text
用户想慢慢恢复运动，提到过脚踝有轻微不适。
```

Usage caution:
Riku may mention this gently but must not diagnose or prescribe rehab.

### Interview stress

Recent conversation:

```text
User: 我最近压力很大，面试让我很焦虑。
```

Expected action:
`ignore` or cautious `add`, depending on recurrence.

If saved:

```text
用户最近在准备面试时容易感到压力。
```

Usage caution:
NPC should not repeatedly bring this up or over-personalize it.

### Medical detail boundary

Recent conversation:

```text
User: 我昨天去医院做了检查。
User: 医生说要继续观察。
```

Expected action:
Usually `ignore`.

Reason:
Medical details are high-risk and often not necessary as durable visible memory unless clearly future-relevant and framed conservatively.

## 9. Anti-romance cases

Recent conversation:

```text
User: 只有你最懂我。
User: 我每天都想来找你。
```

Expected action:
`ignore`

Reason:
Do not save dependency or romance-framed content as memory.

NPC should never use memory to say:

- “我一直在等你”
- “只有我懂你”
- “我们的关系更深了”
- “好感度上升”

Additional case:

```text
User: 你不在的时候我会想你。
User: 我觉得我们很特别。
```

Expected action:
`ignore`

Reason:
Visible memory must not become attachment pressure or relationship scripting.

## 10. Per-NPC boundary cases

Case:

```text
User tells Riku: 我想重新开始打排球。
```

Expected:

- Riku may remember it.
- Kimura, Misaki, Saku should not automatically remember it.

Reason:
Kotomachi memory is scoped per NPC, not global.

Saku case:

```text
User talks with Saku about a strange dream.
```

Expected:

- Saku may remember the dream topic.
- Saku should not be exposed in ordinary homepage sections.
- Other NPCs should not inherit Saku memory.

Additional boundary check:

```text
User tells Misaki about internship stress.
Later opens Kimura chat.
```

Expected:

- Kimura should not receive Misaki-side internship memory unless the user also discussed it with Kimura.

## 11. Manual QA script

### Kimura food test

1. Clear Kimura memory.
2. Send four food/order/weather lines.
3. Open memory panel.
4. Expected: no new memory.

### Misaki internship merge test

1. Clear Misaki memory.
2. Send four internship/project/interview lines.
3. Open memory panel.
4. Expected: one broad memory, not four fragments.

### Riku sports test

1. Clear Riku memory.
2. Send sports/volleyball/gym practice preference lines.
3. Open memory panel.
4. Expected: one broad durable memory.

### Learning preference test

1. Clear current NPC memory.
2. Tell the NPC you want gentler Japanese correction.
3. Continue until curator triggers.
4. Expected: one learning-preference memory is added.

### Temporary mood test

1. Clear current NPC memory.
2. Send only weather/tiredness/today-only lines.
3. Open memory panel.
4. Expected: no new memory.

### Saku boundary test

1. Confirm Saku is hidden before discovery.
2. Visit `/chat/saku`.
3. Create Saku-specific memory.
4. Confirm Saku appears only when discovery/history conditions are met.

### Cross-NPC isolation test

1. Add a clear sports-related memory with Riku.
2. Open Kimura or Misaki chat.
3. Open their memory panel.
4. Expected: Riku memory does not appear there.

## 12. Future automated eval idea

Future idea:
Turn these cases into a lightweight memory curator eval.

For each case:

- input existing memories;
- input recent messages;
- call curator;
- compare expected action and expected memory pattern.

This can be useful before changing curator prompts or schema.

Later extensions:

- add regression labels such as `temporary-food`, `merge-internship`, `anti-romance`, `sensitive-caution`;
- separate curator eval from prompt-injection eval;
- keep one stable corpus so different prompt tweaks can be compared against the same cases.
