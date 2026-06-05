import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";
import { isNpcId } from "@/lib/npc";
import type {
  ExpressionUpgrade,
  ExpressionUpgradeSource,
  ReviewWord,
  ReviewWordSource,
  SessionSummaryApiCard,
  SessionSummaryRequest,
} from "@/lib/session-summary";

export const runtime = "nodejs";

const ERROR_MESSAGE =
  "ふりかえりを作れませんでした。少し時間をおいて、もう一度試してみてください。";

const SYSTEM_PROMPT = `あなたは Kotomachi / 言街 の「ふりかえり」カードを作るアシスタントです。

目的:
- 低压力で、でも学習情報のある復習カードを作る。
- 学習打卡、评分报告、纠错清单、老师批改にしない。
- 空泛鼓励を書かない。
- 情報が足りないときは少なく書く。構造を埋めるために捏造しない。

最重要原则:
- evidence-based summary にする。
- モデルが自由に学習点を選ぶのではなく、ユーザーの真实行为信号を優先する。

表达建议「次はこう言える」优先级:
1. nonJapaneseSpans: ユーザー入力中の英語や明らかな中国語。これは日语表达缺口の强い信号。
2. recentExpressionHints: ユーザーが開いた/再生した表現ヒント。playedStyles があるものを優先。
3. model_selected: 上記が足りない場合だけ、ユーザーの日本語入力から少量選ぶ。

単語「今日のことば」优先级:
1. recentLookups: ユーザーが主动查词した言葉。
2. recentLookups が空の場合は、会話から 2〜3 個の実用的な語・短い言い回しを選ぶ。
3. 足りなければ少なく書く。生僻词や関係の薄い語は選ばない。

タイトル:
- 会話の話題を短く要約する。
- 英文残句、ASR 断句、ユーザー原句の直接切り取りは禁止。
- 悪い例: "Sorry i feel f...の話"
- 良い例: "試験とレポートの話", "夜勤と眠気の話", "哲学と眠気の話"

conversation fallback の選び方:
- 「今日」「私」「あなた」「です」など基礎すぎる語は選ばない。
- 短い言い回しも可。例: レポートを書かなきゃ、試験範囲、確認できて安心する、自由すぎて迷子になる。
- conversation から選んだ項目の source は必ず "conversation"。
- 完整句子を reviewWords.word に入れない。

nextTalkPrompt:
- 具体的で、次の一言につながる話題入口にする。
- 「继续聊这个话题」「日本語を練習しましょう」のような泛泛表現は禁止。

出力は JSON のみ。markdown コードブロック禁止。
必ずこの構造にする:
{
  "title": "短いタイトル",
  "topicSummary": "今日の話を1〜2文で自然にまとめる",
  "reusableExpressions": [
    { "expression": "そのまま使える表現", "note": "なぜ使えるか短く" }
  ],
  "expressionUpgrades": [
    {
      "original": "ユーザーの原表达",
      "suggestion": "より自然な日语表达",
      "note": "学習ポイントを短く",
      "source": "non_japanese_span | expression_hint | model_selected"
    }
  ],
  "reviewWords": [
    {
      "word": "ことば",
      "reading": "よみ",
      "meaning": "短い意味",
      "example": "短い例文",
      "source": "looked_up | conversation"
    }
  ],
  "nextTalkPrompt": "次に話してみる低压力な話題"
}

制限:
- quality > quantity。不要为了填满字段而硬凑内容。
- 如果解释/学习点不具体有用，可以留空，或直接不输出该 item。
- learning note 是可选字段。只有能讲清具体语言点（语法/句型/语气/词汇改写）时才写。
- nextTalkPrompt 是可选字段。只有能给出具体、自然、贴合当前会话的延续话题时才写。
- reusableExpressions: 1-3 件（不足时可更少）。
- expressionUpgrades: 1-3 件（不足时可更少）。
- reviewWords: 2-5 件（不足时可更少）。
- nextTalkPrompt 只有在能具体贴合当前会话时才输出。
- ユーザーが言っていないこと、調べていないことを捏造しない。
- 原始 provider response や内部情報は出さない。`;

function pickString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function includesAny(value: string, words: string[]): boolean {
  return words.some((word) => value.toLowerCase().includes(word.toLowerCase()));
}

function containsChineseText(value: string): boolean {
  return /[\u4e00-\u9fff]/.test(value);
}

const BLOCKED_FILLER_TEXT = [
  "approximate meaning; check sentence context",
  "meaning in this chat context",
  "meaning explained in this chat context",
  "a reusable line that sounds natural in everyday conversation",
  "useful when you want to talk naturally about this",
  "this rewrite keeps your intent",
  "this rewrites your sentence into natural japanese",
  "a useful expression",
  "a word from this conversation",
  "context meaning",
  "this is more natural japanese",
  "this sounds better in conversation",
  "this fits casual spoken japanese",
  "removes broken phrasing",
  "more natural",
  "keeps your intent",
  "会話で出てきた表現",
  "文脈ごと復習",
  "查过的词，建议结合原句复习",
];

