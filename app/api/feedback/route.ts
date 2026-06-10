import { NextRequest, NextResponse } from "next/server";
import type { FeedbackLevel, FeedbackResponse } from "@/lib/feedback-types";
import { createChatCompletion } from "@/lib/llm";

export const runtime = "nodejs";

/** 兼容旧字段 explain，统一为 analysis */
function pickAnalysis(raw: Partial<FeedbackLevel> | undefined): string {
  if (typeof raw?.analysis === "string" && raw.analysis.trim()) {
    return raw.analysis.trim();
  }
  const legacy = raw as { explain?: string } | undefined;
  if (typeof legacy?.explain === "string" && legacy.explain.trim()) {
    return legacy.explain.trim();
  }
  return "";
}

function cleanAsrArtifacts(value: string): string {
  return value
    .replace(
      /([ぁ-んァ-ヶ一-龠々ー]{1,8})[-‐‑‒–—]\s*([ぁ-んァ-ヶ一-龠々ー]{1,24})/g,
      (match, before: string, after: string) => after.startsWith(before) ? after : match,
    )
    .replace(/\b(\w+)\s+\1\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isDecorativeCodePoint(codePoint: number): boolean {
  return (
    (codePoint >= 0x1f300 && codePoint <= 0x1faff) ||
    (codePoint >= 0x2600 && codePoint <= 0x27bf)
  );
}

function stripDecorations(value: string): string {
  let result = "";
  for (const char of value) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (isDecorativeCodePoint(codePoint)) continue;
    if (char === "\uFF0A" || char === "*" || char === "_" || char === "`" || char === "#" || char === ">") continue;
    result += char;
  }
  return result
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\uFF3B[^\uFF3D]*\uFF3D/g, "")
    .replace(/(?:\uFF08\u7B11\uFF09|\(\u7B11\)|www+|[w\uFF57]{3,})/gi, "")
    .replace(/[~\u301C\uFF5E]{2,}/g, "\u301C")
    .trim();
}

function normalizeNativeSay(value: string): string {
  return stripDecorations(cleanAsrArtifacts(value).replace(/^["「『]|["」』]$/g, ""));
}

function compactExpression(value: string): string {
  return value.replace(/[、。！？!?…\s]/g, "");
}

function sameExpression(a: string, b: string): boolean {
  return compactExpression(a) === compactExpression(b);
}

function containsAsrArtifact(value: string): boolean {
  return /[ぁ-んァ-ヶ一-龠々ー]{1,8}[-‐‑‒–—]\s*[ぁ-んァ-ヶ一-龠々ー]{1,24}/.test(value);
}

function containsLatinFragment(value: string): boolean {
  return /[A-Za-z]{2,}/.test(value);
}

/**
 * 检测是否包含危险的长英文片段（3个或更多连续英文单词）
 */
function containsLongEnglishPhrase(value: string): boolean {
  // 匹配3个或更多连续英文单词
  const multiWordPattern = /[A-Za-z]+\s+[A-Za-z]+\s+[A-Za-z]+/;
  if (multiWordPattern.test(value)) {
    return true;
  }
  // 检测是否有过长的连续字母（超过4个）且不是日语常用英文词
  const longWordPattern = /[A-Za-z]{5,}/g;
  const matches = value.match(longWordPattern);
  if (!matches) return false;
  
  // 允许的安全英文词
  const safeWords = new Set([
    "LINE", "SNS", "AI", "カフェ", "CAFE", "JAPAN", "TOKYO", "OSAKA",
    "APP", "WEB", "MAIL", "NET", "PC", "TV", "CD", "DVD", "OK", "NG",
  ]);
  
  // 检查是否有任何非安全的长词
  return matches.some(word => !safeWords.has(word.toUpperCase()));
}

/**
 * 检测是否包含用户原句中的连续英文片段
 */
