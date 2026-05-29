# Kotomachi / 言街 后续开发计划文档

> 建议文件位置：`docs/development-plan.md`  
> 文档用途：作为后续开发、Codex 协作、Vercel 上线、UI/UX 优化、产品迭代和公开项目复盘的统一参考。

---

## 0. 当前阶段判断

Kotomachi / 言街 已从早期 AI 日语聊天 demo 进入阶段性 MVP。项目已经完成从 chat prototype 到 learning-assets MVP 的阶段推进。

**2026-05-28 MVP 里程碑更新：** 项目已完成核心学习资产闭环，当前状态为 MVP / prototype ready for small user testing。

已完成的里程碑：

- NPC chat with life arc, shared world state, memory, and time-aware greetings
- Expression hints quality pass（三档表达建议 + 收藏 + 缓存 + 重新生成）
- Word explanation quality pass（划词查词 + 收藏）
- Review card quality pass（回顾卡片生成 + 详情 + 历史列表）
- Saved Items MVP（localStorage helper + 收藏词语 + 收藏表达 + 收藏面板 + 去重 + 容量限制）
- Review Cards panel（回顾卡片面板 + 历史列表）
- Saved Items panel（按类型筛选 + 查看详情 + 删除）
- Learning accumulation signals（学习入口显示收藏/回顾卡数量，轻量积累感；无 streak/等级机制）
- Input action menu for review card creation（输入区 "+" 菜单）
- Sidebar learning asset navigation（住人 / 学习 / 底部导航统一）
- UI language toggle（中文 / English）
- Responsive sidebar / mobile drawer
- Expression hint cache with versioning and regenerate
- STT post-processing（标点 + 大小写）
- Chat prompt format unification + Kimura persona correction

当前已实现的核心产品层：

- 街角地图首页（SVG 建筑 + hover + 时段背景 + 环境旁白）
- 3 个 NPC 入口（美咲 / 木村 / 大将）
- LINE 风格聊天界面
- 多语言输入，NPC 纯日语回复
- NPC 生活弧线与共享世界状态
- LocalStorage 轻量记忆 + 冷启动记忆唤醒
- TTS / STT 语音交互
- 划词查词 + 收藏词语
- 表达提示 + 收藏表达
- 回顾卡片 + 面板 + 历史列表
- 收藏面板（筛选 / 详情 / 删除）
- DeepSeek / 火山方舟 / 火山语音 / Edge-TTS 等 AI 能力集成

当前主要问题不是"功能不够"，而是：

1. 代码拆分和 hook 抽象还未完成；
2. 移动端体验仍在持续优化；
3. Prompt eval 目前基于手动 cases，还不是自动化 suite；
4. 学习内容解释语言尚未跟随 UI language（Pack N1）；
5. 首次用户缺少轻量引导（Pack O）。

本阶段目标：

> 稳定可部署、体验清楚、可长期迭代、可公开展示，并能讲清楚产品与工程逻辑的状态。

---

## 1. 项目核心原则

后续所有修改都应遵守以下原则。

### 1.1 低压力优先

Kotomachi 的核心不是“高强度语言训练”，而是降低日语口语输出的心理门槛。因此应避免：

- 发音百分比打分；
- 排名、等级压迫；
- 每句话自动纠错；
- 让聊天流变成教师训导流；
- 过强的任务感、课程感、考试感。

### 1.2 聊天层和教学层分离

这是项目最重要的产品分层。

- NPC 聊天层：负责接话、共情、陪伴、生活感、关系感。
- `💡 提案` 层：负责表达优化、场合对比、混合语言替换。
- 划词查词层：负责即时理解和词义解释。
- 总结卡层：负责练习后的轻量复盘。

严禁让 NPC 在正常聊天中主动纠错。即使用户日语不自然，NPC 也应顺着语义继续聊。

### 1.3 渐进式输出

产品路径应保持：

1. 先通过文字聊天建立安全感；
2. 再让用户听 NPC 语音；
3. 再鼓励用户用语音输入；
4. 最终形成低压力口语练习闭环。

