import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";

export const runtime = "nodejs";

interface ExplainResponse {
  pronunciation: string;
  pronunciations?: string[];
  translation: string;
  sentence_meaning: string;
  nuance_explanation: string;
  word?: string;
  originalSelection?: string;
  wasCorrected?: boolean;
}

const SYSTEM_PROMPT: ChatCompletionMessageParam = {
  role: "system",
  content: `你是 Kotomachi 的划词查词助手。语气要轻松，但信息必须准确、有学习价值。

用户会给你一个被划选的日语词/短语/句子（selectedText）和它所在的完整句子（fullSentence）。
你要先判断 selectedText 是单词、短语，还是较长句子。

输出严格 JSON，不要输出多余解释。字段如下：
{
  "word": "适合展示和收藏的自然查词单位；如果 selectedText 只是一部分，请根据 fullSentence 修正为更完整自然的词或短语；不确定时保留 selectedText",
  "originalSelection": "用户原始选区 selectedText",
  "wasCorrected": true/false,
  "pronunciation": "selectedText 或 word 的读音；不确定可为空",
  "translation": "word 的基本意思，保持简短自然，避免生硬直译；如果是整句，要写明这是句意",
  "sentence_meaning": "selectedText 在当前 fullSentence 里的实际意思，要优先给出自然中文/英文表达，不要只做字面拆解",
  "nuance_explanation": "轻量补充语感、使用场景，必要时可简短说明原形或活用来源，但不要写成语法课"
}

规则：
1) 如果 selectedText 是完整词，word 保持原词。
2) 如果 selectedText 是词的一部分，应根据 fullSentence 修正成更完整自然的查词单位。
3) 不确定时不要过度扩展，保留 selectedText。
4) 日语原词、读音、日语例句保持日语，不要替换成英文词本体。
5) 不要翻译 NPC 原句引用。
6) translation / sentence_meaning / nuance_explanation 的语言跟随 uiLanguage。
7) sentence_meaning 必须优先解释 selectedText 本身在这句话里的实际意思、作用或语气，不要把整句翻译当成 selectedText 的解释。
8) 如果需要提到整句上下文，只能用来辅助说明 selectedText，不能直接把 fullSentence 的整句翻译放进 sentence_meaning。
9) 遇到动词活用、条件形、ている形、过去式、可能形等，先解释这个形式在当前句子里的自然意思。例如「選んだら」应接近“如果选的话 / 如果要选一个的话”，“始まれば”应接近“如果开始的话 / 从……开始的话”，“取れています」应接近“有腾出 / 留出”。
10) 像「落ち着く時間」这类搭配，要按自然语境理解，不要硬译成“拥有平静的时间”这类不自然说法。
11) translation 保持简短，给 selectedText 的基本意思；nuance_explanation 可以补充原形、活用、语法结构或语感，但不要写成完整语法课。
12) 保持轻量、陪伴式查词，不要把解释写成长篇词典条目。
`,
};

