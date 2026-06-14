# Kotomachi / 言街 后续开发计划

> 用途：记录当前产品阶段、已完成里程碑、近期优先级，以及公开的 roadmap / maintenance 口径。  
> 原则：历史要保留，但表达要压缩；已经完成的内容用勾选标记，不要删掉。

---

## 0. Current Status / 当前阶段

Kotomachi 当前处于 **MVP v1.x + 6 NPC + conversation rhythm v0 baseline + ongoing polish** 阶段。

- [x] 可以运行
- [x] 可以自用
- [x] 可以给少量朋友测试
- [x] 核心学习闭环已经打通
- [x] 已覆盖 5 个不同关系语境 / register 的 NPC
- [x] Conversation Rhythm v0 已完成第一轮落地：
  - opening mode 已稳定；
  - continuation mode topic ideas 已强化；
  - soft landing Review Cards 已改进；
- [x] 世界状态 / 日期 / 季节规则已统一；
- [x] prompt safety / 上下文一致性已强化；
- [x] 后续重点继续稳定体验、基于 bad case 迭代、准备产品化扩展。

这不是正式商业上线状态，也不是 App Store / Play Store 产品。

---

## 1. 已完成的核心能力

### 1.1 首页与入口

- [x] Hybrid homepage v1
- [x] 雨后街区 hero 氛围层
- [x] Scene grouping：按日常生活 / 校园生活组织入口
- [x] Horizontal card scroll：支持后续 NPC / scene 扩展
- [x] ContinueSection：继续上次聊天（已降权，只显示最近 1 个）
- [x] InspirationSection：今日灵感 / starter prefill
- [x] **Home-level daily guided scene entry**：
  - 首页新增「今日街角小事」入口
  - 接入 Guided Scenario
  - 点击后进入 `/chat/[npcId]?scene=sceneId`
  - 支持「换一个」切换今日场景
- [x] **Free Chat starter retained as separate entry**：
  - 首页「随便聊一句」入口
  - 点击后进入 `/chat/[npcId]?starter=idea`
  - 无固定场景，只是带一句话开聊
- [x] 旧 heat-zone 热区交互退役

### 1.2 聊天与教学分层

- [x] NPC chat 主链路
- [x] Mixed-language input
- [x] NPC 纯日语回复
- [x] Welcome Prompt v2（initial / revisit 边界）
- [x] Start-over confirmation dialog
- [x] NPC message translation
- [x] Expression Hints（三档建议 + 收藏 + 试听 + 缓存）
- [x] Word Explanation（划词查词 + 收藏）
- [x] Review Cards（生成 + 详情 + 历史列表）
- [x] Saved Items MVP（表达 / 词语收藏、筛选、删除、容量限制）
- [x] Topic Ideas / 找话题
  - [x] opening mode：本轮还没展开时使用 fixed topic pool
  - [x] continuation mode：对话中由 AI 根据上下文生成接话建议
  - [x] fallback：失败时回到 fixed topic pool
- [x] 轻量 onboarding / help hints

### 1.3 学习资产与积累感

- [x] Learning accumulation signals（收藏 / 回顾卡数量反馈）
- [x] Review Cards / Saved Items 面板
- [x] Sidebar / mobile drawer 学习入口整理
- [x] Input action menu（回顾卡生成 + 找话题）
- [x] UI language toggle（中文 / English）
- [x] Word lookup partial selection correction（selectedText 纠偏）

### 1.4 语音与移动端

- [x] TTS playback
- [x] STT input
- [x] 用户语音回听
- [x] Audio playback hardening
- [x] PWA mobile self-use support
- [x] Mobile / desktop responsive polish
- [x] Mobile beta usability fixes

### 1.5 世界观与连续性

- [x] 6 NPC：Misaki / Kimura / Taisho / Haruka / Aoi / Nana
- [x] NPC life arc system
- [x] Shared world state
- [x] Cross mentions
- [x] Memory / familiarity 的轻量 LocalStorage 机制
- [x] Avatar style spec v1：scene-object badge / 物件徽章方向
- [x] 6 NPC baseline complete：
  - Misaki / 美咲：咖啡馆，轻丁寧，安静闲聊；
  - Kimura / 木村：便利店，随意口语，年轻熟人感；
  - Taisho / 大将：居酒屋，熟客口语，年长者寒暄；
  - Haruka / 遥：研究室 / 校园，轻丁寧，前辈请教；
  - Aoi / 葵：学生ラウンジ / サークル仲間，タメ口，同级朋友；
  - Nana / 七海：街区生活支援ラウンジ，生活落地支援，轻丁寧，帮助练习生活场景日语表达。
