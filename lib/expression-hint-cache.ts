import type { FeedbackLevelKey, RevisionNote } from "./feedback-types";

const CACHE_VERSION = "v2";
const STORAGE_KEY = `kotomachi_feedback_cache_${CACHE_VERSION}`;
const MAX_CACHE_ENTRIES = 50;

interface CachedFeedbackLevel {
  nativeSay: string;
  analysis: string;
  revisionNotes?: RevisionNote[];
}

export interface CachedFeedback {
  v: typeof CACHE_VERSION;
  casual: CachedFeedbackLevel;
  business: CachedFeedbackLevel;
  formal: CachedFeedbackLevel;
}

function cacheKey(
  npcId: string,
  messageId: string,
  textFingerprint: string,
  uiLanguage: "zh" | "en",
): string {
  return `${npcId}:${messageId}:${textFingerprint}:${uiLanguage}`;
}

function textFingerprint(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ").toLowerCase();
  if (normalized.length <= 40) return normalized;
  return normalized.slice(0, 20) + normalized.slice(-20);
}

function loadCache(): Record<string, CachedFeedback> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const filtered: Record<string, CachedFeedback> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "object" && v !== null && (v as CachedFeedback).v === CACHE_VERSION) {
        filtered[k] = v as CachedFeedback;
      }
    }
    return filtered;
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CachedFeedback>): void {
  if (typeof window === "undefined") return;
  try {
    const keys = Object.keys(cache);
    if (keys.length > MAX_CACHE_ENTRIES) {
      const sorted = keys.sort();
      const toRemove = sorted.slice(0, keys.length - MAX_CACHE_ENTRIES);
      for (const k of toRemove) delete cache[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // silently fail
  }
}

export function isValidCachedFeedback(c: CachedFeedback | null): boolean {
  if (!c) return false;
  if (c.v !== CACHE_VERSION) return false;
  const keys: FeedbackLevelKey[] = ["casual", "business", "formal"];
  return keys.every((k) => c[k]?.nativeSay?.trim().length > 0);
}

export function getCachedFeedback(
  npcId: string,
  messageId: string,
  userText: string,
  uiLanguage: "zh" | "en",
): CachedFeedback | null {
  const cache = loadCache();
  const key = cacheKey(npcId, messageId, textFingerprint(userText), uiLanguage);
  const entry = cache[key] ?? null;
  if (!isValidCachedFeedback(entry)) return null;
  return entry;
}

export function setCachedFeedback(
  npcId: string,
  messageId: string,
  userText: string,
  uiLanguage: "zh" | "en",
  feedback: CachedFeedback,
): void {
  if (!isValidCachedFeedback(feedback)) return;
  const cache = loadCache();
  const key = cacheKey(npcId, messageId, textFingerprint(userText), uiLanguage);
  cache[key] = feedback;
  saveCache(cache);
}

export function removeCachedFeedback(
  npcId: string,
  messageId: string,
  userText: string,
  uiLanguage: "zh" | "en",
): void {
  const cache = loadCache();
  const key = cacheKey(npcId, messageId, textFingerprint(userText), uiLanguage);
  delete cache[key];
  saveCache(cache);
}

export function toCachedFeedback(f: {
  casual: { nativeSay: string; analysis: string; revisionNotes?: RevisionNote[] };
  business: { nativeSay: string; analysis: string; revisionNotes?: RevisionNote[] };
  formal: { nativeSay: string; analysis: string; revisionNotes?: RevisionNote[] };
}): CachedFeedback {
  return {
    v: CACHE_VERSION,
    casual: { nativeSay: f.casual.nativeSay, analysis: f.casual.analysis, ...(f.casual.revisionNotes ? { revisionNotes: f.casual.revisionNotes } : {}) },
    business: { nativeSay: f.business.nativeSay, analysis: f.business.analysis, ...(f.business.revisionNotes ? { revisionNotes: f.business.revisionNotes } : {}) },
    formal: { nativeSay: f.formal.nativeSay, analysis: f.formal.analysis, ...(f.formal.revisionNotes ? { revisionNotes: f.formal.revisionNotes } : {}) },
  };
}

export function fromCachedFeedback(c: CachedFeedback): Record<FeedbackLevelKey, { nativeSay: string; analysis: string; revisionNotes?: RevisionNote[] }> {
  return {
    casual: { nativeSay: c.casual.nativeSay, analysis: c.casual.analysis, ...(c.casual.revisionNotes ? { revisionNotes: c.casual.revisionNotes } : {}) },
    business: { nativeSay: c.business.nativeSay, analysis: c.business.analysis, ...(c.business.revisionNotes ? { revisionNotes: c.business.revisionNotes } : {}) },
    formal: { nativeSay: c.formal.nativeSay, analysis: c.formal.analysis, ...(c.formal.revisionNotes ? { revisionNotes: c.formal.revisionNotes } : {}) },
  };
}
