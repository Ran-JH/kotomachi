import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";
import { isNpcId } from "@/lib/npc";
import type {
  ExpressionUpgrade,
  ExpressionUpgradeSource,
  ReviewWord,
  ReviewWordSource,
  SessionSummaryApiCard,
  SessionSummaryRequest,
} from "@/lib/session-summary";

export const runtime = "nodejs";

const ERROR_MESSAGE =
  "ふりかえりを作れませんでした。少し時間をおいて、もう一度試してみてください。";

const SYSTEM_PROMPT = `あなたは Kotomachi / 言街 の「ふりかえり」カードを作るアシスタントです。

目的:
- 低压力で、でも学習情報のある復習カードを作る。
- 学習打卡、评分报告、纠错清单、老师批改にしない。
- 空泛鼓励を書かない。
- 情報が足りないときは少なく書く。構造を埋めるために捏造しない。

最重要原则:
- evidence-based summary にする。
- モデルが自由に学習点を選ぶのではなく、ユーザーの真实行为信号を優先する。

表达建议「次はこう言える」优先级:
1. nonJapaneseSpans: ユーザー入力中の英語や明らかな中国語。これは日语表达缺口の强い信号。
2. recentExpressionHints: ユーザーが開いた/再生した表現ヒント。playedStyles があるものを優先。
3. model_selected: 上記が足りない場合だけ、ユーザーの日本語入力から少量選ぶ。

単語「今日のことば」优先级:
1. recentLookups: ユーザーが主动查词した言葉。
2. recentLookups が空の場合は、会話から 2〜3 個の実用的な語・短い言い回しを選ぶ。
3. 足りなければ少なく書く。生僻词や関係の薄い語は選ばない。

conversation fallback の選び方:
- 「今日」「私」「あなた」「です」など基礎すぎる語は選ばない。
- 短い言い回しも可。例: レポートを書かなきゃ、試験範囲、確認できて安心する、自由すぎて迷子になる。
- conversation から選んだ項目の source は必ず "conversation"。

出力は JSON のみ。markdown コードブロック禁止。
必ずこの構造にする:
{
  "title": "短いタイトル",
  "topicSummary": "今日の話を1〜2文で自然にまとめる",
  "reusableExpressions": [
    { "expression": "そのまま使える表現", "note": "なぜ使えるか短く" }
  ],
  "expressionUpgrades": [
    {
      "original": "ユーザーの原表达",
      "suggestion": "より自然な日语表达",
      "note": "学習ポイントを短く",
      "source": "non_japanese_span | expression_hint | model_selected"
    }
  ],
  "reviewWords": [
    {
      "word": "ことば",
      "reading": "よみ",
      "meaning": "短い意味",
      "example": "短い例文",
      "source": "looked_up | conversation"
    }
  ],
  "nextTalkPrompt": "次に話してみる低压力な話題"
}

制限:
- reusableExpressions 最大2件。
- expressionUpgrades 最大2件。
- reviewWords 最大5件。
- ユーザーが言っていないこと、調べていないことを捏造しない。
- 原始 provider response や内部情報は出さない。`;

function pickString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function parseJsonObject(raw: string): Record<string, unknown> {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "");
  const parsed = JSON.parse(trimmed);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}

function normalizeUpgradeSource(value: unknown): ExpressionUpgradeSource {
  if (
    value === "non_japanese_span" ||
    value === "expression_hint" ||
    value === "model_selected"
  ) {
    return value;
  }
  return "model_selected";
}

function normalizeWordSource(value: unknown): ReviewWordSource {
  return value === "looked_up" ? "looked_up" : "conversation";
}

function normalizeReusableExpressions(value: unknown): SessionSummaryApiCard["reusableExpressions"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const expression = truncate(pickString(raw.expression), 140);
      const note = truncate(pickString(raw.note), 180);
      return expression ? { expression, note } : null;
    })
    .filter((item): item is { expression: string; note: string } => Boolean(item))
    .slice(0, 2);
}

function normalizeExpressionUpgrades(value: unknown): ExpressionUpgrade[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const raw = item as Record<string, unknown>;
      const original = truncate(pickString(raw.original), 180);
      const suggestion = truncate(pickString(raw.suggestion), 180);
      const note = truncate(pickString(raw.note), 220);
      if (!original || !suggestion) return null;
      return {
        original,
        suggestion,
        note,
        source: normalizeUpgradeSource(raw.source),
      };
    })
    .filter((item): item is ExpressionUpgrade => Boolean(item))
    .slice(0, 2);
}

