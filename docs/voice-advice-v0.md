# Voice Advice v0

## 1. Purpose

Voice Advice 解决的不是“这句话怎么说”，而是“我刚才这样说出来，听起来怎么样”。

Kotomachi 的用户并不总是需要更自然的改写；很多时候，他们更想知道的是：

- 我刚才有没有说太快；
- 句子有没有被说得太轻；
- 中间停顿自然不自然；
- 语尾有没有吞掉；
- 听起来像在读稿，还是像真的在说话；
- 某些词有没有可能听不清；
- 下一次复述时可以怎么微调，才能更容易让对方听懂。

这类反馈对日语学习者尤其重要，因为口语练习中常见的困难往往不是“不会句型”，而是“说出口以后听感不稳”：

- 说太快；
- 说太轻；
- 停顿不自然；
- 语尾吞掉；
- 像读稿；
- 个别词不清楚。

Kotomachi 的目标不是发音考试，而是让用户更敢开口、更愿意复述。Voice Advice 的价值，在于把“我说出口了”这件事变成一次低压力、可继续尝试的反馈循环。

## 2. Product Positioning

Kotomachi 不是 pronunciation scoring app。

Voice Advice 是低压力口语反馈层，不是发音打分系统，也不是口音诊断工具。

推荐定位：

> A gentle speaking-feedback layer for voice messages in a LINE-like Japanese practice town.

Voice Advice 应保持以下特征：

- 温和；
- 短；
- 可操作；
- 不评分；
- 不诊断口音；
- 不纠结音素；
- 不羞辱用户；
- 不假装拥有超出实际能力的音频诊断能力。

Voice Advice 的语气应更像“轻提示”，而不是“老师批改”。

## 3. Relationship to Expression Hints

Voice Advice 必须和 Expression Hints 明确分层。

| Feature | Input | Main question | Output |
| --- | --- | --- | --- |
| Expression Hints | text / STT transcript | 这句话怎么说更自然 | casual / natural / formal expressions |
| Voice Advice | user audio + transcript as support | 我刚才说得清楚吗 | listening impression / pace / pause / clarity advice |

必须明确：

- Voice Advice 不替代 Expression Hints；
- Voice Advice 不生成三档表达；
- Voice Advice 不进入 Expression Hints 保存链路；
- Voice Advice 不进入 `recentExpressionHints`；
- Voice Advice v0 不进入 Review Card evidence；
- 两个按钮可以并列显示在用户语音气泡下。

这两个功能回答的是不同问题：

- Expression Hints = 这句话可以怎么说得更自然；
- Voice Advice = 我刚才这样说出来，听起来怎么样。

如果 Voice Advice 只基于 transcript 改写，它就会和 Expression Hints 重叠，因此 v0 不应把它包装成“另一个表达建议入口”。

## 4. UI Entry Strategy

入口位置：

用户语音消息气泡下方的 action row。

现有相邻入口：

- 听自己的语音；
- Expression Hints / 表达提示。

新增按钮文案：

- 中文：`语音建议`
- 英文：`Voice advice`

显示条件：

```ts
sender === "user" && hasUserRecording
```

显示规则：

- 不在普通文字消息下显示；
- 不在 NPC 消息下显示；
- 不在刷新后无音频的历史消息下显示；
- v0 不要求刷新后保留按钮；
- v0 只对当前会话内仍有音频的用户语音消息提供入口。

UI 位置上，Voice Advice 应和“听自己的语音”以及 Expression Hints 并列，避免用户把它误认为系统强制步骤。

## 5. Suggested UI Card

Voice Advice 点击后，应显示轻量卡片或 drawer。

建议响应结构：

```ts
type VoiceAdviceResponse = {
  summary: string;
  clarity: string;
  paceOrPause: string;
  oneThingToTry: string;
  retryLine?: string;
};
```

中文 UI 示例：

- 整体听感
- 大致能听懂，不过前半句有点快。
- 可以注意
- 「今日は」后面可以稍微停一下。
- 下次试试
- 把句尾说完整一点，会更清楚。

