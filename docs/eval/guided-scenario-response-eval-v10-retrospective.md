# Guided Scenario Response Eval v10 Retrospective

## TL;DR

`Guided Scenario Response Eval v10 Full 73` 表明，当前 guided scenario response 已达到 beta 可接受水平。

- trace count: 73
- successful / failed: 73 / 0
- average total_score: 27.45
- median total_score: 29
- R0/R1/R2/R3: R0=1, R1=8, R2=25, R3=39
- R0 list: `kimura_discount_sticker`

阶段性结论：

- 当前没有广泛的 prompt-system blocker。
- 剩余问题主要是 P1 / P2 polish，而不是系统性 release-blocker。
- 如果发布前还要做一轮低成本收尾，优先做 `kimura_discount_sticker` 的单点 targeted 修复，而不是继续做全局 prompt tuning。

## Evaluation Context

本轮 response eval 评估的是 Guided Scenario 的默认链路：

```txt
npcOpening -> sampleUserLineJa -> npcResponse1
```

目标不是让 NPC 给出“完美答案”，而是验证：

```txt
用户进入 guided scenario 后，是否更容易开口、接话，并在 3–5 轮内产生低压力日语输出练习。
```

因此，response eval 主要关注：

- 是否自然接住用户当前这句；
- 是否像 Kotomachi 的住民；
- 是否避免变成老师、顾问、客服或建议机；
- 是否给用户留下 continuation opening；
- 是否不抢着解释、解决、总结或完成场景。

## Rubric v1.2 Calibration

这轮长期结论必须和 `docs/eval/guided-scenario-response-judge-rubric-v1.2.md` 一起理解。

早期 eval 的问题是：容易把很多“轻微常识推断”也判成 R0，结果更像在抓 prompt 细节，而不是在判断真实产品体验。

v1.2 的核心调整是区分：

- 轻微常识推断 / 日常语境可接受但不够保守的说法；
- 真正破坏体验的具体编造、角色崩坏、visible stage direction、IP / direct magic leakage 等。

当前 priority 口径：

```txt
R0 = 真正破坏体验或严重编造，必须人工修。
R1 = 可用但明显影响体验。
R2 = 基本自然，轻微问题。
R3 = 良好，自然、角色稳定、有继续空间。
```

v1.2 更贴近产品问题本身：

1. NPC 是否像自然住民；
2. NPC 是否避免变成老师 / 顾问 / 客服 / 建议机；
3. NPC 是否给用户留下继续说的空间；
4. Response 是否没有过早把场景做完。

## Repair History Summary

### Setup Alignment Phase

早期发现很多问题并不是单纯 response 失误，而是 opening / prefill / response 三段本身不对齐。

主要现象包括：

- opening 抢了用户的话；
- sampleUserLineJa 锁死了过窄意图；
- prefill 依赖看不见的指代对象；
- 场景在 `npcOpening -> sampleUserLineJa` 这一段就已经被做完。

因此先做了 Guided Scenario 3-Part Alignment 和 P0 setup rewrite，显著减少了 opening 抢话、prefill 重复、scene 提前关闭的问题。

### Response Eval Phase

在 v1 / v2 / v3 targeted response eval 中，逐步暴露出几类系统性问题：

- Riku 容易变成 advice-ending；
- Saku 容易变成 lore narrator / poetic riddle；
- Kimura / Nana 的 practical scenes 容易进入具体编造或说明书化；
- Aoi 的 clarification scene 容易解释完却不把话头还给用户。

### Prompt Assembly Audit

中途做过 prompt assembly / runtime audit，确认：

- scenePrompt 确实进入了 route runtime messages；
- provider payload 也保留了多个 system messages；
- `activeSceneId`、history、scene-specific metadata、avoid rules、first-turn constraints 都已经到达模型调用侧。

因此后续问题的主因更像：

- prompt competition；
- persona default posture 不稳定；
- 某些 NPC 的默认 conversational baseline 不够符合产品目标；

而不是 sampler / route / provider 丢参。

### Saku Repair

Saku 的修复方向不是继续堆 mystery rules，而是把 persona 从“诗意谜语人 / lore narrator”收回到“普通隐藏身份的巫师式住民”。

修复后：

- 不再 lore narrator；
- 无 IP / direct magic leakage；
- 无 poetic riddle tone；
- 更像一个知道一些、但低调遮掩异常的普通住民。

在 v10 full 73 中，Saku 的平均分为 28.13，R0 / R1 为 0，说明修复有效。

### Riku Repair

Riku 的修复方向是把默认姿态从 trainer / advisor 收回到 peer follow-up：

- first guided turn 不默认给建议；
- 先接住用户感受或情况；
- 再问一个具体 follow-up。

v10 full 73 中：

- caseCount: 8
- avgScore: 30
- R0/R1/R2/R3: 0/0/0/8

说明 Riku 的 advice-ending 已经不再是系统性问题。

### Stage Direction Repair

中途曾出现过：

```txt
（レンジのボタンを押す）
```

这类 visible stage direction，直接破坏 chat bubble 的产品感。

