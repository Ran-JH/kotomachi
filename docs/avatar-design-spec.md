# Kotomachi Avatar Design Spec

## 1. Purpose

Kotomachi 的头像不是装饰，而是产品识别系统的一部分。它们需要在很小的圆形 UI 中同时完成几件事：

1. 让用户一眼识别 NPC。
2. 传达 NPC 的空间、身份和对话气质。
3. 保留 Kotomachi 统一、温柔、低压力的小镇氛围。
4. 适配圆形小尺寸 UI，而不是只在大图下好看。
5. 避免所有 NPC 看起来像同一张暖色桌面的不同静物摆件。

核心原则：

`同一个镇子的不同人，而不是同一个桌面的不同摆件。`

English:

`Different people in the same town, not different objects on the same table.`

## 2. Current Problem

当前头像整体风格统一、完成度也不低，但存在明显的产品识别问题：

- 暖色、木质、室内、桌面静物过多。
- 杯子、书本、小物件重复出现太多。
- 角色所属空间差异不够明显。
- 在 sidebar 和 chat header 这类小圆头像里，NPC 之间识别度不足。
- 图片单张看都不错，但缺少稳定、清晰、可复用的角色锚点。

换句话说，当前问题不是“图不好看”，而是“图太像同一套审美里的近亲”，导致产品层面的辨识功能不足。

## 3. Global Style Rules

所有 Kotomachi NPC 头像应共享以下全局规则：

- circular avatar composition
- no human face
- object-based storytelling
- soft cozy illustration
- gentle realism / slightly painterly
- low-saturation colors
- Kotomachi small-town mood
- clear silhouette at small size
- limited visual noise
- avoid excessive readable text
- avoid poster / logo / product packaging look
- avoid anime character portrait
- avoid generic warm tabletop repetition

补充说明：

- 可以有少量文字线索，例如地图边角、票据、便签或表格上的模糊笔记。
- 但不能依赖文字来识别角色，因为小尺寸下文字不可读，而且 AI 很容易生成错字。
- 头像的识别应该依赖主锚点、空间线索和整体气质，而不是依赖可读文案。

## 4. Three-Layer Avatar Model

每张头像都应同时提供三层信息。

### 4.1 Identity Anchor

每个 NPC 必须至少有：

- 1 个主锚点
- 1 个辅助锚点

示例：

- Kimura：便利店便当 / 购物袋
- Misaki：咖啡杯 / 手冲器具
- Taisho：酒杯 / 灯笼
- Haruka：论文 / 研究笔记
- Aoi：耳机 / 学生 lounge 笔记本
- Nana：咨询文件夹 / key tag
- Ren：地图 / 小背包 / 车票

### 4.2 Spatial Cue

头像要让人感觉这个 NPC 属于哪里，而不是只看到一组漂亮物件。

可用空间线索包括：

- コンビニ
- カフェ
- 居酒屋
- 研究室
- 学生ラウンジ
- 言街ラウンジ
- 駅前 / guesthouse / 旅居空间

### 4.3 Conversational Mood

通过色调、光线、材质和物件摆放来暗示聊天气质，而不是直接写字说明。

常见方向：

- 温柔
- 轻松
- 熟客感
- 清晰克制
- 支援感
- 旅居 / 流动感

## 5. Per-NPC Avatar Directions

### Kimura / 木村

- Role signal: convenience-store everyday chat
- Main anchor: convenience-store bento / onigiri / counter
- Supporting objects: shopping bag, receipt, shelf light
- Space cue: night convenience store counter
- Color: yellow-green, cream, soft night light
- Mood: familiar, practical, everyday, lightly friendly
- Must avoid: café look, overly fancy food, generic warm desk

### Misaki / 美咲

- Role signal: café, gentle light polite speech
- Main anchor: coffee cup
- Supporting objects: hand-drip coffee tools, coffee beans, soft window light
- Space cue: quiet café window seat
- Color: coffee brown, cream, soft gold
- Mood: calm, warm, refined, quiet
- Must avoid: travel objects, izakaya mood, too similar to Ren

### Taisho / 大将

- Role signal: izakaya, relaxed regular-customer talk
- Main anchor: amber drink glass / sake cup
- Supporting objects: small dish, warm lantern, wooden bar counter
- Space cue: cozy izakaya at night
- Color: amber orange, dark wood, warm brown
- Mood: relaxed, human, evening conversation
- Must avoid: café identity, study-room cues, too many bottles

### Haruka / 遥

