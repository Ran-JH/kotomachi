# Guided Scenarios v0

## 1. Purpose

Guided Scenarios 用于解决这些问题：

- 有些生活场景中，用户很难主动想到该聊什么；
- 功能型 NPC 的价值不只在闲聊，也在于帮助用户练习真实生活中的小互动；
- 用户不一定因为冷场才需要场景，也可能本来就想练一个具体动作，例如买东西、点单、问能否加热、问推荐、请求重复，或第一次进研究室打招呼；
- Guided Scenario 可以成为 Free Chat 之外的第二种开口路径。

目标不是让用户完成任务，而是用一个具体生活动作降低开口成本，让用户自然说几句日语。

## 2. Product Positioning

Kotomachi 不是传统场景课程 App。它的定位仍然是：

> **LINE-like low-pressure chat in a small Japanese-speaking town.**

Guided Scenarios 应保持：

- 同一个聊天页；
- 同一个 NPC；
- 同一套 Expression Hints、Word Explanation、TTS / STT、Review Cards；
- 用户可以随时跑偏或退出；
- 不评分、不通关；
- 不显示任务进度；
- 不强迫完成对话步骤。

```text
课程型场景练习：
选择课程 -> 完成任务 -> 得到评分 / 进度

Kotomachi Guided Scenario：
进入 NPC -> 选择随便聊或试一个小场景 -> NPC 自然接住
-> 用户随时跑偏或退出 -> Review Card 轻收束
```

Guided Scenario 是 Conversation Seed Library 的一个更具体分支：

```text
Topic Seed = 聊什么
Scenario Seed = 做什么 / 处理一个生活小情境
```

例如：

- Topic Seed：最近ハマってるもの、咖啡口味、研究室初见；
- Scenario Seed：便利店结账、问能否加热、咖啡馆点单、居酒屋点菜。

## 3. Relationship to Free Chat

```text
进入 NPC
├─ Free Chat：想和这个人随便聊聊
└─ Guided Scenario：想在这个地方处理一件小事
```

- Guided Scenario 不只是冷场辅助；
- Guided Scenario 不是课程模式；
- Guided Scenario 不替代 Free Chat；
- 它可能成为与 Free Chat 并列的第二种开口方式；
- v0 只做一个小试点，不重塑全产品；
- 最终是否成为核心能力，由 Kimura pilot 的真实体验验证决定。

## 4. Core Principles

1. 场景只提供上下文，不提供任务清单。
2. `possibleBeats` 是给 AI 的，不展示给用户。
3. 用户可以自由输入、跑偏或退出。
4. NPC 仍然是 NPC，不是场景机器人。
5. 不做评分、通关、进度或正确答案。
6. 不把场景包装成课程、lesson 或 task。
7. 场景入口应低压力、短、生活化。
8. Review Card 只做轻收束，不做任务总结。
9. `activeScene` 是软上下文，不是硬状态机。
10. 第一版只验证一个 Kimura 场景。

## 5. Data Concept

以下只是轻量数据概念，不代表已实现：

```ts
type ConversationScene = {
  id: string;
  npcId: string;
  title: string;
  shortLabel: string;
  setup: string;
  userGoal: string;
  npcOpening: string;
  possibleBeats: string[];
  usefulIntents: string[];
  softLanding: string;
  avoid: string[];
};
```

- `possibleBeats` 是可能自然发生的交流节点，不是任务步骤；
- `usefulIntents` 是用户可能想表达的意思，不是标准答案；
- `npcOpening` 可以作为场景开场；
- `softLanding` 是自然结束方向，不是完成判定；
- v0 不需要数据库；
- v0 不需要长期保存；
- `activeScene` 可以先作为本轮聊天的临时状态。

## 6. Active Scene Lifecycle

```text
No activeScene
-> user selects scenario
-> activeScene starts
-> NPC gives scene opening
-> user replies freely
-> NPC softly maintains scene
-> user may continue / drift / exit
-> activeScene ends or fades
```

### Explicit exit

用户可以点击：

- `回到随便聊`
- `结束小场景`
- `自由聊天`

随后清空 `activeScene`。

### Natural fade

用户明显偏离场景时，NPC 不应强行拉回。

例如在便利店结账场景中，用户开始聊日本便利店文化，Kimura 应顺着聊，而不是继续追问 `袋はどうしますか`。

v0 可以只做：

- 显式退出；
- prompt 允许自然跑偏。

