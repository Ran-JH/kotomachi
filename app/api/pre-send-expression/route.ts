import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";
import { getConversationScene } from "@/lib/conversation-scenes";
import { isNpcId, type NpcId } from "@/lib/npc";

export const runtime = "nodejs";

type PreSendExpressionRequestBody = {
  npcId?: string;
  userIntent?: string;
  activeSceneId?: string | null;
  recentMessages?: Array<{
    role?: "user" | "assistant";
    content?: string;
  }>;
};

type SuggestionResponse = {
  suggestions: string[];
};

const NPC_RELATION_HINTS: Record<NpcId, string> = {
  aoi: "Aoi is a same-age friend. Keep the line natural and casual.",
  haruka: "Haruka is a gentle senior around campus. Keep the line lightly polite.",
  kimura: "Kimura is a young convenience-store clerk. Keep the line lightly polite with a bit of shop distance.",
  misaki: "Misaki is a warm cafe staff member. Keep the line lightly polite.",
  taisho: "Taisho is an izakaya owner with regular-customer warmth. Natural plain speech is okay.",
  nana: "Nana is a life-support lounge helper. Keep the line lightly polite and practical, without sounding like advice.",
};

function normalizeIntent(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 300);
}

function normalizeMessages(raw: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(raw)) return [];

  return raw
    .slice(-6)
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const role = (item as { role?: unknown }).role;
      const content = (item as { content?: unknown }).content;
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
      const normalizedContent = content.replace(/\s+/g, " ").trim().slice(0, 200);
      if (!normalizedContent) return null;
      return { role, content: normalizedContent };
    })
    .filter((item): item is { role: "user" | "assistant"; content: string } => Boolean(item));
}

function sanitizeSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  return raw
    .map((item) => (typeof item === "string" ? item : ""))
    .map((text) => text.replace(/\s+/g, " ").trim())
    .map((text) => text.replace(/^[`"'\u300c\u300d\u300e\u300f]+|[`"'\u300c\u300d\u300e\u300f]+$/gu, ""))
    .map((text) => text.replace(/^[0-9\uFF10-\uFF19]+[.)\u3001\s-]*/u, ""))
    .filter((text) => {
      if (!text || seen.has(text)) return false;
      seen.add(text);
      return true;
    })
    .slice(0, 3);
}

function buildPrompt(
  npcId: NpcId,
  userIntent: string,
  activeSceneId?: string | null,
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>,
): string {
  const scene = getConversationScene(activeSceneId);
  const recentContext = recentMessages && recentMessages.length > 0
    ? recentMessages.map((message) => `${message.role}: ${message.content}`).join("\n")
    : "none";

  const sceneBlock = scene
    ? [
        `Scene id: ${scene.id}`,
        `Scene title: ${scene.title}`,
        `Scene setup: ${scene.setup}`,
        `User goal in scene: ${scene.userGoal}`,
        `NPC opening: ${scene.npcOpening}`,
      ].join("\n")
    : "none";

  return [
    "You write pre-send Japanese suggestions for a learner.",
    "The learner knows what they mean but cannot phrase it yet.",
    "Return 2 or 3 candidate lines the learner can send next.",
    "Each line must be natural Japanese only, 1 to 2 short clauses, with no explanation.",
    "No Chinese, no English, no emoji, no markdown, no numbering, no quotation marks.",
    "Do not evaluate the learner. Do not teach grammar. Do not add study notes.",
    "Make each suggestion slightly different, but all should fit the same intent.",
    NPC_RELATION_HINTS[npcId],
    scene ? "If a guided scene exists, fit the current scene and write only the learner's next line." : "If no guided scene exists, fit the recent chat naturally.",
    `Learner intent: ${userIntent}`,
    `Recent chat:\n${recentContext}`,
    `Active scene:\n${sceneBlock}`,
    'Return strict JSON only: {"suggestions":["...","...","..."]}',
  ].join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PreSendExpressionRequestBody;
    const npcId: NpcId = isNpcId(body.npcId ?? "") ? body.npcId : "misaki";
    const userIntent = normalizeIntent(body.userIntent);

    if (!userIntent) {
      return NextResponse.json({ error: "userIntent is required" }, { status: 400 });
    }

    const recentMessages = normalizeMessages(body.recentMessages);
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: buildPrompt(npcId, userIntent, body.activeSceneId, recentMessages),
      },
      {
        role: "user",
        content: JSON.stringify({
          npcId,
          userIntent,
          activeSceneId: body.activeSceneId ?? null,
          recentMessages,
        }),
      },
    ];

    const raw = await createChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 220,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as Partial<SuggestionResponse>;
    const suggestions = sanitizeSuggestions(parsed.suggestions);

    if (suggestions.length === 0) {
      throw new Error("empty suggestions");
    }

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "service error";
    console.warn("[pre-send-expression] route error:", message);
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
  }
}