function isBlockedFillerText(value: string): boolean {
  const text = value.toLowerCase().trim();
  if (!text) return true;
  return BLOCKED_FILLER_TEXT.some((item) => text.includes(item.toLowerCase()));
}

function isFormulaicNextTopic(value: string): boolean {
  const text = value.trim().toLowerCase();
  if (!text) return false;
  return includesAny(text, [
    "keep going with",
    "how it relates to your night routine, drinks, or sleep",
    "talk about something interesting",
    "one small recent moment",
    "talk about how you felt",
    "something interesting",
    "small recent moment",
  ]);
}

function conversationText(request: SessionSummaryRequest): string {
  return request.messages.map((message) => message.content).join("\n");
}

function inferTopicTitle(request: SessionSummaryRequest): string {
  const text = conversationText(request);
  const hasTest = includesAny(text, ["test", "exam", "試験", "テスト", "準備", "preparation"]);
  const hasReport = includesAny(text, ["レポート", "report"]);
  const hasNightShift = includesAny(text, ["夜勤"]);
  const hasPhilosophy = includesAny(text, ["哲学"]);
  const hasSleep = includesAny(text, ["眠", "寝たい", "sleep", "sleepy"]);
  const hasTemptation = includesAny(text, ["誘惑"]);

  if (hasTest && hasReport) return "試験とレポートの話";
  if (hasTest) return "試験準備の話";
  if (hasReport) return "レポートの話";
  if (hasNightShift && (hasSleep || hasTemptation)) return "夜勤と眠気の話";
  if (hasPhilosophy && hasSleep) return "哲学と眠気の話";
  if (hasNightShift) return "夜勤の話";
  if (hasPhilosophy) return "哲学の話";

  const firstJapanesePhrase = text.match(/[ぁ-んァ-ヶ一-龠々ー]{2,12}/)?.[0];
  return firstJapanesePhrase ? `${firstJapanesePhrase}の話` : "今日の会話の話";
}

function sanitizeTitle(rawTitle: string, request: SessionSummaryRequest): string {
  const title = rawTitle.trim();
  const fallback = inferTopicTitle(request);
  if (!title) return fallback;
  if (/[A-Za-z]{4,}/.test(title)) return fallback;
  if (/[。！？!?]|\.{2,}|…/.test(title)) return fallback;
  if (includesAny(title, ["Sorry", "feel", "confirm", "preparation", "今日のふりかえり"])) {
    return fallback;
  }
  return truncate(title, 40);
}

function sanitizeTopicSummary(
  rawSummary: string,
  request: SessionSummaryRequest,
  uiLanguage: "zh" | "en",
): string {
  const summary = rawSummary.trim();
  if (
    summary &&
    !includesAny(summary, ["今日のふりかえり", "いい会話", "続けて話", "You talked about your recent situation"])
  ) {
    return truncate(summary, 220);
  }

  const text = conversationText(request);
  if (uiLanguage === "en") {
    if (includesAny(text, ["coffee", "コーヒー", "カフェイン", "ハーブティー", "hot milk", "ホットミルク", "眠れ"])) {
      return "You talked about night drinks, caffeine, and gentler options like hot milk or herbal tea for better sleep.";
    }
    if (includesAny(text, ["test", "exam", "試験", "テスト", "準備", "preparation"])) {
      return "You talked about exam preparation and the relief of confirming your prep was finished.";
    }
    if (includesAny(text, ["夜勤", "sleep", "眠気", "寝たい"])) {
      return "You talked about night-shift life, sleepiness, and how hard it is to rest when your rhythm is off.";
    }
    if (includesAny(text, ["哲学", "philosophy"])) {
      return "You talked about philosophy feeling difficult and how that can make you sleepy during class.";
    }
    return "You reviewed key expressions from this chat and turned them into reusable Japanese lines.";
  }

  if (includesAny(text, ["test", "exam", "試験", "テスト", "準備", "preparation"])) {
    return "試験の準備や、準備が終わったと確認できた安心感について話しました。";
  }
  if (includesAny(text, ["夜勤", "誘惑", "眠", "寝たい"])) {
    return "夜勤や眠気、つい休みたくなる気分について話しました。";
  }
  if (includesAny(text, ["哲学", "眠", "寝たい"])) {
    return "哲学の難しさや、聞いていると眠くなる感じについて話しました。";
  }
  if (includesAny(text, ["レポート", "report"])) {
    return "レポートや明日やることについて話しました。";
  }
  return "今日の会話で出てきた話題を短くふりかえりました。";
}

