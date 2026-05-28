# 回归案例库 / Regression Cases

## 用途

这份文档用于记录 Kotomachi / 言街 中已经发现过的典型坏例子，帮助后续迭代避免同类问题反复出现。

它关注三类问题：

- 产品体验回归：例如 welcome 乱触发、回顾卡片重复生成。
- 工程状态回归：例如 LocalStorage、React effect、音频 URL 清理。
- UI / 可用性回归：例如浮窗被裁切、移动端溢出、字体混乱。

这里的 case 应该脱敏、具体、可复现。不要写私人求职材料、真实面试准备、简历 bullet 或情绪化吐槽。

## Case 模板

```md
## REG-000 - 简短标题

- ID:
- 类型:
- 区域:
- 风险:
- 坏表现:
- 期望表现:
- 手动测试:
- 相关文件:
- 状态:
```

## 状态规则

- Fixed：已经修复，但后续需要防回归。
- Watch：已经改善，但质量仍需要继续观察。
- Open：尚未修复，或只是发现了问题。

## NPC / Welcome Flow

### REG-WELCOME-001 - 有历史记录时不应无条件生成 welcome

- ID: REG-WELCOME-001
- 类型: 状态逻辑 / LLM 行为
- 区域: NPC welcome flow
- 风险: 用户重新进入聊天页时，NPC 可能突然多说一句，破坏聊天节奏。
- 坏表现: 只要聊天页有历史记录，每次进入页面都会自动生成新的 welcome。
- 期望表现: 先恢复历史记录；只有符合“再访 welcome”条件时，才生成一条新的自然开场。
- 手动测试: 打开已有历史的 NPC 聊天页，刷新一次，确认不会重复追加 welcome。
- 相关文件: `app/chat/[npcId]/page.tsx`, `app/api/welcome/route.ts`
- 状态: Fixed

### REG-WELCOME-002 - 上一条是 NPC 时，不应像 NPC 在自说自话

- ID: REG-WELCOME-002
- 类型: 状态逻辑 / LLM 行为
- 区域: NPC welcome flow
- 风险: 大多数聊天自然结束时，最后一句往往是 NPC；如果下一次进入又追加 NPC 句子，容易像两条 assistant 消息连在一起。
- 坏表现: 新 welcome 接着上一条 NPC 的话题继续说，好像用户没有回复也在往下聊。
- 期望表现: 再访 welcome 应该像用户重新进店、重新打开聊天时的自然开场，而不是上一轮对话的续写。
- 手动测试: 让某个 NPC 最后一条消息停在 assistant；下次重新进入时，确认 welcome 是重新开场，不是接着上一句继续讲。
- 相关文件: `app/chat/[npcId]/page.tsx`, `app/api/welcome/route.ts`
- 状态: Watch

### REG-WELCOME-003 - React effect 重跑不应生成双 welcome

- ID: REG-WELCOME-003
- 类型: React 状态
- 区域: 页面初始化
- 风险: StrictMode 或路由状态变化可能让 effect 执行两次。
- 坏表现: 空聊天页一次出现两条 welcome。
- 期望表现: 同一个 NPC、同一个空会话状态，只能生成一次初始 welcome。
- 手动测试: 打开一个从未聊过的 NPC，确认只出现一条初始 welcome。
- 相关文件: `app/chat/[npcId]/page.tsx`
- 状态: Fixed

### REG-WELCOME-004 - welcome 不应说精确时间差

- ID: REG-WELCOME-004
- 类型: Prompt 质量
- 区域: NPC welcome prompt
- 风险: `13時間ぶり`、`19時間ぶり` 这类说法像系统提醒，不像真实聊天。
- 坏表现: NPC 精确说出距离上次聊天过了多少小时、多少分钟或多少天。
- 期望表现: 使用模糊自然的表达，例如 `久しぶり`、`また来てくれたんだ`、`この前の話`。
- 手动测试: 触发再访 welcome，确认没有出现精确小时、分钟或日期差。
- 相关文件: `app/api/welcome/route.ts`
- 状态: Fixed

### REG-WELCOME-005 - welcome 不应高度重复

- ID: REG-WELCOME-005
- 类型: Prompt 质量
- 区域: NPC welcome prompt
- 风险: 开场白反复使用同一句式，会让 NPC 像模板。
- 坏表现: 同一个 NPC 每次都用几乎一样的开头。
- 期望表现: welcome 能参考最近几条 assistant 句子，避免重复相同句式，但不要为了变化而夸张。
- 手动测试: 多次触发同一 NPC welcome，比较开头是否自然变化。
- 相关文件: `app/api/welcome/route.ts`
- 状态: Watch

