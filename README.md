# 言街 (Kotomachi)

低压力、日常日语会话练习空间 — 在安静的街角，和邻居们慢慢说日语。

Kotomachi / 言街 是一个 AI-native 日语口语练习产品。它把温和的 NPC 日常聊天和可选的学习反馈分成两个层，让用户可以先安心开口，而不是一说错就被主聊天流打断纠正。

## 在线 Demo

- Live Demo：`<Vercel URL>`

## 作品集概览

### 核心功能

- 街角地图首页，包含咖啡馆、便利店、居酒屋三个可点击 NPC 入口。
- 三位 NPC 的 LINE 风格聊天：美咲、木村、大将。
- 支持用户使用中文、英文、日语或混合语言输入。
- 主聊天中 NPC 始终用自然日语回应。
- NPC 回复和提案例句支持 TTS 播放。
- 支持 STT 语音输入，并对未识别到语音的情况做温和降级。
- `💡 提案` 面板提供カジュアル / ふつう / フォーマル三档表达建议。
- 支持划词查词浮窗。
- 基于 LocalStorage 的轻量记忆、熟悉度和聊天记录。
- 根据历史对话生成冷启动欢迎语。
- DeepSeek / 火山方舟 LLM fallback，以及火山 TTS / Edge-TTS 语音 fallback。

### 产品设计原则

- 低压力口语输出优先。
- NPC 聊天层和学习反馈层分离。
- NPC 负责接话和延续对话，不在主聊天中主动纠错。
- 用户可以输入中文、英文、日语或混合语言。
- 主聊天中的 NPC 回复保持自然日语。
- 学习建议只出现在可选辅助层，例如 `💡 提案`、划词查词和未来的总结卡。

### 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- LocalStorage 轻量记忆与状态
- Vercel 部署

### AI 架构

- LLM：DeepSeek 作为主对话模型，火山方舟作为 fallback。
- TTS：火山 TTS 作为主语音服务，Edge-TTS 作为 fallback。
- STT：火山 ASR 用于语音输入。
- Feedback：生成カジュアル / ふつう / フォーマル三档结构化表达建议。
- Explain：为划词内容提供读音、释义、整句含义和语感解释。
- Memory：轻量事实提取 + 按 NPC 区分的 LocalStorage 记忆。
- Welcome：用户隔一段时间回来时，根据历史对话生成冷启动欢迎语。

### 截图

- Homepage：TODO
- Chat：TODO
- Feedback suggestions：TODO
- Word explanation：TODO

### 本地运行

