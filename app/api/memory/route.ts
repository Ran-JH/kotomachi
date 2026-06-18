import { NextRequest, NextResponse } from "next/server";

import { createChatCompletion } from "@/lib/llm";
import {
  shouldKeepMemoryCandidate,
  type MemoryCuratorResult,
} from "@/lib/memory";

export const runtime = "nodejs";

type CuratorMessage = {
  role: "user" | "assistant";
  content: string;
};

type MemoryCuratorRequestBody = {
  npcId?: string;
  recentMessages?: CuratorMessage[];
  existingMemories?: string[];
  userText?: string;
};

type ParsedCuratorPayload = Partial<MemoryCuratorResult> & {
  action?: string;
  fact?: unknown;
  memory?: unknown;
  replaceIndex?: unknown;
};

function normalizeRecentMessages(body: MemoryCuratorRequestBody): CuratorMessage[] {
  if (Array.isArray(body.recentMessages)) {
    return body.recentMessages
      .filter(
        (message): message is CuratorMessage =>
          (message?.role === "user" || message?.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0
      )
      .slice(-12);
  }

  if (typeof body.userText === "string" && body.userText.trim()) {
    return [{ role: "user", content: body.userText.trim() }];
  }

  return [];
}

function ignoreResult(): MemoryCuratorResult {
  return { action: "ignore", memory: null, replaceIndex: null };
}

function extractJsonObject(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  return trimmed.slice(firstBrace, lastBrace + 1);
}

function buildCuratorPrompt(
  npcId: string,
  recentMessages: CuratorMessage[],
  existingMemories: string[]
): string {
  const existingMemoryText =
    existingMemories.length > 0
      ? existingMemories.map((memory, index) => `[${index}] ${memory}`).join("\n")
      : "none";

  const conversationText = recentMessages
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return `You are a memory curator, not a fact extractor.

You decide whether the recent conversation contains one durable memory worth showing in the user's memory panel for NPC "${npcId}".

Visible memories are durable, user-visible, deletable notes that help future conversations with this same NPC.
Temporary context should stay in chat history and must not become visible memory.

You may return at most one action:
- ignore
- add
- replace

Default to ignore.

Save only if:
- it is useful across future conversations;
- it reflects a stable interest, long-term goal, learning preference, repeated topic, or important shared context with this NPC;
- the user clearly expressed it, not merely the assistant suggested it.

Ignore if:
- it is a one-time choice;
- it is today-only context;
- it is food, drink, shopping, weather, or current mood;
- it is just the topic of the moment;
- it is assistant advice or assistant wording;
- it is a narrow detail already covered by an existing memory;
- it risks over-personalization, romance, jealousy, dependency, or exclusivity.

Merge or replace if:
- the new information belongs to the same theme as an existing memory;
- a broader, cleaner sentence can replace a narrower fragment;
- multiple recent sentences about internship, interview, or project preparation should collapse into one broader memory.

Special rule for cafe / convenience store / izakaya chats:
- default to not saving item-level food or product choices unless the user clearly frames them as a stable, long-term preference or habit.

Output rules:
- return strict JSON only;
- memory must be one natural short sentence, not keywords;
- if uncertain, return ignore;
- never return more than one memory change.

Bad memory examples:
- 用户想吃关东煮。
- 用户觉得肉包加热后更好吃。
- 用户今天有点累。
- 用户正在准备一份实习面试，并且已经收到公司领导希望加入的积极信号。

Good memory examples:
- 用户最近在准备实习项目和面试。
- 用户想重新开始打排球。
- 用户希望日语纠正更温柔一点。
- 用户最近主要想练运动和健身房相关表达。

Existing memories:
${existingMemoryText}

Recent conversation:
${conversationText}

Return one of these JSON shapes only:
{"action":"ignore"}
{"action":"add","memory":"用户最近在准备实习项目和面试。"}
{"action":"replace","memory":"用户最近在准备实习项目和面试。","replaceIndex":1}`;
}

function parseCuratorResult(
  raw: string,
  existingMemories: string[]
): MemoryCuratorResult {
  let parsed: ParsedCuratorPayload;

  try {
    parsed = JSON.parse(raw);
  } catch {
    const extractedJson = extractJsonObject(raw);
    if (!extractedJson) {
      return ignoreResult();
    }

    try {
      parsed = JSON.parse(extractedJson);
    } catch {
      return ignoreResult();
    }
  }

  if (parsed.action === "ignore") {
    return ignoreResult();
  }

  const candidateMemory =
    typeof parsed.memory === "string"
      ? parsed.memory.trim()
      : typeof parsed.fact === "string"
        ? parsed.fact.trim()
        : "";

  const hasImplicitReplace =
    !parsed.action &&
    candidateMemory &&
    Number.isInteger(parsed.replaceIndex);

  if (hasImplicitReplace) {
    const memory = candidateMemory;
    const replaceIndex = parsed.replaceIndex as number;
    if (replaceIndex < 0 || replaceIndex >= existingMemories.length) {
      return ignoreResult();
    }

    const baseline = existingMemories.filter((_, index) => index !== replaceIndex);
    if (!shouldKeepMemoryCandidate(memory, baseline)) {
      return ignoreResult();
    }

    return { action: "replace", memory, replaceIndex };
  }

  if (parsed.action === "add" || (!parsed.action && candidateMemory)) {
    const memory = candidateMemory;
    if (!memory || !shouldKeepMemoryCandidate(memory, existingMemories)) {
      return ignoreResult();
    }
    return { action: "add", memory, replaceIndex: null };
  }

  if (parsed.action === "replace") {
    const memory = candidateMemory;
    const replaceIndex = parsed.replaceIndex;
    if (!memory || !Number.isInteger(replaceIndex)) {
      return ignoreResult();
    }

    const resolvedReplaceIndex = Number(replaceIndex);

    if (resolvedReplaceIndex < 0 || resolvedReplaceIndex >= existingMemories.length) {
      return ignoreResult();
    }

    const baseline = existingMemories.filter((_, index) => index !== resolvedReplaceIndex);
    if (!shouldKeepMemoryCandidate(memory, baseline)) {
      return ignoreResult();
    }

    return { action: "replace", memory, replaceIndex: resolvedReplaceIndex };
  }

  return ignoreResult();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MemoryCuratorRequestBody;
    const recentMessages = normalizeRecentMessages(body);
    const existingMemories = Array.isArray(body.existingMemories)
      ? body.existingMemories.filter(
          (memory): memory is string => typeof memory === "string" && memory.trim().length > 0
        )
      : [];

    const userMessageCount = recentMessages.filter((message) => message.role === "user").length;
    if (recentMessages.length === 0 || userMessageCount === 0) {
      return NextResponse.json(ignoreResult());
    }

    const raw = await createChatCompletion(
      [
        {
          role: "system",
          content: buildCuratorPrompt(body.npcId ?? "unknown", recentMessages, existingMemories),
        },
      ],
      { temperature: 0.1, maxTokens: 180, jsonMode: true }
    );

    return NextResponse.json(parseCuratorResult(raw, existingMemories));
  } catch (error) {
    console.error("Memory curator error:", error);
    return NextResponse.json(ignoreResult());
  }
}
