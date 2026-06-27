# Guided Scenario Judge Calibration Plan

## 概述

本计划用于 Codex blind judge calibration，目的是测试 Codex 作为 evaluator 与人工评测的一致性。

## 评测目标

评测 Guided Scenario 的默认链路：

`npcOpening → sampleUserLineJa → npcResponse1`

## Calibration 流程

### Phase 1: 准备 Gold Set

从 manual-review-sheet.csv 抽取已人工评测的 cases：
- 有 `npcResponse1`
- 有评分或 `primaryBadCaseType`

当前 gold set 约 8-9 条。

### Phase 2: 生成 Blind Input

生成 `blind-input.json` 和 `blind-input.md`：
- 只包含事实输入（scenario 信息、trace）
- **不包含**人工评分、badCaseTypes、mainIssue、suggestedFix

### Phase 3: Codex Blind Judge

让 Codex 阅读 `blind-input.md` 和 `guided-scenario-judge-prompt-v1.md`：
- 对每个 case 打分（6 维度）
- 选择 badCaseTypes（最多 1 primary + 0-2 secondary）
- 填写 `mainIssue` 和 `rootCauseComponent`

### Phase 4: 对比分析

使用 `comparison-template.csv` 对比：
- 每个维度的 score diff
- primaryBadCaseType 是否一致
- secondaryBadCaseTypes 重合度
- 分析差异原因

## 文件结构

```
.tmp/eval/guided-scenarios/judge-calibration/
├── blind-input.json         # 事实输入（JSON）
├── blind-input.md           # 事实输入（Markdown）
├── human-gold.csv           # 人工答案（Codex 不可读）
├── judge-results-template.json  # Judge 结果模板
├── comparison-template.csv  # 对比模板

docs/eval/
├── guided-scenario-judge-prompt-v1.md  # Judge prompt
├── guided-scenario-manual-eval-guide.md  # 手动评测指南
```

## Bad Case Types（最终 10 个）

1. `setup_overlap`
2. `prefill_quality_issue`
3. `missing_referent`
4. `intent_over_narrowed`
5. `response_off_target`
6. `weak_continuation_hook`
7. `weak_scene_progression`
8. `repetitive_response`
9. `over_explaining`
10. `generic_or_monologue`

## Calibration 成功标准

- Score 差异 ≤ 1 分的 case ≥ 80%
- primaryBadCaseType 一致率 ≥ 70%
- 主要差异可解释（如评分标准理解差异）

## 后续步骤

1. 完成当前 gold set 的 Codex blind judge
2. 分析差异，调整 judge prompt
3. 扩展 gold set 到 15-20 条
4. 确定 calibration 后的 final prompt
