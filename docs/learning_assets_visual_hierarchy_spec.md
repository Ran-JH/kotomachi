# Kotomachi / 言街 — Learning Assets Visual Hierarchy Spec

> 用途：统一 Saved Words、Saved Expressions、Review Cards 三类学习资产卡片的视觉层级、颜色语义和信息组织方式。
> 目标不是重做 UI，而是在现有设计基础上让学习资产层更清晰、更可扫读、更符合 Kotomachi 的低压力气质。

---

## 1. Design Foundation

Kotomachi 的整体视觉基调来自早期 `DESIGN_BRIEF.md`：

* 安静
* 日常
* 呼吸感
* 零压力
* 米白纸张感
* 深绿主色
* 琥珀轻强调
* 暖灰过渡
* 极轻阴影
* 宽松留白

Learning Assets 层也应延续这套气质。

Saved Words、Saved Expressions、Review Cards 不应像后台管理页，也不应像 Anki / 学习 KPI 面板。它们更像用户从真实对话中带走的小纸片：可以回看、可以复习、可以慢慢积累。

---

## 2. Core Product Principle

三类学习资产的共同目标是：

> 用户回来看时，能立刻知道：我当时学到了什么、它来自哪里、下次我能不能再用。

因此 UI 优先级不是“展示所有字段”，而是：

1. 先让用户看见学习对象本身；
2. 再让用户理解它的上下文；
3. 最后提供状态、来源、备注、删除等管理操作。

---

## 3. Shared Visual Tokens

继续沿用 Kotomachi 基础视觉 token。

### Base

* `background`: `#F3EDE0`
* `foreground`: `#28231A`
* `card`: `#FAF6EE`
* `primary`: `#2D4A1F`
* `accent`: `#C9A84C`
* `secondary`: `#E8E0CE`
* `muted`: `#D8CFBC`
* `muted-fg`: `#7A7060`
* `input-bg`: `#EDE7D8`
* `sidebar`: `#1E2A16`
* `sidebar-fg`: `#D4C8A8`

### Style

* 卡片背景：暖白 / 米白，不用纯白。
* 文字主色：深棕黑或深绿。
* 阴影：极轻，不做浮夸卡片。
* 圆角：以 `rounded-xl` 为基础。
* 边框：浅暖灰边框，低对比。
* 留白：宁可宽松，不要压缩成后台列表。

---

## 4. Information Hierarchy

三类学习资产统一分为四层信息。

### Level 1 — Learning Object

用户最应该先看的内容。

Examples:

* Saved Word: 单词 / 短语本身
* Saved Expression: 推荐表达
* Review Card: 回顾卡标题

Visual:

* 最大字号
* 深绿或深色
* 不放进复杂背景块
* 不被 chips、来源、删除按钮抢走注意力

---

### Level 2 — Core Learning Context

帮助用户理解“为什么收藏它”。

Examples:

* Saved Word:

  * 基本意思
  * 这句里的意思
  * 出处原句

* Saved Expression:

  * 原句
  * 学习点
  * 使用场景
  * 需要先调整的地方
  * 这一档的表达差异
  * 表达结构

* Review Card:

  * 今天聊了什么
  * 可直接复用的表达
  * 下次可以这样说
  * 今日词语
  * 下次可以聊

Visual:

* 使用浅米色内容块
* 不要所有块同等强调
* 只允许一个主要学习块最突出
* 说明文字应比主标题弱

---

### Level 3 — Status / Type / Attribute Chips

Chips 用于快速扫读，不应只是装饰。

统一顺序：

1. 状态类 chip
2. 类型类 chip
3. 属性类 chip

---

### Level 4 — Management Metadata

管理信息放在最弱层级。

Examples:

* 来源 NPC
* 保存时间
* 上次看过
* 删除
* 笔记
* 保存于
* 来源类型

Visual:

* 小字号
* muted color
* 放在卡片底部或详情页末尾
* 不抢学习内容的主视觉

---

## 5. Chip Semantics

Chips 分三类，颜色和视觉权重要稳定。

---

### A. Status Chips

回答：

> 我对这个学习资产处理到什么程度了？

Examples:

* 未复习
* 已复习 1 次
* 已复习 3 次
* 已掌握
* 待复习

Visual:

* 最明显的 chip 类型
* 浅绿底 + 深绿字
* 用于快速扫读
* 可放在靠前位置

---

### B. Type Chips

回答：

> 这是什么学习资产？

Examples:

* 词语
* 表达
* 回顾卡
* 改写
* 下次话题

Visual:

* 中性浅米色 / 暖灰底
* 不要比状态 chip 更抢眼
* 作为分类提示

---

### C. Attribute Chips

回答：