const KNOWN_EXPLAINS: Record<string, ExplainResponse> = {
  夜勤: {
    pronunciation: "やきん",
    translation: "夜班 / 夜间工作",
    sentence_meaning: "在这句话里，是说夜班那边的吸引力更强一些。",
    nuance_explanation: "‘夜勤’指晚上工作的班次，不是‘夜晚很勤快’。像‘夜勤明け’、‘夜勤がある’都很常见。",
  },
  誘惑: {
    pronunciation: "ゆうわく",
    translation: "诱惑 / 吸引力",
    sentence_meaning: "在这句话里，是说夜班带来的吸引力更强。",
    nuance_explanation: "‘誘惑’可以指让人忍不住想选的东西或条件。这里不是严肃的‘诱惑犯罪’，而是轻松地说‘那边更有吸引力’。",
  },
  寝たい: {
    pronunciation: "ねたい",
    translation: "想睡觉",
    sentence_meaning: "在这句话里，是说我现在马上想睡了。",
    nuance_explanation: "‘〜たい’接在动词后面，表示想做某事。‘寝たい’是很日常、直接地表达‘想睡’。",
  },
  間違え: {
    pronunciation: "まちがえ",
    translation: "弄错 / 出错",
    sentence_meaning: "在这句话里，是说刚才把同一件事说了两遍。",
    nuance_explanation: "‘間違え’常用来轻松承认一个小错误。口语里可以说‘間違えちゃった’。",
  },
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isLikelyKanaReading(value: string): boolean {
  return /^[\u3040-\u309F\u30A0-\u30FFー・\s]+$/.test(value.trim());
}

function normalizePronunciations(primary: string, raw: unknown): string[] {
  const source = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? [raw]
      : [];
  const merged = primary ? [primary, ...source] : source;

  return Array.from(
    new Set(
      merged
        .map((value) => cleanText(value))
        .filter((value) => value && isLikelyKanaReading(value)),
    ),
  ).slice(0, 3);
}

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

const JAPANESE_DIGIT_READINGS = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

function getJapaneseNumberReading(value: number): string {
  if (!Number.isInteger(value) || value < 0) return "";
  if (value === 0) return "ぜろ";
  if (value < 10) return JAPANESE_DIGIT_READINGS[value];
  if (value < 20) {
    if (value === 10) return "じゅう";
    return `じゅう${JAPANESE_DIGIT_READINGS[value - 10]}`;
  }
  if (value < 100) {
    const tens = Math.floor(value / 10);
    const ones = value % 10;
    return `${tens === 1 ? "" : JAPANESE_DIGIT_READINGS[tens]}じゅう${ones === 0 ? "" : JAPANESE_DIGIT_READINGS[ones]}`;
  }
  if (value < 10000) {
    const thousands = Math.floor(value / 1000);
    const hundreds = Math.floor((value % 1000) / 100);
    const tens = Math.floor((value % 100) / 10);
    const ones = value % 10;
    const thousandText =
      thousands === 0 ? "" : thousands === 1 ? "せん" : `${JAPANESE_DIGIT_READINGS[thousands]}せん`;
    const hundredText =
      hundreds === 0 ? "" : hundreds === 1 ? "ひゃく" : `${JAPANESE_DIGIT_READINGS[hundreds]}ひゃく`;
    const tenText =
      tens === 0 ? "" : tens === 1 ? "じゅう" : `${JAPANESE_DIGIT_READINGS[tens]}じゅう`;
    const oneText = ones === 0 ? "" : JAPANESE_DIGIT_READINGS[ones];
    return `${thousandText}${hundredText}${tenText}${oneText}`;
  }

  return String(value)
    .split("")
    .map((digit) => JAPANESE_DIGIT_READINGS[Number(digit)] || "")
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

function getJapaneseDateReadingFromText(text: string): string | null {
  const normalized = text.trim();
  if (!normalized) return null;

  const slashMatch = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$|^(\d{1,2})\/(\d{1,2})$/);
  const kanjiMatch = normalized.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日$|^(\d{1,2})月(\d{1,2})日$/);

  let year: number | null = null;
  let month: number | null = null;
  let day: number | null = null;

  if (slashMatch) {
    if (slashMatch[1] && slashMatch[2] && slashMatch[3]) {
      year = Number(slashMatch[1]);
      month = Number(slashMatch[2]);
      day = Number(slashMatch[3]);
    } else if (slashMatch[4] && slashMatch[5]) {
      month = Number(slashMatch[4]);
      day = Number(slashMatch[5]);
    }
  } else if (kanjiMatch) {
    if (kanjiMatch[1] && kanjiMatch[2] && kanjiMatch[3]) {
      year = Number(kanjiMatch[1]);
      month = Number(kanjiMatch[2]);
      day = Number(kanjiMatch[3]);
    } else if (kanjiMatch[4] && kanjiMatch[5]) {
      month = Number(kanjiMatch[4]);
      day = Number(kanjiMatch[5]);
    }
  } else {
    return null;
  }

  if (!month || !day || !JAPANESE_MONTH_READINGS[month]) {
    return null;
  }

  const monthReading = JAPANESE_MONTH_READINGS[month];
  const dayReading = getJapaneseDateDayReading(day);
  if (!dayReading) return null;

  if (year !== null) {
    const yearReading = getJapaneseNumberReading(year);
    if (!yearReading) return null;
    return `${yearReading}ねん${monthReading}${dayReading}`;
  }

  return `${monthReading}${dayReading}`;
}

function applyDateReadingOverride(
  response: ExplainResponse,
  candidates: string[],
): ExplainResponse {
  const dateReadingOverride =
    candidates
      .map((value) => getJapaneseDateReadingFromText(value))
      .find((value): value is string => Boolean(value)) ?? null;

  if (!dateReadingOverride) {
    return response;
  }

  return {
    ...response,
    pronunciation: dateReadingOverride,
    pronunciations: [dateReadingOverride],
  };
}

