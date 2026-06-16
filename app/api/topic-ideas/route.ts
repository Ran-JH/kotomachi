﻿import { NextRequest, NextResponse } from "next/server";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { createChatCompletion } from "@/lib/llm";
import { getConversationScene } from "@/lib/conversation-scenes";
import {
  getLocalDateContext,
  getWorldContext,
  isNpcId,
  resolveLocalDateContext,
  type LocalDateContext,
  type NpcId,
} from "@/lib/npc";

export const runtime = "nodejs";

type TopicIdeasRequestBody = {
  npcId?: string;
  recentMessages?: Array<{
    role?: "user" | "assistant";
    content?: string;
  }>;
  uiLanguage?: "zh" | "en";
  worldDescription?: string;
  worldReaction?: string;
  localDateContext?: Partial<LocalDateContext>;
  activeSceneId?: string;
};

type TopicIdeaItem = {
  text: string;
};

const NPC_SCENE_HINTS: Record<NpcId, string> = {
  aoi: "校园共享空间 / 学生ラウンジ / 放课后场景。当前更适合聊最近在看什么、轻松推荐、放课后怎么过、兴趣闲聊、同龄朋友式吐槽，以及自然的タメ口接话。",
  haruka:
    "大学院 / 研究室 / 校园场景。当前更适合聊课程、文献、发表、研究室寒暄、请教前辈和留学生活里的轻正式表达。",
  misaki:
    "言街（Kotomachi）咖啡馆。当前更适合聊咖啡、味道、店内安静、推荐、点单和轻松停留；天气和时间氛围只在当前 world state 支持时轻轻带出。",
  kimura:
    "便利店夜勤。当前更适合聊新商品、夜宵、疲惫、值班、顺手买东西和随口寒暄。",
  taisho:
    "居酒屋晚间。当前更适合聊下班后小聚、点酒、推荐、收尾和轻松收工；天气和时间氛围只在当前 world state 支持时轻轻带出。",
  nana:
    "生活サポートラウンジ。当前更适合聊租房、役所、费用、垃圾分类、如何礼貌地发问，以及把一句话说清楚。",
  ren:
    "言街駅前 / 川沿い / guesthouse まわり。当前更适合低压力地聊旅行、城市、散步、想去的地方、去过的地方、计划、比较、偏好和理由，不要变成旅行攻略。",
  mao:
    "コミュニティスペース / 軽い仕事 / バイト前後の場面。現在は、確認・お願い・進捗共有・少し言い方に迷うこと・お客様に聞かれたときの相談・シフトの相談・帰る前後の短いあいさつに寄せる。職業相談、HR、上司の評価、硬いビジネス敬語練習にはしない。",
  saku:
    "夜の路地 / 窓辺 / 小さなうわさ。現在は、うまく言えない気持ち、変な夢、言い忘れたこと、少し不思議な印象、作品の余韻みたいな話題に寄せる。巫师、占卜、恐怖、RPG の方向にはしない。",
};

