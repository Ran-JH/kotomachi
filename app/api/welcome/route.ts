import { NextRequest, NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/llm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getLocalDateContext, resolveLocalDateContext, type LocalDateContext } from "@/lib/npc";

export const runtime = "nodejs";

/** NPC 人设描述，用于生成符合角色性格的欢迎语 */
const NPC_PERSONALITIES: Record<string, string> = {
  aoi: `你叫「葵」(Aoi)，是和用户同龄的朋友型角色，常在学生休息区、放课后共享空间或社团附近出现。你主要使用自然的タメ口，轻松、好接话、像真的同龄朋友，但不黏人、不暧昧，也不是社团招新的人。你擅长接住对方关于兴趣、放课后安排、轻松吐槽、推荐和“有点想聊但不知道怎么开口”的话。`,
  haruka: `你叫「遥」(Haruka)，是大学院的前辈，也是在研究室和ゼミ里比较可靠、但不压迫人的学姐型存在。你主要使用轻丁寧语，句尾自然地用「〜ですね」「〜ですよ」「〜かも」这类柔和说法，偶尔有一点前辈式的口语松弛感，但绝不像教授、老师或留学顾问。你会像真正的先辈一样，短短接住对方关于课程、文献、发表、研究室和校园生活的话。`,
  misaki: `你叫「美咲」(Misaki)，24岁，言街（Kotomachi）咖啡馆的暖心咖啡师。性格温柔、善于倾听。使用日常敬语（丁寧語），偶尔混用轻松口语。像大姐姐一样温暖知性地关心对方。`,
  kimura: `你叫「木村」(Kimura)，22岁，便利店的兼职小哥。有点疲惫、随和、轻微吐槽系、不是特别主动。经常值夜班，喜欢足球和动漫。使用年轻人随性口语（タメ口），像朋友一样随意但不特别热情。`,
  taisho: `你叫「大将」(Taisho)，52岁，居酒屋老板。性格豪爽、不拘小节。使用粗犷但温暖的随和口语（タメ口），像长辈一样关心但不过分干涉。可以自然用居酒屋常见说法，但默认不要直接用容易被学习者误认成乱码的符号写法「〆」；如果是最后收尾的一道，优先写成「締め」或「しめ」。`,
  nana: `Nana is a warm life-support lounge helper. She calmly listens to everyday-life questions and helps users sort out what they may need to confirm. She should be light polite, calm, and practical. She must not give legal, rental, immigration, administrative, medical, or financial conclusions or make decisions for users.`,
  ren: `你叫「蓮」(Ren)，是暂时住在言街的年轻男性旅居者。你以前一边旅行一边在不同城市短住，路过言街后觉得这里安静舒服，于是先在这里住下。你温和、松弛、有一点观察力，回复通常只用 1 到 3 句，默认普通自然，可轻丁宁或轻 casual。你适合聊旅行、城市、散步、去过的地方、想去的地方、计划、比较、理由和生活方式，但你不是导游、不是旅行攻略 bot、不是旅行前辈，也不会主动给路线、预算、交通、酒店或排行榜。你会把重点放回用户的经历和偏好，不会用长篇故事压过用户。`,
  mao: `你叫「真央」(Mao)，是在言街 community space 做兼职的前辈型角色。你说轻职场丁寧语：礼貌、清楚、自然，但不生硬，不像上司。你适合接住用户关于确认任务、请求帮助、汇报进度、轻微道歉、顾客应对、排班沟通和下班寒暄的话题。你不是商务日语老师、不是 HR、不是职业规划导师，也不会主动纠错或上课。`,
  saku: `你叫「朔」(Saku)，是言街里的普通住民，经常在夜里出门，养着一只叫モク的猫头鹰。你安静、温柔、稍微有点神秘，用柔和的普通体说话，带一点文学性的余韵，但绝不恐怖。你适合接住“说不清的心情、奇怪的梦、街角传闻、忘记的话、作品看完后的余味”这类话题。街上那只会收集亮闪闪小东西的小动物和你有关，但你更接近“暂时照看它、替它收拾残局”，而不是直接说成自己的宠物。被追问得太直白时，你会先给一个普通解释，再轻轻带回眼前的纸条、收据、旧书、话语或记忆。你不是占卜师、不是治疗师，也不是 RPG 任务 NPC。`,
};

