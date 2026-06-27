# Guided Scenario Judge Prompt v1.1

## 评测链路

评测默认链路：

`npcOpening → sampleUserLineJa（用户直接发送预填句） → npcResponse1 → 用户是否容易继续`

## 核心原则

- Opening 不抢话
- Prefill 有表达价值
- Response1 有继续钩子

## v1.1 新增规则（基于 calibration 结果）

### 1. Judge scenario intent, not only sentence-level coherence

必须比较 `title` / `starterIntent` / `microEpisode` / `npcOpening` / `sampleUserLineJa`。

如果 `sampleUserLineJa` 把更宽的场景目标过早锁死，要考虑 `intent_over_narrowed`。

**例子**：
- Scenario title: "问支付方式"
- sampleUserLineJa: "カードで払えますか。"
- 这是 `intent_over_narrowed`，因为预填句把"问支付方式"锁死到"卡支付"。

### 2. Cap continuation score when no clear hook exists

如果 `npcResponse1` 没有明确问题、选择、下一步、邀请或观察任务，`continuation_hook` 通常不得超过 3。

即使 response 文字漂亮、氛围好，没有明确 handoff 就不能给高分。

**判断标准**：
- 有明确问题 → 可以 4-5
- 有选择/下一步 → 可以 4
- 只有语气结尾 → 上限 3
- 像已经结束 → 1-2

### 3. Do not overreward atmosphere

氛围好、语气自然、文字漂亮，不等于用户容易继续。

Ren-like reflective scenes 和 Saku-like mystery scenes 也必须给用户下一句入口。

**错误倾向**：
- 看到"共鸣感强"就给高分 → 需要检查是否有 handoff
- 看到"有世界观/神秘感"就宽容 → 需要检查 curiosity hook

### 4. Mystery scenes need curiosity hooks

对隐藏/趣味/Saku 场景：
- `npcOpening` 不应提前解释核心 mystery
- `npcResponse1` 应该 reveal a little, leave a little unresolved, and provide a curiosity hook

**判断标准**：
- Opening 揭示太多 mystery → `setup_overlap`
- Response1 没有给用户继续探索的理由 → `weak_continuation_hook`

### 5. Setup overlap should lower multiple scores

如果 `npcOpening` 已经抢了用户表达或 `npcResponse1` 功能，不能只标 `setup_overlap`，还应影响：
- `setup_alignment` — 通常 ≤ 2
- `response_to_prefill` — 因为 response 只是重复或轻微添加
- `scene_progression_potential` — 因为场景已提前完成

### 6. Multiple root causes are allowed

混合 case 可以列 2 个 `rootCauseComponent`，例如：
- `sample_user_line, model_behavior` — 预填句设计有问题，同时 response 行为也有问题
- `npc_opening, model_behavior` — opening 抢话，同时 response 没有提供 hook

## 评分维度（每项 1-5 分）

### setup_alignment — 设置对齐度

opening 和 sampleUserLineJa 是否对齐。

- **5**: opening 和预填句自然衔接，像同一个小场景里的自然一来一回
- **3**: 大体相关，但有轻微错位（如 opening 问 A，预填句答 B）
- **1**: opening 和预填句明显不搭，或 opening 已经抢了预填句的功能

**注意**：如果 opening 抢话，通常 ≤ 2。

### prefilled_line_quality — 预填句质量

预填句是否自然、短、适合学习者。

- **5**: 短、自然、实用，学习者愿意直接发送
- **3**: 意思清楚，但略教科书味或略不自然
- **1**: 生硬、太长、翻译腔、或明显不适合当前场景

**注意**：必须同时考虑和 title/starterIntent 的关系。

### response_to_prefill — 对预填句的回应

NPC response1 是否自然接住用户发送的预填句。

- **5**: NPC 自然接住并回应用户实际意图，不重复不解释
- **3**: 基本回应了，但有点泛或机械
- **1**: 没答到、重复用户句、解释这句话怎么用、或明显跑偏

**注意**：如果 response 只是重复 opening/prefill 的内容，应考虑 ≤ 3。

### continuation_hook — 继续钩子

response1 是否给用户继续说第二句的机会。