不要为了“高级”而过早引入实时语音、WebRTC、Live2D 或复杂虚拟人系统。

### 1.4 Solo developer 可维护

当前阶段优先保持项目轻量、可部署、可维护：

- 不引入数据库 / Auth，除非后续确有必要；
- 不引入复杂 RAG 或向量数据库；
- 不引入 WebRTC / LiveKit；
- 不为了展示技术复杂度而破坏当前产品边界；
- 每次只做小范围、可验证、可回滚的改动。

---

## 2. 开发优先级总览

### P0：立刻处理，关系到部署和基础可用性

#### 工程侧

- 初始化 Git 仓库并建立干净提交历史；
- 清理临时文件，如 `build.log`、诊断日志等；
- 统一 `.env.example`、README、代码中的环境变量命名；
- 检查并修复 API key 暴露风险；
- 为关键 fetch 添加 timeout；
- 为 chat / tts / stt / feedback / explain / memory / welcome 添加错误处理和前端降级；
- 准备 Vercel Preview Deployment。

#### UI / UX 侧

- 增强首页入口感和建筑可点击感；
- 优化用户气泡长文本、中英日混合文本的换行和可读性；
- 降低 `💡 提案` 面板的信息密度；
- 强化底部“点击建筑进入”的提示；
- 强化聊天页侧边栏当前 NPC 选中态。

---

### P1：把 demo 推进成成熟展示项目

#### 产品侧

- 增加练习总结卡片；
- 增加轻量 onboarding；
- 增强 NPC 切换入口的联系人列表感；
- 优化 `💡 提案` 面板，从居中 Modal 逐步改为右侧 Drawer；
- 优化聊天输入栏视觉和交互反馈。

#### 工程侧

- 拆分 `app/chat/[npcId]/page.tsx`；
- 拆分 `components/chat-bubble.tsx`；
- 抽象 `useChatSession`、`useTTS`、`useSTT`、`useNpcMemory` 等 hooks；
- 统一日志等级；
- 修复值得处理的 build warnings。

---

### P2：中期体验迭代

- 增加学习偏好设置：安静模式 / 引导模式；
- 增强熟悉度可感知性；
- 轻量增强记忆系统；
- 优化划词解释卡片；
- 增加 prompt eval cases；
- 增加最小单元测试；
- 做移动端 / 平板响应式适配。

---

### P3：暂缓，不要现在做

- 后端数据库；
- Auth 登录系统；
- 实时语音通话；
- WebRTC / LiveKit；
- Live2D / 虚拟人；
- 发音百分比打分；
- 复杂 RAG / 向量数据库；
- 重型 gamification。

---

## 3. 分类修改建议

---

# A. 工程质量与代码稳定性

## A1. 初始化 Git 仓库与提交规范

### 问题

当前项目如果还不是 Git 仓库，会影响：

- 代码回滚；
- Codex 协作；
- Vercel 部署；
- 公开项目可信度；
- 后续产品复盘。

### 修改建议

1. 初始化 Git：
   - `git init`
2. 添加或检查 `.gitignore`，确保忽略：
   - `.next/`
   - `node_modules/`
   - `.env.local`
   - `build.log`
   - 临时诊断日志
3. 删除不属于产品代码的临时文件。
4. 做第一次 clean commit：
   - `chore: initialize repository and clean project`

### 后续提交规范

建议使用轻量 conventional commits：

- `feat: add session summary card`
- `fix: add timeout for api requests`
- `refactor: split chat page components`
- `style: improve homepage interaction affordance`
- `docs: add development plan`
- `chore: update env example`

### 验收标准

- 项目有 Git 历史；
- `.env.local` 没有进入 Git；
- 临时日志不进入 Git；
- 每一类改动可以独立回滚。

---

## A2. 统一环境变量命名

### 问题

当前需要避免 `.env.example` 和源码读取变量命名不一致。大将声线应统一使用 `VOLCENGINE_TTS_VOICE_TAISHO`。

这会导致部署时配置错误，尤其在 Vercel 环境变量配置中很容易漏填。

### 修改建议

