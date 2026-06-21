"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FEEDBACK_LEVEL_META,
  type FeedbackApiResponse,
  type FeedbackLevelKey,
  type FeedbackResponse,
  normalizeRevisionNotes,
  normalizeStructureNote,
} from "@/lib/feedback-types";
import { NPC_AVATARS, type NpcId } from "@/lib/npc";
import {
  createSummaryId,
  markExpressionHintPlayed,
  isValidExpressionHintText,
  saveExpressionHintRecord,
  type ExpressionHintStyle,
} from "@/lib/session-summary";
import { isExpressionSaved, toggleSavedItem, type SavedExpression } from "@/lib/saved-items";
import { getCachedFeedback, setCachedFeedback, removeCachedFeedback, toCachedFeedback, fromCachedFeedback } from "@/lib/expression-hint-cache";
import { getUiCopy } from "@/lib/ui-copy";
import type { UiLanguage } from "@/lib/ui-language";
import { buildClientApiUrl } from "@/lib/client-api-url";
import { SelectableLookupText } from "@/components/selectable-lookup-text";
import { WordPopover } from "@/components/word-popover";
import { LightbulbIcon, TranslateIcon, UserIcon, VolumeIcon } from "@/components/ui-icons";
import { useWordLookupSelection } from "@/components/use-word-lookup";

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

type TtsSessionCacheEntry = {
  audioUrl: string;
};

let activeManagedAudio: ManagedAudioSource | null = null;
let managedAudioRequestSeq = 0;
const TTS_SESSION_CACHE_LIMIT = 50;
const ttsSessionCache = new Map<string, TtsSessionCacheEntry>();

function getTtsPlaybackContext(playbackKey: string): string {
  const [context] = playbackKey.split(":");
  return context?.trim() || "tts";
}

function createTtsSessionCacheKey(
  text: string,
  npcId: NpcId,
  playbackKey: string,
): string | null {
  const normalizedText = text.trim();
  if (!normalizedText) return null;

  return JSON.stringify({
    npcId,
    text: normalizedText,
    context: getTtsPlaybackContext(playbackKey),
  });
}

function getCachedTtsAudioUrl(cacheKey: string): string | null {
  const cached = ttsSessionCache.get(cacheKey);
  if (!cached) return null;

  // 命中时刷新顺序，淘汰时优先移除更久没有复用的音频。
  ttsSessionCache.delete(cacheKey);
  ttsSessionCache.set(cacheKey, cached);
  return cached.audioUrl;
}

function setCachedTtsAudioUrl(cacheKey: string, audioUrl: string): void {
  const existing = ttsSessionCache.get(cacheKey);
  if (existing) {
    ttsSessionCache.delete(cacheKey);
  }

  ttsSessionCache.set(cacheKey, { audioUrl });

  while (ttsSessionCache.size > TTS_SESSION_CACHE_LIMIT) {
    const oldestEntry = ttsSessionCache.entries().next().value as
      | [string, TtsSessionCacheEntry]
      | undefined;
    if (!oldestEntry) break;

    const [oldestKey, oldestCache] = oldestEntry;
    ttsSessionCache.delete(oldestKey);
    URL.revokeObjectURL(oldestCache.audioUrl);
  }
}

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
  const cacheKey = providedAudioUrl
    ? null
    : createTtsSessionCacheKey(text, npcId, playbackKey);
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
      if (cacheKey) {
        audioUrl = getCachedTtsAudioUrl(cacheKey);
      }
    }

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

      if (cacheKey) {
        // 这里只保留页面 session 期间的内存缓存，刷新页面后自然失效。
        setCachedTtsAudioUrl(cacheKey, audioUrl);
      } else {
        cleanup = () => URL.revokeObjectURL(audioUrl as string);
      }
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
  feedbackErrorMessage?: string | null;
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