- [x] 当前已覆盖日常、校园、朋友、前辈请教、下班后、生活落地等核心关系语境场景。

### 1.6 近期完成的质量强化

- [x] Conversation Rhythm v0 baseline：
  - opening mode：本轮还没展开时使用 fixed topic pool；
  - continuation mode：对话中由 AI 根据上下文生成接话建议；
  - topic pool 已定义为 conversation seed library 的基础；
  - NPC 主回复已加入轻量 rhythm：先接住、轻延展、小入口；
  - 不做显性阶段 UI，不做任务系统/课程系统/进度条。
- [x] Topic Ideas polish complete：
  - continuation topic ideas 已强化：
    - 优先顺着最近上下文；
    - 输出用户可直接发送的日语短句；
    - 遵守 NPC register；
    - 三条建议应有不同角度；
    - 不强行切换 topic seed；
    - fallback 到 fixed topic pool 仍保留。
- [x] World state / local date / seasonal hints complete：
  - world state 已从随机氛围中拆出硬事实；
  - local date context 已接入：date、weekday、weekend、time of day、month/season；
  - seasonal cultural hints 已作为可选语境素材接入；
  - 明确分层：local date context = 日期/星期/时间段硬事实，world state = 街区氛围，seasonal hints = 季节文化素材，topic seed = 对话主题骨架；
  - 修复了周五显示周末、中午说夜晚、六月说圣诞等一致性问题。
- [x] Prompt safety / context consistency complete：
  - 防止 NPC 编造用户过去说过的话；
  - 修复 Aoi false memory / false intimacy bad case；
  - 修复真实地名规则过严/过松问题：
    - 不把 Kotomachi 绑定到真实地点；
    - 用户明确问旅行/文化/地理时，可以一般性提真实地名；
  - chat / welcome / topic ideas 均需遵守：world state、local date context、seasonal hints、fictional town boundary。
- [x] Review Cards soft landing improved：
  - Review Cards 已支持轻量 soft landing；
  - 查词 / 表达提示 / 非日语输入等 evidence signals 已被纳入；
  - 修复 recent lookups 残片重复展示问题；
  - Review Cards / Saved Items 不会被 start-over 删除；
  - Review Cards 不做评分、不做正式学习报告、不做 One Takeaway 首页模块。
- [x] Expression Hints hardening complete：
  - 修复推荐表达偶发混入用户英文原句的问题；
  - 推荐表达字段应是可直接使用的自然日语；
  - 解释字段可以说明原句如何转化；
  - 修复表达提示面板关闭按钮乱码；
  - 收藏 / TTS 功能保持不受影响。
- [x] System map established：
  - 已新增 `docs/system-map.md`；
  - 用于记录：product loop、world state flow、topic ideas/conversation seed flow、NPC integration checklist、learning asset flow、state ownership table、risk map；
  - 后续跨模块改动应先参考 system map。
- [x] Guided Scenario baseline complete：
  - Free Chat + Guided Scenario 双入口已形成；
  - 6 个 NPC 均已有对应场景类型：
    - Kimura：便利店场景（便当结账、找商品、点关东煮、问支付方式、问打折、买热柜小食）；
    - Misaki：咖啡馆场景（点咖啡、问咖啡推荐、点甜点、找座位）；
    - Taisho：居酒屋场景（第一次进店、先点一杯、不喝酒时怎么说、问今日推荐、点一份小菜、追加点单、今天有点累、结账）；
    - Haruka：校园/研究室场景（第一次进研究室、请前辈帮忙看一下、文献看不懂、ゼミ里简单发言、发表前有点紧张、课后确认没听懂）；
    - Aoi：同龄朋友 small talk 场景（问最近喜欢什么、接住朋友推荐、加入不熟的话题、说想放空一下、问下课后安排、委婉说下次吧）；
    - Nana：街区生活支援场景（租房初期费用、看房问条件、役所手续、听不懂请再说一遍、手机/网络、垃圾分类、药局说明症状、银行/邮局窗口咨询）；
  - 功能型小店 NPC 覆盖便利店/咖啡馆/居酒屋；
  - Haruka 覆盖校园/研究室轻请教；
  - Aoi 覆盖同龄朋友 small talk moves；
  - Nana 覆盖街区生活支援场景；
  - activeScene 是临时软上下文，不写入 localStorage；
  - 场景中 `+` 菜单从"找话题"变成"下一句怎么说"；
  - 退出场景有 UI-only divider，不进入 chat/topic ideas/session summary/TTS/Review Card；
  - 不做课程、不做任务、不做评分、不做通关。
- [x] **Home-level daily guided scene entry**：
  - 首页新增「今日街角小事」入口
  - 接入 Guided Scenario
  - 点击后进入 `/chat/[npcId]?scene=sceneId`
  - 支持「换一个」切换今日场景
