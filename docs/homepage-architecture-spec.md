# Kotomachi 首页新架构 Spec v0.1

## 1. 背景

### 1.1 当前实现方式

Kotomachi 当前首页使用：
- AI 生成一张包含 3 个建筑的街景图
- 手动抠图拆分为独立建筑 PNG
- SVG 热区覆盖 + 图片叠加实现 hover 效果
- 点击热区进入对应 NPC 聊天

### 1.2 当前方案问题

- 只适合 3 NPC 原型
- 扩展新建筑和新 NPC 成本高
- AI 扩图难以保持一致风格
- 手机端 hover 不稳定
- 入口依赖图片结构，而不是数据结构
- 未来生活/留学/工作等场景难以承载

---

## 2. 新架构目标

采用**方案 C**：
- 街景图保留为氛围层
- 真实入口改成场景/NPC 结构化卡片
- 不再把街景热区作为唯一主导航
- 后续新增 NPC 是加数据和卡片，不是重做大图

**核心句：**  
Kotomachi 首页不应继续依赖“AI 街景图 + 手动热区”作为长期入口。新的首页应该保留街区氛围，但把真正导航交给结构化场景和 NPC 模块。

---

## 3. 产品原则

### 3.1 保留街区感，但不被街区图绑死

首页仍要有“言街”的小街区氛围，但街景图不再承担复杂点击热区。

### 3.2 真实入口结构化

入口应该是：
- 日常生活
- 留学生活
- 工作场景

每个场景下挂 NPC。

### 3.3 Mobile-first

Mobile 不依赖 hover，卡片是主要入口。

### 3.4 低压力入口

首页文案不要像任务面板，而应像：  
“今天想去哪儿坐坐、和谁聊两句？”

---

## 4. 信息架构

清晰层级：

1. **氛围层**：街区封面 / 世界观入口
2. **入口层**：场景卡片 / NPC 卡片
3. **延续层**：最近聊天 / 回顾入口
4. **轻引导层**：今日灵感 / 低压力开口提示

---

## 5. 页面结构

### 5.1 Desktop Layout

建议结构：

```
Header
  左侧：言街 Kotomachi + subtitle
  右侧：语言切换 + Help

Hero / 街区氛围图
  当前街景插画
  不再作为主要点击热区
  可保留轻量 hover / 氛围说明，但不是核心入口

Main Entry
  标题：今天想去哪儿聊？
  场景卡片组：
    日常生活
      木村｜便利店
      美咲｜咖啡店
      大将｜居酒屋
    留学生活
      室友
      同学
      老师 / TA
    工作场景
      前辈
      同事
      上司

Continue
  继续上次聊天
  最近 1–3 条会话入口

Inspiration
  今日灵感
  2–3 条低压力话题 chip
```

### 5.2 Mobile Layout

建议结构：

```
Top Bar
  menu / optional
  言街 Kotomachi
  语言切换

Hero Banner
  横向街景缩略图
  高度控制，不占满首屏

Scene Cards
  日常生活 card
  留学生活 card
  工作场景 card

Continue
  最近聊天列表

Inspiration
  今日灵感 chips
```

说明：mobile 不依赖建筑 hover，场景卡片才是主入口。

---

## 6. MVP 范围

### Phase 1：只重构当前 3 NPC 入口

不要马上新增留学/工作 NPC。  
先只显示：
- 街区氛围图
- 今天想去哪儿聊？
- 日常生活
  - 木村｜便利店
  - 美咲｜咖啡店
  - 大将｜居酒屋
- 继续上次聊天
- 今日灵感

留学生活和工作场景可以先不展示，避免用户误点空场景。

### Phase 2：加入场景分组

未来再展示：
- 日常生活
- 留学生活
- 工作场景

### Phase 3：场景详情页，可选

当 NPC 数量很多时，再考虑：
- /scenes/daily
- /scenes/study-abroad
- /scenes/work

当前 MVP 不需要。

---

## 7. 数据模型

建议新增：`lib/home-scenes.ts`

示例结构：

```typescript
import type { NpcId } from "./npc";

export type SceneId = "daily" | "study_abroad" | "work";

export type HomeScene = {
  id: SceneId;
  title: {
    zh: string;
    en: string;
  };
  subtitle: {
    zh: string;
    en: string;
  };
  icon?: string;
  npcIds: NpcId[];
  status?: "active" | "coming_soon";
};

export const HOME_SCENES: HomeScene[] = [
  {
    id: "daily",
    title: {
      zh: "日常生活",
      en: "Daily Life",
    },
    subtitle: {
      zh: "在熟悉的小店里练习自然表达。",
      en: "Practice natural expressions in everyday places.",
    },
    npcIds: ["kimura", "misaki", "taisho"],
    status: "active",
  },
];
```

说明：
- NPC 信息仍从现有 NPC 配置读取
- home-scenes 不重复定义 NPC name/kana/avatar
- 新增 NPC 时，只需要在 NPC 配置中新增角色，再加入 HOME_SCENES

---