const NPC_TOPIC_SEED_HINTS: Record<NpcId, string[]> = {
  aoi: [
    "最近ハマってるもの",
    "放課後の過ごし方",
    "週末のゆるい予定",
    "軽いおすすめや安利",
    "あまり詳しくないけど少し気になること",
  ],
  haruka: [
    "研究室に初めて行くときの空気",
    "文献や発表の小さな不安",
    "授業が速くて追いにくい感じ",
    "留学や大学院生活の不確かさ",
    "キャンパスで少し息をつける場所",
  ],
  misaki: [
    "コーヒーの味やおすすめ",
    "カフェで静かに休む時間",
    "雨の日の店内の空気",
    "本や映画の軽い話",
    "少しゆっくりしたい気分",
  ],
  kimura: [
    "コンビニの新商品",
    "夜勤と小さな疲れ",
    "雨の日のお客さん",
    "帰る前にさっと買うもの",
    "甘いものや軽い夜食",
  ],
  taisho: [
    "一日の終わりの空気",
    "温かいものを食べたい夜",
    "雨の夜と居酒屋の雰囲気",
    "常連どうしの小さな雑談",
    "仕事や勉強のあとにほっとしたい感じ",
  ],
  nana: [
    "日本に来たばかりなんですけど。",
    "生活の小さなことでも、どう聞けばいいのか迷っています。",
    "部屋を借りるとき、最初に何を聞けばいいですか。",
    "役所でうまく説明できるか少し不安です。",
    "何かを聞くとき、丁寧に言うにはどうすればいいですか。",
  ],
  ren: [
    "最近、行ってみたい場所があります。",
    "知らない街を歩くのが好きです。",
    "旅行の計画を立てるのが少し苦手です。",
    "一人旅に少し興味があります。",
    "好きな街の話をしたいです。",
    "言街のどんなところが好きですか？",
  ],
  mao: [
    "先輩に確認したいことがあります。",
    "ここまでできたんですが、一度見てもらえますか。",
    "すみません、もう少し時間がかかりそうです。",
    "お客様に聞かれたんですが、どう答えればいいですか。",
    "来週のシフトを少し相談してもいいですか。",
    "何か手伝えることはありますか。",
    "お先に失礼します。今日はありがとうございました。",
  ],
  saku: [
    "なんとなく変な感じがする夜",
    "言い忘れたことが残っている感じ",
    "変な夢のあとに残る気分",
    "この町で聞いた小さなうわさ",
    "作品のあと味がまだ残っていること",
  ],
};

const NPC_REGISTER_HINTS: Record<NpcId, string[]> = {
  aoi: [
    "自然なタメ口で、同級生どうしの軽い距離感を保つ。",
    "恋愛っぽさ、依存感、アニメ口調、ベタベタした待ってた感は出さない。",
    "Kimura のような店員・夜勤の距離感には寄せない。",
  ],
  haruka: [
    "やさしい軽丁寧の先輩口調にする。",
    "教授、留学コンサル、日本語教師のような長い助言にはしない。",
    "少し相談しやすい前辈感はよいが、権威的にしない。",
  ],
  misaki: [
    "穏やかな軽丁寧で、カフェの小さな雑談にする。",
    "心理相談、感情の深掘り、先生っぽい言い回しは避ける。",
    "静かな休憩時間に自然に言えそうな一言を優先する。",
  ],
  kimura: [
    "若い店員のカジュアルさは保つが、少し店の距離感を残す。",
    "同級生の友達ノリや放課後の誘いにはしない。",
    "コンビニ、夜勤、買い物の流れに軽くつながる言い方を優先する。",
  ],
  taisho: [
    "常連向けの砕けた口調で、あたたかい店主の距離感を保つ。",
    "人生相談や説教の入口になるような重いまとめ方は避ける。",
    "夜、食べる、飲む、ひと息つく流れに自然につながる一言を優先する。",
  ],
  nana: [
    "把问题说清楚，不要给结论。",
    "只帮忙整理成自然日语，不当法律、中介或行政顾问。",
    "对方问官方流程时，提醒去窗口或实际来源确认。",
  ],
  ren: [
    "普通自然为主，可以轻丁宁，也可以轻 casual，但不要太熟也不要太正式。",
    "优先生成能聊地方、计划、偏好、比较和理由的一句话，不要写成攻略提问。",
    "不要把用户的话改写成路线规划、预算、交通、酒店、排行榜这类旅行攻略文案。",
  ],
  mao: [
    "Mao uses light workplace polite Japanese. Keep suggestions short, usable, and natural for a part-time or internship-like situation.",
    "Prefer confirmations, requests, brief progress updates, soft apologies, asking for help, shift talk, or leaving-after-work lines.",
    "Avoid stiff business keigo, HR advice, career coaching, performance review language, or teacher-like correction.",
  ],
  saku: [
    "Use soft natural Japanese with a slightly literary undertone, but keep it short and easy to say.",
    "Prefer lines about vague feelings, dreams, rumors, forgotten words, and lingering impressions.",
    "Do not make the user sound magical, scary, prophetic, clinical, or theatrical.",
  ],
};

