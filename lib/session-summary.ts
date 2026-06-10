import type { NpcId } from "@/lib/npc";

export type ExpressionHintStyle = "casual" | "normal" | "formal";
export type ExpressionUpgradeSource =
  | "non_japanese_span"
  | "expression_hint"
  | "model_selected";
export type ReviewWordSource = "looked_up" | "conversation";

export interface RecentLookup {
  schemaVersion: 1;
  id: string;
  npcId: NpcId;
  word: string;
  originalSelection?: string;
  wasCorrected?: boolean;
  reading?: string;
  meaning?: string;
  sourceSentence?: string;
  messageId?: string;
  createdAt: string;
}

export interface ExpressionHintRecord {
  schemaVersion: 1;
  id: string;
  userMessageId: string;
  npcId: NpcId;
  originalText: string;
  suggestions: Partial<Record<ExpressionHintStyle, string>>;
  openedAt: string;
  playedStyles: ExpressionHintStyle[];
}

export interface SummaryNonJapaneseSpan {
  id: string;
  messageId: string;
  originalMessage: string;
  span: string;
  languageGuess: "en" | "zh" | "mixed" | "unknown";
  confidence: "high" | "medium" | "low";
}

export interface ReusableExpression {
  expression: string;
  note: string;
}

export interface ExpressionUpgrade {
  original: string;
  suggestion: string;
  note: string;
  source: ExpressionUpgradeSource;
}

export interface ReviewWord {
  word: string;
  reading?: string;
  meaning: string;
  example?: string;
  source: ReviewWordSource;
}

export interface SessionSummaryCard {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  npcId: NpcId;
  sourceMessageIds: string[];
  fromMessageId?: string;
  toMessageId?: string;
  sourceFingerprint: string;
  sourceUserMessageCount: number;
  title: string;
  topicSummary: string;
  reusableExpressions: ReusableExpression[];
  expressionUpgrades: ExpressionUpgrade[];
  reviewWords: ReviewWord[];
  nextTalkPrompt: string;
}

export interface SessionSummaryMessage {
  role: "user" | "assistant";
  content: string;
  id?: string;
  createdAt?: string;
}

export interface SessionSummaryRequest {
  schemaVersion: 1;
  npcId: NpcId;
  messages: SessionSummaryMessage[];
  recentLookups?: RecentLookup[];
  recentExpressionHints?: ExpressionHintRecord[];
  nonJapaneseSpans?: SummaryNonJapaneseSpan[];
}

export interface SessionSummaryApiCard {
  title: string;
  topicSummary: string;
  reusableExpressions: ReusableExpression[];
  expressionUpgrades: ExpressionUpgrade[];
  reviewWords: ReviewWord[];
  nextTalkPrompt: string;
}

export interface SummarySourceInfo {
  sourceMessageIds: string[];
  fromMessageId?: string;
  toMessageId?: string;
  sourceFingerprint: string;
  sourceUserMessageCount: number;
}

const SUMMARY_CARDS_KEY = "kotomachi.summaryCards.v1";
const WORD_LOOKUPS_KEY = "kotomachi.wordLookups.v1";
const EXPRESSION_HINTS_KEY = "kotomachi.expressionHints.v1";

const MAX_SUMMARY_CARDS = 50;
const MAX_LOOKUP_HISTORY = 100;
const MAX_HINT_HISTORY = 100;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function warnStorageFailure(action: string, key: string, error: unknown): void {
  console.warn("[session-summary] localStorage operation failed", {
    action,
    key,
    reason: error instanceof Error ? error.name : "unknown",
  });
}

function loadList<T>(key: string): T[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch (error) {
    warnStorageFailure("read", key, error);
    return [];
  }
}

function saveList<T>(key: string, value: T[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    warnStorageFailure("write", key, error);
  }
}

