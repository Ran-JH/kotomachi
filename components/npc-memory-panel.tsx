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

type PanelViewMode = "current" | "all";
type MemoryMap = Record<NpcId, string[]>;

const PANEL_COPY = {
  zh: {
    trigger: "\u8bb0\u4f4f\u7684\u4e8b",
    close: "\u5173\u95ed",
    currentTitle: "\u8fd9\u4e2a\u4f4f\u6c11\u8bb0\u4f4f\u7684\u4e8b",
    currentDescription:
      "\u4f1a\u6839\u636e\u4f60\u4eec\u7684\u804a\u5929\u8bb0\u4f4f\u4e00\u4e9b\u4e8b\uff0c\u7528\u6765\u8ba9\u4e0b\u6b21\u5bf9\u8bdd\u66f4\u81ea\u7136\u3002\u4f60\u53ef\u4ee5\u5220\u9664\u8fd9\u4e9b\u8bb0\u5fc6\u3002",
    allTitle: "\u6240\u6709\u5c45\u6c11\u8bb0\u4f4f\u7684\u4e8b",
    allDescription: "\u6309\u4f4f\u6c11\u67e5\u770b\u548c\u5220\u9664\u8bb0\u5fc6\u3002",
    backToCurrent: "\u8fd4\u56de",
    empty:
      "\u8fd9\u4e2a\u4f4f\u6c11\u8fd8\u6ca1\u6709\u8bb0\u4f4f\u4ec0\u4e48\u3002\u591a\u804a\u51e0\u6b21\u540e\uff0c\u8fd9\u91cc\u4f1a\u51fa\u73b0\u4e00\u4e9b\u5c0f\u8bb0\u5f55\u3002",
    fromChat: "\u6765\u81ea\u804a\u5929",
    delete: "\u5220\u9664",
    clearCurrent: "\u6e05\u7a7a\u8fd9\u4e2a\u4f4f\u6c11\u7684\u8bb0\u5fc6",
    clearResident: "\u6e05\u7a7a\u8fd9\u4e2a\u5c45\u6c11\u7684\u8bb0\u5fc6",
    clearConfirm:
      "\u8981\u6e05\u7a7a\u8fd9\u4e2a\u4f4f\u6c11\u8bb0\u4f4f\u7684\u6240\u6709\u4e8b\u60c5\u5417\uff1f\u804a\u5929\u8bb0\u5f55\u4e0d\u4f1a\u88ab\u5220\u9664\u3002",
    allMemories: "\u67e5\u770b\u6240\u6709\u5c45\u6c11\u7684\u8bb0\u5fc6",
    view: "\u67e5\u770b",
    hide: "\u6536\u8d77",
    countUnit: "\u6761",
  },
  en: {
    trigger: "Memories",
    close: "Close",
    currentTitle: "What this resident remembers",
    currentDescription:
      "This resident remembers a few things from your chats to make the next conversation feel more natural. You can delete these memories.",
    allTitle: "What all residents remember",
    allDescription: "View and delete memories by resident.",
    backToCurrent: "Back",
    empty:
      "This resident has not remembered anything yet. After a few more chats, a few small notes will appear here.",
    fromChat: "From your chats",
    delete: "Delete",
    clearCurrent: "Clear this resident's memories",
    clearResident: "Clear this resident's memories",
    clearConfirm:
      "Clear everything this resident remembers? Your chat history will not be deleted.",
    allMemories: "View all resident memories",
    view: "View",
    hide: "Hide",
    countUnit: "items",
  },
} as const;

function createEmptyMemoryMap(): MemoryMap {
  return ALL_NPC_IDS.reduce((snapshot, residentNpcId) => {
    snapshot[residentNpcId] = [];
    return snapshot;
  }, {} as MemoryMap);
}