function isLikelySentence(value: string): boolean {
  const text = value.trim();
  return /[。！？?!、]/.test(text) || text.length >= 14;
}

function isKatakanaLike(value: string): boolean {
  return /^[ァ-ヶー・]+$/.test(value.trim());
}

function inferLookupWord(selectedText: string, fullSentence: string): {
  word: string;
  originalSelection: string;
  wasCorrected: boolean;
} {
  const originalSelection = selectedText.trim();
  const sentence = fullSentence.trim();
  if (!originalSelection) {
    return { word: "", originalSelection: "", wasCorrected: false };
  }

  if (!sentence || !isKatakanaLike(originalSelection)) {
    return { word: originalSelection, originalSelection, wasCorrected: false };
  }

  const matchIndex = sentence.indexOf(originalSelection);
  if (matchIndex < 0) {
    return { word: originalSelection, originalSelection, wasCorrected: false };
  }

  const isWordChar = (char: string): boolean => /^[ァ-ヶー・A-Za-z0-9]+$/.test(char);
  let start = matchIndex;
  while (start > 0 && isWordChar(sentence[start - 1])) {
    start -= 1;
  }

  let end = matchIndex + originalSelection.length;
  while (end < sentence.length && isWordChar(sentence[end])) {
    end += 1;
  }

  const candidate = sentence.slice(start, end).trim();
  if (candidate && candidate !== originalSelection) {
    return { word: candidate, originalSelection, wasCorrected: true };
  }

  return { word: originalSelection, originalSelection, wasCorrected: false };
}

function fallbackExplain(selectedText: string, fullSentence: string): ExplainResponse {
  const selected = selectedText.trim();
  const sentence = fullSentence.trim();
  const sentenceSelected = isLikelySentence(selected);
  const lookup = inferLookupWord(selectedText, fullSentence);

  if (KNOWN_EXPLAINS[selected]) {
    return applyDateReadingOverride({
      ...KNOWN_EXPLAINS[selected],
      pronunciations: normalizePronunciations(
        KNOWN_EXPLAINS[selected].pronunciation,
        KNOWN_EXPLAINS[selected].pronunciations,
      ),
      word: lookup.word,
      originalSelection: lookup.originalSelection,
      wasCorrected: lookup.wasCorrected,
    }, [lookup.word, selected, lookup.originalSelection]);
  }

  if (sentenceSelected) {
    return applyDateReadingOverride({
      pronunciation: "",
      pronunciations: [],
      translation: `这句话的意思：${selected}`,
      sentence_meaning: sentence || selected,
      nuance_explanation: "",
      word: lookup.word,
      originalSelection: lookup.originalSelection,
      wasCorrected: lookup.wasCorrected,
    }, [lookup.word, selected, lookup.originalSelection]);
  }

  return applyDateReadingOverride({
    pronunciation: "",
    pronunciations: [],
    translation: selected,
    sentence_meaning: sentence,
    nuance_explanation: "",
    word: lookup.word,
    originalSelection: lookup.originalSelection,
    wasCorrected: lookup.wasCorrected,
  }, [lookup.word, selected, lookup.originalSelection]);
}