统一采用 NPC 真实 ID 命名：

```env
VOLCENGINE_TTS_VOICE_MISAKI=
VOLCENGINE_TTS_VOICE_KIMURA=
VOLCENGINE_TTS_VOICE_TAISHO=
```

同步更新：

- `.env.example`
- README
- `lib/volcengine.ts`
- `/api/tts` 相关逻辑
- Vercel Environment Variables

### 验收标准

- `.env.example` 和源码读取完全一致；
- 缺少可选 voice ID 时有 fallback；
- 缺少必需语音配置时能返回清楚错误，而不是服务崩溃。

---

## A3. 添加统一 fetch timeout

### 问题

当前多个 fetch 请求没有统一 timeout。真实使用时如果 API 卡住，会直接影响聊天体验。

重点位置：

- `/api/chat`
- `/api/tts`
- `/api/stt`
- `/api/feedback`
- `/api/explain`
- `/api/memory`
- `/api/welcome`
- 前端聊天页调用这些 API 的地方

### 修改建议

新增工具函数：

```ts
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10000
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
```

### 超时建议

- chat：12s
- feedback：15s
- explain：10s
- memory：8s
- welcome：8s
- tts：15s
- stt：20s

### 前端降级文案

不要直接暴露技术错误。建议使用产品语言：

- `ちょっと混み合っているみたい。もう一度試してみよう。`
- `音声の再生に失敗しました。今回はテキストで続けよう。`
- `提案を作れませんでした。でも意味はちゃんと伝わっています。`

### 验收标准

- API 卡住时不会无限 loading；
- 用户能继续打字；
- TTS 失败不影响文字聊天；
- feedback 失败不影响主聊天流。

---

## A4. LLM 输出格式校验

### 问题

`feedback`、`explain`、`memory` 等接口依赖 LLM 返回结构化结果。LLM 偶尔可能返回坏 JSON 或缺字段。

### 修改建议

对结构化 API 做最小 schema 校验。可以使用 Zod，也可以先手写 guard。

重点校验：

- `feedback` 是否包含三档建议；
- `explain` 是否包含词、读音、释义、整句翻译；
- `memory` 是否返回安全、短小、可存储的事实；
- 缺字段时返回 fallback。

### 验收标准

- LLM 坏 JSON 不导致前端崩溃；
- 用户看到的是温和 fallback；
- console 中能记录必要诊断信息。

---

## A5. 拆分大文件

### 问题

`app/chat/[npcId]/page.tsx` 和 `components/chat-bubble.tsx` 承担职责过多，后续修改风险会越来越高。

### 建议拆分方向

#### UI 组件

- `ChatLayout`
- `ChatSidebar`
- `ChatHeader`
- `MessageList`
- `ChatInputBar`
- `UserBubble`
- `NpcBubble`
- `SuggestionButton`
- `ReplayButton`
- `SuggestionDrawer`
- `WordExplainPopover`

#### Hooks

- `useChatSession`
- `useTTS`
- `useSTT`
- `useNpcMemory`
- `useFeedback`
- `useWordExplain`

### 原则

- 不要一次性大重构；
- 先抽最稳定、最少依赖的组件；
- 每次只拆一个职责；
- 拆完必须保持 UI 和行为不变。

### 验收标准

- 原功能保持不变；
- 文件职责更清楚；
- 后续修改提案层、TTS、输入栏时不需要改整个聊天页。

---

# B. UI / UX 优化

## B1. 首页入口感增强

### 当前问题

首页插画很美，但用户第一眼可能不知道：

- 哪些地方可以点；
- 为什么要点；
- 三个地点有什么区别；
- 页面不是纯展示图，而是交互入口。

### 修改建议

1. 建筑 hover 更明显：
   - 轻微放大；
   - 轮廓光；
   - 柔和阴影；
   - 指针变化；
   - NPC 卡片更清晰。

2. 底部 CTA 强化：
   - 提高字号；
   - 提高对比度；
   - 文案更明确。

3. 第一次访问轻引导：
   - 某个建筑或 NPC 气泡轻微浮动；
   - 或显示一句：`気になるお店をクリックして、住人と話してみよう。`

