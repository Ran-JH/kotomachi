import { NextRequest, NextResponse } from "next/server";
import {
  normalizeStructureNote,
  type FeedbackLevel,
  type FeedbackResponse,
} from "@/lib/feedback-types";
import { createChatCompletion } from "@/lib/llm";

export const runtime = "nodejs";

type UiLanguage = "zh" | "en";
type FeedbackLevelKey = keyof FeedbackResponse;

const VALID_NPC_IDS = ["aoi", "haruka", "kimura", "misaki", "taisho", "nana", "riku", "ren"] as const;
const VALID_NPC_ID_SET = new Set<string>(VALID_NPC_IDS);
const FEEDBACK_LEVEL_KEYS: FeedbackLevelKey[] = ["casual", "business", "formal"];

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
  const cleaned = cleanAsrArtifacts(userText)
    .replace(/(えっと|あの|その)(\s*[、,]?\s*\1)+/g, "$1")
    .replace(/(?:^|[。！？!?]\s*)(えっと|あの|その)(?=\s*[。！？!?]|$)/g, "")
    .trim();

  return cleaned.replace(/[、,]\s*$/, "").trim();
}

function feedbackLevel(nativeSay: string, analysis: string): FeedbackLevel {
  return { nativeSay, analysis };
}

function buildGenericFallback(userText: string): FeedbackResponse {
  const cleaned = sanitizeUserTextForFallback(userText);
  const safeBase = containsJapanese(cleaned)
    ? cleaned
    : "この内容を自然な日本語に言い直すと、もう少し短く整理して伝える言い方になります。";

  return {
    casual: feedbackLevel(
      safeBase,
      "先保留你的原意，把断裂和重复尽量整理成可以继续对话的表达。"
    ),
    business: feedbackLevel(
      sameExpression(safeBase, cleaned) ? safeBase : cleaned || safeBase,
      "这次输入信息比较多，也混有停顿或专名，所以先保守整理，避免误改原意。"
    ),
    formal: feedbackLevel(
      sameExpression(safeBase, cleaned) ? safeBase : cleaned || safeBase,
      "正式一点时通常要再拆清重点；这次先保守保留主要信息，不做过度推断。"
    ),
  };
}

