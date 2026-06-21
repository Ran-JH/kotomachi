#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { randomUUID } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const TTS_URL = "https://openspeech.bytedance.com/api/v1/tts";
const DEFAULT_CLUSTER = "volcano_tts";
const DEFAULT_ENCODING = "mp3";
const DEFAULT_LANGUAGE = "ja";
const DEFAULT_TEXT_TYPE = "plain";
const DEFAULT_OPERATION = "query";
const DEFAULT_LIMIT = 60;
const OUTPUT_DIR = path.join(REPO_ROOT, ".tmp", "tts-audition");
const AUDITION_INDEX_PATH = path.join(OUTPUT_DIR, "audition-index.md");

const BASELINE_VOICE_TYPES = ["BV421_streaming", "BV524_streaming"];

// 这里留空，方便你直接在脚本顶部补 1-2 个临时候选音色做本地试听。
const EXTRA_CANDIDATE_VOICE_TYPES = [];

const DEFAULT_AUDIO_OPTIONS = {
  speedRatio: 1,
  pitchRatio: 1,
  volumeRatio: 1,
  language: DEFAULT_LANGUAGE,
};

const NPC_FIXTURES = [
  {
    npcId: "misaki",
    sentences: [
      "いらっしゃいませ。今日は少し落ち着いた時間が流れてるみたいですね。",
      "今日はアイスコーヒーが似合う日ですね。よかったら、ゆっくりしていってください。",
      "ええと……6月20日に面接があるんですね。少し緊張しますよね。",
    ],
  },
  {
    npcId: "kimura",
    sentences: [
      "あ、また来たね。今日も雨すごいな……店内でゆっくりしてってよ。",
      "ペットボトルと缶で分かれてるから、迷ったら言って。",
      "VNLの試合、見ました？AIで日本語の練習もしてるんだっけ。",
    ],
  },
  {
    npcId: "taisho",
    sentences: [
      "おう、また来たな。今日は無理せず、あったかいもんでも食ってけ。",
      "できることを少しずつやるしかないよな。一つずつ頑張ろう。",
      "LINEで送ってくれてもいいぞ。急がなくて大丈夫だ。",
    ],
  },
  {
    npcId: "saku",
    sentences: [
      "……こんばんは。こんな時間に来る人は、あまり多くないんだ。",
      "夜の街は、昼より少しだけ本音が聞こえやすい気がする。",
      "JLPT N1を持っていても、話すのはまた別の練習だよね。",
    ],
  },
  {
    npcId: "aoi",
    sentences: [
      "それ、めっちゃ分かる。最初の一言って、意外と迷うよね。",
      "じゃあ、今日は軽く一言だけ言ってみよっか。完璧じゃなくていいし。",
      "SNSで見た表現って、実際に使うとちょっと雰囲気が違うことあるよね。",
    ],
  },
  {
    npcId: "haruka",
    sentences: [
      "発表の準備、少しずつ進めれば大丈夫ですよ。まずは概要だけ整理しましょう。",
      "研究室だと、最初は質問するだけでも少し緊張しますよね。",
      "APIの設定は確認できましたか。分からないところから一緒に見ましょう。",
    ],
  },
];

const READING_OVERRIDES = [
  { pattern: /(^|[^A-Za-z])VNL(?=[^A-Za-z]|$)/g, replacement: "$1ブイエヌエル" },
  { pattern: /(^|[^A-Za-z])AI(?=[^A-Za-z]|$)/g, replacement: "$1エーアイ" },
  { pattern: /(^|[^A-Za-z])JLPT(?=[^A-Za-z]|$)/g, replacement: "$1ジェイエルピーティー" },
  { pattern: /(^|[^A-Za-z])SNS(?=[^A-Za-z]|$)/g, replacement: "$1エスエヌエス" },
  { pattern: /(^|[^A-Za-z])LINE(?=[^A-Za-z]|$)/g, replacement: "$1ライン" },
  { pattern: /(^|[^A-Za-z])API(?=[^A-Za-z]|$)/g, replacement: "$1エーピーアイ" },
];

const JAPANESE_MONTH_READINGS = {
  1: "いちがつ",
  2: "にがつ",
  3: "さんがつ",
  4: "しがつ",
  5: "ごがつ",
  6: "ろくがつ",
  7: "しちがつ",
  8: "はちがつ",
  9: "くがつ",
  10: "じゅうがつ",
  11: "じゅういちがつ",
  12: "じゅうにがつ",
};