function trimText(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}…` : trimmed;
}

const SAFE_HINT_LATIN_WORDS = new Set([
  "LINE",
  "SNS",
  "AI",
  "CAFE",
  "JAPAN",
  "TOKYO",
  "OSAKA",
  "APP",
  "WEB",
  "MAIL",
  "NET",
  "PC",
  "TV",
  "CD",
  "DVD",
  "OK",
  "NG",
]);

function isJapaneseCharacterCode(code: number): boolean {
  return (
    (code >= 0x3040 && code <= 0x30ff) ||
    (code >= 0x4e00 && code <= 0x9fff)
  );
}

function isLatinCharacterCode(code: number): boolean {
  return (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a);
}

function extractLatinWords(value: string): string[] {
  const words: string[] = [];
  let current = "";

  for (const char of value) {
    if (isLatinCharacterCode(char.charCodeAt(0))) {
      current += char;
      continue;
    }

    if (current) {
      words.push(current);
      current = "";
    }
  }

  if (current) {
    words.push(current);
  }

  return words;
}

function isDecorativeEmojiCodePoint(code: number): boolean {
  return (
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x2600 && code <= 0x27bf)
  );
}

function hasExpressionDecoration(value: string): boolean {
  if (
    value.includes("（笑）") ||
    value.includes("(笑)") ||
    value.includes("www") ||
    value.includes("ｗｗｗ")
  ) {
    return true;
  }

  if (/[＊*_`#>\[\]［］]/.test(value)) {
    return true;
  }

  if ((value.includes("(") || value.includes("（")) && /[\^_・ω´｀;；:：=~\-]/.test(value)) {
    return true;
  }

  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined) continue;
    if (isDecorativeEmojiCodePoint(code)) return true;
  }

  return false;
}

export function isValidExpressionHintText(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  let hasJapanese = false;
  for (const char of trimmed) {
    if (isJapaneseCharacterCode(char.charCodeAt(0))) {
      hasJapanese = true;
      break;
    }
  }
  if (!hasJapanese) return false;
  if (hasExpressionDecoration(trimmed)) return false;

  const latinWords = extractLatinWords(trimmed);
  if (latinWords.length === 0) return true;
  return latinWords.every((word) => SAFE_HINT_LATIN_WORDS.has(word.toUpperCase()));
}

export function isValidExpressionHintRecord(record: ExpressionHintRecord): boolean {
  const suggestions = [
    record.suggestions.casual,
    record.suggestions.normal,
    record.suggestions.formal,
  ].filter((value): value is string => Boolean(value?.trim()));

  return suggestions.length > 0 && suggestions.every((value) => isValidExpressionHintText(value));
}

function byCreatedDesc(a: { createdAt?: string }, b: { createdAt?: string }): number {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
}

function byOpenedDesc(a: { openedAt?: string }, b: { openedAt?: string }): number {
  return new Date(b.openedAt ?? 0).getTime() - new Date(a.openedAt ?? 0).getTime();
}

function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function createSummaryId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createSummarySourceInfo(
  npcId: NpcId,
  messages: SessionSummaryMessage[],
): SummarySourceInfo {
  const sourceMessageIds = messages.map((message, index) => message.id ?? `${message.role}-${index}`);
  const sourceUserMessageCount = messages.filter((message) => message.role === "user").length;
  const fingerprintPayload = messages
    .map((message) => [message.role, message.content.trim()].join(":"))
    .join("|");

  return {
    sourceMessageIds,
    fromMessageId: sourceMessageIds[0],
    toMessageId: sourceMessageIds[sourceMessageIds.length - 1],
    sourceFingerprint: `${npcId}:${hashString(fingerprintPayload)}`,
    sourceUserMessageCount,
  };
}

export function loadSummaryCards(npcId?: NpcId): SessionSummaryCard[] {
  const cards = loadList<SessionSummaryCard>(SUMMARY_CARDS_KEY);
  return cards
    .filter((card) => card?.schemaVersion === 1 && (!npcId || card.npcId === npcId))
    .sort(byCreatedDesc);
}

export function findSummaryCardByFingerprint(
  npcId: NpcId,
  sourceFingerprint: string,
): SessionSummaryCard | null {
  return (
    loadSummaryCards(npcId).find((card) => card.sourceFingerprint === sourceFingerprint) ?? null
  );
}

