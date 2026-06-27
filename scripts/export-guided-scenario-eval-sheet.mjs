import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCENES_FILE = join(ROOT, "lib", "conversation-scenes.ts");
const NPC_FILE = join(ROOT, "lib", "npc.ts");
const OUTPUT_DIR = join(ROOT, ".tmp", "eval", "guided-scenarios");
const DOCS_DIR = join(ROOT, "docs", "eval");

const BAD_CASE_TYPES = [
  "setup_overlap",
  "prefill_quality_issue",
  "missing_referent",
  "intent_over_narrowed",
  "response_off_target",
  "weak_continuation_hook",
  "weak_scene_progression",
  "repetitive_response",
  "over_explaining",
  "generic_or_monologue",
];

const ROOT_CAUSE_COMPONENTS = [
  "scenario_entry",
  "npc_opening",
  "sample_user_line",
  "micro_episode",
  "npc_prompt",
  "scenario_injection",
  "model_behavior",
  "unknown",
];

function escapeCsv(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function parseNpcNames() {
  const content = readFileSync(NPC_FILE, "utf-8");
  const names = {};
  const displayNames = {};

  const nameMatch = content.match(/const NPC_NAMES: Record<NpcId, string> = \{([\s\S]*?)\};/);
  if (nameMatch) {
    const block = nameMatch[1];
    const re = /(\w+):\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      names[m[1]] = m[2];
    }
  }

  const displayMatch = content.match(/const NPC_DISPLAY_NAMES: Record<NpcId, string> = \{([\s\S]*?)\};/);
  if (displayMatch) {
    const block = displayMatch[1];
    const re = /(\w+):\s*"([^"]+)"/g;
    let m;
    while ((m = re.exec(block)) !== null) {
      displayNames[m[1]] = m[2];
    }
  }

  return { names, displayNames };
}

