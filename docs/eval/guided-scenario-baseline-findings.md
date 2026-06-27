# Guided Scenario Baseline Findings

## 概述

本文档用于汇总 Guided Scenarios 第一轮人工评测的共性发现。

> 数据来源：lib/conversation-scenes.ts（73 个场景）
> 生成时间：2026-06-27T04:58:02.650Z

## 静态风险扫描结果

### 场景风险分布

- 总场景数：73
- 存在静态风险的场景数：25 (34.2%)
- 无静态风险的场景数：48 (65.8%)

### 风险标志统计

| 风险标志 | 场景数 | 占比 |
|----------|--------|------|
| possible_missing_referent | 12 | 16.4% |
| opening_too_long | 8 | 11.0% |
| possible_opening_overanswers | 7 | 9.6% |

### 风险标志说明

- **possible_opening_prefill_overlap**: opening 和预填句有明显重复关键词或对象
- **possible_missing_referent**: 预填句包含これ/それ/あれ等可能依赖上下文的表达
- **possible_opening_overanswers**: opening 已经包含明显共情、建议、安抚或推荐
- **opening_too_long**: opening 过长（超过 70 字符或包含 3 句以上）

## 待填写的基线发现

以下部分由人工评测后填写：

### 高频 Bad Case Patterns

- 

### Setup 层常见问题

- 

### NPC Response 层常见问题

- 

### 优化建议优先级

- 

### 下一步改进方向

- 