## 表达提示 / Expression Hints

### REG-FEEDBACK-001 - 展开按钮只应在确实有隐藏内容时显示

- ID: REG-FEEDBACK-001
- 类型: UI
- 区域: 表达提示面板
- 风险: 无意义的展开按钮会让用户觉得功能坏了。
- 坏表现: 解释内容刚好三行或更短时仍显示“展开说明”，点击后没有更多内容。
- 期望表现: 只有解释正文真实溢出时，才显示展开按钮。
- 手动测试: 分别打开短解释和长解释的表达提示；短解释不应显示展开按钮。
- 相关文件: `components/chat-bubble.tsx`
- 状态: Fixed

### REG-FEEDBACK-002 - 三档建议的“听一下”必须播放对应句子

- ID: REG-FEEDBACK-002
- 类型: 音频 / UI
- 区域: 表达提示面板
- 风险: 用户无法听到更自然表达的发音。
- 坏表现: “听一下”按钮无反应，或播放了错误文本。
- 期望表现: カジュアル / ふつう / フォーマル 三档分别播放自己的推荐表达，不包含解释和标签。
- 手动测试: 打开表达提示，分别点击三档“听一下”。
- 相关文件: `components/chat-bubble.tsx`, `app/api/tts/route.ts`
- 状态: Fixed

### REG-FEEDBACK-003 - 三档建议不依赖 emoji / 国旗 / 表情

- ID: REG-FEEDBACK-003
- 类型: UI polish
- 区域: 表达提示面板
- 风险: emoji-heavy UI 会显得临时、不成熟。
- 坏表现: 三档标题使用 emoji、国旗或彩色表情作为主要识别方式。
- 期望表现: 使用文字层级、细线、轻微 accent 或留白来区分。
- 手动测试: 打开表达提示，确认三档标题没有 emoji / 国旗。
- 相关文件: `components/chat-bubble.tsx`
- 状态: Fixed

### REG-FEEDBACK-004 - 表达建议不能只有形式化改写

- ID: REG-FEEDBACK-004
- 类型: Prompt 质量
- 区域: 表达提示
- 风险: “低压力”被误做成“低信息量”。
- 坏表现: 三档建议只是把句子换个格式，缺少可复用表达或有效说明。
- 期望表现: 每档给出可模仿的自然日语，并附带简短、有学习价值的说明。
- 手动测试: 输入中英日混合句，打开表达提示，检查三档是否都有真实可用的表达差异。
- 相关文件: `app/api/feedback/route.ts`, `components/chat-bubble.tsx`
- 状态: Watch

## 划词查词 / Word Explanation

### REG-EXPLAIN-001 - 查词浮窗不能被 viewport 裁切

- ID: REG-EXPLAIN-001
- 类型: UI 定位
- 区域: 划词查词
- 风险: 用户点到页面边缘附近的词时，看不到完整解释。
- 坏表现: 浮窗被顶部、左右或底部边界裁掉。
- 期望表现: 浮窗根据 viewport 自动翻转或 clamp，内容过长时内部滚动。
- 手动测试: 点击靠近页面顶部、左侧、右侧和底部的词。
- 相关文件: `components/chat-bubble.tsx`
- 状态: Fixed

### REG-EXPLAIN-002 - 短解释不应显示无意义展开按钮

- ID: REG-EXPLAIN-002
- 类型: UI
- 区域: 划词查词
- 风险: 用户点击展开后没有新增内容，会觉得交互无意义。
- 坏表现: 短解释也显示“展开解释 / 收起解释”。
- 期望表现: 只有内容确实较长时才显示展开。
- 手动测试: 查一个简单词，确认没有无意义展开按钮。
- 相关文件: `components/chat-bubble.tsx`
- 状态: Watch

### REG-EXPLAIN-003 - 查词解释需要平衡日常感和学习信息量

- ID: REG-EXPLAIN-003
- 类型: Prompt 质量
- 区域: 划词查词
- 风险: 解释要么太空泛，要么像语法论文。
- 坏表现: 输出长篇语法课，或只给一个没有上下文的中文词义。
- 期望表现: 给出读音、简义、这句话里的意思和有用语感说明。
- 手动测试: 在 NPC 消息中选一个常用表达，检查解释是否实用、不过载。
- 相关文件: `app/api/explain/route.ts`, `components/chat-bubble.tsx`
- 状态: Watch

