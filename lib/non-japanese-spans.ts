import type { SummaryNonJapaneseSpan } from "@/lib/session-summary";

interface SourceMessage {
  id: string;
  text: string;
}

const ENGLISH_PATTERN = /[A-Za-z][A-Za-z0-9'’-]*(?:\s+[A-Za-z][A-Za-z0-9'’-]*)*/g;

const CHINESE_SIGNAL_WORDS = [
  "我",
  "你",
  "他",
  "她",
  "们",
  "是",
  "不是",
  "没有",
  "觉得",
  "因为",
  "所以",
  "但是",
  "然后",
  "今天",
  "明天",
  "昨天",
  "现在",
  "这个",
  "那个",
  "可以",
  "需要",
  "想",
  "一点",
  "有点",
  "如果",
  "时候",
];

function isCjkChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x4e00 && code <= 0x9fff;
}

function containsLikelyChinese(segment: string): boolean {
  if (segment.length < 2) return false;
  return CHINESE_SIGNAL_WORDS.some((word) => segment.includes(word));
}

function createSpanId(messageId: string, index: number): string {
  return `span-${messageId}-${index}`;
}

export function detectNonJapaneseSpans(messages: SourceMessage[]): SummaryNonJapaneseSpan[] {
  const spans: SummaryNonJapaneseSpan[] = [];

  messages.forEach((message) => {
    let index = 0;
    ENGLISH_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = ENGLISH_PATTERN.exec(message.text)) !== null) {
      const span = match[0].trim();
      if (span.length < 2) continue;
      spans.push({
        id: createSpanId(message.id, index++),
        messageId: message.id,
        originalMessage: message.text,
        span,
        languageGuess: "en",
        confidence: "high",
      });
    }

    let current = "";
    for (const char of Array.from(message.text)) {
      if (isCjkChar(char)) {
        current += char;
      } else {
        if (containsLikelyChinese(current)) {
          spans.push({
            id: createSpanId(message.id, index++),
            messageId: message.id,
            originalMessage: message.text,
            span: current,
            languageGuess: "zh",
            confidence: "medium",
          });
        }
        current = "";
      }
    }

    if (containsLikelyChinese(current)) {
      spans.push({
        id: createSpanId(message.id, index++),
        messageId: message.id,
        originalMessage: message.text,
        span: current,
        languageGuess: "zh",
        confidence: "medium",
      });
    }
  });

  const mergedByMessage = new Map<string, SummaryNonJapaneseSpan[]>();
  for (const span of spans) {
    const list = mergedByMessage.get(span.messageId) ?? [];
    list.push(span);
    mergedByMessage.set(span.messageId, list);
  }

  const merged: SummaryNonJapaneseSpan[] = [];
  mergedByMessage.forEach((items) => {
    const englishItems = items.filter((item) => item.languageGuess === "en");
    const nonEnglishItems = items.filter((item) => item.languageGuess !== "en");

    if (englishItems.length >= 2) {
      const originalMessage = englishItems[0].originalMessage.trim();
      if (originalMessage.length >= 12) {
        merged.push({
          id: `${englishItems[0].id}-merged`,
          messageId: englishItems[0].messageId,
          originalMessage: englishItems[0].originalMessage,
          span: originalMessage,
          languageGuess: "en",
          confidence: "high",
        });
      }
    } else if (englishItems.length === 1) {
      merged.push(englishItems[0]);
    }

    merged.push(...nonEnglishItems);
  });

  return merged.slice(0, 8);
}
