import { NextRequest, NextResponse } from "next/server";
import {
  type FeedbackApiErrorResponse,
  type FeedbackApiSuccessResponse,
  type FeedbackLevelKey,
  normalizeRevisionNotes,
  normalizeStructureNote,
  type FeedbackLevel,
  type FeedbackResponse,
  type RevisionNote,
} from "@/lib/feedback-types";
import { ChatCompletionError, createChatCompletion } from "@/lib/llm";

export const runtime = "nodejs";

type UiLanguage = "zh" | "en";
type FinalResponseSource = "primary" | "generic" | "hard";

const VALID_NPC_IDS = ["aoi", "haruka", "kimura", "misaki", "taisho", "nana", "riku", "ren"] as const;
const VALID_NPC_ID_SET = new Set<string>(VALID_NPC_IDS);
const FEEDBACK_LEVEL_KEYS: FeedbackLevelKey[] = ["casual", "business", "formal"];

function debugExpressionHint(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  if (details) {
    console.debug(`[Expression Hint] ${message}`, details);
    return;
  }
  console.debug(`[Expression Hint] ${message}`);
}

const SYSTEM_PROMPT = `You are the Expression Hint assistant for Kotomachi.
The user opened Expression Hint because they want a best-effort rewrite of what they just said into natural, reusable Japanese.
Do not act like a strict teacher. Do not reject rough spoken input.

Return strict JSON only. No markdown code block. Use this shape:
{
  "casual": {
    "nativeSay": "natural casual Japanese",
    "analysis": "short learner-friendly explanation in the user's UI language",
    "structureNote": {
      "pattern": "optional reusable Japanese pattern",
      "explanation": "optional short explanation in the user's UI language",
      "examples": ["up to 2 short Japanese examples"]
    }
  },
  "business": {
    "nativeSay": "natural neutral/polite Japanese",
    "analysis": "short learner-friendly explanation in the user's UI language"
  },
  "formal": {
    "nativeSay": "natural more formal Japanese",
    "analysis": "short learner-friendly explanation in the user's UI language"
  }
}

Hard requirements:
- Keep all three levels: casual, business, formal.
- nativeSay must be a natural Japanese sentence.
- The user's input may be messy spoken Japanese with fillers like 「えっと」「あの」, repeated fragments, speech recognition mistakes, mixed Chinese/English, proper nouns, product names, company names, titles, acronyms, or organization names. Do not reject it. Do a best-effort rewrite.
- Translate ordinary English or Chinese wording used as a placeholder into natural Japanese when possible.
- But proper nouns, event names, tournament names, organization names, company names, product names, app names, platform names, model names, titles, personal names, place names, and acronyms may be kept, transliterated into katakana, or rewritten naturally in Japanese.
- If a Latin token is the topic itself rather than a placeholder for missing Japanese, do not reject the sentence just because that token is in Latin letters.
- nativeSay should be mostly Japanese overall, but it may contain a small number of necessary Latin proper nouns or acronyms.
- Do not keep ordinary English phrases or long English sentence fragments in nativeSay. Translate those into Japanese.
- Do not reject or fail just because the user's message contains an acronym or proper noun written in Latin letters.
- If meaning is partly unclear, infer conservatively and avoid overcorrecting.

structureNote rules:
- structureNote is optional.
- structureNote is rare and optional.
- Do not include structureNote by default.
- Across the three levels, include structureNote for at most one level in most cases. If unsure, omit it.
- Only include structureNote when there is a concrete reusable Japanese pattern that would help the learner make future sentences.
- For messy, fragmented, or unclear input, usually omit structureNote.
- Do not create structureNote for ordinary wording improvements, filler cleanup, word order cleanup, or general smoothing.
- Do not explain ordinary vocabulary in structureNote.
- Keep structureNote short and practical.

Bad cases for structureNote:
- only removing fillers like 「えっと」
- only fixing word order
- only changing vocabulary
- only making the sentence smoother
- input is too fragmented to identify a reusable pattern

Good reusable pattern examples:
- 「〜てもいいですか」
- 「〜てみたいです」
- 「〜ことがあります」
- 「〜ようにしています」
- 「〜という感じです」
- 「〜たことがあります」

Do not output any extra fields.`;