### REG-EXPLAIN-004 - 用户查过的词应进入回顾卡片

- ID: REG-EXPLAIN-004
- 类型: 数据流
- 区域: 查词 / 回顾卡片
- 风险: 用户主动学习信号丢失。
- 坏表现: 用户查过的词在后续回顾卡片中完全没有被考虑。
- 期望表现: recentLookups 被精简保存，并优先进入“今日词语”。
- 手动测试: 查一个词后生成回顾卡片，检查“今日词语”是否引用或考虑该词。
- 相关文件: `components/chat-bubble.tsx`, `lib/session-summary.ts`, `app/api/session-summary/route.ts`
- 状态: Fixed

### REG-EXPLAIN-005 - 基础解释成功时详情区不应显示失败

- ID: REG-EXPLAIN-005
- 类型: UI / API fallback
- 区域: 划词查词
- 风险: 用户看到简义和句中意思后，展开区却显示“解释失败”，会认为功能不可靠。
- 坏表现: 查词基础解释能显示，但详情区域出现“解释失败，请稍后再试”。
- 期望表现: 如果详情失败，基础解释仍保留；详情区不显示无意义展开按钮，可用温和提示说明详情暂时不可用。
- 手动测试: 划选一个常用词，模拟详情生成失败，确认词义和句中意思不被覆盖。
- 相关文件: `components/chat-bubble.tsx`, `app/api/explain/route.ts`
- 状态: Fixed

### REG-EXPLAIN-006 - 查词不应把整句当成词义

- ID: REG-EXPLAIN-006
- 类型: Prompt 质量 / UI
- 区域: 划词查词
- 风险: 用户只想查一个词或短语时，浮窗却把整句翻译当作词义，学习信息会变得不准。
- 坏表现: 在 `夜勤の誘惑の方が強いよね。` 中选中 `夜勤` 或 `誘惑`，简义区显示整句话的意思，或缺少读音、句中用法。
- 期望表现: 简义只解释选中词本身；句中意思单独说明该词在当前句子里的作用；汉字词尽量给出假名读音。
- 手动测试: 分别选中 `夜勤`、`誘惑`、`寝たい`，确认简义、读音、句中意思和语感说明分层清楚。
- 相关文件: `app/api/explain/route.ts`, `components/chat-bubble.tsx`
- 状态: Fixed

## 回顾卡片 / Session Summary Cards

### REG-SUMMARY-001 - 同一批聊天不能生成多张重复回顾卡片

- ID: REG-SUMMARY-001
- 类型: 状态 / LocalStorage
- 区域: 回顾卡片
- 风险: sidebar 被重复卡片塞满。
- 坏表现: 连续点击“生成本次回顾”，同一批消息生成多张卡。
- 期望表现: 已生成过的 sourceFingerprint 直接打开已有卡片，不再重复调用 API。
- 手动测试: 生成一次回顾卡片后，在没有新用户消息时再次点击生成。
- 相关文件: `app/chat/[npcId]/page.tsx`, `lib/session-summary.ts`
- 状态: Fixed

### REG-SUMMARY-002 - 没有查词时，“今日词语”应有对话 fallback

- ID: REG-SUMMARY-002
- 类型: Prompt 质量
- 区域: 回顾卡片
- 风险: 用户没查词时，卡片内容变空。
- 坏表现: recentLookups 为空时，“今日词语”完全不出现。
- 期望表现: 如果对话中有实用词、短语或常用说法，则挑 2-3 个来自对话的项目。
- 手动测试: 不查词，只聊天，然后生成回顾卡片。
- 相关文件: `app/api/session-summary/route.ts`
- 状态: Fixed

### REG-SUMMARY-003 - 非日语输入片段应优先进入“下次可以这样说”

- ID: REG-SUMMARY-003
- 类型: Prompt 质量 / evidence
- 区域: 回顾卡片
- 风险: 用户真实表达缺口被忽略。
- 坏表现: 英文或明显中文片段没有被用于表达升级。
- 期望表现: nonJapaneseSpans 作为强 evidence，优先进入“下次可以这样说”。
- 手动测试: 发送一条混合英文/中文的消息，生成回顾卡片，检查表达升级是否处理该片段。
- 相关文件: `lib/non-japanese-spans.ts`, `app/api/session-summary/route.ts`
- 状态: Fixed

### REG-SUMMARY-004 - 打开/播放过的表达提示应作为 summary evidence