function renderRevisionNoteCard(
  note: NonNullable<ReturnType<typeof normalizeRevisionNotes>>[number],
  key: string,
  npcId: NpcId,
  uiLanguage: UiLanguage,
  originalPartLabel: string,
  revisedPartLabel: string,
  revisionWhyLabel: string,
) {
  return (
    <div
      key={key}
      className="rounded-md bg-[#FAF6EE] px-2.5 py-2 text-[10px] leading-relaxed text-[#4A4438]"
    >
      {note.originalPart && (
        <p className="break-words [overflow-wrap:anywhere]">
          <span className="text-[9px] font-medium text-[#7A7060]">{originalPartLabel}: </span>
          {note.originalPart}
        </p>
      )}
      {note.revisedPart && (
        <SelectableLookupText
          npcId={npcId}
          uiLanguage={uiLanguage}
          sourceText={note.revisedPart}
          onPlayAudio={(word) => {
            void fetchAndPlayTts(word, npcId, `feedback-revision:${key}:${word}`).catch(() => undefined);
          }}
          className={note.originalPart ? "mt-1" : undefined}
        >
          <p className="break-words [overflow-wrap:anywhere]">
            <span className="text-[9px] font-medium text-[#7A7060]">{revisedPartLabel}: </span>
            {note.revisedPart}
          </p>
        </SelectableLookupText>
      )}
      <p className={`${note.originalPart || note.revisedPart ? "mt-1" : ""} break-words text-[#4A4438] [overflow-wrap:anywhere]`}>
        <span className="text-[9px] font-medium text-[#7A7060]">{revisionWhyLabel}: </span>
        {note.explanation}
      </p>
    </div>
  );
}

