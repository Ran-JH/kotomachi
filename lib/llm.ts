import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const DEEPSEEK_TIMEOUT_MS = 8000;
const ARK_TIMEOUT_MS = 10000;

export type ChatProvider = "deepseek" | "volc_ark";

export type LlmProviderAttempt = {
  provider: ChatProvider;
  model: string;
  outcome: "success" | "failure" | "timeout" | "skipped";
  elapsedMs: number;
  timeoutMs: number;
  status?: number;
  requestId?: string;
  reason?: string;
};

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
  attempts: LlmProviderAttempt[];

  constructor(
    message: string,
    options: {
      code: "timeout" | "aborted" | "provider_failed" | "provider_unavailable";
      provider?: ChatProvider;
      cause?: unknown;
      attempts?: LlmProviderAttempt[];
    }
  ) {
    super(message);
    this.name = "ChatCompletionError";
    this.code = options.code;
    this.provider = options.provider;
    this.attempts = options.attempts ? [...options.attempts] : [];
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

function shouldLogLlmTrace(traceLabel?: string): boolean {
  return Boolean(traceLabel) || process.env.NODE_ENV !== "production";
}

function readErrorMetadata(error: unknown): {
  status?: number;
  requestId?: string;
} {
  const sources: unknown[] = [error];
  if (error && typeof error === "object" && "cause" in error) {
    sources.push((error as { cause?: unknown }).cause);
  }

  let status: number | undefined;
  let requestId: string | undefined;

  for (const source of sources) {
    if (!source || typeof source !== "object") continue;
    const candidate = source as Record<string, unknown>;

    if (status === undefined && typeof candidate.status === "number") {
      status = candidate.status;
    }

    if (!requestId) {
      const directRequestId =
        candidate.request_id ?? candidate.requestId ?? candidate._request_id;
      if (typeof directRequestId === "string" && directRequestId.trim()) {
        requestId = directRequestId.trim();
      }
    }

    if (!requestId && candidate.headers && typeof candidate.headers === "object") {
      const headers = candidate.headers as {
        get?: (name: string) => string | null;
      };
      if (typeof headers.get === "function") {
        try {
          const headerRequestId =
            headers.get("x-request-id") ?? headers.get("request-id");
          if (headerRequestId?.trim()) {
            requestId = headerRequestId.trim();
          }
        } catch {
          // Header implementations differ between providers; metadata is optional.
        }
      }
    }
  }

  return { status, requestId };
}

function getSafeAttemptReason(
  error: unknown,
  code: ChatCompletionError["code"],
  status?: number
): string {
  if (code === "timeout") return "request_timed_out";
  if (code === "aborted") return "request_aborted";
  if (code === "provider_unavailable") return "provider_unavailable";

  if (
    error instanceof ChatCompletionError &&
    error.message.includes("empty response")
  ) {
    return "empty_response";
  }

  if (status === 400) return "invalid_request";
  if (status === 401 || status === 403) return "authentication_or_permission";
  if (status === 404) return "resource_not_found";
  if (status === 408) return "request_timed_out";
  if (status === 429) return "rate_limited";
  if (status !== undefined && status >= 500) return "provider_server_error";
  return "provider_failed";
}

function logLlmAttempt(
  traceLabel: string | undefined,
  attempt: LlmProviderAttempt,
  fallbackUsed: boolean
): void {
  if (!shouldLogLlmTrace(traceLabel)) return;

  const details = {
    traceLabel: traceLabel ?? "unlabeled",
    ...attempt,
    fallbackUsed,
  };

  if (attempt.outcome === "success") {
    console.info("[LLM] provider success", details);
    return;
  }

  console.warn(`[LLM] provider ${attempt.outcome}`, details);
}

function logLlmFinalError(
  traceLabel: string | undefined,
  error: ChatCompletionError
): void {
  if (!shouldLogLlmTrace(traceLabel)) return;

  console.error("[LLM] completion failed", {
    traceLabel: traceLabel ?? "unlabeled",
    code: error.code,
    provider: error.provider ?? "unavailable",
    fallbackUsed: error.attempts.some(
      (attempt) =>
        attempt.provider === "volc_ark" && attempt.outcome !== "skipped"
    ),
    attempts: error.attempts,
  });
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
  const model = process.env.DEEPSEEK_MODEL?.trim();
  return model || "deepseek-v4-flash";
}

function getVolcArkModel() {
  const endpointId = process.env.VOLCENGINE_ARK_ENDPOINT_ID?.trim();
  if (endpointId) return endpointId;

  return process.env.VOLCENGINE_ARK_MODEL?.trim() || "";
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
  timeoutMs: number,
  attempts: LlmProviderAttempt[],
  fallbackUsed: boolean
): Promise<string> {
  const controller = new AbortController();
  let timedOut = false;
  const startedAt = Date.now();

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await client.chat.completions.create(
      buildChatCompletionRequestPayload(model, messages, options),
      { signal: controller.signal }
    );

    const text = response.choices[0]?.message?.content?.trim();
    if (text) {
      const responseMetadata = readErrorMetadata(response);
      const attempt: LlmProviderAttempt = {
        provider,
        model,
        outcome: "success",
        elapsedMs: Date.now() - startedAt,
        timeoutMs,
        ...responseMetadata,
      };
      attempts.push(attempt);
      logLlmAttempt(options?.traceLabel, attempt, fallbackUsed);
      return text;
    }

    throw new ChatCompletionError(`${provider} returned an empty response.`, {
      code: "provider_failed",
      provider,
    });
  } catch (error) {
    const normalizedError =
      error instanceof ChatCompletionError
        ? error
        : new ChatCompletionError(
            timedOut
              ? `${provider} request timed out.`
              : `${provider} request failed.`,
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
    const errorMetadata = readErrorMetadata(error);
    const attempt: LlmProviderAttempt = {
      provider,
      model,
      outcome:
        normalizedError.code === "timeout" || errorMetadata.status === 408
          ? "timeout"
          : "failure",
      elapsedMs: Date.now() - startedAt,
      timeoutMs,
      ...errorMetadata,
      reason: getSafeAttemptReason(
        error,
        normalizedError.code,
        errorMetadata.status
      ),
    };
    attempts.push(attempt);
    normalizedError.attempts = [attempt];
    logLlmAttempt(options?.traceLabel, attempt, fallbackUsed);

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
  const attempts: LlmProviderAttempt[] = [];
  const deepseekModel = getDeepSeekModel();

  const deepseek = getDeepSeekClient();
  if (deepseek) {
    try {
      return await requestProviderCompletion(
        "deepseek",
        deepseek,
        deepseekModel,
        messages,
        options,
        deepseekTimeoutMs,
        attempts,
        false
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
  } else {
    const attempt: LlmProviderAttempt = {
      provider: "deepseek",
      model: deepseekModel,
      outcome: "skipped",
      elapsedMs: 0,
      timeoutMs: deepseekTimeoutMs,
      reason: "provider_not_configured",
    };
    attempts.push(attempt);
    logLlmAttempt(options?.traceLabel, attempt, false);
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
        arkTimeoutMs,
        attempts,
        true
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
  } else {
    const attempt: LlmProviderAttempt = {
      provider: "volc_ark",
      model: arkModel,
      outcome: "skipped",
      elapsedMs: 0,
      timeoutMs: arkTimeoutMs,
      reason: !ark ? "provider_not_configured" : "model_not_configured",
    };
    attempts.push(attempt);
    logLlmAttempt(options?.traceLabel, attempt, true);
  }

  if (lastError) {
    lastError.attempts = [...attempts];
    logLlmFinalError(options?.traceLabel, lastError);
    throw lastError;
  }

  const unavailableError = new ChatCompletionError(
    "No configured chat completion provider is available.",
    { code: "provider_unavailable", attempts }
  );
  logLlmFinalError(options?.traceLabel, unavailableError);
  throw unavailableError;
}