- ID: REG-SUMMARY-004
- 类型: 数据流 / evidence
- 区域: 回顾卡片
- 风险: 用户主动关注过的学习点没有被沉淀。
- 坏表现: 用户打开或播放过的表达提示没有影响回顾卡片。
- 期望表现: opened hints 作为参考信号；played suggestions 优先级更高。
- 手动测试: 打开并播放某档表达提示后生成回顾卡片。
- 相关文件: `components/chat-bubble.tsx`, `lib/session-summary.ts`, `app/api/session-summary/route.ts`
- 状态: Fixed

### REG-SUMMARY-005 - 回顾卡片不能只是空泛总结

- ID: REG-SUMMARY-005
- 类型: Prompt 质量
- 区域: 回顾卡片
- 风险: 卡片变成装饰性总结，没有学习价值。
- 坏表现: 只说“今天聊得不错”“继续加油”。
- 期望表现: 基于真实对话和 evidence signals，给出话题、可复用表达、表达升级、词语或下次话题。
- 手动测试: 用真实对话生成卡片，检查每条内容是否可复用。
- 相关文件: `app/api/session-summary/route.ts`, `docs/session-summary-spec.md`
- 状态: Watch

### REG-SUMMARY-006 - 原表达不应整句划线

- ID: REG-SUMMARY-006
- 类型: UI
- 区域: 回顾卡片详情
- 风险: 像老师批改或判错，增加压力。
- 坏表现: original text 整句 line-through 且颜色过淡。
- 期望表现: 使用“原表达 / 可以这样说 / 学习点”的清晰层级，不用惩罚式样式。
- 手动测试: 生成包含表达升级的卡片，检查原表达是否清楚可读。
- 相关文件: `app/chat/[npcId]/page.tsx`
- 状态: Fixed

### REG-SUMMARY-007 - 重要状态提示应使用显眼 toast

- ID: REG-SUMMARY-007
- 类型: UI feedback
- 区域: 回顾卡片
- 风险: 用户看不到重复生成、太短、失败、删除等状态。
- 坏表现: 重要状态只在按钮下方显示一行很弱的小字。
- 期望表现: 使用轻量 toast / banner，显眼但不打断。
- 手动测试: 分别触发重复生成、对话太短、生成失败、删除成功。
- 相关文件: `app/chat/[npcId]/page.tsx`
- 状态: Fixed

### REG-SUMMARY-008 - 回顾卡片内容字号不能过小

- ID: REG-SUMMARY-008
- 类型: UI 可读性
- 区域: 回顾卡片详情
- 风险: 学习内容像脚注，降低复习价值。
- 坏表现: 推荐日语表达和学习点字号太小、行距太挤。
- 期望表现: 主要学习内容字号、间距和字体栈稳定可读。
- 手动测试: 在桌面端和手机端打开回顾卡片，检查日语推荐表达可读性。
- 相关文件: `app/chat/[npcId]/page.tsx`, `app/globals.css`
- 状态: Fixed

### REG-SUMMARY-009 - 回顾卡片生成失败应有可恢复路径

- ID: REG-SUMMARY-009
- 类型: 稳定性 / API fallback
- 区域: 回顾卡片生成
- 风险: LLM JSON 输出波动、evidence 为空或 payload 小异常会导致整张卡片生成失败。
- 坏表现: 点击生成后只出现“回顾卡片生成失败，请稍后再试。”
- 期望表现: 能区分对话太短、重复生成、服务失败等状态；模型输出波动时优先使用结构兼容 fallback，而不是直接整卡失败。
- 手动测试: 用真实短对话和混合语言对话分别生成回顾卡片；模拟 API JSON 解析失败时确认 UI 有可恢复路径。
- 相关文件: `app/chat/[npcId]/page.tsx`, `app/api/session-summary/route.ts`, `lib/session-summary.ts`
- 状态: Fixed

### REG-SUMMARY-010 - 回顾卡片标题、词语、下次话题结构不能异常

- ID: REG-SUMMARY-010
- 类型: 内容结构 / UI
- 区域: 回顾卡片详情
- 风险: 卡片虽然生成成功，但标题、词语和下次话题没有复习价值。
- 坏表现: 标题直接截取英文残句；“今日词语”放整句；“下次可以聊”泛泛写继续练习。
- 期望表现: 标题总结话题；词语区只放词或短语；下次话题具体、可继续聊。
- 手动测试: 输入包含英文残句和问词义的对话，生成回顾卡片，检查标题、今日词语、下次话题三处。
- 相关文件: `app/api/session-summary/route.ts`, `lib/session-summary.ts`, `app/chat/[npcId]/page.tsx`
- 状态: Fixed

