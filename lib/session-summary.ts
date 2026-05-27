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

function byCreatedDesc(a: { createdAt?: string }, b: { createdAt?: string }): number {
  return new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime();
}

function byOpenedDesc(a: { openedAt?: string }, b: { openedAt?: string }): number {
  return new Date(b.openedAt ?? 0).getTime() - new Date(a.openedAt ?? 0).getTime();
}

export function createSummaryId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadSummaryCards(npcId?: NpcId): SessionSummaryCard[] {
  const cards = loadList<SessionSummaryCard>(SUMMARY_CARDS_KEY);
  return cards
    .filter((card) => card?.schemaVersion === 1 && (!npcId || card.npcId === npcId))
    .sort(byCreatedDesc);
}

export function saveSummaryCard(card: SessionSummaryCard): SessionSummaryCard[] {
  const cards = loadList<SessionSummaryCard>(SUMMARY_CARDS_KEY);
  const next = [card, ...cards.filter((item) => item.id !== card.id)].slice(0, MAX_SUMMARY_CARDS);
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
    .filter((record) => record?.schemaVersion === 1 && record.npcId === npcId)
    .sort(byOpenedDesc)
    .slice(0, limit);
}

export function saveExpressionHintRecord(record: ExpressionHintRecord): void {
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
