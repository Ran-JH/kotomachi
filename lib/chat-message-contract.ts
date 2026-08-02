/**
 * /api/chat 的唯一消息契约：
 * - history 是本轮用户输入之前已经完成的 user / assistant 消息；
 * - text 是本轮当前用户输入；
 * - 服务端负责把 text 作为最后一条 user message 追加一次。
 */
export interface CompletedChatMessage {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  source?: string;
}

interface UiChatMessage {
  sender: "user" | "assistant";
  text: string;
  createdAt?: string;
  source?: string;
}

export interface ModelConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/** 在 optimistic user bubble 加入 state 前，从当前 UI 消息生成 completed history。 */
export function toCompletedChatHistory(
  messages: readonly UiChatMessage[],
): CompletedChatMessage[] {
  return messages.map((message) => ({
    role: message.sender,
    content: message.text,
    ...(message.createdAt ? { createdAt: message.createdAt } : {}),
    ...(message.source ? { source: message.source } : {}),
  }));
}

/** 让浏览器与 Eval sampler 使用相同的 history / text 结构。 */
export function buildChatTurnContract(
  history: readonly CompletedChatMessage[],
  text: string,
) {
  return {
    history: history.map((message) => ({ ...message })),
    text,
  };
}

/**
 * 转换为真正交给模型的对话消息，并剥离 LocalStorage/UI 专用元数据。
 * 不做 content 去重：用户在不同 turn 合法重复同一句时，两条都必须保留。
 */
export function appendCurrentUserOnce(
  history: readonly CompletedChatMessage[],
  text: string,
): ModelConversationMessage[] {
  return [
    ...history.map((message) => ({
      role: message.role,
      content: message.content,
    })),
    { role: "user", content: text },
  ];
}

/**
 * Guided 首轮 = 当前 scene opening 之后还没有 user message。
 * source 用来定位最近一次 scene opening，content 校验它确实属于 active scene。
 */
export function isFirstGuidedUserTurn(
  history: readonly CompletedChatMessage[],
  expectedSceneOpening: string,
): boolean {
  let openingIndex = -1;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const message = history[index];
    if (message.role === "assistant" && message.source === "scene") {
      openingIndex = index;
      break;
    }
  }

  if (openingIndex < 0) return false;
  if (history[openingIndex].content !== expectedSceneOpening) return false;

  return !history
    .slice(openingIndex + 1)
    .some((message) => message.role === "user");
}