### REG-SUMMARY-011 - 回顾卡片应优先使用真实学习信号

- ID: REG-SUMMARY-011
- 类型: 内容质量 / evidence
- 区域: 回顾卡片
- 风险: 模型自由总结时可能忽略用户查过的词、打开过的表达提示或非日语表达缺口，导致卡片看起来像泛泛总结。
- 坏表现: 有 recentLookups 却不进入“今日词语”；有英文残句却没有进入“下次可以这样说”；下次话题只写“继续聊这个话题”。
- 期望表现: recentLookups 优先进入“今日词语”；nonJapaneseSpans 和 expression hints 优先进入表达升级；下次话题具体可接话。
- 手动测试: 带 `夜勤`、`誘惑` 查词记录生成卡片；再用英文残句输入生成卡片，检查 evidence 是否被使用。
- 相关文件: `app/api/session-summary/route.ts`, `lib/session-summary.ts`
- 状态: Fixed

## 语音 / TTS / STT

### REG-VOICE-001 - 无语音输入不应显示吓人的红色错误

- ID: REG-VOICE-001
- 类型: UX
- 区域: STT
- 风险: 正常空输入被误表现为系统错误。
- 坏表现: 用户没说话时出现红色技术错误，包含 ja/en/zh 尝试细节。
- 期望表现: 显示温和轻提示，不发送空消息，不触发 NPC 回复。
- 手动测试: 开始语音输入但不说话，确认没有用户消息和 NPC 回复。
- 相关文件: `app/chat/[npcId]/page.tsx`, `app/api/stt/route.ts`
- 状态: Fixed

### REG-VOICE-002 - TTS 不应读出（笑）等符号

- ID: REG-VOICE-002
- 类型: 音频
- 区域: TTS 文本清洗
- 风险: 语音读出“括弧笑”、`www` 或 emoji，破坏沉浸感。
- 坏表现: display text 原样送入 TTS。
- 期望表现: UI 显示原文，但送 TTS 前清洗不适合朗读的符号，并保留自然停顿。
- 手动测试: 播放包含 `（笑）`、`www`、emoji 的 NPC 消息。
- 相关文件: `lib/tts-text.ts`, `app/api/tts/route.ts`
- 状态: Fixed

### REG-VOICE-003 - 用户录音回放不能丢失

- ID: REG-VOICE-003
- 类型: 音频 / 状态
- 区域: 用户语音输入
- 风险: 用户无法回听自己的原始录音。
- 坏表现: 语音发送成功后，用户消息没有回放入口。
- 期望表现: 语音消息显示本地录音回放；文字消息不显示。
- 手动测试: 发送一条语音消息，确认可以播放自己的原始录音。
- 相关文件: `app/chat/[npcId]/page.tsx`, `components/chat-bubble.tsx`
- 状态: Fixed

### REG-VOICE-004 - 外部 TTS/STT 超时不能卡死页面

- ID: REG-VOICE-004
- 类型: 稳定性
- 区域: 外部服务
- 风险: provider 卡住会拖垮 serverless 或 UI 状态。
- 坏表现: TTS/STT 没有 timeout，用户一直等待。
- 期望表现: 请求超时后走温和失败路径，主聊天仍可继续。
- 手动测试: 模拟 provider 失败或超时，确认 UI 能恢复。
- 相关文件: `lib/volcengine.ts`, `lib/llm.ts`, `app/api/tts/route.ts`, `app/api/stt/route.ts`
- 状态: Fixed

### REG-VOICE-005 - STT 上传过大应温和拒绝

- ID: REG-VOICE-005
- 类型: API safety
- 区域: STT 上传
- 风险: 大音频浪费 serverless 资源。
- 坏表现: 超大音频仍继续调用 STT provider。
- 期望表现: API 返回 `413` 和 `AUDIO_TOO_LARGE`，前端显示产品化提示。
- 手动测试: 上传超过限制的音频，确认不会继续调用 provider。
- 相关文件: `app/api/stt/route.ts`
- 状态: Fixed

## UI / 字体 / 响应式布局

### REG-UI-001 - 中日英混排不能一句话内字体跳变