## 8. 组件设计

建议拆分：

### HomeHeader
- 职责：品牌展示 + 语言切换 + Help

### HomeHero
- 职责：氛围图展示
- 重点：只负责氛围图，不再承担主导航

### SceneEntrySection
- 职责：主入口场景卡片组
- 重点：是新首页的核心导航区

### SceneCard
- 职责：单个场景卡片展示

### NpcMiniCard
- 职责：NPC 入口小卡片
- 重点：点击进入 /chat/[npcId]

### ContinueSection
- 职责：最近聊天入口
- 重点：读取最近聊天

### InspirationSection
- 职责：今日灵感轻引导
- 重点：只做轻引导，不做打卡任务

---

## 9. 视觉设计原则

### 9.1 街景图

从“交互地图”降级为“氛围封面”。

要求：
- 不再需要精确手动热区
- 不要求所有建筑都能 hover
- 可以继续使用当前街景图
- 未来可以替换成更泛化 banner
- 不再因为新增 NPC 而扩建原图

### 9.2 场景卡片

延续：
- 米白背景
- 深绿标题
- 柔和边框
- 圆角
- 温和阴影
- 不像任务卡，不像游戏关卡

### 9.3 NPC Mini Card

建议显示：
- 头像
- 姓名
- 地点 / 身份
- 当前一句轻量状态，可选

不要展示太多信息。

---

## 10. 交互规则

### 10.1 进入聊天

点击 NPC mini card：
- router.push(`/chat/${npcId}`)

### 10.2 场景卡点击

Phase 1 可以不做场景详情页。  
如果有“进入场景”按钮，可以先展开 NPC 列表或进入第一个 NPC，但推荐先不复杂化。

### 10.3 最近聊天

点击最近聊天卡：
- router.push(`/chat/${npcId}`)

### 10.4 今日灵感

Phase 1 可以只展示，不强制绑定 NPC。  
后续再考虑点击后选择 NPC 或带 prompt 进入聊天。

---

## 11. 响应式规则

### Desktop
- Header 固定在顶部视觉区域
- Hero 用 clamp / max-width
- 场景卡片最多 3 列
- 页面不横向溢出

### Mobile
- Header 不重叠
- Hero banner 不占满首屏
- Scene cards 单列
- NPC mini cards 可网格或横向小排列
- 不依赖 hover
- 无横向滚动

---

## 12. 迁移策略

步骤：

**Step 1：新增首页 scene 配置**
新建 `lib/home-scenes.ts`，只包含 daily 场景和当前三个 NPC。

**Step 2：保留现有街景图，但移除对热区导航的依赖**
街景继续显示，真实入口改为 scene/NPC cards。

**Step 3：实现 SceneEntrySection**

**Step 4：实现 ContinueSection**

**Step 5：实现 InspirationSection**

**Step 6：清理旧 hover 热区逻辑**
新入口稳定后，再弱化或删除 SVG heat zone 主导航依赖。

---

## 13. 非目标

本次首页重构不做：
- 新增 NPC
- 新增场景详情页
- 账号系统
- 云同步
- 数据库
- AI prompt
- 复杂地图编辑系统
- 街景扩图
- APK / 原生 app
- chat / explain / feedback / summary API 修改

---

## 14. 验收标准

### Desktop
- 首页仍保留街区氛围图
- 街景图不再是唯一聊天入口
- 页面下方有结构化场景/NPC 入口
- 点击木村/美咲/大将可进入对应聊天
- 标题、语言切换、Help 不重叠
- 页面不横向溢出

### Mobile
- 品牌和语言切换不重叠
- 街景图缩放自然
- 场景卡片单列
- NPC 入口清楚可点
- 不依赖 hover
- PWA 内正常

### 功能回归
- Chat 正常
- STT/TTS 正常
- Expression Hints 正常
- Word Explanation 正常
- Review Cards 正常
- Saved Items 正常
- Topic Ideas 正常
- 不修改 API / prompt / package / env

---

## 15. 推荐实施包

**Pack H0：Homepage architecture doc**  
只新增本文档，不改代码。  
Commit: `docs: add homepage architecture spec`

**Pack H1：Home scene data model**  
新增 lib/home-scenes.ts。  
Commit: `feat: add home scene model`

**Pack H2：Hybrid homepage layout**  
实现 header / hero / scene entry section。  
Commit: `feat: add hybrid homepage layout`

**Pack H3：Recent chats and inspiration**  
增加继续上次聊天和今日灵感。  
Commit: `feat: add home continue and inspiration sections`

**Pack H4：Retire heat-zone dependency**  
稳定后弱化或删除旧 SVG heat zone 主导航依赖。  
Commit: `refactor: retire home heat zone navigation`

---

## 16. 一句话设计结论

Kotomachi 首页不应继续依赖“AI 街景图 + 手动热区”作为长期入口。新的首页应该保留街区氛围，但把真正的导航交给结构化场景和 NPC 模块。这样既保留“言街”的世界感，也让未来扩展生活、留学、工作场景变得可控。