// Keep the stable 3-level output, but make the model explain concrete rewrites instead of vague praise.
const EXPRESSION_HINT_PROMPT = `You are the Expression Hint assistant for Kotomachi.
The user opened Expression Hint because they want a best-effort rewrite of what they just said into natural, reusable Japanese.
Do not act like a strict teacher. Do not reject rough spoken input.

Return strict JSON only. No markdown code block. Use this shape:
{
  "sharedRevisionNotes": [
    {
      "type": "structure",
      "originalPart": "optional shared original fragment",
      "revisedPart": "optional shared revised Japanese fragment",
      "explanation": "specific explanation in the user's UI language"
    }
  ],
  "casual": {
    "nativeSay": "natural casual Japanese",
    "usage": "one or two concise sentences about who this level fits and which expressions create that tone",
    "analysis": "one concise summary of the main improvement in the user's UI language",
    "revisionNotes": [
      {
        "type": "fluency",
        "originalPart": "optional original fragment",
        "revisedPart": "optional revised Japanese fragment",
        "explanation": "specific explanation in the user's UI language"
      }
    ],
    "structureNote": {
      "pattern": "optional reusable Japanese pattern",
      "explanation": "optional short explanation in the user's UI language",
      "examples": ["up to 2 short Japanese examples"]
    }
  },
  "business": {
    "nativeSay": "natural neutral/polite Japanese",
    "usage": "one or two concise sentences about who this level fits and which expressions create that tone",
    "analysis": "one concise summary of the main improvement in the user's UI language"
  },
  "formal": {
    "nativeSay": "natural more formal Japanese",
    "usage": "one or two concise sentences about who this level fits and which expressions create that tone",
    "analysis": "one concise summary of the main improvement in the user's UI language"
  }
}

Workflow:
- Before rewriting, infer the user's intended meaning.
- The user's input may come from speech-to-text and may contain fillers, repeated words, false starts, broken punctuation, code-switching, or disfluent fragments.
- Preserve the user's intended meaning, not the surface wording.
- Ignore fillers, stutters, repeated words, broken punctuation, and fragmented starts when deciding what the user wants to say.

Hard requirements:
- Keep all three levels: casual, business, formal.
- Each level must produce a distinct natural Japanese version.
- nativeSay must be a natural Japanese sentence that a real speaker might say in that situation.
- nativeSay is the improved Japanese sentence, not a lightly cleaned copy of the user's original text.
- The user's input may be messy spoken Japanese with fillers like "えっと" or "あの", repeated fragments, speech recognition mistakes, mixed Chinese/English, proper nouns, product names, company names, titles, acronyms, or organization names. Do not reject it. Do a best-effort rewrite.
- If the input contains fillers, repeated words, false starts, unnatural word order, wrong counters, mixed-language fragments, broken sentence structure, or overly literal translation, rewrite it into complete natural Japanese.
- Translate ordinary English or Chinese wording used as a placeholder into natural Japanese when possible.
- But proper nouns, event names, tournament names, organization names, company names, product names, app names, platform names, model names, titles, personal names, place names, and acronyms may be kept, transliterated into katakana, or rewritten naturally in Japanese.
- If a Latin token is the topic itself rather than a placeholder for missing Japanese, do not reject the sentence just because that token is in Latin letters.
- nativeSay should be mostly Japanese overall, but it may contain a small number of necessary Latin proper nouns or acronyms.
- Do not keep ordinary English phrases or long English sentence fragments in nativeSay. Translate those into Japanese.
- Do not reject or fail just because the user's message contains an acronym or proper noun written in Latin letters.
- If meaning is partly unclear, infer conservatively and avoid overcorrecting.
- Do not copy the user's original sentence as nativeSay.
- Do not merely remove fillers while keeping an awkward structure.
- Do not say "no major change is needed" when the original is disfluent.
- Do not use "wait for more context" as the main advice.

Register guidance:
- casual: natural spoken Japanese for friends, classmates, familiar NPCs, or relaxed conversation.
- the internal key "business" means Neutral: natural everyday polite Japanese for shops, part-time work, neighbors, teachers, or ordinary social situations. This is not business email Japanese.
- the internal key "formal" means Polite: careful spoken Japanese for interviews, customers, superiors, or formal first meetings. Still natural, not stiff written Japanese.
- The three levels should differ by register and situation, not by copying the original.

analysis rules:
- analysis should be one concise summary of the main improvement.
- analysis should focus on the overall rewrite strategy, not on relationship distance or register fit.
- Do not output empty summaries like "more natural" or "more polite" by themselves.

sharedRevisionNotes rules:
- sharedRevisionNotes means things to fix first in the original expression before choosing a register.
- Use sharedRevisionNotes only for core fixes that affect meaning, grammar, word choice, counters, sentence structure, or naturalness in an obvious way.
- sharedRevisionNotes should usually contain 2 to 4 notes when there are clear fixable issues, but it may be omitted entirely.
- Put shared corrections here only once, not in multiple levels.
- Include only things like wrong counters, wrong particles, wrong tense or form, wrong word choice, unnatural literal translation, disfluent filler or repetition from STT, or fragmented structure that must be reorganized for the sentence to make sense.
- originalPart and revisedPart must be short fragments, not full sentences.
- Do not use the whole user input or the whole rewritten sentence here.
- Do not put whole-sentence summaries, ordinary style polishing, or casual-versus-polite differences here.
- Do not use sharedRevisionNotes for general naturalness improvements if the original already makes sense.
- If the user input is mainly Chinese or English and needs translation into Japanese, do not force sharedRevisionNotes unless there is a clear Japanese usage issue. In that case, focus on the three suggested Japanese expressions instead.

revisionNotes rules:
- level.revisionNotes are for register-specific differences only.
- Each level should usually have 0 to 2 revisionNotes.
- Do not repeat the same correction in multiple levels.
- If a correction applies to all levels, put it in sharedRevisionNotes only.
- If a level note duplicates sharedRevisionNotes, omit it.
- Do not repeat shared corrections such as filler removal, wrong counters, or base sentence restructuring inside level.revisionNotes.
- Each note must explain one real improvement specific to that level's tone, wording, or politeness.
- Use these types when relevant: meaning, structure, wording, grammar, tone, counter, fluency.
- originalPart should quote the original fragment that was changed when possible.
- revisedPart should show the improved Japanese fragment when possible.
- Do not use the whole user input or the whole rewritten sentence in level.revisionNotes.
- explanation must be specific and concrete in the user's UI language.
- Do not write empty advice like "more natural", "more polite", "better", or "more suitable" unless you explain exactly what changed and why.
- For speech-to-text style broken input, sharedRevisionNotes should cover the main fluency and structure fixes.
- If there is an obvious counter mistake such as 「2人」 for objects, explain it in sharedRevisionNotes only.
- revisionNotes should explain the rewrite, not explain why you avoided rewriting.
- Casual level notes should focus on choices like 「どっち」, 「迷ってて」, or other relaxed spoken phrasing.
- Neutral level notes should focus on everyday polite choices like 「どちら」, 「ですか」, or 「〜ています」.
- Polite level notes should focus on careful spoken choices like 「のですが」, 「でしょうか」, or more formal verbs when they are actually used.

usage rules:
- level.usage explains when and with whom this register fits.
- usage should be 1 to 2 concise sentences.
- usage must mention the suitable relationship or scene.
- usage must mention one or two concrete expressions from nativeSay that create this tone.
- Do not explain shared corrections such as filler removal, counter fixes, or sentence restructuring in usage.
- Do not repeat sharedRevisionNotes inside usage.
- usage is the default visible "Best for" explanation, so keep it short, useful, and focused on relationship distance, tone, and register.
- Good usage examples mention expressions like "迷ってて", "どっち", "どちら", "ですか", "のですが", or "でしょうか" to show why this level feels casual, neutral, or polite.

structureNote rules:
- structureNote is optional.
- structureNote is rare and optional.
- Do not include structureNote by default.
- Across the three levels, include structureNote for at most one level in most cases. If unsure, omit it.
- Only include structureNote when there is a concrete reusable Japanese pattern that would help the learner make future sentences.
- For messy, fragmented, or unclear input, usually omit structureNote.
- Do not create structureNote for ordinary wording improvements, filler cleanup, word order cleanup, or general smoothing.
- Do not explain ordinary vocabulary in structureNote.
- Keep structureNote short and practical.

Bad cases for structureNote:
- only removing fillers
- only fixing word order
- only changing vocabulary
- only making the sentence smoother
- input is too fragmented to identify a reusable pattern

Good reusable pattern examples:
- 「〜てもいいですか？」
- 「〜てみたいです」
- 「〜ことがあります」
- 「〜ようにしています」
- 「〜という感じです」
- 「〜たことがあります」

Quality reference:
- Bad input can be fragmented, repetitive, and mixed up, for example:
  「お、おほうじ茶ラテと、ええと、アイス、それはアイス。カフェラテは両方いいですね。ええと、ええと、この2人の中で選んだらおすすめはありますか。」
- Infer the intended meaning first, then rewrite it into natural Japanese.
- A good casual rewrite can be:
  「ほうじ茶ラテとアイスで迷ってて、カフェラテも気になってるんだけど、この2つならどっちがおすすめ？」
- A good business rewrite can be:
  「ほうじ茶ラテとアイスで迷っているんですが、カフェラテも気になっています。この2つならどちらがおすすめですか？」
- A good formal rewrite can be:
  「ほうじ茶ラテとアイスで迷っているのですが、この2つでしたらどちらがおすすめでしょうか？」
- Good revision notes for this kind of case explain things like:
  - fillers and repetitions reorganized into 「AとBで迷っている」
  - wrong counter 「2人」 corrected to 「2つ」
  - awkward recommendation question changed into 「どちらがおすすめですか」
Do not output any extra fields.`;