const JAPANESE_DAY_SPECIAL_READINGS = {
  1: "ついたち",
  2: "ふつか",
  3: "みっか",
  4: "よっか",
  5: "いつか",
  6: "むいか",
  7: "なのか",
  8: "ようか",
  9: "ここのか",
  10: "とおか",
  14: "じゅうよっか",
  20: "はつか",
  24: "にじゅうよっか",
};

function printUsage() {
  console.log("Kotomachi classic volcano TTS audition matrix");
  console.log("");
  console.log("Dry run:");
  console.log("  node scripts/tts-audition-matrix.mjs");
  console.log("");
  console.log("Generate audio:");
  console.log("  node scripts/tts-audition-matrix.mjs --confirm");
  console.log("");
  console.log("With a smaller batch:");
  console.log("  node scripts/tts-audition-matrix.mjs --confirm --limit=6");
  console.log("");
  console.log("Optional candidates file:");
  console.log(
    "  node scripts/tts-audition-matrix.mjs --confirm --candidates=./scripts/tts-audition-candidates.example.json"
  );
}

function parseArgs(argv) {
  const options = {
    confirm: false,
    limit: DEFAULT_LIMIT,
    candidatesPath: null,
    help: false,
  };

  for (const arg of argv) {
    if (arg === "--confirm") {
      options.confirm = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg.startsWith("--limit=")) {
      const value = Number(arg.slice("--limit=".length));
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error("--limit 必须是正整数。");
      }
      options.limit = Math.min(value, DEFAULT_LIMIT);
      continue;
    }
    if (arg.startsWith("--candidates=")) {
      const rawPath = arg.slice("--candidates=".length).trim();
      if (!rawPath) {
        throw new Error("--candidates 不能为空。");
      }
      options.candidatesPath = path.resolve(process.cwd(), rawPath);
      continue;
    }

    throw new Error(`无法识别的参数: ${arg}`);
  }

  return options;
}

async function loadCandidateVoiceTypes(candidatesPath) {
  if (!candidatesPath) return [];

  const raw = await readFile(candidatesPath, "utf8");
  const data = JSON.parse(raw);
  const voiceTypes = Array.isArray(data)
    ? data
    : Array.isArray(data.candidateVoiceTypes)
      ? data.candidateVoiceTypes
      : [];

  if (!Array.isArray(voiceTypes)) {
    throw new Error("candidates 文件格式不正确，应为字符串数组，或包含 candidateVoiceTypes 数组。");
  }

  return voiceTypes.filter((value) => typeof value === "string" && value.trim());
}

function dedupeVoiceTypes(voiceTypes) {
  return [...new Set(voiceTypes.map((value) => value.trim()).filter(Boolean))];
}

function shouldIgnoreCandidateVoiceType(value) {
  const normalized = value.trim().toUpperCase();
  return normalized.includes("PASTE_") || normalized.includes("PLACEHOLDER");
}

function normalizeCandidateVoiceTypes(voiceTypes) {
  const valid = [];
  const ignored = [];

  for (const value of voiceTypes) {
    if (typeof value !== "string") {
      ignored.push(String(value));
      continue;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      ignored.push("(empty)");
      continue;
    }

    if (shouldIgnoreCandidateVoiceType(trimmed)) {
      ignored.push(trimmed);
      continue;
    }

    valid.push(trimmed);
  }

  return {
    valid: dedupeVoiceTypes(valid),
    ignored: dedupeVoiceTypes(ignored),
  };
}

function isEmojiOrDecoration(char) {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return false;

  return (
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
    codePoint === 0xfe0f ||
    codePoint === 0x200d
  );
}

function stripEmojiAndDecoration(text) {
  return Array.from(text)
    .filter((char) => !isEmojiOrDecoration(char))
    .join("");
}

function applyReadingOverrides(text) {
  return READING_OVERRIDES.reduce(
    (current, rule) => current.replace(rule.pattern, rule.replacement),
    text
  );
}