const FALLBACK_IDEAS: Record<NpcId, string[]> = {
  aoi: [
    "最近ハマってるものってある？",
    "放課後って、何してることが多い？",
    "ちょっと気になってること、軽く話してみない？",
  ],
  haruka: [
    "研究室って、最初はどんなふうに話しかけると自然ですか？",
    "授業の日本語が速くて、あまり聞き取れません。",
    "発表が近くて、少し緊張しています。",
  ],
  misaki: [
    "グアテマラの豆って、どんな味ですか？",
    "雨の日に合うおすすめ、ありますか？",
    "それを一つお願いします。",
  ],
  kimura: [
    "今日のおすすめ、ありますか？",
    "夜に食べやすいものってありますか？",
    "その新商品、気になります。",
  ],
  taisho: [
    "今日は軽く一杯いけますか？",
    "おすすめの一品、ありますか？",
    "仕事終わりにちょうどいいの、ありますか？",
  ],
  nana: [
    "日本に来たばかりなんですけど。",
    "もう少しゆっくり説明してほしいです。",
    "ゴミの分別について聞きたいです。",
  ],
  ren: [
    "最近、行ってみたい場所があります。",
    "知らない街を歩くのが好きです。",
    "旅行の計画を立てるのが少し苦手です。",
  ],
  mao: [
    "先輩に確認したいことがあります。",
    "ここまでできたんですが、一度見てもらえますか。",
    "すみません、もう少し時間がかかりそうです。",
    "何か手伝えることはありますか。",
    "お先に失礼します。今日はありがとうございました。",
  ],
  saku: [
    "今日は、なんとなく変な感じがします。",
    "変な夢を見ました。",
    "この町で、変なうわさを聞きました。",
    "何か言い忘れたことがある気がします。",
  ],
};

function fallbackSceneIdeas(activeSceneId?: string): TopicIdeaItem[] | null {
  const scene = getConversationScene(activeSceneId);
  if (!scene) return null;
  const responseOptions = scene.responseOptionsJa ?? scene.fallbackUserLines;
  return responseOptions.slice(0, 4).map((text) => ({ text }));
}

function buildScenePrompt(activeSceneId?: string): string {
  const scene = getConversationScene(activeSceneId);
  if (!scene) return "";

  return [
    "You are generating response options for a guided scenario, not broad topic ideas.",
    `Current guided scenario: ${scene.id}.`,
    `Scene title: ${scene.title}.`,
    `Scene setup: ${scene.setup}.`,
    `User goal: ${scene.userGoal}.`,
    `Possible beats: ${scene.possibleBeats.join(" / ")}.`,
    `Useful intents: ${scene.usefulIntents.join(" / ")}.`,
    `Soft landing: ${scene.softLanding}.`,
    `Avoid: ${scene.avoid.join(" / ")}.`,
    `Response options: ${(scene.responseOptionsJa ?? scene.fallbackUserLines).join(" / ")}.`,
    "Return short lines the user can directly say next in this scene.",
    "Do not turn this into a task checklist.",
  ].join("\n");
}

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