```powershell
npm install
copy .env.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

不要提交 `.env.local`。本地 secrets 放在 `.env.local`，线上 secrets 配在 Vercel Environment Variables。

### 当前限制

- 暂不引入数据库或 Auth，当前状态有意保持轻量和本地化。
- 暂不支持 WebRTC 实时语音通话。
- 暂不引入 Live2D / 虚拟人层。
- 暂不做发音打分。
- 暂不引入复杂 RAG 或向量数据库。
- 移动端适配仍在逐步完善。
- Prompt 行为目前主要通过手动 case 和 experience log 评估，还不是完整自动化 eval suite。

### Roadmap

- 完善移动端和窄屏适配。
- 增加轻量练习总结卡。
- 扩充 prompt eval cases。
- 继续降低 `💡 提案` 面板的信息密度。
- 将较大的聊天页和气泡组件逐步拆成更小的组件 / hooks。
- 基于 experience log 整理更清楚的作品集和面试叙事。

## 核心产品决策

### 多语言输入
- 用户可以用日语、英语、中文（或混合）与 NPC 对话，无需只说日语
- 语音识别支持 ja/en/zh 多语种优先级识别
- NPC 回复始终为纯日语，不会因为用户说了英语/中文就切换语言
- 口语建议（💡 提案）中，混合语言的词汇会被重点教学：不是简单说"不要用英语"，而是告诉用户这个词在日语里怎么说、怎么用
  - 例：用户说「今日は tired」→ 建议中会写「tired 在日语里说 疲れた（つかれた），跟朋友可以说 今日疲れちゃった」

### NPC 绝不纠错
- 核心社交约束：NPC 严禁充当「日语老师」，即使对方语法有严重破绽也绝对不在聊天中主动纠正
- NPC 会顺着话题继续聊，保持各自的人设态度（美咲温柔、木村随和吐槽、大将豪爽）
- 学习引导通过独立的「💡 提案」和「划词查词」功能实现，不干扰对话体验

### 反客服化对话
- NPC 不会像客服一样每句话结尾都用问题逼用户回答
- 先对用户上一句做情绪共鸣，谈谈自己的感受，再自然引申
- 对话节奏像真实的日本 LINE 好友，不是教科书式问答

### 回复约束
- NPC 每次回复严格 2-3 句以内，保持简短自然
- 只返回纯日文，不混入中文或英语
- Emoji 克制使用：美咲/木村约 30% 回复偶尔用一个，大将不用
- NPC 说话风格各异：美咲用丁寧語、木村用年轻人タメ口、大将用粗犷温暖タメ口

### 渐进式熟悉度
- ≤5 次对话：保持礼貌距离，像初次见面
- ≤15 次对话：语气自然一些，像开始熟悉的朋友
- 15+ 次对话：像老朋友一样随意，自然接续之前的话题
- 初次见面使用「初めまして」，后续根据熟悉度自然过渡

### 对话上下文窗口
- 每次请求只发送最近 10 条消息给 LLM，控制 token 消耗
- 记忆系统（事实提取）补充长程上下文，弥补窗口截断

---

## 功能详览

### 街角地图首页
- SVG 内嵌建筑 PNG：三栋建筑（咖啡厅、便利店、居酒屋）无缝拼接，等比缩放永不错位
- Hover 沿轮廓发光：`drop-shadow` 自动贴合建筑透明区域，非方形遮罩
- NPC 信息卡：hover 建筑时浮现邻居头像、姓名、心里话
- 时段感知背景：朝（暖橘晨光）/ 昼（明亮米白）/ 夕（琥珀暖色）/ 夜（沉暖暗色），在米白色系内微调
- 环境旁白：底部极淡氛围短文（如「小雨の夜。」「遠くで電車の音がする。」），同一天固定显示

### NPC 生活弧线系统
- 每位 NPC 有 3 条生活弧线（如木村的「连续夜勤周」「考试周」「轻松周」）
- 每条弧线包含 5 个渐进状态，每天推进一个，弧线走完自动切换下一条
- 完整周期：3 弧线 × 5 状态 = 15 天一轮
- 状态完全基于日期计算（epoch 取模），SSR 和客户端一致，无 hydration 冲突
- 心里话从当前状态中按日期种子选取，同一天保持一致

### NPC 记忆系统
- LocalStorage 轻量记忆：对话计数 + 事实提取，每个 NPC 独立存储
- 事实数组上限 10 条：新事实与旧事实冲突时用新覆盖旧；满 10 条时剔除最不重要的旧事实
- 冷启动记忆唤醒：隔一段时间回来，NPC 会自然提起上次聊过的事
- 初次见面问候：首次对话使用「初めまして」，后续根据熟悉度自然过渡

### 共享世界状态
- 6 种天气/氛围：雨天、闷热、平静工作日、周末夜、微凉秋日、梅雨天
- 同一天三个 NPC 经历相同天气，但反应各不相同（如雨天：美咲享受安静、木村抱怨通勤、大将说客人少）
- 用日期做种子，保证同一天结果一致

### 邻里连续性
- 每条生活弧线附带 `crossMentions`：NPC 偶尔不经意提到其他邻居
- 如木村说「美咲さんのカフェ、夜もやってる時あるんだよな」
- 提及频率低、语气日常，让街区感觉是真实相连的邻里

### 时段感知对话
- NPC 开场白和日常对话自然体现时段感（朝：おはよう / 昼：こんにちは / 夕・夜：こんばんは）
- 时段信息注入 system prompt，不生硬点明时间
- 首页背景也随时段微调

### LINE 风格聊天
- 文字 / 长按语音输入切换
- NPC 语音自动播放：每条 NPC 消息都带语音，点击「▶ 再生」可重播
- 每位 NPC 独立声线：美咲（年轻女性）、木村（年轻男性）、大将（成熟男性）
- 交互阶段：消息数 <5 文字模式 → 5-12 语音返信 → 12+ 语音会话

### 划词查词
- 双击或选中 NPC / 用户消息中的日语词汇，弹出精致悬浮卡片
- 显示：读音假名 + 简短释义 + 整句翻译 + 🔊 发音播放
- 「詳しく ▼」点击后平滑展开详细语感解释，不用文法术语，像跟朋友聊天一样解释微妙情绪

### 💡 口语改进建议
- 鼠标悬停用户消息时淡入「💡 提案」按钮，主动点击才显示（不干扰对话）
- 三档场合对比：カジュアル（親しい友人）/ ふつう（一般的な場面）/ フォーマル（丁寧な場面）
- 混合语言智能教学：用英语或中文替代的词汇，重点教学对应日语表达而非简单纠错
  - 不说"不要用英语"，而是告诉用户这个英语/中文词在日语里怎么说、怎么用
  - nativeSay 中把所有英语/中文替换为地道日语表达
- 每档可 🔊 听示范发音，也可回听自己的录音
- 分析用中国大白话写，包含【场合】和【原句】双层分析，语气温和不说教

### 语音识别后处理
- 自动添加标点（火山引擎 `enable_punc`）
- 英语单词统一小写，句首保留大写

## NPC 一览

| NPC | 年龄 | 场所 | 性格 | 声线 |
|-----|------|------|------|------|
| 美咲 (みさき) | 24 | 雨宿りカフェ | 温柔、安静、爱看电影 | 年轻女性 |
| 木村 (きむら) | 22 | LAWSONG 便利店 | 疲惫、随和、轻微吐槽系 | 年轻男性 |
| 大将 (たいしょう) | 52 | 居酒屋 | 豪爽、健谈、温暖 | 成熟男性 |

## 技术架构

- **DeepSeek + 火山方舟 Fallback**：主模型失败时自动降级到豆包大模型
- **火山 TTS + Edge-TTS 回退**：优先豆包语音合成，失败时免费 Edge 兜底
- **火山极速 ASR**：长按语音转文字，支持 ja/en/zh 多语种优先级识别
- **LocalStorage 轻量存储**：对话计数 + 事实记忆 + 弧线状态，按 NPC 独立存储
- **Next.js App Router**：React Server Components + Client Components
- **Tailwind CSS**：自定义 Design Tokens

## 快速开始

### 1. 安装 Node.js

从 [https://nodejs.org/](https://nodejs.org/) 安装 LTS 版本（建议 18+），安装后重启终端。

### 2. 安装依赖

```bash
cd kotomachi
npm install
```

### 3. 配置 API Key

```bash
copy .env.example .env.local
```

编辑 `.env.local`（详见 `.env.example` 注释）：

| 变量 | 用途 | 是否必需 |
|------|------|----------|
| `DEEPSEEK_API_KEY` | 主对话 | 推荐 |
| `VOLCENGINE_ARK_API_KEY` + `VOLCENGINE_ARK_ENDPOINT_ID` | 对话 Fallback | 推荐 |
| `VOLCENGINE_SPEECH_APP_ID` + `VOLCENGINE_SPEECH_ACCESS_TOKEN` | TTS + 语音转文字 | 语音功能需要 |
| `VOLCENGINE_TTS_VOICE_MISAKI` | 美咲声线 | 可选 |
| `VOLCENGINE_TTS_VOICE_KIMURA` | 木村声线 | 可选 |
| `VOLCENGINE_TTS_VOICE_TAISHO` | 大将声线 | 可选 |

**Advanced optional variables**

以下变量通常不需要新用户配置，仅在切换模型、网关或语音识别策略时使用：

| 变量 | 用途 |
|------|------|
| `DEEPSEEK_MODEL` | 覆盖默认 DeepSeek 模型 |
| `VOLCENGINE_ARK_BASE_URL` | 覆盖火山方舟 OpenAI 兼容接口地址 |
| `VOLCENGINE_ARK_MODEL` | 未使用 Endpoint ID 时的备用模型字段 |
| `VOLCENGINE_SPEECH_API_KEY` | 火山语音 API Key 兼容配置 |
| `VOLCENGINE_SPEECH_CLUSTER` | 覆盖火山语音集群 |
| `VOLCENGINE_STT_LANGUAGES` | 语音识别语言优先级，如 `ja,en,zh` |
| `TTS_PROVIDER` | 控制 TTS 策略，详见下方说明 |

**控制台入口：**

- DeepSeek：https://platform.deepseek.com/
- 火山方舟（豆包 LLM）：https://console.volcengine.com/ark → 创建推理接入点 → 复制 Endpoint ID
- 豆包语音：https://console.volcengine.com/speech → 获取 AppID / Access Token，开通 TTS 与「录音文件极速识别」

### 4. 启动

```bash
npm run dev
```

浏览器打开 [http://localhost:3000](http://localhost:3000)

## TTS 策略说明

`TTS_PROVIDER` 环境变量：

- `auto`（默认）：已配置火山语音时优先火山，失败自动回退 Edge-TTS
- `volcano`：仅火山（失败则报错）
- `edge`：仅 Edge-TTS（免费，无需火山语音账号）

火山 TTS 优势：可在控制台挑选/购买更自然的日语音色；Edge 优势：零成本、开箱即用。

## Design Tokens

| Token | 值 | 用途 |
|-------|-----|------|
| background | `#F3EDE0` | 页面底色（米白） |
| foreground | `#28231A` | 主文字（深棕黑） |
| card | `#FAF6EE` | 卡片底色（暖白） |
| primary | `#2D4A1F` | 主色（深绿） |
| accent | `#C9A84C` | 琥珀强调 |
| secondary | `#E8E0CE` | 暖灰 |
| muted-fg | `#7A7060` | 弱化文字 |
| input-bg | `#EDE7D8` | 输入框底色 |
| sidebar | `#1E2A16` | 侧边栏底色 |
| sidebar-fg | `#D4C8A8` | 侧边栏文字 |
| sidebar-accent | `#253318` | 侧边栏选中 |

