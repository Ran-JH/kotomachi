# Kotomachi 首页架构规范

## 1. 当前状态

Kotomachi 首页已经从早期“热区地图 + 点击建筑”方案，切换到 **hybrid homepage v1**。  
现在首页的目标不是做一张大图卡片，也不是恢复老热区交互，而是把街区氛围、入口和继续会话整合成一个清楚的 landing canvas。

当前首页由以下几个部分组成：

- **Hero atmosphere layer**：雨后街区风格的横向 hero 图，只承担氛围，不承担热区交互；
- **SceneEntrySection**：当前聊天入口，按场景 / NPC 结构化展示；
- **ContinueSection**：继续最近一次聊天；
- **InspirationSection**：Today Inspiration / starter prefill；
- **Legacy heat-zone interaction**：已退役，不应再作为主入口出现。

---

## 2. 设计目标

首页应该让人感觉像进入一个安静的街区场景，而不是进入 dashboard、poster gallery，或者 mobile mockup。

核心目标：

1. 保留街区气氛；
2. 让真正的入口清楚可见；
3. 让用户能立刻知道“去哪里聊”；
4. 给后续新增 NPC 留出扩展空间；
5. 在 desktop 和 mobile 上都保持自然。

---

## 3. 页面结构

### 3.1 Desktop

推荐结构：

```txt
Page root: full width

Top landing area:
  hero image as atmosphere background
  brand “言街 Kotomachi” in the same visual canvas
  language toggle on the right
  optional subtitle / atmosphere line
  SceneEntrySection attached to the hero bottom

Below:
  ContinueSection
  InspirationSection
```

要求：

- 不要把整个页面包进窄的 mobile shell；
- hero 不要像单独的图片卡片；
- SceneEntrySection 要和 hero 视觉连在一起；
- Continue / Inspiration 使用同一套内容宽度系统。

### 3.2 Mobile

Mobile 要更简洁：

- 标题和 language toggle 不重叠；
- hero 不占满整个首屏；
- SceneEntry 仍然清楚；
- Continue / Inspiration 仍然可读；
- 不允许页面横向溢出；
- 只有 NPC rail 在需要时才允许横向滚动。

---

## 4. 组件职责

### HomeHeader

- brand
- subtitle
- language toggle
- help / install guidance 的入口（如果有）

### HomeHero

- 只负责氛围图
- 不承担点击热区
- 不恢复旧 hover card

### SceneEntrySection

- 当前主入口
- NPC card / 场景卡
- 用于进入聊天

### ContinueSection

- 最近聊天入口
- 只负责继续会话

### InspirationSection

- 今日灵感 / starter prefill
- 只负责低压力开口，不自动发送

---

## 5. 交互原则

- hero 不可点击；
- 不恢复旧热区；
- 不恢复 hover card；
- SceneEntry 卡片点击进入对应聊天；
- Continue 卡片点击进入最近聊天；
- Inspiration 点击只填入 starter，不自动发送；
- 视觉层级要明确：hero 是氛围，SceneEntry 才是入口。

---

## 6. 移动端注意事项

- hero 高度要适中；
- brand 和 toggle 要能正常阅读；
- SceneEntry 的卡片不要逼成过窄 3 列；
- 如需横向 rail，只让 NPC 区域滚动；
- 不要让整页横向溢出；
- 不要用粗暴的固定偏移去“硬推”手机端布局。

---

## 7. 不应该出现的东西

- old heat-zone interaction；
- 可点击的 hero；
- 头图变成单独图片卡；
- 局部大阴影造成 dashboard 感；
- 把首页做成 mobile shell 的 desktop 版本；
- 用过多空白把入口推得太远。

---

## 8. 迭代约束

- 新增 NPC 时，优先补数据和入口，不要重做大图；
- 新增场景时，优先作为结构化入口，不要恢复复杂热区；
- 首页变化优先服务“低压力开口”与“继续聊天”。

