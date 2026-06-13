import type { NpcId } from "./npc";

const STORAGE_KEY = "kotomachi_saved_items_v1";
export const SAVED_ITEMS_UPDATED_EVENT = "kotomachi:saved-items-updated";
const MAX_ITEMS = 200;

export interface SavedSummaryCard {
  id: string;
  type: "summary_card";
  npcId: NpcId;
  title: string;
  createdAt: string;
  sourceMessageIds?: string[];
  sourceFingerprint?: string;
  summaryCardId: string;
  tags?: string[];
  favorite: true;
}

export interface SavedExpression {
  id: string;
  type: "expression";
  npcId: NpcId;
  original: string;
  suggestion: string;
  level: "casual" | "neutral" | "polite" | "summary_upgrade";
  note?: string;
  source: "feedback" | "summary_card";
  sourceMessageId?: string;
  summaryCardId?: string;
  createdAt: string;
  uiLanguageAtSave?: "zh" | "en";
}

export interface SavedWord {
  id: string;
  type: "word";
  npcId: NpcId;
  word: string;
  reading: string;
  meaning: string;
  meaningLanguage: "zh" | "en";
  example?: string;
  sentenceMeaning?: string;
  nuanceExplanation?: string;
  source: "lookup" | "summary_card";
  sourceMessageId?: string;
  summaryCardId?: string;
  createdAt: string;
}

export type SavedItem = SavedSummaryCard | SavedExpression | SavedWord;

function normalize(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

function dedupeKey(item: SavedItem): string {
  switch (item.type) {
    case "summary_card":
      return `sc:${item.summaryCardId ?? ""}:${item.sourceFingerprint ?? ""}`;
    case "expression":
      return `ex:${normalize(item.suggestion)}:${item.npcId}`;
    case "word":
      return `wd:${normalize(item.word)}:${normalize(item.reading)}`;
  }
}

function isDuplicate(items: SavedItem[], incoming: SavedItem): boolean {
  const key = dedupeKey(incoming);
  return items.some((existing) => dedupeKey(existing) === key);
}

function enforceLimit(items: SavedItem[]): SavedItem[] {
  if (items.length <= MAX_ITEMS) return items;
  return items
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, MAX_ITEMS);
}

export function loadSavedItems(): SavedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSavedItems(items: SavedItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event(SAVED_ITEMS_UPDATED_EVENT));
  } catch {
    // quota exceeded or other storage error — silently fail
  }
}

export function addSavedItem(item: SavedItem): SavedItem[] {
  const items = loadSavedItems();
  if (isDuplicate(items, item)) return items;
  const next = enforceLimit([...items, item]);
  saveSavedItems(next);
  return next;
}

export function removeSavedItem(id: string): SavedItem[] {
  const items = loadSavedItems().filter((i) => i.id !== id);
  saveSavedItems(items);
  return items;
}

export function findSavedItem(id: string): SavedItem | undefined {
  return loadSavedItems().find((i) => i.id === id);
}

export function isWordSaved(word: string, reading: string): boolean {
  const items = loadSavedItems();
  const key = `wd:${normalize(word)}:${normalize(reading)}`;
  return items.some((i) => i.type === "word" && dedupeKey(i) === key);
}

export function isExpressionSaved(suggestion: string, npcId: NpcId): boolean {
  const items = loadSavedItems();
  const key = `ex:${normalize(suggestion)}:${npcId}`;
  return items.some((i) => i.type === "expression" && dedupeKey(i) === key);
}

export function toggleSavedItem(item: SavedItem): { items: SavedItem[]; saved: boolean } {
  const items = loadSavedItems();
  if (isDuplicate(items, item)) {
    const existing = items.find((i) => dedupeKey(i) === dedupeKey(item));
    const next = items.filter((i) => i.id !== existing?.id);
    saveSavedItems(next);
    return { items: next, saved: false };
  }
  const next = enforceLimit([...items, item]);
  saveSavedItems(next);
  return { items: next, saved: true };
}
