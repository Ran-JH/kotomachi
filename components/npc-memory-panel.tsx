"use client";

import { useCallback, useEffect, useState } from "react";

import {
  clearLocalNPCMemories,
  deleteLocalNPCMemory,
  getLocalNPCMemories,
} from "@/lib/memory";
import type { NpcId } from "@/lib/npc";

export type NpcMemoryPanelProps = {
  npcId: NpcId;
  npcName?: string;
  onOpenChange?: (open: boolean) => void;
  triggerClassName?: string;
};

export function NpcMemoryPanel({
  npcId,
  npcName,
  onOpenChange,
  triggerClassName,
}: NpcMemoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [memories, setMemories] = useState<string[]>([]);

  const loadMemories = useCallback(() => {
    setMemories(getLocalNPCMemories(npcId));
  }, [npcId]);

  useEffect(() => {
    if (!isOpen) return;

    loadMemories();

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== `kotomachi_facts_${npcId}`) return;
      loadMemories();
    };

    const handleFocus = () => loadMemories();

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isOpen, loadMemories, npcId]);

  const openPanel = () => {
    loadMemories();
    setIsOpen(true);
    onOpenChange?.(true);
  };

  const closePanel = () => {
    setIsOpen(false);
    onOpenChange?.(false);
  };

  const handleDelete = (index: number) => {
    const next = deleteLocalNPCMemory(npcId, index);
    setMemories(next);
  };

  const handleClearAll = () => {
    const confirmed = window.confirm(
      "要清空这个住民记住的所有事情吗？聊天记录不会被删除。"
    );
    if (!confirmed) return;

    clearLocalNPCMemories(npcId);
    setMemories([]);
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
        记住的事
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[95] flex items-end md:items-center md:justify-center">
          <button
            type="button"
            aria-label="关闭"
            className="absolute inset-0 bg-[#28231A]/25"
            onClick={closePanel}
          />
          <section className="relative w-full md:w-[min(34rem,92vw)] max-h-[78vh] overflow-y-auto rounded-t-2xl md:rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-4 md:px-5 md:py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-[#2D4A1F]">
                  这个住民记住的事
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-[#6B6254]">
                  {npcName ? `${npcName}会根据你们的聊天记住一些事，用来让下次对话更自然。你可以删除这些记忆。` : "这个住民会根据你们的聊天记住一些事，用来让下次对话更自然。你可以删除这些记忆。"}
                </p>
              </div>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-md px-2 py-1 text-[11px] text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
              >
                关闭
              </button>
            </div>

            {memories.length === 0 ? (
              <div className="mt-4 rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/65 px-4 py-4">
                <p className="text-[12px] leading-relaxed text-[#6B6254]">
                  这个住民还没有记住什么。多聊几次后，这里会出现一些小记录。
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {memories.map((memory, index) => (
                  <article
                    key={`${npcId}-${index}-${memory}`}
                    className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FFFDF7] px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] text-[#7A7060]">来自聊天</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-[#28231A] break-words">
                          {memory}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="shrink-0 rounded-lg border border-[rgba(154,85,85,0.12)] bg-[#FCF6F4] px-3 py-1.5 text-[11px] text-[#9A5555] transition-colors hover:bg-[#F6E7E2]"
                      >
                        删除
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={handleClearAll}
                disabled={memories.length === 0}
                className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3.5 py-2 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
              >
                清空这个住民的记忆
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
