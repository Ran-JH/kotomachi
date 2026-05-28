# QA 工作流 / QA Workflow

## 用途

这份文档定义 Kotomachi / 言街 后续如何把真实使用问题转成可复查的 bad case、修复任务和回归检查。

目标不是建立很重的测试体系，而是形成一个固定闭环，避免同类 UI、状态、prompt 或 LLM 行为问题反复出现。

## 什么时候更新 Regression Cases

如果本次任务修复或调整了以下内容，就检查是否需要更新 `docs/regression-cases.md`：

- UI bug
- 状态机问题
- LocalStorage 问题
- TTS / STT 问题
- 移动端布局问题
- 回顾卡片逻辑问题
- 音频播放或录音回放问题
- 浮窗定位、viewport 裁切、响应式布局问题
- 用户可见错误、toast、empty state、disabled state

`regression-cases.md` 用于记录产品、工程和 UI 行为。每个 case 最好能手动复现。

## 什么时候更新 Prompt Eval Cases

如果本次任务修复或调整了以下内容，就检查是否需要更新 `docs/prompt-eval-cases.md`：

- NPC 行为
- welcome 自然度
- 表达提示质量
- 划词解释质量
- 回顾卡片内容质量
- LLM JSON / 结构化输出稳定性
- prompt 中关于纠错、语言选择、语气、证据优先级的规则

`prompt-eval-cases.md` 只放 LLM 行为和 prompt 质量相关 case。不要把纯样式、纯布局、纯按钮状态问题塞进去。

## Bug Fix 的 Definition of Done

每次修 bug 时，Codex 必须检查：

1. 是否需要新增 regression case。
2. 是否需要新增 prompt eval case。
3. 是否已有 case 需要从 Open / Watch 改成 Fixed。
4. manual test 是否足够清楚，未来能照着复查。
5. 是否涉及 `docs/private/`。如果涉及，不读取、不总结、不提交私人内容。

## 任务收尾检查清单

每次任务完成报告中应包含：

- 修改了哪些文件
- 行为变化是什么
- 手动验收步骤
- Regression docs updated: yes/no + 原因
- Prompt eval docs updated: yes/no + 原因
- Private docs touched: 必须是 no
- 推荐 commit message

## 隐私边界

- `docs/private/` 是本地私人求职材料目录。
- 不要读取、总结、移动或修改 `docs/private/` 下的文件。
- 如果发现 `docs/private/` 被 Git 跟踪，只报告并提醒用户运行：
  `git rm --cached -r docs/private`
- 不要把 interview notes、resume bullets、job strategy 或私人情绪记录写进公开 docs。

## 推荐闭环

```txt
Experience Log
  -> Bad Case
  -> Fix
  -> Regression Case
  -> 如果涉及 LLM 行为，再进入 Prompt Eval Case
  -> Manual Check
```

同一个问题可能同时需要 regression case 和 prompt eval case。例如：

- welcome 连续触发是状态回归，需要 regression case。
- welcome 说 `13時間ぶり` 是 LLM 行为问题，也需要 prompt eval case。

## 文档语言原则

面向项目维护者和使用者阅读的文档，默认中文为主。必要的英文可以保留在：

- 文件标题的英文别名；
- case ID；
- 技术名词；
- 状态字段，例如 Fixed / Watch / Open；
- 路径、命令和代码标识符。

不要把给用户看的项目文档写成全英文，除非用户明确要求英文版。
