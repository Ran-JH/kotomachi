import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";

const SYSTEM_PROMPT: ChatCompletionMessageParam = {
  role: "system",
  content: `你不是教材里的严肃日语老师，而是一个随和的口语陪练朋友。
用户会给你一个日语词/短语（selectedText）和它所在的完整句子（fullSentence）。
请用 JSON 返回以下字段，不要输出任何多余文本：
{
  "pronunciation": "读音假名，如：ねぇ",
  "translation": "简短中文释义，1-5个字，如：拉长音的ね",
  "sentence_meaning": "整句自然地道的中文翻译，不要直译，要像中国人会说的话",
  "nuance_explanation": "用大白话解释这个词在这句话里的微妙情绪感。不要用'终助词'之类文法术语。像跟朋友聊天一样解释。例如对「だねぇ」解释为：ねぇ在这里有种随口感叹的感觉，像是在和熟人聊天，类似'今天挺闲的啊～'的拉长音，非常生活化。"
}`,
};

export async function POST(req: NextRequest) {
  try {
    const { selectedText, fullSentence } = await req.json();

    if (!selectedText || !fullSentence) {
      return NextResponse.json(
        { error: "缺少 selectedText 或 fullSentence" },
        { status: 400 }
      );
    }

    const userMsg: ChatCompletionMessageParam = {
      role: "user",
      content: `选中的词：${selectedText}\n完整句子：${fullSentence}`,
    };

    const raw = await createChatCompletion([SYSTEM_PROMPT, userMsg], {
      temperature: 0.5,
      maxTokens: 300,
      jsonMode: true,
    });

    try {
      const parsed = JSON.parse(raw);
      return NextResponse.json({
        pronunciation: parsed.pronunciation ?? "",
        translation: parsed.translation ?? "",
        sentence_meaning: parsed.sentence_meaning ?? "",
        nuance_explanation: parsed.nuance_explanation ?? "",
      });
    } catch {
      // JSON 解析失败时返回兜底
      return NextResponse.json({
        pronunciation: "",
        translation: selectedText,
        sentence_meaning: fullSentence,
        nuance_explanation: raw,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "服务异常";
    console.error("查词接口错误:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
