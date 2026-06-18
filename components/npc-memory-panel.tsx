"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  NPC_MEMORIES_UPDATED_EVENT,
  clearLocalNPCMemories,
  deleteLocalNPCMemory,
  getConversationCount,
  getLastChatTime,
  getLocalNPCMemories,
  loadChatHistory,
} from "@/lib/memory";
import { ALL_NPC_IDS, type NpcId } from "@/lib/npc";
import type { UiLanguage } from "@/lib/ui-language";

type PanelViewMode = "current" | "all";
type MemoryMap = Record<NpcId, string[]>;
const IS_DEV = process.env.NODE_ENV !== "production";

function debugMemoryPanelTrace(message: string, details?: Record<string, unknown>): void {
  if (!IS_DEV) return;

  if (details) {
    console.debug(`[Memory Panel] ${message}`, details);
    return;
  }

  console.debug(`[Memory Panel] ${message}`);
}

const PANEL_COPY = {
  zh: {
    trigger: "记忆",
    close: "关闭",
    currentTitle: "这个人记住的事",
    currentDescription:
      "这个人会根据你们的聊天记住一些事，用来让下次对话更自然。你可以删除这些记忆。",
    allTitle: "其他人记住的事",
    allDescription: "你可以看看街上的其他人分别记住了什么。",
    backToCurrent: "返回",
    empty: "这个人还没有记住什么。多聊几次后，这里会出现一些小记录。",
    delete: "删除",
    clearCurrent: "清空记忆",
    clearResident: "清空记忆",
    clearConfirmTitle: "要清空这个人记住的所有事情吗？",
    clearConfirmBody: "聊天记录不会被删除。",
    confirmClear: "清空记忆",
    cancelClear: "取消",
    allMemories: "查看其他人记住的事",
    view: "查看",
    hide: "收起",
    countUnit: "条",
  },
  en: {
    trigger: "Memories",
    close: "Close",
    currentTitle: "What this person remembers",
    currentDescription:
      "This person remembers a few things from your chats to make the next conversation feel more natural. You can delete these memories.",
    allTitle: "What other people remember",
    allDescription: "You can see what other people around the street remember.",
    backToCurrent: "Back",
    empty: "This person has not remembered anything yet. After a few more chats, a few notes will appear here.",
    delete: "Delete",
    clearCurrent: "Clear memories",
    clearResident: "Clear memories",
    clearConfirmTitle: "Clear everything this person remembers?",
    clearConfirmBody: "Your chat history will not be deleted.",
    confirmClear: "Clear memories",
    cancelClear: "Cancel",
    allMemories: "See what other people remember",
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

function getNpcDisplayName(npcId: NpcId): string {
  const displayNames: Record<NpcId, string> = {
    aoi: "葵",
    haruka: "遥",
    kimura: "木村",
    misaki: "美咲",
    taisho: "大将",
    nana: "七海",
    ren: "莲",
    mao: "真央",
    riku: "陆",
    saku: "朔",
  };

  return displayNames[npcId];
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
  const [confirmingClearNpcId, setConfirmingClearNpcId] = useState<NpcId | null>(null);
  const [showSaku, setShowSaku] = useState(false);

  const copy = PANEL_COPY[uiLanguage];

  const loadCurrentMemories = useCallback(() => {
    const nextMemories = getLocalNPCMemories(npcId);
    setCurrentMemories(nextMemories);
    debugMemoryPanelTrace("loaded memories", {
      npcId,
      scope: "current",
      count: nextMemories.length,
    });
  }, [npcId]);

  const loadAllMemories = useCallback(() => {
    const nextMap = createEmptyMemoryMap();

    for (const residentNpcId of ALL_NPC_IDS) {
      nextMap[residentNpcId] = getLocalNPCMemories(residentNpcId);
    }

    setAllMemories(nextMap);
    setShowSaku(hasDiscoveredSaku());
    debugMemoryPanelTrace("loaded memories", {
      npcId,
      scope: "all",
      counts: Object.fromEntries(
        Object.entries(nextMap).map(([residentNpcId, residentMemories]) => [
          residentNpcId,
          residentMemories.length,
        ])
      ),
    });
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
    const handleMemoriesUpdated = () => loadPanelState();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    window.addEventListener(NPC_MEMORIES_UPDATED_EVENT, handleMemoriesUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(NPC_MEMORIES_UPDATED_EVENT, handleMemoriesUpdated);
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
    setConfirmingClearNpcId(null);
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    setViewMode("current");
    setExpandedResidentId(null);
    setConfirmingClearNpcId(null);
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

  const confirmClear = (targetNpcId: NpcId) => {
    clearLocalNPCMemories(targetNpcId);
    setConfirmingClearNpcId(null);

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

  const currentTitle =
    npcName && uiLanguage === "zh" ? `${npcName}记住的事` : copy.currentTitle;
  const currentDescription =
    npcName
      ? uiLanguage === "zh"
        ? `${npcName}会根据你们的聊天记住一些事，用来让下次对话更自然。你可以删除这些记忆。`
        : `${npcName} remembers a few things from your chats to make the next conversation feel more natural. You can delete these memories.`
      : copy.currentDescription;
  const backToCurrentLabel = copy.backToCurrent;

  const renderClearConfirmation = (targetNpcId: NpcId) => {
    const targetName = targetNpcId === npcId ? npcName : getNpcDisplayName(targetNpcId);
    const confirmTitle =
      targetName && uiLanguage === "zh"
        ? `要清空${targetName}记住的所有事情吗？`
        : copy.clearConfirmTitle;

    return (
      <div className="mt-3 rounded-xl border border-[rgba(154,85,85,0.12)] bg-[#F8F1EA] px-4 py-3">
        <p className="text-[12px] font-medium text-[#6B6254]">{confirmTitle}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-[#8A7C6A]">{copy.clearConfirmBody}</p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmingClearNpcId(null)}
            className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F6F0E3] px-3 py-1.5 text-[11px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE]"
          >
            {copy.cancelClear}
          </button>
          <button
            type="button"
            onClick={() => confirmClear(targetNpcId)}
            className="rounded-lg border border-[rgba(154,85,85,0.16)] bg-[#FCF6F4] px-3 py-1.5 text-[11px] text-[#9A5555] transition-colors hover:bg-[#F6E7E2]"
          >
            {copy.confirmClear}
          </button>
        </div>
      </div>
    );
  };

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
                  <p className="text-[13px] leading-relaxed text-[#28231A] break-words">
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
          <div className="mt-4">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setConfirmingClearNpcId(targetNpcId)}
                disabled={memories.length === 0}
                className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3.5 py-2 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {clearLabel}
              </button>
            </div>
            {confirmingClearNpcId === targetNpcId && renderClearConfirmation(targetNpcId)}
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
                    {backToCurrentLabel}
                  </button>
                )}
                <h3 className="text-[14px] font-semibold text-[#2D4A1F]">
                  {viewMode === "current" ? currentTitle : copy.allTitle}
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
                      onClick={() => setConfirmingClearNpcId(npcId)}
                      disabled={currentMemories.length === 0}
                      className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3.5 py-2 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {copy.clearCurrent}
                    </button>
                  </div>
                  {confirmingClearNpcId === npcId && renderClearConfirmation(npcId)}
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
