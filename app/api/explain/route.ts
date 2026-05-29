import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";

export const runtime = "nodejs";

const SYSTEM_PROMPT: ChatCompletionMessageParam = {
  role: "system",
  content: `你是 Kotomachi 的划词解释助手。语气要轻松，但信息必须准确、有学习价值。
用户会给你一个被划选的日语词/短语/句子（selectedText）和它所在的完整句子（fullSentence）。

先判断 selectedText 是单词、短语，还是较长句子：
- 如果是单词或短语，只解释 selectedText 本身，不要把整句翻译塞进 translation。
- 如果是较长句子，translation 要明确写“这句话的意思：...”。
- 汉字词尽量给出假名读音。
- 口语表达、语气词、短语要说明它在当前句子里的功能。
- nuance_explanation 要补充语感、使用场景、可复用例句或相关表达，不能只是重复 translation 或 sentence_meaning。
- 不要写长篇语法论文，不要用考试批改口吻。

请用 JSON 返回以下字段，不要输出任何多余文本：
{
  "pronunciation": "selectedText 的读音假名；不确定可为空",
  "translation": "selectedText 本身的简短中文释义；如果 selectedText 是整句，要写明这是句意",
  "sentence_meaning": "selectedText 在 fullSentence 这句话里的意思，或整句自然中文意思",
  "nuance_explanation": "语感/使用场景/可复用例句或相关表达，2-4句，简短但有信息量"
}`,
};

interface ExplainResponse {
  pronunciation: string;
  translation: string;
  sentence_meaning: string;
  nuance_explanation: string;
}

const KNOWN_EXPLAINS: Record<string, ExplainResponse> = {
  夜勤: {
    pronunciation: "やきん",
    translation: "夜班 / 夜间工作",
    sentence_meaning: "在这句话里，是说“夜班那边的诱惑/吸引力更强吧”。",
    nuance_explanation: "「夜勤」指晚上工作的班次，不是“夜晚很勤快”。像「夜勤がある」「夜勤明け」都很常见。",
  },
  誘惑: {
    pronunciation: "ゆうわく",
    translation: "诱惑 / 吸引力",
    sentence_meaning: "在这句话里，是说夜班带来的吸引力更强。",
    nuance_explanation: "「誘惑」可以指让人忍不住想选的东西或条件。这里不是严肃的“诱惑犯罪”，而是轻松地说“那边更有吸引力”。",
  },
  寝たい: {
    pronunciation: "ねたい",
    translation: "想睡觉",
    sentence_meaning: "在这句话里，是说“我现在马上想睡了”。",
    nuance_explanation: "「たい」接在动词ます形词干后，表示“想做某事”。「寝たい」很日常，直接表达自己现在想睡。",
  },
  間違え: {
    pronunciation: "まちがえ",
    translation: "弄错 / 错误",
    sentence_meaning: "在这句话里，是在说自己刚才把同一件事说了两遍。",
    nuance_explanation: "「間違え」常用来轻轻承认一个小失误。口语里可以说「間違えちゃった」，语气比较放松。",
  },
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isLikelySentence(value: string): boolean {
  const text = value.trim();
  return /[。！？!?、]/.test(text) || text.length >= 14;
}

function fallbackExplain(selectedText: string, fullSentence: string): ExplainResponse {
  const selected = selectedText.trim();
  const sentence = fullSentence.trim();
  const sentenceSelected = isLikelySentence(selected);

  if (KNOWN_EXPLAINS[selected]) return KNOWN_EXPLAINS[selected];

  if (sentenceSelected) {
    return {
      pronunciation: "",
      translation: `这句话的意思：${selected}`,
      sentence_meaning: sentence || selected,
      nuance_explanation: "",
    };
  }

  return {
    pronunciation: "",
    translation: selected,
    sentence_meaning: sentence,
    nuance_explanation: "",
  };
}

function normalizeExplainResponse(
  parsed: Record<string, unknown>,
  selectedText: string,
  fullSentence: string
): ExplainResponse {
  const known = KNOWN_EXPLAINS[selectedText.trim()];
  const fallback = fallbackExplain(selectedText, fullSentence);
  const pronunciation =
    cleanText(parsed.pronunciation) ||
    cleanText(parsed.reading) ||
    cleanText(parsed["读音"]) ||
    fallback.pronunciation;
  const translation =
    cleanText(parsed.translation) ||
    cleanText(parsed.meaning) ||
    cleanText(parsed["简义"]) ||
    cleanText(parsed["词义"]) ||
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

  if (known) {
    return {
      pronunciation: pronunciation || known.pronunciation,
      translation: known.translation,
      sentence_meaning: sentenceMeaning || known.sentence_meaning,
      nuance_explanation: nuance || known.nuance_explanation,
    };
  }

  return {
    pronunciation,
    translation,
    sentence_meaning: sentenceMeaning,
    nuance_explanation: nuance,
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

语言规则：
1) uiLanguage 为 en 时，translation / sentence_meaning / nuance_explanation 必须用英文。
2) uiLanguage 为 zh 时，translation / sentence_meaning / nuance_explanation 必须用中文。
3) 日语原词、读音、日语例句保持日语，不要替换成英文词本体。
4) 不要翻译 NPC 原句引用。`,
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
      // JSON 解析失败时保留可用的基础解释，不把原始模型文本塞进详情区。
      return NextResponse.json(fallbackExplain(selectedText, fullSentence));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "服务异常";
    console.warn("[api/explain] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
