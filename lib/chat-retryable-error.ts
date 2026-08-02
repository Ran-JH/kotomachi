export const CHAT_CLIENT_TIMEOUT_MS = 30_000;

export type ChatRequestErrorCategory =
  | "network"
  | "timeout"
  | "server"
  | "invalid_response";

/**
 * 只用于区分可重试故障的安全类别。
 * 原始服务端错误不会进入聊天 UI，避免泄露 provider 或请求细节。
 */
export class ChatRequestError extends Error {
  readonly category: ChatRequestErrorCategory;

  constructor(category: ChatRequestErrorCategory) {
    super(`Chat request failed: ${category}`);
    this.name = "ChatRequestError";
    this.category = category;
  }
}

type ChatResponseLike = Pick<Response, "ok" | "json">;

/**
 * 统一验证 /api/chat 的响应契约。
 * 非 2xx、坏 JSON、缺少文本或空文本都不能伪装成 assistant reply。
 */
export async function readChatAssistantText(
  response: ChatResponseLike,
): Promise<string> {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new ChatRequestError(response.ok ? "invalid_response" : "server");
  }

  if (!response.ok) {
    throw new ChatRequestError("server");
  }

  const text = (
    typeof data === "object"
    && data !== null
    && "text" in data
    && typeof data.text === "string"
  )
    ? data.text.trim()
    : "";

  if (!text) {
    throw new ChatRequestError("invalid_response");
  }

  return text;
}

/** 将 fetch 异常归并为用户可恢复的类别，不把原始异常展示到 UI。 */
export function classifyChatRequestError(
  error: unknown,
  didTimeout: boolean,
): ChatRequestErrorCategory {
  if (didTimeout) return "timeout";
  if (error instanceof ChatRequestError) return error.category;

  const errorName = error instanceof Error ? error.name.toLowerCase() : "";
  if (errorName === "timeouterror") return "timeout";
  return "network";
}

/**
 * 每个异步回调写回前都复用同一组条件，防止 restart、NPC 切换或旧请求迟到污染新会话。
 */
export function isCurrentChatRequest({
  isMounted,
  activeNpcId,
  targetNpcId,
  currentRequestVersion,
  requestVersion,
  currentGeneration,
  requestGeneration,
}: {
  isMounted: boolean;
  activeNpcId: string;
  targetNpcId: string;
  currentRequestVersion: number;
  requestVersion: number;
  currentGeneration: number;
  requestGeneration: number;
}): boolean {
  return isMounted
    && activeNpcId === targetNpcId
    && currentRequestVersion === requestVersion
    && currentGeneration === requestGeneration;
}