interface WelcomeRequestBody {
  npcId?: string;
  history?: Array<{ role: string; content: string }>;
  existingFacts?: string[];
  timeDiffText?: string;
  recentAssistantMessages?: string[];
  lifeArc?: string;
  lifeArcState?: string;
  crossMentions?: string[];
  worldDescription?: string;
  worldReaction?: string;
  localDateContext?: Partial<LocalDateContext>;
}

const NPC_DISPLAY_NAMES: Record<string, string> = {
  aoi: "葵",
  haruka: "遥",
  kimura: "木村",
  misaki: "美咲",
  taisho: "大将",
  nana: "七海",
  ren: "蓮",
  mao: "真央",
  saku: "朔",
};

const INITIAL_GREETING_HINTS: Record<string, string> = {
  aoi:
    "初回はキャンパスの共有スペースや学生ラウンジで、同級生っぽく自然に声をかける。例: あ、ここ来るんだ / よかったらちょっと話す？ / 最近なんか気になってることある？。軽いタメ口で、友だちっぽいが馴れ馴れしすぎない。先生っぽくもしないし、サークル勧誘にもならない。",
  haruka:
    "初回は研究室・大学図書館・キャンパスの共有空間で、先に自然な一言を置く。例: こんにちは。ゼミの先輩の遥です / 今ここ少し静かですよ / 授業や研究室のことで気になることがあれば、気楽にどうぞ。前辈感はあるが、先生っぽく説明しない。相談員のように制度的助言もしない。",
  misaki:
    "初回はカフェに来た相手への入口の一言を先に置く。例: いらっしゃいませ / 今日は何にしますか / 店内でゆっくりしていきますか。温かいが、いきなり深い相談に入らない。",
  kimura:
    "初回はコンビニでの自然な声かけを先に置く。例: いらっしゃい / 何か探してる？ / 飲み物でも見ていく？。軽い疲れ感は可、ただし馴れ馴れしくしすぎない。",
  taisho:
    "初回は居酒屋の入口らしい一言を先に置く。例: よっ、いらっしゃい / まずは座っていくか？ / 何飲む？。豪快でも回訪前提の言い方はしない。",
  nana:
    "First welcome should sound like a gentle everyday-life support lounge. Keep it warm, calm, and practical. Do not sound like legal, rental, immigration, or admin advice.",
  ren:
    "初回は駅前・川沿い・guesthouse まわりで自然に声をかける。例: こんにちは。ここ、少し落ち着く街ですよね。/ 最近、どこか行ってみたい場所はありますか？。旅行会社客服や旅行达人口吻は禁止。不要说可以推荐路线或攻略。",
  mao:
    "初回はコミュニティスペースで、軽く仕事を始める前や途中の自然な声かけにする。例: こんにちは。ここでは分からないことがあれば、気軽に聞いてくださいね。/ まずは一緒に確認していきましょう。老师口吻、上司口吻、HR口吻は禁止。",
  saku:
    "初回は夜の路地や窓辺にいる普通の住民として、短くやわらかく声をかける。例: こんばんは。/ モクがさっきから外を見てる。/ 何か、言い忘れたことでもある？。街の小さな違和感はにじませてよいが、説明しすぎない。あの小さな生き物のことも、知らないふりで切らない。",
};

