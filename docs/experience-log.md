# Experience Log / 体验日志

## 用途

这份文档用于记录使用 Kotomachi / 言街 时观察到的真实或演练问题。
它的作用不是写流水账，而是把模糊的体验感受转成可执行的迭代任务、prompt eval case 和公开项目复盘材料。

在作品集阶段，这份日志也服务于 README 和公开项目说明：它为“如何发现问题、判断优先级、做产品取舍并验证修复”提供可追溯证据。

不要记录真实用户隐私。如果某条记录来自测试场景，请明确标注为“示例”或“演练”。

## 日志模板

```md
## YYYY-MM-DD - 简短标题

- 来源：真实使用 / 演练 / Demo review
- NPC：
- 输入方式：文字 / 语音
- 用户输入：
- NPC 回复：
- 功能区域：Chat / Feedback / Explain / TTS / STT / Memory / Homepage / Mobile
- 问题类型：
- Observation / 观察：
- Diagnosis / 诊断：
- Fix / 修复：
- Eval Case / 评估用例：
- Public Note / 公开复盘：
- 严重程度：Low / Medium / High
- 状态：Open / Fixed / Needs eval / Won't fix
```

## 问题类型分类

- NPC 在主聊天中变得像老师，主动纠错或讲解语言点。
- NPC 回复中混入了非日语内容。
- 回复过长、过正式，或者不像 LINE 日常聊天。
- 中英日混合输入处理得不自然。
- `💡 提案` 过密、过像批改，或者三档建议不清楚。
- 划词解释不清楚、太技术化，或信息层级不明确。
- TTS / STT 失败时缺少温和降级。
- LocalStorage 记忆显得错误、过旧或过强。
- 移动端 / 窄屏布局难用。
- 作品集复盘缺少可追溯的证据链。

## 工作流

```txt
Observation -> Diagnosis -> Fix -> Eval Case -> Public Note
观察 -> 诊断 -> 修复 -> 评估用例 -> 公开复盘
```

- Observation：产品中实际发生了什么。
- Diagnosis：为什么这是问题，责任属于哪一层。
- Fix：最小可验证的产品或工程改动。
- Eval Case：可复用的回归检查用例。
- Public Note：如何把这个判断沉淀成公开项目复盘材料。

## 示例条目

## 2026-05-27 - 示例：混合语言输入不应触发主聊天纠错

- 来源：演练
- NPC：美咲
- 输入方式：文字
- 用户输入：`今日は tired です`
- NPC 回复：示例中不记录具体回复。
- 功能区域：Chat
- 问题类型：NPC 在主聊天中变得像老师，主动纠错或讲解语言点。
- Observation / 观察：如果 NPC 在主聊天里解释 `tired` 是 `疲れた`，对话会开始像课堂。
- Diagnosis / 诊断：聊天层和学习反馈层发生了泄漏。
- Fix / 修复：`/api/chat` 只负责共情和接话；语言替换建议放到 `💡 提案`。
- Eval Case / 评估用例：用户混合输入时，NPC 必须用纯日语自然回应，不出现中文、英文解释或纠错。
- Public Note / 公开复盘：这个 case 说明主聊天和学习反馈需要保持边界，避免输出被纠错打断。
- 严重程度：High
- 状态：示例

## 2026-05-27 - 示例：反馈面板第一眼应该先看到推荐表达

- 来源：演练
- NPC：木村
- 输入方式：文字
- 用户输入：`Please give me a coffee`
- NPC 回复：不适用。
- 功能区域：Feedback
- 问题类型：`💡 提案` 过密、过像批改。
- Observation / 观察：如果解释文字比推荐表达更突出，用户第一眼看不到“下次我可以怎么说”。
- Diagnosis / 诊断：反馈层应该先给可直接模仿的日语表达，再补充轻量解释。
- Fix / 修复：让 `nativeSay` 成为卡片视觉重点，解释默认短一些，必要时折叠。
- Eval Case / 评估用例：打开 `💡 提案` 后，用户应先看到三档推荐表达，而不是长段分析。
- Public Note / 公开复盘：这个 case 说明反馈面板应该优先给可模仿表达，而不是制造批改感。
- 严重程度：Medium
- 状态：示例

## 2026-05-30 - NPC 指出用户重复 / 低压力违规 (Watchlist)

- 来源：真实使用
- NPC：美咲、木村、大将（待观察）
- 输入方式：文字
- 用户输入：
  - `夜に飲むなら何が落ち着きますか？`
  - `伊藤園以外なら何がおすすめですか？`
  - `店員として、自分の店で売ってるものなら何がいいですか？`
  - `もう一回、伊藤園以外でお願いします。`
