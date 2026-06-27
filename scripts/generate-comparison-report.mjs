import { readFileSync, mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const CALIBRATION_DIR = join(ROOT, ".tmp", "eval", "guided-scenarios", "judge-calibration");
const BACKUP_DIR = join(ROOT, ".tmp", "eval", "backups");
const DOCS_DIR = join(ROOT, "docs", "eval");

const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

function parseCsvLine(line) {
  if (!line) return [];
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function escapeCsv(value) {
  if (value === undefined || value === null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function readHumanGold() {
  const csvPath = join(CALIBRATION_DIR, "human-gold.csv");
  if (!existsSync(csvPath)) return [];
  
  const content = readFileSync(csvPath, "utf-8");
  const lines = content.trim().split("\n");
  const header = parseCsvLine(lines[0]);
  const indices = {};
  header.forEach((h, i) => indices[h] = i);
  
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    results.push({
      caseId: row[indices.caseId],
      scenarioId: row[indices.scenarioId],
      scores: {
        setup_alignment: parseInt(row[indices.setup_alignment]) || 0,
        prefilled_line_quality: parseInt(row[indices.prefilled_line_quality]) || 0,
        response_to_prefill: parseInt(row[indices.response_to_prefill]) || 0,
        continuation_hook: parseInt(row[indices.continuation_hook]) || 0,
        scene_progression_potential: parseInt(row[indices.scene_progression_potential]) || 0,
        anti_overteaching: parseInt(row[indices.anti_overteaching]) || 0,
      },
      total_score: parseInt(row[indices.total_score]) || 0,
      primaryBadCaseType: row[indices.primaryBadCaseType] || "",
      secondaryBadCaseTypes: row[indices.secondaryBadCaseTypes] || "",
      mainIssue: row[indices.mainIssue] || "",
      rootCauseComponent: row[indices.rootCauseComponent] || "",
      suggestedFix: row[indices.suggestedFix] || "",
    });
  }
  return results;
}

function readCodexResults() {
  const jsonPath = join(CALIBRATION_DIR, "codex-blind-judge-results.json");
  if (!existsSync(jsonPath)) return [];
  
  const content = readFileSync(jsonPath, "utf-8");
  return JSON.parse(content);
}

function checkPrimaryMatch(human, codex) {
  return human.primaryBadCaseType === codex.primaryBadCaseType;
}

function checkSecondaryOverlap(human, codex) {
  const humanTypes = human.secondaryBadCaseTypes.split(",").map(s => s.trim().replace(/^"|"$/g, ""));
  const codexTypes = codex.secondaryBadCaseTypes || [];
  
  const overlap = humanTypes.filter(h => codexTypes.includes(h));
  return {
    hasOverlap: overlap.length > 0,
    overlapTypes: overlap,
    humanOnly: humanTypes.filter(h => !codexTypes.includes(h)),
    codexOnly: codexTypes.filter(c => !humanTypes.includes(c)),
  };
}

function checkRootCauseMatch(human, codex) {
  const humanRoots = human.rootCauseComponent.split(",").map(s => s.trim());
  const codexRoots = codex.rootCauseComponent || [];
  
  const overlap = humanRoots.filter(h => codexRoots.includes(h));
  return {
    exactMatch: humanRoots.length === codexRoots.length && overlap.length === humanRoots.length,
    partialMatch: overlap.length > 0,
    overlapComponents: overlap,
  };
}

function generateComparisonCsv(humanResults, codexResults) {
  const header = [
    "caseId", "scenarioId",
    "human_setup_alignment", "codex_setup_alignment", "diff_setup_alignment",
    "human_prefilled_line_quality", "codex_prefilled_line_quality", "diff_prefilled_line_quality",
    "human_response_to_prefill", "codex_response_to_prefill", "diff_response_to_prefill",
    "human_continuation_hook", "codex_continuation_hook", "diff_continuation_hook",
    "human_scene_progression_potential", "codex_scene_progression_potential", "diff_scene_progression_potential",
    "human_anti_overteaching", "codex_anti_overteaching", "diff_anti_overteaching",
    "human_total_score", "codex_total_score", "diff_total_score",
    "human_primaryBadCaseType", "codex_primaryBadCaseType", "primary_match",
    "human_secondaryBadCaseTypes", "codex_secondaryBadCaseTypes", "secondary_overlap",
    "human_rootCauseComponent", "codex_rootCauseComponent", "rootCause_match",
    "notes",
  ];
  
  const rows = [];
  for (let i = 0; i < humanResults.length; i++) {
    const human = humanResults[i];
    const codex = codexResults.find(c => c.caseId === human.caseId) || {};
    
    const primaryMatch = checkPrimaryMatch(human, codex);
    const secondaryOverlap = checkSecondaryOverlap(human, codex);
    const rootCauseMatch = checkRootCauseMatch(human, codex);
    
    const scoreDiffs = {};
    const scoreKeys = ["setup_alignment", "prefilled_line_quality", "response_to_prefill", "continuation_hook", "scene_progression_potential", "anti_overteaching"];
    for (const key of scoreKeys) {
      scoreDiffs[key] = (codex.scores?.[key] || 0) - (human.scores?.[key] || 0);
    }
    const totalDiff = (codex.total_score || 0) - human.total_score;
    
    let notes = "";
    if (!primaryMatch) {
      notes += `Primary mismatch: human=${human.primaryBadCaseType}, codex=${codex.primaryBadCaseType}. `;
    }
    if (secondaryOverlap.humanOnly.length > 0) {
      notes += `Human-only secondary: ${secondaryOverlap.humanOnly.join(",")}. `;
    }
    if (secondaryOverlap.codexOnly.length > 0) {
      notes += `Codex-only secondary: ${secondaryOverlap.codexOnly.join(",")}. `;
    }
    if (Math.abs(totalDiff) >= 4) {
      notes += `Large score diff (${totalDiff}). `;
    }
    
    const row = [
      human.caseId,
      human.scenarioId,
      human.scores.setup_alignment,
      codex.scores?.setup_alignment || 0,
      scoreDiffs.setup_alignment,
      human.scores.prefilled_line_quality,
      codex.scores?.prefilled_line_quality || 0,
      scoreDiffs.prefilled_line_quality,
      human.scores.response_to_prefill,
      codex.scores?.response_to_prefill || 0,
      scoreDiffs.response_to_prefill,
      human.scores.continuation_hook,
      codex.scores?.continuation_hook || 0,
      scoreDiffs.continuation_hook,
      human.scores.scene_progression_potential,
      codex.scores?.scene_progression_potential || 0,
      scoreDiffs.scene_progression_potential,
      human.scores.anti_overteaching,
      codex.scores?.anti_overteaching || 0,
      scoreDiffs.anti_overteaching,
      human.total_score,
      codex.total_score || 0,
      totalDiff,
      human.primaryBadCaseType,
      codex.primaryBadCaseType || "",
      primaryMatch ? "yes" : "no",
      human.secondaryBadCaseTypes,
      (codex.secondaryBadCaseTypes || []).join(","),
      secondaryOverlap.hasOverlap ? "yes" : "no",
      human.rootCauseComponent,
      (codex.rootCauseComponent || []).join(","),
      rootCauseMatch.exactMatch ? "exact" : (rootCauseMatch.partialMatch ? "partial" : "no"),
      notes.trim(),
    ];
    
    rows.push(row.map(escapeCsv).join(","));
  }
  
  const csvContent = [header.join(","), ...rows].join("\n") + "\n";
  const csvPath = join(CALIBRATION_DIR, "human-vs-codex-comparison.csv");
  writeFileSync(csvPath, csvContent, "utf-8");
  console.log(`Generated: ${csvPath}`);
  
  return { header, rows };
}

function generateComparisonMd(humanResults, codexResults) {
  let md = "# Human vs Codex Judge Comparison\n\n";
  md += `> Generated: ${new Date().toISOString()}\n`;
  md += `> Cases: ${humanResults.length}\n\n`;
  md += "---\n\n";
  
  // Summary statistics
  const primaryMatches = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && checkPrimaryMatch(h, codex);
  });
  
  const secondaryOverlaps = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && checkSecondaryOverlap(h, codex).hasOverlap;
  });
  
  const totalDiffs = humanResults.map(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex ? (codex.total_score || 0) - h.total_score : 0;
  });
  
  const avgTotalDiff = totalDiffs.reduce((a, b) => a + b, 0) / totalDiffs.length;
  const maxDiffCase = humanResults.reduce((max, h) => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    const diff = codex ? Math.abs((codex.total_score || 0) - h.total_score) : 0;
    return diff > max.diff ? { caseId: h.caseId, scenarioId: h.scenarioId, diff } : max;
  }, { caseId: "", scenarioId: "", diff: 0 });
  
  md += `## Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Primary exact match | ${primaryMatches.length}/${humanResults.length} (${Math.round(primaryMatches.length / humanResults.length * 100)}%) |\n`;
  md += `| Secondary overlap | ${secondaryOverlaps.length}/${humanResults.length} (${Math.round(secondaryOverlaps.length / humanResults.length * 100)}%) |\n`;
  md += `| Average total_score diff | ${avgTotalDiff.toFixed(2)} |\n`;
  md += `| Max score diff case | ${maxDiffCase.caseId} (${maxDiffCase.diff}) |\n\n`;
  
  // Primary mismatch cases
  md += `## Primary Mismatch Cases\n\n`;
  const mismatches = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && !checkPrimaryMatch(h, codex);
  });
  
  if (mismatches.length === 0) {
    md += `None.\n\n`;
  } else {
    for (const h of mismatches) {
      const codex = codexResults.find(c => c.caseId === h.caseId);
      md += `### ${h.caseId}\n\n`;
      md += `| | Human | Codex |\n`;
      md += `|---|-------|-------|\n`;
      md += `| Primary | ${h.primaryBadCaseType} | ${codex.primaryBadCaseType} |\n`;
      md += `| Total score | ${h.total_score} | ${codex.total_score} |\n\n`;
      md += `**Human mainIssue**: ${h.mainIssue.slice(0, 100)}...\n\n`;
      md += `**Codex mainIssue**: ${codex.mainIssue?.slice(0, 100)}...\n\n`;
      md += `**Analysis**: `;
      
      // Case-specific analysis
      if (h.scenarioId === "kimura_payment_method") {
        md += `Codex missed \`intent_over_narrowed\`. Human identified that sampleUserLineJa locks the intent to card payment, while scenario title suggests asking payment methods broadly. Codex only saw weak continuation hook.\n\n`;
      } else if (h.scenarioId === "ren_city_you_like") {
        md += `Primary types are swapped. Human saw \`weak_continuation_hook\` as primary with \`generic_or_monologue\` secondary. Codex reversed. Both agree the response is reflective without clear handoff.\n\n`;
      } else {
        md += `Mismatch without detailed analysis.\n\n`;
      }
    }
  }
  
  // Large score diff cases
  md += `## Large Score Diff Cases (≥4)\n\n`;
  const largeDiffs = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && Math.abs((codex.total_score || 0) - h.total_score) >= 4;
  });
  
  if (largeDiffs.length === 0) {
    md += `None.\n\n`;
  } else {
    for (const h of largeDiffs) {
      const codex = codexResults.find(c => c.caseId === h.caseId);
      const diff = (codex.total_score || 0) - h.total_score;
      md += `### ${h.caseId} (diff: ${diff})\n\n`;
      md += `| Dimension | Human | Codex | Diff |\n`;
      md += `|-----------|-------|-------|------|\n`;
      const keys = ["setup_alignment", "prefilled_line_quality", "response_to_prefill", "continuation_hook", "scene_progression_potential", "anti_overteaching"];
      for (const key of keys) {
        const hScore = h.scores[key];
        const cScore = codex.scores?.[key] || 0;
        md += `| ${key} | ${hScore} | ${cScore} | ${cScore - hScore} |\n`;
      }
      md += `\n`;
      
      // Analysis
      if (h.scenarioId === "kimura_payment_method") {
        md += `**Analysis**: Codex gave higher \`setup_alignment\` (5 vs 3) and \`prefilled_line_quality\` (5 vs 3), missing the intent narrowing issue.\n\n`;
      } else if (h.scenarioId === "saku_unknown_creature") {
        md += `**Analysis**: Codex gave higher scores for mystery/atmosphere aspects, tolerating more opening-side worldbuilding than human judge.\n\n`;
      }
    }
  }
  
  // Codex judge偏差总结
  md += `## Identified Codex Judge Biases\n\n`;
  md += `1. **Underestimates \`intent_over_narrowed\`**: Case 2 shows Codex missed that sampleUserLineJa locks the intent.\n`;
  md += `2. **Overrewards atmosphere**: Cases 6 and 8 show Codex gives high scores for mood/atmosphere even when continuation hook is weak.\n`;
  md += `3. **Over-tolerates mystery worldbuilding**: Case 8 shows Codex accepts more opening-side revelation than ideal.\n`;
  md += `4. **Does not cap continuation_hook when no clear hook**: Cases 2, 3, 6 show continuation_hook scores around 2-3 even without clear handoff.\n\n`;
  
  // Score dimension comparison
  md += `## Score Dimension Analysis\n\n`;
  md += `| Dimension | Avg Human | Avg Codex | Avg Diff |\n`;
  md += `|-----------|-----------|-----------|----------|\n`;
  const keys = ["setup_alignment", "prefilled_line_quality", "response_to_prefill", "continuation_hook", "scene_progression_potential", "anti_overteaching"];
  for (const key of keys) {
    const avgHuman = humanResults.reduce((a, h) => a + h.scores[key], 0) / humanResults.length;
    const avgCodex = codexResults.reduce((a, c) => a + (c.scores?.[key] || 0), 0) / codexResults.length;
    md += `| ${key} | ${avgHuman.toFixed(2)} | ${avgCodex.toFixed(2)} | ${(avgCodex - avgHuman).toFixed(2)} |\n`;
  }
  md += `\n`;
  
  // Root cause analysis
  md += `## Root Cause Label Analysis\n\n`;
  md += `| Match Level | Count |\n`;
  md += `|-------------|-------|\n`;
  const exactMatches = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && checkRootCauseMatch(h, codex).exactMatch;
  });
  const partialMatches = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && checkRootCauseMatch(h, codex).partialMatch && !checkRootCauseMatch(h, codex).exactMatch;
  });
  const noMatches = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && !checkRootCauseMatch(h, codex).partialMatch;
  });
  md += `| Exact | ${exactMatches.length} |\n`;
  md += `| Partial | ${partialMatches.length} |\n`;
  md += `| No match | ${noMatches.length} |\n\n`;
  
  md += `### Root Cause Observations\n\n`;
  md += `- Human tends to list multiple root causes (e.g., \`npc_opening, model_behavior\`)\n`;
  md += `- Codex often picks a single root cause\n`;
  md += `- Codex more frequently defaults to \`model_behavior\` for response-side issues\n\n`;
  
  md += "---\n\n";
  md += `## Next Steps\n\n`;
  md += `1. Update judge prompt to v1.1 with stronger rules on:\n`;
  md += `   - Intent-level analysis (compare title/starterIntent with sampleUserLineJa)\n`;
  md += `   - Cap continuation_hook when no clear hook exists\n`;
  md += `   - Do not overreward atmosphere\n`;
  md += `   - Mystery scene curiosity hooks\n`;
  md += `   - Setup overlap should lower multiple scores\n`;
  md += `2. Allow multiple root causes in v1.1\n`;
  md += `3. Run calibration round 2 with updated prompt\n`;
  
  const mdPath = join(CALIBRATION_DIR, "human-vs-codex-comparison.md");
  writeFileSync(mdPath, md, "utf-8");
  console.log(`Generated: ${mdPath}`);
}