function normalizeReviewWords(value: unknown): ReviewWord[] {
  if (!Array.isArray(value)) return [];
  const words: ReviewWord[] = [];

  for (const item of value) {
    const raw = item as Record<string, unknown>;
    const word = truncate(pickString(raw.word), 80);
    const meaning = truncate(pickString(raw.meaning), 120);
    if (!word || !meaning) continue;

    words.push({
      word,
      reading: truncate(pickString(raw.reading), 80) || undefined,
      meaning,
      example: truncate(pickString(raw.example), 160) || undefined,
      source: normalizeWordSource(raw.source),
    });

    if (words.length >= 5) break;
  }

  return words;
}

const BASIC_REVIEW_WORDS = [
  "今日",
  "私",
  "僕",
  "あなた",
  "です",
  "ます",
  "これ",
  "それ",
  "あれ",
  "ここ",
  "そこ",
  "こと",
  "もの",
];

function extractConversationReviewWords(
  messages: SessionSummaryRequest["messages"],
): ReviewWord[] {
  const seen = new Set<string>();
  const candidates: ReviewWord[] = [];

  for (const message of messages) {
    const matches = message.content.match(/[ぁ-んァ-ヶ一-龠々ー]{4,22}/g) ?? [];
    for (const match of matches) {
      const word = match.trim();
      if (word.length < 4 || seen.has(word)) continue;
      if (BASIC_REVIEW_WORDS.some((basic) => word === basic || word.includes(`${basic}は`))) {
        continue;
      }
      seen.add(word);
      candidates.push({
        word,
        meaning: "会話で出てきた表現。文脈ごと復習すると使いやすいです。",
        source: "conversation",
      });
      if (candidates.length >= 3) return candidates;
    }
  }

  return candidates;
}

function normalizeCard(
  raw: Record<string, unknown>,
  request: SessionSummaryRequest,
): SessionSummaryApiCard {
  const reviewWords = normalizeReviewWords(raw.reviewWords);
  return {
    title: truncate(pickString(raw.title, "今日のふりかえり"), 40),
    topicSummary: truncate(pickString(raw.topicSummary), 220),
    reusableExpressions: normalizeReusableExpressions(raw.reusableExpressions),
    expressionUpgrades: normalizeExpressionUpgrades(raw.expressionUpgrades),
    reviewWords: reviewWords.length > 0 ? reviewWords : extractConversationReviewWords(request.messages),
    nextTalkPrompt: truncate(pickString(raw.nextTalkPrompt), 160),
  };
}

function sanitizeRequest(body: unknown): SessionSummaryRequest | null {
  const raw = body as Partial<SessionSummaryRequest> | null;
  if (!raw || typeof raw.npcId !== "string" || !isNpcId(raw.npcId)) return null;
  const messages = Array.isArray(raw.messages)
    ? raw.messages
        .filter((message) => {
          return (
            (message.role === "user" || message.role === "assistant") &&
            typeof message.content === "string" &&
            message.content.trim()
          );
        })
        .slice(-16)
        .map((message) => ({
          role: message.role,
          content: truncate(message.content.trim(), 700),
          id: typeof message.id === "string" ? message.id : undefined,
          createdAt: typeof message.createdAt === "string" ? message.createdAt : undefined,
        }))
    : [];

  if (messages.length < 2) return null;

  return {
    schemaVersion: 1,
    npcId: raw.npcId,
    messages,
    recentLookups: Array.isArray(raw.recentLookups) ? raw.recentLookups.slice(0, 5) : [],
    recentExpressionHints: Array.isArray(raw.recentExpressionHints)
      ? raw.recentExpressionHints.slice(0, 5)
      : [],
    nonJapaneseSpans: Array.isArray(raw.nonJapaneseSpans) ? raw.nonJapaneseSpans.slice(0, 8) : [],
  };
}

export async function POST(req: NextRequest) {
  try {
    const request = sanitizeRequest(await req.json());
    if (!request) {
      return NextResponse.json(
        { error: "もう少し話すと、ふりかえりを作れます。" },
        { status: 400 },
      );
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: JSON.stringify(request, null, 2),
      },
    ];

    const raw = await createChatCompletion(messages, {
      temperature: 0.35,
      maxTokens: 1200,
      jsonMode: true,
    });

    return NextResponse.json({ card: normalizeCard(parseJsonObject(raw), request) });
  } catch (error) {
    console.warn("[api/session-summary] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json({ error: ERROR_MESSAGE }, { status: 500 });
  }
}
