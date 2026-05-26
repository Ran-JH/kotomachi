import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

function getDeepSeekClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    baseURL: "https://api.deepseek.com/v1",
  });
}

function getVolcArkClient() {
  const apiKey = process.env.VOLCENGINE_ARK_API_KEY;
  if (!apiKey) return null;
  const baseURL =
    process.env.VOLCENGINE_ARK_BASE_URL ??
    "https://ark.cn-beijing.volces.com/api/v3";
  return new OpenAI({ apiKey, baseURL });
}

function getDeepSeekModel() {
  return process.env.DEEPSEEK_MODEL ?? "deepseek-chat";
}

function getVolcArkModel() {
  return (
    process.env.VOLCENGINE_ARK_ENDPOINT_ID ??
    process.env.VOLCENGINE_ARK_MODEL ??
    ""
  );
}

export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const temperature = options?.temperature ?? 0.8;
  const max_tokens = options?.maxTokens;

  const deepseek = getDeepSeekClient();
  if (deepseek) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const response = await deepseek.chat.completions.create(
        {
          model: getDeepSeekModel(),
          messages,
          temperature,
          max_tokens,
          ...(options?.jsonMode
            ? { response_format: { type: "json_object" as const } }
            : {}),
        },
        { signal: controller.signal }
      );
      clearTimeout(timeoutId);
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return text;
    } catch (err) {
      console.warn("DeepSeek 失败，尝试火山方舟 Fallback:", err);
    }
  }

  const ark = getVolcArkClient();
  const arkModel = getVolcArkModel();
  if (ark && arkModel) {
    const response = await ark.chat.completions.create({
      model: arkModel,
      messages,
      temperature,
      max_tokens,
      ...(options?.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });
    const text = response.choices[0]?.message?.content?.trim();
    if (text) return text;
  }

  throw new Error(
    "请配置 DEEPSEEK_API_KEY，或配置 VOLCENGINE_ARK_API_KEY + VOLCENGINE_ARK_ENDPOINT_ID"
  );
}