- [x] **Micro guide fields for scenes**：
  - `microEpisodeZh/En`：情境描述，降低开口阻力
  - `starterIntentZh/En`：用户意图说明
  - `sampleUserLineJa`：可直接发送的日语
  - 首页和聊天页展示这些字段
- [x] **Scene query launch**：
  - 聊天页支持 `?scene=sceneId` query 参数
  - 自动启动对应 scene
  - NPC 先开场
  - 输入框预填 sample line
  - 不自动发送
- [x] **NPC-first + editable user-line prefill**：
  - 场景启动时 NPC 先开口
  - 输入框预填 `sampleUserLineJa`
  - 用户可编辑后再发送
- [x] **Prompt subtraction for more natural NPC behavior**：
  - Nana 已修复老师化 / 顾问化 / 说明书化倾向
  - Haruka 部分 scene opening 已更自然
  - `/api/chat` 的 scene prompt 已精简
  - 移除 `possibleBeats` 和 `usefulIntents` 的显性传递
  - 强调"soft context, not a task flow"
- [x] **ContinueSection lowered priority**：
  - 只显示最近 1 个聊天
  - 作为回访辅助入口，而不是首页主入口

---

## 2. Product Thesis / 核心产品判断

Kotomachi 后续最值得围绕一句话展开：

> 让用户在一个低压力的小世界里，短短说几句日语，也能感觉自己真的完成了一次表达练习。

重点不是无限陪聊，也不是正式课程，而是：

- 用户更容易开口；
- 用户更容易接着聊；
- 用户说得短、乱、混合语言也不失败；
- 一次 3-15 分钟的短练习也能形成闭环；
- NPC 不是不同头像，而是不同关系语境和口语 register。

Kotomachi 不应被写成：

- 陪伴 AI；
- 二次元角色聊天；
- 打卡学习软件；
- 题库 / 课程系统；
- 角色收集游戏。

---

## 2.1 Daily Share Motivation / 日常分享动机

### 核心产品方向

Kotomachi 不只是一个"练习日语"的工具，也应该成为一个用户愿意打开来表达日常小事的小镇。

**理想开口理由不应只是：**
- 我要学习
- 我要练一个场景
- 我要完成任务

**而应该是：**
- 今天有点累，想跟 Aoi 说一句
- 今天做了饭，想问 Taisho 怎么说
- 今天研究/求职有点烦，想跟 Haruka 讲
- 今天想慢慢说点心情，想去找 Misaki
- 今天遇到日本生活手续问题，想问 Nana
- 今天想去便利店找 Kimura 随便聊两句

**产品目标**：
> The product goal is to make real-life moments become Japanese output.
>
> 让用户把自己的真实生活片段自然转化成日语输出。

### 与多 NPC 的关系

多 NPC 不是简单堆角色，而是 Kotomachi 的核心差异化之一。

GPT / 普通 AI 聊天通常是一个万能接口。Kotomachi 的优势是一个小镇里有不同的人、不同地点、不同社会关系，能承接用户生活里的不同片段。

| NPC | 适合分享的语境 |
|-----|----------------|
| Kimura | 便利店、夜晚、打工、生活琐事、累不累 |
| Misaki | 咖啡、天气、安静心情、慢慢讲的小事 |
| Taisho | 吃了什么、下班后放松、今天遇到的荒唐事 |
| Haruka | 学习、研究、论文、面试、表达压力 |
| Aoi | 最近喜欢的东西、开心/烦躁的小事、朋友感话题 |
| Nana | 日本生活中不知道怎么问的事、手续、租房、手机网络 |

**原则**：NPC 是不同生活语境下的自然 conversation partners，不是情感依赖对象。

### 与现有入口的关系

未来产品层级（概念）：
```
进入 NPC
├─ Free Chat：想和这个人随便聊聊
├─ Guided Scenario：想在这个地方处理一件小事
└─ Daily Share：想告诉这个人一件今天发生的小事
```

**v0 实现原则**：
- 不做成新的正式入口；
- 先作为 NPC prompt、starter、empty state、topic ideas 的产品原则；
- 不重塑首页大结构；
- 不做成社交媒体；
- 不做成情感陪伴 App。

### 与 Guided Scenarios 的区别

| 特性 | Guided Scenario | Daily Share |
|------|-----------------|-------------|
| 开口动机 | 我想做一件事 | 我有件事想说 |
| 目标 | 处理一个生活小情境（买便当、点咖啡、问手续） | 把今天发生的小事告诉某个 NPC |
| 核心 | 降低开口成本 | 分享日常片段 |

