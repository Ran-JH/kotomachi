# NPC Spec Template / NPC 扩展规范

> 目的：给 Kotomachi 后续新增 NPC 时使用的统一模板与检查清单。
> 重点不是“多加角色”，而是保证每个 NPC 都是一个清晰、低压力、可持续的口语关系场景。

## Current 5 NPC Baseline / 当前 5 个 NPC 基准

- `Misaki / 美咲`：轻丁寧，咖啡馆，安静闲聊，休息和轻情绪表达。
- `Kimura / 木村`：随意口语，便利店夜勤，年轻熟人感，生活节奏和轻吐槽。
- `Taisho / 大将`：熟客口语，居酒屋，年长店主式寒暄，下班后放松。
- `Haruka / 遥`：轻丁寧，研究室 / 校园，前辈请教，轻正式校园日语。
- `Aoi / 葵`：タメ口 / 平语，学生 lounge / after-school 共享空间，同级朋友，兴趣闲聊。

用途：

- 它不是角色设定集，只是未来新增 NPC 时的对照基准。
- 新 NPC 必须回答：自己到底补了哪条新的 `scene / relationship / register` 价值。

## Existing NPC Comparison Matrix / 现有 NPC 对比矩阵

| NPC | Scene | Relationship distance | Register | Learning value | Risk if overdone |
| --- | --- | --- | --- | --- | --- |
| Misaki | 咖啡馆 | 轻熟客 / 轻距离 | 轻丁寧 | 安静闲聊、点单、轻情绪表达 | 老师腔、心理咨询腔 |
| Kimura | 便利店夜勤 | 年轻熟人 / 柜台外聊天 | 随意口语 | 夜勤、零食、新商品、生活节奏 | 太冷、太短、太泛 |
| Taisho | 居酒屋 | 熟客 / 年长店主 | 熟客口语 | 下班后放松、吃喝、收尾寒暄 | 说教、人生导师 |
| Haruka | 研究室 / 校园 | 前辈 / 可请教对象 | 轻丁寧 | 课程、文献、发表、校园轻正式表达 | 教授、老师、留学顾问 |
| Aoi | 学生 lounge / 放课后 | 同级朋友 | タメ口 / 平语 | 兴趣闲聊、推荐、轻邀约、朋友式 casual | 恋爱化、依赖化、二次元化 |

## Differentiation Rules for New NPCs

新增 NPC 前，必须先回答：

- 这个 NPC 覆盖了哪个新场景？
- 它和现有 NPC 的关系距离有什么不同？
- 它训练的表达是否有新增价值？
- 它的 register 是否和现有 NPC 明显区分？
- 如果和现有 NPC 场景重叠，差异点是什么？
- 它如何支持“短对话 × 多场景 × 可回顾 × 可复用”？

要特别强调：

- NPC 不是“一个人设”，而是“一个口语关系场景”。
- `Misaki` 和 `Haruka` 都可能偏轻丁寧，但一个是咖啡馆安静闲聊，一个是校园前辈请教。
- `Kimura` 和 `Aoi` 都偏 casual，但一个是便利店年轻熟人感，一个是同级朋友タメ口。
- `Taisho` 是熟客口语，不是普通 casual。

## 1. Basic Identity

- `npcId`:
- `displayName`:
- `kana`:
- `location`:
- `avatar`:
- `role in Kotomachi`:

## 2. Scene Value

- `Core scene`:
- `Why the user talks to this NPC`:
- `Main conversation situations`:
- `What Japanese expressions this NPC helps practice`:
- `How this scene supports a 3-15 minute short speaking loop`:

## 3. Relationship / Register Value

这一节必须明确写清楚：

- `User relationship`：店员 / 店主 / 前辈 / 同级朋友 / 熟客 / 路过熟人等
- `Relationship distance`：陌生、轻熟、熟客、前辈、同级朋友等
- `Register`：轻丁寧、随意口语、熟客口语、タメ口等
- `What this register helps users practice`:
- `How this NPC differs from similar-register NPCs`:

强调点：

- 不只写“性格温柔”或“比较随意”。
- 要写出这个关系距离和语气，为什么能帮助用户练不同说法。

## 4. Register / Tone

- `Speech style`:
- `Politeness level`:
- `Relationship distance`:
- `Relationship / register value`:
- `Typical sentence length`:
- `Emoji / slang policy`:
- `Same intent in this NPC's register`:

## 5. Initial Welcome

- `First-visit context`:
- `Opening style`:
- `Must avoid`:
- `Sample good welcomes`:
- `Sample bad welcomes`:

## 6. Revisit Welcome

- `Revisit trigger assumptions`:
- `How to refer to previous chat`:
- `Must avoid`:
- `Sample good revisit welcomes`:
- `Sample bad revisit welcomes`:

## 7. Conversation Rhythm

这一节用于描述 NPC 如何支持一段短而完整的低压力对话。

