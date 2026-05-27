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

function buildWelcomePrompt(
  npcId: string,
  timeDiffText: string,
  existingFacts: string[],
  historyText: string,
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
根据 NPC 人设和 timeDiffText 生成纯正地道的日文欢迎语。
- 时间短（几小时）：语气像刚分开不久，轻松自然
- 时间长（数天）：表现出久别重逢的惊喜与关心，自然地融合事实进行主动追问
- 必须严格符合 NPC 人设风格
- 彻底消灭教科书式的公式化问候，像真实的日本 LINE 好友一样高情商、有温度
- 欢迎语控制在 2-3 句以内，适当使用 Emoji
- 当前时间：${timeContext}。请自然地体现此时段感（比如早上用朝の挨拶、晚上用夜の挨拶），但不要生硬地点明"现在是X点"

## NPC 人设
${personality}

## 最近生活
${lifeArc ? `正在经历「${lifeArc}」，当前状态：${lifeArcState}。欢迎语中可以自然地体现最近的生活状态。` : "无特殊生活事件。"}

## 邻里感
${crossMentions?.length ? `你偶尔会自然地提到街区的邻居。以下是你最近可能提到的事（偶尔、不经意地提起即可）：${crossMentions.join("；")}` : "无邻里提及。"}

## 天气氛围
${worldDescription ? `今天的天气/氛围：${worldDescription}。你的感受：${worldReaction}。欢迎语中可以自然地体现对当前天气/氛围的反应。` : "无特殊天气。"}

## 输入数据
- timeDiffText: ${timeDiffText}
- existingFacts: [${factsStr}]
- history:
${historyText}

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
    const { npcId, history, existingFacts, timeDiffText, lifeArc, lifeArcState, crossMentions, worldDescription, worldReaction } = await req.json();

    if (!npcId || !timeDiffText) {
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

    const messages = buildWelcomePrompt(
      npcId,
      timeDiffText,
      existingFacts ?? [],
      historyText || "（无聊天记录）",
      lifeArc,
      lifeArcState,
      crossMentions,
      worldDescription,
      worldReaction
    );

    // 调用大模型，启用 JSON 模式确保结构化输出
    const raw = await createChatCompletion(messages, {
      temperature: 0.7,
      maxTokens: 500,
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
        welcomeMessage: raw,
      });
    }

    // 硬性上限：事实数组绝不超过 10 条
    const extractedFacts = (parsed.extractedFacts ?? existingFacts ?? []).slice(
      0,
      10
    );

    return NextResponse.json({
      extractedFacts,
      welcomeMessage: parsed.welcomeMessage ?? "おかえりなさい！😊",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "服务异常";
    console.error("欢迎语接口错误:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