字体：Noto Serif JP 300（标题）、Noto Sans JP 300/400/500（正文）

## 项目结构

```
kotomachi/
├── app/
│   ├── api/
│   │   ├── chat/        # DeepSeek → 火山方舟
│   │   ├── tts/         # 火山 TTS → Edge 回退
│   │   ├── stt/         # 火山极速 ASR
│   │   ├── feedback/    # 💡 口语改进建议
│   │   ├── explain/     # 划词查词
│   │   ├── memory/      # 事实记忆提取
│   │   └── welcome/     # 冷启动记忆唤醒
│   ├── chat/[npcId]/    # 聊天页面
│   └── page.tsx         # 街角地图首页
├── components/
│   └── chat-bubble.tsx  # 气泡 + 划词查词 + 建议抽屉
├── lib/
│   ├── llm.ts           # 双轨对话
│   ├── volcengine.ts    # 火山语音（TTS + ASR）
│   ├── edge-tts.ts      # Edge 兜底
│   ├── npc.ts           # NPC 配置 + 生活弧线 + 世界状态
│   ├── memory.ts        # LocalStorage 记忆
│   └── feedback-types.ts # 建议类型定义
└── public/
    ├── avatars/         # NPC 头像
    └── buildings/       # 建筑 PNG
```

## 部署（Vercel）

在 Environment Variables 中配置与 `.env.local` 相同的变量（勿提交 `.env.local` 到 Git）。
