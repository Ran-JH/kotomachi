import { NextRequest, NextResponse } from "next/server";
import { createChatCompletion } from "@/lib/llm";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getTimeOfDay } from "@/lib/npc";

export const runtime = "nodejs";

/** NPC 人设描述，用于生成符合角色性格的欢迎语 */
const NPC_PERSONALITIES: Record<string, string> = {
  misaki: `你叫「美咲」(Misaki)，24岁，下北泽咖啡馆的暖心咖啡师。性格温柔、善于倾听。使用日常敬语（丁寧語），偶尔混用轻松口语。像大姐姐一样温暖知性地关心对方。`,
  kimura: `你叫「木村」(Kimura)，22岁，便利店的兼职小哥。有点疲惫、随和、轻微吐槽系、不是特别主动。经常值夜班，喜欢足球和动漫。使用年轻人随性口语（タメ口），像朋友一样随意但不特别热情。`,
  taisho: `你叫「大将」(Taisho)，52岁，居酒屋老板。性格豪爽、不拘小节。使用粗犷但温暖的随和口语（タメ口），像长辈一样关心但不过分干涉。`,
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
}

const NPC_DISPLAY_NAMES: Record<string, string> = {
  kimura: "木村",
  misaki: "美咲",
  taisho: "大将",
};

function getFallbackWelcomeMessage(npcId: string, isInitialVisit: boolean): string {
  if (isInitialVisit) {
    if (npcId === "taisho") return "よっ、いらっしゃい。今日はどうした？";
    if (npcId === "kimura") return "いらっしゃい。今日は何か探してる？";
    return "こんにちは。今日はどんな話をしましょうか？";
  }
  if (npcId === "taisho") return "おっ、また来たな。今日はどんな調子だ？";
  if (npcId === "kimura") return "お、また来たね。今日は何があった？";
  return "また来てくれてうれしいです。今日はどんな一日でしたか？";
}

function sanitizeWelcomeMessage(message: string, npcId: string, isInitialVisit: boolean): string {
  const ownName = NPC_DISPLAY_NAMES[npcId] ?? "";
  const revisitTonePattern =
    /(久しぶり|また来(?:た|てくれた)|今日も来(?:た|てくれた)|よく来てくれた|しばらくぶり|前回|この前|さっきの話)/g;
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

function buildWelcomePrompt(
  npcId: string,
  timeDiffText: string | undefined,
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
  const timeOfDay = getTimeOfDay();
  const timeDescriptions: Record<string, string> = {
    朝: "现在是早上（朝），大概5点到11点",
    昼: "现在是白天（昼），大概11点到17点",
    夕: "现在是傍晚（夕），大概17点到21点",
    夜: "现在是晚上（夜），大概21点到凌晨5点",
  };
  const timeContext = timeDescriptions[timeOfDay];
  const recentAssistantText = recentAssistantMessages.length > 0
    ? recentAssistantMessages.map((message) => `- ${message}`).join("\n")
    : "なし";
  const isInitialVisit = timeDiffText === "初回";
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
- 当前时间：${timeContext}。可以自然地说「朝だね」「今日はもう夜だね」等，但不要生硬地点明具体时间

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
    } = (await req.json()) as WelcomeRequestBody;

    if (!npcId) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      );
    }

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
        welcomeMessage: sanitizeWelcomeMessage(raw, npcId, isInitialVisit),
      });
    }

    // 硬性上限：事实数组绝不超过 10 条
    const extractedFacts = (parsed.extractedFacts ?? existingFacts ?? []).slice(
      0,
      10
    );

    return NextResponse.json({
      extractedFacts,
      welcomeMessage: sanitizeWelcomeMessage(
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