4. 三个地点差异化：
   - 咖啡馆：安静、温柔、生活爱好；
   - 便利店：日常、轻松、吐槽；
   - 居酒屋：豪爽、温暖、放松。

### 验收标准

- 新用户能在 3 秒内知道“要点击建筑”；
- hover 反馈明显但不破坏安静氛围；
- 三个 NPC 的气质差异更明显。

---

## B2. 便利店视觉统一

### 当前问题

便利店招牌 `LAWSONG` 相比咖啡馆、居酒屋更现代、更硬，和整体手绘街区略有割裂。

### 修改建议

保留 `LAWSONG` 的幽默感，但弱化现代企业 logo 感：

- 字体更手写 / 旧招牌化；
- 降低饱和度；
- 与周围建筑材质更统一；
- 不要过度像真实品牌 logo。

### 验收标准

- 便利店仍然一眼可识别；
- 不再明显破坏整体日式手绘氛围。

---

## B3. 聊天页侧边栏增强“联系人列表感”

### 当前问题

左侧三个 NPC 目前更像装饰性列表，可切换感和当前状态不够明显。

### 修改建议

1. 当前选中态更强：
   - 深色背景或琥珀色点；
   - 左侧细条；
   - 头像轻微高亮。

2. Hover 状态更明确。

3. 每个 NPC 显示：
   - 名字；
   - 场所；
   - 当前一句状态或心里话。

4. 移动端后续改为抽屉或 hamburger。

### 验收标准

- 用户能看出这里可以切换 NPC；
- 当前 NPC 状态明确；
- 视觉层级不喧宾夺主。

---

## B4. 用户消息气泡长文本可读性优化

### 当前问题

中英日混合输入、英文大写、长串表达会让用户气泡难读。

### 修改建议

在用户消息气泡中加入：

- `break-words`
- `whitespace-pre-wrap`
- 合理 `max-width`
- 合理 `line-height`
- 英文长串自动换行

同时避免气泡过宽，保持聊天节奏。

### 验收标准

- `Please give me a CUP of that COFFEE` 这类输入不会撑破气泡；
- 中英日混合句子可读；
- 移动端不横向溢出。

---

## B5. `💡 提案` 面板降密与 Drawer 化

### 当前问题

当前 `💡 提案` 是居中 Modal，信息密度较高，容易打断聊天上下文。

问题包括：

- Modal 过重；
- 遮挡聊天内容；
- 三档建议文字密集；
- 解释像论文脚注；
- 不利于边看建议边对照原句。

### 修改建议

分两步做。

#### 第一步：保留 Modal，但降低信息密度

- 放大每档的日语建议句；
- 缩短解释文案；
- 折叠长解释；
- 去掉过密的括号解释；
- 每档只保留最必要内容。

#### 第二步：改为右侧 Drawer

Drawer 内容结构：

1. 原句；
2. 三档表达卡片：
   - カジュアル
   - ふつう
   - フォーマル
3. 每张卡片包含：
   - 建议表达；
   - 一句话说明；
   - `聞く` 按钮；
   - `詳しく` 折叠解释。

### 验收标准

- 打开提案后仍能感知聊天上下文；
- 用户第一眼先看到“可以怎么说”，而不是大段解释；
- 解释温和、短、实用；
- 不像考试批改。

---

## B6. 划词解释卡 polish

### 当前状态

方向正确，已经接近可用。

### 修改建议

- 标题区更清楚：词、读音、播放；
- 简义和整句翻译层级拉开；
- `詳しく` 展开内容再压缩；
- 卡片 padding 和宽度微调；
- 保持轻量，不要变成词典页面。

### 验收标准

- 用户能快速知道这个词什么意思；
- 不需要读大段语法解释；
- 展开内容只补充语感，不堆术语。

---

## B7. 输入栏抛光

### 当前问题

底部输入栏功能具备，但视觉精致度和交互反馈还可以提升。

### 修改建议