function normalizeExplainResponse(
  parsed: Record<string, unknown>,
  selectedText: string,
  fullSentence: string
): ExplainResponse {
  const known = KNOWN_EXPLAINS[selectedText.trim()];
  const fallback = fallbackExplain(selectedText, fullSentence);
  const lookup = inferLookupWord(selectedText, fullSentence);
  const pronunciation =
    cleanText(parsed.pronunciation) ||
    cleanText(parsed.reading) ||
    cleanText(parsed["读音"]) ||
    fallback.pronunciation;
  const pronunciations = normalizePronunciations(
    pronunciation,
    parsed.pronunciations ?? parsed.readings,
  );
  const translation =
    cleanText(parsed.translation) ||
    cleanText(parsed.meaning) ||
    cleanText(parsed["简释"]) ||
    cleanText(parsed["释义"]) ||
    fallback.translation;
  const sentenceMeaning =
    cleanText(parsed.sentence_meaning) ||
    cleanText(parsed.sentenceMeaning) ||
    cleanText(parsed.meaningInSentence) ||
    cleanText(parsed["这句话里的意思"]) ||
    cleanText(parsed["句中意思"]) ||
    fallback.sentence_meaning;
  const nuance =
    cleanText(parsed.nuance_explanation) ||
    cleanText(parsed.nuanceExplanation) ||
    cleanText(parsed.usage) ||
    cleanText(parsed["语感"]) ||
    cleanText(parsed["使用场景"]);
  const parsedWord = cleanText(parsed.word) || cleanText(parsed.lookupWord) || cleanText(parsed.term);
  const parsedOriginalSelection = cleanText(parsed.originalSelection);
  const parsedWasCorrected = typeof parsed.wasCorrected === "boolean" ? parsed.wasCorrected : undefined;
  const word = lookup.wasCorrected ? lookup.word : (parsedWord || fallback.word || selectedText.trim());
  const originalSelection = parsedOriginalSelection || lookup.originalSelection || selectedText.trim();
  const wasCorrected = parsedWasCorrected ?? lookup.wasCorrected;
  const dateReadingOverride =
    getJapaneseDateReadingFromText(word) ??
    getJapaneseDateReadingFromText(selectedText.trim()) ??
    getJapaneseDateReadingFromText(originalSelection);
  const finalPronunciation = dateReadingOverride ?? pronunciation;
  const finalPronunciations = dateReadingOverride
    ? [dateReadingOverride]
    : pronunciations;

  if (known) {
    return {
      pronunciation: finalPronunciation || known.pronunciation,
      pronunciations:
        finalPronunciations.length > 0
          ? finalPronunciations
          : normalizePronunciations(known.pronunciation, known.pronunciations),
      translation: known.translation,
      sentence_meaning: sentenceMeaning || known.sentence_meaning,
      nuance_explanation: nuance || known.nuance_explanation,
      word,
      originalSelection,
      wasCorrected,
    };
  }

  return {
    pronunciation: finalPronunciation,
    pronunciations: finalPronunciations,
    translation,
    sentence_meaning: sentenceMeaning,
    nuance_explanation: nuance,
    word,
    originalSelection,
    wasCorrected,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { selectedText, fullSentence, uiLanguage } = await req.json();
    const targetLanguage = uiLanguage === "en" ? "en" : "zh";

    if (!selectedText || !fullSentence) {
      return NextResponse.json(
        { error: "缺少 selectedText 或 fullSentence" },
        { status: 400 }
      );
    }

    const userMsg: ChatCompletionMessageParam = {
      role: "user",
      content: `选中的词：${selectedText}
完整句子：${fullSentence}
uiLanguage: ${targetLanguage}

Return JSON with pronunciation as the primary kana reading and pronunciations as an optional array of kana readings, primary first.
Only include extra readings if they are common or contextually plausible. Do not invent rare readings.
If uncertain, return only the most common reading. For example, 「灯り」 is normally 「あかり」.
If selectedText is a short phrase, prefer the most natural overall reading for the phrase.

语言规则：
1) uiLanguage 为 en 时，translation / sentence_meaning / nuance_explanation 必须用英文。
2) uiLanguage 为 zh 时，translation / sentence_meaning / nuance_explanation 必须用中文。
3) 日语原词、读音、日语例句保持日语，不要替换成英文词本体。
4) 不要翻译 NPC 原句引用。
5) 如果 selectedText 只是一个词的一部分，请返回更完整、更自然的 word，并同时保留 originalSelection 和 wasCorrected。
6) sentence_meaning 要解释 selectedText 在当前句子里的意思、作用或语气，不要直接翻译整句话。
7) 如果需要引用上下文，只能作为辅助说明；不要把 fullSentence 的整句翻译当成 sentence_meaning。
8) 遇到动词活用、条件形、ている形、过去式、可能形等，先解释 selectedText 在这里的自然意思。像「選んだら」应优先解释成“如果选的话 / 如果要选一个的话”，“始まれば”应优先解释成“如果开始的话 / 从……开始的话”，“取れています」应优先解释成“有腾出 / 留出”。
9) translation 再给 selectedText 的基本意思。
10) 如有必要，可在 nuance_explanation 里轻量说明原形或活用来源，但不要展开成语法课。`,
    };

    const raw = await createChatCompletion([SYSTEM_PROMPT, userMsg], {
      temperature: 0.5,
      maxTokens: 300,
      jsonMode: true,
    });

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json(
        normalizeExplainResponse(parsed, selectedText, fullSentence)
      );
    } catch {
      return NextResponse.json(fallbackExplain(selectedText, fullSentence));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "服务异常";
    console.warn("[api/explain] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