function generateJudgePromptV1_1() {
  const prompt = `# Guided Scenario Judge Prompt v1.1

## 评测链路

评测默认链路：

\`npcOpening → sampleUserLineJa（用户直接发送预填句） → npcResponse1 → 用户是否容易继续\`

## 核心原则

- Opening 不抢话
- Prefill 有表达价值
- Response1 有继续钩子

## v1.1 新增规则（基于 calibration 结果）

### 1. Judge scenario intent, not only sentence-level coherence

必须比较 \`title\` / \`starterIntent\` / \`microEpisode\` / \`npcOpening\` / \`sampleUserLineJa\`。

如果 \`sampleUserLineJa\` 把更宽的场景目标过早锁死，要考虑 \`intent_over_narrowed\`。

**例子**：
- Scenario title: "问支付方式"
- sampleUserLineJa: "カードで払えますか。"
- 这是 \`intent_over_narrowed\`，因为预填句把"问支付方式"锁死到"卡支付"。

### 2. Cap continuation score when no clear hook exists

如果 \`npcResponse1\` 没有明确问题、选择、下一步、邀请或观察任务，\`continuation_hook\` 通常不得超过 3。

即使 response 文字漂亮、氛围好，没有明确 handoff 就不能给高分。

**判断标准**：
- 有明确问题 → 可以 4-5
- 有选择/下一步 → 可以 4
- 只有语气结尾 → 上限 3
- 像已经结束 → 1-2

### 3. Do not overreward atmosphere

氛围好、语气自然、文字漂亮，不等于用户容易继续。

Ren-like reflective scenes 和 Saku-like mystery scenes 也必须给用户下一句入口。

**错误倾向**：
- 看到"共鸣感强"就给高分 → 需要检查是否有 handoff
- 看到"有世界观/神秘感"就宽容 → 需要检查 curiosity hook

### 4. Mystery scenes need curiosity hooks

对隐藏/趣味/Saku 场景：
- \`npcOpening\` 不应提前解释核心 mystery
- \`npcResponse1\` 应该 reveal a little, leave a little unresolved, and provide a curiosity hook

**判断标准**：
- Opening 揭示太多 mystery → \`setup_overlap\`
- Response1 没有给用户继续探索的理由 → \`weak_continuation_hook\`

### 5. Setup overlap should lower multiple scores

如果 \`npcOpening\` 已经抢了用户表达或 \`npcResponse1\` 功能，不能只标 \`setup_overlap\`，还应影响：
- \`setup_alignment\` — 通常 ≤ 2
- \`response_to_prefill\` — 因为 response 只是重复或轻微添加
- \`scene_progression_potential\` — 因为场景已提前完成

### 6. Multiple root causes are allowed

混合 case 可以列 2 个 \`rootCauseComponent\`，例如：
- \`sample_user_line, model_behavior\` — 预填句设计有问题，同时 response 行为也有问题
- \`npc_opening, model_behavior\` — opening 抢话，同时 response 没有提供 hook

## 评分维度（每项 1-5 分）

### setup_alignment — 设置对齐度

opening 和 sampleUserLineJa 是否对齐。

- **5**: opening 和预填句自然衔接，像同一个小场景里的自然一来一回
- **3**: 大体相关，但有轻微错位（如 opening 问 A，预填句答 B）
- **1**: opening 和预填句明显不搭，或 opening 已经抢了预填句的功能

**注意**：如果 opening 抢话，通常 ≤ 2。

### prefilled_line_quality — 预填句质量

预填句是否自然、短、适合学习者。

- **5**: 短、自然、实用，学习者愿意直接发送
- **3**: 意思清楚，但略教科书味或略不自然
- **1**: 生硬、太长、翻译腔、或明显不适合当前场景

**注意**：必须同时考虑和 title/starterIntent 的关系。

### response_to_prefill — 对预填句的回应

NPC response1 是否自然接住用户发送的预填句。

- **5**: NPC 自然接住并回应用户实际意图，不重复不解释
- **3**: 基本回应了，但有点泛或机械
- **1**: 没答到、重复用户句、解释这句话怎么用、或明显跑偏

**注意**：如果 response 只是重复 opening/prefill 的内容，应考虑 ≤ 3。

### continuation_hook — 继续钩子

response1 是否给用户继续说第二句的机会。

- **5**: 用户很容易接第二句（有选择、确认、下一步、自然反问）
- **3**: 可以继续，但需要用户自己想
- **1**: 对话像已经结束，用户不知道接什么

**注意**：如果没有明确 handoff，上限是 3。不要因为氛围好就给高分。

### scene_progression_potential — 场景推进潜力

这个 scenario 是否有继续 2-4 轮的潜力。

- **5**: 有轻微自然推进，能支撑 2-4 轮低压力对话
- **3**: 能聊下去，但推进较弱，容易原地寒暄
- **1**: 只完成一次问答，没有场景延展

**注意**：如果 opening 已经完成场景核心动作，通常 ≤ 2。

### anti_overteaching — 避免过度教学

NPC 是否保持对话感，不变成老师/纠错器/说明书。

- **5**: 保持 NPC 对话感，不主动长篇教学
- **3**: 有轻微说明感，但仍可接受
- **1**: 明显变成老师、纠错器、说明书或人生导师

## Bad Case Types（最多选 1 个 primary + 0-2 个 secondary）

只能使用以下 10 个类型：

1. \`setup_overlap\` — opening 和预填句功能重叠（opening 抢了用户要说的）
2. \`prefill_quality_issue\` — 预填句不自然、太长、或翻译腔
3. \`missing_referent\` — 预填句用了"这个/那个"但没有可见指代对象
4. \`intent_over_narrowed\` — 预填句把场景意图收窄到单一选项（如只问卡支付）
5. \`response_off_target\` — NPC response 没有回应用户实际意图
6. \`weak_continuation_hook\` — response1 没有把球抛回用户，难以继续
7. \`weak_scene_progression\` — 场景推进弱，容易原地空转
8. \`repetitive_response\` — NPC response 重复 opening 或预填句的内容
9. \`over_explaining\` — NPC response 变成解释/说明/教学
10. \`generic_or_monologue\` — NPC response 太泛化或变成独白

**注意**：\`intent_over_narrowed\` 需要比较 title/starterIntent，不要漏判。

## Root Cause Components（可选 1-2 个）

- \`scenario_entry\` — 场景入口设计问题
- \`npc_opening\` — NPC 开场白问题
- \`sample_user_line\` — 样例用户句问题
- \`micro_episode\` — 小剧情问题
- \`npc_prompt\` — NPC 系统提示问题
- \`scenario_injection\` — 场景注入方式问题
- \`model_behavior\` — 模型行为问题（非 scenario 设计问题）
- \`unknown\` — 不确定

**注意**：混合 case 可以列 2 个，用数组表示。

## Judge 注意事项

1. **不要偏好长回答**：短而自然可以高分，长而详细不等于好
2. **不要把"解释很多"误判为好**：over_explaining 是 bad case
3. **不要把"氛围好"误判为好接**：氛围好不等于 continuation_hook 强
4. **不要把所有问题都归因成 \`model_behavior\`**：先检查 scenario 设计
5. **如果 opening 抢了用户或 response 的功能**：优先考虑 \`setup_overlap\`，并降低多个维度分数
6. **如果 response1 没有把球抛回用户**：优先考虑 \`weak_continuation_hook\`，上限 3
7. **如果预填句锁死场景意图**：考虑 \`intent_over_narrowed\`
8. **每条最多 1 个 primary + 0-2 个 secondary badCaseType**
9. **细节写入 \`mainIssue\`**：不要靠 badCaseType 表达所有 nuance
10. **Mystery/atmosphere scenes 也必须有 handoff**：不要因为世界观好就宽容

## 输出格式

为每个 case 输出：

\`\`\`json
{
  "caseId": "...",
  "scores": {
    "setup_alignment": 1-5,
    "prefilled_line_quality": 1-5,
    "response_to_prefill": 1-5,
    "continuation_hook": 1-5,
    "scene_progression_potential": 1-5,
    "anti_overteaching": 1-5
  },
  "totalScore": sum of 6 scores,
  "primaryBadCaseType": "one of 10 types or null",
  "secondaryBadCaseTypes": ["up to 2 types"],
  "mainIssue": "detailed description of the main problem",
  "rootCauseComponent": ["1-2 components"],
  "suggestedFix": "optional suggestion",
  "confidence": "high/medium/low"
}
\`\`\`
`;
  
  const mdPath = join(DOCS_DIR, "guided-scenario-judge-prompt-v1.1.md");
  writeFileSync(mdPath, prompt, "utf-8");
  console.log(`Generated: ${mdPath}`);
}

