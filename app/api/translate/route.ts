import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";

export const runtime = "nodejs";

const SYSTEM_PROMPT: ChatCompletionMessageParam = {
  role: "system",
  content: `You are a concise translation assistant for Kotomachi.
Translate Japanese text into the target language.

Rules:
1) Output only the translation text.
2) No markdown.
3) No bullet points.
4) No grammar explanation.
5) No extra labels or commentary.
6) Keep tone natural, short, and close to original meaning.`,
};

function cleanOutput(text: string): string {
  return text
    .trim()
    .replace(/^["'「『]/, "")
    .replace(/["'」』]$/, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const targetLanguage = body?.targetLanguage === "en" ? "en" : "zh";

    if (!text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const userPrompt: ChatCompletionMessageParam = {
      role: "user",
      content: `Target language: ${targetLanguage === "en" ? "English" : "Chinese"}.
Text:
${text}`,
    };

    const raw = await createChatCompletion([SYSTEM_PROMPT, userPrompt], {
      temperature: 0.3,
      maxTokens: 220,
    });

    const translation = cleanOutput(raw);
    if (!translation) {
      return NextResponse.json({ error: "Empty translation" }, { status: 502 });
    }

    return NextResponse.json({ translation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "服务异常";
    console.warn("[api/translate] failed", { message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