暂不做复杂自动判断。

### Scene Opening and Normal Welcome

Normal entry 和 Scene entry 应是两个不同触发：

```text
normal entry -> normal welcome
user selects scene -> insert scene opening
scene opening should not call /api/welcome in v0
```

- 用户正常进入 NPC 聊天页时，仍使用普通 initial welcome / revisit welcome；
- 只有用户明确选择 Guided Scenario 时，才插入 scene opening；
- scene opening 不替代普通 welcome，也不应在页面进入时自动和 welcome 同时触发；
- 如果页面中已经存在普通 welcome，用户之后选择场景时，scene opening 应表现为“开始一个小场景”，而不是第二条欢迎；
- v0 不需要调用 `/api/welcome` 生成 scene opening；
- v0 可以直接使用 scene config 中固定的 `npcOpening`，降低不确定性。

### activeScene Clear Boundaries

`activeScene` 在 v0 中是当前页面的临时 UI state。这里的 session-local 不表示登录 session、数据库 session 或长期会话。

```text
activeScene is session-local UI state in v0.
It does not need to survive refresh, start-over, or NPC switch.
```

`activeScene` should clear when：

- 用户点击 `回到随便聊` / `结束小场景` / `自由聊天`；
- 用户 start-over 当前 NPC 聊天；
- 用户切换到另一个 NPC；
- 页面刷新。v0 不要求恢复 `activeScene`；
- 后续如果加入 URL 参数或 localStorage，再重新评估生命周期。

`activeScene` does not need to clear when：

- 用户只是在场景内说错或沉默；
- 用户短暂跑偏，但仍可能回到场景；
- 用户生成 Review Card；
- NPC 自然完成一轮对话，但用户或 UI 尚未明确退出。

## 7. UI Entry Strategy

### Empty / early chat state

当用户进入 Kimura 聊天页、对话还没展开时，可以轻量显示：

```text
今日はどう話す？
[随便聊聊]
[买便当结账]
```

或：

```text
木村とどう話す？
[そのまま話す]
[小さな場面から始める]
```

这是 preferred direction，但 v0 不一定立即实现 empty-state UI。

### During chat

在 `+` 菜单中可以显示：

- Free Chat：`找话题`
- Guided Scenario：`下一句怎么说`
- 可选入口：`试一个小场景`

入口原则：

- 不改首页大结构；
- 不做课程入口；
- 不把所有场景堆成场景库；
- 第一版先在聊天页内验证。

## 8. Topic Ideas / Response Options

Free Chat 中，`topic ideas` 的用户语义是：

> 找话题 / 接着聊什么

Guided Scenario 中，同一机制的用户语义应变成：

> 下一句怎么说 / response options

便利店结账场景中的建议应类似：

- `はい、お願いします。`
- `温めなくても大丈夫です。`
- `袋もお願いします。`
- `カードで払えますか。`

底层可以共用 `/api/topic-ideas`，但 prompt 和 UI label 需要根据 `activeScene` 调整。场景中不应生成与当前动作无关的泛话题。

For the Kimura pilot, scenario-aware response options are required, not optional.

原因：

- 场景能否降低开口成本，关键在用户卡住时能否看到“下一句怎么说”；
- 如果只做 scene opening、不接 response options，用户仍可能在第一轮之后卡住；
- response options 必须是用户可以直接发送的短日语句子，不是说明、翻译或任务提示。

## 9. Chat Prompt Behavior

当 `activeScene` 传给 `/api/chat` 后，NPC 应：

- 自然维持场景；
- 每次最多推进一个小节点；
- 不检查用户是否完成；
- 不纠错；
- 不把场景变成测试；
- 用户偏离时优先自然回应；
- 不重复问已经回答过的内容；
- 不编造用户过去事实；
- 不和 world state、local date 或 seasonal hints 矛盾；
- 不绑定真实地名。

示例 prompt 规则：

```text
Current temporary scenario: convenience-store checkout.

Use this as a soft context, not a task.
Do not force the user through all beats.
If the user stays in the scene, naturally continue one small exchange.
If the user drifts away, follow the user.
Do not score, correct, or test.
```

## 10. Pilot Scene: Kimura / 买便当结账

v0.1 只验证这一个场景：

```ts
{
  id: "kimura_bento_checkout",
  npcId: "kimura",
  title: "买便当结账",
  shortLabel: "买便当结账",
  setup: "用户拿着便当来到便利店收银台。",
  userGoal: "完成结账，并理解店员常见询问。",
  npcOpening: "こちらのお弁当、温めますか？"
}
```