function parseNpcId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return VALID_NPC_ID_SET.has(value) ? value : null;
}

function getNpcExpressionContext(npcId: string | null): string {
  switch (npcId) {
    case "aoi":
      return "Current conversation partner: Aoi, a same-age friend. Keep casual suggestions friendly and natural.";
    case "haruka":
      return "Current conversation partner: Haruka, a graduate-school senior. Suggestions should be lightly polite and natural.";
    case "kimura":
      return "Current conversation partner: Kimura, a convenience-store staff member. Suggestions may lean toward everyday service-counter language.";
    case "misaki":
      return "Current conversation partner: Misaki, a calm cafe staff member. Suggestions should feel gentle and lightly polite.";
    case "taisho":
      return "Current conversation partner: Taisho, an izakaya owner. Suggestions may feel warm and familiar, but not preachy.";
    case "nana":
      return "Current conversation partner: Nana, a life-support helper for newcomers in Japan. Suggestions should help users speak clearly and politely.";
    case "riku":
      return "Current conversation partner: Riku, a familiar gym regular who keeps things low-pressure. Suggestions should help with everyday exercise, body condition, and club-practice talk without sounding like a trainer, doctor, or strict coach.";
    case "ren":
      return "Current conversation partner: Ren, a lightly familiar sojourner. Suggestions should stay natural and low-pressure.";
    default:
      return "No specific NPC context. Use general Japanese register guidance.";
  }
}