function isLowValueReviewWord(word: string): boolean {
  const compact = word.trim();
  if (!compact) return true;
  if (/[。！？!?]/.test(compact)) return true;
  if (compact.length > 24) return true;
  if (/^[A-Za-z\s.,'-]+$/.test(compact)) return true;
  return BASIC_REVIEW_WORDS.some((basic) => compact === basic || compact === `${basic}は`);
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(trimmed);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function normalizeUpgradeSource(value: unknown): ExpressionUpgradeSource {
  if (
    value === "non_japanese_span" ||
    value === "expression_hint" ||
    value === "model_selected"
  ) {
    return value;
  }
  return "model_selected";
}

function normalizeWordSource(value: unknown): ReviewWordSource {
  return value === "looked_up" ? "looked_up" : "conversation";
}

function normalizeReusableExpressions(value: unknown): SessionSummaryApiCard["reusableExpressions"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const expression = truncate(pickString(raw.expression), 140);
      const noteRaw = truncate(pickString(raw.note), 180);
      const note = isBlockedFillerText(noteRaw) ? "" : noteRaw;
      return expression ? { expression, note } : null;
    })
    .filter((item): item is { expression: string; note: string } => Boolean(item))
    .slice(0, 3);
}

function normalizeExpressionUpgrades(value: unknown): ExpressionUpgrade[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const original = truncate(pickString(raw.original), 180);
      const suggestion = truncate(pickString(raw.suggestion), 180);
      const noteRaw = truncate(pickString(raw.note), 220);
      const note = isBlockedFillerText(noteRaw) ? "" : noteRaw;
      if (!original || !suggestion) return null;
      return {
        original,
        suggestion,
        note,
        source: normalizeUpgradeSource(raw.source),
      };
    })
    .filter((item): item is ExpressionUpgrade => Boolean(item))
    .slice(0, 3);
}

function containsLatinText(value: string): boolean {
  return /[A-Za-z]/.test(value);
}

function compactText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isShortFragment(value: string): boolean {
  const text = compactText(value);
  if (text.length < 12) return true;
  const words = text.split(" ").filter(Boolean);
  return words.length < 4;
}

function hasTestIntent(value: string): boolean {
  return includesAny(value, ["test", "exam", "preparation", "prepare", "confirm", "finished"]);
}

function hasSleepIntent(value: string): boolean {
  return includesAny(value, ["sleep", "sleepy", "tired", "rest"]);
}

function isGenericUpgradeNote(value: string): boolean {
  if (!value) return true;
  return includesAny(value, [
    "復習しやすい形",
    "整理しています",
    "重点",
    "suggestion",
    "英語残句不要直译",
    "整理成自然日语",
    "方便下次复用",
    "下次可以直接使用",
    "更自然的说法",
    "帮助你学习",
  ]);
}

function hasConcreteLearningPoint(note: string): boolean {
  const text = note.trim();
  if (text.length < 18) return false;
  const quoteLikeChars = ["`", "「", "」", "『", "』", '"', '"', "'"];
  const hasQuoteLike = quoteLikeChars.some((c) => text.includes(c));
  const hasGrammarCue = includesAny(text, ["〜", "たい", "ないで", "確認できて", "安心しました"]);
  const hasArrowCue = includesAny(text, ["→", "对应", "整理为", "转成"]);
  const hasSpecificWord = includesAny(text, ["feel relaxed", "confirm", "finished", "寝たい", "ないで"]);
  return hasQuoteLike || hasGrammarCue || hasArrowCue || hasSpecificWord;
}

function normalizeUpgradeNote(original: string, suggestion: string, note: string): string {
  const enriched = truncate(enrichUpgradeNote(original, suggestion, note), 220);
  if (!enriched || isGenericUpgradeNote(enriched)) return "";
  return hasConcreteLearningPoint(enriched) ? enriched : "";
}

function enrichUpgradeNote(original: string, suggestion: string, note: string): string {
  const source = `${original}\n${suggestion}`;
  if (hasTestIntent(source)) {
    return "把原文里的 `feel relaxed` 转成更自然的「安心しました」；`having something to confirm` 整理为「確認できて」；`finished the preparation` 对应「準備が終わった」。";
  }
  if (hasSleepIntent(source)) {
    return "把“困了想休息”的意图收敛成自然日语。`休みたい` 比直接照搬英文情绪词更符合日常口语。";
  }
  return note;
}

function upgradeFromNonJapaneseSpan(
  span: NonNullable<SessionSummaryRequest["nonJapaneseSpans"]>[number],
): ExpressionUpgrade | null {
  const original = pickString(span.span);
  const context = pickString(span.originalMessage);
  const source = `${original}\n${context}`;
  if (!original || isShortFragment(original)) return null;

  if (includesAny(source, ["test", "exam", "preparation", "confirm", "finished", "relaxed"])) {
    return {
      original: truncate(original, 180),
      suggestion: "試験の準備が終わったことを確認できて、少し安心しました。",
      note: "英語の残句をそのまま訳さず、「準備が終わったと確認できて安心した」という意図に整理しています。",
      source: "non_japanese_span",
    };
  }

  if (includesAny(source, ["sleep", "tired", "寝たい", "眠"])) {
    return {
      original: truncate(original, 180),
      suggestion: "今日はもう眠いので、そろそろ休みたいです。",
      note: "眠さをやわらかく伝える日常表現です。会話を終えたい時にも使いやすいです。",
      source: "non_japanese_span",
    };
  }

  return null;
}