function containsOriginalEnglishFragment(value: string, originalText: string): boolean {
  // 从原句中提取英文单词
  const englishWords = originalText.match(/[A-Za-z]{2,}/g) || [];
  if (englishWords.length < 2) return false;
  
  // 检查是否包含连续的多个英文单词
  for (let i = 0; i < englishWords.length - 1; i++) {
    const phrase = `${englishWords[i]} ${englishWords[i + 1]}`;
    if (value.toLowerCase().includes(phrase.toLowerCase())) {
      return true;
    }
  }
  return false;
}

function includesAny(value: string, words: string[]): boolean {
  return words.some((word) => value.toLowerCase().includes(word.toLowerCase()));
}

function feedbackLevel(nativeSay: string, analysis: string): FeedbackLevel {
  return { nativeSay, analysis };
}

const VALID_NPC_IDS = ["aoi", "haruka", "kimura", "misaki", "taisho", "nana"] as const;
const VALID_NPC_ID_SET = new Set<string>(VALID_NPC_IDS);

function parseNpcId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return VALID_NPC_ID_SET.has(value) ? value : null;
}

function getNpcExpressionContext(npcId: string | null): string {
  switch (npcId) {
    case "aoi":
      return "Current conversation partner: Aoi, a same-age student friend. Keep casual suggestions friendly and natural, but not romantic, clingy, or overly intimate.";
    case "haruka":
      return "Current conversation partner: Haruka, a graduate-school senior. Suggestions should be lightly polite, academic-life friendly, and not professor-like.";
    case "kimura":
      return "Current conversation partner: Kimura, a friendly convenience-store staff member. Suggestions may lean toward everyday service-counter and casual neighborhood language.";
    case "misaki":
      return "Current conversation partner: Misaki, a calm cafe staff member. Suggestions should feel gentle, lightly polite, and suitable for a cafe conversation.";
    case "taisho":
      return "Current conversation partner: Taisho, an izakaya owner with a regular-customer distance. Suggestions may feel warm and familiar, but not preachy or like life advice.";
    case "nana":
      return "Current conversation partner: Nana, a life-support lounge helper for newcomers in Japan. Suggestions should help users ask everyday life questions clearly and politely, without legal, rental, immigration, medical, or financial conclusions.";
    default:
      return "No specific NPC context. Use general Japanese register guidance.";
  }
}

const SAFE_HINT_LATIN_WORDS = new Set([
  "LINE",
  "SNS",
  "AI",
  "CAFE",
  "JAPAN",
  "TOKYO",
  "OSAKA",
  "APP",
  "WEB",
  "MAIL",
  "NET",
  "PC",
  "TV",
  "CD",
  "DVD",
  "OK",
  "NG",
]);