function getJapaneseNumberReading(value) {
  if (!Number.isInteger(value) || value < 0) return "";
  if (value === 0) return "ぜろ";

  const ones = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

  if (value < 10) return ones[value];

  if (value < 100) {
    const tens = Math.floor(value / 10);
    const rest = value % 10;
    const tensText = tens === 1 ? "じゅう" : `${ones[tens]}じゅう`;
    return `${tensText}${rest === 0 ? "" : getJapaneseNumberReading(rest)}`;
  }

  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const rest = value % 100;
    const hundredsText =
      hundreds === 1
        ? "ひゃく"
        : hundreds === 3
          ? "さんびゃく"
          : hundreds === 6
            ? "ろっぴゃく"
            : hundreds === 8
              ? "はっぴゃく"
              : `${getJapaneseNumberReading(hundreds)}ひゃく`;
    return `${hundredsText}${rest === 0 ? "" : getJapaneseNumberReading(rest)}`;
  }

  if (value < 10000) {
    const thousands = Math.floor(value / 1000);
    const rest = value % 1000;
    const thousandsText =
      thousands === 1
        ? "せん"
        : thousands === 3
          ? "さんぜん"
          : thousands === 8
            ? "はっせん"
            : `${getJapaneseNumberReading(thousands)}せん`;
    return `${thousandsText}${rest === 0 ? "" : getJapaneseNumberReading(rest)}`;
  }

  return String(value)
    .split("")
    .map((digit) => getJapaneseNumberReading(Number(digit)))
    .join("");
}

function getJapaneseDateDayReading(day) {
  if (JAPANESE_DAY_SPECIAL_READINGS[day]) {
    return JAPANESE_DAY_SPECIAL_READINGS[day];
  }
  if (day >= 1 && day <= 31) {
    return `${getJapaneseNumberReading(day)}にち`;
  }
  return "";
}

function shouldInsertPauseAfterDate(text, endIndex) {
  const rest = text.slice(endIndex);
  return ["です", "でした", "ですね", "だ", "かな", "よね"].some((marker) =>
    rest.startsWith(marker)
  );
}