function hasDiscoveredSaku(): boolean {
  if (getLocalNPCMemories("saku").length > 0) return true;
  if (loadChatHistory("saku").length > 0) return true;

  const lastChatTime = getLastChatTime("saku");
  if (typeof lastChatTime === "number" && lastChatTime > 0) return true;

  return getConversationCount("saku") > 0;
}

export type NpcMemoryPanelProps = {
  npcId: NpcId;
  npcName?: string;
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
  uiLanguage?: UiLanguage;
};

export function NpcMemoryPanel({
  npcId,
  npcName,
  onOpenChange,
  triggerClassName,
  uiLanguage = "zh",
}: NpcMemoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<PanelViewMode>("current");
  const [currentMemories, setCurrentMemories] = useState<string[]>([]);
  const [allMemories, setAllMemories] = useState<MemoryMap>(createEmptyMemoryMap);
  const [expandedResidentId, setExpandedResidentId] = useState<NpcId | null>(null);
  const [showSaku, setShowSaku] = useState(false);

  const copy = PANEL_COPY[uiLanguage];

  const loadCurrentMemories = useCallback(() => {
    setCurrentMemories(getLocalNPCMemories(npcId));
  }, [npcId]);

  const loadAllMemories = useCallback(() => {
    const nextMap = createEmptyMemoryMap();

    for (const residentNpcId of ALL_NPC_IDS) {
      nextMap[residentNpcId] = getLocalNPCMemories(residentNpcId);
    }

    setAllMemories(nextMap);
    setShowSaku(hasDiscoveredSaku());
  }, []);

  const loadPanelState = useCallback(() => {
    loadCurrentMemories();
    loadAllMemories();
  }, [loadAllMemories, loadCurrentMemories]);

  useEffect(() => {
    if (!isOpen) return;

    loadPanelState();

    const handleStorage = () => loadPanelState();
    const handleFocus = () => loadPanelState();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isOpen, loadPanelState]);

  const visibleNpcIds = useMemo(
    () => ALL_NPC_IDS.filter((residentNpcId) => residentNpcId !== "saku" || showSaku),
    [showSaku]
  );

  useEffect(() => {
    if (!expandedResidentId) return;
    if (!visibleNpcIds.includes(expandedResidentId)) {
      setExpandedResidentId(null);
    }
  }, [expandedResidentId, visibleNpcIds]);

  const openPanel = () => {
    loadPanelState();
    setViewMode("current");
    setExpandedResidentId(null);
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setViewMode("current");
    setExpandedResidentId(null);
    onOpenChange?.(false);
  };

  const handleDelete = (targetNpcId: NpcId, index: number) => {
    const next = deleteLocalNPCMemory(targetNpcId, index);

    if (targetNpcId === npcId) {
      setCurrentMemories(next);
    }

    setAllMemories((current) => ({
      ...current,
      [targetNpcId]: next,
    }));
  };

  const handleClear = (targetNpcId: NpcId) => {
    const confirmed = window.confirm(copy.clearConfirm);
    if (!confirmed) return;

    clearLocalNPCMemories(targetNpcId);

    if (targetNpcId === npcId) {
      setCurrentMemories([]);
    }

    setAllMemories((current) => ({
      ...current,
      [targetNpcId]: [],
    }));

    if (targetNpcId === "saku" && !hasDiscoveredSaku()) {
      setShowSaku(false);
      setExpandedResidentId((current) => (current === "saku" ? null : current));
    }
  };

  const currentDescription = npcName
    ? uiLanguage === "zh"
      ? `${npcName}${copy.currentDescription}`
      : `${npcName} remembers a few things from your chats to make the next conversation feel more natural. You can delete these memories.`
    : copy.currentDescription;

  const renderMemoryList = (
    targetNpcId: NpcId,
    memories: string[],
    clearLabel: string,
    showClearAction = true
  ) => {
    if (memories.length === 0) {
      return (
        <div className="mt-4 rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/65 px-4 py-4">
          <p className="text-[12px] leading-relaxed text-[#6B6254]">{copy.empty}</p>
        </div>
      );
    }

    return (
      <div className="mt-4">
        <div className="space-y-2.5">
          {memories.map((memory, index) => (
            <article
              key={`${targetNpcId}-${index}-${memory}`}
              className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FFFDF7] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-[#7A7060]">{copy.fromChat}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#28231A] break-words">
                    {memory}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(targetNpcId, index)}
                  className="shrink-0 rounded-lg border border-[rgba(154,85,85,0.12)] bg-[#FCF6F4] px-3 py-1.5 text-[11px] text-[#9A5555] transition-colors hover:bg-[#F6E7E2]"
                >
                  {copy.delete}
                </button>
              </div>
            </article>
          ))}
        </div>

        {showClearAction && (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => handleClear(targetNpcId)}
              disabled={memories.length === 0}
              className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3.5 py-2 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {clearLabel}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className={
          triggerClassName ??
          "shrink-0 inline-flex items-center rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-2.5 py-1.5 text-[11px] text-[#6B6254] hover:bg-[#E8E0CE] transition-colors"
        }
      >
        {copy.trigger}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[95] flex items-end md:items-center md:justify-center">
          <button
            type="button"
            aria-label={copy.close}
            className="absolute inset-0 bg-[#28231A]/25"
            onClick={closePanel}
          />
          <section className="relative w-full md:w-[min(34rem,92vw)] max-h-[78vh] overflow-y-auto rounded-t-2xl md:rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-4 md:px-5 md:py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                {viewMode === "all" && (
                  <button
                    type="button"
                    onClick={() => setViewMode("current")}
                    className="mb-2 inline-flex items-center rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3 py-1.5 text-[11px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE]"
                  >
                    {copy.backToCurrent}
                  </button>
                )}
                <h3 className="text-[14px] font-semibold text-[#2D4A1F]">
                  {viewMode === "current" ? copy.currentTitle : copy.allTitle}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B6254]">
                  {viewMode === "current" ? currentDescription : copy.allDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-md px-2 py-1 text-[11px] text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
              >
                {copy.close}
              </button>
            </div>

            {viewMode === "current" ? (
              <>
                {renderMemoryList(npcId, currentMemories, copy.clearCurrent, false)}

                <div className="mt-4 border-t border-[rgba(40,35,26,0.06)] pt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        loadAllMemories();
                        setExpandedResidentId(null);
                        setViewMode("all");
                      }}
                      className="inline-flex items-center rounded-lg border border-[rgba(86,122,76,0.14)] bg-[#EEF3E7] px-3.5 py-2 text-[12px] text-[#58764E] transition-colors hover:bg-[#E4ECDC]"
                    >
                      {copy.allMemories}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClear(npcId)}
                      disabled={currentMemories.length === 0}
                      className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3.5 py-2 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {copy.clearCurrent}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="mt-4 space-y-3">
                {visibleNpcIds.map((residentNpcId) => {
                  const residentMemories = allMemories[residentNpcId] ?? [];
                  const isExpanded = expandedResidentId === residentNpcId;
                  const residentName = getNpcDisplayName(residentNpcId);

                  return (
                    <section
                      key={residentNpcId}
                      className="overflow-hidden rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FFFDF7]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedResidentId((current) =>
                            current === residentNpcId ? null : residentNpcId
                          )
                        }
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F6F0E3]"
                      >
                        <p className="text-[14px] font-medium text-[#28231A]">
                          {residentName}
                        </p>
                        <div className="shrink-0 text-right">
                          <p className="text-[12px] font-medium text-[#6B6254]">
                            {residentMemories.length} {copy.countUnit}
                          </p>
                          <p className="mt-1 text-[11px] text-[#9A9080]">
                            {isExpanded ? copy.hide : copy.view}
                          </p>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-[rgba(40,35,26,0.06)] bg-[#FAF6EE]/70 px-4 py-4">
                          {renderMemoryList(
                            residentNpcId,
                            residentMemories,
                            copy.clearResident
                          )}
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
