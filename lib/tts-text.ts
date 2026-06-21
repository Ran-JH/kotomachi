import type { NpcId } from "@/lib/npc";

export const TTS_TEXT_NORMALIZATION_VERSION = "v0-2026-06-22-date-v1";

const TTS_READING_OVERRIDES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /(^|[^A-Za-z])VNL(?=[^A-Za-z]|$)/g, replacement: "$1ブイエヌエル" },
  { pattern: /(^|[^A-Za-z])AI(?=[^A-Za-z]|$)/g, replacement: "$1エーアイ" },
  { pattern: /(^|[^A-Za-z])JLPT(?=[^A-Za-z]|$)/g, replacement: "$1ジェイエルピーティー" },
  { pattern: /(^|[^A-Za-z])TOEFL(?=[^A-Za-z]|$)/g, replacement: "$1トーフル" },
  { pattern: /(^|[^A-Za-z])SNS(?=[^A-Za-z]|$)/g, replacement: "$1エスエヌエス" },
  { pattern: /(^|[^A-Za-z])LINE(?=[^A-Za-z]|$)/g, replacement: "$1ライン" },
  { pattern: /(^|[^A-Za-z])GPT(?=[^A-Za-z]|$)/g, replacement: "$1ジーピーティー" },
  { pattern: /(^|[^A-Za-z])API(?=[^A-Za-z]|$)/g, replacement: "$1エーピーアイ" },
  { pattern: /(^|[^A-Za-z])Wi(?:-|\s)?Fi(?=[^A-Za-z]|$)/gi, replacement: "$1ワイファイ" },
];

const JAPANESE_MONTH_READINGS: Record<number, string> = {
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

const JAPANESE_DAY_SPECIAL_READINGS: Record<number, string> = {
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

function isEmojiOrDecoration(char: string): boolean {
  const codePoint = char.codePointAt(0);
  if (codePoint === undefined) return false;

  return (
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf) ||
    codePoint === 0xfe0f ||
    codePoint === 0x200d
  );
}

function stripEmojiAndDecoration(text: string): string {
  return Array.from(text)
    .filter((char) => !isEmojiOrDecoration(char))
    .join("");
}

function applyReadingOverrides(text: string): string {
  return TTS_READING_OVERRIDES.reduce(
    (current, rule) => current.replace(rule.pattern, rule.replacement),
    text,
  );
}

function getJapaneseNumberReading(value: number): string {
  if (!Number.isInteger(value) || value < 0) return "";
  if (value === 0) return "ぜろ";
  if (value < 10) {
    return ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"][value];
  }
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    const tenText = tens === 1 ? "じゅう" : `${getJapaneseNumberReading(tens)}じゅう`;
    return `${tenText}${ones === 0 ? "" : getJapaneseNumberReading(ones)}`;
  }
  if (value < 1000) {
    const hundreds = Math.floor(value / 100);
    const remainder = value % 100;
    const hundredText =
      hundreds === 1
        ? "ひゃく"
        : hundreds === 3
          ? "さんびゃく"
          : hundreds === 6
            ? "ろっぴゃく"
            : hundreds === 8
              ? "はっぴゃく"
              : `${getJapaneseNumberReading(hundreds)}ひゃく`;
    return `${hundredText}${remainder === 0 ? "" : getJapaneseNumberReading(remainder)}`;
  }
  if (value < 10000) {
    const thousands = Math.floor(value / 1000);
    const remainder = value % 1000;
    const thousandText =
      thousands === 1
        ? "せん"
        : thousands === 3
          ? "さんぜん"
          : thousands === 8
            ? "はっせん"
            : `${getJapaneseNumberReading(thousands)}せん`;
    return `${thousandText}${remainder === 0 ? "" : getJapaneseNumberReading(remainder)}`;
  }

  return String(value)
    .split("")
    .map((digit) => getJapaneseNumberReading(Number(digit)))
    .join("");
}

function getJapaneseDateDayReading(day: number): string {
  if (JAPANESE_DAY_SPECIAL_READINGS[day]) {
    return JAPANESE_DAY_SPECIAL_READINGS[day];
  }
  if (day >= 1 && day <= 31) {
    return `${getJapaneseNumberReading(day)}にち`;
  }
  return "";
}