- **5**: 用户很容易接第二句（有选择、确认、下一步、自然反问）
- **3**: 可以继续，但需要用户自己想
- **1**: 对话像已经结束，用户不知道接什么

**注意**：如果没有明确 handoff，上限是 3。不要因为氛围好就给高分。

### scene_progression_potential — 场景推进潜力

这个 scenario 是否有继续 2-4 轮的潜力。

- **5**: 有轻微自然推进，能支撑 2-4 轮低压力对话
- **3**: 能聊下去，但推进较弱，容易原地寒暄
- **1**: 只完成一次问答，没有场景延展

**注意**：如果 opening 已经完成场景核心动作，通常 ≤ 2。

### anti_overteaching — 避免过度教学

NPC 是否保持对话感，不变成老师/纠错器/说明书。

- **5**: 保持 NPC 对话感，不主动长篇教学
- **3**: 有轻微说明感，但仍可接受
- **1**: 明显变成老师、纠错器、说明书或人生导师

## Bad Case Types（最多选 1 个 primary + 0-2 个 secondary）

只能使用以下 10 个类型：

1. `setup_overlap` — opening 和预填句功能重叠（opening 抢了用户要说的）
2. `prefill_quality_issue` — 预填句不自然、太长、或翻译腔
3. `missing_referent` — 预填句用了"这个/那个"但没有可见指代对象
4. `intent_over_narrowed` — 预填句把场景意图收窄到单一选项（如只问卡支付）
5. `response_off_target` — NPC response 没有回应用户实际意图
6. `weak_continuation_hook` — response1 没有把球抛回用户，难以继续
7. `weak_scene_progression` — 场景推进弱，容易原地空转
8. `repetitive_response` — NPC response 重复 opening 或预填句的内容
9. `over_explaining` — NPC response 变成解释/说明/教学
10. `generic_or_monologue` — NPC response 太泛化或变成独白

**注意**：`intent_over_narrowed` 需要比较 title/starterIntent，不要漏判。

## Root Cause Components（可选 1-2 个）

- `scenario_entry` — 场景入口设计问题
- `npc_opening` — NPC 开场白问题
- `sample_user_line` — 样例用户句问题
- `micro_episode` — 小剧情问题
- `npc_prompt` — NPC 系统提示问题
- `scenario_injection` — 场景注入方式问题
- `model_behavior` — 模型行为问题（非 scenario 设计问题）
- `unknown` — 不确定

**注意**：混合 case 可以列 2 个，用数组表示。

## Judge 注意事项

1. **不要偏好长回答**：短而自然可以高分，长而详细不等于好
2. **不要把"解释很多"误判为好**：over_explaining 是 bad case
3. **不要把"氛围好"误判为好接**：氛围好不等于 continuation_hook 强
4. **不要把所有问题都归因成 `model_behavior`**：先检查 scenario 设计
5. **如果 opening 抢了用户或 response 的功能**：优先考虑 `setup_overlap`，并降低多个维度分数
6. **如果 response1 没有把球抛回用户**：优先考虑 `weak_continuation_hook`，上限 3
7. **如果预填句锁死场景意图**：考虑 `intent_over_narrowed`
8. **每条最多 1 个 primary + 0-2 个 secondary badCaseType**
9. **细节写入 `mainIssue`**：不要靠 badCaseType 表达所有 nuance
10. **Mystery/atmosphere scenes 也必须有 handoff**：不要因为世界观好就宽容

## 输出格式

为每个 case 输出：

```json
{
  "caseId": "...",
  "scores": {
    "setup_alignment": 1-5,
    "prefilled_line_quality": 1-5,
    "response_to_prefill": 1-5,
    "continuation_hook": 1-5,
    "scene_progression_potential": 1-5,
    "anti_overteaching": 1-5
  },
  "totalScore": sum of 6 scores,
  "primaryBadCaseType": "one of 10 types or null",
  "secondaryBadCaseTypes": ["up to 2 types"],
  "mainIssue": "detailed description of the main problem",
  "rootCauseComponent": ["1-2 components"],
  "suggestedFix": "optional suggestion",
  "confidence": "high/medium/low"
}
```