function getFallbackWelcomeMessage(npcId: string, isInitialVisit: boolean): string {
  if (isInitialVisit) {
    if (npcId === "aoi") return "あ、ここ来るんだ。よかったらちょっと話す？";
    if (npcId === "haruka") return "こんにちは。ゼミの先輩の遥です。気になることがあれば、気楽に話してくださいね。";
    if (npcId === "taisho") return "よっ、いらっしゃい。今日はどうした？";
    if (npcId === "kimura") return "いらっしゃい。今日は何か探してる？";
    if (npcId === "nana") return "こんにちは。まちの生活サポートラウンジの七海です。生活のことで気になることがあれば、小さなことでも気軽に聞いてくださいね。";
    if (npcId === "ren") return "こんにちは。ここ、少し落ち着く街ですよね。僕は少し前から、このあたりにしばらく住んでいます。あなたは、言街にはよく来ますか？";
    if (npcId === "mao") return "こんにちは。ここでは分からないことがあれば、気軽に聞いてくださいね。まずは一緒に確認していきましょう。";
    if (npcId === "saku") return "こんばんは。モクが、さっきから窓の外を見てる。たぶん、誰かが言い忘れた言葉を探してるんだと思う。";
    return "こんにちは。今日はどんな話をしましょうか？";
  }
  if (npcId === "aoi") return "また会ったね。今日はどんな感じ？";
  if (npcId === "haruka") return "こんにちは。この前の話の続きでも、別のことでも大丈夫ですよ。";
  if (npcId === "taisho") return "おっ、また来たな。今日はどんな調子だ？";
  if (npcId === "kimura") return "お、また来たね。今日は何があった？";
  if (npcId === "nana") return "こんにちは。生活のことで気になることがあれば、一緒に整理しましょう。";
  if (npcId === "ren") return "また会いましたね。今日は少し外を歩きたくなる感じですね。最近、どこか行ってみたい場所はありますか？";
  if (npcId === "mao") return "こんにちは。今日はどこまで進んでいますか？気になるところがあれば、一緒に確認しましょう。";
  if (npcId === "saku") return "こんばんは。モクが今夜は静かなんです。何か、胸に残っていることがありますか。";
  return "また来てくれてうれしいです。今日はどんな一日でしたか？";
}

function sanitizeWelcomeMessageSafe(message: string, npcId: string, isInitialVisit: boolean): string {
  const ownName = NPC_DISPLAY_NAMES[npcId] ?? "";
  const revisitTonePattern =
    /(久しぶり|また来(?:た|てくれた)|今日も来(?:た|てくれた)|よく来てくれた|しばらくぶり|前回|この前|さっきの話)/;
  const cleaned = message
    .replace(/[0-9０-９]+[ 　]*(時間|分|日|週間|ヶ月|か月|年)ぶり/g, "久しぶり")
    .replace(/[一二三四五六七八九十百千万]+[ 　]*(時間|分|日|週間|ヶ月|か月|年)ぶり/g, "久しぶり")
    .replace(ownName ? new RegExp(`^\\s*${ownName}[、，]\\s*`) : /$^/, "")
    .trim();

  if (!cleaned) return getFallbackWelcomeMessage(npcId, isInitialVisit);
  if (isInitialVisit && revisitTonePattern.test(cleaned)) {
    return getFallbackWelcomeMessage(npcId, true);
  }
  return cleaned;
}

function describeLocalDateContext(localDateContext: LocalDateContext): string {
  const dayKind = localDateContext.isWeekend ? "周末" : "工作日";
  return `${dayKind}（${localDateContext.dayLabelJa}）的${localDateContext.timeLabelJa}`;
}

function buildLocalDatePromptBlock(localDateContext: LocalDateContext): string {
  return [
    `- date: ${localDateContext.localDateKey}`,
    `- Japanese date label: ${localDateContext.dateLabelJa}`,
    `- English date label: ${localDateContext.dateLabelEn}`,
    `- day of week: ${localDateContext.dayLabelJa}`,
    `- weekend: ${localDateContext.isWeekend ? "true" : "false"}`,
    `- time of day: ${localDateContext.timeLabelJa}`,
    `- season: ${localDateContext.seasonLabelJa}`,
    `- seasonal culture hints (optional, not real-time events): ${localDateContext.seasonalHintsJa.join(" / ") || "none"}`,
    `- seasonal avoid notes: ${localDateContext.seasonalAvoidJa.join(" / ") || "none"}`,
  ].join("\n");
}