### 与 Expression Hints 的关系

**原则**：
- **Main conversation catches the user's life.** 对话主回复负责接住用户生活，不要立刻教学化。
- **Learning layers extract language value.** Expression Hints / Review Cards 负责在辅助层提炼表达。

**示例**：
用户说：`今日はちょっと疲れた。`

NPC 主回复不应是：`更自然的说法是……`

而应先自然接住：`そっか、今日はちょっと疲れたんだね。何かあった？`

学习价值可以放在辅助层（Expression Hints 或 Review Card），而不是让 NPC 主回复变成批改老师。

### 产品原则

- 用户不是为了完成任务才打开，而是因为有小事想说；
- 多 NPC 提供不同社会语境，而不是多个皮肤；
- NPC 先接住生活，再提供轻量语言价值；
- 不把 Daily Share 做成情感陪伴或恋爱陪伴；
- 不鼓励依赖 NPC 解决现实情绪问题；
- 不做心理咨询 / mental health support；
- 不把分享入口做成打卡；
- 不要求用户每天提交日记；
- 不做社交媒体信息流；
- 不用强 notification / streak 逼用户回来；
- 保持低压力、短、生活化；
- 用户可以随时跑偏或结束；
- Review Card 只轻量提炼表达，不做情绪总结；
- NPC 个性应影响"适合分享什么"和"如何回应"。

### Non-goals

明确不做：
- emotional companion product；
- romantic companion；
- therapy / counseling；
- mental health support；
- diary app；
- streak / mandatory check-in；
- social feed；
- parasocial dependency design；
- push notification growth loop；
- scoring / progress for daily sharing；
- forced daily reflection；
- replacing real friends or teachers。

### 优先级

- **Product direction: P1** — 这是重要的产品方向；
- **Implementation: P2 / later** — 但现在不应马上大改 UI；

**当前优先级仍是**：
- 图片压缩；
- 大陆访问稳定；
- 真实用户测试；
- Guided Scenarios polish；
- Expression Hints 稳定；
- 作品集包装。

### 可探索的轻量实现方向

1. **NPC card / empty state copy**：
   - 今天有点累？去便利店跟 Kimura 说两句。
   - 想慢慢说一件小事？Misaki 会听你讲。
   - 学习和研究有点卡？可以找 Haruka 说说。

2. **Starter prompts**（根据 NPC 个性调整）：
   - 今日はちょっと疲れました。
   - 最近、少しうれしかったことがあります。
   - 今日こんなことがありました。
   - ちょっと聞いてほしいことがあります。

3. **Topic Ideas**（帮用户把真实生活转成可说的日语）：
   - 今天发生的小事
   - 最近喜欢的东西
   - 有点累的时候
   - 想问对方怎么看

4. **NPC prompt behavior**：
   - 先承接用户分享；
   - 追问一个自然的小问题；
   - 不急着教学；
   - 不把每句话都纠正；
   - 保持角色身份和场景感；
   - 避免过度亲密化；
   - 避免心理咨询化。

---

## 3. Current NPC Coverage / 当前 NPC 覆盖

| NPC | Scene | Relationship / register | Main value | Main risk |
| --- | --- | --- | --- | --- |
| Misaki / 美咲 | 咖啡馆 | 轻丁寧，安静熟客感 | 安静闲聊、咖啡馆表达、休息与情绪描述 | 心理咨询腔、过度温柔 |
| Kimura / 木村 | 便利店 | 随意口语，年轻熟人感 | 便利店、夜勤、生活节奏、轻吐槽 | 太冷、太短、接不住话 |
| Taisho / 大将 | 居酒屋 | 熟客口语，年长者寒暄 | 一天结束、吃喝、疲惫、夜晚闲聊 | 人生导师腔、说教 |
| Haruka / 遥 | 研究室 / 校园 | 轻丁寧，前辈请教 | 研究室、发表、文献、留学前不安 | 老师腔、顾问腔 |
| Aoi / 葵 | 学生ラウンジ / サークル仲間 | タメ口，同级朋友 | 兴趣、放课后、朋友语气、最近推荐 | 太黏、太恋爱、太二次元 |
| Nana / 七海 | 街区生活支援ラウンジ | 轻丁寧，生活落地支援 | 生活落地表达、租房问费用、役所手续、手机网络、垃圾分类 | 行政顾问化、翻译工具化 |

**当前 6 个 NPC 已经足够覆盖一批核心关系语境。近期不继续快速堆 NPC 数量。**

---

## 4. Near-term Direction / 近期方向

### 4.1 Current Product Issue / 当前核心问题

