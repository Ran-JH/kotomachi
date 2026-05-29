# Generated Explanation Language Spec

## Purpose

Kotomachi 已支持 UI language toggle（中文 / English），当前 UI labels 可以跟随语言切换，但部分生成型学习内容仍固定为中文：

- 查词解释中的 meaning / sentence meaning / expanded explanation
- 表达提示中的 usage / reason / note
- 回顾卡片中的 meaning / learning note / summary text

如果 UI 是 English，但学习解释仍是中文，会破坏国际化体验。解释语言跟随 UI language 可以让 Kotomachi 更适合非中文用户，这也是 AI-native learning product 的一致性要求。

本规格说明哪些字段应跟随 UI language、哪些保持不变，以及分步实现计划。

---

## Core Rule

1. **UI labels follow UI language.** 按钮、标题、提示文案等跟随当前 UI language。
2. **Teaching explanations follow UI language.** meaning / note / explanation / reason 等教学说明字段跟随 UI language。
3. **Japanese learning content remains Japanese.** 日语单词、读音、例句、建议表达等学习内容本体保持日语。
4. **NPC replies remain Japanese.** NPC 在聊天中的回复保持纯日语，不翻译。
5. **User input remains unchanged.** 用户原话保持原样，不翻译。
6. **Saved items keep the explanation language at the time of save unless regenerated.** 已保存内容保留保存时的解释语言，除非用户主动重新生成。

---

## Language Boundary Examples

### 中文 UI

| 字段 | 示例 |
|------|------|
| Button label | 收藏词语 |
| Word | 夜勤 |
| Reading | やきん |
| Meaning | 夜班 / 夜间工作 |
| Example | 夜勤が終わったら、すぐ寝たいです。 |
| Learning note | 「夜勤」は夜间工作的意思。 |

### English UI

| 字段 | 示例 |
|------|------|
| Button label | Save word |
| Word | 夜勤 |
| Reading | やきん |
| Meaning | night shift / night work |
| Example | 夜勤が終わったら、すぐ寝たいです。 |
| Learning note | 「夜勤」 means working at night. |

---

## Affected Areas

### N1: Word Explanation

Fields that should follow UI language:

- meaning
- sentenceMeaning
- nuance / expanded explanation
- error / fallback messages

Fields that remain Japanese:

- word
- reading
- example sentence if Japanese
- NPC message quote

### N2: Expression Hints

Fields that should follow UI language:

- usage
- reason
- explanation
- note
- UI labels

Fields that remain Japanese:

- suggested expressions
- Japanese examples

### N3: Review Cards

Fields that should follow UI language:

- conversation summary
- reusable expression explanations
- word meanings
- learning notes
- next topic explanation

Fields that remain Japanese:

- suggested Japanese expressions
- Japanese words / readings
- Japanese examples
- card title may remain Japanese if generated from conversation topic

---

## Implementation Plan

### Pack N0: Generated Explanation Language Spec（当前）

- 新建本规格文档，明确语言边界和分步计划。
- 不修改任何业务代码。
- 后续 Pack N1 / N2 / N3 基于本规格逐步实现。

### Pack N1: Word Explanation Language

- Add UI language to explain request payload if not already available.
- Update explain prompt to return teaching explanation in zh or en.
- Keep Japanese content Japanese.
- Do not change popover UI structure except labels if needed.

### Pack N2: Expression Hint Language

- Add UI language to feedback request payload if not already available.
- Update feedback prompt so usage / reason / note follow UI language.
- Keep suggested expressions Japanese.
- Avoid changing suggestion quality rules.

### Pack N3: Review Card Language

- Add UI language to session-summary request payload if not already available.
- Update summary prompt so explanation fields follow UI language.
- Keep Japanese learning content Japanese.
- Existing saved review cards keep old language unless regenerated.

---

## Storage Rule

- Saved words / expressions / review cards should display the language stored at save time.
- Future regeneration may produce English explanations if UI is English.
- Do not silently rewrite old saved content.
- 混合语言出现在 saved items 中是 MVP 可接受的状态，不需要自动统一。

---

## Risks

1. **模型把日语学习内容也翻译成英文。** Prompt 需要明确区分"教学说明"和"学习内容本体"，否则模型可能把日语例句也翻译成英文。
2. **英文 UI 下仍残留中文解释。** Prompt 变更不完全或模型未遵循时，可能出现英文 UI 下仍有中文 explanation。
3. **中文 UI 下意外变成英文解释。** UI language 传递错误或 prompt 逻辑反转时，中文 UI 下可能生成英文说明。
4. **回顾卡片标题语言不稳定。** Card title 可能根据对话话题生成日语，也可能跟随 UI language，需要明确规则。
5. **Prompt 变化污染生成质量。** 修改 prompt 增加语言指令可能影响其他生成质量（如解释准确性、建议自然度）。
6. **Saved items 出现不同语言混合。** 用户切换 UI language 后，旧内容与新内容语言不同，这是 MVP 可接受的。

---

## Manual QA

1. 中文 UI 下查词解释为中文。
2. English UI 下查词解释为英文。
3. English UI 下日语例句仍是日语。
4. Expression hints 的 suggested expressions 仍是日语。
5. English UI 下 usage / reason / note 为英文。
6. Review card 的 meaning / note 跟随 UI language。
7. 用户原句不被翻译。
8. NPC 回复不被翻译。
9. 已保存旧内容不被自动改写。
10. 切换 UI language 后新生成内容使用新语言。
