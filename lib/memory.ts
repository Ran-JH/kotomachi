import { ALL_NPC_IDS, type NpcId } from "@/lib/npc";

const MAX_MEMORIES = 10;

// One-time migration from the old komorebi_* storage keys to kotomachi_*.
const MIGRATION_DONE_KEY = "kotomachi_migration_done";
const KEY_SUFFIXES = ["facts", "last_time", "history", "count"] as const;

/**
 * Normalize stored NPC memories:
 * - keep strings only
 * - trim whitespace
 * - drop empty strings
 * - preserve the max-10 rule
 */
function sanitizeNpcMemories(facts: string[]): string[] {
  return facts
    .filter((fact): fact is string => typeof fact === "string")
    .map((fact) => fact.trim())
    .filter(Boolean)
    .slice(0, MAX_MEMORIES);
}

function migrateOldKeys(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  for (const npcId of ALL_NPC_IDS) {
    for (const suffix of KEY_SUFFIXES) {
      const oldKey = `komorebi_${suffix}_${npcId}`;
      const newKey = `kotomachi_${suffix}_${npcId}`;
      const value = localStorage.getItem(oldKey);

      if (value !== null) {
        localStorage.setItem(newKey, value);
        localStorage.removeItem(oldKey);
      }
    }
  }

  localStorage.setItem(MIGRATION_DONE_KEY, "1");
}

// Run the legacy key migration on module load in the browser.
if (typeof window !== "undefined") migrateOldKeys();

export function getLocalNPCMemories(npcId: string): string[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(`kotomachi_facts_${npcId}`);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizeNpcMemories(parsed) : [];
  } catch {
    return [];
  }
}

export function saveLocalNPCMemory(npcId: string, fact: string): void {
  if (typeof window === "undefined") return;

  const trimmedFact = fact.trim();
  if (!trimmedFact) return;

  const current = getLocalNPCMemories(npcId);
  if (current.includes(trimmedFact)) return;

  // Keep the existing behavior: append the newest fact, then trim to the latest 10.
  const next = sanitizeNpcMemories([...current, trimmedFact]).slice(-MAX_MEMORIES);
  localStorage.setItem(`kotomachi_facts_${npcId}`, JSON.stringify(next));
}

/**
 * Replace the current facts array for one NPC.
 * This is the shared write helper used by welcome merge and memory deletion.
 */
export function saveLocalNPCFacts(npcId: NpcId | string, facts: string[]): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    `kotomachi_facts_${npcId}`,
    JSON.stringify(sanitizeNpcMemories(facts))
  );
}

/**
 * Delete a single saved memory for one NPC.
 * This only touches facts, not history/count/last_time/saved items.
 */
export function deleteLocalNPCMemory(npcId: NpcId, index: number): string[] {
  if (typeof window === "undefined") return [];

  const current = getLocalNPCMemories(npcId);
  if (!Number.isInteger(index) || index < 0 || index >= current.length) {
    return current;
  }

  const next = current.filter((_, currentIndex) => currentIndex !== index);
  saveLocalNPCFacts(npcId, next);
  return next;
}

/**
 * Clear only the saved memories/facts for one NPC.
 * This is different from resetting the whole chat.
 */
export function clearLocalNPCMemories(npcId: NpcId): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`kotomachi_facts_${npcId}`);
}

/** Read the last chat timestamp in milliseconds for this NPC. */
export function getLastChatTime(npcId: string): number | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem(`kotomachi_last_time_${npcId}`);
  if (!raw) return null;

  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/** Save the current time as the last chat timestamp for this NPC. */
export function saveLastChatTime(npcId: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`kotomachi_last_time_${npcId}`, String(Date.now()));
}

export function getChatHistoryKey(npcId: string): string {
  return `kotomachi_history_${npcId}`;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
  /** ISO timestamp. Older LocalStorage records may not have this field. */
  createdAt?: string;
  /** Optional marker for system-generated messages such as welcomes. */
  source?: string;
}

export function loadChatHistory(npcId: string): StoredMessage[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(getChatHistoryKey(npcId));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveChatHistory(npcId: string, history: StoredMessage[]): void {
  if (typeof window === "undefined") return;

  const trimmed = history.slice(-20);
  localStorage.setItem(getChatHistoryKey(npcId), JSON.stringify(trimmed));
}

/** Read the lightweight conversation count for this NPC. */
export function getConversationCount(npcId: string): number {
  if (typeof window === "undefined") return 0;

  const raw = localStorage.getItem(`kotomachi_count_${npcId}`);
  if (!raw) return 0;

  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

/** Increase the conversation count by one after a user message. */
export function incrementConversationCount(npcId: string): void {
  if (typeof window === "undefined") return;

  const current = getConversationCount(npcId);
  localStorage.setItem(`kotomachi_count_${npcId}`, String(current + 1));
}

/**
 * Clear the full chat state for one NPC.
 * This keeps the previous reset behavior intact.
 */
export function clearNpcChatData(npcId: string): void {
  if (typeof window === "undefined") return;

  localStorage.removeItem(`kotomachi_history_${npcId}`);
  clearLocalNPCMemories(npcId as NpcId);
  localStorage.removeItem(`kotomachi_last_time_${npcId}`);
  localStorage.removeItem(`kotomachi_revisit_welcome_marker_${npcId}`);

  try {
    sessionStorage.removeItem(`kotomachi_session_visit_${npcId}`);
  } catch {
    // Ignore sessionStorage errors so reset does not break the chat flow.
  }
}