- 输入框 focus 状态更明确；
- 发送按钮形状和输入框统一；
- 语音按钮状态更清楚；
- 发送中 / 录音中状态可见；
- 禁用状态有视觉反馈。

### 验收标准

- 用户知道什么时候可以发送；
- 语音和文字模式切换清楚；
- 视觉上与整体米白、深绿、琥珀色系统一致。

---

# C. 产品体验新增需求

## C1. 练习总结卡片

详细规格见 [`docs/session-summary-spec.md`](session-summary-spec.md)。后续实现时以该文档中的 `ふりかえり / Session Summary Card` 范围、数据模型和验收标准为准。

### 目标

让用户每次练习结束后感到“我完成了一次练习，并且学到了一点东西”。

### 触发方式

任选其一：

- 每 8~10 轮对话自动出现；
- 用户点击“今日小结”；
- 用户离开聊天页前弹出轻量总结入口。

### 内容结构

总结卡包含 4 个部分：

1. 今天聊了什么；
2. 你用得不错的表达；
3. 可以更自然的表达；
4. 新学到的词 / 说法。

### 语气原则

- 不考试；
- 不打分；
- 不说教；
- 像朋友帮你整理今天的收获。

### 验收标准

- 用户能感到练习有收束；
- 总结内容简短；
- 能为 experience log 和公开复盘提供素材；
- 不影响主聊天速度。

---

## C2. 轻量 Onboarding

### 目标

让第一次访问用户快速理解：

- 这是什么；
- 应该点哪里；
- 三个 NPC 有什么区别；
- 可以文字输入，也可以之后尝试语音。

### 建议形式

不要做复杂 tutorial。可以只做：

- 首页一句更明确提示；
- 第一次进入时的轻量浮层；
- 建筑 hover 卡片更清楚；
- 第一次聊天时提示 `💡 提案` 和 `再生` 的存在。

### 验收标准

- 不破坏安静氛围；
- 不像商业 app 的强引导；
- 用户不会迷路。

---

## C3. 学习模式偏好设置

### 目标

兼容不同用户对教学强度的偏好。

### 模式建议

#### 安静模式（默认）

- 保持当前逻辑；
- `💡 提案` 只在 hover / 主动点击时出现；
- NPC 不主动教学。

#### 引导模式

- 系统可以更明显提示“这句可以查看自然表达”；
- 但仍不直接纠错；
- 建议仍在独立面板里展示。

### 验收标准

- 默认仍保持低压力；
- 想被多指导的用户也有入口；
- 不让 NPC 聊天流变成课堂。

---

## C4. 熟悉度可感知化

### 当前问题

熟悉度逻辑存在，但用户可能不明显感知。

### 修改建议

- Header 显示轻量关系状态：
  - 初めまして
  - 少し慣れてきた
  - いつもの感じ
- 开场白更明显体现关系进展；
- 不要做重型等级条。

### 验收标准

- 用户感觉 NPC 和自己越来越熟；
- 关系感通过语言和细节体现，而不是游戏化压迫。

---

# D. Vercel 上线准备

## D1. 上线前 checklist

### 构建

- 本地 `npm run build` 成功；
- build warning 已分类：阻塞 / 非阻塞；
- 非阻塞 warning 可以记录到 issue，不必全部立刻修。

### 环境变量

确认 Vercel 中配置：

```env
DEEPSEEK_API_KEY=
VOLCENGINE_ARK_API_KEY=
VOLCENGINE_ARK_ENDPOINT_ID=
VOLCENGINE_SPEECH_APP_ID=
VOLCENGINE_SPEECH_ACCESS_TOKEN=
VOLCENGINE_TTS_VOICE_MISAKI=
VOLCENGINE_TTS_VOICE_KIMURA=
VOLCENGINE_TTS_VOICE_TAISHO=
TTS_PROVIDER=auto
```

### API 检查

上线后测试：

- `/api/chat`
- `/api/tts`
- `/api/stt`
- `/api/feedback`
- `/api/explain`
- `/api/memory`
- `/api/welcome`

### 浏览器行为