function upgradeFromExpressionHint(
  hint: NonNullable<SessionSummaryRequest["recentExpressionHints"]>[number],
): ExpressionUpgrade | null {
  const original = pickString(hint.originalText);
  const preferredStyle = hint.playedStyles?.[0] ?? "normal";
  const suggestion =
    pickString(hint.suggestions?.[preferredStyle]) ||
    pickString(hint.suggestions?.normal) ||
    pickString(hint.suggestions?.casual) ||
    pickString(hint.suggestions?.formal);

  if (!original || !suggestion) return null;

  const inferredNote = normalizeUpgradeNote(
    original,
    suggestion,
    "根据你打开过的表达提示，整理成更自然、可复用的一句。",
  );

  return {
    original: truncate(original, 180),
    suggestion: truncate(suggestion, 180),
    note: inferredNote,
    source: "expression_hint",
  };
}

function isAlignedUpgrade(item: ExpressionUpgrade): boolean {
  const source = `${item.original}\n${item.suggestion}\n${item.note}`;
  if (!containsLatinText(item.original)) return true;

  if (hasTestIntent(item.original)) {
    return includesAny(source, ["試験", "準備", "確認", "安心"]);
  }
  if (hasSleepIntent(item.original)) {
    return includesAny(source, ["眠", "休", "寝"]);
  }
  return !isGenericUpgradeNote(item.note);
}

function normalizeExpressionUpgradesWithEvidence(
  value: unknown,
  request: SessionSummaryRequest,
): ExpressionUpgrade[] {
  const upgrades: ExpressionUpgrade[] = [];
  const seen = new Set<string>();
  const suggestionMap = new Map<string, number>();

  for (const span of request.nonJapaneseSpans ?? []) {
    const upgrade = upgradeFromNonJapaneseSpan(span);
    if (!upgrade || seen.has(upgrade.original)) continue;
    const normalizedUpgrade: ExpressionUpgrade = {
      ...upgrade,
      note: normalizeUpgradeNote(upgrade.original, upgrade.suggestion, upgrade.note),
    };
    const key = compactText(upgrade.suggestion);
    const existingIndex = suggestionMap.get(key);
    if (existingIndex !== undefined) {
      const existing = upgrades[existingIndex];
      if (compactText(normalizedUpgrade.original).length > compactText(existing.original).length) {
        upgrades[existingIndex] = normalizedUpgrade;
        seen.add(normalizedUpgrade.original);
      }
      continue;
    }
    upgrades.push(normalizedUpgrade);
    suggestionMap.set(key, upgrades.length - 1);
    seen.add(normalizedUpgrade.original);
    if (upgrades.length >= 2) return upgrades;
  }

  const sortedHints = [...(request.recentExpressionHints ?? [])].sort(
    (a, b) => (b.playedStyles?.length ?? 0) - (a.playedStyles?.length ?? 0),
  );
  for (const hint of sortedHints) {
    const upgrade = upgradeFromExpressionHint(hint);
    if (!upgrade || seen.has(upgrade.original)) continue;
    const key = compactText(upgrade.suggestion);
    if (suggestionMap.has(key)) continue;
    upgrades.push(upgrade);
    suggestionMap.set(key, upgrades.length - 1);
    seen.add(upgrade.original);
    if (upgrades.length >= 2) return upgrades;
  }

  for (const upgrade of normalizeExpressionUpgrades(value)) {
    if (seen.has(upgrade.original)) continue;
    const normalized: ExpressionUpgrade = {
      ...upgrade,
      note: normalizeUpgradeNote(upgrade.original, upgrade.suggestion, upgrade.note),
    };
    if (!isAlignedUpgrade(normalized) || isShortFragment(normalized.original)) continue;
    const key = compactText(normalized.suggestion);
    const existingIndex = suggestionMap.get(key);
    if (existingIndex !== undefined) {
      const existing = upgrades[existingIndex];
      if (compactText(normalized.original).length > compactText(existing.original).length) {
        upgrades[existingIndex] = normalized;
        seen.add(normalized.original);
      }
      continue;
    }
    upgrades.push(normalized);
    suggestionMap.set(key, upgrades.length - 1);
    seen.add(upgrade.original);
    if (upgrades.length >= 2) return upgrades;
  }

  return upgrades;
}

function normalizeReviewWords(value: unknown): ReviewWord[] {
  if (!Array.isArray(value)) return [];
  const words: ReviewWord[] = [];

  for (const item of value) {
    const raw = item as Record<string, unknown>;
    const word = truncate(pickString(raw.word), 80);
    const meaning = truncate(pickString(raw.meaning), 120);
    if (!word || !meaning || isBlockedFillerText(meaning)) continue;

    words.push({
      word,
      reading: truncate(pickString(raw.reading), 80) || undefined,
      meaning,
      example: truncate(pickString(raw.example), 160) || undefined,
      source: normalizeWordSource(raw.source),
    });

    if (words.length >= 5) break;
  }

  return words;
}

const BASIC_REVIEW_WORDS = [
  "今日",
  "私",
  "僕",
  "あなた",
  "です",
  "ます",
  "これ",
  "それ",
  "あれ",
  "ここ",
  "そこ",
  "こと",
  "もの",
];

