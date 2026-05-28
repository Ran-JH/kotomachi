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
  saveExpressionHintRecord,
  saveLookupHistory,
  type ExpressionHintStyle,
} from "@/lib/session-summary";
import { LightbulbIcon, UserIcon, VolumeIcon } from "@/components/ui-icons";

/* ============================================================
   Figma Design Tokens → Tailwind 映射
   ─────────────────────────────────────────
   background     #F3EDE0  页面底色（米白）
   foreground     #28231A  主文字（深棕黑）
   card           #FAF6EE  卡片底色（暖白）
   primary        #2D4A1F  主色（深绿）→ 用户气泡
   primary-fg     #F3EDE0  主色上文字
   secondary      #E8E0CE  次色（暖灰）
   secondary-fg   #4A4438  次色上文字
   muted          #D8CFBC  弱化色
   muted-fg       #7A7060  弱化文字
   accent         #C9A84C  琥珀强调
   border         rgba(40,35,26,0.1)
   input-bg       #EDE7D8  输入框底色
   radius         0.75rem  圆角基准
   sidebar        #1E2A16  侧边栏
   sidebar-fg     #D4C8A8  侧边栏文字
   sidebar-accent #253318  侧边栏选中
   ============================================================ */

interface ChatBubbleProps {
  messageId: string;
  sender: "user" | "assistant";
  text: string;
  npcId: NpcId;
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  npcAudioUrl?: string | null;
  onPlayNpcAudio?: () => void;
  isVoiceMessage?: boolean;
}

