# Kotomachi / 言街 后续开发计划

> 用途：记录当前产品阶段、已完成里程碑、近期优先级，以及公开的 roadmap / maintenance 口径。  
> 原则：历史要保留，但表达要压缩；已经完成的内容用勾选标记，不要删掉。

---

## 0. Current Status / 当前阶段

Kotomachi 当前处于 **MVP v1.x + 5 NPC + conversation rhythm v0 baseline + ongoing polish** 阶段。

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
- [x] ContinueSection：继续上次聊天
- [x] InspirationSection：今日灵感 / starter prefill
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

- [x] 5 NPC：Misaki / Kimura / Taisho / Haruka / Aoi
- [x] NPC life arc system
- [x] Shared world state
- [x] Cross mentions
- [x] Memory / familiarity 的轻量 LocalStorage 机制
- [x] Avatar style spec v1：scene-object badge / 物件徽章方向
- [x] 5 NPC baseline complete：
  - Misaki / 美咲：咖啡馆，轻丁寧，安静闲聊；
  - Kimura / 木村：便利店，随意口语，年轻熟人感；
  - Taisho / 大将：居酒屋，熟客口语，年长者寒暄；
  - Haruka / 遥：研究室 / 校园，轻丁寧，前辈请教；
  - Aoi / 葵：学生ラウンジ / サークル仲間，タメ口，同级朋友；
- [x] 当前已覆盖日常、校园、朋友、前辈请教、下班后等核心关系语境场景。

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
  - 5 个 NPC 均已有对应场景类型：
    - Kimura：便利店场景（便当结账、找商品、点关东煮、问支付方式、问打折、买热柜小食）；
    - Misaki：咖啡馆场景（点咖啡、问咖啡推荐、点甜点、找座位）；
    - Taisho：居酒屋场景（第一次进店、先点一杯、不喝酒时怎么说、问今日推荐、点一份小菜、追加点单、今天有点累、结账）；
    - Haruka：校园/研究室场景（第一次进研究室、请前辈帮忙看一下、文献看不懂、ゼミ里简单发言、发表前有点紧张、课后确认没听懂）；
    - Aoi：同龄朋友 small talk 场景（问最近喜欢什么、接住朋友推荐、加入不熟的话题、说想放空一下、问下课后安排、委婉说下次吧）；
  - 功能型小店 NPC 覆盖便利店/咖啡馆/居酒屋；
  - Haruka 覆盖校园/研究室轻请教；
  - Aoi 覆盖同龄朋友 small talk moves；
  - activeScene 是临时软上下文，不写入 localStorage；
  - 场景中 `+` 菜单从"找话题"变成"下一句怎么说"；
  - 退出场景有 UI-only divider，不进入 chat/topic ideas/session summary/TTS/Review Card；
  - 不做课程、不做任务、不做评分、不做通关。

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

## 3. Current NPC Coverage / 当前 NPC 覆盖

| NPC | Scene | Relationship / register | Main value | Main risk |
| --- | --- | --- | --- | --- |
| Misaki / 美咲 | 咖啡馆 | 轻丁寧，安静熟客感 | 安静闲聊、咖啡馆表达、休息与情绪描述 | 心理咨询腔、过度温柔 |
| Kimura / 木村 | 便利店 | 随意口语，年轻熟人感 | 便利店、夜勤、生活节奏、轻吐槽 | 太冷、太短、接不住话 |
| Taisho / 大将 | 居酒屋 | 熟客口语，年长者寒暄 | 一天结束、吃喝、疲惫、夜晚闲聊 | 人生导师腔、说教 |
| Haruka / 遥 | 研究室 / 校园 | 轻丁寧，前辈请教 | 研究室、发表、文献、留学前不安 | 老师腔、顾问腔 |
| Aoi / 葵 | 学生ラウンジ / サークル仲間 | タメ口，同级朋友 | 兴趣、放课后、朋友语气、最近推荐 | 太黏、太恋爱、太二次元 |

当前 5 个 NPC 已经足够覆盖一批核心关系语境。近期不继续快速堆 NPC 数量。

---

## 4. Near-term Direction / 近期方向

### 4.1 Product stabilization & polish

近期优先级：

- 继续稳定 5 个 NPC 的真实使用体验；
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
- topic ideas 是否真的能帮助用户接话；
- welcome 是否自然、有边界、不刷屏；
- Review Cards 是否在短对话后仍不尴尬；
- 查词 / 表达提示是否稳定。

### 4.2 Next product expansion candidates

后续候选扩展方向（暂不做）：

- 新 NPC 内容扩展；
- 旅行 / 职场 / 书店 / 图书馆等新场景；
- feedback button；
- lightweight learning preferences；
- voice advice v1；
- relationship-aware expression suggestions；
- possible multilingual template expansion；
- public demo / social sharing polish。

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

长期阶段：

- V0：用户能回听自己说的话；
- V1：STT 后给文字层面的自然表达建议；
- V2：基于原始音频，只给 1 条温和语音建议；
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
- 5 个 NPC 是否保持各自关系语境和 register；
- 移动端 / PWA 是否足够稳定用于使用。

---

## 11. README 的关系

README 面向外部读者，写简洁的产品说明。
这个文件负责更完整的阶段判断、已完成清单和维护节奏。
两者要一致，但层级不同，不要互相打架。
