"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createSummaryId, saveLookupHistory } from "@/lib/session-summary";
import { isWordSaved, toggleSavedItem, type SavedWord } from "@/lib/saved-items";
import { getUiCopy } from "@/lib/ui-copy";
import type { NpcId } from "@/lib/npc";
import type { UiLanguage } from "@/lib/ui-language";
import { buildClientApiUrl } from "@/lib/client-api-url";
import { VolumeIcon } from "@/components/ui-icons";

export interface ExplainResult {
  pronunciation: string;
  pronunciations?: string[];
  translation: string;
  sentence_meaning: string;
  nuance_explanation: string;
  word?: string;
  originalSelection?: string;
  wasCorrected?: boolean;
}

export interface WordPopoverProps {
  npcId: NpcId;
  selectedText: string;
  fullSentence: string;
  anchorRect: DOMRect;
  uiLanguage: UiLanguage;
  sourceMessageId?: string;
  onClose: () => void;
  onPlayAudio?: (word: string) => void;
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function hasUsefulNuance(data: ExplainResult, copy: ReturnType<typeof getUiCopy>): boolean {
  const nuance = data.nuance_explanation.trim();
  if (nuance.length < 12) return false;
  if (nuance === data.translation.trim() || nuance === data.sentence_meaning.trim()) return false;
  if (nuance.includes(copy.explain.error) || /Couldn.t explain|failed/i.test(nuance)) {
    return false;
  }
  return true;
}

function getExplainReadings(data: Pick<ExplainResult, "pronunciation" | "pronunciations">): string[] {
  const normalizedReadings =
    Array.isArray(data.pronunciations) && data.pronunciations.length > 0
      ? data.pronunciations.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : data.pronunciation
        ? [data.pronunciation]
        : [];

  return Array.from(
    new Set(normalizedReadings.map((value) => value.trim()).filter(Boolean)),
  ).slice(0, 3);
}

export function WordPopover({
  npcId,
  selectedText,
  fullSentence,
  anchorRect,
  uiLanguage,
  sourceMessageId,
  onClose,
  onPlayAudio,
}: WordPopoverProps) {
  const [data, setData] = useState<ExplainResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [explainError, setExplainError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const copy = getUiCopy(uiLanguage);
  const displayWord = data?.word?.trim() || selectedText;
  const originalSelection = data?.originalSelection?.trim() || selectedText;
  const wasCorrected = Boolean(data?.wasCorrected && displayWord && displayWord !== originalSelection);
  const displayReadings = data ? getExplainReadings(data) : [];

  useEffect(() => {
    let cancelled = false;

    const fetchExplain = async () => {
      setLoading(true);
      setExplainError(false);
      setExpanded(false);

      try {
        const res = await fetch(buildClientApiUrl("/api/explain"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selectedText,
            fullSentence,
            uiLanguage: uiLanguage === "en" ? "en" : "zh",
          }),
        });
        if (!res.ok) throw new Error("explain failed");

        const json = (await res.json()) as ExplainResult;
        if (cancelled) return;

        // Only show the saved toast right after a manual save, not every time the popover reopens.
        setShowSavedFeedback(false);
        setData(json);
        setExplainError(false);

        const nextWord = (json.word ?? selectedText).trim() || selectedText;
        const nextReadings = getExplainReadings(json);
        const nextPrimaryReading = nextReadings[0] ?? json.pronunciation ?? "";
        setIsSaved(isWordSaved(nextWord, nextPrimaryReading));

        // Chat keeps saving lookup history with messageId; future non-chat areas can omit it.
        if (sourceMessageId) {
          saveLookupHistory({
            schemaVersion: 1,
            id: createSummaryId("lookup"),
            npcId,
            word: nextWord,
            reading: nextPrimaryReading,
            meaning: json.translation,
            sourceSentence: fullSentence,
            originalSelection: (json.originalSelection ?? selectedText).trim() || selectedText,
            wasCorrected: Boolean(json.wasCorrected && nextWord !== selectedText),
            messageId: sourceMessageId,
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        if (cancelled) return;

        setShowSavedFeedback(false);
        setExplainError(true);
        setData({
          pronunciation: "",
          translation: selectedText,
          sentence_meaning: fullSentence,
          nuance_explanation: "",
          word: selectedText,
          originalSelection: selectedText,
          wasCorrected: false,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchExplain();
    return () => {
      cancelled = true;
    };
  }, [fullSentence, npcId, selectedText, sourceMessageId, uiLanguage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 50);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const popoverLayout: {
    style: CSSProperties;
    cardStyle: CSSProperties;
    placement: "above" | "below";
  } = (() => {
    const gap = 12;
    const margin = 16;
    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;
    const isMobile = viewportWidth < 768;
    const width = isMobile
      ? Math.min(352, viewportWidth - margin * 2)
      : Math.min(400, Math.max(340, viewportWidth - margin * 2));
    const anchorCenter = anchorRect.left + anchorRect.width / 2;
    const left = clampNumber(anchorCenter - width / 2, margin, viewportWidth - width - margin);
    const spaceAbove = Math.max(0, anchorRect.top - margin - gap);
    const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - margin - gap);
    const placement = spaceBelow < 260 && spaceAbove > spaceBelow ? "above" : "below";
    const rawMaxHeight = placement === "above" ? spaceAbove : spaceBelow;
    const availableHeight = Math.max(
      240,
      Math.min(rawMaxHeight, isMobile ? viewportHeight * 0.7 : 520),
    );

    return {
      placement,
      style: {
        position: "fixed",
        left: `${left}px`,
        width: `${width}px`,
        zIndex: 90,
        ...(placement === "below"
          ? { top: `${clampNumber(anchorRect.bottom + gap, margin, viewportHeight - margin)}px` }
          : { bottom: `${clampNumber(viewportHeight - anchorRect.top + gap, margin, viewportHeight - margin)}px` }),
      },
      cardStyle: {
        maxHeight: `${availableHeight}px`,
      },
    };
  })();

  const showNuance = data ? hasUsefulNuance(data, copy) : false;
  const lookupLabel = uiLanguage === "en" ? "Word lookup" : "查词";
  const readingLabel = uiLanguage === "en" ? "Reading" : "读音";
  const detailLabel = uiLanguage === "en" ? "Detailed explanation" : "详细解释";

  const handleToggleSave = () => {
    if (!data) return;

    const nextWord = (data.word ?? selectedText).trim() || selectedText;
    const sentenceMeaning = data.sentence_meaning?.trim();
    const nuanceExplanation = data.nuance_explanation?.trim();
    const readings = getExplainReadings(data);
    const item: SavedWord = {
      id: createSummaryId("saved-word"),
      type: "word",
      npcId,
      word: nextWord,
      reading: readings[0] ?? data.pronunciation ?? "",
      ...(readings.length > 0 ? { readings } : {}),
      meaning: data.translation ?? "",
      meaningLanguage: uiLanguage === "en" ? "en" : "zh",
      example: fullSentence,
      ...(sentenceMeaning ? { sentenceMeaning } : {}),
      ...(nuanceExplanation ? { nuanceExplanation } : {}),
      source: "lookup",
      sourceMessageId,
      createdAt: new Date().toISOString(),
    };
    const result = toggleSavedItem(item);
    setIsSaved(result.saved);
    setShowSavedFeedback(result.saved);
  };

  return createPortal(
    <div ref={popoverRef} style={popoverLayout.style}>
      {popoverLayout.placement === "below" && (
        <div className="flex justify-center -mb-px">
          <div className="h-2 w-2 translate-y-1 rotate-45 border-l border-t border-[rgba(40,35,26,0.12)] bg-[#FCF8F0]" />
        </div>
      )}
      <div
        className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain rounded-xl border border-[rgba(40,35,26,0.12)] bg-[#FCF8F0] px-3.5 py-3 shadow-[0_10px_28px_rgba(40,35,26,0.12),0_2px_6px_rgba(40,35,26,0.07)] md:rounded-2xl md:px-4 md:py-3.5"
        style={popoverLayout.cardStyle}
      >
        {loading ? (
          <p className="animate-pulse py-1.5 text-center text-[10px] text-[#7A7060] md:text-sm">
            {copy.explain.loading}
          </p>
        ) : data && (
          <>
            <div className="mb-2.5 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[8px] font-medium tracking-wide text-[#7A7060] md:text-[11px]">{lookupLabel}</p>
                <span className="font-ja mt-0.5 block break-words text-[14px] font-medium leading-snug text-[#28231A] md:text-[18px]">{displayWord}</span>
                {wasCorrected && (
                  <p className="mt-0.5 break-words text-[8px] text-[#7A7060] md:text-[11px]">
                    {uiLanguage === "en"
                      ? `Corrected from "${originalSelection}"`
                      : `已从「${originalSelection}」自动修正`}
                  </p>
                )}
                {displayReadings.length > 0 && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[8px] font-medium text-[#7A7060] md:text-[11px]">{readingLabel}</span>
                    <span className="font-ja min-w-0 break-words text-[10px] text-[#4A4438] md:text-[13px]">
                      {displayReadings.join(" / ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => onPlayAudio?.(displayWord)}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#7A7060]/80 transition-colors hover:bg-[#E8E0CE]/75 hover:text-[#2D4A1F] md:h-6 md:w-6"
                      aria-label={copy.explain.listen}
                      title={copy.explain.listen}
                    >
                      <VolumeIcon size={12} />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={copy.explain.close}
                className="shrink-0 text-[9px] leading-none text-[#7A7060]/45 transition-colors hover:text-[#28231A] md:text-xs"
              >
                ×
              </button>
            </div>

            <div className="font-ui rounded-lg bg-[#F3EDE0]/70 px-2.5 py-2.5 md:px-3 md:py-3">
              <p className="text-[9px] font-medium text-[#7A7060] md:text-[11px]">{copy.explain.shortMeaning}</p>
              <p className="mt-1 break-words text-[12px] font-medium leading-snug text-[#2D4A1F] md:text-[15px] md:leading-relaxed">{data.translation}</p>
            </div>

            <button
              type="button"
              onClick={handleToggleSave}
              className={`mt-2 w-full rounded-md border px-2 py-1.5 text-[9px] font-medium transition-colors md:px-3 md:py-2 md:text-[11px] ${
                isSaved
                  ? "border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#8B7430]"
                  : "border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] text-[#7A7060] hover:border-[rgba(40,35,26,0.2)] hover:text-[#2D4A1F]"
              }`}
            >
              {isSaved ? copy.explain.savedWord : copy.explain.saveWord}
            </button>
            {showSavedFeedback && (
              <p className="mt-1.5 text-[9px] leading-relaxed text-[#7A7060] md:text-[11px]">
                {copy.explain.savedWordFeedback}
              </p>
            )}

            <div className="mt-2 border-t border-[rgba(40,35,26,0.08)] pt-2">
              <p className="font-ui text-[9px] font-medium text-[#7A7060] md:text-[11px]">{copy.explain.sentenceMeaning}</p>
              <p className="font-ui mt-0.5 break-words text-[10px] leading-relaxed text-[#4A4438] md:text-[13px] md:leading-relaxed">
                {data.sentence_meaning}
              </p>
              {explainError && (
                <p className="font-ui mt-1.5 rounded-md bg-[#F3EDE0]/65 px-2 py-1.5 text-[9px] leading-relaxed text-[#7A7060] md:text-[11px]">
                  {copy.explain.error}
                </p>
              )}
            </div>

            {showNuance && (
              <div className="mt-2 border-t border-[rgba(40,35,26,0.08)] pt-2">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-[9px] text-[#7A7060] transition-colors hover:text-[#2D4A1F] md:text-[11px]"
                >
                  <span>{expanded ? copy.explain.hideExplanation : copy.explain.showExplanation}</span>
                  <span className={`text-[7px] transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>▾</span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    expanded ? "mt-1.5 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="mb-0.5 text-[9px] font-medium text-[#7A7060] md:text-[11px]">{detailLabel}</p>
                    <div className="max-h-[min(20vh,120px)] overflow-y-auto pr-1 md:max-h-[130px]">
                      <p className="font-ui break-words text-[10px] leading-relaxed text-[#4A4438] md:text-[13px] md:leading-relaxed">
                        {data.nuance_explanation}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {popoverLayout.placement === "above" && (
        <div className="flex justify-center -mt-px">
          <div className="h-2 w-2 -translate-y-1 rotate-45 border-b border-r border-[rgba(40,35,26,0.12)] bg-[#FCF8F0]" />
        </div>
      )}
    </div>,
    document.body,
  );
}