async function fetchAndPlayTts(text: string, npcId: NpcId): Promise<void> {
  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, npcId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? `TTS 失败 (${res.status})`
    );
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  try {
    await audio.play();
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

/* ============================================================
   划词查词悬浮卡片 — Figma popover 风格
   ============================================================ */

interface ExplainResult {
  pronunciation: string;
  translation: string;
  sentence_meaning: string;
  nuance_explanation: string;
}

interface WordPopoverProps {
  npcId: NpcId;
  messageId: string;
  selectedText: string;
  fullSentence: string;
  anchorRect: DOMRect;
  onClose: () => void;
}

function clampNumber(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function WordPopover({ npcId, messageId, selectedText, fullSentence, anchorRect, onClose }: WordPopoverProps) {
  const [data, setData] = useState<ExplainResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchExplain = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedText, fullSentence }),
        });
        if (!res.ok) throw new Error("explain failed");
        const json = (await res.json()) as ExplainResult;
        if (!cancelled) {
          setData(json);
          saveLookupHistory({
            schemaVersion: 1,
            id: createSummaryId("lookup"),
            npcId,
            word: selectedText,
            reading: json.pronunciation,
            meaning: json.translation,
            sourceSentence: fullSentence,
            messageId,
            createdAt: new Date().toISOString(),
          });
        }
      } catch {
        if (!cancelled) {
          setData({
            pronunciation: "",
            translation: selectedText,
            sentence_meaning: fullSentence,
            nuance_explanation: "ネットワークが不安定です、後でもう一度試してください～",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void fetchExplain();
    return () => { cancelled = true; };
  }, [fullSentence, messageId, npcId, selectedText]);

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
    placement: "top" | "bottom";
  } = (() => {
    const gap = 10;
    const margin = 12;
    const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
    const viewportHeight = typeof window === "undefined" ? 720 : window.innerHeight;
    const width = Math.min(240, Math.max(180, viewportWidth - margin * 2));
    const anchorCenter = anchorRect.left + anchorRect.width / 2;
    const left = clampNumber(anchorCenter, margin + width / 2, viewportWidth - margin - width / 2);
    const spaceAbove = Math.max(0, anchorRect.top - margin - gap);
    const spaceBelow = Math.max(0, viewportHeight - anchorRect.bottom - margin - gap);
    const placement = spaceAbove < 190 && spaceBelow >= spaceAbove ? "bottom" : "top";
    const availableHeight = placement === "bottom" ? spaceBelow : spaceAbove;
    const top = placement === "bottom" ? anchorRect.bottom + gap : anchorRect.top - gap;

    return {
      placement,
      style: {
        position: "fixed",
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        transform: placement === "bottom" ? "translateX(-50%)" : "translate(-50%, -100%)",
        zIndex: 90,
      },
      cardStyle: {
        maxHeight: `${Math.max(140, availableHeight - 12)}px`,
      },
    };
  })();

  return createPortal(
    <div ref={popoverRef} style={popoverLayout.style}>
      {popoverLayout.placement === "bottom" && (
        <div className="flex justify-center -mb-px">
          <div className="w-2 h-2 bg-[#FAF6EE] border-l border-t border-[rgba(40,35,26,0.1)] rotate-45 translate-y-1" />
        </div>
      )}
      {/* popover 卡片：Figma card 底色 + 精致阴影 */}
      <div
        className="bg-[#FAF6EE] border border-[rgba(40,35,26,0.1)] rounded-xl px-3.5 py-2.5 shadow-[0_4px_16px_rgba(40,35,26,0.08),0_1px_3px_rgba(40,35,26,0.06)] overflow-y-auto overscroll-contain"
        style={popoverLayout.cardStyle}
      >
        {loading ? (
          <p className="text-[10px] text-[#7A7060] animate-pulse text-center py-1.5">
            読み込み中…
          </p>
        ) : data && (
          <>
            {/* 单词 + 读音 + 发音按钮 */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <span className="font-ja block text-[13px] font-medium text-[#28231A] leading-snug break-words">{selectedText}</span>
                {data.pronunciation && (
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="font-ja text-[9px] text-[#7A7060]">{data.pronunciation}</span>
                    <button
                      type="button"
                      onClick={() => { void fetchAndPlayTts(selectedText, npcId); }}
                      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[#7A7060] hover:bg-[#E8E0CE]/80 hover:text-[#2D4A1F] transition-colors"
                      title="発音を聞く"
                    >
                      <VolumeIcon size={12} />
                    </button>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-[9px] text-[#7A7060]/45 hover:text-[#28231A] transition-colors leading-none"
              >
                ✕
              </button>
            </div>

            {/* 简短释义 */}
            <p className="font-ui rounded-lg bg-[#F3EDE0]/70 px-2.5 py-2 text-[11px] text-[#2D4A1F] font-medium leading-snug">
              {data.translation}
            </p>

            {/* 整句翻译 */}
            <div className="border-t border-[rgba(40,35,26,0.08)] pt-1.5 mt-1.5">
              <p className="font-ui text-[9px] text-[#7A7060] leading-relaxed break-words">
                {data.sentence_meaning}
              </p>
            </div>

            {/* 詳しく ▼ — 琥珀强调色，平滑展开 */}
            {data.nuance_explanation && (
              <div className="border-t border-[rgba(40,35,26,0.08)] pt-1.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-[9px] text-[#C9A84C] hover:text-[#2D4A1F] transition-colors"
                >
                  <span>詳しく</span>
                  <span className={`transition-transform duration-300 text-[7px] ${expanded ? "rotate-180" : ""}`}>▼</span>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    expanded ? "grid-rows-[1fr] opacity-100 mt-1.5" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-ui text-[9px] text-[#7A7060] leading-relaxed break-words">
                      {data.nuance_explanation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
      {/* 小三角 */}
      {popoverLayout.placement === "top" && (
        <div className="flex justify-center -mt-px">
          <div className="w-2 h-2 bg-[#FAF6EE] border-r border-b border-[rgba(40,35,26,0.1)] rotate-45 -translate-y-1" />
        </div>
      )}
    </div>,
    document.body
  );
}

/* ============================================================
   场合表达反馈抽屉
   ============================================================ */

interface FeedbackDrawerProps {
  open: boolean;
  loading: boolean;
  userText: string;
  feedback: FeedbackResponse | null;
  npcId: NpcId;
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  onClose: () => void;
  onSuggestionPlayed?: (key: FeedbackLevelKey) => void;
}

function FeedbackDrawer({
  open, loading, userText, feedback, npcId, userAudioBlob, userAudioUrl, onClose, onSuggestionPlayed,
}: FeedbackDrawerProps) {
  const [ttsLoadingKey, setTtsLoadingKey] = useState<FeedbackLevelKey | null>(null);
  const [ttsErrorKey, setTtsErrorKey] = useState<FeedbackLevelKey | null>(null);
  const [expandedAnalysisKey, setExpandedAnalysisKey] = useState<FeedbackLevelKey | null>(null);
  const [overflowingAnalysisKeys, setOverflowingAnalysisKeys] = useState<Partial<Record<FeedbackLevelKey, boolean>>>({});
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const userTempAudioUrlRef = useRef<string | null>(null);
  const analysisRefs = useRef<Partial<Record<FeedbackLevelKey, HTMLParagraphElement | null>>>({});
  const hasUserRecording = Boolean(userAudioUrl || userAudioBlob);

  const revokeUserTempAudioUrl = useCallback(() => {
    if (!userTempAudioUrlRef.current) return;
    URL.revokeObjectURL(userTempAudioUrlRef.current);
    userTempAudioUrlRef.current = null;
  }, []);

  const playUserRecording = useCallback(() => {
    revokeUserTempAudioUrl();
    if (userAudioUrl) {
      const audio = new Audio(userAudioUrl);
      userAudioRef.current = audio;
      void audio.play().catch(() => undefined);
      return;
    }
    if (userAudioBlob) {
      const url = URL.createObjectURL(userAudioBlob);
      userTempAudioUrlRef.current = url;
      const audio = new Audio(url);
      userAudioRef.current = audio;
      audio.onended = revokeUserTempAudioUrl;
      audio.onerror = revokeUserTempAudioUrl;
      void audio.play().catch(revokeUserTempAudioUrl);
    }
  }, [revokeUserTempAudioUrl, userAudioBlob, userAudioUrl]);

  const playLevelSample = async (key: FeedbackLevelKey, nativeSay: string) => {
    if (ttsLoadingKey) return;
    onSuggestionPlayed?.(key);
    const sampleText = nativeSay.trim();
    if (!sampleText) {
      setTtsErrorKey(key);
      return;
    }
    setTtsErrorKey(null);
    setTtsLoadingKey(key);
    try { await fetchAndPlayTts(sampleText, npcId); }
    catch { setTtsErrorKey(key); }
    finally { setTtsLoadingKey(null); }
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
      userAudioRef.current?.pause();
      userAudioRef.current = null;
      revokeUserTempAudioUrl();
      setTtsLoadingKey(null);
      setTtsErrorKey(null);
      setExpandedAnalysisKey(null);
      setOverflowingAnalysisKeys({});
    }
  }, [open, revokeUserTempAudioUrl]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col justify-end px-2 sm:px-0">
      <button type="button" aria-label="閉じる" className="absolute inset-0 bg-[#28231A]/15" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-drawer-title"
        className="relative mx-auto w-full max-w-xl max-h-[calc(100dvh-1rem)] sm:max-h-[70vh] flex flex-col rounded-t-2xl bg-[#F3EDE0] shadow-[0_-6px_32px_rgba(40,35,26,0.12)] border-t border-[rgba(40,35,26,0.08)] animate-slide-up"
      >
        {/* 头部 */}
        <div className="shrink-0 px-4 sm:px-6 pt-5 pb-3 border-b border-[rgba(40,35,26,0.08)]">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-6 h-6 rounded-full text-[#7A7060] hover:bg-[rgba(40,35,26,0.06)] hover:text-[#28231A] text-xs leading-none flex items-center justify-center transition-colors"
            aria-label="閉じる"
          >
            ✕
          </button>
          <h2 id="feedback-drawer-title" className="font-ui text-sm font-medium text-[#28231A] tracking-wide mb-0.5">
            話し方を比べよう
          </h2>
          <p className="text-[9px] text-[#7A7060]">場面によって言い方を変えてみよう</p>

          {/* 用户原句 */}
          <div className="mt-3 rounded-lg bg-[#FAF6EE] border border-[rgba(40,35,26,0.08)] px-3 py-2">
            <span className="text-[8px] font-medium text-[#7A7060] uppercase tracking-wider">あなたの言葉</span>
            <p className="font-ui text-xs text-[#28231A] mt-0.5 leading-relaxed break-words [overflow-wrap:anywhere]">{userText}</p>
          </div>

          {hasUserRecording && (
            <button
              type="button"
              onClick={playUserRecording}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg bg-[#2D4A1F] text-[#F3EDE0] py-2 text-[10px] font-medium hover:bg-[#2D4A1F]/90 transition-colors"
            >
              <VolumeIcon size={13} />
              <span>自分の発音を聞く</span>
            </button>
          )}
        </div>

        {/* 三档场合卡片 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5 py-3 space-y-2">
          {loading ? (
            <div className="py-10 text-center">
              <p className="text-xs text-[#7A7060] animate-pulse">分析中…</p>
            </div>
          ) : (
            feedback &&
            FEEDBACK_LEVEL_META.map((meta) => {
              const level = feedback[meta.key];
              const isTtsLoading = ttsLoadingKey === meta.key;
              const isExpanded = expandedAnalysisKey === meta.key;
              const levelLabels: Record<string, { label: string; subtitle: string }> = {
                casual: { label: "カジュアル", subtitle: "親しい友人" },
                business: { label: "ふつう", subtitle: "一般的な場面" },
                formal: { label: "フォーマル", subtitle: "丁寧な場面" },
              };
              const labels = levelLabels[meta.key] || { label: meta.title, subtitle: meta.subtitle };
              const analysisText = level.analysis.trim();
              const hasOverflowingAnalysis = Boolean(overflowingAnalysisKeys[meta.key]);

              return (
                <article key={meta.key} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.08)] px-3.5 sm:px-4 py-3.5">
                  <header className="flex items-center gap-2">
                    <span className="h-8 w-1 shrink-0 rounded-full bg-[#C9A84C]/65" aria-hidden="true" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[11px] font-semibold text-[#28231A]">{labels.label}</h3>
                      <p className="text-[8px] text-[#7A7060]/80">{labels.subtitle}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!!ttsLoadingKey}
                      onClick={() => playLevelSample(meta.key, level.nativeSay)}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] text-[8px] font-medium text-[#2D4A1F] hover:border-[rgba(40,35,26,0.15)] disabled:opacity-40 transition-colors whitespace-nowrap"
                      title="発音を聞く"
                    >
                      {isTtsLoading ? <span className="animate-pulse">…</span> : <><VolumeIcon size={11} /> 聞く</>}
                    </button>
                  </header>
                  <div className="mt-2.5 rounded-lg bg-[#F3EDE0]/60 border-l-2 border-[#C9A84C]/50 px-3 py-2.5">
                    <span className="text-[8px] font-medium text-[#7A7060] tracking-wider">おすすめ</span>
                    <p className="font-ja mt-1 text-[14px] font-medium text-[#2D4A1F] leading-[1.85] whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {level.nativeSay}
                    </p>
                  </div>
                  {ttsErrorKey === meta.key && (
                    <p className="mt-1.5 px-1 text-[9px] text-[#9A6B2F]">
                      音声を再生できませんでした。文字で確認してね。
                    </p>
                  )}
                  <div className="mt-2 px-1">
                    <p
                      ref={setAnalysisRef(meta.key)}
                      className={`font-ui text-[9px] text-[#7A7060] leading-relaxed whitespace-pre-wrap break-words transition-all ${
                        !isExpanded
                          ? "max-h-[4.875em] overflow-hidden"
                          : ""
                      }`}
                    >
                      {analysisText}
                    </p>
                    {hasOverflowingAnalysis && (
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedAnalysisKey(isExpanded ? null : meta.key)}
                        className="mt-2 block text-[9px] font-medium text-[#C9A84C] hover:text-[#2D4A1F] transition-colors"
                      >
                        {isExpanded ? "閉じる" : "詳しく"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>
        <div className="shrink-0 h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>,
    document.body
  );
}

/* ============================================================
   ChatBubble 主组件
   ============================================================ */

function mapFeedbackKeyToStyle(key: FeedbackLevelKey): ExpressionHintStyle {
  return key === "business" ? "normal" : key;
}

export function ChatBubble({
  messageId, sender, text, npcId, userAudioBlob, userAudioUrl, npcAudioUrl, onPlayNpcAudio, isVoiceMessage,
}: ChatBubbleProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [userAudioError, setUserAudioError] = useState(false);
  const [feedbackRecordId, setFeedbackRecordId] = useState<string | null>(null);

  const [popover, setPopover] = useState<{
    selectedText: string; fullSentence: string; anchorRect: DOMRect;
  } | null>(null);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const userTempAudioUrlRef = useRef<string | null>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const hasUserRecording = sender === "user" && Boolean(userAudioUrl || userAudioBlob);

  const recordExpressionHintOpened = useCallback((nextFeedback: FeedbackResponse): string => {
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
    };
  }, [revokeUserTempAudioUrl]);

  const handleOpenFeedback = async () => {
    if (drawerOpen) { closeDrawer(); return; }
    setDrawerOpen(true);
    if (feedback) {
      if (!feedbackRecordId) recordExpressionHintOpened(feedback);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userText: text }),
      });
      if (!res.ok) throw new Error("feedback failed");
      const nextFeedback = (await res.json()) as FeedbackResponse;
      setFeedback(nextFeedback);
      recordExpressionHintOpened(nextFeedback);
    } catch (err) {
      console.error(err);
      const fallbackFeedback: FeedbackResponse = {
        casual: { nativeSay: text, analysis: "【カジュアル】友達との会話にはこんな言い方もあります。" },
        business: { nativeSay: text, analysis: "【ふつう】普段の会話に適した言い方です。" },
        formal: { nativeSay: text, analysis: "【フォーマル】より丁寧な言い方をするとこうなります。" },
      };
      setFeedback(fallbackFeedback);
      recordExpressionHintOpened(fallbackFeedback);
    } finally { setLoading(false); }
  };

  const playStandardAudio = () => {
    if (npcAudioUrl) { new Audio(npcAudioUrl).play(); }
    else if (onPlayNpcAudio) { onPlayNpcAudio(); }
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

  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const selectedText = selection.toString().trim();
    if (!selectedText) return;
    const range = selection.getRangeAt(0);
    if (bubbleRef.current && !bubbleRef.current.contains(range.commonAncestorContainer)) return;
    const anchorRect = range.getBoundingClientRect();
    setPopover({ selectedText, fullSentence: text, anchorRect });
  }, [text]);

  const handleDoubleClick = useCallback(() => {
    requestAnimationFrame(() => { handleTextSelection(); });
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
      {/* 消息行：整行 hover 感知区域 */}
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
          {/* 头像 */}
          <div className="shrink-0 mt-0.5">{avatar}</div>

          {/* 气泡 + 外部按钮 */}
          <div className={`flex flex-col ${sender === "user" ? "min-w-0 max-w-full" : ""}`}>
            {/* 气泡本体：Figma primary 色 + card 色 + 精致圆角阴影 */}
            <div
              ref={bubbleRef}
              onMouseUp={handleTextSelection}
              onDoubleClick={handleDoubleClick}
              className={`rounded-xl px-5 py-3.5 text-[13px] leading-relaxed select-text transition-colors duration-200 ${
                sender === "user"
                  ? "font-ui bg-[#2D4A1F] text-[#F3EDE0] whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
                  : "font-ja bg-[#FAF6EE] text-[#28231A] border border-[rgba(40,35,26,0.1)] shadow-[0_1px_3px_rgba(40,35,26,0.04)] hover:border-[rgba(40,35,26,0.15)]"
              }`}
            >
              {text}
            </div>

            {/* 按钮区域：气泡外部下方，hover 淡入 */}
            <div
              className={`flex gap-2 transition-all duration-200 ${
                isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
              } ${sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {sender === "assistant" && isVoiceMessage && (
                <button
                  type="button"
                  onClick={playStandardAudio}
                  className="mt-1 flex items-center gap-1 text-[9px] text-[#7A7060] hover:text-[#2D4A1F] transition-colors"
                >
                  <VolumeIcon size={11} />
                  <span>再生</span>
                </button>
              )}
              {hasUserRecording && (
                <button
                  type="button"
                  onClick={playUserAudio}
                  className="mt-1 flex items-center gap-1 text-[9px] text-[#7A7060] hover:text-[#2D4A1F] transition-colors"
                >
                  <VolumeIcon size={11} />
                  <span>録音を聞く</span>
                </button>
              )}
              {sender === "user" && (
                <button
                  type="button"
                  onClick={handleOpenFeedback}
                  className={`mt-1 flex items-center gap-1 text-[9px] text-[#7A7060] hover:text-[#2D4A1F] transition-colors ${
                    drawerOpen ? "!opacity-100" : ""
                  }`}
                >
                  <LightbulbIcon size={11} />
                  <span>表現ヒント</span>
                </button>
              )}
            </div>
            {userAudioError && (
              <p className="mt-1 text-right text-[9px] text-[#9A6B2F]">
                録音を再生できませんでした。
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
          onClose={() => { setPopover(null); window.getSelection()?.removeAllRanges(); }}
        />
      )}

      <FeedbackDrawer
        open={drawerOpen} loading={loading} userText={text} feedback={feedback}
        npcId={npcId} userAudioBlob={userAudioBlob} userAudioUrl={userAudioUrl} onClose={closeDrawer}
        onSuggestionPlayed={recordSuggestionPlayed}
      />
    </>
  );
}
