/**
 * Chat request limits use JavaScript string code units (string.length).
 * The production browser sends at most the latest 10 completed messages.
 */
export const MAX_CHAT_TEXT_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_MESSAGES = 10;
export const MAX_CHAT_HISTORY_MESSAGE_LENGTH = 4_000;
export const MAX_CHAT_HISTORY_TOTAL_LENGTH = 20_000;
export const MAX_CHAT_SCENE_ID_LENGTH = 128;

// Existing context fields also enter the prompt. These small defensive limits
// keep them bounded without turning this helper into an API-wide schema layer.
const MAX_CONTEXT_STRING_LENGTH = 2_000;
const MAX_CONTEXT_ARRAY_ITEMS = 10;
const MAX_CONTEXT_ARRAY_ITEM_LENGTH = 1_000;
const MAX_CONTEXT_ARRAY_TOTAL_LENGTH = 5_000;
const MAX_LOCAL_DATE_KEY_LENGTH = 32;

export type ValidChatHistorySource = "welcome" | "scene";

export interface ValidChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
  source?: ValidChatHistorySource;
}

export interface ValidChatLocalDateContext {
  localDateKey?: string;
  year?: number;
  month?: number;
  day?: number;
  dayOfWeek?: number;
  isWeekend?: boolean;
  timeOfDay?: "late_night" | "morning" | "noon" | "afternoon" | "evening" | "night";
}

export interface ValidChatRequest {
  text: string;
  npcId: string;
  history: ValidChatHistoryMessage[];
  memories?: string[];
  conversationCount?: number;
  lifeArc?: string;
  lifeArcState?: string;
  crossMentions?: string[];
  worldDescription?: string;
  worldReaction?: string;
  localDateContext?: ValidChatLocalDateContext;
  activeSceneId?: string;
  uiLanguage?: "zh" | "en";
  debugPromptOnly?: boolean;
}

export type ChatRequestValidationErrorCode =
  | "invalid_request"
  | "request_too_large";

export interface ChatRequestValidationError {
  code: ChatRequestValidationErrorCode;
  /** Safe internal reason: never contains chat text or the raw body. */
  reason: string;
}

export type ChatRequestParseResult =
  | { ok: true; data: ValidChatRequest }
  | { ok: false; error: ChatRequestValidationError };

export interface ChatRequestParserRuntime {
  isNpcId(value: string): boolean;
  getSceneNpcId(sceneId: string): string | null;
}

interface JsonRequestLike {
  json(): Promise<unknown>;
}

type FieldResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ChatRequestValidationError };

const hasOwn = Object.prototype.hasOwnProperty;
const TIME_OF_DAY_VALUES = new Set([
  "late_night",
  "morning",
  "noon",
  "afternoon",
  "evening",
  "night",
]);

function invalid(reason: string): ChatRequestParseResult {
  return { ok: false, error: { code: "invalid_request", reason } };
}

function tooLarge(reason: string): ChatRequestParseResult {
  return { ok: false, error: { code: "request_too_large", reason } };
}

function fieldInvalid<T>(reason: string): FieldResult<T> {
  return { ok: false, error: { code: "invalid_request", reason } };
}

