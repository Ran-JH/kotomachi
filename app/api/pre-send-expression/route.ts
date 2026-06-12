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

type PreSendTone = "neutral" | "casual" | "polite";

type SuggestionItem = {
  tone: PreSendTone;
  text: string;
};

type SuggestionResponse = {
  suggestions: SuggestionItem[];
};

const TONE_ORDER: PreSendTone[] = ["neutral", "casual", "polite"];

const NPC_RELATION_HINTS: Record<NpcId, string> = {
  aoi: "Aoi is a same-age friend. Default to relaxed everyday speech. Keep polite usable, but not business-like.",
  haruka: "Haruka is a gentle senior around campus. Default to lightly polite speech. Keep casual usable, but not too rough.",
  kimura: "Kimura is a young convenience-store clerk. Default to lightly polite speech with a bit of shop distance. Keep casual usable, but not rude.",
  misaki: "Misaki is a warm cafe staff member. Default to lightly polite speech. Keep polite soft, not stiff service language.",
  taisho: "Taisho is an izakaya owner with regular-customer warmth. Default to natural everyday speech. Keep polite warm, not formal-business.",
  nana: "Nana is a life-support lounge helper. Default to lightly polite practical speech. Keep polite clear and calm, not legalistic or overly stiff.",
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

function sanitizeSuggestionText(value: unknown): string {
  if (typeof value !== "string") return "";

  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[`"'\u300c\u300d\u300e\u300f]+|[`"'\u300c\u300d\u300e\u300f]+$/gu, "")
    .replace(/^[0-9\uFF10-\uFF19]+[.)\u3001\s-]*/u, "");
}

function isTone(value: unknown): value is PreSendTone {
  return value === "neutral" || value === "casual" || value === "polite";
}

function sanitizeSuggestions(raw: unknown): SuggestionItem[] {
  if (!Array.isArray(raw)) return [];

  const byTone = new Map<PreSendTone, string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const tone = (item as { tone?: unknown }).tone;
    const text = sanitizeSuggestionText((item as { text?: unknown }).text);
    if (!isTone(tone) || !text || byTone.has(tone)) continue;
    byTone.set(tone, text);
  }

  return TONE_ORDER
    .map((tone) => {
      const text = byTone.get(tone);
      return text ? { tone, text } : null;
    })
    .filter((item): item is SuggestionItem => Boolean(item));
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
    "Write exactly three candidate lines the learner can send next.",
    "Return one neutral line, one casual line, and one polite line.",
    "neutral: the best default for most situations.",
    "casual: more relaxed and familiar, but still safe and usable.",
    "polite: more respectful, but not stiff, business-like, or overly written.",
    "All three must stay close to the same meaning and context.",
    "Each line must be natural Japanese only, short enough to send as one message, with no explanation.",
    "No Chinese, no English, no emoji, no markdown, no numbering, no quotation marks.",
    "Do not evaluate the learner. Do not teach grammar. Do not add study notes.",
    NPC_RELATION_HINTS[npcId],
    scene ? "If a guided scene exists, fit the current scene and write only the learner's next line." : "If no guided scene exists, fit the recent chat naturally.",
    `Learner intent: ${userIntent}`,
    `Recent chat:\n${recentContext}`,
    `Active scene:\n${sceneBlock}`,
    'Return strict JSON only in this shape: {"suggestions":[{"tone":"neutral","text":"..."},{"tone":"casual","text":"..."},{"tone":"polite","text":"..."}]}',
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
      maxTokens: 320,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as Partial<SuggestionResponse>;
    const suggestions = sanitizeSuggestions(parsed.suggestions);

    if (suggestions.length < 3) {
      throw new Error("incomplete suggestions");
    }

    return NextResponse.json({ suggestions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "service error";
    console.warn("[pre-send-expression] route error:", message);
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
  }
}