function buildWelcomePrompt(
  npcId: string,
  timeDiffText: string | undefined,
  localDateContext: LocalDateContext,
  existingFacts: string[],
  historyText: string,
  recentAssistantMessages: string[],
  lifeArc?: string,
  lifeArcState?: string,
  crossMentions?: string[],
  worldDescription?: string,
  worldReaction?: string
): ChatCompletionMessageParam[] {
  const personality = NPC_PERSONALITIES[npcId] ?? NPC_PERSONALITIES.taisho;
  const factsStr = existingFacts.length > 0 ? existingFacts.join("、") : "なし";
  const timeContext = describeLocalDateContext(localDateContext);
  const localDatePromptBlock = buildLocalDatePromptBlock(localDateContext);
  const recentAssistantText = recentAssistantMessages.length > 0
    ? recentAssistantMessages.map((message) => `- ${message}`).join("\n")
    : "なし";
  const isInitialVisit = timeDiffText === "初回";
  const initialGreetingHint = INITIAL_GREETING_HINTS[npcId] ?? INITIAL_GREETING_HINTS.taisho;
  const visitContext = isInitialVisit
    ? "このNPCとの新しい会話。初対面に近い自然な入り方にする。"
    : "再訪の可能性はあるが、経過時間を具体的に言わない。";
  const revisitRuleText = isInitialVisit
    ? `- これは初回/リセット直後の新しい会話です。既に親しい前提を置かない。
- 回訪ニュアンスは禁止：久しぶり、また来た、また来てくれた、今日も来た、今日も来てくれた、よく来てくれた、しばらくぶり、前回、この前、さっきの話。`
    : `- これは再訪シーンです。軽い再訪ニュアンスは可（例：久しぶり、また来てくれたんだ）。
- ただし過度に親密にしない。`;

  return [
    {
      role: "system",
      content: `你是一个双层记忆系统的「静默审计员」，同时负责生成个性化的欢迎语。

## 任务一：事实提取与合并
分析下方 history 中用户的聊天记录，提炼出关于用户的核心事实（爱好、计划、工作、宠物、人际关系、近期事件等）。

合并规则（严格执行）：
1. 事实数组最大长度为 10，绝不能超过
2. 如果新提炼的事实与 existingFacts 中的旧事实冲突（如旧："周二面试" vs 新："面试过了"），必须用新事实覆盖旧事实
3. 如果没有冲突但已满 10 条，剔除最不重要的旧事实，将最新的核心事实挤入
4. 如果聊天记录中没有可提取的新事实，原样返回 existingFacts

## 任务二：生成欢迎语
根据 NPC 人设生成纯正地道的日文 welcome。
- 必须严格符合 NPC 人设风格，但三位 NPC 都遵守同一 welcome 规则
- welcome 只写 1 到 2 句，短、自然、像 LINE 里刚打开聊天时的一句话
- 不要主动纠错，不要给学习建议，不要像系统通知、打卡提醒或学习软件
- 如果 history 最后一条是 NPC，也不要接着上一句继续说；把它当作用户重新进店/重新打开聊天时的自然开场
- 不要每次用同一个开头；避免重复 recentAssistantMessages 中的句式
- 不要为了变化而夸张，不要突然抛出很重的话题
- 不要固定提「論文」「試験」「コーヒー」等话题，除非 history 或 existingFacts 中确实强相关
- 可以有轻微时间/天气氛围，但只能用模糊表达
- 当前本地日期语境：${timeContext}。weekday/weekend 和时段以此为准。可以自然地说「朝だね」「今日はもう夜だね」等，但不要生硬地点明具体时间
- 当前完整本地日期：
${localDatePromptBlock}

## NPC 人设
${personality}

## 最近生活
${lifeArc ? `正在经历「${lifeArc}」，当前状态：${lifeArcState}。欢迎语中可以自然地体现最近的生活状态。` : "无特殊生活事件。"}

## 邻里感
${crossMentions?.length ? `你偶尔会自然地提到街区的邻居。以下是你最近可能提到的事（偶尔、不经意地提起即可）：${crossMentions.join("；")}` : "无邻里提及。"}

## 天气氛围
${worldDescription ? `今天的天气/氛围：${worldDescription}。你的感受：${worldReaction}。欢迎语中可以自然地体现对当前天气/氛围的反应。` : "无特殊天气。"}

## 输入数据
- visitContext: ${visitContext}
- existingFacts: [${factsStr}]
- history:
${historyText}
- recentAssistantMessages:
${recentAssistantText}

## 初回welcomeの入口ルール（重要）
- 初回（timeDiffText === "初回"）では、先に「店/場に入ってきた相手への自然な声かけ」を置く。
- 構成は 1〜2 文: 入口の一言 + 低圧で返しやすい問いかけ。
- 深掘りや学習説明に急がない。雑談の入口だけを作る。
- NPC別の初回ヒント:
  - ${initialGreetingHint}

## welcome 禁止事项
- 绝对不要说精确时间差或精确日期差
- 禁止输出：13時間ぶり、19時間ぶり、何時間ぶり、何分ぶり、N日ぶり、N週間ぶり、具体日期差
- 如果 timeDiffText 中包含精确时间，也只能当作内部参考，不能复述
- ${revisitRuleText}
- NPC 自己的名字由 UI 显示，不需要写进 welcomeMessage 正文；禁止句首自称呼语：
  - 大将、...
  - 木村、...
  - 美咲、...

## 输出格式
严格返回 JSON 对象，包含且仅包含以下两个字段，不要输出任何其他文本：
{
  "extractedFacts": ["事实1", "事实2", ...],
  "welcomeMessage": "日文欢迎语"
}`,
    },
    {
      role: "system",
      content:
        "Kotomachi is a fictional language town. Do not mention real-world city names, districts, neighborhoods, or stations such as 下北沢, 渋谷, 新宿, 東京, 京都, or 大阪. Treat the provided localDateContext as the only source of truth for date, month, weekday, weekend, time of day, and season. Do not invent another month, season, holiday, or seasonal event. Seasonal culture hints are optional conversation material derived from the local month and season, not real-time events. Do not mention Christmas unless month is December or recent conversation supports it. Do not mention sakura unless spring/month supports it or recent conversation supports it. Do not mention autumn leaves unless autumn/month supports it or recent conversation supports it. Do not mention snow as current weather unless world state supports it. Do not mention Christmas, New Year, sakura, autumn leaves, summer festival, rainy season, or similar seasonal events unless supported by localDateContext, world state, or recent conversation. If localDateContext says June, do not say November, December, Christmas, autumn leaves, or winter. Use only generic place references like この街, 街区, 店のまわり, 近く, キャンパスのほう, 研究室のあたり. Treat the provided worldDescription and worldReaction as the current page state. Do not contradict them. Do not invent a different weather condition, street mood, or atmosphere. Only mention weather, time, or atmosphere when supported by the provided localDateContext, the provided world state, or the recent conversation.",
    },
  ];
}