- NPC 回复：
  - `あ、同じこと2回言っちゃった（笑）。眠そうだね。`
  - `あ、また同じこと言ったね（笑）。どんだけ眠いんだよ。`
- 功能区域：Chat
- 问题类型：NPC 在主聊天中变得像老师，主动纠错或点评用户状态。
- Observation / 观察：用户围绕类似话题追问时，NPC 主动指出用户重复（また同じこと言ったね / 同じこと2回言っちゃった），并评价用户状态（眠そうだね / どんだけ眠いんだよ）。
- Diagnosis / 诊断：
  - 用户重复、表达不完整是语言学习中的正常行为。
  - NPC 的吐槽会让用户感觉被评价。
  - 这和"低压力开口"的产品原则冲突。
  - 尤其未来如果加入导师、上司、同事等 NPC，类似行为可能变得更压迫。
- Fix / 修复：**暂不修复**，先记录为 watchlist bad case。
  - 期望行为：NPC 应理解用户最新意图，继续自然回答。
  - 期望表达：`じゃあ、別のおすすめだと……` / `伊藤園以外なら……` / `うちで買いやすいものなら……`
  - 避免表达：`また同じこと言ったね` / `さっきも聞いたよ` / `眠そうだね` / `どんだけ眠いんだよ`
- Eval Case / 评估用例：当用户围绕类似话题追问时，NPC 不应出现以下内容：
  - 指出用户重复的语句
  - 评价用户状态（困、累、表达混乱等）
  - 任何让用户感觉被观察、被评判的表达
- Public Note / 公开复盘：这个 case 说明主聊天层需要保持低压力边界，即使用户重复或表达不完整，NPC 也应该继续自然接话而不是做元评价。
- 严重程度：P2 / watchlist（不是功能阻塞，但影响低压力开口体验）
- 状态：Open / Watchlist
- 后续阈值：如果后续真实使用中出现 2-3 次类似问题，或在多个 NPC 上复现，再做 prompt policy fix。

## 2026-05-30 - 第一次外部测试反馈：App 模式体验正面，语音播放首次出现回声/失真

- 来源：真实使用 / 外部 beta 测试
- NPC：木村（测试中涉及）
- 输入方式：文字（测试者选择不用语音）
- 用户输入：不适用（正向反馈）
- NPC 回复：不适用
- 功能区域：Homepage / TTS / UX
- 问题类型：TTS 首次播放失真 / 回声效果；用户体验反馈

- 正向反馈：
  - PWA / app mode feels convenient（添加到主屏幕后像原生 app）
  - Typing-based use is understandable（用户因当时不方便用语音，选择打字）
  - Homepage/onboarding seems to guide users well enough to start without voice（首页引导有效，用户知道从哪里开始）

- Observation / 观察：
  - 测试者第一次使用时点了好几次播放键
  - 播放出来的是"很空灵的回声效果"（echo-like / hollow / distorted audio）
  - 开发者自己也偶尔遇到第一次语音播放像电音的问题
  - 用户可能在等待时多次点击，因为 loading / playing 状态不明显

- Diagnosis / 诊断：
  - 播放按钮缺少明确的 loading/playing 状态反馈
  - 重复点击可能创建多个重叠的音频实例导致回声
  - 首次使用时音频初始化可能有问题
  - 不阻塞文字使用，但影响首次语音体验和用户对语音功能的信任

- Fix / 修复：**记录为 P1 watch/fix candidate**
  - 期望行为：
    - Play button should show loading/playing state（按钮应显示加载中/播放中状态）
    - Repeated clicks should not create overlapping playback（重复点击不应创建重叠播放）
    - While one TTS audio is loading or playing, additional clicks should be ignored, queued, or stop/restart cleanly（当前 TTS 加载或播放时，其他点击应被忽略或干净地停止/重启）
    - No echo/electric first playback（首次播放不应有回声/电音）
  - 建议方向：
    - 前端阻止重复点击（disabled 状态或 debounce）
    - 播放前先停止已有音频实例
    - 可考虑首次播放前加短暂静音/测试音
    - 避免大规模 TTS 重写

- Eval Case / 评估用例：
  - 首次点击 NPC 消息播放按钮时，不应出现回声/电音效果
  - 快速连续点击播放按钮时，不应创建多个重叠音频
  - 播放中再次点击应正确停止或重启，不产生回声

- Public Note / 公开复盘：
  - 这个 case 说明即使语音功能是可选的，首次播放体验仍然重要
  - 外部测试者能发现"点几次才出声音 + 声音奇怪"的问题，说明这类细节会影响用户对 app 整体质量的判断
  - PWA 模式和文字优先体验得到验证，说明产品方向正确