function buildHardFallback(): FeedbackResponse {
  return {
    casual: feedbackLevel(
      "言いたいことを短く言うと、こんな感じです。",
      "这次先用最保守的方式给出可继续参考的表达。"
    ),
    business: feedbackLevel(
      "もう少し整理して言うと、このような言い方になります。",
      "这次先保留可显示的表达结果，避免因为解析失败而整条提示消失。"
    ),
    formal: feedbackLevel(
      "少し丁寧に言うと、このように表現できます。",
      "这是一条最后兜底的正式表达，用来保证非空输入时仍能看到结果。"
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

function normalizeLevel(
  level: unknown,
  fallbackSay: string,
  fallbackAnalysis: string
): FeedbackLevel {
  const fallbackNative = normalizeNativeSay(fallbackSay) || "自然な日本語に言い直すと、こういう形になります。";
  const fallbackAnalysisText =
    pickAnalysis(fallbackAnalysis) || "这样说更自然，也更容易让对方理解。";

  if (!level || typeof level !== "object" || Array.isArray(level)) {
    return feedbackLevel(fallbackNative, fallbackAnalysisText);
  }

  const source = level as Record<string, unknown>;
  const candidateNative = normalizeNativeSay(source.nativeSay);
  const nativeSay = isSafeHintExpression(candidateNative) ? candidateNative : fallbackNative;
  const analysis = pickAnalysis(source.analysis) || fallbackAnalysisText;
  const structureNote = normalizeStructureNote(source.structureNote);

  return {
    nativeSay,
    analysis,
    ...(structureNote ? { structureNote } : {}),
  };
}

function limitStructureNotes(response: FeedbackResponse): FeedbackResponse {
  let keptOne = false;
  const limited = {} as FeedbackResponse;

  for (const key of FEEDBACK_LEVEL_KEYS) {
    const level = response[key];
    const note = normalizeStructureNote(level.structureNote);

    if (!keptOne && note) {
      limited[key] = {
        nativeSay: level.nativeSay,
        analysis: level.analysis,
        structureNote: note,
      };
      keptOne = true;
      continue;
    }

    limited[key] = {
      nativeSay: level.nativeSay,
      analysis: level.analysis,
    };
  }

  return limited;
}

function localizeFeedbackResponse(response: FeedbackResponse, uiLanguage: UiLanguage): FeedbackResponse {
  const localized = {} as FeedbackResponse;

  for (const key of FEEDBACK_LEVEL_KEYS) {
    const level = response[key];
    const structureNote = localizeStructureNote(normalizeStructureNote(level.structureNote), uiLanguage);

    localized[key] = {
      nativeSay: level.nativeSay,
      analysis: localizeAnalysisText(level.analysis, uiLanguage),
      ...(structureNote ? { structureNote } : {}),
    };
  }

  return localized;
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

function buildFinalResponse(source: FeedbackResponse, uiLanguage: UiLanguage, userText: string): FeedbackResponse {
  const primary = limitStructureNotes(localizeFeedbackResponse(source, uiLanguage));
  if (hasValidExpressions(primary)) {
    return primary;
  }

  const fallback = limitStructureNotes(localizeFeedbackResponse(buildFallbackResponse(userText), uiLanguage));
  if (hasValidExpressions(fallback)) {
    return fallback;
  }

  return limitStructureNotes(localizeFeedbackResponse(buildHardFallback(), uiLanguage));
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

  if (!userText) {
    return NextResponse.json({ error: "文本不能为空" }, { status: 400 });
  }

  try {
    const npcId = parseNpcId(body.npcId);
    const npcExpressionContext = getNpcExpressionContext(npcId);
    const systemPrompt = `${SYSTEM_PROMPT}

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
- If uiLanguage is "en", analysis and structureNote.explanation must be in English only.
- If uiLanguage is "zh", analysis and structureNote.explanation must be in Chinese only.
- All suggested expressions and structureNote.examples must remain Japanese.
- Do not fail just because the input is fragmented.
- structureNote is optional. If there is no clear reusable pattern, omit it.
- Never fail the whole response just because no structureNote is available.`,
        },
      ],
      { temperature: 0.5, jsonMode: true }
    );

    let parsed: Partial<FeedbackResponse>;
    try {
      parsed = parseFeedbackResponseText(raw);
    } catch (parseError) {
      console.warn("[api/feedback] Using fallback expression hints", {
        reason: parseError instanceof Error ? parseError.message : "parse_failed",
        userTextLength: userText.length,
        rawPreview: raw.slice(0, 240),
      });
      return NextResponse.json(buildFinalResponse(buildFallbackResponse(userText), uiLanguage, userText));
    }

    const fallback = buildFallbackResponse(userText);
    const normalized: FeedbackResponse = {
      casual: normalizeLevel(parsed.casual, fallback.casual.nativeSay, fallback.casual.analysis),
      business: normalizeLevel(parsed.business, fallback.business.nativeSay, fallback.business.analysis),
      formal: normalizeLevel(parsed.formal, fallback.formal.nativeSay, fallback.formal.analysis),
    };

    const finalResponse = buildFinalResponse(normalized, uiLanguage, userText);

    if (!hasValidExpressions(finalResponse)) {
      console.warn("[api/feedback] Using fallback expression hints", {
        reason: "no_valid_expressions_after_normalization",
        userTextLength: userText.length,
        rawPreview: raw.slice(0, 240),
      });
      return NextResponse.json(buildFinalResponse(buildFallbackResponse(userText), uiLanguage, userText));
    }

    return NextResponse.json(finalResponse);
  } catch (error) {
    console.warn("[api/feedback] Using fallback expression hints", {
      reason: error instanceof Error ? error.message : "unknown",
      userTextLength: userText.length,
    });
    return NextResponse.json(buildFinalResponse(buildFallbackResponse(userText), uiLanguage, userText));
  }
}