- 首页是否正常；
- 点击建筑是否进入聊天；
- 文字聊天是否正常；
- TTS 是否播放；
- 语音输入是否可用；
- `💡 提案` 是否可打开；
- 划词查词是否可用；
- LocalStorage 是否正常保存。

### 错误降级

模拟：

- LLM 请求失败；
- TTS 失败；
- STT 失败；
- feedback 失败；
- explain 失败。

要求：

- 页面不崩；
- 用户能继续打字；
- 错误提示温和。

---

# E. Experience Log 工作流

## E1. 为什么需要 Experience Log

NPC 聊天体验、教学建议质量、低压力程度，不能只靠一次 prompt 设计完成。需要真实使用后记录问题，再基于 case 迭代。

Experience Log 同时服务：

- 产品迭代；
- prompt eval；
- 公开项目复盘；
- README / portfolio 说明；
- 自己的日语学习。

## E2. 建议文件结构

```txt
docs/
  development-plan.md
  experience-log.md
  prompt-eval-cases.md
```

## E3. 每条日志记录要点

- 日期；
- NPC；
- 输入方式；
- 用户输入；
- NPC 回复；
- 问题类型；
- 主观感受；
- 理想行为；
- 严重程度；
- 是否进入 prompt eval；
- 后续动作。

## E4. 日志到任务的转换链条

```txt
Observation → Diagnosis → Fix → Eval Case → Public Note
```

示例：

```txt
Observation:
美咲在用户说「今日は tired」后直接解释 tired 的日语表达，像老师。

Diagnosis:
聊天层和教学层边界不够清楚。

Fix:
强化 /api/chat prompt：NPC 只共情和接话，不解释语言点。

Eval Case:
输入「今日は tired」后，NPC 必须只用日语自然回应，不出现中文、英文解释或纠错。

Public Note:
这个 case 说明语言学习 AI 容易把所有场景都变成教学，因此需要把社交回应和学习反馈拆成两个独立交互层。
```

---

# F. Codex 协作规范

## F1. Codex 的角色

Codex 适合负责：

- 读代码；
- 审计结构；
- 小范围修改；
- 生成 patch；
- 写测试；
- 梳理 issue；
- 重构局部组件；
- 检查 API key 风险。

Codex 不应单独负责：

- 最终 build 结果判断；
- 产品方向决策；
- 大范围重构；
- 在未确认前引入数据库 / Auth / RAG / WebRTC；
- 因为本地命令卡住而推断项目有严重代码问题。

## F2. 建议新增 `AGENTS.md`

项目根目录建议添加：

```md
# AGENTS.md

## Project
Kotomachi / 言街 is a Next.js AI-native Japanese speaking practice product.

## Product principles
- Preserve low-pressure language practice.
- NPC chat must never become correction flow.
- Learning guidance belongs to feedback / explain / summary layers.
- Do not introduce database, Auth, WebRTC, Live2D, pronunciation scoring, or RAG unless explicitly requested.

## Command policy
- This project is developed on Windows.
- Use PowerShell syntax.
- Do not use `&&`; use `;` instead.
- Do not run long commands unless explicitly asked.
- Do not run `npm run build` by default.
- If a command may take long, ask first or provide the command for the user to run manually.
- If a command hangs, report it as an environment issue; do not infer the code is broken.

## Coding policy
- Make small, targeted changes.
- One issue per change.
- Avoid large rewrites.
- Do not expose API keys to client code.
- Preserve existing UX unless the issue explicitly asks to change it.

## After changes
Always report:
1. files changed;
2. why changed;
3. how to verify;
4. rollback plan.
```

## F3. 每次给 Codex 的任务格式

每个 issue 应包含：

1. 背景；
2. 目标；
3. 修改范围；
4. 禁止事项；
5. 验收标准；
6. 验证方式；
7. 回滚方式。

不要一次性给 Codex “优化整个项目”。

---

## 4. 建议开发顺序

---

## Sprint 0：工程收束与上线准备

目标：让项目成为一个干净、可部署、可回滚的职业项目。

任务：

