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

export function normalizeTextForTts(text: string): string {
  return stripEmojiAndDecoration(text)
    .replace(/[（(]\s*笑\s*[）)]/g, "、")
    .replace(/[（(]\s*笑/g, "、")
    .replace(/笑\s*[）)]/g, "、")
    .replace(/(^|[\s　。、！？!?])笑(?=($|[\s　。、！？!?]))/g, "$1、")
    .replace(/(^|[\s　。、！？!?])[wｗ]+(?=($|[\s　。、！？!?]))/gi, "$1、")
    .replace(/(?<![A-Za-z])[wｗ]+(?=($|[\s　。、！？!?]))/g, "、")
    .replace(/[ \t　]+/g, " ")
    .replace(/、{2,}/g, "、")
    .replace(/、([。！？!?])/g, "$1")
    .replace(/([。！？!?])、/g, "$1")
    .replace(/\s*([。、！？!?])\s*/g, "$1")
    .replace(/、{2,}/g, "、")
    .replace(/^、+|、+$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