Kotomachi 已经解决了一部分"敢开口"的问题，但当前仍存在**聊天动机低 / 单个 NPC 聊不深 / 用户不知道今天说什么**的问题。这不是简单通过继续增加 NPC 就能解决的。

当前阶段的核心问题不是基础能力缺失，而是 **opening motivation 不够强**：用户虽然可以选择 NPC、选择场景、查看今日灵感，但这些机制还没有完全组织成一个足够强的"我现在就知道可以说什么"的动机链条。

下一阶段优先不是继续堆 NPC，而是增强：
- 开口动机；
- 第一句可行动性；
- 场景情境感；
- 上次聊天到下次聊天的回流；
- 低压力的表达脚手架。

### 4.2 Micro Episode for Guided Scenarios

为现有 Guided Scenarios 增加 micro episode 层，**不改变 Guided Scenario 的原则，不做任务、评分、通关、进度**。

新增概念：
- `microEpisode`: string;      // 用户为什么会在这个场景里说话
- `starterIntent`: string;     // 用户想表达的意图
- `sampleUserLineJa`: string;  // 可直接发送的一句自然日语

**解释**：
- 当前 scenario title 更像"练什么"；
- micro episode 要回答"为什么今天要说这一句"；
- 目标是降低开口成本，而不是增加课程感。

**示例**：
- **Nana / 租房初期费用**：
  - microEpisode：你刚看到一间房，月租还可以，但不确定礼金、押金、中介费加起来会不会很高。你想先问清楚初期费用。
  - starterIntent：想问初期费用包括哪些项目。
  - sampleUserLineJa：初期費用には、どんなものがありますか。
- **Misaki / 咖啡推荐**：
  - microEpisode：今天有点困，但不想喝太苦的咖啡。你想让美咲推荐一杯温和一点的。
  - sampleUserLineJa：あまり苦くないコーヒーで、おすすめはありますか。
- **Aoi / 加入不熟的话题**：
  - microEpisode：朋友提到一个你不太熟的话题，但你有点感兴趣，想自然接住。
  - sampleUserLineJa：それ、あんまり詳しくないけど、ちょっと気になる。

### 4.3 Homepage "今日街角小事" Direction

把当前"今日灵感"的未来增强方向记录为：
- 不只是底部 inspiration cards；
- 可以升级为更强的开口入口；
- 每天从 topic seed / scenario seed / review hook 中选 2-3 个；
- 卡片必须包含：
  - NPC；
  - micro situation；
  - 一句可直接发送的日语；
  - 进入对应 NPC 的 CTA。

**建议命名**：今日街角小事 / 今天先说一句 / 今日のひとこと / A small thing to say today

**原则**：这不是任务系统，不是打卡，不是每日挑战，只是低压力开口入口。

### 4.4 Product stabilization & polish

近期优先级：

- 继续稳定 6 个 NPC 的真实使用体验；
- 基于实际使用中的 bad case 做小修小补；
- 小范围 polish prompt / copy / UI；
- 保持 demo path 稳定可靠；
- 准备后续产品化扩展（新增 NPC、新场景等）。

重点关注：

- Aoi 是否太黏、太恋爱、太二次元；
- Haruka 是否老师腔、顾问腔；
- Misaki 是否心理咨询腔；
- Taisho 是否人生导师腔；
- Kimura 是否太冷、太短、接不住话；
- Nana 是否行政顾问化、翻译工具化；
- topic ideas 是否真的能帮助用户接话；
- welcome 是否自然、有边界、不刷屏；
- Review Cards 是否在短对话后仍不尴尬；
- 查词 / 表达提示是否稳定。
- **首页 daily scene 是否提高开口意愿**；
- **sample line 是否真的降低第一句阻力**；
- **NPC opening 是否自然**；
- **Free Chat starter 是否仍有用**；
- **ContinueSection 点击率是否低**。

### 4.5 Next phase recommendations

**当前产品判断**：

- 过度 prompt 约束会让 NPC 失去活人感；
- 后续 prompt 工作应优先做"减法"，而不是继续堆规则；
- 首页现在有两类开口入口：
  - 有小情境：今日街角小事
  - 无固定场景：随便聊一句

**下一阶段建议**：

- **先线上验收和真实使用**，不要立刻继续堆功能；
- 重点观察：
  - 首页 daily scene 是否提高开口意愿
  - sample line 是否真的降低第一句阻力
  - NPC opening 是否自然
  - Free Chat starter 是否仍有用
  - ContinueSection 点击率是否低
- 基于真实反馈做小修小补，而不是预判问题

**未来候选（暂不做）**：

- Review Card next hook 回流；
- 更轻量的 listen-and-repeat；
- feedback / bad case log；
- 首页入口点击埋点；
- 进一步 scene copy polish；
- 可能的新 NPC，但不要近期快速堆 NPC。