- Role signal: campus / research room
- Main anchor: research papers / notebooks
- Supporting objects: sticky notes, pen, microscope or lab shelf cue
- Space cue: campus research room
- Color: gray-green, pale wood, paper beige
- Mood: thoughtful, organized, calm, clear
- Must avoid: over-serious lab, corporate office, clutter

### Aoi / 葵

- Role signal: same-age friend / student lounge
- Main anchor: casual notebook / magazine-like booklet
- Supporting objects: headphones, drink cup, sticker / playful note
- Space cue: student lounge or campus hangout
- Color: soft blue-gray, light beige, muted playful accents
- Mood: easygoing, youthful, friendly, unstuffy
- Must avoid: research-lab seriousness, service desk, too cute / childish

### Nana / 七海

- Role signal: life-support lounge / reliable help
- Main anchor: consultation folder / support file
- Supporting objects: key tag, clipboard, form, small plant
- Space cue: life-support lounge corner
- Color: soft beige, muted olive, gentle gray
- Mood: reliable, calm, approachable, supportive
- Must avoid: medical authority, legal office, café identity, bureaucratic coldness

### Ren / 蓮

- Role signal: sojourner / travel / station / temporary resident
- Main anchor: small backpack / map / station items
- Supporting objects: train ticket, travel mug, key tag
- Space cue: Kotomachi station front / guesthouse / platform
- Color: dusty teal, muted blue, soft olive, warm sand
- Mood: quiet, travel-ready, gently settled, reflective
- Must avoid: tourist brochure, influencer vlog, fantasy traveler, wrong Kotomachi text

## 6. Prompt Template

```text
Create a square avatar image designed for circular UI cropping for Kotomachi NPC [name].

Overall style:
soft cozy slightly painterly illustration, gentle realism, object-based storytelling, no human face, no anime character portrait, low-saturation palette, calm Kotomachi small-town mood, clear at small sidebar size.

NPC role:
[...]

Main identity anchor:
[...]

Supporting objects:
[...]

Spatial cue:
[...]

Color direction:
[...]

Conversational mood:
[...]

Composition requirements:
one strong focal object, one or two supporting objects, simple circular-readable composition, limited visual noise, no excessive readable text.

Must avoid:
generic warm tabletop repetition, clutter, poster/logo/product packaging look, unrelated role cues, human faces.
```

## 7. Quality Checklist

每次生成头像后，用以下 checklist 验收：

1. 小尺寸下能否一眼区分？
2. 是否有明确主锚点？
3. 是否有空间线索？
4. 是否和其他 NPC 不重复？
5. 是否仍像 Kotomachi 世界观？
6. 是否没有人物脸？
7. 是否没有过多文字？
8. 是否没有明显 AI 错字？
9. 是否适合圆形裁切？
10. 是否不会误导 NPC 身份？
11. 是否和角色口语风格一致？
12. 是否不只是“好看”，而是真的有产品识别价值？

## 8. Asset Naming and Integration Notes

建议资源命名：

```text
public/avatars/kimura_avatar.png
public/avatars/misaki_avatar.png
public/avatars/taisho_avatar.png
public/avatars/haruka_avatar.png
public/avatars/aoi_avatar.png
public/avatars/nana_avatar.png
public/avatars/ren_avatar.png
```

当前项目已经在 `public/avatars/` 中使用 `*_avatar.png` 作为主命名方式，因此建议继续 follow existing naming convention。

典型接入点包括：

- `lib/npc.ts` 的 `NPC_AVATARS`
- 首页 NPC card
- sidebar / chat header
- continue section

本次文档只记录这些接入点，不改代码。

## 9. Suggested Refresh Order

建议替换顺序：

1. Ren 已作为新标准参考
2. Nana
3. Aoi
4. Haruka
5. Kimura
6. Misaki
7. Taisho

也可以根据当前生成质量、接入节奏和小尺寸识别问题调整先后顺序。

## 10. Current Generated Direction Notes

以下内容只记录当前已经形成的 design direction / candidate direction，不代表已经全部接入：

- Ren：已确定使用旅行 / 车站 / 小背包 / 言街地图方向
- Kimura：便利店便当 / 夜间柜台方向
- Misaki：手冲咖啡 / 咖啡馆窗边方向
- Taisho：居酒屋酒杯 / 暖灯方向
- Haruka：研究室论文 / 笔记 / 显微镜方向
- Aoi：学生 lounge / 耳机 / 饮料 / 轻松笔记方向
- Nana：生活支援文件夹 / 钥匙牌 / lounge corner 方向

这些方向的目标不是把所有头像画成完全不同的美术风格，而是在统一的 Kotomachi 氛围里，让每个 NPC 在小圆头像里有明确、稳定、可重复识别的角色锚点。
