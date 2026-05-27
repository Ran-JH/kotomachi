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

function normalizeLevel(
  raw: Partial<FeedbackLevel> | undefined,
  fallbackSay: string,
  fallbackAnalysis: string
): FeedbackLevel {
  return {
    nativeSay:
      typeof raw?.nativeSay === "string" && raw.nativeSay.trim()
        ? raw.nativeSay.trim()
        : fallbackSay,
    analysis: pickAnalysis(raw) || fallbackAnalysis,
  };
}

function buildFallbackResponse(userText: string): FeedbackResponse {
  const gentle =
    "你的原句意思对方能听懂，只是场合感还可以再贴近一点。";
  return {
    casual: {
      nativeSay: userText,
      analysis: `【场合】跟朋友聊天可以软一点、短一点，不必每句都很完整。【原句】${gentle} 在闲聊里偶尔会显得稍微「认真过头」。`,
    },
    business: {
      nativeSay: userText,
      analysis: `【场合】职场和日常社交要礼貌、清爽，既不过分随便也不端着。【原句】${gentle} 有时会让对方听出「课本感」或距离感不对。`,
    },
    formal: {
      nativeSay: userText,
      analysis: `【场合】正式场合需要更完整的敬语和结构，显得尊重、可靠。【原句】${gentle} 在正式场景里可能显得不够郑重。`,
    },
  };
}

const SYSTEM_PROMPT = `你是「言街」的日语表达顾问，气质像 ChatGPT 一样克制、清晰，像朋友一样温和，绝不说教、不打击用户。

用户主动点击了 💡，想对比「同一句话」在三种日本社交场合下的地道说法，并理解因果。

请严格只输出 JSON（不要 markdown 代码块），结构如下：
{
  "casual": {
    "nativeSay": "轻松闲聊场合的地道日文（偏タメ口或柔软丁寧語，可带适量 😊）",
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
- 每档 analysis 80～180 字，好懂、可扫读，禁止堆砌语法术语
- 不要说「你错了」，改用「这里会有点…」「更自然的做法是…」

【重要】混合语言处理规则：
- 用户的句子中经常混入英语或中文词汇，这是因为他们还不会对应的日语表达才用母语/英语替代的
- 绝对不要简单说"不要用英语/中文"或"应该用日语"——这毫无帮助
- 必须在 analysis 中重点教学：这个英语/中文词在日语里怎么说，给出具体的日语表达，并用简短的话解释用法和语境
- nativeSay 中必须把所有英语/中文替换为地道的日语表达
- 例如用户说"今日は tired"，analysis 应写"tired 在日语里说 疲れた（つかれた），跟朋友可以说 今日疲れちゃった，更随意的话 疲れたー 就行"

- 不要输出 wordTips 或任何额外字段`;

export async function POST(req: NextRequest) {
  let userText = "";

  try {
    const body = await req.json();
    userText = (body.userText ?? "").trim();

    if (!userText) {
      return NextResponse.json({ error: "文本不能为空" }, { status: 400 });
    }

    const raw = await createChatCompletion(
      [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `用户刚才说的日语（原句）：\n${userText}`,
        },
      ],
      { temperature: 0.5, jsonMode: true }
    );

    const parsed = JSON.parse(raw) as Partial<FeedbackResponse>;

    const response: FeedbackResponse = {
      casual: normalizeLevel(
        parsed.casual,
        userText,
        "【场合】闲聊重在亲近感。【原句】你的句子能懂，换更软的说法会更像日本朋友。"
      ),
      business: normalizeLevel(
        parsed.business,
        userText,
        "【场合】职场社交要礼貌得体。【原句】你的句子能懂，稍微调整语体会更自然。"
      ),
      formal: normalizeLevel(
        parsed.formal,
        userText,
        "【场合】正式场合要稳重、完整。【原句】你的句子能懂，敬语和结构可以再讲究一点。"
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/feedback]", error);
    return NextResponse.json(buildFallbackResponse(userText || "（空）"));
  }
}