- 严重程度：P1（不是功能阻塞，但不修复会影响首次语音体验和用户信任）
- 状态：Open / Watchlist
- 后续行动：可以做一次小的 TTS playback hardening task，不需要大规模 TTS 重写

## 2026-05-30 - 国内网络访问 Vercel beta 受限 / 部署可访问性问题

- 来源：真实使用 / 外部 beta 测试
- NPC：不适用
- 输入方式：不适用
- 用户输入：不适用
- NPC 回复：不适用
- 功能区域：Deployment / Infrastructure
- 问题类型：跨境访问限制 / 部署可访问性

- Observation / 观察：
  - 外部 beta 用户在中国大陆不开 VPN 时，页面卡在图标/启动页，无法进入首页
  - 开 VPN 后可继续测试
  - 判断为 Vercel / 跨境访问 beta limitation，而不是 app 首屏逻辑 bug

- Diagnosis / 诊断：
  - Vercel 默认部署在中国大陆访问不稳定
  - 不是代码或首屏逻辑问题
  - 是部署基础设施层面的访问限制
  - 影响国内朋友测试门槛，可能影响 PWA/app mode 初体验

- Fix / 修复：**短期不修代码，只做测试说明**
  - 当前处理：
    - 短期在测试说明中提示国内网络可能需要 VPN
    - 暂不迁移部署（维持 Vercel beta 简单部署）
  - 后续观察：
    - 如果国内测试用户增多，再评估自定义域名、国内 CDN、国内部署方案
    - 可考虑：Vercel + 自定义域名 + 国内 CDN，或迁移到国内平台

- Eval Case / 评估用例：
  - 国内用户不开 VPN 时应能访问基本功能（长期目标）
  - 当前短期：测试说明中明确提示 VPN 需求

- Public Note / 公开复盘：
  - 这个 case 说明 Vercel 部署对国内用户有访问门槛
  - 作为 beta / MVP 阶段可以接受，但如果有国内用户增长需求，需要考虑部署方案
  - 部署可访问性是产品可触达性的基础设施层问题

- 严重程度：P1 beta limitation / deployment accessibility（影响国内测试，但不是代码 bug）
- 状态：Open / Watchlist
- 后续阈值：如果国内测试用户增多或反馈频繁，考虑部署方案调整

## 2026-05-31 - PWA maskable icon 是 Android 手机端图标核心资产

- 来源：真实使用 / Android Chrome PWA 测试
- NPC：不适用
- 输入方式：不适用
- 用户输入：不适用
- NPC 回复：不适用
- 功能区域：PWA / Icon / Mobile
- 问题类型：移动端 / 窄屏布局难用（PWA 图标边框问题）

- Observation / 观察：
  - Android Chrome PWA 中，修改 `public/icons/maskable-512-v3.png` 后，同时影响了：
    1. 手机桌面 app 图标
    2. 点开 PWA 后的启动/加载页图标（splash）
  - 之前尝试把普通 icon 和 maskable icon 拆成两套（splash 用透明底，launcher 用深绿满底），但发现 Android 实际主要使用 maskable icon
  - 普通图标（icon-192/icon-512）在 Android 手机端影响较小，主要用于 manifest fallback、浏览器标签、桌面端等

- Diagnosis / 诊断：
  - Android Chrome PWA 对 maskable icon 的处理：同时用于桌面图标和启动页
  - 无法为 splash 和 launcher 强行拆两套完全独立的图标
  - 如果 maskable 有深绿满底，启动页也会显示深绿方框
  - 如果 maskable 用透明底，桌面图标可能显示不完整

- Fix / 修复：**当前策略收束**
  - 把 `maskable-512-v3.png` 当作核心图标资产来处理
  - 保证 maskable 图标设计能同时适应桌面图标和启动页
  - 普通图标（icon-192-v3/icon-512-v3）保留用于 fallback 和非 Android 场景
  - 不继续为 splash 和 launcher 强行拆两套
  - 未来如果要正式 App 化，再重新做完整 icon asset system

- Eval Case / 评估用例：
  - Android Chrome 添加到主屏幕后，桌面图标应无突兀边框
  - 点开 PWA 后启动页图标应与桌面图标一致
  - iOS Safari 添加到主屏幕图标应正常（使用 apple-touch-icon）

- Public Note / 公开复盘：
  - 这个 case 说明 PWA 图标系统在不同平台表现不一致
  - Android 主要依赖 maskable icon，iOS 使用 apple-touch-icon
  - 设计图标时需要考虑多平台适配，但优先保证主要目标平台（当前为 Android）

- 严重程度：P2 / 已收束（图标问题已处理，策略已确定）
- 状态：Fixed / Strategy settled
- 后续行动：未来正式 App 化时，重新设计完整 icon asset system
