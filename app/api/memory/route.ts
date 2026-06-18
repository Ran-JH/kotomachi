import { NextRequest, NextResponse } from "next/server";

import { createChatCompletion } from "@/lib/llm";
import { shouldKeepMemoryCandidate } from "@/lib/memory";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userText } = await req.json();

    if (!userText?.trim()) {
      return NextResponse.json({ fact: null });
    }

    const fact = await createChatCompletion(
      [
        {
          role: "system",
          content: `你是 Kotomachi 的 memory extractor。

你的任务不是总结这次聊天，而是判断：这条用户消息里，是否有“跨会话仍然有用”的 durable memory。

只在以下情况返回一条 memory：
- 稳定兴趣或长期习惯
- 长期目标，或正在持续练习的方向
- 日语练习偏好，例如希望纠正更温柔一点
- 反复出现、下次聊天仍有帮助的话题
- 和当前 NPC 的共享背景里，值得下次自然接住的一条持续信息

以下内容一律不要保存：
- 一次性想吃什么、喝什么、买什么
- 当次聊天里的临时选择、点单、挑商品
- 助手提出的建议或措辞
- 过短关键词、菜名、物品名堆积
- 今天累了、现在想喝咖啡、今天下雨之类短期状态
- 食物偏好碎片，除非用户明确说是平时/长期偏好
- 医疗细节、体重身材焦虑、地址电话等敏感信息
- 恋爱依赖、占有、专属关系相关内容

输出要求：
- 只能返回一条自然短句，像给用户看的 memory 文本
- 不要返回关键词，不要返回列表，不要解释原因
- 如果这条消息不该留下 durable memory，就只返回空字符串

示例：
- 可保存：用户想重新开始打排球。
- 可保存：用户希望以后日语纠正更温柔一点。
- 可保存：用户最近主要想练健身房和运动相关表达。
- 不可保存：想吃热的食物
- 不可保存：今天打算买关东煮`,
        },
        { role: "user", content: userText },
      ],
      { temperature: 0.1, maxTokens: 60 }
    );

    const trimmed = fact.trim();
    if (!trimmed || trimmed === "无" || trimmed === "なし") {
      return NextResponse.json({ fact: null });
    }

    if (!shouldKeepMemoryCandidate(trimmed)) {
      return NextResponse.json({ fact: null });
    }

    return NextResponse.json({ fact: trimmed });
  } catch (error) {
    console.error("Memory extract error:", error);
    return NextResponse.json({ fact: null });
  }
}
