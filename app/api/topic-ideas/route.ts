import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";
import { isNpcId, type NpcId } from "@/lib/npc";

export const runtime = "nodejs";

type TopicIdeasRequestBody = {
  npcId?: string;
  recentMessages?: Array<{
    role?: "user" | "assistant";
    content?: string;
  }>;
  uiLanguage?: "zh" | "en";
};

type TopicIdeaItem = {
  text: string;
};

const NPC_SCENE_HINTS: Record<NpcId, string> = {
  misaki: "下北泽咖啡馆。当前更适合聊咖啡、味道、店内安静、雨天、推荐、点单和轻松停留。",
  kimura: "便利店夜勤。当前更适合聊新商品、夜宵、疲惫、值班、顺手买东西和随口寒暄。",
  taisho: "居酒屋晚间。当前更适合聊下班后小聚、点酒、推荐、收尾、雨夜和轻松收工。",
};

const FALLBACK_IDEAS: Record<NpcId, string[]> = {
  misaki: [
    "グアテマラの豆、どんな味ですか？",
    "雨の日に合うおすすめ、ありますか？",
    "それを一つお願いします。",
  ],
  kimura: [
    "今日はおすすめありますか？",
    "夜に食べやすいものありますか？",
    "その新商品、気になります。",
  ],
  taisho: [
    "今日は軽く一杯いけますか？",
    "おすすめの一品ありますか？",
    "仕事終わりにちょうどいいの、ありますか？",
  ],
};

function normalizeText(text: string, maxLength = 300): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > maxLength ? `${compact.slice(0, maxLength).trimEnd()}…` : compact;
}

function normalizeMessages(raw: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(-8)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = (item as { role?: string }).role;
      const content = (item as { content?: string }).content;
      if (role !== "user" && role !== "assistant") return null;
      if (typeof content !== "string") return null;
      const text = normalizeText(content, 300);
      if (!text) return null;
      return { role, content: text };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => Boolean(item));
}

function fallbackIdeasFor(npcId: NpcId): TopicIdeaItem[] {
  return FALLBACK_IDEAS[npcId].slice(0, 3).map((text) => ({ text }));
}

function sanitizeIdeas(rawIdeas: unknown, npcId: NpcId): TopicIdeaItem[] {
  if (!Array.isArray(rawIdeas)) return fallbackIdeasFor(npcId);

  const seen = new Set<string>();
  const ideas = rawIdeas
    .map((item) => {
      if (typeof item === "string") return item;
      if (!item || typeof item !== "object") return "";
      return typeof (item as { text?: unknown }).text === "string"
        ? String((item as { text: string }).text)
        : "";
    })
    .map((text) => normalizeText(text, 120))
    .filter((text) => {
      if (!text || seen.has(text)) return false;
      seen.add(text);
      return true;
    })
    .slice(0, 3)
    .map((text) => ({ text }));

  return ideas.length > 0 ? ideas : fallbackIdeasFor(npcId);
}

function buildPrompt(npcId: NpcId): string {
  const sceneHint = NPC_SCENE_HINTS[npcId];
  return `你是一个日语学习产品的“话题生成器”，不是 NPC 本人。

你的任务不是回复用户，而是根据最近聊天，生成 3 条“用户下一句可以对 NPC 说的话”。

## 目标
- 顺着当前上下文继续聊，不要重开话题。
- 每条都要短、自然、低压力，适合初中级学习者。
- 每条只写一句，不要解释，不要翻译，不要评价用户。
- 输出必须是用户可直接说的日语句子，不是 NPC 的回复。
- 不要写老师式、客服式、考试式句子。
- 不要输出“もっと自然な言い方を知りたいです”这种工具句，除非上下文真的在问表达。
- 如果上下文很少，就结合当前 NPC 场景给出轻量 starter，但仍然是“下一句可以说的话”。

## 当前 NPC 场景
${sceneHint}

## 输出要求
- 严格返回 JSON。
- 只允许以下结构：
{
  "ideas": [
    { "text": "..." },
    { "text": "..." },
    { "text": "..." }
  ]
}
- ideas 里只放 3 条左右。
- 每条尽量 1 句。
- 不要输出 markdown。
- 不要输出额外说明。`;
}

export async function POST(req: NextRequest) {
  let resolvedNpcId: NpcId = "misaki";
  try {
    const body = (await req.json()) as TopicIdeasRequestBody;
    const rawNpcId = body.npcId ?? "";
    const npcId: NpcId = isNpcId(rawNpcId) ? rawNpcId : "misaki";
    resolvedNpcId = npcId;
    const recentMessages = normalizeMessages(body.recentMessages);

    if (recentMessages.length === 0) {
      return NextResponse.json({ ideas: fallbackIdeasFor(npcId) });
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildPrompt(npcId) },
      {
        role: "user",
        content: JSON.stringify({
          npcId,
          recentMessages,
          uiLanguage: body.uiLanguage === "en" ? "en" : "zh",
        }),
      },
    ];

    const raw = await createChatCompletion(messages, {
      temperature: 0.75,
      maxTokens: 280,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as { ideas?: unknown };
    const ideas = sanitizeIdeas(parsed.ideas, npcId);
    return NextResponse.json({ ideas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "service error";
    console.warn("[topic-ideas] route error:", message);
    return NextResponse.json({ ideas: fallbackIdeasFor(resolvedNpcId) });
  }
}
