import type { NpcId } from "@/lib/npc";

export const TTS_TEXT_NORMALIZATION_VERSION = "v0-2026-06-21";

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

function normalizeDatesAndNumbers(text: string): string {
  return text
    .replace(/\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/g, "$1年$2月$3日")
    .replace(/(^|[^\d])(\d{1,2})\/(\d{1,2})(?=$|[^\d])/g, "$1$2月$3日")
    .replace(/(^|[^\d])(\d+)\.(\d{1,2})(?=$|[^\d])/g, "$1$2点$3");
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
    normalizeDatesAndNumbers(
      applyReadingOverrides(stripEmojiAndDecoration(text)),
    ),
  )
    .trim()
    .replace(/^、+|、+$/g, "")
    .replace(/^。+|。+$/g, "");
}