### Opening

- `Why would the user start talking to this NPC`:
- `What kind of first line feels easy here`:
- `How this NPC lowers opening pressure`:

### Development

- `What small topics can naturally last 2-4 turns`:
- `How this NPC handles short / mixed / fragmentary user input`:
- `How this NPC extends gently instead of only answering once or over-questioning`:

### Soft landing

- `When should this NPC start soft-closing`:
- `How can this NPC make a short exchange feel complete`:
- `What to avoid in closing`:

说明：

- v0 不做显式阶段 UI。
- `Conversation rhythm` 是 prompt 和内容节奏，不是任务系统。

## 8. Continuation Support

这一节用于约束 `starter pool` 和 `AI continuation ideas`。

- `How this NPC helps the user continue the conversation`:
- `Good opening starters`:
- `Good continuation ideas`:
- `Bad continuation ideas`:
- `What to do when the user gives a very short reply`:
- `What to do when the user mixes Chinese / English / Japanese`:
- `What fixed starter pool should feel like in opening mode`:
- `What AI-generated continuation ideas should feel like in development mode`:
- `What kinds of topic ideas do not fit this NPC`:

要求：

- continuation ideas 不能只“像 AI 建议”，要保持这个 NPC 的关系语气。
- opening starter 要低压力、容易开口。

## 9. Topic Engine

- `Starter prompt categories`:
- `Status-aware topic ideas`:
- `If user says very little`:
- `If user mixes Chinese / English / Japanese`:
- `If user asks for help directly`:
- `How topic ideas fit this NPC's scene and relationship`:
- `How this NPC helps continuation after 2-3 turns`:
- `Soft landing / when to gently close or recap`:

## 10. Learning Value

- `Casual expressions`:
- `Polite expressions`:
- `Situation-specific vocabulary`:
- `Useful grammar / phrase patterns`:
- `Review Card value`:

## 11. Life Arc

- `Arc 1`:
- `Arc 2`:
- `Arc 3`:
- `Possible states`:
- `Cross mentions with other NPCs`:
- `Street / town connection`:
- `How this NPC reacts to shared weather / time / atmosphere`:

## 12. Town Connection / 街区感

这一节用于描述 NPC 如何属于 Kotomachi 这个小世界。

- `How this scene connects back to Kotomachi`:
- `Which other scenes can be lightly mentioned`:
- `How this NPC reacts to weather / time / shared world state`:
- `Cross mention boundaries`:

原则：

- cross mention 要轻。
- 不做复杂 shared memory。
- 不做大型剧情世界观。
- 不做角色关系网游戏。
- 目标只是让用户感觉这些 NPC 生活在同一个语言街区里。

## 13. Low-pressure Boundary

### NPC should

- Continue the conversation naturally.
- Accept incomplete / mixed-language input.
- Keep replies short.
- Let learning support live in separate UI layers.
- Support `短对话 × 多场景 × 可回顾 × 可复用`.

### NPC must not

- Act like a Japanese teacher.
- Correct the user inside the main chat.
- Over-explain grammar.
- Ask too many questions in a row.
- Become a companion / romance / roleplay bot.
- Break the natural scene setting.

## 14. Failure-Friendly Behavior

当用户出现以下情况时，NPC 应如何处理：

- `User only says one very short line`:
- `User does not know how to continue`:
- `User mixes Chinese / English / Japanese`:
- `User STT result is messy`:
- `User suddenly stops`:
- `User speaks in fragments`:
- `User says "I don't know how to say it"`:

原则：

- 不让用户感觉失败。
- 不纠错。
- 不说教。
- 不打分。
- 不说“你可以再多说一点”这种施压话。
- 先接住，再给一个很小的继续入口。

## 15. Drift Risks and Bad Replies

每个 NPC spec 必须明确：

- `Most likely drift direction`:
- `Concrete bad reply types`:
- `Why they are bad`:
- `Smallest prompt fix if drift appears`:

当前 5 个 NPC 的常见 drift pattern：

- `Misaki` -> 心理咨询师 / 日语老师
- `Kimura` -> 太冷、太短、接不住话
- `Taisho` -> 人生导师 / 说教型长辈
- `Haruka` -> 教授 / 留学顾问 / 老师
- `Aoi` -> 恋爱角色 / 陪伴 AI / 二次元社团角色

## 16. Sample User Intents

列 8-12 个最常见的用户意图，尽量覆盖真实低压力口语场景。

建议按“场景 + 说法”写，而不是只列抽象 intent。

## 17. Sample Replies

### Good replies

- 3 条自然、短、可继续聊的回复

### Bad replies

- 3 条需要避免的回复
- 每条 bad reply 后写一句原因

### 判断标准

- 是否像真实的店员 / 前辈 / 同学 / 熟客在说话
- 是否保持低压力
- 是否避开教学腔和系统腔

## 18. Avatar Direction

