"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  clearLocalNPCMemories,
  deleteLocalNPCMemory,
  getConversationCount,
  getLastChatTime,
  getLocalNPCMemories,
  loadChatHistory,
} from "@/lib/memory";
import { ALL_NPC_IDS, getNpcDisplayName, type NpcId } from "@/lib/npc";
import type { UiLanguage } from "@/lib/ui-language";

type MemoryCenterSnapshot = Record<NpcId, string[]>;

const MEMORY_CENTER_COPY = {
  zh: {
    title: "住民记住的事",
    subtitle:
      "每个住民会根据你们的聊天记住一些事，用来让下次对话更自然。你可以删除这些记忆。",
    countUnit: "条",
    expand: "查看",
    collapse: "收起",
    empty: "这个住民还没有记住什么。多聊几次后，这里会出现一些小记录。",
    fromChat: "来自聊天",
    delete: "删除",
    clear: "清空这个住民的记忆",
    clearConfirm: "要清空这个住民记住的所有事情吗？聊天记录不会被删除。",
  },
  en: {
    title: "Resident memories",
    subtitle:
      "Each resident remembers a few things from your chats to make the next conversation feel more natural. You can delete these memories.",
    countUnit: "items",
    expand: "View",
    collapse: "Hide",
    empty: "This resident has not remembered anything yet. After a few more chats, a few notes will appear here.",
    fromChat: "From your chats",
    delete: "Delete",
    clear: "Clear this resident's memories",
    clearConfirm: "Clear everything this resident remembers? Your chat history will not be deleted.",
  },
} as const;

function createEmptySnapshot(): MemoryCenterSnapshot {
  return ALL_NPC_IDS.reduce((snapshot, npcId) => {
    snapshot[npcId] = [];
    return snapshot;
  }, {} as MemoryCenterSnapshot);
}

function hasDiscoveredSaku(): boolean {
  const memories = getLocalNPCMemories("saku");
  if (memories.length > 0) return true;

  const history = loadChatHistory("saku");
  if (history.length > 0) return true;

  const lastChatTime = getLastChatTime("saku");
  if (typeof lastChatTime === "number" && lastChatTime > 0) return true;

  return getConversationCount("saku") > 0;
}

type NpcMemoryCenterProps = {
  uiLanguage?: UiLanguage;
};

export function NpcMemoryCenter({ uiLanguage = "zh" }: NpcMemoryCenterProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [memoryMap, setMemoryMap] = useState<MemoryCenterSnapshot>(createEmptySnapshot);
  const [expandedNpcId, setExpandedNpcId] = useState<NpcId | null>(null);
  const [showSaku, setShowSaku] = useState(false);

  const copy = MEMORY_CENTER_COPY[uiLanguage];

  const loadMemoryState = useCallback(() => {
    const nextSnapshot = createEmptySnapshot();

    for (const npcId of ALL_NPC_IDS) {
      nextSnapshot[npcId] = getLocalNPCMemories(npcId);
    }

    setMemoryMap(nextSnapshot);
    setShowSaku(hasDiscoveredSaku());
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadMemoryState();
  }, [loadMemoryState]);

  useEffect(() => {
    if (!isMounted) return;

    const handleStorage = () => loadMemoryState();
    const handleFocus = () => loadMemoryState();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isMounted, loadMemoryState]);

  const visibleNpcIds = useMemo(
    () => ALL_NPC_IDS.filter((npcId) => npcId !== "saku" || showSaku),
    [showSaku]
  );

  useEffect(() => {
    if (!expandedNpcId) return;
    if (!visibleNpcIds.includes(expandedNpcId)) {
      setExpandedNpcId(null);
    }
  }, [expandedNpcId, visibleNpcIds]);

  const handleDelete = (npcId: NpcId, index: number) => {
    const nextMemories = deleteLocalNPCMemory(npcId, index);
    setMemoryMap((current) => ({
      ...current,
      [npcId]: nextMemories,
    }));
  };

  const handleClear = (npcId: NpcId) => {
    const confirmed = window.confirm(copy.clearConfirm);
    if (!confirmed) return;

    clearLocalNPCMemories(npcId);
    setMemoryMap((current) => ({
      ...current,
      [npcId]: [],
    }));

    if (npcId === "saku" && !hasDiscoveredSaku()) {
      setShowSaku(false);
      setExpandedNpcId((current) => (current === "saku" ? null : current));
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <div className="rounded-[24px] border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] p-5 shadow-[0_16px_48px_rgba(61,44,24,0.06)] md:p-6">
        <div className="max-w-2xl">
          <h1 className="text-[24px] font-semibold tracking-[0.04em] text-[#28231A]">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm leading-7 text-[#6B6254]">{copy.subtitle}</p>
        </div>

        <div className="mt-6 space-y-3">
          {visibleNpcIds.map((npcId) => {
            const memories = memoryMap[npcId] ?? [];
            const isExpanded = expandedNpcId === npcId;
            const npcName = getNpcDisplayName(npcId);

            return (
              <section
                key={npcId}
                className="overflow-hidden rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FFFDF7]"
              >
                <button
                  type="button"
                  onClick={() =>
                    setExpandedNpcId((current) => (current === npcId ? null : npcId))
                  }
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-[#F6F0E3]"
                >
                  <div className="min-w-0">
                    <p className="text-[15px] font-medium text-[#28231A]">{npcName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-medium text-[#6B6254]">
                      {memories.length} {copy.countUnit}
                    </p>
                    <p className="mt-1 text-[11px] text-[#9A9080]">
                      {isExpanded ? copy.collapse : copy.expand}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[rgba(40,35,26,0.06)] bg-[#FAF6EE]/70 px-4 py-4">
                    {memories.length === 0 ? (
                      <div className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#F6F0E3]/75 px-4 py-4">
                        <p className="text-[13px] leading-7 text-[#6B6254]">{copy.empty}</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {memories.map((memory, index) => (
                          <article
                            key={`${npcId}-${index}-${memory}`}
                            className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FFFDF7] px-4 py-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] text-[#7A7060]">{copy.fromChat}</p>
                                <p className="mt-1 text-[14px] leading-7 text-[#28231A] break-words">
                                  {memory}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleDelete(npcId, index)}
                                className="shrink-0 rounded-lg border border-[rgba(154,85,85,0.12)] bg-[#FCF6F4] px-3 py-1.5 text-[12px] text-[#9A5555] transition-colors hover:bg-[#F6E7E2]"
                              >
                                {copy.delete}
                              </button>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleClear(npcId)}
                        disabled={memories.length === 0}
                        className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3.5 py-2 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {copy.clear}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