function containsJapanese(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

function containsKana(text: string): boolean {
  return /[\u3040-\u30ff]/.test(text);
}

function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function isPrimarilyEnglish(text: string): boolean {
  const englishChars = (text.match(/[A-Za-z]/g) || []).length;
  const japaneseChars = (text.match(/[\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
  const latinTokens = text.match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) ?? [];
  const acronymLikeTokens = latinTokens.filter((token) => isLikelyAcronymToken(token)).length;

  if (!text.trim()) return false;
  if (japaneseChars === 0 && englishChars > 0) return true;
  if (containsJapanese(text) && acronymLikeTokens > 0 && latinTokens.length <= acronymLikeTokens + 1) {
    return false;
  }

  return englishChars > japaneseChars * 2 && japaneseChars < 8;
}

function cleanAsrArtifacts(value: string): string {
  return value
    .replace(/\b(\w+)\s+\1\b/gi, "$1")
    .replace(/[ \u3000]+/g, " ")
    .replace(/、{2,}/g, "、")
    .replace(/。{2,}/g, "。")
    .trim();
}

function stripDecorations(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^["'`「『]+|["'`」』]+$/g, "")
    .replace(/[【】<>]/g, "")
    .trim();
}

function normalizeNativeSay(value: unknown): string {
  if (typeof value !== "string") return "";
  return cleanAsrArtifacts(stripDecorations(value));
}

function compactExpression(value: string): string {
  return value.replace(/\s+/g, "").replace(/[。、！？!?]/g, "").trim().toLowerCase();
}

function sameExpression(a: string, b: string): boolean {
  if (!a || !b) return false;
  return compactExpression(a) === compactExpression(b);
}

function isLikelyAcronymToken(token: string): boolean {
  const cleaned = token.replace(/[^A-Za-z0-9]/g, "");
  if (!cleaned) return false;

  if (!/^[A-Za-z0-9]{2,8}$/.test(cleaned)) {
    return false;
  }

  if (cleaned === cleaned.toUpperCase()) {
    return true;
  }

  if (/^[A-Za-z]{2,6}$/.test(cleaned) && !/[aeiouAEIOU]/.test(cleaned)) {
    return true;
  }

  if (/[A-Za-z]/.test(cleaned) && /\d/.test(cleaned)) {
    return true;
  }

  return false;
}

function containsLongEnglishPhrase(text: string): boolean {
  const latinTokens = text.match(/[A-Za-z0-9][A-Za-z0-9._-]*/g) ?? [];
  const ordinaryEnglishTokens = latinTokens.filter((token) => !isLikelyAcronymToken(token));

  if (ordinaryEnglishTokens.length < 3) {
    return false;
  }

  return /[A-Za-z]{2,}(?:\s+[A-Za-z]{2,}){2,}/.test(text);
}

function looksLikeMetadata(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("{") || trimmed.startsWith("```")) return true;

  const lower = trimmed.toLowerCase();
  return (
    lower.includes('"nativesay"') ||
    lower.includes('"analysis"') ||
    lower.includes("output json") ||
    lower.includes("as an ai")
  );
}

function pickAnalysis(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return "";
  }

  const source = raw as Record<string, unknown>;
  const fields = ["analysis", "explain", "summary", "why", "note", "explanation", "zh", "en"];

  for (const key of fields) {
    if (typeof source[key] === "string" && source[key].trim()) {
      return source[key].trim();
    }
  }

  return "";
}

function pickUsage(raw: unknown): string {
  if (typeof raw === "string" && raw.trim()) {
    return raw.trim();
  }

  return "";
}

function isSafeHintExpression(nativeSay: string): boolean {
  const text = nativeSay.trim();
  if (!text) return false;
  if (!containsJapanese(text)) return false;
  if (looksLikeMetadata(text)) return false;
  if (isPrimarilyEnglish(text)) return false;
  if (containsLongEnglishPhrase(text)) return false;
  return true;
}

function sanitizeUserTextForFallback(userText: string): string {
  return cleanAsrArtifacts(userText)
    .replace(/(?:ええと|えっと|えーと|あの|その)\s*[、。,]?\s*/g, "")
    .replace(/([ぁ-んァ-ン一-龯ー])、\1/g, "$1")
    .replace(/お、お/g, "お")
    .replace(/この\s*2人/g, "この2つ")
    .replace(/この\s*二人/g, "この二つ")
    .replace(/[、,]{2,}/g, "、")
    .replace(/\s+/g, " ")
    .replace(/^[、。\s]+|[、。\s]+$/g, "")
    .trim();
}

function hasVisibleDisfluency(text: string): boolean {
  const compact = text.replace(/\s+/g, "");
  return (
    /(ええと|えっと|えーと|あの|その)/.test(text) ||
    /お、お/.test(text) ||
    /この\s*(2|二)人/.test(text) ||
    /([ぁ-んァ-ン一-龯ー])、\1/.test(compact)
  );
}

function buildSafeFallbackNativeSay(userText: string, level: FeedbackLevelKey): string {
  const cleaned = sanitizeUserTextForFallback(userText);
  const disfluent = hasVisibleDisfluency(userText);

  if (cleaned && (!sameExpression(cleaned, userText) || !disfluent)) {
    return cleaned;
  }

  switch (level) {
    case "casual":
      return "言いたいことを短く言うと、こんな感じです。";
    case "business":
      return "もう少し整理して言うと、このような言い方になります。";
    case "formal":
      return "少し丁寧に言うと、このように表現できます。";
    default:
      return "自然な日本語に言い直すと、こういう形になります。";
  }
}

function feedbackLevel(nativeSay: string, analysis: string): FeedbackLevel {
  return { nativeSay, analysis };
}

function withRevisionNotes(level: FeedbackLevel, revisionNotes?: RevisionNote[]): FeedbackLevel {
  return {
    ...level,
    ...(revisionNotes?.length ? { revisionNotes } : {}),
  };
}

function withSharedRevisionNotes(
  response: FeedbackResponse,
  sharedRevisionNotes?: RevisionNote[]
): FeedbackResponse {
  return {
    ...response,
    ...(sharedRevisionNotes?.length ? { sharedRevisionNotes } : {}),
  };
}

function buildGenericFallback(userText: string): FeedbackResponse {
  const casualFallback = buildSafeFallbackNativeSay(userText, "casual");
  const businessFallback = buildSafeFallbackNativeSay(userText, "business");
  const formalFallback = buildSafeFallbackNativeSay(userText, "formal");

  return {
    casual: withRevisionNotes(
      {
        nativeSay: casualFallback,
        usage: "适合和熟人、朋友或轻松聊天时说。会更偏口语，也更随和。",
        analysis: "先把零散停顿整理成完整一句，再用更顺的口语表达同样的意思。",
      },
      [
        {
          type: "fluency",
          explanation: "如果原句里有停顿、重复或半句，先整理成完整句子，再根据场景调整语气，会更容易继续对话。",
        },
      ]
    ),
    business: withRevisionNotes(
      {
        nativeSay: businessFallback,
        usage: "适合向店员、同学或不太熟的人自然地询问。会保持礼貌，但不会太硬。",
        analysis: "先把信息顺序理清，再换成普通礼貌的说法，会更清楚也更自然。",
      },
      [
        {
          type: "structure",
          explanation: "可以先说背景或选项，再说想问什么；这样比把碎片信息并排堆在一起更容易懂。",
        },
      ]
    ),
    formal: withRevisionNotes(
      {
        nativeSay: formalFallback,
        usage: "适合想更客气地询问时说。会用更完整、更委婉的句尾。",
        analysis: "正式场景里把重点拆清，再补上礼貌句尾，会比直译原句稳妥。",
      },
      [
        {
          type: "tone",
          explanation: "正式表达通常会把请求或提问说完整，并用更稳妥的礼貌结尾，而不是只做表面清理。",
        },
      ]
    ),
  };
}

function buildHardFallback(): FeedbackResponse {
  return {
    casual: withRevisionNotes(
      {
        nativeSay: "言いたいことを短く言うと、こんな感じです。",
        usage: "适合轻松聊天时先参考这种更短的说法。",
        analysis: "先把想说的内容缩成一整句，会更像真实对话里的说法。",
      },
      [
        {
          type: "fluency",
          explanation: "先说完整一句，再按关系距离微调，会比保留碎片停顿更有参考价值。",
        },
      ]
    ),
    business: withRevisionNotes(
      {
        nativeSay: "もう少し整理して言うと、このような言い方になります。",
        usage: "适合日常礼貌场景里先参考这种更稳妥的说法。",
        analysis: "把信息顺序整理好，再换成普通礼貌说法，会更容易直接拿去用。",
      },
      [
        {
          type: "structure",
          explanation: "先整理句子结构，再调整礼貌度，通常比逐字照搬原句更自然。",
        },
      ]
    ),
    formal: withRevisionNotes(
      {
        nativeSay: "少し丁寧に言うと、このように表現できます。",
        usage: "适合需要更客气、更完整表达的场景先参考这种说法。",
        analysis: "正式说法通常会补齐句子骨架和礼貌结尾，让意思更完整。",
      },
      [
        {
          type: "tone",
          explanation: "正式场景里，完整句式和礼貌收尾比只删口头停顿更重要。",
        },
      ]
    ),
  };
}

function toEnglishAnalysis(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "This version sounds more natural and easier to follow.";
  }

  if (!containsChinese(trimmed)) {
    return trimmed;
  }

  if (trimmed.includes("正式")) {
    return "This version is phrased more formally and keeps the meaning conservative.";
  }
  if (trimmed.includes("礼貌")) {
    return "This version is a bit more polite while keeping the same core meaning.";
  }
  if (trimmed.includes("原意")) {
    return "This version keeps your original meaning and lightly tidies the sentence.";
  }
  if (trimmed.includes("停顿") || trimmed.includes("专名")) {
    return "The input has pauses or named terms, so this version keeps the main information without overcorrecting.";
  }

  return "This version sounds more natural and easier to follow.";
}

function localizeAnalysisText(text: string, uiLanguage: UiLanguage): string {
  const trimmed = text.trim();

  if (uiLanguage === "en") {
    return toEnglishAnalysis(trimmed);
  }

  if (!trimmed) {
    return "这样说更自然，也更容易让对方理解。";
  }

  if (containsChinese(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (lower.includes("formal")) {
    return "这样说更正式，也会显得更完整。";
  }
  if (lower.includes("polite")) {
    return "这样说更礼貌，同时仍然自然。";
  }
  if (lower.includes("natural")) {
    return "这样说更自然，更像日语里会直接说的方式。";
  }

  return "这样说更自然，也更容易让对方理解。";
}

function localizeStructureNote(
  note: ReturnType<typeof normalizeStructureNote>,
  uiLanguage: UiLanguage
) {
  if (!note) return undefined;

  const explanation = note.explanation
    ? localizeAnalysisText(note.explanation, uiLanguage)
    : undefined;

  return {
    ...(note.pattern ? { pattern: note.pattern } : {}),
    ...(explanation ? { explanation } : {}),
    ...(note.examples?.length ? { examples: note.examples } : {}),
  };
}

function localizeUsageText(text: string, uiLanguage: UiLanguage): string {
  return localizeAnalysisText(text, uiLanguage);
}

function localizeRevisionNotes(
  notes: ReturnType<typeof normalizeRevisionNotes>,
  uiLanguage: UiLanguage
): RevisionNote[] | undefined {
  if (!notes?.length) {
    return undefined;
  }

  return notes.map((note) => ({
    ...note,
    explanation: localizeAnalysisText(note.explanation, uiLanguage),
  }));
}

function shouldSuppressSharedRevisionNotes(userText: string): boolean {
  if (isPrimarilyEnglish(userText)) {
    return true;
  }

  // If the input has Chinese characters but no kana, it is usually Chinese text
  // that needs Japanese suggestions rather than fragment-level Japanese error notes.
  if (containsChinese(userText) && !containsKana(userText)) {
    return true;
  }

  return false;
}

function compactRevisionFragment(value: string | undefined): string {
  return (value ?? "").replace(/\s+/g, "").trim();
}

function removeSharedDuplicateNotes(
  notes: ReturnType<typeof normalizeRevisionNotes>,
  sharedNotes: ReturnType<typeof normalizeRevisionNotes>
): RevisionNote[] | undefined {
  if (!notes?.length) {
    return undefined;
  }

  if (!sharedNotes?.length) {
    return notes;
  }

  const filtered = notes.filter((note) => {
    const originalPart = compactRevisionFragment(note.originalPart);
    const revisedPart = compactRevisionFragment(note.revisedPart);

    return !sharedNotes.some((sharedNote) => {
      if (sharedNote.type !== note.type) {
        return false;
      }

      const sharedOriginal = compactRevisionFragment(sharedNote.originalPart);
      const sharedRevised = compactRevisionFragment(sharedNote.revisedPart);

      return (
        (originalPart && sharedOriginal && originalPart === sharedOriginal) ||
        (revisedPart && sharedRevised && revisedPart === sharedRevised)
      );
    });
  });

  return filtered.length > 0 ? filtered : undefined;
}

function shouldRejectNativeSay(candidateNative: string, userText: string): boolean {
  if (!isSafeHintExpression(candidateNative)) {
    return true;
  }

  if (hasVisibleDisfluency(userText) && sameExpression(candidateNative, userText)) {
    return true;
  }

  return false;
}

function normalizeLevel(
  level: unknown,
  userText: string,
  fallbackSay: string,
  fallbackAnalysis: string
): FeedbackLevel {
  const fallbackNative = normalizeNativeSay(fallbackSay) || "自然な日本語に言い直すと、こういう形になります。";
  const fallbackAnalysisText =
    pickAnalysis(fallbackAnalysis) || "这样说更自然，也更容易让对方理解。";
  const fallbackUsageText =
    "适合按这一档的关系距离和礼貌度来说。";

  if (!level || typeof level !== "object" || Array.isArray(level)) {
    return { nativeSay: fallbackNative, usage: fallbackUsageText, analysis: fallbackAnalysisText };
  }

  const source = level as Record<string, unknown>;
  const candidateNative = normalizeNativeSay(source.nativeSay);
  const nativeSay = shouldRejectNativeSay(candidateNative, userText) ? fallbackNative : candidateNative;
  const usage = pickUsage(source.usage) || fallbackUsageText;
  const analysis = pickAnalysis(source.analysis) || fallbackAnalysisText;
  const revisionNotes = normalizeRevisionNotes(source.revisionNotes);
  const structureNote = normalizeStructureNote(source.structureNote);

  return {
    nativeSay,
    usage,
    analysis,
    ...(revisionNotes?.length ? { revisionNotes } : {}),
    ...(structureNote ? { structureNote } : {}),
  };
}

function limitStructureNotes(response: FeedbackResponse): FeedbackResponse {
  let keptOne = false;
  const limited = {} as FeedbackResponse;
  const sharedRevisionNotes = normalizeRevisionNotes(response.sharedRevisionNotes);

  for (const key of FEEDBACK_LEVEL_KEYS) {
    const level = response[key];
    const note = normalizeStructureNote(level.structureNote);
    const revisionNotes = removeSharedDuplicateNotes(
      normalizeRevisionNotes(level.revisionNotes),
      sharedRevisionNotes
    );

    if (!keptOne && note) {
      limited[key] = {
        nativeSay: level.nativeSay,
        ...(level.usage ? { usage: level.usage } : {}),
        analysis: level.analysis,
        ...(revisionNotes?.length ? { revisionNotes } : {}),
        structureNote: note,
      };
      keptOne = true;
      continue;
    }

    limited[key] = {
      nativeSay: level.nativeSay,
      ...(level.usage ? { usage: level.usage } : {}),
      analysis: level.analysis,
      ...(revisionNotes?.length ? { revisionNotes } : {}),
    };
  }

  return {
    ...limited,
    ...(sharedRevisionNotes?.length ? { sharedRevisionNotes } : {}),
  };
}

function localizeFeedbackResponse(response: FeedbackResponse, uiLanguage: UiLanguage): FeedbackResponse {
  const localized = {} as FeedbackResponse;
  const sharedRevisionNotes = localizeRevisionNotes(
    normalizeRevisionNotes(response.sharedRevisionNotes),
    uiLanguage
  );

  for (const key of FEEDBACK_LEVEL_KEYS) {
    const level = response[key];
    const revisionNotes = localizeRevisionNotes(
      removeSharedDuplicateNotes(
        normalizeRevisionNotes(level.revisionNotes),
        normalizeRevisionNotes(response.sharedRevisionNotes)
      ),
      uiLanguage
    );
    const structureNote = localizeStructureNote(normalizeStructureNote(level.structureNote), uiLanguage);

    localized[key] = {
      nativeSay: level.nativeSay,
      ...(level.usage ? { usage: localizeUsageText(level.usage, uiLanguage) } : {}),
      analysis: localizeAnalysisText(level.analysis, uiLanguage),
      ...(revisionNotes?.length ? { revisionNotes } : {}),
      ...(structureNote ? { structureNote } : {}),
    };
  }

  return {
    ...localized,
    ...(sharedRevisionNotes?.length ? { sharedRevisionNotes } : {}),
  };
}

function hasValidExpressions(response: FeedbackResponse): boolean {
  return FEEDBACK_LEVEL_KEYS.some((key) => {
    const nativeSay = response[key]?.nativeSay?.trim();
    return Boolean(nativeSay && containsJapanese(nativeSay));
  });
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function parseFeedbackResponseText(raw: string): Partial<FeedbackResponse> {
  return JSON.parse(extractJsonObject(raw)) as Partial<FeedbackResponse>;
}

function buildFallbackResponse(userText: string): FeedbackResponse {
  return buildGenericFallback(userText);
}

function buildFeedbackFailurePayload(
  uiLanguage: UiLanguage
): FeedbackApiErrorResponse {
  if (uiLanguage === "en") {
    return {
      ok: false,
      error: "feedback_generation_failed",
      message: "Expression hint failed to generate. Please try again.",
      retryable: true,
    };
  }

  return {
    ok: false,
    error: "feedback_generation_failed",
    message: "表达提示生成失败了，可以再试一次。",
    retryable: true,
  };
}

function resolveFinalResponse(
  source: FeedbackResponse,
  uiLanguage: UiLanguage,
  userText: string
): { response: FeedbackResponse; source: FinalResponseSource } {
  const primary = limitStructureNotes(localizeFeedbackResponse(source, uiLanguage));
  if (shouldSuppressSharedRevisionNotes(userText)) {
    delete primary.sharedRevisionNotes;
  }
  if (hasValidExpressions(primary)) {
    return { response: primary, source: "primary" };
  }

  const fallback = limitStructureNotes(localizeFeedbackResponse(buildFallbackResponse(userText), uiLanguage));
  if (shouldSuppressSharedRevisionNotes(userText)) {
    delete fallback.sharedRevisionNotes;
  }
  if (hasValidExpressions(fallback)) {
    return { response: fallback, source: "generic" };
  }

  const hardFallback = limitStructureNotes(localizeFeedbackResponse(buildHardFallback(), uiLanguage));
  if (shouldSuppressSharedRevisionNotes(userText)) {
    delete hardFallback.sharedRevisionNotes;
  }
  return {
    response: hardFallback,
    source: "hard",
  };
}

export async function POST(req: NextRequest) {
  let requestBody: unknown;

  try {
    requestBody = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }

  const body = requestBody as Record<string, unknown>;
  const userText = typeof body.userText === "string" ? body.userText.trim() : "";
  const uiLanguage: UiLanguage = body.uiLanguage === "en" ? "en" : "zh";
  const forceRefresh = body.forceRefresh === true;

  if (!userText) {
    return NextResponse.json({ error: "文本不能为空" }, { status: 400 });
  }

  try {
    debugExpressionHint("request payload summary", {
      forceRefresh,
      npcId: typeof body.npcId === "string" ? body.npcId : null,
      uiLanguage,
      userTextLength: userText.length,
    });

    const npcId = parseNpcId(body.npcId);
    const npcExpressionContext = getNpcExpressionContext(npcId);
    const systemPrompt = `${EXPRESSION_HINT_PROMPT}

NPC relationship context:
${npcExpressionContext}

Use this only to fine-tune nuance and naturalness. Do not change the user's intended meaning.
Keep the existing three levels: casual, business/natural, formal.
Do not add emoji, kaomoji, markdown, or action descriptions.`;

    const raw = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Original user text: ${userText}

uiLanguage: ${uiLanguage}

Language rules:
- If uiLanguage is "en", analysis, revisionNotes.explanation, and structureNote.explanation must be in English only.
- If uiLanguage is "zh", usage, analysis, sharedRevisionNotes.explanation, revisionNotes.explanation, and structureNote.explanation must be in Chinese only.
- If uiLanguage is "en", usage, analysis, sharedRevisionNotes.explanation, revisionNotes.explanation, and structureNote.explanation must be in English only.
- All suggested expressions, sharedRevisionNotes.revisedPart, revisionNotes.revisedPart, structureNote.pattern, and structureNote.examples must remain Japanese.
- sharedRevisionNotes.originalPart and revisionNotes.originalPart may quote the user's original fragment, even if it contains Chinese, English, or mixed-language input.
- Do not fail just because the input is fragmented.
- structureNote is optional. If there is no clear reusable pattern, omit it.
- sharedRevisionNotes is optional. If there are no shared changes worth calling out, omit it instead of padding.
- revisionNotes is optional. If there are no concrete changes worth calling out, omit it instead of padding.
- Never fail the whole response just because no structureNote is available.`,
        },
      ],
      {
        temperature: 0.5,
        jsonMode: true,
        providerTimeouts: {
          deepseekMs: 15000,
          arkMs: 15000,
        },
        traceLabel: "Expression Hint",
      }
    );

    debugExpressionHint("raw model text", {
      rawText: raw,
    });

    let parsed: Partial<FeedbackResponse>;
    try {
      parsed = parseFeedbackResponseText(raw);
      debugExpressionHint("parsed status", {
        hasBusiness: Boolean(parsed.business),
        hasCasual: Boolean(parsed.casual),
        hasFormal: Boolean(parsed.formal),
        hasSharedRevisionNotes: Array.isArray((parsed as Record<string, unknown>).sharedRevisionNotes),
        parseStatus: "ok",
      });
    } catch (parseError) {
      debugExpressionHint("parse failed", {
        reason: parseError instanceof Error ? parseError.message : "parse_failed",
      });
      console.warn("[api/feedback] Using fallback expression hints", {
        reason: parseError instanceof Error ? parseError.message : "parse_failed",
        userTextLength: userText.length,
        rawPreview: raw.slice(0, 240),
      });
      const fallbackResult = resolveFinalResponse(buildFallbackResponse(userText), uiLanguage, userText);
      debugExpressionHint("fallback used", {
        reason: "parse_failed",
        source: fallbackResult.source,
      });
      return NextResponse.json({
        ok: true,
        feedback: fallbackResult.response,
        fallbackUsed: true,
        source: fallbackResult.source,
      } satisfies FeedbackApiSuccessResponse);
    }

    const fallback = buildFallbackResponse(userText);
    const normalized = withSharedRevisionNotes({
      casual: normalizeLevel(parsed.casual, userText, fallback.casual.nativeSay, fallback.casual.analysis),
      business: normalizeLevel(parsed.business, userText, fallback.business.nativeSay, fallback.business.analysis),
      formal: normalizeLevel(parsed.formal, userText, fallback.formal.nativeSay, fallback.formal.analysis),
    }, normalizeRevisionNotes((parsed as Record<string, unknown>).sharedRevisionNotes));

    debugExpressionHint("normalized status", {
      businessNativePreview: normalized.business.nativeSay.slice(0, 80),
      casualNativePreview: normalized.casual.nativeSay.slice(0, 80),
      formalNativePreview: normalized.formal.nativeSay.slice(0, 80),
      sharedRevisionNotesCount: normalized.sharedRevisionNotes?.length ?? 0,
    });

    const finalResult = resolveFinalResponse(normalized, uiLanguage, userText);
    const finalResponse = finalResult.response;

    if (!hasValidExpressions(finalResponse)) {
      debugExpressionHint("validation failed", {
        reason: "no_valid_expressions_after_normalization",
      });
      console.warn("[api/feedback] Using fallback expression hints", {
        reason: "no_valid_expressions_after_normalization",
        userTextLength: userText.length,
        rawPreview: raw.slice(0, 240),
      });
      const fallbackResult = resolveFinalResponse(buildFallbackResponse(userText), uiLanguage, userText);
      debugExpressionHint("fallback used", {
        reason: "no_valid_expressions_after_normalization",
        source: fallbackResult.source,
      });
      return NextResponse.json({
        ok: true,
        feedback: fallbackResult.response,
        fallbackUsed: true,
        source: fallbackResult.source,
      } satisfies FeedbackApiSuccessResponse);
    }

    if (finalResult.source !== "primary") {
      debugExpressionHint("fallback used", {
        reason: "final_response_not_primary",
        source: finalResult.source,
      });
    }

    return NextResponse.json({
      ok: true,
      feedback: finalResponse,
      fallbackUsed: finalResult.source !== "primary",
      source: finalResult.source,
    } satisfies FeedbackApiSuccessResponse);
  } catch (error) {
    debugExpressionHint("request failed", {
      reason: error instanceof Error ? error.message : "unknown",
      provider:
        error instanceof ChatCompletionError ? error.provider ?? "unknown" : "unknown",
      code: error instanceof ChatCompletionError ? error.code : "unknown",
    });
    debugExpressionHint("returning retryable error", {
      reason: error instanceof Error ? error.message : "unknown",
      provider:
        error instanceof ChatCompletionError ? error.provider ?? "unknown" : "unknown",
      code: error instanceof ChatCompletionError ? error.code : "unknown",
    });
    return NextResponse.json(buildFeedbackFailurePayload(uiLanguage), {
      status: 502,
    });
  }
}