### possibleBeats

- 是否加热；
- 是否需要袋子；
- 选择支付方式；
- 简单结束寒暄。

### usefulIntents

- 请帮我加热；
- 不需要加热；
- 需要 / 不需要袋子；
- 可以用卡吗；
- 就这些；
- 谢谢。

### softLanding

- 完成一小段结账对话后，自然回到闲聊；
- Review Card 可以提取：
  - `温めてもらえますか`
  - `袋は大丈夫です`
  - `カードで払えますか`

### avoid

- 不做结账流程考试；
- 不逐项检查；
- 不把用户说错当成错误；
- 不强行问完所有 `possibleBeats`；
- 不让 Kimura 变成收银机器人。

## 11. Candidate Scenes by NPC

以下全部是 later candidates，不是近期实现清单。

### Kimura

- 买便当结账；
- 找商品；
- 问支付方式；
- 买关东煮；
- 问新商品推荐。

### Misaki

- 点一杯不太苦的咖啡；
- 问推荐；
- 问能不能坐窗边；
- 想安静待一会儿。

### Taisho

- 第一次进居酒屋；
- 问推荐；
- 点一份小菜；
- 不喝酒时怎么说；
- 结账。

### Haruka

- 第一次进研究室打招呼；
- 请教文献；
- 发表前轻寒暄；
- 听不懂课后怎么问。

### Aoi

- 问最近推荐；
- 约放课后一起去哪里；
- 表达自己对某个兴趣不熟但想听；
- 轻松拒绝邀请。

### Future travel-related NPC

不要把“旅行”做成一个泛化大 NPC。未来更合理的拆分是：

- guesthouse staff；
- station staff；
- local shop staff；
- fellow traveler。

## 12. Non-goals

Guided Scenarios v0 不做：

- 场景库；
- 课程模式；
- 任务系统；
- 分数；
- 进度条；
- 正确答案；
- 对话树；
- 硬状态机；
- 场景完成判定；
- 大量 NPC / 大量场景；
- 首页大改；
- 登录 / 数据库；
- 长期记忆系统。

## 13. Implementation Sketch

以下只是 implementation sketch，不是已实现能力。v0.1 的目标是验证机制，不是建立完整场景系统。

### Required for Kimura pilot

- 新增 `lib/conversation-scenes.ts`；
- 定义唯一场景 `kimura_bento_checkout`；
- chat page 持有临时 `activeSceneId`；
- 用户选择场景后插入固定 scene opening；
- `/api/chat` 接收 `activeScene` context；
- `/api/topic-ideas` 接收 `activeScene` context；
- 场景中 `+` 菜单 label 从 `找话题` 调整为 `下一句怎么说`；
- 提供 exit chip 或轻按钮清空 `activeScene`。

### Not required for Kimura pilot

- `/api/session-summary` scene awareness；
- URL 参数 `?scene=...`；
- localStorage 持久化；
- scene completion detection；
- `coveredSignals`；
- `sceneStillRelevant`；
- 多场景；
- 多 NPC；
- 首页入口；
- 场景库；
- 进度条 / 完成状态 / 评分；
- 自动判断用户是否说对。

第一版不需要数据库、长期保存或复杂状态迁移。

## 14. Success Criteria

Kimura pilot 成功标准：

- 用户更容易发出第一句；
- 用户能自然聊到 3-6 轮；
- Topic Ideas / Response Options 真的能帮助用户说下一句；
- 用户仍觉得是在和 Kimura 聊，而不是使用结账模拟器；
- 用户可以跑偏，Kimura 能接住；
- 场景不产生课程感 / 考试感；
- Review Card 能提取一两句实用表达；
- 不破坏 Free Chat。

## 15. Open Questions

- Empty-state 入口还是只放 `+` 菜单？
- `activeScene` 是否需要 URL 参数？
- 是否需要 `sceneStillRelevant` / `coveredSignals`？
- 何时把场景扩展到其他 NPC？
- 场景会不会削弱 LINE-like 自由聊天感？
- Review Card 是否要显示本次小场景标签？
- 是否需要一次性提示用户“可以划词查词 / 试小场景”？
- 明确的退出按钮怎么设计更自然？
- 退出入口应该是 chip、菜单项，还是聊天中的轻操作？