function buildPrompt(
  npcId: NpcId,
  worldDescription: string,
  worldReaction: string,
  localDateContext: LocalDateContext,
  activeSceneId?: string,
): string {
  const sceneHint = NPC_SCENE_HINTS[npcId];
  const seedHints = NPC_TOPIC_SEED_HINTS[npcId].map((item) => `- ${item}`).join("\n");
  const registerHints = NPC_REGISTER_HINTS[npcId].map((item) => `- ${item}`).join("\n");
  const localDateHint = [
    `local date key: ${localDateContext.localDateKey}`,
    `Japanese date label: ${localDateContext.dateLabelJa}`,
    `English date label: ${localDateContext.dateLabelEn}`,
    `day: ${localDateContext.dayLabelJa}`,
    `isWeekend: ${localDateContext.isWeekend ? "yes" : "no"}`,
    `time of day: ${localDateContext.timeLabelJa}`,
    `season: ${localDateContext.seasonLabelJa}`,
    `seasonal culture hints (optional, not real-time events): ${localDateContext.seasonalHintsJa.join(" / ") || "none"}`,
    `seasonal avoid notes: ${localDateContext.seasonalAvoidJa.join(" / ") || "none"}`,
  ].join("\n");
  const worldHint = [
    `description: ${worldDescription}`,
    `npc reaction: ${worldReaction}`,
  ].join("\n");
  const scenePrompt = buildScenePrompt(activeSceneId);
  return `你是一个日语学习产品里的“接话建议生成器”，不是 NPC 本人。
你的任务不是回复用户，而是根据最近聊天，生成 3 条“用户下一句可以对 NPC 说的话”。

## 目标
- 顺着当前上下文继续聊，不要重开一个完全无关的话题。
- 如果最近聊天里已经有明确的话题，优先顺着那个话题继续。
- conversation seed directions 只是帮助你保持场景感和关系语气，不是要求你强行换题。
- 如果最近对话已经有清楚主题，就先延续那个主题；只有在对话很薄、快断掉时，才用一个 seed direction 轻轻搭桥。
- 不要像主持人一样把用户推进到下一个话题。
- local date context is the source of truth for weekday/weekend and time of day.
- local date context is also the source of truth for month, date, and season.
- seasonal culture hints are optional material derived from month/season, not events happening right now.
- 不要说周末，除非 local date context 明确支持。
- 不要说朝 / 昼 / 夕方 / 夜，除非 local date context 支持。
- 不要自己编造月份、季节、节日、节气或季节性活动。
- 只有 current world state 或 recent messages 支持时，才提具体天气。
- 不要编造 rain / sunny / weather 细节。
- 把 topic seed 当成稳定骨架，把 weather / time 当成可选 overlay。
- Do not force seasonal or world-state references into every suggestion. Use them only when they help the current conversation.

## 3 条建议的不同角度
- 第一条：Follow-up - 顺着当前话题追问细节（それ、もう少し詳しく聞いてもいいですか？这类）
- 第二条：Self-expression - 表达自己的感受、状态或偏好（私もそう思います/今日はちょっと疲れています这类）
- 第三条：Gentle bridge - 轻轻转到相关小话题，但不突兀（そういえば…这类）
- 不要三条都只是同义改写，必须角度不同

## 输出必须是用户可直接发送的话
- 只输出日语短句，用户可以直接复制粘贴发送
- 绝对禁止输出：
  - 标题、任务、解释、“你可以问…”、“Try asking…”、“おすすめについて質問する”这类说明句
  - NPC 要说的话
  - 语法讲解、课程目标、总结句
  - 多句长段落
  - 中文或英文句子
- 好的例子：
  - それ、もう少し詳しく聞いてもいいですか。
  - 今日は静かな席で、ゆっくり飲みたいです。
  - 最近、みんな何にハマってる感じ？
- 坏的例子：
  - おすすめについて質問する
  - 你可以问店里有什么推荐。
  - 次に、相手のおすすめを聞いてみましょう。

## 当前 NPC 的 relationship / register 约束（优先级最高！
- 即使语法正确，但如果不符合当前 NPC 的关系语气，也是失败的建议
${registerHints}

## 当前 NPC 场景
${sceneHint}

## 当前 NPC 的 conversation seed directions
${seedHints}

## 当前 local date context
${localDateHint}

## 当前 world state overlay
${worldHint}

${scenePrompt ? `## current guided scenario\n${scenePrompt}\n` : ""}

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
- ideas 里只放 3 条。
- 每条尽量 1 句。
- 不要输出 markdown。
- 不要输出额外说明。`;
}

export async function POST(req: NextRequest) {
  let resolvedNpcId: NpcId = "misaki";
  let resolvedActiveSceneId: string | undefined;
  try {
    const body = (await req.json()) as TopicIdeasRequestBody;
    const rawNpcId = body.npcId ?? "";
    const npcId: NpcId = isNpcId(rawNpcId) ? rawNpcId : "misaki";
    resolvedNpcId = npcId;
    resolvedActiveSceneId = body.activeSceneId;
    const recentMessages = normalizeMessages(body.recentMessages);
    const localDateContext = resolveLocalDateContext(body.localDateContext, getLocalDateContext());
    const sceneFallbackIdeas = fallbackSceneIdeas(body.activeSceneId);
    const clientWorldDescription =
      typeof body.worldDescription === "string" ? body.worldDescription.trim() : "";
    const clientWorldReaction =
      typeof body.worldReaction === "string" ? body.worldReaction.trim() : "";
    const fallbackWorld = getWorldContext(localDateContext);
    const worldDescription = clientWorldDescription || fallbackWorld.description;
    const worldReaction = clientWorldReaction || fallbackWorld.reactions[npcId] || "";

    if (recentMessages.length === 0) {
      return NextResponse.json({ ideas: sceneFallbackIdeas ?? fallbackIdeasFor(npcId) });
    }

    const sharedSafetyPrompt =
      "Kotomachi is a fictional language town. Do not claim Kotomachi is located in a real city, district, station, or neighborhood like 下北沢, 渋谷, 新宿, 東京, or 京都. Do not invent real-world local facts as if happening around the NPC. If the user asks about real-world places, travel, culture, or geography, you may mention real place names as general knowledge or suggestions using cautious framing like \"旅行先としてなら\" or \"この街の外の話になりますが\". Do NOT claim real-time events, weather, crowds, or current local conditions unless the user provides them. Treat the provided localDateContext as the only source of truth for date, month, weekday, weekend, time of day, and season. Do not invent another month, season, holiday, or seasonal event. Do not mention Christmas, New Year, sakura, autumn leaves, summer festival, rainy season, or similar seasonal events unless supported by localDateContext, world state, or recent conversation. If localDateContext says June, do not say November, December, Christmas, autumn leaves, or winter. Use generic place references like この街, 街区, 店のまわり, 近く, キャンパスのほう, 研究室のあたり for Kotomachi locations. Treat the provided worldDescription and worldReaction as the current page state. Do not contradict them. Do not invent a different weather condition, street mood, or atmosphere. Only mention weather, time, or atmosphere when supported by the provided localDateContext, the provided world state, or the recent conversation.";

    const messages: ChatCompletionMessageParam[] = [
      { role: "system", content: buildPrompt(npcId, worldDescription, worldReaction, localDateContext, body.activeSceneId) },
      { role: "system", content: sharedSafetyPrompt },
      {
        role: "user",
        content: JSON.stringify({
          npcId,
          recentMessages,
          uiLanguage: body.uiLanguage === "en" ? "en" : "zh",
          localDateContext,
          worldDescription,
          worldReaction,
          activeSceneId: body.activeSceneId,
        }),
      },
    ];

    const raw = await createChatCompletion(messages, {
      temperature: 0.75,
      maxTokens: 280,
      jsonMode: true,
    });

    const parsed = JSON.parse(raw) as { ideas?: unknown };
    const ideas = body.activeSceneId
      ? (() => {
          const rawIdeas = Array.isArray(parsed.ideas) ? parsed.ideas : [];
          const seen = new Set<string>();
          const nextIdeas = rawIdeas
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
            .slice(0, 4)
            .map((text) => ({ text }));
          return nextIdeas.length > 0 ? nextIdeas : (sceneFallbackIdeas ?? fallbackIdeasFor(npcId));
        })()
      : sanitizeIdeas(parsed.ideas, npcId);
    return NextResponse.json({ ideas });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "service error";
    console.warn("[topic-ideas] route error:", message);
    return NextResponse.json({ ideas: fallbackSceneIdeas(resolvedActiveSceneId) ?? fallbackIdeasFor(resolvedNpcId) });
  }
}
