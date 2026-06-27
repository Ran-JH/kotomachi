# Guided Scenario Manual Eval Guide

## 概述

本指南用于人工评测 Kotomachi / 言街 的 guided scenarios（引导场景）功能。

**第一轮人工 eval 只测试 Guided Scenario 的默认路径：**

`npcOpening → sampleUserLineJa → npcResponse1`

**评测目标：** 用户发送系统预设的固定句后，NPC 能不能自然接住，并让用户愿意继续说第二句。

## 评测原则

- **短而自然 > 长而详细**
- **低压力输出 > 课堂式教学**
- **NPC 对话感 > 老师讲解感**
- **轻推进 > 强任务完成**
- **用户愿意继续说，比单轮回复信息量更重要**
- 不要因为回复很长就给高分
- 不要把"讲解很多"误判为学习价值高
- **第一轮 baseline 重点看默认预填句能不能启动对话**

## Guided Scenario 3-Part Alignment

三个部分各司其职，才能形成好的对话开端：

1. **npcOpening**: 只负责搭场景，不要抢用户要说的话，也不要提前完成共情/建议/解释；
2. **sampleUserLineJa**: 是用户要练的核心表达，应短、自然、明确，不依赖看不见的对象；
3. **npcResponse1**: 要自然接住用户意图，并给用户第二句的 continuation hook。

**核心判断：**
- Opening 不抢话；
- Prefill 有表达价值；
- Response1 有继续钩子。

## 真实链路

Kotomachi 的 Guided Scenario 真实链路：

1. 用户点击进入某个 guided scenario；
2. NPC 自动发出 `npcOpening`；
3. 用户输入框自动预填 `sampleUserLineJa`；
4. 用户通常直接发送这句，或轻微修改；
5. NPC 需要自然接住这句，并让对话有继续下去的可能。

## 常见 Continuation Hooks

好的 continuation hook 应该：

- **给两个轻选项**："A と B どっちがいい？"
- **问一个简单选择题**："どちらにしますか？"
- **给一个具体下一步**："では、まず〇〇をしましょう"
- **邀请用户观察/尝试**："見てみて"
- **反问用户偏好**："どう思いますか？"
- **对隐藏/趣味场景，留一点悬念并问一个小观察问题**："気づいたことはありますか？"

## NPC 类型差异

不同类型的 NPC，评测标准略有差异：

- **实用型 NPC（木村、美咲、大将）**：避免说明书，优先给下一步动作；
- **生活建议型 NPC（七海）**：避免泛泛建议，具体但不编造事实；
- **氛围型 NPC（葵、真央）**：避免只共鸣不抛球；
- **隐藏 NPC / 朔（Saku）**：不要提前揭谜，要保留 curiosity hook。

## 归因优先级

遇到问题时，按以下顺序排查：

1. **先判断是不是 opening 抢话**：npcOpening 是否说了用户本该说的话？是否提前给了建议/共情？
2. **再判断 sampleUserLineJa 是否不自然、过窄或缺少指代对象**：预填句是否生硬？是否依赖看不见的上下文？
3. **再判断 response1 是否缺少 hook**：NPC 是否自然接住？是否给了继续的理由？
4. **不要把所有问题都归因成 model behavior**，很多问题来自 scenario setup。

## Rubric（6 维度，每项 1-5 分）

### setup_alignment — 设置对齐度

- **5**: opening 和预填句自然衔接，像真实场景一来一回
- **3**: 大体相关，但有轻微错位
- **1**: opening 和预填句明显不搭

### prefilled_line_quality — 预填句质量

- **5**: 短、自然、实用，学习者愿意直接发送
- **3**: 意思清楚，但略教科书/略不自然
- **1**: 生硬、太长、翻译腔、或不适合当前场景

### response_to_prefill — 对预填句的回应

- **5**: NPC 自然接住并回应用户实际意图
- **3**: 基本回应了，但有点泛或机械
- **1**: 没答到、重复用户句、解释这句话怎么用，或明显跑偏

### continuation_hook — 继续钩子

- **5**: NPC 回复后用户很容易接第二句
- **3**: 可以继续，但需要用户自己想
- **1**: 对话像已经结束，用户不知道接什么

### scene_progression_potential — 场景推进潜力

- **5**: 有轻微自然推进，能支撑 2–4 轮
- **3**: 能聊下去，但推进较弱
- **1**: 只完成一次问答，没有场景延展

### anti_overteaching — 避免过度教学

- **5**: 保持 NPC 对话感，不主动长篇教学
- **3**: 有轻微说明感，但仍可接受
- **1**: 明显变成老师、纠错器、说明书或人生导师

## Bad Case Types（10 类）

每条 review 最多选 **1 个 primary** + **0–2 个 secondary**。细节不要靠 badCaseType 表达，而应写进 `mainIssue`。

