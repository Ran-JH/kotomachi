const MAX_MEMORIES = 10;

/** 一次性迁移：将 komorebi_* 旧 key 的数据搬到 kotomachi_* */
const MIGRATION_DONE_KEY = "kotomachi_migration_done";
const NPC_IDS = ["kimura", "misaki", "taisho"];
const KEY_SUFFIXES = ["facts", "last_time", "history", "count"];

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("[memory] localStorage write failed", {
      key,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn("[memory] localStorage cleanup failed", {
      key,
      reason: error instanceof Error ? error.name : "unknown",
    });
  }
}

function migrateOldKeys(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_DONE_KEY)) return;

  let migrationCompleted = true;

  for (const npcId of NPC_IDS) {
    for (const suffix of KEY_SUFFIXES) {
      const oldKey = `komorebi_${suffix}_${npcId}`;
      const newKey = `kotomachi_${suffix}_${npcId}`;
      const value = localStorage.getItem(oldKey);
      if (value !== null) {
        if (safeSetItem(newKey, value)) {
          safeRemoveItem(oldKey);
        } else {
          migrationCompleted = false;
        }
      }
    }
  }
  if (migrationCompleted) {
    safeSetItem(MIGRATION_DONE_KEY, "1");
  }
}

// 模块加载时自动执行迁移
if (typeof window !== "undefined") migrateOldKeys();

export function getLocalNPCMemories(npcId: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`kotomachi_facts_${npcId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_MEMORIES) : [];
  } catch {
    return [];
  }
}

export function saveLocalNPCMemory(npcId: string, fact: string): void {
  if (typeof window === "undefined" || !fact.trim()) return;
  const current = getLocalNPCMemories(npcId);
  if (current.includes(fact)) return;
  const next = [...current, fact].slice(-MAX_MEMORIES);
  safeSetItem(`kotomachi_facts_${npcId}`, JSON.stringify(next));
}

/** 批量覆盖事实数组（由 welcome API 返回的合并结果直接写入） */
export function saveLocalNPCFacts(npcId: string, facts: string[]): void {
  if (typeof window === "undefined") return;
  safeSetItem(
    `kotomachi_facts_${npcId}`,
    JSON.stringify(facts.slice(0, MAX_MEMORIES))
  );
}

/** 读取该 NPC 最后一次聊天的时间戳（毫秒），无记录返回 null */
export function getLastChatTime(npcId: string): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`kotomachi_last_time_${npcId}`);
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

/** 将当前时间戳写入，标记"最后一次聊天" */
export function saveLastChatTime(npcId: string): void {
  if (typeof window === "undefined") return;
  safeSetItem(`kotomachi_last_time_${npcId}`, String(Date.now()));
}

export function getChatHistoryKey(npcId: string): string {
  return `kotomachi_history_${npcId}`;
}

export interface StoredMessage {
  role: "user" | "assistant";
  content: string;
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
  safeSetItem(getChatHistoryKey(npcId), JSON.stringify(trimmed));
}

/** 读取与某 NPC 的对话次数（轻量熟悉度指标） */
export function getConversationCount(npcId: string): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(`kotomachi_count_${npcId}`);
  if (!raw) return 0;
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
}

/** 对话次数 +1（每次用户发消息时调用） */
export function incrementConversationCount(npcId: string): void {
  if (typeof window === "undefined") return;
  const current = getConversationCount(npcId);
  safeSetItem(`kotomachi_count_${npcId}`, String(current + 1));
}
