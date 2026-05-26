import { NextRequest, NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const { userText } = await req.json();

    if (!userText?.trim()) {
      return NextResponse.json({ fact: null });
    }

    const fact = await createChatCompletion(
      [
        {
          role: "system",
          content: `从用户日语消息中提取一个值得记住的个人事实（爱好、计划、工作、宠物等）。
如果没有值得记住的，只返回空字符串。只返回事实本身，10字以内中文或日文，不要解释。`,
        },
        { role: "user", content: userText },
      ],
      { temperature: 0.2, maxTokens: 40 }
    );

    const trimmed = fact.trim();
    if (!trimmed || trimmed === "无" || trimmed === "なし") {
      return NextResponse.json({ fact: null });
    }

    return NextResponse.json({ fact: trimmed });
  } catch (error) {
    console.error("Memory extract error:", error);
    return NextResponse.json({ fact: null });
  }
}
