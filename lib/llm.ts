import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const DEEPSEEK_TIMEOUT_MS = 8000;
const ARK_TIMEOUT_MS = 10000;

type ChatProvider = "deepseek" | "volc_ark";

export type ChatCompletionOptions = {
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  providerTimeouts?: {
    deepseekMs?: number;
    arkMs?: number;
  };
  traceLabel?: string;
};

export type ChatProviderPayloadPreview = {
  provider: ChatProvider;
  model: string;
  payload: Record<string, unknown>;
};

export class ChatCompletionError extends Error {
  code: "timeout" | "aborted" | "provider_failed" | "provider_unavailable";
  provider?: ChatProvider;

  constructor(
    message: string,
    options: {
      code: "timeout" | "aborted" | "provider_failed" | "provider_unavailable";
      provider?: ChatProvider;
      cause?: unknown;
    }
  ) {
    super(message);
    this.name = "ChatCompletionError";
    this.code = options.code;
    this.provider = options.provider;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function debugLlmTrace(
  traceLabel: string | undefined,
  message: string,
  details?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "production" || !traceLabel) return;
  if (details) {
    console.debug(`[${traceLabel}] ${message}`, details);
    return;
  }
  console.debug(`[${traceLabel}] ${message}`);
}

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

function buildChatCompletionRequestPayload(
  model: string,
  messages: ChatCompletionMessageParam[],
  options?: ChatCompletionOptions
) {
  return {
    model,
    messages,
    temperature: options?.temperature ?? 0.8,
    max_tokens: options?.maxTokens,
    ...(options?.jsonMode
      ? { response_format: { type: "json_object" as const } }
      : {}),
  };
}

export function buildChatCompletionPayloadPreview(
  messages: ChatCompletionMessageParam[],
  options?: ChatCompletionOptions
): ChatProviderPayloadPreview[] {
  // This is a local debug helper only. It mirrors the exact request body shape
  // we pass to providers, but never touches network clients or secrets.
  const previews: ChatProviderPayloadPreview[] = [];
  const deepseekModel = getDeepSeekModel();
  if (deepseekModel) {
    previews.push({
      provider: "deepseek",
      model: deepseekModel,
      payload: buildChatCompletionRequestPayload(deepseekModel, messages, options),
    });
  }

  const arkModel = getVolcArkModel();
  if (arkModel) {
    previews.push({
      provider: "volc_ark",
      model: arkModel,
      payload: buildChatCompletionRequestPayload(arkModel, messages, options),
    });
  }

  return previews;
}

async function requestProviderCompletion(
  provider: ChatProvider,
  client: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  options: ChatCompletionOptions | undefined,
  timeoutMs: number
): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;

  debugLlmTrace(
    options?.traceLabel,
    provider === "deepseek"
      ? "primary provider started"
      : "fallback provider started",
    { provider, timeoutMs }
  );

  const timeoutId = setTimeout(() => {
    timedOut = true;
    debugLlmTrace(options?.traceLabel, "provider timeout", {
      provider,
      timeoutMs,
    });
    controller.abort();
  }, timeoutMs);

  try {
    const response = await client.chat.completions.create(
      buildChatCompletionRequestPayload(model, messages, options),
      { signal: controller.signal }
    );

    const text = response.choices[0]?.message?.content?.trim();
    if (text) {
      return text;
    }

    throw new ChatCompletionError(`${provider} returned an empty response.`, {
      code: "provider_failed",
      provider,
    });
  } catch (error) {
    if (error instanceof ChatCompletionError) {
      throw error;
    }

    const normalizedError = new ChatCompletionError(
      timedOut ? `${provider} request timed out.` : `${provider} request failed.`,
      {
        code: timedOut
          ? "timeout"
          : controller.signal.aborted
            ? "aborted"
            : "provider_failed",
        provider,
        cause: error,
      }
    );

    debugLlmTrace(
      options?.traceLabel,
      provider === "deepseek" ? "primary failed" : "fallback provider failed",
      {
        provider,
        reason: normalizedError.message,
      }
    );

    throw normalizedError;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function createChatCompletion(
  messages: ChatCompletionMessageParam[],
  options?: ChatCompletionOptions
): Promise<string> {
  const deepseekTimeoutMs =
    options?.providerTimeouts?.deepseekMs ?? DEEPSEEK_TIMEOUT_MS;
  const arkTimeoutMs = options?.providerTimeouts?.arkMs ?? ARK_TIMEOUT_MS;
  let lastError: ChatCompletionError | null = null;

  const deepseek = getDeepSeekClient();
  if (deepseek) {
    try {
      return await requestProviderCompletion(
        "deepseek",
        deepseek,
        getDeepSeekModel(),
        messages,
        options,
        deepseekTimeoutMs
      );
    } catch (error) {
      lastError =
        error instanceof ChatCompletionError
          ? error
          : new ChatCompletionError("DeepSeek request failed.", {
              code: "provider_failed",
              provider: "deepseek",
              cause: error,
            });
    }
  }

  const ark = getVolcArkClient();
  const arkModel = getVolcArkModel();
  if (ark && arkModel) {
    try {
      return await requestProviderCompletion(
        "volc_ark",
        ark,
        arkModel,
        messages,
        options,
        arkTimeoutMs
      );
    } catch (error) {
      lastError =
        error instanceof ChatCompletionError
          ? error
          : new ChatCompletionError("Volc Ark request failed.", {
              code: "provider_failed",
              provider: "volc_ark",
              cause: error,
            });
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new ChatCompletionError(
    "No configured chat completion provider is available.",
    { code: "provider_unavailable" }
  );
}