function parseScenarios() {
  const content = readFileSync(SCENES_FILE, "utf-8");
  const scenarios = [];

  const sceneMatch = content.match(/export const CONVERSATION_SCENES = \{([\s\S]*?)\n\} as const satisfies/);
  if (!sceneMatch) {
    console.error("Could not find CONVERSATION_SCENES in file");
    return scenarios;
  }

  const block = sceneMatch[1];
  const sceneKeys = [];
  const keyRe = /\n\s{2}(\w+):\s*\{/g;
  let m;
  while ((m = keyRe.exec(block)) !== null) {
    sceneKeys.push({ key: m[1], index: m.index });
  }

  for (let i = 0; i < sceneKeys.length; i++) {
    const start = sceneKeys[i].index;
    const end = i < sceneKeys.length - 1 ? sceneKeys[i + 1].index : block.length;
    const sceneBlock = block.slice(start, end);

    const scenario = parseSingleScene(sceneBlock);
    if (scenario) {
      scenarios.push(scenario);
    }
  }

  return scenarios;
}

function parseSingleScene(block) {
  const s = {};

  const stringFields = [
    "id", "npcId", "title", "titleZh", "titleEn",
    "shortLabel", "shortLabelZh", "shortLabelEn",
    "microEpisodeZh", "microEpisodeEn",
    "starterIntentZh", "starterIntentEn",
    "sampleUserLineJa", "setup", "userGoal", "npcOpening",
    "softLanding",
  ];

  for (const field of stringFields) {
    const re = new RegExp(`${field}:\\s*"([^"]*)"`, "m");
    const m = block.match(re);
    if (m) {
      s[field] = m[1];
    }
  }

  const category = inferCategory(s.npcId, s.titleZh || s.title);
  s.category = category;

  const tags = [];
  if (s.microEpisodeZh) tags.push("has_micro_episode");
  if (s.sampleUserLineJa) tags.push("has_sample_line");
  if (s.npcOpening) tags.push("has_opening");
  if (s.starterIntentZh) tags.push("has_starter_intent");
  s.tags = tags.join("|");

  const missingFields = [];
  if (!s.sampleUserLineJa) missingFields.push("sampleUserLineJa");
  if (!s.microEpisodeZh) missingFields.push("microEpisodeZh");
  if (!s.npcOpening) missingFields.push("npcOpening");
  if (!s.starterIntentZh) missingFields.push("starterIntentZh");
  s.missingFields = missingFields.join(",");

  if (missingFields.length === 0) {
    s.fieldCompleteness = "complete";
  } else if (missingFields.length <= 1) {
    s.fieldCompleteness = "partial";
  } else {
    s.fieldCompleteness = "minimal";
  }

  const riskNotes = [];
  if (!s.sampleUserLineJa) riskNotes.push("missing_sample_line");
  if (!s.microEpisodeZh) riskNotes.push("missing_micro_episode");
  if (!s.npcOpening) riskNotes.push("missing_opening");
  if (s.npcOpening && s.npcOpening.length < 8) riskNotes.push("opening_too_short");
  s.initialRiskNote = riskNotes.length > 0 ? riskNotes.join(",") : "none";

  return s;
}

function inferCategory(npcId, title) {
  const categoryMap = {
    kimura: "convenience_store",
    misaki: "cafe",
    taisho: "izakaya",
    haruka: "lab_campus",
    aoi: "casual_friend",
    nana: "life_advice",
    ren: "travel_wanderer",
    mao: "community_space",
    riku: "sports_gym",
    saku: "mystery_night",
  };
  return categoryMap[npcId] || "other";
}

function generateInventoryCsv(scenarios, npcNames) {
  const headers = [
    "scenarioId", "npcId", "npcName", "title", "category",
    "starterIntent", "sampleUserLineJa", "microEpisode",
    "npcOpening", "location", "tags", "difficulty",
    "sourceFile", "fieldCompleteness", "missingFields", "initialRiskNote",
  ];

  const lines = [headers.join(",")];

  for (const s of scenarios) {
    const row = [
      s.id || "",
      s.npcId || "",
      npcNames.displayNames[s.npcId] || s.npcId || "",
      s.titleZh || s.title || "",
      s.category || "",
      s.starterIntentZh || "",
      s.sampleUserLineJa || "",
      s.microEpisodeZh || "",
      s.npcOpening || "",
      getLocationLabel(s.npcId),
      s.tags || "",
      getDifficulty(s),
      "lib/conversation-scenes.ts",
      s.fieldCompleteness || "",
      s.missingFields || "",
      s.initialRiskNote || "",
    ];
    lines.push(row.map(escapeCsv).join(","));
  }

  return lines.join("\n") + "\n";
}

function getLocationLabel(npcId) {
  const map = {
    kimura: "便利店",
    misaki: "咖啡馆",
    taisho: "居酒屋",
    haruka: "大学校园/研究室",
    aoi: "共享空间",
    nana: "生活咨询",
    ren: "言街/旅行",
    mao: "社区空间",
    riku: "体育馆/健身房",
    saku: "夜之街",
  };
  return map[npcId] || "";
}

function getDifficulty(scenario) {
  if (!scenario.sampleUserLineJa) return "unknown";
  const len = scenario.sampleUserLineJa.length;
  if (len <= 10) return "beginner";
  if (len <= 20) return "intermediate";
  return "advanced";
}

function generateReviewSheetCsv(scenarios, npcNames) {
  const scenarioInfo = [
    "reviewStatus", "priority",
    "scenarioId", "npcId", "npcName", "title", "category",
    "starterIntent", "sampleUserLineJa", "microEpisode", "npcOpening",
    "sourceFile",
  ];

  const traceColumns = [
    "sentPrefilledLine", "npcResponse1",
    "manualUserFollowup1", "npcResponse2",
    "traceNotes",
  ];

  const staticRiskColumn = ["staticRiskFlags"];

  const scoringColumns = [
    "setup_alignment", "prefilled_line_quality", "response_to_prefill",
    "continuation_hook", "scene_progression_potential", "anti_overteaching",
    "total_score",
  ];

  const badCaseColumns = [
    "primaryBadCaseType", "secondaryBadCaseTypes",
    "mainIssue", "rootCauseComponent",
    "suggestedFix", "humanReviewerNotes", "regressionNeeded",
  ];

  const headers = [...scenarioInfo, ...traceColumns, ...staticRiskColumn, ...scoringColumns, ...badCaseColumns];
  const lines = [headers.join(",")];

  for (const s of scenarios) {
    const row = [
      "pending",
      s.fieldCompleteness === "complete" ? "P1" : "P0",
      s.id || "",
      s.npcId || "",
      npcNames.displayNames[s.npcId] || s.npcId || "",
      s.titleZh || s.title || "",
      s.category || "",
      s.starterIntentZh || "",
      s.sampleUserLineJa || "",
      s.microEpisodeZh || "",
      s.npcOpening || "",
      "lib/conversation-scenes.ts",
      s.sampleUserLineJa || "",
      "", "", "", "",
      s.initialRiskNote || "",
      "", "", "", "", "", "", "",
      "", "", "", "", "", "", "",
    ];
    lines.push(row.map(escapeCsv).join(","));
  }

  return lines.join("\n") + "\n";
}

function generateReviewSheetMd(scenarios, npcNames) {
  const npcGroups = {};
  for (const s of scenarios) {
    if (!npcGroups[s.npcId]) npcGroups[s.npcId] = [];
    npcGroups[s.npcId].push(s);
  }

  let md = "# Guided Scenarios Manual Review Sheet\n\n";
  md += `> Total: ${scenarios.length} scenarios\n\n`;
  md += `> Generated from: lib/conversation-scenes.ts\n\n`;
  md += "---\n\n";

  for (const [npcId, npcScenarios] of Object.entries(npcGroups)) {
    const npcName = npcNames.displayNames[npcId] || npcId;
    md += `## ${npcName} (${npcId}) — ${npcScenarios.length} scenarios\n\n`;

    for (const s of npcScenarios) {
      const priority = s.fieldCompleteness === "complete" ? "P1" : "P0";
      md += `### ${s.titleZh || s.title} — ${s.id}\n\n`;
      md += `**Category**: ${s.category || ""}  \n`;
      md += `**Status**: pending  \n`;
      md += `**Priority**: ${priority}  \n`;
      md += `**Completeness**: ${s.fieldCompleteness || ""}  \n`;
      md += `**Risk note**: ${s.initialRiskNote || "none"}  \n\n`;

      md += `**Starter intent**: ${s.starterIntentZh || "—"}\n\n`;
      md += `**Micro episode**: ${s.microEpisodeZh || "—"}\n\n`;
      md += `**NPC opening**: ${s.npcOpening || "—"}\n\n`;
      md += `**Sample user line**: ${s.sampleUserLineJa || "—"}\n\n`;

      md += `**Test flow (default prefilled path)**:\n\n`;
      md += `1. NPC → ${s.npcOpening || ""}\n`;
      md += `2. User sends → ${s.sampleUserLineJa || ""}\n`;
      md += `3. NPC response 1: \n`;
      md += `4. User follow-up: \n`;
      md += `5. NPC response 2: \n`;
      md += `6. Notes: \n\n`;

      md += `**Scoring** (1-5):\n\n`;
      md += `| Dimension | Score | Notes |\n`;
      md += `|-----------|-------|-------|\n`;
      md += `| setup_alignment | | |\n`;
      md += `| prefilled_line_quality | | |\n`;
      md += `| response_to_prefill | | |\n`;
      md += `| continuation_hook | | |\n`;
      md += `| scene_progression_potential | | |\n`;
      md += `| anti_overteaching | | |\n`;
      md += `| **Total** | /30 | |\n\n`;

      md += `**Bad case / fix**:\n\n`;
      md += `- Primary bad case type: \n`;
      md += `- Secondary bad case types: \n`;
      md += `- Main issue: \n`;
      md += `- Root cause component: \n`;
      md += `- Suggested fix: \n`;
      md += `- Regression needed: \n\n`;

      md += "---\n\n";
    }
  }

  return md;
}

function generateEvalGuide() {
  return `# Guided Scenario Manual Eval Guide

## 概述

本指南用于人工评测 Kotomachi / 言街 的 guided scenarios（引导场景）功能。

**第一轮人工 eval 只测试 Guided Scenario 的默认路径：**

\`npcOpening → sampleUserLineJa → npcResponse1\`

**评测目标：** 用户发送系统预设的固定句后，NPC 能不能自然接住，并让用户愿意继续说第二句。

## 评测原则

- **短而自然 > 长而详细**
- **低压力输出 > 课堂式教学**
- **NPC 对话感 > 老师讲解感**
- **轻推进 > 强任务完成**
- **用户愿意继续说，比单轮回复信息量更重要**
- 不要因为回复很长就给高分
- 不要把"讲解很多"误判为学习价值高
- **第一轮 baseline 重点看默认预填句能不能启动对话**

## 真实链路

Kotomachi 的 Guided Scenario 真实链路：

1. 用户点击进入某个 guided scenario；
2. NPC 自动发出 \`npcOpening\`；
3. 用户输入框自动预填 \`sampleUserLineJa\`；
4. 用户通常直接发送这句，或轻微修改；
5. NPC 需要自然接住这句，并让对话有继续下去的可能。

## Rubric（6 维度，每项 1-5 分）

### setup_alignment — 设置对齐度

- **5**: opening 和预填句自然衔接，像真实场景一来一回
- **3**: 大体相关，但有轻微错位
- **1**: opening 和预填句明显不搭

### prefilled_line_quality — 预填句质量

- **5**: 短、自然、实用，学习者愿意直接发送
- **3**: 意思清楚，但略教科书/略不自然
- **1**: 生硬、太长、翻译腔、或不适合当前场景

### response_to_prefill — 对预填句的回应

- **5**: NPC 自然接住并回应用户实际意图
- **3**: 基本回应了，但有点泛或机械
- **1**: 没答到、重复用户句、解释这句话怎么用，或明显跑偏

### continuation_hook — 继续钩子

- **5**: NPC 回复后用户很容易接第二句
- **3**: 可以继续，但需要用户自己想
- **1**: 对话像已经结束，用户不知道接什么

### scene_progression_potential — 场景推进潜力

- **5**: 有轻微自然推进，能支撑 2–4 轮
- **3**: 能聊下去，但推进较弱
- **1**: 只完成一次问答，没有场景延展

### anti_overteaching — 避免过度教学

- **5**: 保持 NPC 对话感，不主动长篇教学
- **3**: 有轻微说明感，但仍可接受
- **1**: 明显变成老师、纠错器、说明书或人生导师

## Bad Case Types（10 类）

每条最多选 **1 个 primary** + **0–2 个 secondary**：

- \`setup_overlap\` — opening 抢了用户或 response 的功能
- \`prefill_quality_issue\` — 预填句不自然、太长、或翻译腔
- \`missing_referent\` — 预填句用了“这个/那个”但没有可见指代对象
- \`intent_over_narrowed\` — 预填句把场景意图收窄到单一选项
- \`response_off_target\` — NPC 没有回应用户实际意图
- \`weak_continuation_hook\` — response1 没有把球抛回用户
- \`weak_scene_progression\` — 场景推进弱，容易原地空转
- \`repetitive_response\` — NPC 重复 opening 或预填句的内容
- \`over_explaining\` — NPC 变成解释/说明/教学
- \`generic_or_monologue\` — NPC 回复太泛化或变成独白

## Root Cause Components

- \`scenario_entry\` — 场景入口设计
- \`npc_opening\` — NPC 开场白
- \`sample_user_line\` — 样例用户句
- \`micro_episode\` — 小剧情
- \`npc_prompt\` — NPC 系统提示
- \`scenario_injection\` — 场景注入方式
- \`model_behavior\` — 模型行为
- \`unknown\` — 不确定

## 评测流程建议

1. 从 P0 优先级开始（字段不完整的场景）
2. 每个 scenario 测试默认预填路径：
   - 记录 NPC opening
   - 用户发送预填句 sampleUserLineJa
   - 记录 NPC response1
   - 尝试手动接一句，记录 NPC response2
3. 根据 rubric 打分
4. 记录 bad case 和 root cause

## 输出文件

- \`scenario-inventory.csv\` — 场景总览表
- \`manual-review-sheet.csv\` — 人工评测表（CSV 格式）
- \`manual-review-sheet.md\` — 人工评测表（Markdown 格式）

## 后续扩展（v2 robustness eval）

以下用户类型可作为后续第二轮评测重点，但不是当前第一轮 baseline 的重点：

- **normal_user**: 正常按场景聊天，有一点日语输出能力
- **weak_output_user**: 日语输出弱，可能混输，只能说短句
- **drift_user**: 输入与场景相关但有点跑偏
`;
}

function main() {
  console.log("=== Guided Scenario Eval Sheet Generator ===\n");

  const npcNames = parseNpcNames();
  const scenarios = parseScenarios();

  console.log(`Scenarios found: ${scenarios.length}`);

  const npcCounts = {};
  const categoryCounts = {};
  const completenessCounts = { complete: 0, partial: 0, minimal: 0 };
  const missingFieldCounts = {};

  for (const s of scenarios) {
    npcCounts[s.npcId] = (npcCounts[s.npcId] || 0) + 1;
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
    completenessCounts[s.fieldCompleteness] = (completenessCounts[s.fieldCompleteness] || 0) + 1;

    if (s.missingFields) {
      for (const f of s.missingFields.split(",")) {
        if (f) missingFieldCounts[f] = (missingFieldCounts[f] || 0) + 1;
      }
    }
  }

  console.log("\nNPC distribution:");
  for (const [npcId, count] of Object.entries(npcCounts).sort((a, b) => b[1] - a[1])) {
    const name = npcNames.displayNames[npcId] || npcId;
    console.log(`  ${name} (${npcId}): ${count}`);
  }

  console.log("\nCategory distribution:");
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }

  console.log("\nField completeness:");
  console.log(`  complete: ${completenessCounts.complete}`);
  console.log(`  partial: ${completenessCounts.partial}`);
  console.log(`  minimal: ${completenessCounts.minimal}`);

  if (Object.keys(missingFieldCounts).length > 0) {
    console.log("\nMissing fields:");
    for (const [field, count] of Object.entries(missingFieldCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${field}: ${count}`);
    }
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(DOCS_DIR, { recursive: true });

  const inventoryCsv = generateInventoryCsv(scenarios, npcNames);
  const inventoryPath = join(OUTPUT_DIR, "scenario-inventory.csv");
  writeFileSync(inventoryPath, inventoryCsv, "utf-8");
  console.log(`\n✓ ${inventoryPath}`);

  const reviewCsv = generateReviewSheetCsv(scenarios, npcNames);
  const reviewCsvPath = join(OUTPUT_DIR, "manual-review-sheet.csv");
  writeFileSync(reviewCsvPath, reviewCsv, "utf-8");
  console.log(`✓ ${reviewCsvPath}`);

  const reviewMd = generateReviewSheetMd(scenarios, npcNames);
  const reviewMdPath = join(OUTPUT_DIR, "manual-review-sheet.md");
  writeFileSync(reviewMdPath, reviewMd, "utf-8");
  console.log(`✓ ${reviewMdPath}`);

  const guideMd = generateEvalGuide();
  const guidePath = join(DOCS_DIR, "guided-scenario-manual-eval-guide.md");
  writeFileSync(guidePath, guideMd, "utf-8");
  console.log(`✓ ${guidePath}`);

  const totalReviews = scenarios.length;
  console.log(`\nTotal reviews to fill: ${totalReviews}`);
  console.log("Done.");
}

main();