function generateSemanticSetupAuditPlan() {
  const plan = `# Guided Scenario Semantic Setup Audit Plan

## 概述

下一阶段只评估 setup，不生成 npcResponse，不模拟用户，不调用项目 chat API。

输入是全量 scenario 的 setup 部分，输出是全量 setup 风险审查和 priority queue。

## 评测目标

识别 setup 阶段的设计问题，包括：

1. **opening-prefill 功能重叠**：npcOpening 是否抢了 sampleUserLineJa 的表达功能
2. **intent narrowing**：sampleUserLineJa 是否把 title/starterIntent 锁死到单一选项
3. **missing referent**：预填句是否使用无上下文的指代词
4. **prefill quality**：预填句是否自然、短、适合学习者
5. **opening 过长或过度 worldbuilding**：对 mystery/atmosphere 场景尤其重要

## 输入字段

每个 scenario 只需要以下 setup 字段：

- \`title\` — 场景标题
- \`category\` — 场景类别
- \`starterIntent\` — 用户意图
- \`microEpisode\` — 小剧情/场景背景
- \`npcOpening\` — NPC 开场白
- \`sampleUserLineJa\` — 预填用户句

## 输出格式

每个 scenario 输出：

\`\`\`json
{
  "scenarioId": "...",
  "setupRiskFlags": ["flag1", "flag2"],
  "setupRiskLevel": "high/medium/low",
  "primarySetupIssue": "description",
  "suggestedSetupFix": "optional suggestion",
  "priority": "P0/P1/P2"
}
\`\`\`

## Setup Risk Flags

只能使用以下 flags：

- \`opening_prefill_overlap\` — opening 和预填句功能重叠
- \`intent_narrowed\` — 预填句锁死场景意图
- \`missing_referent\` — 预填句缺少指代对象
- \`prefill_unnatural\` — 预填句不自然
- \`prefill_too_long\` — 预填句过长
- \`opening_overanswers\` — opening 提前完成共情/建议/解释
- \`opening_too_long\` — opening 过长
- \`opening_reveals_mystery\` — opening 提前揭示 mystery（仅 Saku/隐藏场景）
- \`no_clear_continuation_potential\` — setup 结构本身不支持多轮对话

## 评测流程

1. 读取全量 scenario setup 数据
2. 对每个 scenario 进行静态分析：
   - 比较 npcOpening 和 sampleUserLineJa 是否功能重叠
   - 比较 title/starterIntent 和 sampleUserLineJa 是否 intent narrowing
   - 检查 sampleUserLineJa 是否有指代词问题
   - 检查 npcOpening 是否过长或过度 worldbuilding
3. 生成 priority queue
4. 输出 setup audit report

## Priority 规则

- **P0**: 有 2+ high risk flags 或 \`opening_prefill_overlap\` + \`intent_narrowed\` 组合
- **P1**: 有 1 个 high risk flag 或 2+ medium risk flags
- **P2**: 只有低风险或无明显问题

## 与 Full Eval 的关系

Setup Audit 是 Full Eval 的前置步骤：

1. Setup Audit → 识别 setup 设计问题
2. Full Eval → 生成 npcResponse，测试真实链路
3. Calibration → 对比 human vs codex judge

Setup Audit 可以快速扫描全量 scenario，为 Full Eval 提供优先级指导。

## 文件结构

\`\`\`
.tmp/eval/guided-scenarios/
├── setup-audit/
│   ├── setup-audit-input.json      # 全量 setup 数据
│   ├── setup-audit-results.json    # audit 结果
│   ├── setup-audit-results.csv     # audit 结果（CSV）
│   └── setup-audit-summary.md      # 总结报告

docs/eval/
├── guided-scenario-semantic-setup-audit-plan.md  # 本计划文档
\`\`\`

## 与 Judge Prompt v1.1 的关系

Setup Audit 的 risk flags 与 Judge Prompt v1.1 的 badCaseTypes 有对应关系：

| Setup Risk Flag | Judge Bad Case Type |
|-----------------|---------------------|
| opening_prefill_overlap | setup_overlap |
| intent_narrowed | intent_over_narrowed |
| missing_referent | missing_referent |
| prefill_unnatural | prefill_quality_issue |
| opening_overanswers | setup_overlap (partial) |
| opening_reveals_mystery | setup_overlap (for mystery scenes) |

## 下一阶段任务

1. 实现 setup audit 脚本
2. 对全量 73 个 scenarios 进行 setup audit
3. 生成 priority queue
4. 选择 P0 cases 进行 full eval
`;
  
  const mdPath = join(DOCS_DIR, "guided-scenario-semantic-setup-audit-plan.md");
  writeFileSync(mdPath, plan, "utf-8");
  console.log(`Generated: ${mdPath}`);
}

