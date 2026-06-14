"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FEEDBACK_LEVEL_META,
  type FeedbackLevelKey,
  type FeedbackResponse,
} from "@/lib/feedback-types";
import { NPC_AVATARS, type NpcId } from "@/lib/npc";
import {
  createSummaryId,
  markExpressionHintPlayed,
  isValidExpressionHintText,
  saveExpressionHintRecord,
  saveLookupHistory,
  type ExpressionHintStyle,
} from "@/lib/session-summary";
import { isWordSaved, isExpressionSaved, toggleSavedItem, type SavedWord, type SavedExpression } from "@/lib/saved-items";
import { getCachedFeedback, setCachedFeedback, removeCachedFeedback, toCachedFeedback, fromCachedFeedback } from "@/lib/expression-hint-cache";
import { getUiCopy } from "@/lib/ui-copy";
import type { UiLanguage } from "@/lib/ui-language";
import { buildClientApiUrl } from "@/lib/client-api-url";
import { LightbulbIcon, TranslateIcon, UserIcon, VolumeIcon } from "@/components/ui-icons";

/* ============================================================
   Figma Design Tokens 鈫?Tailwind 鏄犲皠
   鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€鈹€
   background     #F3EDE0  椤甸潰搴曡壊锛堢背鐧斤級
   foreground     #28231A  涓绘枃瀛楋紙娣辨榛戯級
   card           #FAF6EE  鍗＄墖搴曡壊锛堟殩鐧斤級
   primary        #2D4A1F  涓昏壊锛堟繁缁匡級鈫?鐢ㄦ埛姘旀场
   primary-fg     #F3EDE0  涓昏壊涓婃枃瀛?
   secondary      #E8E0CE  娆¤壊锛堟殩鐏帮級
   secondary-fg   #4A4438  娆¤壊涓婃枃瀛?
   muted          #D8CFBC  寮卞寲鑹?
   muted-fg       #7A7060  寮卞寲鏂囧瓧
   accent         #C9A84C  鐞ョ弨寮鸿皟
   border         rgba(40,35,26,0.1)
   input-bg       #EDE7D8  杈撳叆妗嗗簳鑹?
   radius         0.75rem  鍦嗚鍩哄噯
   sidebar        #1E2A16  渚ц竟鏍?
   sidebar-fg     #D4C8A8  渚ц竟鏍忔枃瀛?
   sidebar-accent #253318  渚ц竟鏍忛€変腑
   ============================================================ */

interface ChatBubbleProps {
  messageId: string;
  sender: "user" | "assistant";
  text: string;
  npcId: NpcId;
  uiLanguage?: UiLanguage;
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  npcAudioUrl?: string | null;
  onPlayNpcAudio?: () => void;
  isVoiceMessage?: boolean;
}

type ManagedAudioSource = {
  requestId: number;
  key: string;
  controller: AbortController;
  audio: HTMLAudioElement | null;
  cleanup?: () => void;
  onStop?: () => void;
};

let activeManagedAudio: ManagedAudioSource | null = null;
let managedAudioRequestSeq = 0;

function stopActiveManagedAudio(): void {
  if (!activeManagedAudio) return;
  const { audio, cleanup, onStop, controller } = activeManagedAudio;
  try {
    controller.abort();
  } catch {
    // no-op: abort should never block UI interaction.
  }
  try {
    audio?.pause();
    if (audio) {
      audio.currentTime = 0;
      audio.onended = null;
      audio.onerror = null;
      audio.src = "";
      audio.load();
    }
  } catch {
    // no-op: cleanup should never block UI interaction.
  }
  try {
    cleanup?.();
  } catch {
    // no-op
  }
  try {
    onStop?.();
  } catch {
    // no-op
  }
  activeManagedAudio = null;
}

async function fetchAndPlayTts(
  text: string,
  npcId: NpcId,
  playbackKey = `tts:${npcId}:${text}`,
  onStop?: () => void,
  providedAudioUrl?: string | null,
): Promise<void> {
  const existing = activeManagedAudio;
  if (existing && existing.key === playbackKey && !existing.controller.signal.aborted) {
    return;
  }

  stopActiveManagedAudio();
  const requestId = ++managedAudioRequestSeq;
  const controller = new AbortController();
  const sessionKey = playbackKey;
  let cleanup: (() => void) | undefined;
  let audioUrl = providedAudioUrl?.trim() || null;

  activeManagedAudio = {
    requestId,
    key: sessionKey,
    controller,
    audio: null,
    onStop,
  };

  try {
    if (!audioUrl) {
      const req = await fetch(buildClientApiUrl("/api/tts"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, npcId }),
        signal: controller.signal,
      });
      if (!req.ok) {
        const err = await req.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error ?? `TTS request failed (${req.status})`
        );
      }

      const blob = await req.blob();
      audioUrl = URL.createObjectURL(blob);
      cleanup = () => URL.revokeObjectURL(audioUrl as string);
    }

    if (!activeManagedAudio || activeManagedAudio.requestId !== requestId || controller.signal.aborted) {
      cleanup?.();
      return;
    }

    if (!audioUrl) {
      cleanup?.();
      return;
    }

    const audio = new Audio(audioUrl);
    activeManagedAudio.audio = audio;
    activeManagedAudio.cleanup = cleanup;

    audio.onended = () => {
      if (activeManagedAudio?.requestId === requestId) {
        stopActiveManagedAudio();
      } else {
        cleanup?.();
      }
    };
    audio.onerror = () => {
      if (activeManagedAudio?.requestId === requestId) {
        stopActiveManagedAudio();
      } else {
        cleanup?.();
      }
    };

    await audio.play();
  } catch (err) {
    if (controller.signal.aborted) {
      cleanup?.();
      return;
    }
    cleanup?.();
    if (activeManagedAudio?.requestId === requestId) {
      stopActiveManagedAudio();
    }
    throw err;
  }
}