function replaceWithDateReading(text, pattern, reader) {
  let result = "";
  let lastIndex = 0;
  const globalPattern = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`
  );
  let match;

  while ((match = globalPattern.exec(text)) !== null) {
    result += text.slice(lastIndex, match.index);
    const reading = reader(match);

    if (!reading) {
      result += match[0];
      lastIndex = match.index + match[0].length;
      continue;
    }

    const needsPause = shouldInsertPauseAfterDate(text, match.index + match[0].length);
    result += needsPause ? `${reading}、` : reading;
    lastIndex = match.index + match[0].length;

    if (match[0].length === 0) {
      globalPattern.lastIndex += 1;
    }
  }

  result += text.slice(lastIndex);
  return result;
}

function normalizeDateExpressions(text) {
  const replaceDateParts = (year, month, day) => {
    const monthReading = JAPANESE_MONTH_READINGS[month];
    const dayReading = getJapaneseDateDayReading(day);
    if (!monthReading || !dayReading) return null;

    if (year === null) {
      return `${monthReading}${dayReading}`;
    }

    const yearReading = getJapaneseNumberReading(year);
    return yearReading ? `${yearReading}ねん${monthReading}${dayReading}` : null;
  };

  let normalized = text;

  normalized = replaceWithDateReading(
    normalized,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
    (match) => replaceDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
  );

  normalized = replaceWithDateReading(
    normalized,
    /(^|[^\d])(\d{1,2})\/(\d{1,2})(?=$|[^\d])/g,
    (match) => {
      const prefix = match[1] ?? "";
      const dateReading = replaceDateParts(null, Number(match[2]), Number(match[3]));
      return dateReading ? `${prefix}${dateReading}` : null;
    }
  );

  normalized = replaceWithDateReading(
    normalized,
    /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
    (match) => replaceDateParts(Number(match[1]), Number(match[2]), Number(match[3]))
  );

  normalized = replaceWithDateReading(
    normalized,
    /(\d{1,2})月(\d{1,2})日/g,
    (match) => replaceDateParts(null, Number(match[1]), Number(match[2]))
  );

  return normalized;
}

function normalizeNonDateNumbers(text) {
  return text.replace(/(^|[^\d])(\d+)\.(\d{1,2})(?=$|[^\d])/g, "$1$2点$3");
}

function normalizePausePunctuation(text) {
  return text
    .replace(/(\.\s*){3,}|…{2,}|⋯{2,}/g, "……")
    .replace(/、{2,}/g, "、")
    .replace(/。{2,}/g, "。")
    .replace(/[!！?？]{3,}/g, (match) => match.slice(0, 2))
    .replace(/[ \t\u3000]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "。\n")
    .replace(/\n/g, "。")
    .replace(/\s*([、。.!?！？])\s*/g, "$1")
    .replace(/([、。]){2,}/g, (match) => match.slice(-1))
    .replace(/。([!?！？])/g, "$1")
    .replace(/^。+|。+$/g, "");
}

function normalizeTextForTts(text) {
  return normalizePausePunctuation(
    normalizeNonDateNumbers(
      normalizeDateExpressions(applyReadingOverrides(stripEmojiAndDecoration(text)))
    )
  ).trim();
}

function getSpeechCredentials() {
  const appId = process.env.VOLCENGINE_SPEECH_APP_ID ?? "";
  const token =
    process.env.VOLCENGINE_SPEECH_ACCESS_TOKEN ??
    process.env.VOLCENGINE_SPEECH_API_KEY ??
    "";

  if (!token) {
    throw new Error(
      "缺少火山 TTS 凭据。请先在当前终端设置 VOLCENGINE_SPEECH_ACCESS_TOKEN（或 VOLCENGINE_SPEECH_API_KEY）。"
    );
  }

  if (!appId && !process.env.VOLCENGINE_SPEECH_API_KEY) {
    throw new Error(
      "classic 火山 TTS 需要 VOLCENGINE_SPEECH_APP_ID + VOLCENGINE_SPEECH_ACCESS_TOKEN。"
    );
  }

  return {
    appId: appId || token.slice(0, 8),
    token,
    cluster: process.env.VOLCENGINE_SPEECH_CLUSTER ?? DEFAULT_CLUSTER,
  };
}

function sanitizeVoiceType(voiceType) {
  return voiceType.replace(/[^A-Za-z0-9_-]/g, "_");
}

function buildFilename({ npcId, voiceType, sentenceIndex }) {
  return `${npcId}__${sanitizeVoiceType(voiceType)}__s${sentenceIndex}.mp3`;
}

function buildAuditionRows(voiceTypes) {
  const rows = [];

  for (const fixture of NPC_FIXTURES) {
    fixture.sentences.forEach((sentence, index) => {
      const sentenceIndex = index + 1;
      const normalizedText = normalizeTextForTts(sentence);

      for (const voiceType of voiceTypes) {
        rows.push({
          npcId: fixture.npcId,
          voiceType,
          sentenceIndex,
          originalText: sentence,
          normalizedText,
          fileName: buildFilename({
            npcId: fixture.npcId,
            voiceType,
            sentenceIndex,
          }),
        });
      }
    });
  }

  return rows;
}

async function writeAuditionIndex(rows, options) {
  const lines = [
    "# TTS Audition Matrix",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Confirmed generation: ${options.confirm ? "yes" : "no (dry-run only)"}`,
    `- Selected rows: ${rows.length}`,
    `- Candidate voice types: ${options.voiceTypes.join(", ") || "(none)"}`,
    `- Audio defaults: speed=${DEFAULT_AUDIO_OPTIONS.speedRatio}, pitch=${DEFAULT_AUDIO_OPTIONS.pitchRatio}, volume=${DEFAULT_AUDIO_OPTIONS.volumeRatio}, language=${DEFAULT_AUDIO_OPTIONS.language}`,
    "",
    "> 评分建议：自然度 / 清晰度 / NPC适配 / 长期耐听 / 读错风险 / 综合保留 / 备注",
    "",
  ];

  rows.forEach((row, index) => {
    lines.push(`## ${index + 1}. ${row.npcId} / ${row.voiceType} / s${row.sentenceIndex}`);
    lines.push("");
    lines.push(`- NPC: ${row.npcId}`);
    lines.push(`- voiceType: ${row.voiceType}`);
    lines.push(`- sentence index: ${row.sentenceIndex}`);
    lines.push(`- original text: ${row.originalText}`);
    lines.push(`- normalized text: ${row.normalizedText || "(same as original / empty after normalization)"}`);
    lines.push(`- mp3 filename: ${row.fileName}`);
    lines.push(`- 自然度: `);
    lines.push(`- 清晰度: `);
    lines.push(`- NPC适配: `);
    lines.push(`- 长期耐听: `);
    lines.push(`- 读错风险: `);
    lines.push(`- 综合保留: `);
    lines.push(`- 备注: `);
    lines.push("");
  });

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(AUDITION_INDEX_PATH, `${lines.join("\n")}\n`, "utf8");
}