### 4.6 Next product expansion candidates

后续候选扩展方向（暂不做）：

- **"我想说……" pre-send expression support**：当前 Expression Hints 是用户说完之后的改写/三档建议；未来可以探索一个"说之前扶一把"的入口；用户输入中文/英文/日语碎片；系统根据当前 NPC、register、activeScene 生成 2-3 句自然日语；用户可一键发送或编辑；它和 Expression Hints 的区别是发生在发送之前。**注意**：不要改 Expression Hints 当前实现；不要接 activeScene 到 Expression Hints；这只是 future candidate；后续需要单独设计和风险评估。
- **Review Card hook 回流**：让 Review Card 的 next hook 不只停留在总结面板里；后续可以回流到：Continue Last Chat、首页今日灵感/今日街角小事、聊天页顶部轻提示、"用这句话继续聊"按钮。**原则**：基于真实对话生成；不编造历史；不制造 false memory；不把它做成任务或 streak。
- **新 NPC 内容扩展**；
- **旅行 / 职场 / 书店 / 图书馆等新场景**；
- **feedback button**；
- **lightweight learning preferences**；
- **voice advice v1**；
- **relationship-aware expression suggestions**；
- **possible multilingual template expansion**；
- **public demo / social sharing polish**。

### 4.3 Deferred / 暂不做

明确近期暂不做：

- 显性课程系统；
- 任务系统；
- 打卡 / streak；
- One Takeaway 首页模块；
- 登录 / 数据库；
- 复杂长期记忆；
- 大规模 NPC expansion；
- Live2D / WebRTC；
- 商业化后台；
- 重型 RAG；
- 语音评分 / 发音打分。
- Voice Advice 产品化；已完成 Azure Pronunciation Assessment spike，但 `ja-JP` 自由短句测试没有拿到足够稳定的 word-level / syllable-level 细节，因此暂不开放产品入口。

---

## 5. Mid-term Directions / 中期增强

### 5.1 Usage duration model / 使用时长模型

Kotomachi 最适合主打“短而完整的低压力练习”，不是无限陪聊。

#### 3 minutes

- 说一句；
- 听一句；
- 查一个词或看一个表达建议；
- 带走一句自然表达。

#### 8 minutes

- 围绕一个小主题聊几轮；
- 使用 topic ideas 接话；
- 生成一张轻回顾卡。

#### 15 minutes

- 切换 NPC；
- 或继续上次聊天；
- 或复用一个曾经收藏 / 回顾过的表达；
- 形成一点连续感。

这个模型用于判断功能优先级：

- 能服务 3-15 分钟短练习的，优先；
- 需要长时间沉浸、复杂任务、账号体系、重型进度的，暂缓。

### 5.2 Strengthen the language town feeling / 强化街区感

目标：让 Kotomachi 从“多个 chatbot”变成“一个小世界”。

**当前进度**：

- **已完成**：town feeling source map 和 cross mention matrix 已整理到 `docs/system-map.md`；
- **已完成**：5 个 NPC 的 cross mentions 配置已就位（`lib/npc.ts`）；
- **已完成**：world state / local date / seasonal hints 已形成一致性规则；
- **已完成**：首页 scene grouping（日常 / 校园）已就位；
- **已完成**：Guided Scenario 与街区感的平衡规则已记录。

已有基础：

- 首页 scene grouping；
- NPC life arc；
- cross mentions；
- 天气 / 时间氛围；
- 统一头像风格；
- 街区化文案。

后续可以增强：

- 同一天气 / 时间 / 街区状态在多个 NPC 中保持一点呼应；
- 雨天时，不同 NPC 对同一世界状态有不同反应；
- NPC 偶尔轻轻提到其他场景；
- Haruka 可以提到校园咖啡馆；
- Misaki 可以偶尔提到研究室的人来买咖啡；
- Kimura 可以说学生放学后来买零食；
- Aoi 可以提到便利店零食或咖啡。

边界：

- 不做复杂 shared memory；
- 不做大型世界观剧情；
- 不做 NPC 关系网游戏；
- 不做角色收集；
- cross mention 要轻，不要喧宾夺主。

强化街区感比继续单纯加 NPC 更有作品集价值，因为它体现的是产品系统设计，而不是内容堆积。

### 5.3 Relationship-aware language suggestions / 关系语感

中期可以探索：同一个意思，在不同 NPC / 关系语境下有不同说法。

例如“我今天有点累”：

- Aoi：`今日ちょっとだるいかも。`
- Misaki：`今日は少し疲れていて、静かに過ごしたいです。`
- Taisho：`今日はちょっと疲れてて、温かいものがほしいです。`
- Haruka：`今日は少し疲れていて、研究の話はゆっくりしたいです。`