function shouldInsertPauseAfterDate(text: string, endIndex: number): boolean {
  const rest = text.slice(endIndex);
  return ["か", "かな", "ね", "よ", "な", "です", "でした", "ですね", "だね"].some((marker) =>
    rest.startsWith(marker),
  );
}

function replaceWithDateReading(
  text: string,
  pattern: RegExp,
  reader: (match: RegExpExecArray) => string | null,
): string {
  let result = "";
  let lastIndex = 0;
  const globalPattern = new RegExp(
    pattern.source,
    pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`,
  );
  let match: RegExpExecArray | null;

  while ((match = globalPattern.exec(text)) !== null) {
    if (match.index === undefined) continue;
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

    // 防御性处理，避免零宽匹配时死循环。
    if (match[0].length === 0) {
      globalPattern.lastIndex += 1;
    }
  }

  result += text.slice(lastIndex);
  return result;
}

function normalizeDateExpressions(text: string): string {
  const replaceDateParts = (
    year: number | null,
    month: number,
    day: number,
  ): string | null => {
    const monthReading = JAPANESE_MONTH_READINGS[month];
    const dayReading = getJapaneseDateDayReading(day);
    if (!monthReading || !dayReading) return null;

    if (year === null) {
      return `${monthReading}${dayReading}`;
    }

    const yearReading = getJapaneseNumberReading(year);
    if (!yearReading) return null;
    return `${yearReading}ねん${monthReading}${dayReading}`;
  };

  let normalized = text;

  normalized = replaceWithDateReading(
    normalized,
    /(\d{4})\/(\d{1,2})\/(\d{1,2})/g,
    (match) => replaceDateParts(Number(match[1]), Number(match[2]), Number(match[3])),
  );

  normalized = replaceWithDateReading(
    normalized,
    /(^|[^\d])(\d{1,2})\/(\d{1,2})(?=$|[^\d])/g,
    (match) => {
      const prefix = match[1] ?? "";
      const dateReading = replaceDateParts(null, Number(match[2]), Number(match[3]));
      return dateReading ? `${prefix}${dateReading}` : null;
    },
  );

  normalized = replaceWithDateReading(
    normalized,
    /(\d{4})年(\d{1,2})月(\d{1,2})日/g,
    (match) => replaceDateParts(Number(match[1]), Number(match[2]), Number(match[3])),
  );

  normalized = replaceWithDateReading(
    normalized,
    /(\d{1,2})月(\d{1,2})日/g,
    (match) => replaceDateParts(null, Number(match[1]), Number(match[2])),
  );

  return normalized;
}

function normalizeNonDateNumbers(text: string): string {
  return text.replace(/(^|[^\d])(\d+)\.(\d{1,2})(?=$|[^\d])/g, "$1$2点$3");
}

function normalizePausePunctuation(text: string): string {
  return text
    .replace(/(\.\s*){3,}|…{2,}|⋯{2,}/g, "……")
    .replace(/、{2,}/g, "、")
    .replace(/。{2,}/g, "。")
    .replace(/[!！?？]{3,}/g, (match) => match.slice(0, 2))
    .replace(/[ \t\u3000]+/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\n{2,}/g, "。\n")
    .replace(/\n/g, "、")
    .replace(/\s*([、。!?！？])\s*/g, "$1")
    .replace(/([、。]){2,}/g, (match) => match.slice(-1))
    .replace(/。([!?！？])/g, "$1")
    .replace(/、([。!?！？])/g, "$1");
}

export function normalizeTextForTts(
  text: string,
  options?: { npcId?: NpcId },
): string {
  void options?.npcId;

  return normalizePausePunctuation(
    normalizeNonDateNumbers(
      normalizeDateExpressions(
        applyReadingOverrides(stripEmojiAndDecoration(text)),
      ),
    ),
  )
    .trim()
    .replace(/^、+|、+$/g, "")
    .replace(/^。+|。+$/g, "");
}