async function synthesizeClassicVolcTts(row, credentials) {
  const reqid = randomUUID();
  const body = {
    app: {
      appid: credentials.appId,
      token: credentials.token,
      cluster: credentials.cluster,
    },
    user: { uid: "kotomachi_audition" },
    audio: {
      voice_type: row.voiceType,
      encoding: DEFAULT_ENCODING,
      speed_ratio: DEFAULT_AUDIO_OPTIONS.speedRatio,
      volume_ratio: DEFAULT_AUDIO_OPTIONS.volumeRatio,
      pitch_ratio: DEFAULT_AUDIO_OPTIONS.pitchRatio,
      language: DEFAULT_AUDIO_OPTIONS.language,
    },
    request: {
      reqid,
      text: row.normalizedText || row.originalText,
      text_type: DEFAULT_TEXT_TYPE,
      operation: DEFAULT_OPERATION,
    },
  };

  const response = await fetch(TTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer;${credentials.token}`,
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let data;

  try {
    data = JSON.parse(rawText);
  } catch {
    throw new Error(
      `TTS 返回了非 JSON 响应。npc=${row.npcId} voiceType=${row.voiceType} status=${response.status}`
    );
  }

  const success = response.ok && data.code === 3000 && typeof data.data === "string";
  if (!success) {
    const volcMessage = typeof data.message === "string" ? data.message : "unknown";
    const volcCode = typeof data.code === "number" ? data.code : "unknown";
    throw new Error(
      `TTS 合成失败。npc=${row.npcId} voiceType=${row.voiceType} http=${response.status} code=${volcCode} message=${volcMessage}`
    );
  }

  return Buffer.from(data.data, "base64");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printUsage();
    return;
  }

  const fileCandidates = await loadCandidateVoiceTypes(options.candidatesPath);
  const candidateSummary = normalizeCandidateVoiceTypes([
    ...BASELINE_VOICE_TYPES,
    ...EXTRA_CANDIDATE_VOICE_TYPES,
    ...fileCandidates,
  ]);
  const voiceTypes = candidateSummary.valid;
  const allRows = buildAuditionRows(voiceTypes);
  const selectedRows = allRows.slice(0, options.limit);

  await writeAuditionIndex(selectedRows, {
    confirm: options.confirm,
    voiceTypes,
  });

  console.log("Kotomachi classic volcano TTS audition matrix");
  console.log(`Effective candidate voice types: ${voiceTypes.join(", ") || "(none)"}`);
  if (candidateSummary.ignored.length > 0) {
    console.log(`Ignored candidate values: ${candidateSummary.ignored.join(", ")}`);
  }
  console.log(`Total planned rows: ${allRows.length}`);
  console.log(`Selected rows after limit (${options.limit}): ${selectedRows.length}`);
  console.log(`Audition index: ${AUDITION_INDEX_PATH}`);
  console.log(`Audio output dir: ${OUTPUT_DIR}`);

  if (!options.confirm) {
    console.log("");
    console.log("Dry-run only. 未调用 TTS API。");
    console.log("如需真正生成音频，请显式加上 --confirm。");
    console.log("如果 .tmp/tts-audition/ 不在 gitignore，请不要提交生成出来的 mp3。");
    return;
  }

  const credentials = getSpeechCredentials();
  await mkdir(OUTPUT_DIR, { recursive: true });

  let generated = 0;

  for (const row of selectedRows) {
    const audioBuffer = await synthesizeClassicVolcTts(row, credentials);
    const outputPath = path.join(OUTPUT_DIR, row.fileName);
    await writeFile(outputPath, audioBuffer);
    generated += 1;
    console.log(`[${generated}/${selectedRows.length}] wrote ${row.fileName}`);
  }

  console.log("");
  console.log(`Generation completed. MP3 files written: ${generated}`);
  console.log(`Audition index refreshed: ${AUDITION_INDEX_PATH}`);
  console.log("请记得不要把生成的 mp3 提交到 Git。");
}

main().catch((error) => {
  console.error("TTS audition matrix failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