const KNOWN_REVIEW_WORDS: Record<string, Pick<ReviewWord, "reading" | "meaning" | "example">> = {
  夜勤: {
    reading: "やきん",
    meaning: "夜班 / 夜间工作",
    example: "夜勤明けは、しっかり休みたいです。",
  },
  誘惑: {
    reading: "ゆうわく",
    meaning: "诱惑 / 吸引力",
    example: "夜勤の誘惑の方が強いよね。",
  },
  眠気: {
    reading: "ねむけ",
    meaning: "困意",
    example: "授業中に眠気に負けそうです。",
  },
  哲学: {
    reading: "てつがく",
    meaning: "哲学",
    example: "哲学は難しいけど、おもしろいです。",
  },
  試験範囲: {
    reading: "しけんはんい",
    meaning: "考试范围",
    example: "試験範囲をもう一度確認したいです。",
  },
  "レポートを書かなきゃ": {
    meaning: "得写报告",
    example: "明日レポートを書かなきゃ。",
  },
  "眠気に負ける": {
    reading: "ねむけにまける",
    meaning: "被困意打败 / 太困撑不住",
    example: "今日は眠気に負けそうです。",
  },
};

const EN_WORD_MEANING_MAP: Record<string, string> = {
  夜勤: "night shift",
  誘惑: "temptation; strong pull",
  眠気: "sleepiness; drowsiness",
  哲学: "philosophy",
  試験範囲: "exam scope; covered topics",
  レポートを書かなきゃ: "I need to write my report",
  眠気に負ける: "to give in to sleepiness",
  ハーブティー: "herbal tea",
  ホットミルク: "hot milk",
  カフェイン: "caffeine",
  眠れなくなる: "to become unable to sleep; can't fall asleep",
};

const GENERIC_EN_REVIEW_TEXT = [
  "Meaning explained in this chat context.",
  "A reusable line that sounds natural in everyday conversation.",
  "This rewrite keeps your intent and improves wording and tone in natural Japanese.",
  "A useful expression from this conversation.",
];

function isGenericEnglishText(value: string): boolean {
  const text = value.trim();
  if (!text) return true;
  return GENERIC_EN_REVIEW_TEXT.some((item) => text.toLowerCase() === item.toLowerCase());
}

function englishMeaningFromWord(word: string, rawMeaning: string): string {
  if (EN_WORD_MEANING_MAP[word]) return EN_WORD_MEANING_MAP[word];
  const compact = rawMeaning.trim();
  if (!compact) return "";
  if (!containsChineseText(compact)) return compact;
  if (compact.includes("夜班")) return "night shift";
  if (compact.includes("诱惑")) return "temptation; strong pull";
  if (compact.includes("困意")) return "sleepiness";
  if (compact.includes("哲学")) return "philosophy";
  if (compact.includes("考试范围")) return "exam scope";
  if (compact.includes("报告")) return "report";
  if (compact.includes("睡不着") || compact.includes("眠れなく")) return "can't fall asleep";
  if (compact.includes("花草茶")) return "herbal tea";
  if (compact.includes("打败") || compact.includes("撑不住")) return "to give in to sleepiness";
  return "";
}

function buildReusableNote(expression: string): string {
  const e = expression.trim();
  if (includesAny(e, ["眠れなくなる"])) return "A natural way to explain that something can make it hard to fall asleep.";
  if (includesAny(e, ["カフェイン"])) return "Useful for talking about caffeine effects or drink choices.";
  if (includesAny(e, ["ホット", "ハーブティー", "ミルク"])) return "Useful when suggesting a gentler warm drink option.";
  if (includesAny(e, ["〜と", "と、"])) return "Useful for linking cause and result in daily conversation.";
  return "";
}

function buildUpgradeNote(original: string, suggestion: string): string {
  const o = original.trim();
  const s = suggestion.trim();
  if (includesAny(o, ["feel relaxed", "confirm", "finished"]) || includesAny(s, ["確認", "安心"])) {
    return "This keeps your idea but reorganizes it into natural Japanese flow, using 確認できて and 安心しました for clear cause and feeling.";
  }
  if (includesAny(o, ["sleep", "tired", "寝たい", "眠"]) || includesAny(s, ["寝たい", "眠れなくなる"])) {
    return "This uses a sleep-focused Japanese pattern (like 眠れなくなる or 〜たい) to state condition and intent more clearly.";
  }
  if (includesAny(s, ["〜と", "と、", "可能性があります", "かもしれません"])) {
    return "This adds a clear pattern for cause/result or soft probability, which sounds natural in practical conversation.";
  }
  return "";
}

function knownReviewWord(word: string): ReviewWord | null {
  const value = KNOWN_REVIEW_WORDS[word];
  if (!value) return null;
  return {
    word,
    reading: value.reading,
    meaning: value.meaning,
    example: value.example,
    source: "conversation",
  };
}

function reviewWordFromLookup(
  lookup: NonNullable<SessionSummaryRequest["recentLookups"]>[number],
  uiLanguage: "zh" | "en",
): ReviewWord | null {
  const word = pickString(lookup.word);
  if (isLowValueReviewWord(word)) return null;
  const known = knownReviewWord(word);
  const rawMeaning = pickString(lookup.meaning) || known?.meaning || "查过的词，建议结合原句复习。";
  const resolvedMeaning = uiLanguage === "en" ? englishMeaningFromWord(word, rawMeaning) : rawMeaning;
  if (!resolvedMeaning || isBlockedFillerText(resolvedMeaning)) return null;

  return {
    word,
    reading: pickString(lookup.reading) || known?.reading,
    meaning: resolvedMeaning,
    example: truncate(pickString(lookup.sourceSentence) || known?.example || "", 160) || undefined,
    source: "looked_up",
  };
}