1. 初始化 Git；
2. 清理临时文件；
3. 添加 `docs/development-plan.md`；
4. 添加 `AGENTS.md`；
5. 修环境变量命名；
6. 加 timeout；
7. 加错误降级；
8. 部署 Vercel Preview。

完成标准：

- Git clean；
- Vercel Preview 可访问；
- 核心链路能跑；
- 错误不导致页面崩溃。

---

## Sprint 1：首页与聊天 UI 快修

目标：提升第一眼可用性和聊天可读性。

任务：

1. 首页 hover / CTA / NPC 卡片增强；
2. 聊天气泡长文本换行；
3. Sidebar 当前选中态；
4. 输入栏 focus / disabled / sending 状态；
5. NPC 音频按钮前几次更显式。

完成标准：

- 新用户知道点哪里；
- 混合语言长句不撑破气泡；
- 当前 NPC 明确；
- 输入交互更清楚。

---

## Sprint 2：`💡 提案` 体验重做

目标：让学习建议更轻、更清楚、更符合低压力设计。

任务：

1. 先降低现有 Modal 信息密度；
2. 重排三档建议卡片；
3. 把详细解释折叠；
4. 后续改为 Drawer；
5. 保持聊天层和教学层分离。

完成标准：

- 用户先看到建议表达，不是长解释；
- 提案不像老师批改；
- 不遮挡过多聊天上下文；
- 能播放每档示范发音。

---

## Sprint 3：练习总结卡片

目标：补上“练完后的进步感”。

任务：

1. 设计 summary API 或本地生成逻辑；
2. 每 8~10 轮对话生成小结；
3. 小结包含：聊了什么、好表达、可改表达、新词；
4. UI 做成轻量卡片；
5. 可保存到 LocalStorage。

完成标准：

- 用户结束练习时有收束感；
- 总结简短温和；
- 不打分；
- 可作为 experience log / 公开复盘素材。

---

## Sprint 4：代码拆分与测试

目标：降低后续迭代成本。

任务：

1. 拆分聊天页；
2. 拆分气泡组件；
3. 抽 hooks；
4. 添加最小测试；
5. 添加 prompt eval cases。

完成标准：

- 主要 UI 组件职责清楚；
- 修改提案层不影响 TTS；
- 修改输入栏不影响 memory；
- prompt regressions 有基础 case。

---

## Sprint 5：体验日志驱动的 NPC / 教学优化

目标：基于真实使用 case 优化，而不是凭感觉调 prompt。

任务：

1. 建 `experience-log.md`；
2. 每天或每轮测试记录 3~5 个 case；
3. 定期提炼 prompt eval；
4. 修复 NPC 客服化、老师化、过度提问等问题；
5. 更新 README 和公开项目文档。

完成标准：

- 至少积累 20 个真实 case；
- 至少形成 10 个 prompt eval cases；
- README 能讲出迭代依据；
- 公开项目复盘能说明产品判断如何来自真实使用。

---

## 5. 当前最推荐的下一步

建议下一步按以下顺序执行：

1. 把本文件保存为 `docs/development-plan.md`；
2. 新建 `AGENTS.md`；
3. 初始化 Git 并做 clean commit；
4. 修环境变量命名不一致；
5. 为关键 API 添加 timeout 和错误降级；
6. 优化首页入口感；
7. 优化聊天长文本换行；
8. 部署 Vercel Preview；
9. 开始记录 `experience-log.md`；
10. 开始做练习总结卡片。

---

## 6.1 Saved Learning Items（Pack M / N）

详细规格见 [`docs/saved-learning-items-spec.md`](saved-learning-items-spec.md)。

为保证学习链路可积累，同时不破坏低压力聊天体验，新增轻量路线：