英文 UI 示例：

- Overall impression
- Mostly understandable, but the first half sounds a little fast.
- Try this
- Leave a small pause after 「今日は」.
- Next attempt
- Finish the sentence ending a bit more clearly.

卡片行为规则：

- 不要长篇讲语法；
- 不要输出三档表达；
- 不要像老师批改；
- 不要使用红色错误感；
- 不要说“你的发音错了”；
- 不要把卡片做成考试结果页。

理想状态是：用户看完后愿意马上再说一遍，而不是觉得自己被判卷。

## 6. Audio Availability

当前技术事实如下：

- 当前会话内有 `userAudioBlob` / `userAudioUrl`；
- 刷新后音频不持久化；
- `saveChatHistory()` 不保存音频；
- 历史恢复会丢失 voice 类型；
- v0 可以接受“只对当前会话内的语音消息提供 Voice Advice”；
- v0 不做语音持久化；
- v0 不改 memory schema；
- v0 不要求刷新后仍可分析旧语音。

这意味着 Voice Advice v0 的产品边界是明确的：

- 它可以分析“当前这次说话”；
- 它不承诺分析“以后再打开历史记录时还能分析这段录音”。

## 7. API Contract

建议新增独立 route：

```text
POST /api/voice-advice
```

请求建议使用 `multipart/form-data`，因为前端已经有 `Blob`，而且 `/api/stt` 也采用了类似方式。

建议字段：

```ts
audio: File;
transcript?: string;
npcId?: string;
uiLanguage?: "zh" | "en";
```

响应建议：

```ts
type VoiceAdviceResponse = {
  summary: string;
  clarity: string;
  paceOrPause: string;
  oneThingToTry: string;
  retryLine?: string;
};
```

错误响应：

```ts
{
  error: string;
}
```

必须明确：

- 不复用 `/api/feedback`；
- 不改变 Expression Hints schema；
- 不改变 Review Card schema；
- 不保存 Voice Advice；
- 失败时只显示轻量错误，不产生可收藏内容。

如果后端暂时没有可用的音频能力，也不应该伪装成功。应明确返回安全的 not-configured / unavailable 错误，而不是假装已经分析了音频。

## 8. Backend Capability Requirements

Voice Advice 如果要真正 audio-aware，后端必须能够处理音频本身，而不是只看 transcript。

可选路线如下。

### Preferred: Route A-lite / Azure Pronunciation Assessment spike

使用 Azure Speech Pronunciation Assessment 做 spike 验证。

优点：

- 真的处理音频；
- 比 metadata-only 更接近 Voice Advice 的产品目标；
- 可以先验证 `ja-JP` 是否对 Kotomachi 有价值；
- 结果有机会转译成低压力反馈，而不是裸分数。

风险：

- 成本；
- API 兼容；
- 延迟；
- `ja-JP` 的评估质量可能不稳定；
- 浏览器录音格式可能需要转码；
- 某些 raw metric 不能直接映射成温和 UI；
- STT transcript 作为 reference text 时，transcript 错误会影响结果。

说明：

- 使用用户录音作为 audio input；
- 使用 STT transcript 作为 reference text；
- locale 优先验证 `ja-JP`；
- 返回结果先只用于开发者测试；
- 后续再映射成 gentle `VoiceAdviceResponse`。

### Not preferred as product mainline: Route B metadata-only

基于音频时长、transcript 长度、可能的停顿信息等做轻量建议。

优点：

- 便宜；
- 工程简单；
- 可控。

风险：

- 不应声称做了精确发音诊断；
- 容易让用户觉得是伪功能；
- 没有真正评估音频发音；
- 不适合作为正式 Voice Advice 主线。

Route B 可以作为 debug / fallback 思路，但不作为正式 Voice Advice 主线。

### Avoid as product feature: Route C transcript-only

只基于 transcript 给建议。

优点：

- 最容易实现。

风险：