function extractConversationReviewWords(
  messages: SessionSummaryRequest["messages"],
  uiLanguage: "zh" | "en",
): ReviewWord[] {
  const seen = new Set<string>();
  const candidates: ReviewWord[] = [];
  const text = messages.map((message) => message.content).join("\n");

  for (const word of Object.keys(KNOWN_REVIEW_WORDS)) {
    if (!text.includes(word)) continue;
    const known = knownReviewWord(word);
    if (!known) continue;
    seen.add(word);
    candidates.push(known);
    if (candidates.length >= 3) return candidates;
  }

  for (const message of messages) {
    const matches = message.content.match(/[ぁ-んァ-ヶ一-龠々ー]{4,22}/g) ?? [];
    for (const match of matches) {
      const word = match.trim();
      if (word.length < 4 || seen.has(word) || isLowValueReviewWord(word)) continue;
      const meaning = uiLanguage === "en"
        ? englishMeaningFromWord(word, knownReviewWord(word)?.meaning ?? "")
        : (knownReviewWord(word)?.meaning ?? "");
      if (!meaning || isBlockedFillerText(meaning)) continue;
      seen.add(word);
      candidates.push({
        word,
        meaning,
        source: "conversation",
      });
      if (candidates.length >= 3) return candidates;
    }
  }

  return candidates;
}

function deduplicateReviewWords(words: ReviewWord[]): ReviewWord[] {
  if (words.length <= 1) return words;

  const keep = new Set<number>();

  for (let i = 0; i < words.length; i++) {
    const wordA = words[i];
    let shouldKeep = true;

    for (let j = 0; j < words.length; j++) {
      if (i === j) continue;
      const wordB = words[j];

      const aIsSubstring = wordB.word.includes(wordA.word);
      const bIsSubstring = wordA.word.includes(wordB.word);

      if (aIsSubstring && !bIsSubstring) {
        if (wordB.word.length - wordA.word.length >= 2) {
          shouldKeep = false;
          break;
        }
      }
    }

    if (shouldKeep) {
      keep.add(i);
    }
  }

  return words.filter((_, index) => keep.has(index)).slice(0, 5);
}

function normalizeReviewWordsWithEvidence(
  value: unknown,
  request: SessionSummaryRequest,
  uiLanguage: "zh" | "en",
): ReviewWord[] {
  const words: ReviewWord[] = [];
  const seen = new Set<string>();

  for (const lookup of request.recentLookups ?? []) {
    const word = reviewWordFromLookup(lookup, uiLanguage);
    if (!word || seen.has(word.word)) continue;
    words.push(word);
    seen.add(word.word);
  }

  for (const word of normalizeReviewWords(value)) {
    if (isLowValueReviewWord(word.word) || seen.has(word.word)) continue;
    words.push({
      ...word,
      source: word.source === "looked_up" ? "looked_up" : "conversation",
    });
    seen.add(word.word);
  }

  for (const word of extractConversationReviewWords(request.messages, uiLanguage)) {
    if (isLowValueReviewWord(word.word) || seen.has(word.word)) continue;
    words.push(word);
    seen.add(word.word);
  }

  const deduplicated = deduplicateReviewWords(words);
  return deduplicated.slice(0, 5);
}

function sanitizeNextTalkPrompt(
  rawPrompt: string,
  request: SessionSummaryRequest,
  uiLanguage: "zh" | "en",
): string {
  const prompt = rawPrompt.trim();
  const generic = !prompt || includesAny(prompt, [
    "继续聊",
    "続けて話",
    "この話題",
    "今日のこと",
    "練習しましょう",
    "日本語を練習",
    "one small recent moment",
    "something interesting",
  ]);
  if (!generic) return truncate(prompt, 160);

  const text = conversationText(request);
  if (uiLanguage === "en") {
    if (includesAny(text, ["coffee", "コーヒー", "カフェイン", "ハーブティー", "hot milk", "ホットミルク", "眠れ"])) {
      return "Next, you could talk about what you usually drink at night when you want to sleep well.";
    }
    if (includesAny(text, ["夜勤"])) {
      return "Next, you could continue with how you recover after a night shift and what helps you rest.";
    }
    if (includesAny(text, ["哲学", "philosophy"])) {
      return "Next, you could talk about which parts of philosophy class make you sleepy and how you stay focused.";
    }
    if (includesAny(text, ["レポート", "report"])) {
      return "Next, you could continue with how you choose a report topic and break it into small steps.";
    }
    if (includesAny(text, ["test", "exam", "試験", "テスト", "準備"])) {
      return "Next, you could talk about what checks make you feel confident before an exam.";
    }
    return "Next, pick one expression from this chat and use it in a short update about your day.";
  }

  if (includesAny(text, ["夜勤"])) {
    return "次は「夜勤明けにどうやって休むか」を少し話してみてもよさそうです。";
  }
  if (includesAny(text, ["哲学"])) {
    return "次は「哲学の授業でどんなところが眠くなるか」を軽く話してみましょう。";
  }
  if (includesAny(text, ["レポート", "report"])) {
    return "次は「レポートのテーマをどう決めるか」を少し話してみましょう。";
  }
  if (includesAny(text, ["test", "exam", "試験", "テスト", "準備"])) {
    return "次は「試験前にどんな確認をすると安心できるか」を話してみてもよさそうです。";
  }
  return "次は、今日出てきた言葉を一つ選んで、短い近況として話してみましょう。";
}