> 它有什么附加属性？

Examples:

* 亲近随和
* 普通自然
* 礼貌得体
* カジュアル
* 表达结构
* 来自对话
* 来自表达提示

Visual:

* 最轻的一类 chip
* 可以使用淡背景或 outline-like 风格
* 不应制造强视觉噪音

---

## 6. Saved Words Card Rules

### List Card

Saved Word list card should show:

1. word / phrase
2. reading
3. status chip
4. basic meaning
5. source sentence or sentence meaning
6. chips row
7. delete action in a weak corner position

List card should not show every detail. It should help users decide whether to open the detail.

### Detail Page

Saved Word detail page should show:

1. word / phrase as primary title
2. status chips near title
3. reading
4. basic meaning
5. meaning in this sentence
6. detailed explanation
7. source sentence
8. user note
9. source NPC and saved time

Priority:

* “这句里的意思” should be visually closer to the top than pure metadata.
* Source / saved time should stay low priority.

---

## 7. Saved Expressions Card Rules

Saved Expression has the heaviest information density, so it needs stronger hierarchy.

### List Card

Saved Expression list card should show:

1. suggested expression as main title
2. original expression as a smaller context block
3. one learning point or short explanation
4. chips row:

   * review status
   * expression type
   * tone/register
   * structure attribute if available
5. delete action in weak corner position

Avoid making the list card as detailed as the full detail page.

### Detail Page

Saved Expression detail page should show:

1. suggested expression as large title
2. top chips:

   * review status
   * tone/register
   * expression type
   * structure attribute if available
3. original expression
4. usage / 使用场景
5. explanation / 学习点
6. shared revision notes / 需要先调整的地方
7. level-specific revision notes / 这一档的表达差异
8. structure note / 表达结构
9. user note
10. source NPC, saved time, source type

Priority:

* Suggested expression is the main asset.
* Original expression and learning point are second priority.
* Revision details and structure note are detailed learning support.
* Metadata stays last.

---

## 8. Review Card Rules

Review Card is not a review queue item. It is a conversation completion record.

It should not have:

* 已掌握
* 待复习
* reviewCount
* score
* rating
* performance grade

### List Card

Review Card list card should show:

1. NPC + date
2. title
3. short summary
4. asset chips:

   * `${count} 个表达`
   * `${count} 个词语`
   * `${count} 个改写`
   * `下次话题`

These chips should look like Saved Items chips, not plain text.

### Detail Page

Review Card detail page should show:

1. return list + close
2. NPC + date + 回顾卡片 / ふりかえり
3. title
4. asset chips
5. 今天聊了什么
6. 可直接复用的表达
7. 下次可以这样说
8. 今日词语
9. 下次可以聊
10. delete action at bottom

Review Card should feel like a warm closing page, not a report.

---

## 9. List vs Detail Rule

List cards and detail pages must not have the same information density.

### List cards

Purpose:

* scan
* choose
* remember enough context

Should show:

* title
* one short context line
* chips
* weak delete action

Should avoid:

* long explanations
* multiple nested blocks
* full revision notes
* too many colors

### Detail pages

Purpose:

* review
* understand
* reuse

Can show:

* full context
* full learning notes
* user notes
* source
* metadata

But detail pages should still have hierarchy. Do not make every section visually equal.

---

## 10. Color Discipline

Do not reduce color count blindly. Instead, assign responsibility.

Recommended hierarchy:

1. Primary dark green:

   * main titles
   * recommended expression
   * strongest learning object

2. Soft green chips:

   * review status
   * mastered / unreviewed state

3. Warm beige chips:

   * type chips
   * neutral metadata

4. Muted gray-brown:

   * source
   * saved time
   * secondary helper text

5. Amber accent:

   * rare emphasis
   * active selection
   * structural highlight
   * not every chip

Avoid:

* too many chips using equally strong green
* chips with no semantic difference
* large blocks competing with main title
* delete button visually competing with learning content

---

## 11. Interaction Rules

* Delete remains weak and non-primary.
* Mark mastered / save note can remain visible in detail page.
* Review Card does not receive mastered/review status.
* Saved Words and Saved Expressions remain the only reviewable assets.
* Lookup and selectable text behavior should not be changed in this visual polish pass.

---

## 12. Scope Boundary for Implementation

This spec allows:

* visual hierarchy polish
* chip styling unification
* section spacing cleanup
* list/detail information hierarchy cleanup
* labels copy consistency

This spec does not allow:

* schema changes
* new review algorithms
* new filters
* new persistence keys
* API prompt changes
* generated content changes
* Review Card review status
* scoring or grading
* large component rewrite

The goal is to make the existing learning asset layer feel more ordered, not heavier.