/* ============================================================
   鍒掕瘝鏌ヨ瘝鎮诞鍗＄墖 鈥?Figma popover 椋庢牸
   ============================================================ */

interface ExplainResult {
  pronunciation: string;
  translation: string;
  sentence_meaning: string;
  nuance_explanation: string;
  word?: string;
  originalSelection?: string;
  wasCorrected?: boolean;
}

interface WordPopoverProps {
  npcId: NpcId;
  messageId: string;
  selectedText: string;
  fullSentence: string;
  anchorRect: DOMRect;
  uiLanguage: UiLanguage;
  onClose: () => void;
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function hasUsefulNuance(data: ExplainResult, copy: ReturnType<typeof getUiCopy>): boolean {
  const nuance = data.nuance_explanation.trim();
  if (nuance.length < 12) return false;
  if (nuance === data.translation.trim() || nuance === data.sentence_meaning.trim()) return false;
  if (nuance.includes(copy.explain.error) || /瑙ｉ噴澶辫触|Couldn.t explain|failed/i.test(nuance)) {
    return false;
  }
  return true;
}

function WordPopover({ npcId, messageId, selectedText, fullSentence, anchorRect, uiLanguage, onClose }: WordPopoverProps) {
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
        if (!cancelled) {
          // 反馈只在当前这次手动保存成功后显示，不在重新打开时自动出现。
          setShowSavedFeedback(false);
          setData(json);
          setExplainError(false);
          const nextWord = (json.word ?? selectedText).trim() || selectedText;
          setIsSaved(isWordSaved(nextWord, json.pronunciation));
          saveLookupHistory({
            schemaVersion: 1,
            id: createSummaryId("lookup"),
            npcId,
            word: nextWord,
            reading: json.pronunciation,
            meaning: json.translation,
            sourceSentence: fullSentence,
            originalSelection: (json.originalSelection ?? selectedText).trim() || selectedText,
            wasCorrected: Boolean(json.wasCorrected && nextWord !== selectedText),
            messageId,
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        if (!cancelled) {
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
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchExplain();
    return () => { cancelled = true; };
  }, [copy.explain.error, fullSentence, messageId, npcId, selectedText, uiLanguage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
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
    style: React.CSSProperties;
    cardStyle: React.CSSProperties;
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
    const item: SavedWord = {
      id: createSummaryId("saved-word"),
      type: "word",
      npcId,
      word: nextWord,
      reading: data.pronunciation ?? "",
      meaning: data.translation ?? "",
      meaningLanguage: uiLanguage === "en" ? "en" : "zh",
      example: fullSentence,
      ...(sentenceMeaning ? { sentenceMeaning } : {}),
      ...(nuanceExplanation ? { nuanceExplanation } : {}),
      source: "lookup",
      sourceMessageId: messageId,
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
      {/* popover 鍗＄墖锛欶igma card 搴曡壊 + 绮捐嚧闃村奖 */}
      <div
        className="max-h-[min(70vh,32rem)] overflow-y-auto overscroll-contain rounded-xl border border-[rgba(40,35,26,0.12)] bg-[#FCF8F0] px-3.5 py-3 shadow-[0_10px_28px_rgba(40,35,26,0.12),0_2px_6px_rgba(40,35,26,0.07)] md:rounded-2xl md:px-4 md:py-3.5"
        style={popoverLayout.cardStyle}
      >
        {loading ? (
          <p className="py-1.5 text-center text-[10px] text-[#7A7060] animate-pulse md:text-sm">
            {copy.explain.loading}
          </p>
        ) : data && (
          <>
            {/* 鍗曡瘝 + 璇婚煶 + 鍙戦煶鎸夐挳 */}
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
                {data.pronunciation && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[8px] font-medium text-[#7A7060] md:text-[11px]">{readingLabel}</span>
                    <span className="font-ja text-[10px] text-[#4A4438] md:text-[13px]">{data.pronunciation}</span>
                      <button
                        type="button"
                        onClick={() => { void fetchAndPlayTts(displayWord, npcId, `lookup:${messageId}:${displayWord}`).catch(() => undefined); }}
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

            {/* 绠€鐭噴涔?*/}
            <div className="font-ui rounded-lg bg-[#F3EDE0]/70 px-2.5 py-2.5 md:px-3 md:py-3">
              <p className="text-[9px] font-medium text-[#7A7060] md:text-[11px]">{copy.explain.shortMeaning}</p>
              <p className="mt-1 break-words text-[12px] font-medium leading-snug text-[#2D4A1F] md:text-[15px] md:leading-relaxed">{data.translation}</p>
            </div>

            {/* 鏀惰棌鎸夐挳 */}
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

            {/* 鏁村彞缈昏瘧 */}
            <div className="border-t border-[rgba(40,35,26,0.08)] pt-2 mt-2">
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

            {/* 瑭炽仐銇?鈻?鈥?鐞ョ弨寮鸿皟鑹诧紝骞虫粦灞曞紑 */}
            {showNuance && (
              <div className="border-t border-[rgba(40,35,26,0.08)] pt-2 mt-2">
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
                    expanded ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0"
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
      {/* 灏忎笁瑙?*/}
      {popoverLayout.placement === "above" && (
        <div className="flex justify-center -mt-px">
          <div className="w-2 h-2 bg-[#FCF8F0] border-r border-b border-[rgba(40,35,26,0.12)] rotate-45 -translate-y-1" />
        </div>
      )}
    </div>,
    document.body
  );
}

/* ============================================================
   鍦哄悎琛ㄨ揪鍙嶉鎶藉眽
   ============================================================ */

interface FeedbackDrawerProps {
  open: boolean;
  loading: boolean;
  userText: string;
  feedback: FeedbackResponse | null;
  npcId: NpcId;
  messageId: string;
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  feedbackError: boolean;
  uiLanguage: UiLanguage;
  onClose: () => void;
  onSuggestionPlayed?: (key: FeedbackLevelKey) => void;
  onRegenerate: () => void;
}

function parseFeedbackAnalysisSections(analysis: string): {
  usage: string;
  reason: string;
  details: string;
} {
  const text = analysis.trim();
  if (!text) return { usage: "", reason: "", details: "" };

  const usageMatch = text.match(/\[(?:鍦哄悎|鍫村悎|usage|scene)\]\s*([\s\S]*?)(?=\[(?:鍘熷彞|鐞嗙敱|瑁滆冻|澶囨敞|鍌欒€億why|reason|note|analysis)\]|$)/i);
  const reasonMatch = text.match(/\[(?:鍘熷彞|鐞嗙敱|瑁滆冻|澶囨敞|鍌欒€億why|reason|note|analysis)\]\s*([\s\S]*?)(?=$)/i);
  const usage = usageMatch ? usageMatch[1].trim() : "";
  const reason = reasonMatch ? reasonMatch[1].trim() : "";

  if (usage || reason) {
    return {
      usage,
      reason,
      details: "",
    };
  }

  const sentences = text
    .replace(/\[(?:鍦哄悎|鍫村悎|usage|scene|鍘熷彞|鐞嗙敱|瑁滆冻|澶囨敞|鍌欒€億why|reason|note|analysis)\]\s*/gi, "")
    .split(/\n+|(?<=[銆傦紒锛??])\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
  return {
    usage: sentences[0] ?? "",
    reason: sentences[1] ?? "",
    details: sentences.slice(2).join(" "),
  };
}

function FeedbackDrawer({
  open, loading, userText, feedback, npcId, messageId, userAudioBlob, userAudioUrl, feedbackError, uiLanguage, onClose, onSuggestionPlayed, onRegenerate,
}: FeedbackDrawerProps) {
  const [ttsLoadingKey, setTtsLoadingKey] = useState<FeedbackLevelKey | null>(null);
  const [ttsErrorKey, setTtsErrorKey] = useState<FeedbackLevelKey | null>(null);
  const [ttsPlayingKey, setTtsPlayingKey] = useState<FeedbackLevelKey | null>(null);
  const [isUserRecordingPlaying, setIsUserRecordingPlaying] = useState(false);
  const [expandedAnalysisKey, setExpandedAnalysisKey] = useState<FeedbackLevelKey | null>(null);
  const [overflowingAnalysisKeys, setOverflowingAnalysisKeys] = useState<Partial<Record<FeedbackLevelKey, boolean>>>({});
  const [savedKeys, setSavedKeys] = useState<Partial<Record<FeedbackLevelKey, boolean>>>({});
  const userTempAudioUrlRef = useRef<string | null>(null);
  const analysisRefs = useRef<Partial<Record<FeedbackLevelKey, HTMLParagraphElement | null>>>({});
  const hasUserRecording = Boolean(userAudioUrl || userAudioBlob);
  const copy = getUiCopy(uiLanguage);
  const pauseLabel = uiLanguage === "zh" ? "\u6682\u505c" : "Pause";

  const revokeUserTempAudioUrl = useCallback(() => {
    if (!userTempAudioUrlRef.current) return;
    URL.revokeObjectURL(userTempAudioUrlRef.current);
    userTempAudioUrlRef.current = null;
  }, []);

  const stopFeedbackAudio = useCallback(() => {
    stopActiveManagedAudio();
    setTtsLoadingKey(null);
    setTtsErrorKey(null);
    setTtsPlayingKey(null);
    setIsUserRecordingPlaying(false);
    revokeUserTempAudioUrl();
  }, [revokeUserTempAudioUrl]);

  const playUserRecording = useCallback(async () => {
    const playbackKey = `feedback-recording:${messageId}`;
    if (activeManagedAudio && activeManagedAudio.key === playbackKey && !activeManagedAudio.controller.signal.aborted) {
      stopFeedbackAudio();
      return;
    }

    let audioUrl = userAudioUrl?.trim() || null;
    if (!audioUrl && userAudioBlob) {
      revokeUserTempAudioUrl();
      audioUrl = URL.createObjectURL(userAudioBlob);
      userTempAudioUrlRef.current = audioUrl;
    }
    if (!audioUrl) return;

    setIsUserRecordingPlaying(true);
    try {
      await fetchAndPlayTts("", npcId, playbackKey, () => {
        setIsUserRecordingPlaying(false);
        revokeUserTempAudioUrl();
      }, audioUrl);
    } catch (error) {
      setIsUserRecordingPlaying(false);
      revokeUserTempAudioUrl();
      console.warn("Feedback recording play() rejected or failed.", error);
    }
  }, [messageId, npcId, revokeUserTempAudioUrl, userAudioBlob, userAudioUrl, stopFeedbackAudio]);

  const playLevelSample = async (key: FeedbackLevelKey, nativeSay: string) => {
    const playbackKey = `feedback:${messageId}:${key}`;
    if (activeManagedAudio && activeManagedAudio.key === playbackKey && !activeManagedAudio.controller.signal.aborted) {
      stopFeedbackAudio();
      return;
    }

    if (!isValidExpressionHintText(nativeSay)) {
      setTtsErrorKey(key);
      return;
    }

    onSuggestionPlayed?.(key);
    const sampleText = nativeSay.trim();
    if (!sampleText) {
      setTtsErrorKey(key);
      return;
    }
    setTtsErrorKey(null);
    setTtsLoadingKey(key);
    setTtsPlayingKey(null);
    const clearFeedbackPlaybackForKey = () => {
      setTtsLoadingKey((current) => (current === key ? null : current));
      setTtsPlayingKey((current) => (current === key ? null : current));
      setTtsErrorKey((current) => (current === key ? null : current));
    };
    try {
      await fetchAndPlayTts(sampleText, npcId, playbackKey, clearFeedbackPlaybackForKey);
      if (activeManagedAudio?.key === playbackKey && !activeManagedAudio.controller.signal.aborted) {
        setTtsLoadingKey((current) => (current === key ? null : current));
        setTtsPlayingKey(key);
      }
    } catch {
      setTtsErrorKey(key);
      clearFeedbackPlaybackForKey();
    } finally {
      setTtsLoadingKey((current) => (current === key ? null : current));
    }
  };

  const setAnalysisRef = useCallback((key: FeedbackLevelKey) => (node: HTMLParagraphElement | null) => {
    analysisRefs.current[key] = node;
  }, []);

  const measureAnalysisOverflow = useCallback(() => {
    const next: Partial<Record<FeedbackLevelKey, boolean>> = {};
    FEEDBACK_LEVEL_META.forEach((meta) => {
      const node = analysisRefs.current[meta.key];
      if (!node) return;
      next[meta.key] = node.scrollHeight > node.clientHeight + 1;
    });
    setOverflowingAnalysisKeys(next);
  }, []);

  useEffect(() => {
    if (!open || loading || !feedback) return;
    const frame = requestAnimationFrame(measureAnalysisOverflow);
    return () => cancelAnimationFrame(frame);
  }, [open, loading, feedback, measureAnalysisOverflow]);

  useEffect(() => {
    if (!open) {
      stopFeedbackAudio();
      setExpandedAnalysisKey(null);
      setOverflowingAnalysisKeys({});
      setSavedKeys({});
    }
  }, [open, stopFeedbackAudio]);

  useEffect(() => {
    if (!feedback || !open) return;
    const next: Partial<Record<FeedbackLevelKey, boolean>> = {};
    for (const meta of FEEDBACK_LEVEL_META) {
      next[meta.key] = isExpressionSaved(feedback[meta.key].nativeSay, npcId);
    }
    setSavedKeys(next);
  }, [feedback, npcId, open]);

  const levelToSavedLevel = (key: FeedbackLevelKey): "casual" | "neutral" | "polite" => {
    if (key === "casual") return "casual";
    if (key === "formal") return "polite";
    return "neutral";
  };

  const handleToggleSaveExpression = (key: FeedbackLevelKey) => {
    if (!feedback) return;
    const level = feedback[key];
    if (!isValidExpressionHintText(level.nativeSay)) return;
    const item: SavedExpression = {
      id: createSummaryId("saved-expr"),
      type: "expression",
      npcId,
      original: userText,
      suggestion: level.nativeSay,
      level: levelToSavedLevel(key),
      note: level.analysis.trim() || undefined,
      source: "feedback",
      sourceMessageId: messageId,
      createdAt: new Date().toISOString(),
      uiLanguageAtSave: uiLanguage === "en" ? "en" : "zh",
    };
    const result = toggleSavedItem(item);
    setSavedKeys((prev) => ({ ...prev, [key]: result.saved }));
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end px-2 sm:px-0">
      <button type="button" aria-label={copy.feedback.close} className="absolute inset-0 bg-[#28231A]/15" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-drawer-title"
        className="relative mx-auto w-full max-w-xl max-h-[calc(100dvh-1rem)] sm:max-h-[70vh] flex flex-col rounded-t-2xl bg-[#F3EDE0] shadow-[0_-6px_32px_rgba(40,35,26,0.12)] border-t border-[rgba(40,35,26,0.08)] animate-slide-up"
      >
        {/* 澶撮儴 */}
        <div className="shrink-0 px-4 sm:px-6 pt-5 pb-3 border-b border-[rgba(40,35,26,0.08)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-6 h-6 rounded-full text-[#7A7060] hover:bg-[rgba(40,35,26,0.06)] hover:text-[#28231A] text-xs leading-none flex items-center justify-center transition-colors"
            aria-label={copy.feedback.close}
          >
            ×
          </button>
          <h2 id="feedback-drawer-title" className="font-ui text-sm font-medium text-[#28231A] tracking-wide mb-0.5">
            {copy.feedback.title}
          </h2>
          <p className="text-[9px] text-[#7A7060]">{copy.feedback.subtitle}</p>
          {feedback && !loading && (
            <button
              type="button"
              onClick={onRegenerate}
              className="mt-1.5 self-start px-2 py-0.5 rounded border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] text-[9px] text-[#7A7060] hover:text-[#2D4A1F] hover:border-[rgba(40,35,26,0.2)] transition-colors"
            >
              {copy.feedback.regenerate}
            </button>
          )}

          {/* 鐢ㄦ埛鍘熷彞 */}
          <div className="mt-3 rounded-lg bg-[#FAF6EE] border border-[rgba(40,35,26,0.08)] px-3 py-2">
            <span className="text-[8px] font-medium text-[#7A7060] tracking-wider">{copy.feedback.original}</span>
            <p className="font-ui text-xs text-[#28231A] mt-0.5 leading-relaxed break-words [overflow-wrap:anywhere]">{userText}</p>
          </div>

          {feedbackError && (
            <p className="mt-2 rounded-lg bg-[#E8E0CE]/55 px-3 py-2 text-[10px] leading-relaxed text-[#7A7060]">
              {copy.feedback.error}
            </p>
          )}

          {hasUserRecording && (
            <button
              type="button"
              onClick={() => {
                if (isUserRecordingPlaying) {
                  stopFeedbackAudio();
                  return;
                }
                void playUserRecording();
              }}
              aria-label={isUserRecordingPlaying ? pauseLabel : copy.feedback.userRecording}
              title={isUserRecordingPlaying ? pauseLabel : copy.feedback.userRecording}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-[#2D4A1F] text-[#F3EDE0] py-2 text-[10px] font-medium hover:bg-[#2D4A1F]/90 transition-colors"
            >
              <VolumeIcon size={13} />
              <span>{isUserRecordingPlaying ? pauseLabel : copy.feedback.userRecording}</span>
            </button>
          )}
        </div>

        {/* 涓夋。鍦哄悎鍗＄墖 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5 py-3 space-y-2">
          {loading ? (
            <div className="py-10 text-center">
              <p className="text-xs text-[#7A7060] animate-pulse">{copy.feedback.creating}</p>
            </div>
          ) : feedback ? (
            FEEDBACK_LEVEL_META.filter(meta => feedback[meta.key].nativeSay.trim()).length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-xs text-[#7A7060]">{copy.feedback.error}</p>
              </div>
            ) : (
              FEEDBACK_LEVEL_META.filter(meta => feedback[meta.key].nativeSay.trim()).map((meta) => {
                const level = feedback[meta.key];
                const isTtsLoading = ttsLoadingKey === meta.key;
                const isTtsPlaying = ttsPlayingKey === meta.key;
                const isTtsActive = isTtsLoading || isTtsPlaying;
                const isExpanded = expandedAnalysisKey === meta.key;
                const levelLabels = copy.feedback.levels;
                const labels = levelLabels[meta.key] || { label: meta.title, subtitle: meta.subtitle };
                const zhLabels: Record<FeedbackLevelKey, { label: string; subtitle: string }> = {
                  casual: { label: "亲近随和", subtitle: "カジュアル" },
                  business: { label: "普通自然", subtitle: "ふつう" },
                  formal: { label: "严肃正式", subtitle: "フォーマル" },
                };
                const displayLabels = uiLanguage === "zh" ? zhLabels[meta.key] : labels;
                const analysisText = level.analysis.trim();
                const analysisSections = parseFeedbackAnalysisSections(analysisText);
                const detailText = analysisSections.details;
                const hasOverflowingAnalysis = Boolean(overflowingAnalysisKeys[meta.key]);

                return (
                  <article key={meta.key} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.08)] px-3.5 sm:px-4 py-3.5">
                    <header className="flex items-center gap-2">
                      <span className="h-8 w-1 shrink-0 rounded-full bg-[#C9A84C]/65" aria-hidden="true" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[12px] font-semibold text-[#28231A]">{displayLabels.label}</h3>
                        <p className="text-[9px] text-[#7A7060]/85">{displayLabels.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleSaveExpression(meta.key)}
                        className={`shrink-0 px-2 py-1 rounded-md border text-[9px] font-medium transition-colors whitespace-nowrap ${
                          savedKeys[meta.key]
                            ? "border-[#C9A84C]/30 bg-[#C9A84C]/10 text-[#8B7430]"
                            : "border-[rgba(40,35,26,0.1)] bg-[#F3EDE0]/75 text-[#7A7060] hover:border-[rgba(40,35,26,0.2)] hover:text-[#2D4A1F]"
                        }`}
                      >
                        {savedKeys[meta.key] ? copy.feedback.savedExpression : copy.feedback.saveExpression}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isTtsActive) {
                            stopFeedbackAudio();
                            return;
                          }
                          void playLevelSample(meta.key, level.nativeSay);
                        }}
                        aria-pressed={isTtsActive}
                        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0]/75 text-[9px] font-medium text-[#2D4A1F]/90 hover:border-[rgba(40,35,26,0.2)] transition-colors whitespace-nowrap"
                        title={isTtsActive ? pauseLabel : copy.feedback.listen}
                      >
                        {isTtsLoading ? (
                          <span className="animate-pulse">{uiLanguage === "zh" ? "\u64ad\u653e\u4e2d\u2026" : "Playing\u2026"}</span>
                        ) : isTtsPlaying ? (
                          <span>{pauseLabel}</span>
                        ) : (
                          <>
                            <VolumeIcon size={11} /> {copy.feedback.listen}
                          </>
                        )}
                      </button>
                    </header>
                    <div className="mt-2.5 rounded-lg bg-[#F3EDE0]/60 border-l-2 border-[#C9A84C]/55 px-3 py-2.5">
                      <span className="text-[9px] font-medium text-[#7A7060] tracking-wide">{copy.feedback.recommended}</span>
                      <p className="font-ja mt-1 text-[15px] sm:text-[16px] font-medium text-[#2D4A1F] leading-[1.8] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {level.nativeSay}
                      </p>
                    </div>
                    {ttsErrorKey === meta.key && (
                      <p className="mt-1.5 px-1 text-[9px] text-[#9A6B2F]">
                        {copy.feedback.listenFailure}
                      </p>
                    )}
                    <div className="mt-2.5 space-y-2">
                      {analysisSections.usage && (
                        <div className="rounded-md bg-[#F3EDE0]/55 px-2.5 py-2">
                          <p className="text-[9px] font-medium text-[#7A7060]">{copy.feedback.usageLabel}</p>
                          <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-[#4A4438] break-words">
                            {analysisSections.usage}
                          </p>
                        </div>
                      )}
                      {analysisSections.reason && (
                        <div className="rounded-md bg-[#F3EDE0]/55 px-2.5 py-2">
                          <p className="text-[9px] font-medium text-[#7A7060]">{copy.feedback.whyLabel}</p>
                          <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-[#4A4438] break-words">
                            {analysisSections.reason}
                          </p>
                        </div>
                      )}
                      {detailText && (
                        <p
                          ref={setAnalysisRef(meta.key)}
                          className={`font-ui text-[10px] text-[#7A7060] leading-relaxed whitespace-pre-wrap break-words transition-all ${
                            !isExpanded ? "max-h-[4.8em] overflow-hidden" : ""
                          }`}
                        >
                          {detailText}
                        </p>
                      )}
                      {detailText && hasOverflowingAnalysis && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedAnalysisKey(isExpanded ? null : meta.key)}
                          className="block text-[9px] font-medium text-[#C9A84C] hover:text-[#2D4A1F] transition-colors"
                        >
                          {isExpanded ? copy.feedback.hideDetails : copy.feedback.showDetails}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )
          ) : null}
        </div>
        <div className="shrink-0 h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   ChatBubble 涓荤粍浠?
   ============================================================ */

function mapFeedbackKeyToStyle(key: FeedbackLevelKey): ExpressionHintStyle {
  return key === "business" ? "normal" : key;
}

function hasValidFeedbackSuggestions(feedback: FeedbackResponse): boolean {
  return FEEDBACK_LEVEL_META.some((meta) => isValidExpressionHintText(feedback[meta.key].nativeSay));
}

export function ChatBubble({
  messageId, sender, text, npcId, uiLanguage = "zh", userAudioBlob, userAudioUrl, npcAudioUrl, onPlayNpcAudio, isVoiceMessage,
}: ChatBubbleProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userAudioError, setUserAudioError] = useState(false);
  const [feedbackRecordId, setFeedbackRecordId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [isNpcAudioLoading, setIsNpcAudioLoading] = useState(false);
  const [isNpcAudioPlaying, setIsNpcAudioPlaying] = useState(false);
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationText, setTranslationText] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState(false);

  const [popover, setPopover] = useState<{
    selectedText: string; fullSentence: string; anchorRect: DOMRect;
  } | null>(null);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const userTempAudioUrlRef = useRef<string | null>(null);
  const npcAudioRef = useRef<HTMLAudioElement | null>(null);
  const npcObjectUrlRef = useRef<string | null>(null);
  const copy = getUiCopy(uiLanguage);
  const pauseLabel = uiLanguage === "zh" ? "\u6682\u505c" : "Pause";
  const actionButtonClass =
    "mt-1 inline-flex items-center gap-1.5 rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0]/72 px-2.5 py-1 text-[9px] text-[#6F6658] transition-colors hover:bg-[#E8E0CE] hover:text-[#2D4A1F] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setFeedbackError(false);
  }, []);
  const hasUserRecording = sender === "user" && Boolean(userAudioUrl || userAudioBlob);

  const recordExpressionHintOpened = useCallback((nextFeedback: FeedbackResponse): string => {
    if (!hasValidFeedbackSuggestions(nextFeedback)) {
      return "";
    }

    const id = feedbackRecordId ?? createSummaryId("hint");
    saveExpressionHintRecord({
      schemaVersion: 1,
      id,
      userMessageId: messageId,
      npcId,
      originalText: text,
      suggestions: {
        casual: nextFeedback.casual.nativeSay,
        normal: nextFeedback.business.nativeSay,
        formal: nextFeedback.formal.nativeSay,
      },
      openedAt: new Date().toISOString(),
      playedStyles: [],
    });

    setFeedbackRecordId(id);
    return id;
  }, [feedbackRecordId, messageId, npcId, text]);

  const recordSuggestionPlayed = useCallback((key: FeedbackLevelKey) => {
    if (feedbackRecordId) {
      markExpressionHintPlayed(feedbackRecordId, mapFeedbackKeyToStyle(key));
    }
  }, [feedbackRecordId]);

  const revokeUserTempAudioUrl = useCallback(() => {
    if (!userTempAudioUrlRef.current) return;
    URL.revokeObjectURL(userTempAudioUrlRef.current);
    userTempAudioUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  useEffect(() => {
    return () => {
      userAudioRef.current?.pause();
      revokeUserTempAudioUrl();
      if (activeManagedAudio) {
        stopActiveManagedAudio();
      } else if (npcAudioRef.current) {
        try {
          npcAudioRef.current.pause();
          npcAudioRef.current.currentTime = 0;
          npcAudioRef.current.onended = null;
          npcAudioRef.current.onerror = null;
          npcAudioRef.current.src = "";
          npcAudioRef.current.load();
        } catch {
          // no-op
        }
      }
      if (npcObjectUrlRef.current) {
        URL.revokeObjectURL(npcObjectUrlRef.current);
        npcObjectUrlRef.current = null;
      }
    };
  }, [revokeUserTempAudioUrl]);

  const handleOpenFeedback = async () => {
    if (drawerOpen) { closeDrawer(); return; }
    setDrawerOpen(true);
    if (feedback) {
      if (!feedbackRecordId) recordExpressionHintOpened(feedback);
      return;
    }
    const language = uiLanguage === "en" ? "en" : "zh";
    const cached = getCachedFeedback(npcId, messageId, text, language);
    if (cached) {
      const restored = fromCachedFeedback(cached);
      if (!hasValidFeedbackSuggestions(restored)) {
        removeCachedFeedback(npcId, messageId, text, language);
        setFeedback(null);
        setFeedbackError(true);
        return;
      }
      setFeedback(restored);
      setFeedbackError(false);
      recordExpressionHintOpened(restored);
      return;
    }
    setLoading(true);
    setFeedbackError(false);
    try {
      const res = await fetch(buildClientApiUrl("/api/feedback"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, uiLanguage: language, npcId: npcId ?? null }),
      });
      if (!res.ok) throw new Error("feedback failed");
      const nextFeedback = (await res.json()) as FeedbackResponse;
      if (!hasValidFeedbackSuggestions(nextFeedback)) {
        throw new Error("invalid feedback");
      }
      setFeedback(nextFeedback);
      setFeedbackError(false);
      setCachedFeedback(npcId, messageId, text, language, toCachedFeedback(nextFeedback));
      recordExpressionHintOpened(nextFeedback);
    } catch (err) {
      console.error(err);
      setFeedbackError(true);
      setFeedback(null);
    } finally { setLoading(false); }
  };

  const handleRegenerateFeedback = async () => {
    const language = uiLanguage === "en" ? "en" : "zh";
    removeCachedFeedback(npcId, messageId, text, language);
    setLoading(true);
    setFeedbackError(false);
    try {
      const res = await fetch(buildClientApiUrl("/api/feedback"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, uiLanguage: language, npcId: npcId ?? null }),
      });
      if (!res.ok) throw new Error("feedback failed");
      const nextFeedback = (await res.json()) as FeedbackResponse;
      if (!hasValidFeedbackSuggestions(nextFeedback)) {
        throw new Error("invalid feedback");
      }
      setFeedback(nextFeedback);
      setFeedbackError(false);
      setCachedFeedback(npcId, messageId, text, language, toCachedFeedback(nextFeedback));
      recordExpressionHintOpened(nextFeedback);
    } catch (err) {
      console.error(err);
      setFeedbackError(true);
    } finally { setLoading(false); }
  };

  const playStandardAudio = async () => {
    const playbackKey = `assistant:${messageId}`;
    if (activeManagedAudio && activeManagedAudio.key === playbackKey && !activeManagedAudio.controller.signal.aborted) {
      stopActiveManagedAudio();
      return;
    }
    if (isNpcAudioLoading) return;

    setIsNpcAudioLoading(true);

    const handleManagedAudioStop = () => {
      if (npcAudioRef.current) {
        try {
          npcAudioRef.current.pause();
          npcAudioRef.current.currentTime = 0;
          npcAudioRef.current.onended = null;
          npcAudioRef.current.onerror = null;
          npcAudioRef.current.src = "";
          npcAudioRef.current.load();
        } catch {
          // no-op: state cleanup should never block UI interaction.
        }
      }
      npcAudioRef.current = null;
      setIsNpcAudioLoading(false);
      setIsNpcAudioPlaying(false);
    };

    try {
      await fetchAndPlayTts(text, npcId, playbackKey, handleManagedAudioStop, npcAudioUrl);
      if (activeManagedAudio?.key !== playbackKey) {
        return;
      }
      npcAudioRef.current = activeManagedAudio.audio;
      setIsNpcAudioLoading(false);
      setIsNpcAudioPlaying(true);
    } catch (error) {
      setIsNpcAudioLoading(false);
      setIsNpcAudioPlaying(false);
      if (npcAudioRef.current) {
        try {
          npcAudioRef.current.pause();
          npcAudioRef.current.currentTime = 0;
          npcAudioRef.current.onended = null;
          npcAudioRef.current.onerror = null;
          npcAudioRef.current.src = "";
          npcAudioRef.current.load();
        } catch {
          // no-op
        }
        npcAudioRef.current = null;
      }
      // Browser autoplay/promise rejection should not lock the UI state.
      console.warn("NPC audio play() rejected or TTS fetch failed.", error);
      if (onPlayNpcAudio && !npcAudioUrl) {
        // Non-blocking fallback: keep compatibility with parent playback hook.
        onPlayNpcAudio();
      }
    }
  };

  const playUserAudio = useCallback(() => {
    setUserAudioError(false);
    userAudioRef.current?.pause();
    revokeUserTempAudioUrl();

    if (userAudioUrl) {
      const audio = new Audio(userAudioUrl);
      userAudioRef.current = audio;
      void audio.play().catch(() => setUserAudioError(true));
      return;
    }

    if (userAudioBlob) {
      const url = URL.createObjectURL(userAudioBlob);
      userTempAudioUrlRef.current = url;
      const audio = new Audio(url);
      userAudioRef.current = audio;
      audio.onended = revokeUserTempAudioUrl;
      audio.onerror = revokeUserTempAudioUrl;
      void audio.play().catch(() => {
        revokeUserTempAudioUrl();
        setUserAudioError(true);
      });
    }
  }, [revokeUserTempAudioUrl, userAudioBlob, userAudioUrl]);

  const handleToggleTranslation = useCallback(async () => {
    if (sender !== "assistant") return;

    if (isTranslationOpen) {
      setIsTranslationOpen(false);
      return;
    }

    if (translationText) {
      setTranslationError(false);
      setIsTranslationOpen(true);
      return;
    }

    if (isTranslating) return;

    setIsTranslating(true);
    setTranslationError(false);
    try {
      const targetLanguage = uiLanguage === "en" ? "en" : "zh";
      const res = await fetch(buildClientApiUrl("/api/translate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          targetLanguage,
        }),
      });
      if (!res.ok) throw new Error("translate failed");
      const json = (await res.json()) as { translation?: string };
      const translated = (json.translation ?? "").trim();
      if (!translated) throw new Error("empty translation");
      setTranslationText(translated);
      setIsTranslationOpen(true);
    } catch (error) {
      console.warn("[chat-bubble] translate failed", error);
      setTranslationError(true);
      setIsTranslationOpen(true);
    } finally {
      setIsTranslating(false);
    }
  }, [isTranslating, isTranslationOpen, sender, text, translationText, uiLanguage]);

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    if (selectedText.length > 80) return;
    const range = selection.getRangeAt(0);
    const anchorNode = range.commonAncestorContainer;
    const elementNode = anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : (anchorNode as Element | null);
    const insideBubble = bubbleRef.current?.contains(anchorNode) ?? false;
    const insideMessageText = elementNode?.closest("[data-message-text='1']") != null;
    if (!insideBubble && !insideMessageText) return;
    const anchorRect = range.getBoundingClientRect();
    if (!anchorRect || (anchorRect.width === 0 && anchorRect.height === 0)) return;
    setPopover({ selectedText, fullSentence: text, anchorRect });
  }, [text]);

  const handleDoubleClick = useCallback(() => {
    requestAnimationFrame(() => { handleTextSelection(); });
  }, [handleTextSelection]);
  const handlePointerSelection = useCallback(() => {
    window.setTimeout(() => {
      handleTextSelection();
    }, 0);
  }, [handleTextSelection]);

  const avatar = sender === "user"
    ? (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8E0CE] text-[#7A7060]">
        <UserIcon size={15} />
      </span>
    )
    : <img src={NPC_AVATARS[npcId]} alt="" className="w-8 h-8 rounded-full object-cover" />;

  return (
    <>
      {/* 娑堟伅琛岋細鏁磋 hover 鎰熺煡鍖哄煙 */}
      <div
        className={`flex flex-col ${sender === "user" ? "items-end" : "items-start"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`flex items-start gap-3 min-w-0 ${
            sender === "user" ? "max-w-[82vw] sm:max-w-[70%] flex-row-reverse" : "max-w-[70%]"
          }`}
        >
          {/* 澶村儚 */}
          <div className="shrink-0 mt-0.5">{avatar}</div>

          {/* 姘旀场 + 澶栭儴鎸夐挳 */}
          <div className={`flex flex-col ${sender === "user" ? "min-w-0 max-w-full" : ""}`}>
            {/* 姘旀场鏈綋锛欶igma primary 鑹?+ card 鑹?+ 绮捐嚧鍦嗚闃村奖 */}
            <div
              ref={bubbleRef}
              onMouseUp={handleTextSelection}
              onPointerUp={handlePointerSelection}
              onTouchEnd={handlePointerSelection}
              onDoubleClick={handleDoubleClick}
              data-message-text="1"
            className={`rounded-2xl px-5 py-3.5 text-[13px] leading-relaxed select-text transition-colors duration-200 ${
                sender === "user"
                  ? "font-ui bg-[#2D4A1F] text-[#F3EDE0] whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-[0_3px_10px_rgba(20,36,12,0.18)]"
                  : "font-ja bg-[#FCF8F0] text-[#28231A] border border-[rgba(40,35,26,0.1)] shadow-[0_2px_8px_rgba(40,35,26,0.06)] hover:border-[rgba(40,35,26,0.15)]"
              }`}
            >
              {text}
            </div>

            {/* 鎸夐挳鍖哄煙锛氭皵娉″閮ㄤ笅鏂癸紝hover 娣″叆 */}
            <div
              className={`flex flex-wrap gap-2 transition-all duration-200 ${
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
              } ${sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {sender === "assistant" && isVoiceMessage && (
                <button
                  type="button"
                  onClick={playStandardAudio}
                  disabled={isNpcAudioLoading}
                  aria-label={isNpcAudioPlaying ? pauseLabel : copy.audio.playNpc}
                  title={isNpcAudioPlaying ? pauseLabel : copy.audio.play}
                  className={actionButtonClass}
                >
                  <VolumeIcon size={12} />
                  <span>
                    {isNpcAudioLoading
                      ? (uiLanguage === "zh" ? "\u64ad\u653e\u4e2d\u2026" : "Playing\u2026")
                      : isNpcAudioPlaying
                        ? pauseLabel
                        : copy.audio.play}
                  </span>
                </button>
              )}
              {sender === "assistant" && (
                <button
                  type="button"
                  onClick={() => { void handleToggleTranslation(); }}
                  disabled={isTranslating}
                  className={actionButtonClass}
                  aria-label={copy.chat.translate}
                  title={copy.chat.translate}
                >
                  <TranslateIcon size={12} />
                  <span>
                    {isTranslating ? copy.chat.translating : copy.chat.translate}
                  </span>
                </button>
              )}
              {hasUserRecording && (
                <button
                  type="button"
                  onClick={playUserAudio}
                  aria-label={copy.feedback.userRecording}
                  title={copy.audio.listenRecording}
                  className={actionButtonClass}
                >
                  <VolumeIcon size={12} />
                  <span>{copy.audio.listenRecording}</span>
                </button>
              )}
              {sender === "user" && (
                <button
                  type="button"
                  onClick={handleOpenFeedback}
                  aria-label={copy.feedback.trigger}
                  title={copy.feedback.trigger}
                  className={`${actionButtonClass} ${drawerOpen ? "bg-[#E8E0CE] text-[#2D4A1F] border-[rgba(40,35,26,0.16)]" : ""}`}
                >
                  <LightbulbIcon size={12} />
                  <span>{copy.feedback.trigger}</span>
                </button>
              )}
            </div>
            {sender === "assistant" && isTranslationOpen && (
              <div className="mt-1.5 rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/65 px-3 py-2">
                {translationError ? (
                  <p className="text-[10px] leading-relaxed text-[#7A7060] break-words">
                    {copy.chat.translationFailed}
                  </p>
                ) : (
                  <p className="text-[10px] leading-relaxed text-[#4A4438] break-words">
                    {translationText}
                  </p>
                )}
              </div>
            )}
            {userAudioError && (
              <p className="mt-1 text-right text-[9px] text-[#9A6B2F]">
                {copy.audio.recordingFailure}
              </p>
            )}
          </div>
        </div>
      </div>

      {popover && (
        <WordPopover
          npcId={npcId}
          messageId={messageId}
          selectedText={popover.selectedText}
          fullSentence={popover.fullSentence}
          anchorRect={popover.anchorRect}
          uiLanguage={uiLanguage}
          onClose={() => { setPopover(null); window.getSelection()?.removeAllRanges(); }}
        />
      )}

      <FeedbackDrawer
        open={drawerOpen} loading={loading} userText={text} feedback={feedback}
        npcId={npcId} messageId={messageId} userAudioBlob={userAudioBlob} userAudioUrl={userAudioUrl} feedbackError={feedbackError} uiLanguage={uiLanguage} onClose={closeDrawer}
        onSuggestionPlayed={recordSuggestionPlayed}
        onRegenerate={handleRegenerateFeedback}
      />
    </>
  );
}