function fieldTooLarge<T>(reason: string): FieldResult<T> {
  return { ok: false, error: { code: "request_too_large", reason } };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function ownValue(record: Record<string, unknown>, key: string): unknown {
  return hasOwn.call(record, key) ? record[key] : undefined;
}

function parseOptionalString(
  record: Record<string, unknown>,
  key: string,
): FieldResult<string | undefined> {
  const value = ownValue(record, key);
  if (value === undefined) return { ok: true, value: undefined };
  if (typeof value !== "string") return fieldInvalid(key + " must be a string");
  if (value.length > MAX_CONTEXT_STRING_LENGTH) {
    return fieldTooLarge(key + " exceeds its length limit");
  }
  return { ok: true, value };
}

function parseOptionalStringArray(
  record: Record<string, unknown>,
  key: string,
): FieldResult<string[] | undefined> {
  const value = ownValue(record, key);
  if (value === undefined) return { ok: true, value: undefined };
  if (!Array.isArray(value)) return fieldInvalid(key + " must be an array");
  if (value.length > MAX_CONTEXT_ARRAY_ITEMS) {
    return fieldTooLarge(key + " has too many items");
  }

  const normalized: string[] = [];
  let totalLength = 0;
  for (const item of value) {
    if (typeof item !== "string") return fieldInvalid(key + " items must be strings");
    if (item.length > MAX_CONTEXT_ARRAY_ITEM_LENGTH) {
      return fieldTooLarge(key + " item exceeds its length limit");
    }
    totalLength += item.length;
    if (totalLength > MAX_CONTEXT_ARRAY_TOTAL_LENGTH) {
      return fieldTooLarge(key + " exceeds its total length limit");
    }
    normalized.push(item);
  }
  return { ok: true, value: normalized };
}

function parseHistory(value: unknown): FieldResult<ValidChatHistoryMessage[]> {
  if (!Array.isArray(value)) return fieldInvalid("history must be an array");
  if (value.length > MAX_CHAT_HISTORY_MESSAGES) {
    return fieldTooLarge("history has too many messages");
  }

  const history: ValidChatHistoryMessage[] = [];
  let totalContentLength = 0;
  for (const item of value) {
    if (!isPlainRecord(item)) return fieldInvalid("history item must be a plain object");

    const role = ownValue(item, "role");
    if (role !== "user" && role !== "assistant") {
      return fieldInvalid("history role is not allowed");
    }

    const content = ownValue(item, "content");
    if (typeof content !== "string") {
      return fieldInvalid("history content must be a string");
    }
    if (content.length > MAX_CHAT_HISTORY_MESSAGE_LENGTH) {
      return fieldTooLarge("history content exceeds its length limit");
    }

    totalContentLength += content.length;
    if (totalContentLength > MAX_CHAT_HISTORY_TOTAL_LENGTH) {
      return fieldTooLarge("history exceeds its total content limit");
    }

    const source = ownValue(item, "source");
    if (source !== undefined && source !== "welcome" && source !== "scene") {
      return fieldInvalid("history source is not allowed");
    }

    history.push({
      role,
      content,
      ...(source ? { source } : {}),
    });
  }
  return { ok: true, value: history };
}

function parseLocalDateContext(
  value: unknown,
): FieldResult<ValidChatLocalDateContext | undefined> {
  // Missing/null previously meant "use server time"; preserve that fallback.
  if (value === undefined || value === null) return { ok: true, value: undefined };
  if (!isPlainRecord(value)) return fieldInvalid("localDateContext must be an object");

  const normalized: ValidChatLocalDateContext = {};
  const localDateKey = ownValue(value, "localDateKey");
  if (localDateKey !== undefined) {
    if (typeof localDateKey !== "string") {
      return fieldInvalid("localDateContext.localDateKey must be a string");
    }
    if (localDateKey.length > MAX_LOCAL_DATE_KEY_LENGTH) {
      return fieldTooLarge("localDateContext.localDateKey exceeds its length limit");
    }
    normalized.localDateKey = localDateKey;
  }

  const integerFields = ["year", "month", "day", "dayOfWeek"] as const;
  for (const key of integerFields) {
    const field = ownValue(value, key);
    if (field === undefined) continue;
    if (typeof field !== "number" || !Number.isInteger(field)) {
      return fieldInvalid("localDateContext." + key + " must be an integer");
    }
    normalized[key] = field;
  }

  if (normalized.year !== undefined && normalized.year <= 0) {
    return fieldInvalid("localDateContext.year is out of range");
  }
  if (normalized.month !== undefined && (normalized.month < 1 || normalized.month > 12)) {
    return fieldInvalid("localDateContext.month is out of range");
  }
  if (normalized.day !== undefined && (normalized.day < 1 || normalized.day > 31)) {
    return fieldInvalid("localDateContext.day is out of range");
  }
  if (
    normalized.dayOfWeek !== undefined
    && (normalized.dayOfWeek < 0 || normalized.dayOfWeek > 6)
  ) {
    return fieldInvalid("localDateContext.dayOfWeek is out of range");
  }

  const isWeekend = ownValue(value, "isWeekend");
  if (isWeekend !== undefined) {
    if (typeof isWeekend !== "boolean") {
      return fieldInvalid("localDateContext.isWeekend must be a boolean");
    }
    normalized.isWeekend = isWeekend;
  }

  const timeOfDay = ownValue(value, "timeOfDay");
  if (timeOfDay !== undefined) {
    if (typeof timeOfDay !== "string" || !TIME_OF_DAY_VALUES.has(timeOfDay)) {
      return fieldInvalid("localDateContext.timeOfDay is not allowed");
    }
    normalized.timeOfDay = timeOfDay as ValidChatLocalDateContext["timeOfDay"];
  }
  return { ok: true, value: normalized };
}

/**
 * Parse decoded JSON and return only newly-built, trusted fields.
 * User-visible text is never trimmed, truncated, or deduplicated.
 */
export function parseChatRequestBody(
  value: unknown,
  runtime: ChatRequestParserRuntime,
): ChatRequestParseResult {
  try {
    if (!isPlainRecord(value)) return invalid("request body must be a plain object");

    const text = ownValue(value, "text");
    if (typeof text !== "string") return invalid("text must be a string");
    if (!text.trim()) return invalid("text must not be empty");
    if (text.length > MAX_CHAT_TEXT_LENGTH) return tooLarge("text exceeds its length limit");

    const parsedHistory = parseHistory(ownValue(value, "history"));
    if (!parsedHistory.ok) return parsedHistory;

    const rawNpcId = ownValue(value, "npcId");
    const npcId = rawNpcId === undefined ? "misaki" : rawNpcId;
    if (typeof npcId !== "string" || !runtime.isNpcId(npcId)) {
      return invalid("npcId is not allowed");
    }

    const rawUiLanguage = ownValue(value, "uiLanguage");
    if (
      rawUiLanguage !== undefined
      && rawUiLanguage !== "zh"
      && rawUiLanguage !== "en"
    ) {
      return invalid("uiLanguage is not allowed");
    }

    const rawActiveSceneId = ownValue(value, "activeSceneId");
    let activeSceneId: string | undefined;
    if (rawActiveSceneId !== undefined && rawActiveSceneId !== null) {
      if (typeof rawActiveSceneId !== "string") {
        return invalid("activeSceneId must be a string or null");
      }
      if (rawActiveSceneId.length > MAX_CHAT_SCENE_ID_LENGTH) {
        return tooLarge("activeSceneId exceeds its length limit");
      }
      const sceneNpcId = runtime.getSceneNpcId(rawActiveSceneId);
      if (!sceneNpcId || sceneNpcId !== npcId) {
        return invalid("activeSceneId is not valid for npcId");
      }
      activeSceneId = rawActiveSceneId;
    }

    const memories = parseOptionalStringArray(value, "memories");
    if (!memories.ok) return memories;
    const crossMentions = parseOptionalStringArray(value, "crossMentions");
    if (!crossMentions.ok) return crossMentions;

    const lifeArc = parseOptionalString(value, "lifeArc");
    if (!lifeArc.ok) return lifeArc;
    const lifeArcState = parseOptionalString(value, "lifeArcState");
    if (!lifeArcState.ok) return lifeArcState;
    const worldDescription = parseOptionalString(value, "worldDescription");
    if (!worldDescription.ok) return worldDescription;
    const worldReaction = parseOptionalString(value, "worldReaction");
    if (!worldReaction.ok) return worldReaction;

    const rawConversationCount = ownValue(value, "conversationCount");
    let conversationCount: number | undefined;
    if (rawConversationCount !== undefined) {
      if (
        typeof rawConversationCount !== "number"
        || !Number.isSafeInteger(rawConversationCount)
        || rawConversationCount < 0
      ) {
        return invalid("conversationCount must be a non-negative safe integer");
      }
      conversationCount = rawConversationCount;
    }

    const localDateContext = parseLocalDateContext(ownValue(value, "localDateContext"));
    if (!localDateContext.ok) return localDateContext;

    const rawDebugPromptOnly = ownValue(value, "debugPromptOnly");
    let debugPromptOnly: boolean | undefined;
    if (rawDebugPromptOnly !== undefined) {
      if (typeof rawDebugPromptOnly !== "boolean") {
        return invalid("debugPromptOnly must be a boolean");
      }
      debugPromptOnly = rawDebugPromptOnly;
    }

    return {
      ok: true,
      data: {
        text,
        npcId,
        history: parsedHistory.value,
        ...(memories.value !== undefined ? { memories: memories.value } : {}),
        ...(conversationCount !== undefined ? { conversationCount } : {}),
        ...(lifeArc.value !== undefined ? { lifeArc: lifeArc.value } : {}),
        ...(lifeArcState.value !== undefined ? { lifeArcState: lifeArcState.value } : {}),
        ...(crossMentions.value !== undefined ? { crossMentions: crossMentions.value } : {}),
        ...(worldDescription.value !== undefined
          ? { worldDescription: worldDescription.value }
          : {}),
        ...(worldReaction.value !== undefined ? { worldReaction: worldReaction.value } : {}),
        ...(localDateContext.value !== undefined
          ? { localDateContext: localDateContext.value }
          : {}),
        ...(activeSceneId !== undefined ? { activeSceneId } : {}),
        ...(rawUiLanguage !== undefined ? { uiLanguage: rawUiLanguage } : {}),
        ...(debugPromptOnly !== undefined ? { debugPromptOnly } : {}),
      },
    };
  } catch {
    // Defensive boundary for unusual accessors/proxies outside normal JSON parsing.
    return invalid("request body could not be safely inspected");
  }
}

/** Convert request.json() failures into the same safe invalid_request result. */
export async function parseChatRequestJson(
  request: JsonRequestLike,
  runtime: ChatRequestParserRuntime,
): Promise<ChatRequestParseResult> {
  try {
    return parseChatRequestBody(await request.json(), runtime);
  } catch {
    return invalid("request body is not valid JSON");
  }
}