export function saveSummaryCard(card: SessionSummaryCard): SessionSummaryCard[] {
  const cards = loadList<SessionSummaryCard>(SUMMARY_CARDS_KEY);
  const next = [
    card,
    ...cards.filter((item) => {
      if (item.id === card.id) return false;
      if (item.npcId === card.npcId && item.sourceFingerprint === card.sourceFingerprint) return false;
      return true;
    }),
  ].slice(0, MAX_SUMMARY_CARDS);
  saveList(SUMMARY_CARDS_KEY, next);
  return next;
}

export function deleteSummaryCard(cardId: string): SessionSummaryCard[] {
  const next = loadList<SessionSummaryCard>(SUMMARY_CARDS_KEY).filter((card) => card.id !== cardId);
  saveList(SUMMARY_CARDS_KEY, next);
  return next;
}

export function loadRecentLookups(npcId: NpcId, limit = 5): RecentLookup[] {
  return loadList<RecentLookup>(WORD_LOOKUPS_KEY)
    .filter((lookup) => lookup?.schemaVersion === 1 && lookup.npcId === npcId)
    .sort(byCreatedDesc)
    .slice(0, limit);
}

export function saveLookupHistory(lookup: RecentLookup): void {
  const sanitized: RecentLookup = {
    schemaVersion: 1,
    id: lookup.id,
    npcId: lookup.npcId,
    word: trimText(lookup.word, 80) ?? lookup.word,
    originalSelection: trimText(lookup.originalSelection, 80),
    wasCorrected: lookup.wasCorrected,
    reading: trimText(lookup.reading, 80),
    meaning: trimText(lookup.meaning, 120),
    sourceSentence: trimText(lookup.sourceSentence, 220),
    messageId: lookup.messageId,
    createdAt: lookup.createdAt,
  };
  const history = loadList<RecentLookup>(WORD_LOOKUPS_KEY);
  const next = [sanitized, ...history.filter((item) => item.id !== sanitized.id)].slice(0, MAX_LOOKUP_HISTORY);
  saveList(WORD_LOOKUPS_KEY, next);
}

export function loadRecentExpressionHints(npcId: NpcId, limit = 5): ExpressionHintRecord[] {
  return loadList<ExpressionHintRecord>(EXPRESSION_HINTS_KEY)
    .filter((record) => record?.schemaVersion === 1 && record.npcId === npcId && isValidExpressionHintRecord(record))
    .sort(byOpenedDesc)
    .slice(0, limit);
}

export function saveExpressionHintRecord(record: ExpressionHintRecord): void {
  if (!isValidExpressionHintRecord(record)) return;
  const sanitized: ExpressionHintRecord = {
    schemaVersion: 1,
    id: record.id,
    userMessageId: record.userMessageId,
    npcId: record.npcId,
    originalText: trimText(record.originalText, 280) ?? record.originalText,
    suggestions: {
      casual: trimText(record.suggestions.casual, 220),
      normal: trimText(record.suggestions.normal, 220),
      formal: trimText(record.suggestions.formal, 220),
    },
    openedAt: record.openedAt,
    playedStyles: Array.from(new Set(record.playedStyles)),
  };
  const history = loadList<ExpressionHintRecord>(EXPRESSION_HINTS_KEY);
  const next = [sanitized, ...history.filter((item) => item.id !== sanitized.id)].slice(0, MAX_HINT_HISTORY);
  saveList(EXPRESSION_HINTS_KEY, next);
}

export function markExpressionHintPlayed(recordId: string, style: ExpressionHintStyle): void {
  const history = loadList<ExpressionHintRecord>(EXPRESSION_HINTS_KEY);
  const next = history.map((record) => {
    if (record.id !== recordId) return record;
    return {
      ...record,
      playedStyles: Array.from(new Set([...(record.playedStyles ?? []), style])),
    };
  });
  saveList(EXPRESSION_HINTS_KEY, next);
}