function backupFiles() {
  mkdirSync(BACKUP_DIR, { recursive: true });
  
  const filesToBackup = [
    join(CALIBRATION_DIR, "human-gold.csv"),
    join(CALIBRATION_DIR, "codex-blind-judge-results.json"),
  ];
  
  for (const file of filesToBackup) {
    if (existsSync(file)) {
      const basename = file.split(/[/\\]/).pop();
      const backupPath = join(BACKUP_DIR, `${TIMESTAMP}_${basename}`);
      copyFileSync(file, backupPath);
      console.log(`Backed up: ${backupPath}`);
    }
  }
}

function main() {
  console.log("=== Generate Comparison Report ===\n");
  
  console.log("Step 1: Backup files");
  backupFiles();
  
  console.log("\nStep 2: Read human and codex results");
  const humanResults = readHumanGold();
  const codexResults = readCodexResults();
  console.log(`Human results: ${humanResults.length}`);
  console.log(`Codex results: ${codexResults.length}`);
  
  console.log("\nStep 3: Generate comparison CSV");
  generateComparisonCsv(humanResults, codexResults);
  
  console.log("\nStep 4: Generate comparison MD");
  generateComparisonMd(humanResults, codexResults);
  
  console.log("\nStep 5: Generate judge prompt v1.1");
  generateJudgePromptV1_1();
  
  console.log("\nStep 6: Generate semantic setup audit plan");
  generateSemanticSetupAuditPlan();
  
  console.log("\n=== Summary ===");
  
  // Calculate summary statistics
  const primaryMatches = humanResults.filter(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex && checkPrimaryMatch(h, codex);
  });
  
  const totalDiffs = humanResults.map(h => {
    const codex = codexResults.find(c => c.caseId === h.caseId);
    return codex ? (codex.total_score || 0) - h.total_score : 0;
  });
  
  const avgTotalDiff = totalDiffs.reduce((a, b) => a + b, 0) / totalDiffs.length;
  
  console.log(`Primary exact match: ${primaryMatches.length}/${humanResults.length}`);
  console.log(`Average total_score diff: ${avgTotalDiff.toFixed(2)}`);
  console.log("\nDone.");
}

main();