- 和 Expression Hints 重叠；
- 不应作为最终 Voice Advice；
- 如果使用，必须明确标注为 fallback，不要声称分析了音频；
- 不应包装成 Voice Advice。

v0 应优先探索 Azure Pronunciation Assessment spike。

Route C 只适合保底，不适合作为产品主线。

## 8.1 Azure Pronunciation Assessment Spike

Spike 目标：

- 验证 Azure Speech Pronunciation Assessment 是否支持当前目标 `ja-JP`；
- 验证当前浏览器录音格式是否能被 Azure 接收；
- 验证是否可以用 STT transcript 作为 reference text；
- 验证返回结果是否包含可用的：
  - accuracy；
  - fluency；
  - completeness；
  - word-level / syllable-level details；
  - prosody（如果 locale / SDK 支持）；
- 验证结果是否能转成 Kotomachi 式低压力反馈；
- 验证延迟和成本是否可接受。

Spike 的原则：

- 先只做开发者测试；
- 不开放给普通用户；
- 不保存音频；
- 不进 Review Card；
- 不把 raw scores 暴露给 UI。

## 8.2 Reference Text Strategy

Scripted pronunciation assessment 更适合有 reference text 的场景。

Kotomachi v0 spike 可以采用：

```text
audio = user recording
referenceText = STT transcript
```

但必须记录风险：

- STT transcript 可能错误；
- 如果 transcript 错，assessment 可能不可靠；
- Azure 的 miscue / error signal 不应直接当作用户错误；
- UI 需要保持低确定性措辞。

推荐措辞：

- “系统可能没有稳定听清这里”
- “不一定是发音问题，也可能是录音或识别问题”
- “可以试着再慢一点”
- “可以把句尾说完整一点”

## 8.3 Assessment Result Mapping

Azure raw metrics:

- `AccuracyScore`
- `FluencyScore`
- `CompletenessScore`
- `PronScore`
- word-level / syllable-level details

Kotomachi Voice Advice:

- 整体听感
- 可能不清楚的地方
- 下次可以试试
- 再说一遍的小目标

明确规则：

- 不显示总分；
- 不显示 `PronScore: 72`；
- 不使用红色错误批改；
- 不诊断口音；
- 不说“你发音错了”；
- 可以说“这里可能没有被系统稳定识别，可以再放慢一点”。

## 9. Prompt Behavior

如果后端使用支持音频的模型，prompt 应要求：

- listen to the user's audio;
- use transcript only as reference;
- do not assume the transcript is perfect;
- give gentle feedback on clarity, pace, pauses, and sentence endings;
- do not score;
- do not diagnose accent;
- do not provide phoneme-level correction;
- do not shame the user;
- keep advice short;
- output in UI language;
- preserve Japanese examples when useful.

示例规则：

```text
You are giving gentle speaking feedback for a Japanese learner.
Listen to the audio directly. Use the transcript only as a reference.
Do not score pronunciation.
Do not diagnose accent.
Do not give phoneme-level correction.
Focus on clarity, pace, pauses, and whether the sentence ending is easy to hear.
Give one concrete thing to try next time.
```

## 10. Relationship / NPC Context

Voice Advice 可以接收 `npcId`，但 v0 只用于轻微调整建议语气，不改变功能核心。

示例语气：

- Aoi：更像朋友对话，不要恋爱化；
- Kimura：便利店 / 服务柜台语气；
- Misaki：咖啡馆轻丁寧；
- Taisho：居酒屋熟客距离；
- Haruka：研究室前辈；
- Nana：生活支援场景，清楚礼貌。

注意：

- 不要让 Voice Advice 变成 Expression Hints；
- NPC context 只影响“下次复述时语气可以怎样更自然”；
- 不改变“听感反馈”的产品核心。

## 11. Safety and Honesty

Voice Advice 不应：

- 声称用户发音错误，除非模型确实可靠；
- 给分数；
- 评价口音好坏；
- 判断母语背景；
- 使用羞辱性语言；
- 给医疗 / 听力 / 语言障碍诊断；
- 把 STT 错误当作用户错误；
- 输出“你说错了”这种强纠错语气。

