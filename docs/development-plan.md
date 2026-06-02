# Kotomachi / 言街 后续开发计划

> 用途：记录当前产品阶段、已完成里程碑、近期优先级，以及公开的 roadmap / maintenance 口径。  
> 原则：历史要保留，但表达要压缩；已经完成的内容用勾选标记，不要删掉。

---

## 0. 当前阶段判断

Kotomachi 已经从早期 demo 进入 **MVP v1 可用阶段**。当前状态是：

- [x] 可以运行
- [x] 可以自用
- [x] 可以给少量朋友测试
- [x] 核心学习闭环已经打通
- [x] 后续重点从“大功能冲刺”转向“稳定维护 + 小步内容扩展”

这不是正式商业上线状态，也不是 App Store / Play Store 产品。

---

## 1. 已完成的核心能力

> 下面不是“删掉历史再重写”，而是把已经做完的内容压缩收纳到同一份清单里，方便后续继续维护。

### 1.1 首页与入口

- [x] Hybrid homepage v1
- [x] 雨后街区 hero 氛围层
- [x] SceneEntrySection：结构化 NPC / 场景入口
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
- [x] Audio playback hardening（已完成）
- [x] PWA mobile self-use support
- [x] Mobile / desktop responsive polish
- [x] Mobile beta usability fixes

### 1.5 世界观与连续性

- [x] NPC life arc system
- [x] Shared world state
- [x] Memory / familiarity 的轻量 LocalStorage 机制

---

## 2. 现在的主要目标

当前优先级不是继续堆功能，而是：

1. 让现有体验更稳定；
2. 继续修小问题；
3. 保持低压力产品边界；
4. 补充可复用的内容资产；
5. 让小范围 beta 能持续进入文档与小修循环；
6. 新功能只在能增强“短对话 × 多场景 × 可回顾 × 可复用”时再做。

---

## 3. 近期 / 中期 roadmap

### 3.1 Homepage One Takeaway

- [ ] 首页增加轻量 One Takeaway 区块，基于已有 Review Cards / Saved Items，不另起系统
- [ ] 数据来源优先级：最近一张 Review Card 的 reusable expression > 最近收藏的 Saved Expression > Today Inspiration / starter prompt
- [ ] 提供轻操作：`带到输入框` / `换一句` / `先不管`

说明：只提醒用户“上次可以带走的一句话”，不打断聊天，不做打卡，不做分数，不制造学习压力。

### 3.2 Saved Item Reuse

- [ ] Saved Items 后续可作为下一次开口材料
- [ ] 先优先结合 One Takeaway，在首页或 Continue last chat 附近轻量展示
- [ ] 暂不在聊天中强行推荐收藏表达，避免破坏自然语境

### 3.3 NPC Spec Template

- [ ] 新增 NPC 前必须先写 NPC spec，再补名字、头像和 prompt
- [ ] 每个 NPC 至少包含：NPC id / display name / location、核心场景、用户为什么会和 TA 说话、主要训练表达、语域、initial welcome style、revisit welcome style、topic engine / starter prompt categories、life arc / current state、cross mentions、low-pressure boundary、forbidden behaviors、sample user intents、sample good replies、sample bad replies
- [ ] 新增顺序继续按“兼职饮食店店员 / 店长 → 书店店员 / 图书馆前辈 → 同学 → 导师 → 实习上司 / 同事 → 隐藏原创魔法系 NPC”推进
- [ ] 隐藏魔法系 NPC 必须是原创设定，氛围可以借鉴猫头鹰、街角巫师、古书店等元素，但不要直接使用受版权保护 IP

### 3.4 Feedback Button

- [ ] 测试人数增加后，再考虑极简 Feedback Button
- [ ] 问题只保留少量轻量项：哪里卡住了、NPC 有没有太像老师、有没有一句你觉得有用、还会不会再打开、希望增加什么场景
- [ ] 初期可以用外部表单或简单记录，不急着做复杂后台

### 3.5 Learning Preference

- [ ] 中长期再引入轻量学习偏好
- [ ] 偏好可影响 starter prompts、Review Cards 侧重点和后续 NPC 推荐
- [ ] 可选项保持少量：日常闲聊 / 旅行 / 学校 / 打工 / 职场 / 敬语 / 自由聊天
- [ ] 不做复杂画像系统，不让用户一进入就填长表

---

## 4. 维护节奏

- 每周 2–3 个小改动块
- 优先修 beta feedback 里重复出现的问题
- 没有明显 bug 时，再补可复用的场景/NPC 内容
- 不再做无计划的大 UI 重构
- 每隔一段时间同步 README / experience log / QA checklist

---

## 5. NPC 扩展方向

后续扩展不应只看“角色数量”，而是要保证每个 NPC 都有完整场景。新增 NPC 前先写 spec，避免只加名字、头像和 prompt。

### 5.1 NPC spec 模板（新增 NPC 前必须先写）

每个 NPC 至少包含：

1. NPC id / display name / location
2. 核心场景
3. 用户为什么会和 TA 说话
4. 主要训练表达
5. 语域：タメ口 / 丁寧語 / 敬語 / workplace polite 等
6. initial welcome style
7. revisit welcome style
8. topic engine / starter prompt categories
9. life arc / current state
10. cross mentions
11. low-pressure boundary
12. forbidden behaviors
13. sample user intents
14. sample good replies
15. sample bad replies

推荐扩展顺序仍然是：

1. 新 NPC：兼职饮食店店员 / 店长
2. 书店店员 / 图书馆前辈
3. 同学
4. 导师
5. 实习上司 / 同事
6. 隐藏原创魔法系 NPC

---

## 6. 长期方向

这些方向保留，但不作为当前目标：

- Audio-based speaking feedback
  - V0：回听自己的语音，已完成
  - V1：手动点击“语音建议”
  - V2：基于原始音频给 1 条温和反馈
  - V3：可选单句跟读实验
  - V4：更细的 pitch accent / 发音支持
- Shadowing / 跟读对比（仅作为可选单句实验，不把 Kotomachi 做成专门的发音训练器）
- 学校 / 工作 / 旅行场景
- 隐藏 NPC / 轻探索
- 半自定义 NPC 模板
- 国内访问 / 部署方案
- 更系统的复习机制

说明：

- 语音表达反馈是长期方向，不是当前已经完成能力；
- 现在的 Expression Hints 仍然基于 STT 后文本，只处理文字层面的自然表达；
- 如果未来做语音反馈，必须基于原始音频，并保持低压力；
- 每次只给一个小建议，不打分、不红叉、不考试化。

---

## 7. 已知限制

- [x] 中国大陆访问 Vercel 可能需要 VPN
- [x] Vercel / PWA / Edge 图标缓存行为复杂
- [x] 当前语音建议还不是发音 / 口音反馈
- [x] 当前 NPC 数量有限，后续通过低频内容更新扩展
- [x] 当前没有账号系统，数据依赖浏览器本地 LocalStorage
- [x] 移动端已经可用，但仍会继续跟 beta feedback 调整

---

## 8. 对外口径

如果需要对外描述当前项目，建议用这套说法：

- Kotomachi / 言街 是一个独立设计并开发的 AI-native 日语口语练习产品；
- 核心围绕低压力开口、真实对话场景和学习资产沉淀；
- 当前已经支持 PWA mobile self-use 和小范围 beta；
- 项目仍处于稳定维护和内容扩展阶段。

---

## 9. README 的关系

README 面向外部读者，写简洁的产品说明。  
这个文件负责更完整的阶段判断、已完成清单和维护节奏。  
两者要一致，但层级不同，不要互相打架。
