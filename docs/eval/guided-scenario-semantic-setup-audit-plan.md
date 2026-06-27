# Guided Scenario Semantic Setup Audit Plan

## 概述

下一阶段只评估 setup，不生成 npcResponse，不模拟用户，不调用项目 chat API。

输入是全量 scenario 的 setup 部分，输出是全量 setup 风险审查和 priority queue。

## 评测目标

识别 setup 阶段的设计问题，包括：

1. **opening-prefill 功能重叠**：npcOpening 是否抢了 sampleUserLineJa 的表达功能
2. **intent narrowing**：sampleUserLineJa 是否把 title/starterIntent 锁死到单一选项
3. **missing referent**：预填句是否使用无上下文的指代词
4. **prefill quality**：预填句是否自然、短、适合学习者
5. **opening 过长或过度 worldbuilding**：对 mystery/atmosphere 场景尤其重要

## 输入字段

每个 scenario 只需要以下 setup 字段：

- `title` — 场景标题
- `category` — 场景类别
- `starterIntent` — 用户意图
- `microEpisode` — 小剧情/场景背景
- `npcOpening` — NPC 开场白
- `sampleUserLineJa` — 预填用户句

## 输出格式

每个 scenario 输出：

```json
{
  "scenarioId": "...",
  "setupRiskFlags": ["flag1", "flag2"],
  "setupRiskLevel": "high/medium/low",
  "primarySetupIssue": "description",
  "suggestedSetupFix": "optional suggestion",
  "priority": "P0/P1/P2"
}
```

## Setup Risk Flags

只能使用以下 flags：

- `opening_prefill_overlap` — opening 和预填句功能重叠
- `intent_narrowed` — 预填句锁死场景意图
- `missing_referent` — 预填句缺少指代对象
- `prefill_unnatural` — 预填句不自然
- `prefill_too_long` — 预填句过长
- `opening_overanswers` — opening 提前完成共情/建议/解释
- `opening_too_long` — opening 过长
- `opening_reveals_mystery` — opening 提前揭示 mystery（仅 Saku/隐藏场景）
- `no_clear_continuation_potential` — setup 结构本身不支持多轮对话

## 评测流程

1. 读取全量 scenario setup 数据
2. 对每个 scenario 进行静态分析：
   - 比较 npcOpening 和 sampleUserLineJa 是否功能重叠
   - 比较 title/starterIntent 和 sampleUserLineJa 是否 intent narrowing
   - 检查 sampleUserLineJa 是否有指代词问题
   - 检查 npcOpening 是否过长或过度 worldbuilding
3. 生成 priority queue
4. 输出 setup audit report

## Priority 规则

- **P0**: 有 2+ high risk flags 或 `opening_prefill_overlap` + `intent_narrowed` 组合
- **P1**: 有 1 个 high risk flag 或 2+ medium risk flags
- **P2**: 只有低风险或无明显问题

## 与 Full Eval 的关系

Setup Audit 是 Full Eval 的前置步骤：

1. Setup Audit → 识别 setup 设计问题
2. Full Eval → 生成 npcResponse，测试真实链路
3. Calibration → 对比 human vs codex judge

Setup Audit 可以快速扫描全量 scenario，为 Full Eval 提供优先级指导。

## 文件结构

```
.tmp/eval/guided-scenarios/
├── setup-audit/
│   ├── setup-audit-input.json      # 全量 setup 数据
│   ├── setup-audit-results.json    # audit 结果
│   ├── setup-audit-results.csv     # audit 结果（CSV）
│   └── setup-audit-summary.md      # 总结报告

docs/eval/
├── guided-scenario-semantic-setup-audit-plan.md  # 本计划文档
```

## 与 Judge Prompt v1.1 的关系

Setup Audit 的 risk flags 与 Judge Prompt v1.1 的 badCaseTypes 有对应关系：

| Setup Risk Flag | Judge Bad Case Type |
|-----------------|---------------------|
| opening_prefill_overlap | setup_overlap |
| intent_narrowed | intent_over_narrowed |
| missing_referent | missing_referent |
| prefill_unnatural | prefill_quality_issue |
| opening_overanswers | setup_overlap (partial) |
| opening_reveals_mystery | setup_overlap (for mystery scenes) |

## 下一阶段任务

1. 实现 setup audit 脚本
2. 对全量 73 个 scenarios 进行 setup audit
3. 生成 priority queue
4. 选择 P0 cases 进行 full eval