- `setup_overlap` — opening 抢了用户或 response 的功能，导致默认链路重复、错位或提前说完
- `prefill_quality_issue` — sampleUserLineJa 本身不自然、不适合直接发送，或和场景目标不合
- `missing_referent` — `これ`/`この`/`それ` 等没有明确指代对象，导致用户句在纯文本里缺少上下文
- `intent_over_narrowed` — 预填句把场景目标过早锁死，例如"问支付方式"变成"能不能刷卡"
- `response_off_target` — NPC 没有回应用户真实意图，或接到别的方向
- `weak_continuation_hook` — response1 后用户不好接第二句，或对话像已经结束
- `weak_scene_progression` — 能接话，但场景没有向下一步推进
- `repetitive_response` — NPC 重复 opening、prefill、用户原话，或重复同一层意思
- `over_explaining` — 回复变成教学、说明书、生活建议 FAQ，或明显过长
- `generic_or_monologue` — 回复有氛围或正确，但过于泛泛、独白化，缺少互动价值

### 旧类型迁移映射

| 旧类型 | 新类型 |
|--------|--------|
| opening_prefill_overlap / opening_response_overlap / opening_overanswers / opening_prefill_mismatch | setup_overlap |
| prefill_unnatural / sample_line_mismatch | prefill_quality_issue |
| prefill_over_narrows_intent | intent_over_narrowed |
| npc_does_not_answer / character_drift | response_off_target |
| hard_to_continue_after_response / npc_ends_conversation / no_curiosity_hook | weak_continuation_hook |
| no_scene_progression | weak_scene_progression |
| npc_repeats_or_explains_prefill | repetitive_response |
| over_teaching / expository_life_advice / too_long | over_explaining |
| too_generic / atmospheric_monologue / missing_learning_value / mystery_resolved_too_early | generic_or_monologue |
| missing_referent | missing_referent（保留） |

## Root Cause Components

- `scenario_entry` — 场景入口设计
- `npc_opening` — NPC 开场白
- `sample_user_line` — 样例用户句
- `micro_episode` — 小剧情
- `npc_prompt` — NPC 系统提示
- `scenario_injection` — 场景注入方式
- `model_behavior` — 模型行为
- `unknown` — 不确定

## 评测流程建议

1. 从 P0 优先级开始（字段不完整的场景）
2. 每个 scenario 测试默认预填路径：
   - 记录 NPC opening
   - 用户发送预填句 sampleUserLineJa
   - 记录 NPC response1
   - 尝试手动接一句，记录 NPC response2
3. 根据 rubric 打分
4. 记录 bad case 和 root cause：
   - 选 1 个 primaryBadCaseType
   - 选 0–2 个 secondaryBadCaseTypes
   - 在 mainIssue 中详细描述问题
5. 标注 staticRiskFlags（脚本自动生成，仅作参考）

## 字段说明

### 核心字段

- `staticRiskFlags` — 脚本基于 scenario 文本自动提示的可能风险（仅供参考，不是 confirmed bad case）
- `primaryBadCaseType` — 最核心的问题类型（最多选 1 个）
- `secondaryBadCaseTypes` — 次要问题类型（0–2 个，逗号分隔）
- `mainIssue` — 详细描述问题（不要依赖 badCaseType 表达细节）
- `rootCauseComponent` — 问题根源组件
- `suggestedFix` — 建议修复方案
- `regressionNeeded` — 是否需要回归测试

### Deprecated 字段

以下字段已移除，不再作为主要填写字段：

- `setupIssue` — 已合并到 mainIssue
- `responseIssue` — 已合并到 mainIssue
- `dynamicRiskFlags` — 已移除，风险信息应记录在 badCaseTypes 和 mainIssue 中
- `badCaseTypes`（旧版） — 已拆分为 primaryBadCaseType + secondaryBadCaseTypes

### staticRiskFlags 说明

- `possible_opening_prefill_overlap` — opening 和预填句可能有重复
- `possible_missing_referent` — 预填句可能缺少指代对象
- `possible_opening_overanswers` — opening 可能提前完成共情/建议
- `opening_too_long` — opening 可能过长
- `possible_prefill_over_narrows_intent` — 预填句可能过窄

## 输出文件

- `scenario-inventory.csv` — 场景总览表
- `manual-review-sheet.csv` — 人工评测表（CSV 格式）
- `manual-review-sheet.md` — 人工评测表（Markdown 格式）
- `guided-scenario-baseline-findings.md` — 基线发现总结

## 后续扩展（v2 robustness eval）

以下用户类型可作为后续第二轮评测重点，但不是当前第一轮 baseline 的重点：

- **normal_user**: 正常按场景聊天，有一点日语输出能力
- **weak_output_user**: 日语输出弱，可能混输，只能说短句
- **drift_user**: 输入与场景相关但有点跑偏