- ID: REG-UI-001
- 类型: 字体系统
- 区域: 全局 UI / 回顾卡片
- 风险: 混排 UI 显得不专业。
- 坏表现: 一句中文 UI 中多个字形明显来自不同 fallback 字体。
- 期望表现: 中文/英文操作 UI 使用稳定 UI 字体栈；日语学习内容使用日语内容字体栈。
- 手动测试: 检查 sidebar、回顾卡片、混合语言气泡。
- 相关文件: `app/globals.css`, `tailwind.config.ts`, `app/chat/[npcId]/page.tsx`, `components/chat-bubble.tsx`
- 状态: Fixed

### REG-UI-002 - 推荐日语表达不能因为粗体过重而发糊

- ID: REG-UI-002
- 类型: 字体系统
- 区域: 回顾卡片 / 表达提示
- 风险: 主要学习内容反而难读。
- 坏表现: 推荐日语表达使用过重 bold，字形发糊、行距拥挤。
- 期望表现: 使用日语内容字体，font-medium 或 font-semibold，并提高 line-height。
- 手动测试: 打开表达提示和回顾卡片，检查推荐日语句子可读性。
- 相关文件: `app/chat/[npcId]/page.tsx`, `components/chat-bubble.tsx`, `app/globals.css`
- 状态: Fixed

### REG-UI-003 - 移动端 sidebar 默认收起，并可关闭

- ID: REG-UI-003
- 类型: 响应式 UI
- 区域: 聊天页 sidebar
- 风险: 手机端 sidebar 挤占聊天区域。
- 坏表现: 窄屏下左侧栏仍常驻显示。
- 期望表现: 手机端使用 drawer；点击遮罩或选择 NPC 后关闭。
- 手动测试: 手机宽度打开聊天页，打开 drawer、点击 NPC、点击遮罩。
- 相关文件: `app/chat/[npcId]/page.tsx`
- 状态: Fixed

### REG-UI-004 - 回顾卡片 panel 手机端可滚动

- ID: REG-UI-004
- 类型: 响应式 UI
- 区域: 回顾卡片详情
- 风险: 内容或关闭/删除按钮不可达。
- 坏表现: panel 超出 viewport 且不能内部滚动。
- 期望表现: panel 限制高度，内容内部滚动。
- 手动测试: 手机宽度打开较长回顾卡片。
- 相关文件: `app/chat/[npcId]/page.tsx`
- 状态: Fixed

### REG-UI-005 - 操作 UI 应中文为主

- ID: REG-UI-005
- 类型: 文案 / localization
- 区域: 聊天 UI
- 风险: 中文用户需要额外反应操作含义。
- 坏表现: 主操作按钮只有 `聞く`、`詳しく`、`ふりかえり` 等日语。
- 期望表现: 操作标签中文为主，日语保留为氛围词或学习内容。
- 手动测试: 扫描 sidebar、输入栏、表达提示、查词浮窗、回顾卡片。
- 相关文件: `app/chat/[npcId]/page.tsx`, `components/chat-bubble.tsx`
- 状态: Fixed

### REG-UI-006 - 聊天消息时间应使用稀疏时间分隔条

- ID: REG-UI-006
- 类型: UI
- 区域: 聊天消息列表
- 风险: 每条消息都显示时间会让界面变吵。
- 坏表现: 每条气泡旁边都出现时间。
- 期望表现: 只在有意义的间隔处显示稀疏时间分隔条。
- 手动测试: 查看一段长聊天记录，确认时间信息不干扰阅读。
- 相关文件: `app/chat/[npcId]/page.tsx`, `components/chat-bubble.tsx`
- 状态: Fixed

### REG-UI-007 - UI language toggle 只切换产品操作文案

- ID: REG-UI-007
- 类型: UI copy / localization
- 区域: 首页、聊天页、表达提示、查词浮窗、回顾卡片
- 风险: 语言切换如果误翻译 NPC 回复、用户输入或 AI 生成学习内容，会破坏日语练习语境。
- 坏表现: 切到英文 UI 后，NPC 日语回复、用户原句、summary 中的日语推荐表达或查词解释正文被翻译。
- 期望表现: zh / en 只影响固定产品 UI、按钮、toast、empty state、aria-label；不翻译 NPC/user/AI-generated learning content。
- 手动测试: 切换中文和 EN，检查首页 CTA、sidebar、输入栏、表达提示、查词浮窗、回顾卡片标签会切换；NPC 回复和用户输入保持原样。
- 相关文件: `lib/ui-copy.ts`, `lib/ui-language.ts`, `components/language-toggle.tsx`, `app/page.tsx`, `app/chat/[npcId]/page.tsx`, `components/chat-bubble.tsx`
- 状态: Fixed