function hasUnsafeLatinWord(value: string): boolean {
  let current = "";

  for (const char of value) {
    const code = char.charCodeAt(0);
    const isLatin = (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
    if (isLatin) {
      current += char;
      continue;
    }

    if (current) {
      if (!SAFE_HINT_LATIN_WORDS.has(current.toUpperCase())) {
        return true;
      }
      current = "";
    }
  }

  if (current) {
    return !SAFE_HINT_LATIN_WORDS.has(current.toUpperCase());
  }

  return false;
}

function isSafeHintExpression(value: string, originalText: string): boolean {
  const normalized = normalizeNativeSay(value);
  if (!normalized) return false;
  if (isPrimarilyEnglish(normalized)) return false;
  if (hasUnsafeLatinWord(normalized)) return false;
  if (containsLongEnglishPhrase(normalized)) return false;
  if (containsOriginalEnglishFragment(normalized, originalText)) return false;
  return true;
}

/**
 * 检测是否主要是英文内容
 */
function isPrimarilyEnglish(text: string): boolean {
  const englishChars = (text.match(/[A-Za-z]/g) || []).length;
  const japaneseChars = (text.match(/[ぁ-んァ-ヶ一-龠々ー]/g) || []).length;
  const totalChars = text.length;

  // 如果英文占比超过 60%，且日语字符很少，则认为是英文
  if (totalChars === 0) return false;
  if (japaneseChars === 0 && englishChars >= 2) return true;
  if (englishChars > 0 && japaneseChars === 0) return true;
  if (englishChars > japaneseChars * 2) return true;
  return false;
}

function buildIntentFallback(userText: string): FeedbackResponse {
  const cleaned = cleanAsrArtifacts(userText);

  if (includesAny(cleaned, ["寝たい", "眠", "sleep", "tired"]) && includesAny(cleaned, ["言わない", "もう", "今すぐ"])) {
    return {
      casual: feedbackLevel(
        "もう言わないで。今すぐ寝たい。",
        "【场合】朋友之间可以直接说「もう言わないで」，语气清楚但不说教。【原句】原句里有 ASR 断裂时，重点是“别再说了、我现在想睡”，所以整理成短句会更自然。",
      ),
      business: feedbackLevel(
        "すみません、もうこの話は大丈夫です。今すぐ休みたいです。",
        "【场合】普通自然的说法会先用「すみません」缓冲，再表达想结束话题。【原句】这里不需要解释自己为什么累，直接说「休みたいです」比断裂表达更清楚。",
      ),
      formal: feedbackLevel(
        "申し訳ありませんが、この件はいったんここまでにして、休ませていただきたいです。",
        "【场合】正式场合要避免太直接的命令感，用「いったんここまで」「休ませていただきたいです」更稳。【原句】保留“想停止对话并休息”的意图，但语气更克制。",
      ),
    };
  }

  if (includesAny(cleaned, ["test", "テスト", "試験", "preparation", "準備", "confirm", "finished"])) {
    return {
      casual: feedbackLevel(
        "テストの準備が終わったって確認できて、ちょっと安心した。",
        "【场合】跟朋友说时可以用「ちょっと安心した」，自然表达松一口气的感觉。【原句】英文残句的核心是“确认准备已经完成，所以放松了”，不需要逐词翻译。",
      ),
      business: feedbackLevel(
        "テストの準備が終わったことを確認できて、少し安心しました。",
        "【场合】普通自然的说法用「確認できて」「安心しました」，适合同学、老师或日常说明。【原句】把长英文整理成一条因果清楚的日语句子，会更容易听懂。",
      ),
      formal: feedbackLevel(
        "試験の準備が完了していることを確認でき、安心いたしました。",
        "【场合】更礼貌时用「試験」「完了していること」「安心いたしました」会更正式。【原句】意思仍是确认准备完成后的安心感，只是词汇和句尾更郑重。",
      ),
    };
  }

  if (includesAny(cleaned, ["哲学", "philosophy"]) && includesAny(cleaned, ["寝たい", "眠", "難", "むずか"])) {
    return {
      casual: feedbackLevel(
        "哲学って難しいから、聞いてると眠くなっちゃうよね。",
        "【场合】朋友之间可以用「〜ちゃうよね」表达共感，轻松又自然。【原句】原句有些词序混乱，但意图像是在说“哲学很难，听着会想睡”。",
      ),
      business: feedbackLevel(
        "哲学は少し難しいので、聞いていると眠くなってしまいますね。",
        "【场合】普通自然的说法用「少し難しいので」和「〜てしまいますね」，礼貌但不僵硬。【原句】把零散表达整理成原因和结果，会更像日常说明。",
      ),
      formal: feedbackLevel(
        "哲学は内容が難解なため、聞いていると眠くなってしまうことがあります。",
        "【场合】正式一点可以用「難解なため」「ことがあります」，适合较认真地说明感受。【原句】保留“哲学难、容易困”的意思，但避免口语里的混乱感。",
      ),
    };
  }

  if (includesAny(cleaned, ["レポート", "書かないと", "書かなきゃ"])) {
    return {
      casual: feedbackLevel(
        "明日レポート書かなきゃ。",
        "【场合】朋友之间常把「書かないといけない」缩成「書かなきゃ」，轻松自然。【原句】原句本身没问题，カジュアル档只需要把句尾变得更口语。",
      ),
      business: feedbackLevel(
        "明日レポートを書かないといけません。",
        "【场合】普通自然的说法保留完整结构和丁寧語，适合日常说明。【原句】这句已经很清楚，这一档主要调整为更稳的礼貌句尾。",
      ),
      formal: feedbackLevel(
        "明日までにレポートを作成する必要があります。",
        "【场合】正式场合用「作成する必要があります」更书面、更稳。【原句】意思不变，但词汇从日常的「書く」换成了较正式的「作成する」。",
      ),
    };
  }

  return {
    casual: feedbackLevel("", ""),
    business: feedbackLevel("", ""),
    formal: feedbackLevel("", ""),
  };
}

function normalizeLevel(
  raw: Partial<FeedbackLevel> | undefined,
  fallbackSay: string,
  fallbackAnalysis: string,
  originalText: string
): FeedbackLevel {
  let nativeSay = typeof raw?.nativeSay === "string" && raw.nativeSay.trim()
    ? normalizeNativeSay(raw.nativeSay)
    : fallbackSay;

  if (!isSafeHintExpression(nativeSay, originalText)) {
    nativeSay = "";
  }

  // 安全检查：如果输出是英文或无效，设为空字符串（不展示）
  if (isPrimarilyEnglish(nativeSay)) {
    nativeSay = "";
  }

  return {
    nativeSay,
    analysis: pickAnalysis(raw) || fallbackAnalysis,
  };
}

function containsChinese(text: string): boolean {
  return /[\u4e00-\u9fff]/.test(text);
}

function toEnglishAnalysis(level: "casual" | "business" | "formal", _userText: string): string {
  if (level === "casual") {
    return `Usage: casual chat with friends. Why this works: it keeps your intent and makes the line short and natural. Original note: your message can be understood, but this version sounds smoother in everyday Japanese.`;
  }
  if (level === "business") {
    return `Usage: neutral polite Japanese for daily interactions. Why this works: it keeps the same meaning while improving sentence flow and tone. Original note: your intent stays the same, with clearer wording for normal social contexts.`;
  }
  return `Usage: formal situations such as customer-facing or respectful contexts. Why this works: it uses a more complete polite register while preserving your original intent. Original note: this version sounds more composed than casual phrasing.`;
}

function localizeAnalysisText(
  analysis: string,
  uiLanguage: "zh" | "en",
  level: "casual" | "business" | "formal",
  userText: string
): string {
  const cleaned = analysis
    .replace(/\[(?:场合|場合|usage|scene)\]\s*/gi, "")
    .replace(/\[(?:原句|理由|補足|备注|備考|why|reason|note|analysis)\]\s*/gi, "")
    .trim();

  if (uiLanguage === "en") {
    if (!cleaned || containsChinese(cleaned)) {
      return toEnglishAnalysis(level, userText);
    }
    return cleaned;
  }

  return cleaned;
}

function buildFallbackResponse(userText: string): FeedbackResponse {
  return buildIntentFallback(userText);
}

function needsFallback(response: FeedbackResponse, userText: string): boolean {
  const values = [response.casual.nativeSay, response.business.nativeSay, response.formal.nativeSay];
  const hasBadText = values.some((value) => 
    containsAsrArtifact(value) || 
    containsLongEnglishPhrase(value) || 
    containsOriginalEnglishFragment(value, userText)
  );
  return hasBadText;
}

function repairFeedbackResponse(response: FeedbackResponse, userText: string): FeedbackResponse {
  if (needsFallback(response, userText)) return buildIntentFallback(userText);

  const fallback = buildIntentFallback(userText);
  return {
    casual: response.casual,
    business: sameExpression(response.business.nativeSay, response.casual.nativeSay)
      ? fallback.business
      : response.business,
    formal:
      sameExpression(response.formal.nativeSay, response.casual.nativeSay) ||
      sameExpression(response.formal.nativeSay, response.business.nativeSay)
        ? fallback.formal
        : response.formal,
  };
}

/**
 * 检查响应是否有效（至少有一档有内容）
 */
function hasValidExpressions(response: FeedbackResponse): boolean {
  return Boolean(
    response.casual.nativeSay.trim() ||
    response.business.nativeSay.trim() ||
    response.formal.nativeSay.trim()
  );
}

const SYSTEM_PROMPT = `你是「言街」的日语表达顾问，气质像 ChatGPT 一样克制、清晰，像朋友一样温和，绝不说教、不打击用户。

用户主动点击了 💡，想对比「同一句话」在三种日本社交场合下的地道说法，并理解因果。

请严格只输出 JSON（不要 markdown 代码块），结构如下：
{
  "casual": {
    "nativeSay": "轻松闲聊场合的地道日文（偏タメ口或柔软丁寧語）",
    "analysis": "用中国大白话写一段双层分析，必须包含两层意思，建议用【场合】和【原句】两个小标题引导：① 为什么在这个场合要这么说；② 用户原先的日文在这个场合里具体哪里不太行（语体、距离感、敬语、生硬度等）。语气温和，像陪练朋友。"
  },
  "business": {
    "nativeSay": "职场社交场合的地道日文（便利店/同事/邻居/协作，礼貌但不僵硬）",
    "analysis": "同上双层分析"
  },
  "formal": {
    "nativeSay": "正式交际场合的地道日文（面试/客户/上级/书面，敬语完整）",
    "analysis": "同上双层分析"
  }
}

硬性要求：
- 三档 nativeSay 必须彼此不同，且都保留用户原意
- 先在心里判断用户真实意图，再写三档。不要逐词硬翻译，不要把 ASR 断裂、重复、口吃照抄进 nativeSay
- casual 要像朋友/熟人说话；business 要像日常礼貌语；formal 要用更完整的敬语。不要只改标点或只加 です/ます
- 每档 analysis 80～180 字，好懂、可扫读，禁止堆砌语法术语
- analysis 必须说明真实学习点，例如语气差异、使用场景、句尾自然度、词汇选择、为什么这样说更自然
- 不要说「你错了」，不要考试批改口吻，改用「这里会有点…」「更自然的做法是…」
- 不要写内部解释，例如「系统暂时可能生成完整建议」
- 【关键】nativeSay 必须是完全自然的日语，绝对不要包含用户原句中的英文长片段（如 "i just feel", "these days", "warmer and damper"）或连续英文字母超过3个的非日语常用词
- nativeSay 只能包含：日语假名、汉字、日语标点，以及极少量日语中常用的英文缩写（如 LINE、SNS、AI、カフェ）
- nativeSay 不要包含 emoji、颜文字、markdown、括号动作描写；不要用 😅、😊、😂、w、www、（笑） 来表达情绪

【重要】混合语言处理规则：
- 用户的句子中经常混入英语或中文词汇，这是因为他们还不会对应的日语表达才用母语/英语替代的
- 绝对不要简单说"不要用英语/中文"或"应该用日语"——这毫无帮助
- 必须在 analysis 中重点教学：这个英语/中文词在日语里怎么说，给出具体的日语表达，并用简短的话解释用法和语境
- nativeSay 中必须把所有英语/中文替换为地道的日语表达，完全不要保留原句中的英文片段
- 例如用户说"今日は tired"，analysis 应写"tired 在日语里说 疲れた（つかれた），跟朋友可以说 今日疲れちゃった，更随意的话 疲れたー 就行"

参考意图处理：
- "もう言わないで、私は今すぐって寝たいにな-になった。" 表示「别再说了，我现在马上想睡/想休息」
- "Sorry i feel feel relaxed..." 表示「确认考试准备已经完成，所以安心了」
- "哲学が...寝たい..." 一类句子通常是在说「哲学很难/听着容易困」
- "明日レポートを書かないといけない。" 本身自然，只需要按三档调整语气，不要过度改写

- 不要输出 wordTips 或任何额外字段`;

export async function POST(req: NextRequest) {
  let userText = "";
  let uiLanguage: "zh" | "en" = "zh";

  try {
    const body = await req.json();
    userText = (body.userText ?? "").trim();
    uiLanguage = body.uiLanguage === "en" ? "en" : "zh";
    const npcId = parseNpcId(body.npcId);
    const npcExpressionContext = getNpcExpressionContext(npcId);
    const systemPrompt = `${SYSTEM_PROMPT}

NPC relationship context:
${npcExpressionContext}

Use this only to fine-tune nuance and naturalness. Do not change the user's intended meaning.
Keep the existing three levels: casual, business/natural, formal.
Do not add emoji, kaomoji, markdown, or action descriptions.
Do not include English fragments from the original user input.`;

    if (!userText) {
      return NextResponse.json({ error: "文本不能为空" }, { status: 400 });
    }

    const raw = await createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `用户刚才说的日语（原句）：
${userText}

uiLanguage: ${uiLanguage}

Language rules:
- If uiLanguage is "en": usage / scene / reason / note / analysis must be in English only.
- If uiLanguage is "zh": usage / scene / reason / note / analysis must be in Chinese only.
- All suggested expressions must remain Japanese.
- Japanese examples must remain Japanese.
- The original user message must remain unchanged.
- Do not translate suggested Japanese expressions into English.
- Do not add Chinese explanations when uiLanguage is "en".`,
        },
      ],
      { temperature: 0.5, jsonMode: true }
    );

    const parsed = JSON.parse(raw) as Partial<FeedbackResponse>;

    const response: FeedbackResponse = {
      casual: normalizeLevel(
        parsed.casual,
        "",
        "【场合】闲聊重在亲近感。【原句】你的句子能懂，换更软的说法会更像日本朋友。",
        userText
      ),
      business: normalizeLevel(
        parsed.business,
        "",
        "【场合】职场社交要礼貌得体。【原句】你的句子能懂，稍微调整语体会更自然。",
        userText
      ),
      formal: normalizeLevel(
        parsed.formal,
        "",
        "【场合】正式场合要稳重、完整。【原句】你的句子能懂，敬语和结构可以再讲究一点。",
        userText
      ),
    };

    const repaired = repairFeedbackResponse(response, userText);
    const localized: FeedbackResponse = {
      casual: {
        nativeSay: repaired.casual.nativeSay,
        analysis: localizeAnalysisText(repaired.casual.analysis, uiLanguage, "casual", userText),
      },
      business: {
        nativeSay: repaired.business.nativeSay,
        analysis: localizeAnalysisText(repaired.business.analysis, uiLanguage, "business", userText),
      },
      formal: {
        nativeSay: repaired.formal.nativeSay,
        analysis: localizeAnalysisText(repaired.formal.analysis, uiLanguage, "formal", userText),
      },
    };

    // 如果三档都无效，返回错误状态
    if (!hasValidExpressions(localized)) {
      return NextResponse.json({ error: "无法生成有效的表达提示" }, { status: 400 });
    }

    return NextResponse.json(localized);
  } catch (error) {
    console.warn("[api/feedback] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    const fallback = buildFallbackResponse(userText || "（空）");
    const localizedFallback: FeedbackResponse = {
      casual: {
        nativeSay: fallback.casual.nativeSay,
        analysis: localizeAnalysisText(fallback.casual.analysis, uiLanguage, "casual", userText),
      },
      business: {
        nativeSay: fallback.business.nativeSay,
        analysis: localizeAnalysisText(fallback.business.analysis, uiLanguage, "business", userText),
      },
      formal: {
        nativeSay: fallback.formal.nativeSay,
        analysis: localizeAnalysisText(fallback.formal.analysis, uiLanguage, "formal", userText),
      },
    };
    return NextResponse.json({ error: "表达提示生成失败" }, { status: 500 });
  }
}
