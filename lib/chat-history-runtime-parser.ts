/**
 * LocalStorage chat history is untrusted runtime input.
 * Keep only product fields and rebuild each accepted entry as a fresh object.
 */
export interface ParsedStoredMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp. Older LocalStorage records may not have this field. */
  createdAt?: string;
  /** The product currently uses only "welcome" and "scene". */
  source?: "welcome" | "scene";
}

interface ChatHistoryStorageReader {
  getItem(key: string): string | null;
}

const hasOwn = Object.prototype.hasOwnProperty;

function parseStoredMessage(value: unknown): ParsedStoredMessage | null {
  try {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    const record = value as Record<string, unknown>;
    if (!hasOwn.call(record, "role") || !hasOwn.call(record, "content")) {
      return null;
    }

    const { role, content } = record;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
      return null;
    }

    // Preserve string content exactly, including an empty string; do not trim or rewrite it.
    const message: ParsedStoredMessage = { role, content };

    // Older records may omit time. Drop invalid metadata without inventing a timestamp.
    if (
      hasOwn.call(record, "createdAt")
      && typeof record.createdAt === "string"
      && Number.isFinite(Date.parse(record.createdAt))
    ) {
      message.createdAt = record.createdAt;
    }

    // Unknown sources must not reach Guided/Welcome logic, but valid role/content can survive.
    if (
      hasOwn.call(record, "source")
      && (record.source === "welcome" || record.source === "scene")
    ) {
      message.source = record.source;
    }

    return message;
  } catch {
    // One hostile entry must not discard other valid entries from the same array.
    return null;
  }
}

/** Parse an already-decoded LocalStorage value without trusting array entries. */
export function parseStoredChatHistory(raw: unknown): ParsedStoredMessage[] {
  const history: ParsedStoredMessage[] = [];
  try {
    if (!Array.isArray(raw)) return [];

    for (let index = 0; index < raw.length; index += 1) {
      let candidate: unknown;
      try {
        candidate = raw[index];
      } catch {
        continue;
      }

      const message = parseStoredMessage(candidate);
      if (message) history.push(message);
    }
  } catch {
    // Even an unusual proxied array must not throw into the chat page.
  }

  return history;
}

/** Parse serialized history; malformed or non-array JSON safely becomes empty history. */
export function parseStoredChatHistoryJson(raw: string | null): ParsedStoredMessage[] {
  if (!raw) return [];

  try {
    return parseStoredChatHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Read one key only. This deliberately performs no setItem/removeItem repair write. */
export function loadStoredChatHistory(
  storage: ChatHistoryStorageReader,
  key: string,
): ParsedStoredMessage[] {
  try {
    return parseStoredChatHistoryJson(storage.getItem(key));
  } catch {
    return [];
  }
}