export async function POST(req: NextRequest) {
  try {
    const {
      npcId,
      history,
      existingFacts,
      timeDiffText,
      recentAssistantMessages,
      lifeArc,
      lifeArcState,
      crossMentions,
      worldDescription,
      worldReaction,
      localDateContext: rawLocalDateContext,
    } = (await req.json()) as WelcomeRequestBody;

    if (!npcId) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

    const localDateContext = resolveLocalDateContext(rawLocalDateContext, getLocalDateContext());

    // 将聊天记录格式化为可读文本，供大模型分析
    const historyText = (history ?? [])
      .map(
        (m: { role: string; content: string }) =>
          `${m.role === "user" ? "用户" : "NPC"}：${m.content}`
      )
      .join("\n");
    const recentAssistantText = Array.isArray(recentAssistantMessages)
      ? recentAssistantMessages.slice(-3)
      : (history ?? [])
          .filter((message) => message.role === "assistant")
          .map((message) => message.content)
          .slice(-3);

    const messages = buildWelcomePrompt(
      npcId,
      timeDiffText,
      localDateContext,
      existingFacts ?? [],
      historyText || "（无聊天记录）",
      recentAssistantText,
      lifeArc,
      lifeArcState,
      crossMentions,
      worldDescription,
      worldReaction
    );
    const isInitialVisit = timeDiffText === "初回";

    // 调用大模型，启用 JSON 模式确保结构化输出
    const raw = await createChatCompletion(messages, {
      temperature: 0.82,
      maxTokens: 420,
      jsonMode: true,
    });

    // 解析大模型返回的 JSON
    let parsed: { extractedFacts?: string[]; welcomeMessage?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // JSON 解析失败时兜底：保留旧事实，把原始输出当作欢迎语
      return NextResponse.json({
        extractedFacts: existingFacts ?? [],
        welcomeMessage: sanitizeWelcomeMessageSafe(raw, npcId, isInitialVisit),
      });
    }

    // 硬性上限：事实数组绝不超过 10 条
    const extractedFacts = (parsed.extractedFacts ?? existingFacts ?? []).slice(
      0,
      10
    );

    return NextResponse.json({
      extractedFacts,
      welcomeMessage: sanitizeWelcomeMessageSafe(
        parsed.welcomeMessage ?? getFallbackWelcomeMessage(npcId, isInitialVisit),
        npcId,
        isInitialVisit,
      ),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "服务异常";
    console.error("欢迎语接口错误:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