function normalizeCard(
  raw: Record<string, unknown>,
  request: SessionSummaryRequest,
  uiLanguage: "zh" | "en",
): SessionSummaryApiCard {
  const reviewWords = normalizeReviewWordsWithEvidence(raw.reviewWords, request, uiLanguage);
  const card: SessionSummaryApiCard = {
    title: sanitizeTitle(pickString(raw.title), request),
    topicSummary: sanitizeTopicSummary(pickString(raw.topicSummary), request, uiLanguage),
    reusableExpressions: normalizeReusableExpressions(raw.reusableExpressions),
    expressionUpgrades: normalizeExpressionUpgradesWithEvidence(raw.expressionUpgrades, request),
    reviewWords,
    nextTalkPrompt: sanitizeNextTalkPrompt(pickString(raw.nextTalkPrompt), request, uiLanguage),
  };

  const qualityCard: SessionSummaryApiCard = {
    ...card,
    reusableExpressions: card.reusableExpressions
      .map((item) => ({ ...item, note: isBlockedFillerText(item.note) ? "" : item.note }))
      .filter((item) => Boolean(item.expression) && (!item.note || !isBlockedFillerText(item.note))),
    expressionUpgrades: card.expressionUpgrades
      .map((item) => ({ ...item, note: isBlockedFillerText(item.note) ? "" : item.note })),
    reviewWords: card.reviewWords.filter((item) => Boolean(item.meaning) && !isBlockedFillerText(item.meaning)),
    nextTalkPrompt: isBlockedFillerText(card.nextTalkPrompt) || isFormulaicNextTopic(card.nextTalkPrompt)
      ? ""
      : card.nextTalkPrompt,
  };

  return localizeCardTeachingText(qualityCard, uiLanguage);
}

function localizeCardTeachingText(
  card: SessionSummaryApiCard,
  uiLanguage: "zh" | "en",
): SessionSummaryApiCard {
  if (uiLanguage !== "en") return card;

  const anchorExpression =
    card.reusableExpressions[0]?.expression ||
    card.expressionUpgrades[0]?.suggestion ||
    "this line";

  const topicSummary = containsChineseText(card.topicSummary)
    ? `You reviewed today's chat and practiced clearer Japanese around "${anchorExpression}".`
    : card.topicSummary;

  const reusableExpressions = card.reusableExpressions.map((item) => ({
    ...item,
    note: !item.note || containsChineseText(item.note) || isGenericEnglishText(item.note)
      ? buildReusableNote(item.expression)
      : item.note,
  })).filter((item) => Boolean(item.note && !isBlockedFillerText(item.note)));

  const expressionUpgrades = card.expressionUpgrades.map((item) => ({
    ...item,
    note: !item.note || containsChineseText(item.note) || isGenericEnglishText(item.note)
      ? buildUpgradeNote(item.original, item.suggestion)
      : item.note,
  }));

  const reviewWords = card.reviewWords.map((item) => ({
    ...item,
    meaning: containsChineseText(item.meaning) || isGenericEnglishText(item.meaning)
      ? englishMeaningFromWord(item.word, item.meaning)
      : item.meaning,
  })).filter((item) => Boolean(item.meaning && !isBlockedFillerText(item.meaning)));

  const nextTalkPrompt = containsChineseText(card.nextTalkPrompt) || isFormulaicNextTopic(card.nextTalkPrompt)
    ? ""
    : card.nextTalkPrompt;

  return {
    ...card,
    topicSummary,
    reusableExpressions,
    expressionUpgrades,
    reviewWords,
    nextTalkPrompt,
  };
}