请对照 `docs/avatar-style-spec.md`（如果项目中存在）或当前已有头像规范。

- `Anchor object`:
- `Personality object`:
- `Location cue`:
- `Accent color`:
- `Must avoid`:
- `Similarity risk with existing NPCs`:

要求：

- 用 scene-object badge 方向
- 不画人物脸
- 不做角色立绘
- 不做二次元头像

## 19. Spec-to-Code Mapping

把 spec 字段和代码落点先对应起来，方便新增 NPC 时逐项检查：

- `Basic Identity` -> `lib/npc.ts`, `components/home/*`, `app/chat/[npcId]/page.tsx`
- `Scene Value` -> `lib/home-scenes.ts`, homepage card copy
- `Relationship / Register Value` -> `app/api/chat/route.ts`, homepage register label
- `Initial Welcome` -> `app/api/welcome/route.ts`
- `Revisit Welcome` -> `app/api/welcome/route.ts`
- `Conversation Rhythm` -> `app/api/chat/route.ts`, `starter-prompts.ts`
- `Continuation Support` -> `lib/starter-prompts.ts`, `app/api/topic-ideas/route.ts`
- `Life Arc` -> `lib/npc.ts`
- `Town Connection` -> `lib/npc.ts`, `lib/home-scenes.ts`
- `Homepage entry` -> `lib/home-scenes.ts`, `components/home/*`
- `Chat sidebar display` -> `app/chat/[npcId]/page.tsx`
- `Review Cards / Saved Items typing` -> `lib/session-summary.ts`, `lib/saved-items.ts`
- `Avatar handling` -> `public/avatars/*`, avatar path config

## 20. Implementation Checklist

新增 NPC 时，至少检查这些位置：

- `lib/npc.ts`
  - `NpcId` union
  - `NPC_NAMES`
  - `NPC_DISPLAY_NAMES`
  - `NPC_AVATARS`
  - `NPC_ARCS`
  - `HOME_CARD_LINES`
  - `isNpcId()`

- `lib/starter-prompts.ts`
  - `NPC_STARTER_PROMPTS`
  - `getStatusAwareTopicIdea()`
  - `pickStarterPrompts()`

- `lib/home-scenes.ts`
  - `HOME_SCENES`
  - `getActiveHomeNpcIds()`

- `components/home/scene-entry-section.tsx`
  - `NPC_INFO`
  - card copy
  - homepage register label

- `components/home/inspiration-section.tsx`
  - `NPC_INFO`

- `components/home/continue-section.tsx`
  - `NPC_INFO`

- `app/chat/[npcId]/page.tsx`
  - `NPC_LIST`
  - NPC display fallback
  - sidebar / review panel display

- `app/api/welcome/route.ts`
  - `NPC_PERSONALITIES`
  - `INITIAL_GREETING_HINTS`
  - `NPC_DISPLAY_NAMES`
  - fallback welcome
  - sanitize welcome assumptions

- `app/api/chat/route.ts`
  - chat system prompt branch
  - anti-teacher constraints
  - relationship / register constraints
  - tone / reply length

- `app/api/session-summary/route.ts`
  - check whether npc-specific copy exists

- `app/api/topic-ideas/route.ts`
  - scene hints
  - fallback ideas
  - relationship-aware continuation ideas

- `lib/saved-items.ts` / `lib/session-summary.ts`
  - check `NpcId` typing compatibility

- `Review Cards / Saved Items`
  - type compatibility if needed

- `avatar path / placeholder handling`
  - asset path exists
  - placeholder naming is consistent

- `experience log entry`
  - record the NPC expansion and evaluation notes

强调：

- 新增 NPC 不算完成，直到它出现在：
  - scene entry
  - inspiration
  - continue / sidebar
  - welcome
  - chat
  - starter
  - topic ideas
  - review / saved 相关链路里

## 21. First Candidate NPC: Part-time Restaurant Manager / Staff

> Draft only. This is not implementation.

- `npcId candidate`: `restaurant_senpai` / `teishoku_staff` / 待定
- `role`: 定食屋 / ファミレス的打工前辈或年轻 shift leader
- `scene`: 饭点前后、点单确认、员工间轻沟通、下班后简短寒暄
- `learning value`: 点单确认、服务敬语、请求帮忙、排班、轻职场沟通、工作后闲聊
- `tone`: 年轻但比木村更可靠；忙但不冷淡；丁寧语和自然口语混合
- `why this NPC should be next`: 补足“生活 + 打工 + 轻职场”场景
- `risks`: 容易和木村 / 大将重叠；要守住“饮食服务 + 打工前辈 / shift leader”的差异

## Notes for future expansion

- 新 NPC 不是“角色收集”，而是“场景覆盖”。
- 建议先写 spec，再加代码。
- 隐藏原创魔法系 NPC 可以作为未来彩蛋，但不要直接使用 Harry Potter / Hogwarts 等受版权保护 IP。