后续把“不要输出可见动作描写”升成更硬的全局约束。  
v10 中：

- `stage_direction_visible = 0`

说明这条修复也已经生效。

## v10 Overall Results

v10 full 73 的核心结果：

```txt
average total_score: 27.45
median total_score: 29
R0/R1/R2/R3: 1 / 8 / 25 / 39
```

bad case type distribution：

```txt
good_response=39
too_closed=16
weak_continuation_hook=6
advisor_or_customer_service_tone=6
transactional_invention=1
teacher_tone=1
over_explaining=1
local_rule_hallucination=1
response_off_target=1
too_direct_recognition=1
```

解读：

- 大多数 case 已经进入“自然可用”区间；
- 剩余的主流问题不再是严重错误，而是 `too_closed` / `weak_continuation_hook` 这种体验层 polish；
- 真正的严重问题只剩一个单点 edge case：`kimura_discount_sticker`。

## By-NPC Conclusions

### Riku

```txt
caseCount: 8
avgScore: 30
R0/R1/R2/R3: 0/0/0/8
```

结论：v8 修复成功，advice-ending 不再是系统性问题。

### Saku

```txt
caseCount: 8
avgScore: 28.13
R0/R1/R2/R3: 0/0/4/4
```

结论：保持 v5 改善，无 lore / IP / direct magic regression。剩余只是 hook / mystery balance 的轻微 polish。

### Kimura

```txt
caseCount: 6
avgScore: 27
R0/R1/R2/R3: 1/0/2/3
```

结论：整体稳定，但 `kimura_discount_sticker` 仍是唯一 R0。

### Nana

```txt
caseCount: 8
avgScore: 23.13
R0/R1/R2/R3: 0/4/2/2
```

结论：life_support 类场景仍偏顾问 / 说明书，但不是 release blocker。

### 其他 NPC

- Taisho 稳定；
- Mao 基本稳定；
- Haruka 基本稳定，少数 case teacher-like；
- Misaki 稳定但部分 hook 弱；
- Ren 稳定但部分 too_closed；
- Aoi 无 romantic drift，但 `aoi_ask_interests` clarification scene 仍可优化。

## By-Category Conclusions

- `exercise_support`: 8/8 R3，当前最稳定之一；
- `mystery`: 无 lore / IP / direct magic regression；
- `life_support`: 最弱类别，偏说明书 / 顾问；
- `convenience_store`: 只剩 discount sticker edge case；
- `school_lab`: 基本稳定，个别 teacher tone；
- `travel_chat` / `cafe` / `casual_friend`: 多数可用，主要是 hook 弱或 too_closed；
- `izakaya` / `part_time_work`: 整体稳定。

## Remaining Issues

### Release Blocker / Narrow Edge Case

只列：

```txt
Possible blocker / P1 edge case:
kimura_discount_sticker
```

说明：

- 它仍断言未给定的贴纸状态；
- 但它是单点 case，不代表整体 guided scenario system blocker；
- 是否作为 release blocker 由产品判断决定；
- 如果要修，优先改该 scene 的 avoid 或 Kimura discount-specific wording，而不是继续大改全局 prompt。

### P1

- Nana life_support 说明书感 / 顾问感；
- `aoi_ask_interests` clarification scene 未充分把话头还给用户；
- `haruka_paper_question` 偶发 teacher tone；
- `mao_ask_to_explain_again` response off-target；
- `ren_solo_trip` 偏 generic / advisor-like。

### P2

- R2 中大量 `too_closed` / `weak_continuation_hook`；
- 部分低风险闲聊可以更自然地抛回用户；
- 但这些不值得继续大规模 prompt tuning，可留给后续内容 polish。

## Product Read

当前 guided scenario response 质量已达到 beta 可接受水平。

不建议继续把大量时间投入 guided scenario prompt 微调。  
建议把主线切换到更高收益方向：

- memory system；
- voice / audio quality；
- release preparation；
- bad-case logging workflow。

同时也建议：

```txt
v10 支持进入下一阶段。
若要发布前再做一次收尾，只需 targeted 修 kimura_discount_sticker，然后抽样复查，不需要再次大规模 prompt tuning。
```

## Follow-up Recommendation

建议下一步：

1. 可选：单点修 `kimura_discount_sticker`；
2. 不建议继续全局 prompt tuning；
3. 保留 dashboard CSV 作为后续人工筛选；
4. 后续如果有用户真实反馈，再通过 bad-case logging 追加；
5. 转入：
   - memory system；
   - voice / audio experience；
   - homepage / release prep；
   - feedback collection。

## Related Working Files

长期文档只保留摘要。详细临时产物仍在 `.tmp/eval/guided-scenarios/response-eval-v10-full-73/`：

- `response-eval-summary-v10-full-73.md`
- `response-eval-priority-queue-v10-full-73.md`
- `response-review-dashboard-v10-full-73.csv`
- `response-sampling-log-v10.md`

后续如果要继续看 guided scenario response 的具体 case，优先从 dashboard 和 priority queue 进入，而不是重新从 full traces 开始读。