function sanitizeRequest(body: unknown): SessionSummaryRequest | null {
  const raw = body as Partial<SessionSummaryRequest> | null;
  if (!raw || typeof raw.npcId !== "string" || !isNpcId(raw.npcId)) return null;
  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .filter((message) => {
          return (
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim()
          );
        })
        .slice(-16)
        .map((message) => ({
          role: message.role,
          content: truncate(message.content.trim(), 700),
          id: typeof message.id === "string" ? message.id : undefined,
          createdAt: typeof message.createdAt === "string" ? message.createdAt : undefined,
        }))
    : [];

  if (messages.length < 2) return null;

  const rawSpans = Array.isArray(raw.nonJapaneseSpans) ? raw.nonJapaneseSpans.slice(0, 8) : [];
  const spansByMessage = new Map<string, NonNullable<SessionSummaryRequest["nonJapaneseSpans"]>[number][]>();
  rawSpans.forEach((span) => {
    if (!span || typeof span.messageId !== "string") return;
    const list = spansByMessage.get(span.messageId) ?? [];
    list.push(span);
    spansByMessage.set(span.messageId, list);
  });

  const mergedSpans: NonNullable<SessionSummaryRequest["nonJapaneseSpans"]> = [];
  spansByMessage.forEach((items) => {
    const englishLike = items.filter((item) => containsLatinText(pickString(item.span)));
    const others = items.filter((item) => !containsLatinText(pickString(item.span)));

    if (englishLike.length >= 2) {
      const message = pickString(englishLike[0].originalMessage);
      if (!isShortFragment(message)) {
        mergedSpans.push({
          ...englishLike[0],
          id: `${englishLike[0].id}-merged`,
          span: truncate(message, 260),
          languageGuess: "en",
          confidence: "high",
        });
      }
    } else if (englishLike.length === 1 && !isShortFragment(pickString(englishLike[0].span))) {
      mergedSpans.push(englishLike[0]);
    }

    others.forEach((item) => {
      const span = pickString(item.span);
      if (isShortFragment(span)) return;
      mergedSpans.push(item);
    });
  });

  return {
    schemaVersion: 1,
    npcId: raw.npcId,
    messages,
    recentLookups: Array.isArray(raw.recentLookups) ? raw.recentLookups.slice(0, 5) : [],
    recentExpressionHints: Array.isArray(raw.recentExpressionHints)
      ? raw.recentExpressionHints.slice(0, 5)
      : [],
    nonJapaneseSpans: mergedSpans.slice(0, 8),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uiLanguage: "zh" | "en" = body?.uiLanguage === "en" ? "en" : "zh";
    const request = sanitizeRequest(body);
    if (!request) {
      return NextResponse.json(
        { error: "もう少し話すと、ふりかえりを作れます。" },
        { status: 400 },
      );
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `${JSON.stringify(request, null, 2)}

uiLanguage: ${uiLanguage}

Language rules:
- Use the same selection logic for zh and en. Do not make English cards more generic than Chinese cards.
- Reusable expressions must be selected by real usefulness in this chat, not category-like templates.
- Expression upgrades must come from real user gaps or expression hints and explain the concrete rewrite point.
- Review words should prioritize looked-up words and relevant conversation words; keep quality checks the same in zh/en.
- nextTalkPrompt must continue this exact chat topic with concrete hooks.
- Quality is more important than quantity. Do not fill a field just because schema has that field.
- If explanation/note is not specific and useful, leave it empty.
- Learning note is optional. Only include it when you can explain a concrete language point.
- If the note is only "more natural / better wording / keeps your intent / casual spoken Japanese", return an empty note.
- If a word meaning is uncertain and cannot be inferred, exclude that word item.
- If an expression is not truly reusable, exclude it.
- nextTalkPrompt is optional. If you cannot produce a concrete, natural continuation tied to this chat, return an empty string.
- Do not use formulaic next-topic text like "keep going with X and how it relates to Y".
- If uiLanguage is "en": topicSummary, reusable expression notes, learning notes, word meanings, and nextTalkPrompt must be in English only.
- If uiLanguage is "zh": those teaching fields must be in Chinese.
- Suggested Japanese expressions must remain Japanese.
- Japanese words, readings, and Japanese examples must remain Japanese.
- User original text must remain unchanged.
- NPC quotes must remain Japanese.
- Do not output Chinese labels or Chinese explanation paragraphs when uiLanguage is "en".
- Explanations must be content-specific to the actual expression/word/sentence in this chat.
- Never output placeholder lines like:
  "approximate meaning; check sentence context"
  "meaning in this chat context"
  "Meaning explained in this chat context."
  "A reusable line that sounds natural in everyday conversation."
  "Useful when you want to talk naturally about this"
  "This rewrites your sentence into natural Japanese"
  "This rewrite keeps your intent and improves wording."
  "A useful expression from this conversation."
- For reviewWords.meaning in English UI, provide natural English meanings (e.g. ハーブティー -> herbal tea, 眠れなくなる -> can't fall asleep).
- nextTalkPrompt must be concrete and tied to the actual chat topic, not a generic prompt.

Before finalizing JSON, do an internal self-check (do not output this checklist):
1) no placeholder text,
2) reusable notes are specific,
3) word meanings are real meanings,
4) learning notes explain concrete rewrite points,
5) nextTalkPrompt is tied to this chat,
6) Japanese content stays Japanese,
7) explanation language matches uiLanguage.`,
      },
    ];

    const raw = await createChatCompletion(messages, {
      temperature: 0.35,
      maxTokens: 1200,
      jsonMode: true,
    });

    let parsed: Record<string, unknown> = {};
    try {
      parsed = parseJsonObject(raw);
    } catch {
      // 模型 JSON 波动时仍尽量用 evidence signals 生成一张可复习的轻量卡片。
      parsed = {};
    }

    return NextResponse.json({ card: normalizeCard(parsed, request, uiLanguage) });
  } catch (error) {
    console.warn("[api/session-summary] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
  }
}