这比普通 casual / neutral / formal 三档更符合 Kotomachi 的产品特色。它帮助用户理解：不是一句日语对所有人都一样自然。

### 5.4 Lightweight learning preferences / 学习偏好

暂不做。中长期如果需要，只保留少量偏好：

- 日常闲聊；
- 校园 / 留学；
- 旅行；
- 打工；
- 职场；
- 敬语；
- タメ口；
- 自由聊天。

偏好只影响推荐话题、首页排序、Review Card 重点、topic ideas 风格，不做复杂画像系统。

### 5.5 STT Mishearing Confirmation / Conversation Repair

Later / not now.

这是一个未来的 NPC 对话修复行为，不是 Voice Advice，也不是发音评测。
当用户用语音输入，而 STT 转写结果明显不可靠时，NPC 可以用一句自然的确认来修复对话，而不是盲目相信错误 transcript。

定义：

> When a user speaks and the STT transcript appears unreliable, the NPC may briefly confirm the intended meaning instead of blindly replying to a strange transcript.

产品原则：

- 不评分；
- 不说“你发音错了”；
- 不显示 accuracy / fluency / pronunciation score；
- 不把用户拉出聊天；
- 不生成 Voice Advice card；
- 不进入 Review Card；
- 不保存音频；
- 不要求 Azure 或其他 pronunciation API；
- 只在 transcript 明显异常时触发；
- NPC 最多轻轻确认一次，不循环追问；
- 用户回答后继续正常聊天；
- 保持 NPC 个性，不要变成 STT 错误处理机器人。

可能触发条件（未来设计，不是已实现）：

- STT transcript 极短，但用户音频不短；
- transcript 出现明显乱码；
- transcript 混入异常语言；
- transcript 在当前上下文中语义非常不连贯；
- transcript 包含明显断裂、重复、奇怪开头；
- 如果 NPC 直接回复该 transcript，会显得很怪。

与现有功能的关系：

- 与 STT 的关系：不替代 STT，只是在转写明显可疑时自然处理不确定性；
- 与 Expression Hints 的关系：Expression Hints 回答“这句话怎么说更自然？”，这里回答“我刚才是不是没听清你的意思？”；
- 与 Guided Scenarios 的关系：也可以用，但要更克制，只做轻量确认，不把场景推进成纠错模式；
- 与 Review Cards 的关系：不进入 Review Card，除非用户后续明确说出正确句子。

Implementation sketch（未来）：

- 保留语音消息的 source metadata，例如 `source: "voice"`；
- STT route 或 chat page 提供轻量 transcript reliability hints；
- `/api/chat` 可未来接收 `inputSource: "voice"`、`transcriptReliability?: "normal" | "suspicious"`、`originalTranscript?: string`；
- NPC system prompt 增加一条 conversation repair rule；
- 如果 transcript suspicious，NPC 先自然确认，再继续普通聊天；
- 这是 future design，不新增 schema，不改 memory，不改 Review Card，不接 UI。

---

## 6. Long-term Explorations / 长期探索

### 6.1 More natural reuse / 轻量复用机制

当前暂不做独立首页 One Takeaway，也不把表达硬塞回输入框。长期保留更宽泛方向：

> 更系统但不沉重的表达复用。

原则：

- 重点是帮助用户“再次开口”；
- 不是背单词系统；
- 不是 Anki；
- 不是复习任务；
- 不把收藏内容硬塞进聊天框。

可能形式：

- Review Card 质量更好；
- Saved Items 更易找；
- 在生成回顾时给一句“下次可以试着这样说”；
- 在 topic ideas 中自然复用用户曾经学过的表达；
- 继续聊天时轻轻提示“上次你聊过这个话题”。

### 6.2 Voice advice / 语音建议

当前状态：

- 已支持语音输入；
- 已支持回听自己的语音；
- Expression Hints 目前主要基于 STT 后的文字，能处理自然表达，但不能真实判断发音 / 停顿 / 音高。
- Voice Advice 已做过 Azure Pronunciation Assessment spike；本地可触发真实评估，但 `ja-JP` 测试结果主要只有 aggregate score / recognizedText，缺少足够稳定的词级细节，暂不作为产品功能开放。
- STT Mishearing Confirmation / Conversation Repair 是另一条方向：它属于 NPC 的对话修复行为，不是 Voice Advice。