- **Pack M1** ✅：Saved Items LocalStorage helper（仅数据层，新增 types/helper，不扩 UI）
- **Pack M2** ✅：从查词 popover 收藏词语（Save Word，收藏按钮放在读音/释义行旁边）
- **Pack M3** ✅：从表达提示收藏句子（Save Expression，每档建议卡片增加收藏按钮）
- **Pack M3.1** ✅：表达提示缓存（expression-hint-cache，同一消息复用已生成建议）
- **Pack M3.2** ✅：缓存安全补丁（版本号 + 重新生成 + 空结果校验）
- **Pack M3.3** ✅：收藏状态同步修复（drawer 打开时重新从 localStorage 计算）
- **Pack M4** ✅：Sidebar 收藏入口与列表面板（Saved Panel，按类型筛选、查看详情、删除）
- **Pack M4.1** ✅：收藏面板可读性优化（卡片层级 + badge + label）
- **Pack M4.2** ✅：收藏入口与面板视觉整合（sidebar 统一 + 卡片 polish）
- **Pack M4.3** ✅：Sidebar 信息架构与视觉 polish（住人/学习/底部导航统一）
- **Pack N1**：Word Explanation Language（meaning / sentenceMeaning / nuance 跟随 UI language，不翻译日语学习内容本体，已收藏项保留保存时语言）

约束：

- 先做 localStorage MVP；
- 不引入账号、云同步、数据库；
- 不做打卡或高压力复习机制；
- 收藏对象必须来自真实上下文，不凭空生成；
- 收藏入口轻量、不打断聊天。

## 6.2 下一阶段方向

### Pack N: Generated Explanation Language

详细规格见 [`docs/generated-explanation-language-spec.md`](generated-explanation-language-spec.md)。

- **Pack N0** 🔄：Generated Explanation Language Spec（规格文档，明确语言边界和分步计划，不修改业务代码）
- **Pack N1**：Word Explanation Language（查词解释的 meaning / sentenceMeaning / nuance 跟随 UI language）
- **Pack N2**：Expression Hint Language（表达提示的 usage / reason / note 跟随 UI language）
- **Pack N3**：Review Card Language（回顾卡片的 meaning / note / summary 跟随 UI language）

核心约束：

- meaning / note / explanation 跟随 UI language
- 不翻译日语学习内容本体
- 已收藏项保留保存时语言
- 不要一次性改三条链路，应分包实现

### Pack O: Lightweight Onboarding / First-Chat Guidance

- **O1** ✅：First-chat starter prompts（空聊天状态显示 3 条话题建议）
- **O1.1** ✅：Topic ideas integrated into + menu（输入区"+"菜单增加"找话题"入口）
- **O1.2** ✅：Starter prompt pool architecture（global + NPC-specific 混合话题池，deterministic rotation）
- 实现原则：
  - Starter prompts are static local content, not LLM-generated
  - Prompt pool mixes global low-pressure topics with NPC-specific flavor
  - Goal is to reduce "I don't know what to say" friction
  - 18 global prompts (daily / mood / open / learning) + 8 NPC-specific prompts per character
  - Each display: 2 global + 1 NPC-specific, deterministic by date + npcId + messageCount
- 后续方向：
  - Seasonal / exam / travel / job-hunting prompt sets
  - Lightweight topic hooks based on recent review cards or saved words
  - Avoid heavy onboarding, streaks, or study-plan pressure

### Pack P: Conversation Motivation / NPC-Specific Topic Hooks

- NPC 基于当前生活弧线主动引入话题
- 增强用户"想回去聊"的动力
- 不做打卡提醒，通过 NPC 生活感自然驱动

### Pack Q: Learning Accumulation Signals

- 让用户感知学习积累（不是分数或等级）
- 轻量信号：收藏数量、回顾卡片数量、连续对话天数
- 不做 streaks / daily check-in / gamification

### 暂缓

- Heavy learning preference settings（安静模式 / 引导模式）
- Familiarity level system（关系等级可视化）
- Streaks / daily check-in
- Complex manual message selection for review cards

## 7. 一句话总结

Kotomachi 后续不应该走“继续堆功能”的路线，而应该走：

> 工程收束 → 上线验证 → UI 入口清晰化 → 教学层降密 → 练习总结闭环 → 体验日志驱动 NPC 优化。

这样它会从一个有想法的 AI demo，变成一个真正可以展示、可以迭代、可以讲清楚产品判断和工程能力的作品集项目。
