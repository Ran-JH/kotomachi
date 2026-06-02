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

### 1.4 语音与移动端

- [x] TTS playback
- [x] STT input
- [x] Audio playback hardening（进行中的稳定性收口）
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
5. 让小范围 beta 能持续进入文档与小修循环。

---

## 3. 近期优先级

### Audio playback hardening

- [ ] 防止重复点击造成并发播放
- [ ] 处理 loading / playing 状态
- [ ] 避免多路 audio 叠加
- [ ] 处理 `audio.play()` reject
- [ ] 新音频播放前清理旧音频

说明：这是一个稳定性任务，不是大功能重写。

---

## 4. 维护节奏

- 每周 2–3 个小改动块
- 优先修 beta feedback 里重复出现的问题
- 没有明显 bug 时，再补可复用的场景/NPC 内容
- 不再做无计划的大 UI 重构
- 每隔一段时间同步 README / experience log / QA checklist

---

## 5. NPC 扩展方向

后续扩展不应只看“角色数量”，而是要保证每个 NPC 都有完整场景：

1. 场景
2. 用户为什么会和 TA 说话
3. initial welcome 风格
4. 话题发动机
5. 学习价值
6. 低压力边界

推荐扩展顺序仍然是：

1. 新 NPC：兼职饮食店店员 / 店长
2. 书店店员 / 图书馆前辈
3. 同学
4. 导师
5. 实习上司 / 同事
6. 隐藏体验型 NPC

---

## 6. 长期方向

这些方向保留，但不作为当前目标：

- Audio-based speaking feedback
- Shadowing / 跟读对比
- 学校 / 工作 / 旅行场景
- 隐藏 NPC / 轻探索
- 半自定义 NPC 模板
- 国内访问 / 部署方案
- 更系统的复习机制

说明：

- 语音表达反馈是长期方向，不是当前已经完成能力；
- 现在的 Expression Hints 仍然基于 STT 后文本，只处理文字层面的自然表达；
- 如果未来做语音反馈，必须基于原始音频，并保持低压力。

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