**Listen-and-repeat 重新定义（低优先级 future candidate）**：
- 不做自由语音评分；
- 不假装提供老师级 pronunciation advice；
- Azure Pronunciation Assessment spike 已证明自由短句下细粒度反馈不可靠；
- 如果未来做，可以只做低压力 listen-and-repeat：
  - 听推荐表达；
  - 用户跟读；
  - 回听自己的录音；
  - 不评分；
  - 不给细粒度错误定位；
  - 只用于 Expression Hints / Saved Expressions / Review Card expressions / Scenario sample lines。

长期阶段：

- V0：用户能回听自己说的话；
- V1：STT 后给文字层面的自然表达建议；
- V2：基于原始音频，只给 1 条温和语音建议（仅在找到可靠音频评估路径后再评估产品化）；
- V3：可选单句跟读；
- V4：更细 pitch accent / 发音支持。

边界：

- 不打分；
- 不红叉；
- 不排名；
- 不说“发音错误很多”；
- 每次只给一个温和、可执行的小建议；
- 先确认可理解性，再给建议。

近期暂缓，不作为当前 sprint。

### 6.3 Magical Realism NPC Candidate / 有趣型 NPC

**记录为 future NPC expansion candidate，不要写成近期必做。**

**判断**：
- 现有 6 NPC 已覆盖主要生活 / 校园 / 朋友 / 支援关系场景；
- 后续如果继续加 NPC，可以开始把 "interestingness / curiosity" 作为指标之一；
- 但不能直接使用 Hogwarts / Harry Potter 等强 IP；
- 可以做原创 Kotomachi magical realism 方向，例如：
  - 雨天街角旧书店；
  - 夜晚图书室；
  - 神秘杂货店；
  - 星見書房；
  - 养着猫头鹰的稍微神秘但温和的店主 / 图书管理员。

---

## 7. Failure-friendly Experience / 失败也不尴尬

Kotomachi 需要关注这些状态：

- 用户不知道说什么；
- 用户只输入很短一句；
- 用户中 / 英 / 日混杂；
- STT 识别奇怪；
- 用户聊两句就停；
- AI 建议太像老师；
- Review Card 因内容太少显得尴尬；
- topic ideas 给得太泛；
- welcome 或 NPC 过于主动导致压力。

原则：这些情况都不应让用户感觉“失败”。

可以使用的产品语气：

- “说一句也可以”；
- “不知道怎么接时，可以从这里开始”；
- “这次先带走一句就好”；
- “短短聊几句也可以”。

避免：

- 打分；
- 红叉；
- 学习失败提示；
- 强提醒；
- 催促用户继续；
- 让用户觉得自己说得太少所以不配生成内容。

---

## 8. Portfolio / Demo Path / 作品集展示路径

未来对外展示 Kotomachi 时，不展示所有功能，而展示一条 30-60 秒能看懂的黄金路径：

1. 打开首页，进入语言街区；
2. 选择一个 NPC；
3. 用户用中文 / 混合语言低压力开口；
4. NPC 用自然日语接话；
5. 用户点 Expression Hints，看更自然表达；
6. 用户点 `+ -> 找话题`，获得上下文接话；
7. 播放 NPC 语音或回听自己的语音；
8. 查一个词；
9. 聊完生成 Review Card，带走一句自然表达或一个小复盘。

重点讲清：Kotomachi 不是纠错机，而是低压力开口、自然接话、按需辅助、关系语境、可回顾积累的 AI-native speaking practice prototype。

---

## 9. Not Doing / 不走的方向

Kotomachi 不走这些方向：

- 陪伴 AI；
- 恋爱 / 二次元角色聊天；
- 角色收集游戏；
- 课程 / 题库；
- 发音评分 / 排行榜 / 打卡；
- 大型账号系统 / 商业后台；
- heavy RAG；
- Live2D / WebRTC；
- 过度剧情化世界观；
- 过度游戏化；
- 把低压力练习变成任务压力；
- 登录 / 数据库；
- 复杂长期记忆；
- 大规模 NPC expansion；
- 显性课程系统；
- 任务系统；
- One Takeaway 首页模块；
- 语音评分 / 发音打分。

---

## 10. Evaluation Focus / 当前评估重点

- 主聊天是否保持自然日语，不主动纠错；
- 表达提示是否有用，但不变成批改作业；
- 查词是否简洁、准确、有上下文；
- Review Cards 是否能在短对话后给出不尴尬的小复盘；
- Topic ideas 是否能帮助用户继续说，而不是给泛泛话题；
- Welcome 是否自然、有边界、不刷屏；
- 6 个 NPC 是否保持各自关系语境和 register；
- 移动端 / PWA 是否足够稳定用于使用。

---

## 11. README 的关系

README 面向外部读者，写简洁的产品说明。
这个文件负责更完整的阶段判断、已完成清单和维护节奏。
两者要一致，但层级不同，不要互相打架。