推荐表述：

- “这里可能听起来有点快”
- “句尾可以再说完整一点”
- “可以在这里稍微停一下”
- “这句话已经能传达意思”
- “下次可以试着……”

核心原则是：说清楚“听起来如何”，不要假装自己在做精密发音审判。

## 12. Non-goals

v0 不做：

- pronunciation score；
- phoneme-level diagnosis；
- accent classification；
- CEFR / JLPT speaking score；
- 对历史录音持久化分析；
- audio storage；
- Review Card integration；
- expression hint saving；
- social sharing；
- leaderboard；
- daily speaking streak；
- complex analytics；
- automatic advice after every voice message；
- activeScene-aware voice advice；
- long-term pronunciation profile；
- metadata-only pseudo assessment；
- 展示 Azure raw scores；
- 将 STT mismatch 直接判为用户错误；
- 在没有真实 assessment backend 时开放 Voice Advice UI；
- 把 Voice Advice 做成 Expression Hints 的替代入口。

这份文档刻意把范围收窄到“用户主动点开、对当前录音做一次温和反馈”。

## 13. Implementation Packs

建议按包推进，避免一次把语音系统、后端模型和 UI 全部绑死。

### Pack 0: Spec only

- 新增 `docs/voice-advice-v0.md`
- 不改代码

### Pack 1: API contract

- 新增 `lib/voice-advice-types.ts`
- 新增 `/api/voice-advice`
- 支持 `multipart/form-data`
- 不接 UI
- 不改 Expression Hints
- 如果没有真实 audio backend，可先返回 safe not-configured error，不要 fake success

已完成：

- `lib/voice-advice-types.ts`
- `app/api/voice-advice/route.ts`
- multipart/form-data contract
- safe not-configured response

### Pack 2: Azure assessment spike

- 在 `/api/voice-advice` 后面接 Azure Pronunciation Assessment；
- 使用 feature flags：
  - `VOICE_ADVICE_ENABLED`
  - `VOICE_ADVICE_PROVIDER`
  - `AZURE_SPEECH_KEY`
  - `AZURE_SPEECH_REGION`
- 只供开发者手动测试；
- 不接 UI；
- 不保存音频；
- 不进 Review Card；
- 不开放给普通用户。

### Pack 3: Gentle result mapping

- 把 raw scores 映射成 `VoiceAdviceResponse`；
- 不暴露裸分数；
- 处理低置信度 / transcript mismatch；
- 保持低压力措辞。

### Pack 4: UI entry

- 在用户语音气泡 action row 加 `语音建议 / Voice advice`
- 只有当 route 能返回真实 mapped advice 后，才在语音气泡下显示按钮
- 不显示 not-configured 空入口
- 不保存，不收藏，不进 Review Card

### Pack 5: Quota / beta guardrails

- 如果准备扩大测试，再加 invite code / usage quota；
- Voice Advice 次数限制应比普通 chat / TTS 更严格。

## 14. Success Criteria

Voice Advice v0 的成功标准是：

- 用户能在语音消息下发现按钮；
- 用户理解它和 Expression Hints 不同；
- 反馈确实围绕“听起来怎样”；
- 不生成三档表达；
- 不打分；
- 不考试化；
- 不羞辱用户；
- 失败态不污染其他系统；
- 不破坏现有 STT / TTS / Expression Hints；
- 用户愿意根据建议再说一遍。

## 15. Open Questions

仍需后续确认的问题：

- Azure Speech resource 是否已准备？
- 使用哪个 region？
- Vercel serverless 调用 Azure Speech 是否稳定？
- 使用 Speech SDK 还是 REST / lower-level API？
- 浏览器录音 MIME 是否需要转码？
- `ja-JP` 短句 assessment 质量如何？
- 日语是否有可用 syllable / word-level detail？
- 是否支持 prosody？
- 最短录音长度设多少？
- 成本是否可控？
- 是否需要 feature flag 隐藏按钮？
- 未来是否需要 invite quota？
