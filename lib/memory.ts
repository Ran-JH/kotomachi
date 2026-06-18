import { ALL_NPC_IDS, type NpcId } from "@/lib/npc";

const MAX_MEMORIES = 10;
const MIN_MEMORY_TEXT_LENGTH = 6;

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

function normalizeMemoryText(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[。．、，,！!？?：:；;（）()[\]「」『』"'`]/g, "");
}

function hasDurableSignal(text: string): boolean {
  return /(经常|平时|一直|总是|长期|最近主要|想重新|以后|希望你以后|想练|正在练|正在学习|想提升|想改善|更温柔一点|更直接一点|不太想被|通常|常常|老是|经常不知道|よく|いつも|普段|前から|ずっと|また始めたい|やり直したい|練習したい|勉強したい|上達したい|慣れたい|してほしい|やさしく|軽めに|自然に言いたい)/.test(
    text
  );
}

function isAssistantSuggestionStyle(text: string): boolean {
  return /(おすすめ|オススメ|〜するといい|するといい|してみるといい|〜してみて|試してみて|可以试试|建议你|你可以|不如|推荐你)/.test(
    text
  );
}

function isSensitiveOrBoundaryBreaking(text: string): boolean {
  return /(体重|减肥|減量|身材|容貌|住所|地址|電話|手机号|银行卡|口座|身份证|身份證|病気|诊断|診断|药|薬|医者|医院|病院|抑郁|うつ|自杀|自傷|恋人|恋愛|喜欢我|愛して|寂しい|离不开|離れられない|只属于|僕だけ|私だけ)/.test(
    text
  );
}

function isLikelyTemporaryTopic(text: string): boolean {
  const temporarySignal =
    /(今天|今日|きょう|今天想|今想|现在|現在|今は|さっき|刚刚|剛剛|这次|今回|本轮|雨ですね|疲れています|疲れた|累了|眠い|お腹すいた|想吃|食べたい|にします|にしよう|探している|探してます|加热|加熱|温かいもの|热的食物|熱いもの|今ちょっと|今日は雨)/;
  const foodOrShoppingSignal =
    /(おでん|肉まん|から揚げ|芋けんぴ|热饮|熱飲|コーヒー|咖啡|飲み物|弁当|便当|零食|お菓子|スイーツ|ラーメン|パン|商品|買い物|コンビニ|加热后)/;

  return temporarySignal.test(text) || (foodOrShoppingSignal.test(text) && !hasDurableSignal(text));
}

function isNearDuplicateMemory(candidate: string, existingFacts: string[]): boolean {
  const normalizedCandidate = normalizeMemoryText(candidate);
  const candidateIsFoodTopic =
    /(おでん|肉まん|から揚げ|芋けんぴ|热饮|熱飲|コーヒー|咖啡|飲み物|弁当|便当|零食|お菓子|スイーツ|ラーメン|パン)/.test(
      candidate
    );

  return existingFacts.some((fact) => {
    const normalizedFact = normalizeMemoryText(fact);
    if (!normalizedFact) return false;
    if (normalizedFact === normalizedCandidate) return true;
    if (
      normalizedFact.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedFact)
    ) {
      return true;
    }

    if (candidateIsFoodTopic) {
      const existingIsFoodTopic =
        /(おでん|肉まん|から揚げ|芋けんぴ|热饮|熱飲|コーヒー|咖啡|飲み物|弁当|便当|零食|お菓子|スイーツ|ラーメン|パン)/.test(
          fact
        );
      if (existingIsFoodTopic) return true;
    }

    return false;
  });
}

/**
 * Keep memory v0 conservative:
 * - reject empty/keyword-like fragments
 * - reject temporary one-off topics
 * - reject assistant-sounding suggestions
 * - reject duplicates and near-duplicates
 */
export function shouldKeepMemoryCandidate(
  candidate: string,
  existingFacts: string[] = []
): boolean {
  const trimmed = candidate.trim();
  const directFoodOrShoppingDesire =
    /(想吃|想喝|想买|买点|食べたい|飲みたい|買いたい|にします|にしよう|探している|探してます)/.test(
      trimmed
    ) &&
    /(おでん|肉まん|から揚げ|芋けんぴ|热饮|熱飲|コーヒー|咖啡|飲み物|弁当|便当|零食|お菓子|スイーツ|ラーメン|パン|商品|買い物|コンビニ|加热|加熱|温かいもの)/.test(
      trimmed
    );

  if (!trimmed) return false;
  if (directFoodOrShoppingDesire) return false;
  if (isAssistantSuggestionStyle(trimmed)) return false;
  if (isSensitiveOrBoundaryBreaking(trimmed)) return false;
  if (isLikelyTemporaryTopic(trimmed) && !hasDurableSignal(trimmed)) return false;

  const visibleLength = trimmed.replace(/[\s。．、，,！!？?：:；;（）()[\]「」『』"'`]/g, "").length;
  if (visibleLength < MIN_MEMORY_TEXT_LENGTH && !hasDurableSignal(trimmed)) {
    return false;
  }

  if (isNearDuplicateMemory(trimmed, existingFacts)) return false;
  return true;
}

/**
 * Merge future memory candidates without auto-cleaning old user data.
 * Existing facts are preserved as the baseline; only new candidates are filtered.
 */
export function mergeMemoryCandidates(
  existingFacts: string[],
  candidates: string[]
): string[] {
  const merged = sanitizeNpcMemories(existingFacts);

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!shouldKeepMemoryCandidate(trimmed, merged)) continue;
    merged.push(trimmed);

    if (merged.length >= MAX_MEMORIES) {
      return merged.slice(-MAX_MEMORIES);
    }
  }

  return merged;
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

  const current = getLocalNPCMemories(npcId);
  const trimmedFact = fact.trim();
  if (!shouldKeepMemoryCandidate(trimmedFact, current)) return;

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