function FeedbackDrawer({
  open, loading, userText, feedback, npcId, messageId, userAudioBlob, userAudioUrl, feedbackError, feedbackErrorMessage, uiLanguage, onClose, onSuggestionPlayed, onRegenerate,
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
  const sharedRevisionNotes = normalizeRevisionNotes(feedback?.sharedRevisionNotes);
  const sharedRevisionNotesTitle = uiLanguage === "en" ? "Shared changes" : "共同修改点";
  const usageLabel = uiLanguage === "en" ? "Best for" : "适合这样说";
  const revisionNotesTitleLabel =
    uiLanguage === "en" ? "Register-specific changes" : "这一档的表达差异";
  const originalPartLabel = uiLanguage === "en" ? "Original part" : "原句片段";
  const revisedPartLabel = uiLanguage === "en" ? "Improved" : "优化后";
  const revisionWhyLabel = uiLanguage === "en" ? "Why this works" : "为什么这样改";
  const coreFixesTitle =
    uiLanguage === "en" ? "Things to fix first" : "需要先调整的地方";
  const displayLevelLabels: Record<FeedbackLevelKey, { label: string; subtitle: string }> =
    uiLanguage === "en"
      ? {
          casual: { label: "Casual", subtitle: "カジュアル" },
          business: { label: "Neutral", subtitle: "ニュートラル" },
          formal: { label: "Polite", subtitle: "ポライト" },
        }
      : {
          casual: { label: "亲近随和", subtitle: "カジュアル" },
          business: { label: "普通自然", subtitle: "ニュートラル" },
          formal: { label: "礼貌得体", subtitle: "ポライト" },
        };

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
    const structureNote = normalizeStructureNote(level.structureNote);
    const sharedRevisionNotes = normalizeRevisionNotes(feedback.sharedRevisionNotes);
    const revisionNotes = normalizeRevisionNotes(level.revisionNotes);
    const levelLabel = displayLevelLabels[key].label;
    const item: SavedExpression = {
      id: createSummaryId("saved-expr"),
      type: "expression",
      npcId,
      original: userText,
      suggestion: level.nativeSay,
      level: levelToSavedLevel(key),
      levelLabel,
      ...(level.usage?.trim() ? { usage: level.usage.trim() } : {}),
      note: level.analysis.trim() || undefined,
      source: "feedback",
      sourceMessageId: messageId,
      createdAt: new Date().toISOString(),
      uiLanguageAtSave: uiLanguage === "en" ? "en" : "zh",
      ...(sharedRevisionNotes?.length ? { sharedRevisionNotes } : {}),
      ...(revisionNotes?.length ? { revisionNotes } : {}),
      ...(structureNote ? { structureNote } : {}),
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
            data-lookup-disabled="true"
            className="absolute top-4 right-4 w-6 h-6 rounded-full text-[#7A7060] hover:bg-[rgba(40,35,26,0.06)] hover:text-[#28231A] text-xs leading-none flex items-center justify-center transition-colors"
            aria-label={copy.feedback.close}
          >
            ×
          </button>
          <h2 id="feedback-drawer-title" className="font-ui text-sm font-medium text-[#28231A] tracking-wide mb-0.5">
            {copy.feedback.title}
          </h2>
          <p className="text-[9px] text-[#7A7060]">{copy.feedback.subtitle}</p>
          {!loading && (feedback || feedbackError) && (
            <button
              type="button"
              onClick={onRegenerate}
              data-lookup-disabled="true"
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
              {feedbackErrorMessage || copy.feedback.error}
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
              data-lookup-disabled="true"
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
                <p className="text-xs text-[#7A7060]">{feedbackErrorMessage || copy.feedback.error}</p>
              </div>
            ) : (
              <>
                {sharedRevisionNotes?.length ? (
                  <section className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/45 px-3.5 sm:px-4 py-3">
                    <p className="text-[10px] font-medium text-[#7A7060]">{coreFixesTitle}</p>
                    <div className="mt-2 space-y-2">
                      {sharedRevisionNotes.map((note, index) =>
                        renderRevisionNoteCard(
                          note,
                          `shared-${index}`,
                          npcId,
                          uiLanguage,
                          originalPartLabel,
                          revisedPartLabel,
                          revisionWhyLabel,
                        )
                      )}
                    </div>
                  </section>
                ) : null}
                {FEEDBACK_LEVEL_META.filter(meta => feedback[meta.key].nativeSay.trim()).map((meta) => {
                const level = feedback[meta.key];
                const isTtsLoading = ttsLoadingKey === meta.key;
                const isTtsPlaying = ttsPlayingKey === meta.key;
                const isTtsActive = isTtsLoading || isTtsPlaying;
                const isExpanded = expandedAnalysisKey === meta.key;
                const displayLabels = displayLevelLabels[meta.key] || {
                  label: meta.title,
                  subtitle: meta.subtitle,
                };
                const analysisText = level.analysis.trim();
                const analysisSections = parseFeedbackAnalysisSections(analysisText);
                const usageText = level.usage?.trim() || analysisSections.usage;
                const parsedDetailText = [analysisSections.reason, analysisSections.details]
                  .filter((section): section is string => Boolean(section && section.trim()))
                  .join(" ")
                  .trim();
                const detailText = parsedDetailText || (level.usage?.trim() ? analysisText : "");
                const revisionNotes = normalizeRevisionNotes(level.revisionNotes);
                const hasRevisionNotes = Boolean(revisionNotes?.length);
                const structureNote = normalizeStructureNote(level.structureNote);
                const hasExtraDetails =
                  hasRevisionNotes || Boolean(detailText) || Boolean(structureNote);
                const hasOverflowingAnalysis = Boolean(overflowingAnalysisKeys[meta.key]);
                const structureTitle = uiLanguage === "en" ? "Structure" : "表达结构";
                const structureExampleLabel = uiLanguage === "en" ? "Example" : "例";
                const revisionNotesTitle = revisionNotesTitleLabel;

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
                        data-lookup-disabled="true"
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
                        data-lookup-disabled="true"
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
                      <SelectableLookupText
                        npcId={npcId}
                        uiLanguage={uiLanguage}
                        sourceText={level.nativeSay}
                        onPlayAudio={(word) => {
                          void fetchAndPlayTts(word, npcId, `feedback-lookup:${meta.key}:${word}`).catch(() => undefined);
                        }}
                      >
                        <p className="font-ja mt-1 text-[15px] sm:text-[16px] font-medium text-[#2D4A1F] leading-[1.8] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                          {level.nativeSay}
                        </p>
                      </SelectableLookupText>
                    </div>
                    {ttsErrorKey === meta.key && (
                      <p className="mt-1.5 px-1 text-[9px] text-[#9A6B2F]">
                        {copy.feedback.listenFailure}
                      </p>
                    )}
                    <div className="mt-2.5 space-y-2">
                      {usageText && (
                        <div className="rounded-md bg-[#F3EDE0]/55 px-2.5 py-2">
                          <p className="text-[9px] font-medium text-[#7A7060]">{usageLabel}</p>
                          <p className="mt-0.5 text-[10px] sm:text-[11px] leading-relaxed text-[#4A4438] break-words">
                            {usageText}
                          </p>
                        </div>
                      )}
                      {detailText && !hasRevisionNotes && (
                        <p
                          ref={setAnalysisRef(meta.key)}
                          className={`font-ui text-[10px] text-[#7A7060] leading-relaxed whitespace-pre-wrap break-words transition-all ${
                            !isExpanded ? "max-h-[4.8em] overflow-hidden" : ""
                          }`}
                        >
                          {detailText}
                        </p>
                      )}
                      {hasExtraDetails && (hasRevisionNotes || hasOverflowingAnalysis || Boolean(structureNote)) && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          onClick={() => setExpandedAnalysisKey(isExpanded ? null : meta.key)}
                          data-lookup-disabled="true"
                          className="block text-[9px] font-medium text-[#C9A84C] hover:text-[#2D4A1F] transition-colors"
                        >
                          {isExpanded ? copy.feedback.hideDetails : copy.feedback.showDetails}
                        </button>
                      )}
                      {hasRevisionNotes && isExpanded && (
                        // Show fragment-level rewrite notes only when expanded so the stable card stays compact.
                        <div className="rounded-md border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/45 px-2.5 py-2.5">
                          <p className="text-[9px] font-medium text-[#7A7060]">{revisionNotesTitle}</p>
                          <div className="mt-2 space-y-2">
                            {revisionNotes?.map((note, index) =>
                              renderRevisionNoteCard(
                                note,
                                `${meta.key}-${index}`,
                                npcId,
                                uiLanguage,
                                originalPartLabel,
                                revisedPartLabel,
                                revisionWhyLabel,
                              )
                            )}
                          </div>
                          {detailText && (
                            <p className="mt-2 whitespace-pre-wrap break-words text-[10px] text-[#7A7060] [overflow-wrap:anywhere]">
                              {detailText}
                            </p>
                          )}
                        </div>
                      )}
                      {structureNote && isExpanded && (
                        <div className="rounded-lg border border-[rgba(201,168,76,0.18)] bg-[#F6EFD9]/72 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 h-10 w-1 shrink-0 rounded-full bg-[#C9A84C]/65" aria-hidden="true" />
                            <div className="min-w-0 flex-1 text-[10px] leading-relaxed text-[#4A4438]">
                              <p className="text-[9px] font-medium tracking-wide text-[#6F5B22]">
                                {structureTitle}
                              </p>
                              {structureNote.pattern && (
                                <SelectableLookupText
                                  npcId={npcId}
                                  uiLanguage={uiLanguage}
                                  sourceText={structureNote.pattern}
                                  onPlayAudio={(word) => {
                                    void fetchAndPlayTts(word, npcId, `feedback-structure:${meta.key}:${word}`).catch(() => undefined);
                                  }}
                                >
                                  <p className="font-ja mt-1 break-words text-[12px] font-medium text-[#2D4A1F] [overflow-wrap:anywhere]">
                                    {structureNote.pattern}
                                  </p>
                                </SelectableLookupText>
                              )}
                              {structureNote.explanation && (
                                <p className="mt-1.5 break-words text-[10px] text-[#4A4438] [overflow-wrap:anywhere]">
                                  {structureNote.explanation}
                                </p>
                              )}
                              {structureNote.examples?.map((example, index) => (
                                <SelectableLookupText
                                  key={`${meta.key}-structure-example-${index}`}
                                  npcId={npcId}
                                  uiLanguage={uiLanguage}
                                  sourceText={example}
                                  onPlayAudio={(word) => {
                                    void fetchAndPlayTts(word, npcId, `feedback-example:${meta.key}:${index}:${word}`).catch(() => undefined);
                                  }}
                                  className="mt-1"
                                >
                                  <p className="break-words text-[9px] text-[#7A7060] [overflow-wrap:anywhere]">
                                    {structureExampleLabel}: {example}
                                  </p>
                                </SelectableLookupText>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
              </>
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

function debugExpressionHintClient(message: string, details?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "production") return;
  if (details) {
    console.debug(`[Expression Hint] ${message}`, details);
    return;
  }
  console.debug(`[Expression Hint] ${message}`);
}

function hasValidFeedbackSuggestions(feedback: FeedbackResponse): boolean {
  return FEEDBACK_LEVEL_META.some((meta) => isValidExpressionHintText(feedback[meta.key].nativeSay));
}

function getFeedbackErrorMessage(
  uiLanguage: UiLanguage,
  payload?: { message?: string } | null
): string {
  const fallback =
    uiLanguage === "en"
      ? "Expression hint failed to generate. Please try again."
      : "表达提示生成失败了，可以再试一次。";

  return payload?.message?.trim() || fallback;
}

function unwrapFeedbackApiResponse(
  payload: FeedbackApiResponse | FeedbackResponse
): {
  feedback: FeedbackResponse | null;
  fallbackUsed: boolean;
  message?: string;
  ok: boolean;
} {
  if ("ok" in payload) {
    if (payload.ok) {
      return {
        ok: true,
        feedback: payload.feedback,
        fallbackUsed: payload.fallbackUsed === true,
      };
    }

    return {
      ok: false,
      feedback: null,
      fallbackUsed: false,
      message: payload.message,
    };
  }

  return {
    ok: true,
    feedback: payload,
    fallbackUsed: false,
  };
}

export function ChatBubble({
  messageId, sender, text, npcId, uiLanguage = "zh", userAudioBlob, userAudioUrl, npcAudioUrl, onPlayNpcAudio, isVoiceMessage,
}: ChatBubbleProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [userAudioError, setUserAudioError] = useState(false);
  const [isUserAudioPlaying, setIsUserAudioPlaying] = useState(false);
  const [feedbackRecordId, setFeedbackRecordId] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [feedbackErrorMessage, setFeedbackErrorMessage] = useState<string | null>(null);
  const [isNpcAudioLoading, setIsNpcAudioLoading] = useState(false);
  const [isNpcAudioPlaying, setIsNpcAudioPlaying] = useState(false);
  const [isTranslationOpen, setIsTranslationOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationText, setTranslationText] = useState<string | null>(null);
  const [translationError, setTranslationError] = useState(false);


  const bubbleRef = useRef<HTMLDivElement>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const userTempAudioUrlRef = useRef<string | null>(null);
  const npcAudioRef = useRef<HTMLAudioElement | null>(null);
  const npcObjectUrlRef = useRef<string | null>(null);
  const copy = getUiCopy(uiLanguage);
  const pauseLabel = uiLanguage === "zh" ? "\u6682\u505c" : "Pause";
  const userRecordingLabel = uiLanguage === "zh" ? "回听" : copy.audio.listenRecording;
  const actionButtonClass =
    "mt-1 inline-flex items-center gap-1.5 rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0]/72 px-2.5 py-1 text-[9px] text-[#6F6658] transition-colors hover:bg-[#E8E0CE] hover:text-[#2D4A1F] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60";
  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setFeedbackError(false);
    setFeedbackErrorMessage(null);
  }, []);
  const hasUserRecording = sender === "user" && Boolean(userAudioUrl || userAudioBlob);
  const {
    lookupState,
    closeLookup,
    handleLookupMouseUp,
    handleLookupDoubleClick,
    handleLookupPointerUp,
  } = useWordLookupSelection({
    rootRef: bubbleRef,
    npcId,
    uiLanguage,
    sourceText: text,
    sourceMessageId: messageId,
  });

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
      debugExpressionHintClient("cache bypass: in-memory feedback already open", {
        messageId,
      });
      if (!feedbackRecordId) recordExpressionHintOpened(feedback);
      return;
    }
    const language = uiLanguage === "en" ? "en" : "zh";
    const cached = getCachedFeedback(npcId, messageId, text, language);
    if (cached) {
      debugExpressionHintClient("cache hit", {
        messageId,
        npcId,
        uiLanguage: language,
      });
      const restored = fromCachedFeedback(cached);
      if (!hasValidFeedbackSuggestions(restored)) {
        removeCachedFeedback(npcId, messageId, text, language);
        debugExpressionHintClient("cache invalidated", {
          messageId,
          npcId,
          uiLanguage: language,
        });
      } else {
        setFeedback(restored);
        setFeedbackError(false);
        setFeedbackErrorMessage(null);
        recordExpressionHintOpened(restored);
        return;
      }
    }
    debugExpressionHintClient("cache miss", {
      messageId,
      npcId,
      uiLanguage: language,
    });
    setLoading(true);
    setFeedbackError(false);
    setFeedbackErrorMessage(null);
    try {
      const res = await fetch(buildClientApiUrl("/api/feedback"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, uiLanguage: language, npcId: npcId ?? null, forceRefresh: false }),
      });
      const payload = (await res.json()) as FeedbackApiResponse | FeedbackResponse;
      const unwrapped = unwrapFeedbackApiResponse(payload);
      if (!res.ok || !unwrapped.ok || !unwrapped.feedback) {
        const message = getFeedbackErrorMessage(
          language,
          !unwrapped.ok ? { message: unwrapped.message } : null
        );
        debugExpressionHintClient("cache skipped due to request_failed", {
          messageId,
          npcId,
          uiLanguage: language,
          reason: message,
        });
        setFeedbackError(true);
        setFeedbackErrorMessage(message);
        setFeedback(null);
        return;
      }
      const nextFeedback = unwrapped.feedback;
      if (!hasValidFeedbackSuggestions(nextFeedback)) {
        throw new Error("invalid feedback");
      }
      setFeedback(nextFeedback);
      setFeedbackError(false);
      setFeedbackErrorMessage(null);
      if (unwrapped.fallbackUsed) {
        debugExpressionHintClient("cache skipped due to fallbackUsed", {
          messageId,
          npcId,
          uiLanguage: language,
        });
      } else {
        setCachedFeedback(npcId, messageId, text, language, toCachedFeedback(nextFeedback));
      }
      recordExpressionHintOpened(nextFeedback);
    } catch (err) {
      console.error(err);
      setFeedbackError(true);
      setFeedbackErrorMessage(getFeedbackErrorMessage(language));
      setFeedback(null);
    } finally { setLoading(false); }
  };

  const handleRegenerateFeedback = async () => {
    const language = uiLanguage === "en" ? "en" : "zh";
    removeCachedFeedback(npcId, messageId, text, language);
    debugExpressionHintClient("cache bypass: regenerate", {
      messageId,
      npcId,
      uiLanguage: language,
    });
    setLoading(true);
    setFeedbackError(false);
    setFeedbackErrorMessage(null);
    try {
      const res = await fetch(buildClientApiUrl("/api/feedback"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text, uiLanguage: language, npcId: npcId ?? null, forceRefresh: true }),
      });
      const payload = (await res.json()) as FeedbackApiResponse | FeedbackResponse;
      const unwrapped = unwrapFeedbackApiResponse(payload);
      if (!res.ok || !unwrapped.ok || !unwrapped.feedback) {
        const message = getFeedbackErrorMessage(
          language,
          !unwrapped.ok ? { message: unwrapped.message } : null
        );
        debugExpressionHintClient("cache skipped due to request_failed", {
          messageId,
          npcId,
          uiLanguage: language,
          reason: message,
        });
        setFeedback(null);
        setFeedbackError(true);
        setFeedbackErrorMessage(message);
        return;
      }
      const nextFeedback = unwrapped.feedback;
      if (!hasValidFeedbackSuggestions(nextFeedback)) {
        throw new Error("invalid feedback");
      }
      setFeedback(nextFeedback);
      setFeedbackError(false);
      setFeedbackErrorMessage(null);
      if (unwrapped.fallbackUsed) {
        debugExpressionHintClient("cache skipped due to fallbackUsed", {
          messageId,
          npcId,
          uiLanguage: language,
        });
      } else {
        setCachedFeedback(npcId, messageId, text, language, toCachedFeedback(nextFeedback));
      }
      recordExpressionHintOpened(nextFeedback);
    } catch (err) {
      console.error(err);
      setFeedbackError(true);
      setFeedbackErrorMessage(getFeedbackErrorMessage(language));
      setFeedback(null);
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

  const stopUserAudio = useCallback(() => {
    if (!userAudioRef.current) return;
    try {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
      userAudioRef.current.onended = null;
      userAudioRef.current.onerror = null;
      userAudioRef.current.src = "";
      userAudioRef.current.load();
    } catch {
      // no-op
    }
    userAudioRef.current = null;
    setIsUserAudioPlaying(false);
    revokeUserTempAudioUrl();
  }, [revokeUserTempAudioUrl]);

  const playUserAudio = useCallback(() => {
    setUserAudioError(false);
    if (isUserAudioPlaying) {
      stopUserAudio();
      return;
    }
    stopUserAudio();

    const bindUserAudio = (audio: HTMLAudioElement) => {
      userAudioRef.current = audio;
      audio.onended = () => {
        setIsUserAudioPlaying(false);
        revokeUserTempAudioUrl();
      };
      audio.onerror = () => {
        setIsUserAudioPlaying(false);
        revokeUserTempAudioUrl();
        setUserAudioError(true);
      };
      setIsUserAudioPlaying(true);
      void audio.play().catch(() => {
        stopUserAudio();
        setUserAudioError(true);
      });
    };

    if (userAudioUrl) {
      const audio = new Audio(userAudioUrl);
      bindUserAudio(audio);
      return;
    }

    if (userAudioBlob) {
      const url = URL.createObjectURL(userAudioBlob);
      userTempAudioUrlRef.current = url;
      const audio = new Audio(url);
      bindUserAudio(audio);
    }
  }, [isUserAudioPlaying, revokeUserTempAudioUrl, stopUserAudio, userAudioBlob, userAudioUrl]);

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


  const avatar = sender === "user"
    ? (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E8E0CE] text-[#7A7060]">
        <UserIcon size={15} />
      </span>
    )
    : <img src={NPC_AVATARS[npcId]} alt="" className="w-8 h-8 rounded-full object-cover" />;

  return (
    <>
      <div
        className={`flex flex-col ${sender === "user" ? "items-end" : "items-start"}`}
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
              onMouseUp={handleLookupMouseUp}
              onPointerUp={handleLookupPointerUp}
              onTouchEnd={handleLookupPointerUp}
              onDoubleClick={handleLookupDoubleClick}
              data-message-text="1"
            className={`rounded-2xl px-5 py-3.5 text-[13px] leading-relaxed select-text transition-colors duration-200 ${
                sender === "user"
                  ? "font-ui bg-[#2D4A1F] text-[#F3EDE0] whitespace-pre-wrap break-words [overflow-wrap:anywhere] shadow-[0_3px_10px_rgba(20,36,12,0.18)]"
                  : "font-ja bg-[#FCF8F0] text-[#28231A] border border-[rgba(40,35,26,0.1)] shadow-[0_2px_8px_rgba(40,35,26,0.06)] hover:border-[rgba(40,35,26,0.15)]"
              }`}
            >
              {text}
            </div>

            {/* 消息操作常驻显示：桌面端和移动端都能直接点到。 */}
            <div
              className={`flex flex-wrap gap-2 ${sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {hasUserRecording && (
                <button
                  type="button"
                  onClick={playUserAudio}
                  aria-label={isUserAudioPlaying ? pauseLabel : copy.feedback.userRecording}
                  title={isUserAudioPlaying ? pauseLabel : copy.feedback.userRecording}
                  className={actionButtonClass}
                >
                  <VolumeIcon size={12} />
                  <span>{isUserAudioPlaying ? pauseLabel : userRecordingLabel}</span>
                </button>
              )}
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

      {lookupState && (
        <WordPopover
          npcId={npcId}
          selectedText={lookupState.selectedText}
          fullSentence={lookupState.fullSentence}
          anchorRect={lookupState.anchorRect}
          uiLanguage={uiLanguage}
          sourceMessageId={lookupState.sourceMessageId}
          onPlayAudio={(word) => {
            void fetchAndPlayTts(word, npcId, `lookup:${messageId}:${word}`).catch(() => undefined);
          }}
          onClose={closeLookup}
        />
      )}

      <FeedbackDrawer
        open={drawerOpen} loading={loading} userText={text} feedback={feedback}
        npcId={npcId} messageId={messageId} userAudioBlob={userAudioBlob} userAudioUrl={userAudioUrl} feedbackError={feedbackError} feedbackErrorMessage={feedbackErrorMessage} uiLanguage={uiLanguage} onClose={closeDrawer}
        onSuggestionPlayed={recordSuggestionPlayed}
        onRegenerate={handleRegenerateFeedback}
      />
    </>
  );
}
