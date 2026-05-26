const EMOJI_AND_DECORATION_PATTERN =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

export function normalizeTextForTts(text: string): string {
  return text
    .replace(/[（(]\s*笑\s*[）)]/g, "、")
    .replace(/[（(]\s*笑/g, "、")
    .replace(/笑\s*[）)]/g, "、")
    .replace(/(^|[\s　。、！？!?])笑(?=($|[\s　。、！？!?]))/g, "$1、")
    .replace(/(^|[\s　。、！？!?])[wｗ]+(?=($|[\s　。、！？!?]))/gi, "$1、")
    .replace(/(?<![A-Za-z])[wｗ]+(?=($|[\s　。、！？!?]))/g, "、")
    .replace(EMOJI_AND_DECORATION_PATTERN, "")
    .replace(/[ \t　]+/g, " ")
    .replace(/、{2,}/g, "、")
    .replace(/、([。！？!?])/g, "$1")
    .replace(/([。！？!?])、/g, "$1")
    .replace(/\s*([。、！？!?])\s*/g, "$1")
    .replace(/^、|、$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
