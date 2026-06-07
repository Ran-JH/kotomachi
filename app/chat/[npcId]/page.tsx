﻿"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import { ChatSummaryDetail } from "@/components/chat-summary-detail";
import { ChatToast } from "@/components/chat-toast";
import { TimeDivider, shouldShowTimeDivider, MESSAGE_TIME_DIVIDER_GAP_MS } from "@/components/chat-time-divider";
import { LanguageToggle } from "@/components/language-toggle";
import { SavedItemsPanel } from "@/components/saved-items-panel";
import { KeyboardIcon, MenuIcon, MicIcon } from "@/components/ui-icons";
import { detectNonJapaneseSpans } from "@/lib/non-japanese-spans";
import { buildClientApiUrl } from "@/lib/client-api-url";
import {
  getConversationScene,
  getConversationScenesForNpc,
  type ConversationSceneId,
} from "@/lib/conversation-scenes";
import { getUiCopy } from "@/lib/ui-copy";
import { loadUiLanguage, saveUiLanguage, type UiLanguage } from "@/lib/ui-language";
import {
  getLocalNPCMemories,
  getConversationCount,
  getLastChatTime,
  loadChatHistory,
  saveChatHistory,
  saveLastChatTime,
  saveLocalNPCFacts,
  saveLocalNPCMemory,
  incrementConversationCount,
  clearNpcChatData,
  type StoredMessage,
} from "@/lib/memory";
import { getLocalDateContext, isNpcId, NPC_AVATARS, getNpcState, getWorldContext, type NpcId } from "@/lib/npc";
import {
  SAVED_ITEMS_UPDATED_EVENT,
  loadSavedItems,
  removeSavedItem,
  type SavedItem,
} from "@/lib/saved-items";
import {
  createSummarySourceInfo,
  createSummaryId,
  deleteSummaryCard,
  findSummaryCardByFingerprint,
  loadRecentExpressionHints,
  loadRecentLookups,
  loadSummaryCards,
  saveSummaryCard,
  type SessionSummaryApiCard,
  type SessionSummaryCard,
  type SessionSummaryMessage,
} from "@/lib/session-summary";

/* ============================================================
   Figma Design Tokens
   background     #F3EDE0   页面底色
   foreground     #28231A   主文字
   card           #FAF6EE   卡片
   primary        #2D4A1F   主色
   primary-fg     #F3EDE0   主色上文字
   secondary      #E8E0CE   次色
   muted          #D8CFBC   弱化
   muted-fg       #7A7060   弱化文字
   accent         #C9A84C   琥珀
   border         rgba(40,35,26,0.1)
   input-bg       #EDE7D8   输入框
   sidebar        #1E2A16   侧边栏底色
   sidebar-fg     #D4C8A8   侧边栏文字
   sidebar-accent #253318   侧边栏选中
   sidebar-primary #C9A84C  侧边栏强调
   sidebar-border rgba(255,255,255,0.06)
   ============================================================ */

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  type: "text" | "voice";
  createdAt?: string;
  source?: "welcome" | "scene";
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  npcAudioUrl?: string | null;
}

interface LocalChatMarker {
  id: string;
  type: "scene-exit";
  afterMessageId: string | null;
  createdAt: string;
}

interface WelcomeResponse {
  extractedFacts?: string[];
  welcomeMessage?: string;
}

const welcomeRequests = new Map<string, Promise<WelcomeResponse | null>>();

function countUserMessages(history: StoredMessage[]): number {
  return history.filter((message) => message.role === "user").length;
}

function getRecentAssistantMessages(history: StoredMessage[]): string[] {
  return history
    .filter((message) => message.role === "assistant")
    .map((message) => message.content)
    .slice(-3);
}

function hashText(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function sanitizeAssistantSceneText(text: string): string {
  let result = text;
  
  const stageDirectionPatterns = [
    /[（(［\[][^）)\]］]*[）)\]］]\s*/g,
    /\*[^*]+\*\s*/g,
    /\[[^\]]+\]\s*/g,
  ];

  for (const pattern of stageDirectionPatterns) {
    result = result.replace(pattern, "");
  }

  return result.trim();
}

const REVIEW_FILLER_PATTERNS = [
  "approximate meaning; check sentence context",
  "meaning in this chat context",
  "meaning explained in this chat context",
  "a reusable line that sounds natural in everyday conversation",
  "useful when you want to talk naturally about this",
  "this rewrite keeps your intent",
  "this rewrites your sentence into natural japanese",
  "a useful expression",
  "a word from this conversation",
];

const REVIEW_BAD_NEXT_TOPIC_PATTERNS = [
  "keep going with",
  "how it relates to your night routine, drinks, or sleep",
  "talk about something interesting",
  "one small recent moment",
  "talk about how you felt",
];
const ONBOARDING_HINT_DISMISSED_KEY = "kotomachi_onboarding_hint_dismissed";
const REVISIT_WELCOME_IDLE_MS = 2 * 60 * 60 * 1000;

function isReviewFiller(value: string | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return false;
  return REVIEW_FILLER_PATTERNS.some((pattern) => text.includes(pattern));
}

function isBadReviewNextTopic(value: string | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  if (!text) return false;
  return REVIEW_BAD_NEXT_TOPIC_PATTERNS.some((pattern) => text.includes(pattern));
}

function createWelcomeSourceFingerprint(npcId: NpcId, history: StoredMessage[]): string {
  const source = history
    .map((message) => `${message.role}:${message.content}`)
    .join("\n");
  return `${npcId}:${history.length}:${countUserMessages(history)}:${hashText(source)}`;
}

function getRevisitWelcomeMarkerKey(npcId: NpcId): string {
  return `kotomachi_revisit_welcome_marker_${npcId}`;
}

function getSessionVisitKey(npcId: NpcId): string {
  return `kotomachi_session_visit_${npcId}`;
}

function hasSeenNpcThisSession(npcId: NpcId): boolean {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(getSessionVisitKey(npcId)) === "1";
  } catch {
    return true;
  }
}

function markNpcSeenThisSession(npcId: NpcId): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(getSessionVisitKey(npcId), "1");
  } catch {
    // sessionStorage 不可用时，只跳过再访 welcome，不影响主聊天。
  }
}

function loadRevisitWelcomeMarker(
  npcId: NpcId,
): { userMessageCount: number; sourceFingerprint: string; triggeredAt?: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getRevisitWelcomeMarkerKey(npcId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{
      userMessageCount: number;
      sourceFingerprint: string;
      triggeredAt: number;
    }>;
    if (
      typeof parsed.userMessageCount === "number" &&
      typeof parsed.sourceFingerprint === "string"
    ) {
      return {
        userMessageCount: parsed.userMessageCount,
        sourceFingerprint: parsed.sourceFingerprint,
        triggeredAt: typeof parsed.triggeredAt === "number" ? parsed.triggeredAt : undefined,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function saveRevisitWelcomeMarker(
  npcId: NpcId,
  marker: { userMessageCount: number; sourceFingerprint: string; triggeredAt?: number },
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getRevisitWelcomeMarkerKey(npcId), JSON.stringify(marker));
  } catch {
    // LocalStorage 写入失败不应该影响聊天主流程。
  }
}

const NPC_LIST: { id: NpcId; name: string; subname: string; location: string }[] = [
  { id: "aoi", name: "葵", subname: "あおい", location: "学生ラウンジ" },
  { id: "haruka", name: "遥", subname: "はるか", location: "研究室" },
  { id: "kimura", name: "木村", subname: "きむら", location: "コンビニ" },
  { id: "misaki", name: "美咲", subname: "みさき", location: "カフェ" },
  { id: "taisho", name: "大将", subname: "たいしょう", location: "居酒屋" },
  { id: "nana", name: "七海", subname: "ななみ", location: "まちの生活サポートラウンジ" },
];

import { getStatusAwareTopicIdea, pickStarterPrompts } from "@/lib/starter-prompts";

export default function ChatPage() {
  const params = useParams();
  const rawNpcId = params.npcId as string;
  const npcId: NpcId = isNpcId(rawNpcId) ? rawNpcId : "misaki";

  const [inputText, setInputText] = useState("");
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [summaryCards, setSummaryCards] = useState<SessionSummaryCard[]>([]);
  const [allSummaryCards, setAllSummaryCards] = useState<SessionSummaryCard[]>([]);
  const [selectedSummaryCard, setSelectedSummaryCard] = useState<SessionSummaryCard | null>(null);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [summaryToast, setSummaryToast] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh");
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [isSavedPanelOpen, setIsSavedPanelOpen] = useState(false);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [isInputActionsOpen, setIsInputActionsOpen] = useState(false);
  const [isScenePickerOpen, setIsScenePickerOpen] = useState(false);
  const [isTopicIdeasOpen, setIsTopicIdeasOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isOnboardingHintDismissed, setIsOnboardingHintDismissed] = useState(false);
  const [isInputComposing, setIsInputComposing] = useState(false);
  const [isStandaloneMode, setIsStandaloneMode] = useState(false);
  const [topicIdeas, setTopicIdeas] = useState<string[] | null>(null);
  const [isTopicIdeasLoading, setIsTopicIdeasLoading] = useState(false);
  const [topicIdeasForceRefreshKey, setTopicIdeasForceRefreshKey] = useState<string | null>(null);
  // Guided scenario v0.1：只保留当前页临时状态，不写入本地存储。
  const [activeSceneId, setActiveSceneId] = useState<ConversationSceneId | null>(null);
  const [localChatMarkers, setLocalChatMarkers] = useState<LocalChatMarker[]>([]);
  const copy = getUiCopy(uiLanguage);
  const savedExpressionCount = savedItems.filter((item) => item.type === "expression").length;
  const savedWordCount = savedItems.filter((item) => item.type === "word").length;
  const savedTotalCount = savedExpressionCount + savedWordCount;
  const savedEntrySubtitle = savedTotalCount === 0
    ? (uiLanguage === "zh" ? "还没有收藏" : "No saved items yet")
    : (uiLanguage === "zh"
      ? `已保存 ${savedTotalCount} 个表达和词语`
      : `${savedTotalCount} saved words & expressions`);
  const reviewEntrySubtitle = allSummaryCards.length === 0
    ? (uiLanguage === "zh" ? "还没有回顾卡" : "No review cards yet")
    : (uiLanguage === "zh"
      ? `已生成 ${allSummaryCards.length} 张回顾卡`
      : `${allSummaryCards.length} review cards`);
  const savedPanelSummary = uiLanguage === "zh"
    ? `已保存 ${savedExpressionCount} 个表达，${savedWordCount} 个词语`
    : `${savedExpressionCount} expressions, ${savedWordCount} words saved`;
  const reviewPanelSummary = uiLanguage === "zh"
    ? `已生成 ${allSummaryCards.length} 张回顾卡`
    : `${allSummaryCards.length} review cards created`;
  const reviewDisabledHint = uiLanguage === "zh" ? "最近聊天太少，先多聊几句再生成" : "Not enough recent chat yet";

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const npcAudioCacheRef = useRef<Map<string, string>>(new Map());
  const userAudioUrlsRef = useRef<string[]>([]);
  const activeNpcRef = useRef<NpcId>(npcId);
  const generatedInitialWelcomeForNpcRef = useRef<Set<NpcId>>(new Set());
  const generatedRevisitWelcomeSourcesRef = useRef<Set<string>>(new Set());
  const voiceHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summaryToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputActionsRef = useRef<HTMLDivElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const starterAppliedRef = useRef(false);
  const topicIdeasCacheRef = useRef<Map<string, string[]>>(new Map());
  const searchParams = useSearchParams();
  const availableScenes = useMemo(() => getConversationScenesForNpc(npcId), [npcId]);
  const activeScene = useMemo(() => getConversationScene(activeSceneId), [activeSceneId]);
  const activeSceneResponseOptions = useMemo(
    () => activeScene?.responseOptionsJa ?? activeScene?.fallbackUserLines ?? [],
    [activeScene],
  );
  const getSceneDisplayTitle = (scene: { title: string; titleZh?: string; titleEn?: string }) => {
    if (uiLanguage === "en") return scene.titleEn ?? scene.title;
    return scene.titleZh ?? scene.title;
  };

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);
  useEffect(() => {
    const audioUrls = userAudioUrlsRef.current;
    return () => { audioUrls.forEach((url) => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => {
    return () => {
      if (voiceHintTimerRef.current) clearTimeout(voiceHintTimerRef.current);
      if (summaryToastTimerRef.current) clearTimeout(summaryToastTimerRef.current);
    };
  }, []);
  useEffect(() => {
    if (!isInputActionsOpen) return;
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (inputActionsRef.current?.contains(target)) return;
      setIsInputActionsOpen(false);
    };
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [isInputActionsOpen]);
  useEffect(() => {
    if (isInputActionsOpen) return;
    setIsScenePickerOpen(false);
  }, [isInputActionsOpen]);
  useEffect(() => {
    if (!isInputActionsOpen) setIsTopicIdeasOpen(false);
  }, [isInputActionsOpen]);
  useEffect(() => {
    if (!isResetConfirmOpen) return;
    const handleEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsResetConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isResetConfirmOpen]);
  useEffect(() => { setIsSidebarOpen(false); }, [npcId]);
  useEffect(() => {
    setActiveSceneId(null);
    setLocalChatMarkers([]);
    setIsScenePickerOpen(false);
  }, [npcId]);
  useEffect(() => {
    if (starterAppliedRef.current) return;
    const starter = searchParams.get("starter")?.trim();
    if (!starter) return;
    if (inputText.trim()) return;
    setInputText(starter);
    starterAppliedRef.current = true;
  }, [searchParams, inputText]);
  useEffect(() => {
    setUiLanguage(loadUiLanguage());
  }, []);
  useEffect(() => {
    setSavedItems(loadSavedItems());
    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== "kotomachi_saved_items_v1") return;
      setSavedItems(loadSavedItems());
    };
    const handleSavedItemsUpdated = () => setSavedItems(loadSavedItems());
    window.addEventListener("storage", handleStorage);
    window.addEventListener(SAVED_ITEMS_UPDATED_EVENT, handleSavedItemsUpdated);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(SAVED_ITEMS_UPDATED_EVENT, handleSavedItemsUpdated);
    };
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setIsOnboardingHintDismissed(localStorage.getItem(ONBOARDING_HINT_DISMISSED_KEY) === "1");
    } catch {
      setIsOnboardingHintDismissed(false);
    }
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkStandalone = () => {
      const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches
        || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandaloneMode(Boolean(standalone));
    };
    checkStandalone();
    window.addEventListener("resize", checkStandalone);
    return () => window.removeEventListener("resize", checkStandalone);
  }, []);
  useEffect(() => {
    if (!textInputRef.current) return;
    const el = textInputRef.current;
    el.style.height = "auto";
    const maxHeight = 24 * 6;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [inputText, inputMode]);

  const handleLanguageChange = (language: UiLanguage) => {
    setUiLanguage(language);
    saveUiLanguage(language);
  };

  const handleOpenSavedPanel = () => {
    setIsReviewPanelOpen(false);
    setSelectedSummaryCard(null);
    setSavedItems(loadSavedItems());
    setIsSavedPanelOpen(true);
  };

  const handleOpenReviewPanel = (closeOnNavigate = false) => {
    setIsSavedPanelOpen(false);
    setSelectedSummaryCard(null);
    setIsReviewPanelOpen(true);
    if (closeOnNavigate) setIsSidebarOpen(false);
  };

  const handleDeleteSavedItem = (id: string) => {
    const next = removeSavedItem(id);
    setSavedItems(next);
  };

  const showVoiceHint = (message: string) => {
    setVoiceHint(message);
    if (voiceHintTimerRef.current) clearTimeout(voiceHintTimerRef.current);
    voiceHintTimerRef.current = setTimeout(() => setVoiceHint(null), 4000);
  };

  const showSummaryToast = (
    message: string,
    tone: "info" | "success" | "error" = "info",
  ) => {
    setSummaryToast({ message, tone });
    if (summaryToastTimerRef.current) clearTimeout(summaryToastTimerRef.current);
    summaryToastTimerRef.current = setTimeout(() => setSummaryToast(null), 3200);
  };

  const getWelcomeRequest = useCallback((
    requestKey: string,
    targetNpcId: NpcId,
    existingFacts: string[],
    history: StoredMessage[],
    timeDiffText: "初回" | "再訪",
    recentAssistantMessages: string[],
  ): Promise<WelcomeResponse | null> => {
    const existingRequest = welcomeRequests.get(requestKey);
    if (existingRequest) return existingRequest;

    const npcState = getNpcState(targetNpcId);
    const localDateContext = getLocalDateContext();
    const worldContext = getWorldContext(localDateContext);
    const request = fetch(buildClientApiUrl("/api/welcome"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npcId: targetNpcId,
        history,
        existingFacts,
        timeDiffText,
        recentAssistantMessages,
        lifeArc: npcState.arcDescription,
        lifeArcState: npcState.label,
        crossMentions: npcState.crossMentions,
        localDateContext,
        worldDescription: worldContext.description,
        worldReaction: worldContext.reactions[targetNpcId],
      }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as WelcomeResponse;
      })
      .catch(() => null);

    void request.finally(() => {
      if (welcomeRequests.get(requestKey) === request) {
        welcomeRequests.delete(requestKey);
      }
    });

    welcomeRequests.set(requestKey, request);
    return request;
  }, []);

  const triggerInitialWelcome = useCallback(async (
    targetNpcId: NpcId,
    existingFacts: string[],
  ) => {
    if (generatedInitialWelcomeForNpcRef.current.has(targetNpcId)) return;
    if (loadChatHistory(targetNpcId).length > 0) return;

    if (activeNpcRef.current === targetNpcId) setIsTyping(true);
    try {
      const data = await getWelcomeRequest(
        `initial:${targetNpcId}`,
        targetNpcId,
        existingFacts,
        [],
        "初回",
        [],
      );
      const welcomeText = data?.welcomeMessage?.trim();
      if (!welcomeText) return;
      if (loadChatHistory(targetNpcId).length > 0) return;

      const welcomeMsg: ChatMessage = {
        id: `welcome-${targetNpcId}-${Date.now()}`,
        sender: "assistant",
        text: welcomeText,
        type: "text",
        createdAt: new Date().toISOString(),
        source: "welcome",
      };
      saveChatHistory(targetNpcId, [
        { role: "assistant", content: welcomeText, createdAt: welcomeMsg.createdAt, source: "welcome" },
      ]);
      generatedInitialWelcomeForNpcRef.current.add(targetNpcId);

      if (data?.extractedFacts) {
        saveLocalNPCFacts(targetNpcId, data.extractedFacts);
        if (activeNpcRef.current === targetNpcId) setMemories(data.extractedFacts);
      }
      saveLastChatTime(targetNpcId);

      if (activeNpcRef.current === targetNpcId) {
        setMessages((prev) => (prev.length === 0 ? [welcomeMsg] : prev));
      }
    } finally {
      if (activeNpcRef.current === targetNpcId) setIsTyping(false);
    }
  }, [getWelcomeRequest]);

  const triggerRevisitWelcome = useCallback(async (
    targetNpcId: NpcId,
    existingFacts: string[],
    restoredHistory: StoredMessage[],
    wasSeenThisSession: boolean,
  ) => {
    if (wasSeenThisSession) return;

    const lastMessage = restoredHistory[restoredHistory.length - 1];
    if (!lastMessage) return;

    const lastMessageTime = lastMessage.createdAt ? new Date(lastMessage.createdAt).getTime() : 0;
    const now = Date.now();
    const lastActivityTime = getLastChatTime(targetNpcId) ?? lastMessageTime;
    const timeSinceLastActivity = now - lastActivityTime;

    if (!lastActivityTime || timeSinceLastActivity < REVISIT_WELCOME_IDLE_MS) return;

    const userMessageCount = countUserMessages(restoredHistory);

    const sourceFingerprint = createWelcomeSourceFingerprint(targetNpcId, restoredHistory);
    if (generatedRevisitWelcomeSourcesRef.current.has(sourceFingerprint)) return;

    const marker = loadRevisitWelcomeMarker(targetNpcId);
    const markerReferenceTime = marker?.triggeredAt ?? getLastChatTime(targetNpcId) ?? lastMessageTime;
    const markerIsFresh = markerReferenceTime > 0 && now - markerReferenceTime < REVISIT_WELCOME_IDLE_MS;
    if (
      marker &&
      markerIsFresh &&
      (marker.sourceFingerprint === sourceFingerprint ||
        (userMessageCount > 0 && userMessageCount <= marker.userMessageCount))
    ) {
      return;
    }

    generatedRevisitWelcomeSourcesRef.current.add(sourceFingerprint);

    if (activeNpcRef.current === targetNpcId) setIsTyping(true);
    try {
      const data = await getWelcomeRequest(
        `revisit:${sourceFingerprint}`,
        targetNpcId,
        existingFacts,
        restoredHistory.slice(-10),
        "再訪",
        getRecentAssistantMessages(restoredHistory),
      );
      const welcomeText = data?.welcomeMessage?.trim();
      if (!welcomeText) return;

      const currentHistory = loadChatHistory(targetNpcId);
      if (countUserMessages(currentHistory) !== userMessageCount) return;

      const welcomeMsg: ChatMessage = {
        id: `welcome-revisit-${targetNpcId}-${Date.now()}`,
        sender: "assistant",
        text: welcomeText,
        type: "text",
        createdAt: new Date().toISOString(),
        source: "welcome",
      };

      saveChatHistory(targetNpcId, [
        ...currentHistory,
        { role: "assistant", content: welcomeText, createdAt: welcomeMsg.createdAt, source: "welcome" },
      ]);
      saveRevisitWelcomeMarker(targetNpcId, {
        userMessageCount,
        sourceFingerprint,
        triggeredAt: Date.now(),
      });

      if (data?.extractedFacts) {
        saveLocalNPCFacts(targetNpcId, data.extractedFacts);
        if (activeNpcRef.current === targetNpcId) setMemories(data.extractedFacts);
      }
      saveLastChatTime(targetNpcId);

      if (activeNpcRef.current === targetNpcId) {
        setMessages((prev) => [...prev, welcomeMsg]);
      }
    } finally {
      if (activeNpcRef.current === targetNpcId) setIsTyping(false);
    }
  }, [getWelcomeRequest]);

  useEffect(() => {
    activeNpcRef.current = npcId;
    const wasSeenThisSession = hasSeenNpcThisSession(npcId);
    markNpcSeenThisSession(npcId);
    setSummaryCards(loadSummaryCards(npcId));
    setAllSummaryCards(loadSummaryCards());
    setSelectedSummaryCard(null);
    setSummaryToast(null);
    const storedMemories = getLocalNPCMemories(npcId);
    setMemories(storedMemories);
    const history = loadChatHistory(npcId);

    if (history.length > 0) {
      const restored: ChatMessage[] = history.map((m, i) => ({
        id: `stored-${i}`, sender: m.role === "user" ? "user" : "assistant",
        text: m.content, type: "text" as const, createdAt: m.createdAt,
        source: m.source === "welcome" || m.source === "scene" ? m.source : undefined,
      }));
      setMessages(restored);
      void triggerRevisitWelcome(npcId, storedMemories, history, wasSeenThisSession);
      return;
    }

    setMessages([]);
    void triggerInitialWelcome(npcId, storedMemories);
  }, [npcId, triggerInitialWelcome, triggerRevisitWelcome]);

  const fetchTtsUrl = useCallback(async (text: string): Promise<string | null> => {
    const cacheKey = `${npcId}:${text}`;
    const cached = npcAudioCacheRef.current.get(cacheKey);
    if (cached) return cached;
    try {
      const res = await fetch(buildClientApiUrl("/api/tts"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, npcId }) });
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      npcAudioCacheRef.current.set(cacheKey, url);
      return url;
    } catch { return null; }
  }, [npcId]);

  const extractMemory = async (userText: string) => {
    try {
      const res = await fetch(buildClientApiUrl("/api/memory"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userText }) });
      const data = await res.json();
      if (data.fact) { saveLocalNPCMemory(npcId, data.fact); setMemories(getLocalNPCMemories(npcId)); }
    } catch { /* 静默 */ }
  };

  const sendToNpc = async (userText: string, userAudioBlob?: Blob | null) => {
    if (!userText.trim()) return;
    setApiError(null);
    const userCreatedAt = new Date().toISOString();
    const userAudioUrl = userAudioBlob ? URL.createObjectURL(userAudioBlob) : null;
    if (userAudioUrl) userAudioUrlsRef.current.push(userAudioUrl);
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text: userText, type: userAudioBlob ? "voice" : "text", createdAt: userCreatedAt, userAudioBlob: userAudioBlob ?? null, userAudioUrl };
    setMessages((prev) => [...prev, userMsg]);
    setInputText(""); setIsTyping(true);
    void extractMemory(userText); incrementConversationCount(npcId);
    const historyForApi: StoredMessage[] = messages.filter((m) => m.sender === "user" || m.sender === "assistant").map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
      createdAt: m.createdAt,
      source: m.source,
    }));
    historyForApi.push({ role: "user", content: userText, createdAt: userCreatedAt });
    const npcState = getNpcState(npcId);
    const localDateContext = getLocalDateContext();
    const worldContext = getWorldContext(localDateContext);
    try {
      const res = await fetch(buildClientApiUrl("/api/chat"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: userText, npcId, history: historyForApi.slice(-10), memories, conversationCount: getConversationCount(npcId), lifeArc: npcState.arcDescription, lifeArcState: npcState.label, crossMentions: npcState.crossMentions, localDateContext, worldDescription: worldContext.description, worldReaction: worldContext.reactions[npcId], activeSceneId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? copy.common.genericError);
      // 场景对话偶尔会冒出括号动作描写，这里做一层保守清理，
      // 既避免 UI 里像剧本，也避免 TTS 把动作朗读出来。
      const assistantText = sanitizeAssistantSceneText(typeof data.text === "string" ? data.text : "");
      const useVoice = true;
      let npcAudioUrl: string | null = null;
      if (useVoice) npcAudioUrl = await fetchTtsUrl(assistantText);
      const assistantMsg: ChatMessage = { id: `assistant-${Date.now()}`, sender: "assistant", text: assistantText, type: useVoice ? "voice" : "text", createdAt: new Date().toISOString(), npcAudioUrl };
      setMessages((prev) => {
        const next = [...prev, assistantMsg];
        saveChatHistory(npcId, next.map((m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
          createdAt: m.createdAt,
          source: m.source,
        })));
        return next;
      });
      saveLastChatTime(npcId);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "";
      const isNetworkError = /failed to fetch|networkerror|load failed|err_connection_refused/i.test(errorText);
      if (isNetworkError) {
        setApiError(
          uiLanguage === "zh"
            ? "连接失败。请检查网络，或稍后再试。如果你在国内网络环境，可能需要稳定的网络代理。"
            : "Connection failed. Please check your network and try again.",
        );
      } else {
        setApiError(err instanceof Error ? err.message : copy.common.genericError);
      }
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, sender: "assistant", text: "ごめん、ちょっと通信が不安定みたい…もう一度送ってくれる？😅", type: "text" }]);
    } finally { setIsTyping(false); }
  };

  const handleSend = () => { setVoiceHint(null); void sendToNpc(inputText); };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    if (isInputComposing) return;
    if (event.shiftKey) return;
    event.preventDefault();
    handleSend();
  };
  const handleUseStarterPrompt = (prompt: string) => {
    setVoiceHint(null);
    setInputMode("text");
    setInputText((prev) => (prev.trim() ? `${prev}\n${prompt}` : prompt));
    setIsInputActionsOpen(false);
    setIsTopicIdeasOpen(false);
  };

  const handleStartScene = (sceneId: ConversationSceneId) => {
    const scene = getConversationScene(sceneId);
    if (!scene) return;

    topicIdeasCacheRef.current.clear();
    setTopicIdeas(null);
    setTopicIdeasForceRefreshKey(null);
    setIsInputActionsOpen(false);
    setIsScenePickerOpen(false);
    setIsTopicIdeasOpen(false);
    setActiveSceneId(sceneId);

    const openingMessage: ChatMessage = {
      id: `scene-${scene.id}-${Date.now()}`,
      sender: "assistant",
      text: scene.npcOpening,
      type: "text",
      createdAt: new Date().toISOString(),
      source: "scene",
    };

    setMessages((prev) => {
      const next = [...prev, openingMessage];
      saveChatHistory(npcId, next.map((message) => ({
        role: message.sender === "user" ? "user" : "assistant",
        content: message.text,
        createdAt: message.createdAt,
        source: message.source,
      })));
      return next;
    });
    saveLastChatTime(npcId);
  };

  const handleExitScene = () => {
    const afterMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;

    setLocalChatMarkers((prev) => [
      ...prev,
      {
        id: `scene-exit-${Date.now()}`,
        type: "scene-exit",
        afterMessageId,
        createdAt: new Date().toISOString(),
      },
    ]);
    setActiveSceneId(null);
    setTopicIdeas(null);
    setTopicIdeasForceRefreshKey(null);
    setIsTopicIdeasOpen(false);
  };

  const handleOpenScenePicker = () => {
    setIsTopicIdeasOpen(false);
    setIsScenePickerOpen(true);
  };

  const handleBackFromScenePicker = () => {
    setIsScenePickerOpen(false);
  };

  const pickRecorderMimeType = () => {
    const candidates = ["audio/ogg;codecs=opus", "audio/webm;codecs=opus", "audio/mp4", "audio/webm"];
    return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
  };

  const startRecording = async () => {
    try {
      setApiError(null);
      setVoiceHint(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder; audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: mimeType || recorder.mimeType || "audio/webm" });
        setIsTyping(true);
        try {
          const formData = new FormData(); formData.append("audio", blob);
          const sttRes = await fetch(buildClientApiUrl("/api/stt"), { method: "POST", body: formData });
          const sttData = await sttRes.json();
          if (!sttRes.ok) {
            if (sttData.code === "NO_SPEECH") {
              showVoiceHint(copy.chat.noSpeech);
            } else {
              setApiError(copy.chat.sttError);
            }
            setIsTyping(false);
            return;
          }
          if (sttData.code === "NO_SPEECH" || !sttData.text?.trim()) {
            showVoiceHint(copy.chat.noSpeech);
            setIsTyping(false);
            return;
          }
          await sendToNpc(sttData.text, blob);
        } catch {
          setApiError(copy.chat.sttError);
          setIsTyping(false);
        }
      };
      recorder.start(); setIsRecording(true);
    } catch { setApiError(copy.chat.micError); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop(); setIsRecording(false); };

  const placeBackLabel =
    uiLanguage === "zh"
      ? "返回街区"
      : uiLanguage === "en"
        ? "Back to Kotomachi"
        : copy.sidebar.backToMap;
  const residentsLabel =
    uiLanguage === "zh"
      ? "街区里的人"
      : uiLanguage === "en"
        ? "Around Kotomachi"
        : copy.sidebar.residents;
  const userMessageCount = messages.filter((message) => message.sender === "user").length;
  const showStarterPrompts = userMessageCount === 0 && !activeScene;
  const showOnboardingHint = userMessageCount === 0 && !isOnboardingHintDismissed;
  const starterHeading = uiLanguage === "zh" ? "不知道怎么开始？" : "Not sure how to start?";
  const starterSubheading = uiLanguage === "zh" ? "可以这样开口" : "Try one of these";
  const onboardingHintTitle = uiLanguage === "zh" ? "可以随便开口" : "Start however you can";
  const onboardingHintLine1 = uiLanguage === "zh"
    ? "不用说完整日语。中 / 英 / 日混着说也可以。"
    : "You do not need perfect Japanese. Mixing Chinese, English, and Japanese is okay.";
  const onboardingHintLine2 = uiLanguage === "zh"
    ? "不知道说什么时，可以点 “+” 找话题。"
    : "If you are not sure what to say, tap “+” for topic ideas.";
  const onboardingHintLine3 = uiLanguage === "zh"
    ? "我会帮你把想法整理成自然日语。"
    : "Kotomachi helps turn your rough thoughts into natural Japanese.";
  const dismissOnboardingHintLabel = uiLanguage === "zh" ? "关闭提示" : "Hide hint";
  const topicIdeasTitle = activeScene
    ? (uiLanguage === "zh" ? "下一句怎么说" : "How to say the next line")
    : (uiLanguage === "zh" ? "找话题" : "Topic ideas");
  const helpTitle = uiLanguage === "zh" ? "帮助" : "Help";
  const helpSubtitle = uiLanguage === "zh" ? "使用提示与安装说明" : "Guide & install help";
  const quickGuideTitle = uiLanguage === "zh" ? "使用提示" : "Quick guide";
  const quickGuideItems = uiLanguage === "zh"
    ? [
        "点气泡旁的提示按钮，可以比较几种自然说法。",
        "手机端可先长按选中 NPC 消息里的词，再点查词入口查看意思和读音。",
        "点喇叭可以听发音。",
        "不知道说什么时，点 + 找话题。",
        "聊几句后，可以从 + 生成回顾卡。",
        "收藏的表达和词语会保存在“收藏”里。",
      ]
    : [
        "Use Expression Hints to compare natural ways to say your message.",
        "On mobile, long-press and select a word in an NPC message, then use the lookup action.",
        "Tap Listen to hear pronunciation.",
        "Use + for topic ideas when you are not sure what to say.",
        "After a short chat, use + to create a review card.",
        "Saved words and expressions are stored in Saved.",
      ];
  const installHelpTitle = uiLanguage === "zh" ? "添加到桌面" : "Add to Home Screen";
  const installHelpLines = uiLanguage === "zh"
    ? [
        "Android：建议使用 Chrome 打开链接，点击浏览器菜单，选择“添加到主屏幕”或“安装应用”。",
        "iPhone：请用 Safari 打开链接，点击分享按钮，选择“添加到主屏幕”。",
        "Edge 等浏览器的安装入口可能因设备不同而变化；如果没有生成图标，请尝试 Chrome。",
      ]
    : [
        "Android: For the most reliable install experience, open the link in Chrome and choose Add to Home screen or Install app.",
        "iPhone: Open the link in Safari, tap Share, then Add to Home Screen.",
        "Some browsers may behave differently. If Edge does not create an icon, try Chrome.",
      ];
  const statusAwareTitle = uiLanguage === "zh" ? "问一句近况" : "Ask how they’re doing";
  const visibleStarterPrompts = pickStarterPrompts(npcId, userMessageCount);
  const statusAwarePrompt = getStatusAwareTopicIdea(npcId);
  const topicIdeasLoadingLabel = uiLanguage === "zh" ? "正在想几句能接上的话…" : "Finding lines that fit…";
  const refreshTopicIdeasLabel = uiLanguage === "zh" ? "换一批" : "Another set";
  const fixedTopicIdeas = useMemo(() => visibleStarterPrompts, [visibleStarterPrompts]);
  const latestSceneOpeningIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.sender === "assistant" && message.source === "scene") {
        return i;
      }
    }
    return -1;
  }, [messages]);
  const hasUserAfterLatestSceneOpening = useMemo(() => {
    if (latestSceneOpeningIndex < 0) return false;
    return messages.slice(latestSceneOpeningIndex + 1).some((message) => message.sender === "user");
  }, [latestSceneOpeningIndex, messages]);
  const latestWelcomeIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message.sender === "assistant" && message.source === "welcome") {
        return i;
      }
    }
    return -1;
  }, [messages]);
  const hasUserAfterLatestWelcome = useMemo(() => {
    if (latestWelcomeIndex < 0) return userMessageCount > 0;
    return messages.slice(latestWelcomeIndex + 1).some((message) => message.sender === "user");
  }, [latestWelcomeIndex, messages, userMessageCount]);
  const isSceneResponseMode = Boolean(activeScene);
  const isTopicIdeasOpeningMode =
    !isSceneResponseMode && (userMessageCount === 0 || (latestWelcomeIndex >= 0 && !hasUserAfterLatestWelcome));
  const topicIdeasSubtitle = isSceneResponseMode
    ? (uiLanguage === "zh"
      ? (hasUserAfterLatestSceneOpening ? "结合这个小场景，给你几句可以直接接上的话" : "先用这几句把这个小场景接起来")
      : (hasUserAfterLatestSceneOpening ? "Use the scene to pick a natural next line." : "Use these lines to get the scene moving." ))
    : isTopicIdeasOpeningMode
    ? (uiLanguage === "zh"
      ? "还没开口时，可以先从这些起句开始"
      : "Use these opening lines if you haven't replied yet.")
    : (uiLanguage === "zh"
      ? "根据你们刚才的对话，帮你续一句"
      : "These lines are based on the current conversation.");
  const topicIdeasModeLabel = isSceneResponseMode
    ? (uiLanguage === "zh" ? "小场景接话" : "Scene reply options")
    : isTopicIdeasOpeningMode
    ? (uiLanguage === "zh" ? "开场起句" : "Opening lines")
    : (uiLanguage === "zh" ? "按当前对话生成" : "Based on this chat");
  const recentTopicMessages = useMemo(
    () => {
      const scenarioScopedMessages =
        activeScene && latestSceneOpeningIndex >= 0
          ? messages.slice(latestSceneOpeningIndex)
          : messages;
      return scenarioScopedMessages
        .filter((message) => message.sender === "user" || message.sender === "assistant")
        .slice(-6)
        .map((message) => ({
          role: message.sender === "user" ? "user" as const : "assistant" as const,
          content: message.text.trim(),
        }))
        .filter((message) => message.content);
    },
    [activeScene, latestSceneOpeningIndex, messages],
  );
  const topicIdeasCacheKey = useMemo(() => {
    if (isSceneResponseMode) {
      if (!activeScene) return "";
      const source = recentTopicMessages.map((message) => `${message.role}:${message.content}`).join("\n");
      return `scene:${npcId}:${activeScene.id}:${uiLanguage}:${recentTopicMessages.length}:${hashText(source)}`;
    }
    if (isTopicIdeasOpeningMode || recentTopicMessages.length === 0) return "";
    const source = recentTopicMessages.map((message) => `${message.role}:${message.content}`).join("\n");
    return `${npcId}:${uiLanguage}:${recentTopicMessages.length}:${hashText(source)}`;
  }, [activeScene, isSceneResponseMode, isTopicIdeasOpeningMode, npcId, uiLanguage, recentTopicMessages]);
  const displayedTopicIdeas = (isTopicIdeasOpeningMode && !isSceneResponseMode) ? fixedTopicIdeas : (topicIdeas ?? []);
  const isRefreshingTopicIdeas = Boolean(topicIdeasCacheKey) && topicIdeasForceRefreshKey === topicIdeasCacheKey;
  const recentSummaryMessages = useMemo<SessionSummaryMessage[]>(() => {
    return messages
      .filter((message) => message.sender === "user" || message.sender === "assistant")
      .slice(-16)
      .map((message) => ({
        id: message.id,
        role: message.sender,
        content: message.text,
        createdAt: message.createdAt,
      }));
  }, [messages]);
  const currentSummarySource = useMemo(
    () => createSummarySourceInfo(npcId, recentSummaryMessages),
    [npcId, recentSummaryMessages],
  );
  const existingSourceCard = summaryCards.find(
    (card) => card.sourceFingerprint === currentSummarySource.sourceFingerprint,
  );
  const latestSummaryCard = summaryCards[0];
  const newUserMessagesSinceLatest = latestSummaryCard?.sourceUserMessageCount === undefined
    ? userMessageCount
    : Math.max(0, userMessageCount - latestSummaryCard.sourceUserMessageCount);
  const hasEnoughNewMessages =
    !latestSummaryCard || newUserMessagesSinceLatest >= 2 || Boolean(existingSourceCard);
  const canCreateSummary = userMessageCount >= 2 && !isSummaryGenerating && hasEnoughNewMessages;

  const handleOpenSummaryCard = (card: SessionSummaryCard, closeDrawer = false) => {
    setIsReviewPanelOpen(true);
    setIsSavedPanelOpen(false);
    setSelectedSummaryCard(card);
    if (closeDrawer) setIsSidebarOpen(false);
  };

  const handleDeleteSummaryCard = (cardId: string) => {
    deleteSummaryCard(cardId);
    setSummaryCards(loadSummaryCards(npcId));
    setAllSummaryCards(loadSummaryCards());
    setSelectedSummaryCard(null);
    showSummaryToast(copy.summary.deleted, "success");
  };

  const buildSummaryCard = (
    apiCard: SessionSummaryApiCard,
    sourceInfo: ReturnType<typeof createSummarySourceInfo>,
  ): SessionSummaryCard => {
    const reusableExpressions = (apiCard.reusableExpressions ?? [])
      .map((item) => ({ ...item, note: isReviewFiller(item.note) ? "" : item.note }))
      .filter((item) => item.expression.trim());
    const expressionUpgrades = (apiCard.expressionUpgrades ?? [])
      .map((item) => ({ ...item, note: isReviewFiller(item.note) ? "" : item.note }));
    const reviewWords = (apiCard.reviewWords ?? [])
      .filter((item) => item.word.trim() && item.meaning.trim() && !isReviewFiller(item.meaning));
    const nextTalkPrompt = isBadReviewNextTopic(apiCard.nextTalkPrompt) ? "" : apiCard.nextTalkPrompt;

    return {
      schemaVersion: 1,
      id: createSummaryId("summary"),
      createdAt: new Date().toISOString(),
      npcId,
      ...sourceInfo,
      sourceUserMessageCount: userMessageCount,
      title: apiCard.title,
      topicSummary: apiCard.topicSummary,
      reusableExpressions,
      expressionUpgrades,
      reviewWords,
      nextTalkPrompt,
    };
  };

  const handleCreateSummary = async () => {
    if (existingSourceCard) {
      setIsReviewPanelOpen(true);
      setSelectedSummaryCard(existingSourceCard);
      showSummaryToast(copy.summary.duplicate);
      setIsSidebarOpen(false);
      return;
    }

    if (!canCreateSummary) {
      showSummaryToast(copy.summary.tooShort);
      return;
    }

    const duplicateCard = findSummaryCardByFingerprint(npcId, currentSummarySource.sourceFingerprint);
    if (duplicateCard) {
      setIsReviewPanelOpen(true);
      setSelectedSummaryCard(duplicateCard);
      showSummaryToast(copy.summary.duplicate);
      setIsSidebarOpen(false);
      return;
    }

    setIsSummaryGenerating(true);

    const userMessages = messages
      .filter((message) => message.sender === "user")
      .slice(-10)
      .map((message) => ({ id: message.id, text: message.text }));

    try {
      const res = await fetch(buildClientApiUrl("/api/session-summary"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          npcId,
          uiLanguage: uiLanguage === "en" ? "en" : "zh",
          messages: recentSummaryMessages,
          recentLookups: loadRecentLookups(npcId, 5),
          recentExpressionHints: loadRecentExpressionHints(npcId, 5),
          nonJapaneseSpans: detectNonJapaneseSpans(userMessages),
        }),
      });
      const data = (await res.json()) as { card?: SessionSummaryApiCard; error?: string };
      if (!res.ok || !data.card) {
        throw new Error(data.error ?? copy.summary.createFailed);
      }
      const card = buildSummaryCard(data.card, currentSummarySource);
      saveSummaryCard(card);
      setSummaryCards(loadSummaryCards(npcId));
      setAllSummaryCards(loadSummaryCards());
      setIsReviewPanelOpen(true);
      setSelectedSummaryCard(card);
      setIsSidebarOpen(false);
    } catch {
      showSummaryToast(copy.summary.createFailed, "error");
    } finally {
      setIsSummaryGenerating(false);
    }
  };

  useEffect(() => {
    if (!isTopicIdeasOpen) return;
    if (isSceneResponseMode && activeScene) {
      if (!topicIdeasCacheKey) {
        setIsTopicIdeasLoading(false);
        setTopicIdeas(activeSceneResponseOptions.slice(0, 4));
        return;
      }

      const shouldForceRefresh = topicIdeasForceRefreshKey === topicIdeasCacheKey;
      if (!shouldForceRefresh) {
        const cachedIdeas = topicIdeasCacheRef.current.get(topicIdeasCacheKey);
        if (cachedIdeas && cachedIdeas.length > 0) {
          setTopicIdeas(cachedIdeas);
          setIsTopicIdeasLoading(false);
          return;
        }
      }

      const controller = new AbortController();
      const localDateContext = getLocalDateContext();
      const worldContext = getWorldContext(localDateContext);
      setTopicIdeas(null);
      setIsTopicIdeasLoading(true);

      void fetch(buildClientApiUrl("/api/topic-ideas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId,
          uiLanguage: uiLanguage === "en" ? "en" : "zh",
          recentMessages: recentTopicMessages,
          localDateContext,
          worldDescription: worldContext.description,
          worldReaction: worldContext.reactions[npcId] ?? "",
          activeSceneId: activeScene.id,
        }),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) return null;
          return (await response.json()) as { ideas?: Array<{ text?: string }> };
        })
        .then((data) => {
          if (controller.signal.aborted) return;
          const nextIdeas = (data?.ideas ?? [])
            .map((item) => (typeof item?.text === "string" ? item.text.trim() : ""))
            .filter(Boolean)
            .slice(0, 4);
          const resolvedIdeas = nextIdeas.length > 0 ? nextIdeas : activeSceneResponseOptions;
          topicIdeasCacheRef.current.set(topicIdeasCacheKey, resolvedIdeas);
          setTopicIdeas(resolvedIdeas);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setTopicIdeas(activeSceneResponseOptions);
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setIsTopicIdeasLoading(false);
          setTopicIdeasForceRefreshKey((current) => (current === topicIdeasCacheKey ? null : current));
        });

      return () => controller.abort();
    }

    if (isTopicIdeasOpeningMode) {
      setIsTopicIdeasLoading(false);
      setTopicIdeas(null);
      return;
    }
    if (!topicIdeasCacheKey) {
      setIsTopicIdeasLoading(false);
      setTopicIdeas(fixedTopicIdeas);
      return;
    }

    const shouldForceRefresh = topicIdeasForceRefreshKey === topicIdeasCacheKey;
    if (!shouldForceRefresh) {
      const cachedIdeas = topicIdeasCacheRef.current.get(topicIdeasCacheKey);
      if (cachedIdeas && cachedIdeas.length > 0) {
        setTopicIdeas(cachedIdeas);
        setIsTopicIdeasLoading(false);
        return;
      }
    }

    const controller = new AbortController();
    const localDateContext = getLocalDateContext();
    const worldContext = getWorldContext(localDateContext);
    setTopicIdeas(null);
    setIsTopicIdeasLoading(true);

    void fetch(buildClientApiUrl("/api/topic-ideas"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        npcId,
        uiLanguage: uiLanguage === "en" ? "en" : "zh",
        recentMessages: recentTopicMessages,
        localDateContext,
        worldDescription: worldContext.description,
        worldReaction: worldContext.reactions[npcId] ?? "",
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { ideas?: Array<{ text?: string }> };
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const nextIdeas = (data?.ideas ?? [])
          .map((item) => (typeof item?.text === "string" ? item.text.trim() : ""))
          .filter(Boolean)
          .slice(0, 3);
        const resolvedIdeas = nextIdeas.length > 0 ? nextIdeas : fixedTopicIdeas;
        topicIdeasCacheRef.current.set(topicIdeasCacheKey, resolvedIdeas);
        setTopicIdeas(resolvedIdeas);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setTopicIdeas(fixedTopicIdeas);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setIsTopicIdeasLoading(false);
        setTopicIdeasForceRefreshKey((current) => (current === topicIdeasCacheKey ? null : current));
      });

    return () => controller.abort();
  }, [
    activeScene,
    activeSceneResponseOptions,
    isTopicIdeasOpen,
    isSceneResponseMode,
    isTopicIdeasOpeningMode,
    npcId,
    uiLanguage,
    recentTopicMessages,
    topicIdeasCacheKey,
    fixedTopicIdeas,
    topicIdeasForceRefreshKey,
  ]);

  const handleRefreshTopicIdeas = () => {
    if ((isTopicIdeasOpeningMode && !isSceneResponseMode) || !topicIdeasCacheKey || isTopicIdeasLoading) return;
    // 只清当前上下文这一批 cache；其他 NPC 或其他上下文的建议继续保留。
    topicIdeasCacheRef.current.delete(topicIdeasCacheKey);
    setTopicIdeas(null);
    setTopicIdeasForceRefreshKey(topicIdeasCacheKey);
  };

  const renderSummaryDetail = () => (
    <ChatSummaryDetail
      cards={allSummaryCards}
      card={selectedSummaryCard}
      copy={copy}
      isOpen={isReviewPanelOpen}
      getNpcName={(id) => NPC_LIST.find((npc) => npc.id === id)?.name ?? id}
      onOpenCard={(card) => setSelectedSummaryCard(card)}
      onBackToList={() => setSelectedSummaryCard(null)}
      onClose={() => {
        setSelectedSummaryCard(null);
        setIsReviewPanelOpen(false);
      }}
      onDelete={handleDeleteSummaryCard}
    />
  );
  const renderSidebarContent = (closeOnNavigate = false) => {
    const handleNavigate = closeOnNavigate ? () => setIsSidebarOpen(false) : undefined;

    return (
      <>
        <div className="px-5 pt-5 pb-3 border-b border-[rgba(255,255,255,0.06)]">
          <Link href="/" className="group" onClick={handleNavigate}>
            <h1 className="font-brand text-base font-light tracking-widest text-[#D4C8A8] group-hover:text-[#C9A84C] transition-colors">
              言街 Kotomachi
            </h1>
          </Link>
          <LanguageToggle
            language={uiLanguage}
            onChange={handleLanguageChange}
            variant="dark"
            className="mt-2.5"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4.5">
          <Link
            href="/"
            onClick={handleNavigate}
            className="flex items-center rounded-lg px-3 py-2 text-[12px] text-[#D4C8A8]/86 transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-[#D4C8A8]"
          >
            {placeBackLabel}
          </Link>

          <section className="space-y-1.5 pt-2.5">
            <h2 className="px-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#D4C8A8]/58">
              {residentsLabel}
            </h2>
            <nav className="space-y-0.5">
              {NPC_LIST.map((npc) => {
                const isActive = npc.id === npcId;
                return (
                  <Link
                    key={npc.id}
                    href={`/chat/${npc.id}`}
                    onClick={handleNavigate}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-[rgba(255,255,255,0.09)]"
                        : "hover:bg-[rgba(255,255,255,0.05)]"
                    }`}
                  >
                    <img
                      src={NPC_AVATARS[npc.id]}
                      alt={npc.name}
                      className={`w-8 h-8 rounded-full object-cover shrink-0 ${
                        isActive ? "ring-1 ring-[#C9A84C]/55" : "ring-1 ring-[rgba(255,255,255,0.1)]"
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-[13px] block truncate ${isActive ? "text-[#C9A84C] font-medium" : "text-[#D4C8A8]/90"}`}>{npc.name}</span>
                      <span className="text-[10px] text-[#D4C8A8]/44 block truncate">{npc.subname}・{npc.location}</span>
                    </div>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C] shrink-0" />}
                  </Link>
                );
              })}
            </nav>
          </section>

          <section className="space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-4">
            <h2 className="px-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#D4C8A8]/58">
              {copy.sidebar.learningSection}
            </h2>
            <button
              type="button"
              onClick={() => { handleOpenSavedPanel(); if (closeOnNavigate) setIsSidebarOpen(false); }}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                isSavedPanelOpen
                  ? "bg-[rgba(255,255,255,0.09)]"
                  : "hover:bg-[rgba(255,255,255,0.05)]"
              }`}
            >
              <span className={`text-[13px] block ${isSavedPanelOpen ? "text-[#C9A84C] font-medium" : "text-[#D4C8A8]/90"}`}>
                {copy.sidebar.savedTitle}
              </span>
              <span className="mt-0.5 text-[10px] leading-relaxed text-[#D4C8A8]/55 block">{savedEntrySubtitle}</span>
            </button>
            <button
              type="button"
              onClick={() => handleOpenReviewPanel(closeOnNavigate)}
              className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                isReviewPanelOpen
                  ? "bg-[rgba(255,255,255,0.09)]"
                  : "hover:bg-[rgba(255,255,255,0.05)]"
              }`}
            >
              <span className={`text-[13px] block ${isReviewPanelOpen ? "text-[#C9A84C] font-medium" : "text-[#D4C8A8]/90"}`}>
                {copy.sidebar.reviewTitle}
              </span>
              <span className="mt-0.5 text-[10px] leading-relaxed text-[#D4C8A8]/55 block">{reviewEntrySubtitle}</span>
            </button>
          </section>
        </div>

      </>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F1EBDD]">
      {/* ====== 移动端 NPC drawer ====== */}
      <button
        type="button"
        aria-label={copy.sidebar.closeMenu}
        aria-hidden={!isSidebarOpen}
        tabIndex={isSidebarOpen ? 0 : -1}
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-[#28231A]/25 transition-opacity duration-200 md:hidden ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        aria-label={copy.sidebar.navigationLabel}
        aria-hidden={!isSidebarOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-xs flex-col bg-[#1E2A16] pb-[env(safe-area-inset-bottom)] text-[#D4C8A8] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
          isSidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full"
        }`}
      >
        {renderSidebarContent(true)}
      </aside>

      {/* ====== 左侧 NPC 侧边栏 — Figma sidebar tokens ====== */}
      <aside className="hidden w-56 shrink-0 bg-[#1E2A16] md:flex md:flex-col text-[#D4C8A8]">
        {renderSidebarContent()}
      </aside>

      {/* ====== 右侧聊天主区域 — 自适应宽屏 ====== */}
      <main className="flex-1 flex flex-col min-w-0 bg-[linear-gradient(180deg,#F4EEE1_0%,#F1EBDD_100%)]">
        {/* 顶部栏 */}
        <div className="px-4 py-3.5 md:px-8 md:py-4 bg-[#FAF6EE]/96 border-b border-[rgba(40,35,26,0.08)]">
          <div className="mx-auto w-full max-w-5xl flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label={copy.sidebar.openMenu}
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8E0CE] text-sm text-[#28231A] transition-colors hover:bg-[#D8CFBC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35 md:hidden"
            >
              <MenuIcon size={17} />
            </button>
            <div className="flex-1 md:block" />
            <button
              type="button"
              onClick={() => setIsHelpOpen(true)}
              className="shrink-0 inline-flex items-center rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-2.5 py-1.5 text-[11px] text-[#6B6254] hover:bg-[#E8E0CE] transition-colors"
            >
              {helpTitle}
            </button>
          </div>
        </div>

        {apiError && (
          <div className="mx-4 mt-3 px-4 py-2 md:mx-8 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">{apiError}</div>
        )}

        {/* 聊天消息区域 — max-w-4xl 居中 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 pt-6 pb-8 md:px-8 md:pb-10 space-y-4">
            {showStarterPrompts && (
              <section className="rounded-xl border border-[rgba(40,35,26,0.07)] bg-[#FAF6EE] px-4 py-3.5">
                {showOnboardingHint && (
                  <div className="mb-3 rounded-lg border border-[rgba(40,35,26,0.07)] bg-[#F3EDE0]/65 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-medium text-[#2D4A1F]">{onboardingHintTitle}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsOnboardingHintDismissed(true);
                          try { localStorage.setItem(ONBOARDING_HINT_DISMISSED_KEY, "1"); } catch {}
                        }}
                        className="shrink-0 text-[10px] text-[#7A7060] hover:text-[#2D4A1F] transition-colors"
                        aria-label={dismissOnboardingHintLabel}
                        title={dismissOnboardingHintLabel}
                      >
                        ×
                      </button>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#7A7060]">{onboardingHintLine1}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#7A7060]">{onboardingHintLine2}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-[#7A7060]">{onboardingHintLine3}</p>
                  </div>
                )}
                <p className="text-[12px] font-medium text-[#2D4A1F]">{starterHeading}</p>
                <p className="mt-0.5 text-[10px] text-[#7A7060]">{starterSubheading}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {visibleStarterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleUseStarterPrompt(prompt)}
                      className="max-w-full rounded-full border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-3 py-1.5 text-left text-[12px] leading-relaxed text-[#2D4A1F] transition-colors hover:bg-[#E8E0CE]"
                    >
                      <span className="block break-words">{prompt}</span>
                    </button>
                  ))}
                </div>
                {!activeScene && availableScenes.length > 0 && (
                  <div className="mt-3 rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/55 p-2.5">
                    <p className="text-[12px] font-medium text-[#2D4A1F]">
                      {uiLanguage === "zh" ? "试一个小场景" : "Try a small scene"}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[#7A7060]">
                      {uiLanguage === "zh" ? "先从便利店结账这种小动作开始" : "Start with one tiny convenience-store moment."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {availableScenes.map((scene) => (
                        <button
                          key={scene.id}
                          type="button"
                          onClick={() => handleStartScene(scene.id)}
                          className="rounded-full border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-3 py-1.5 text-[12px] text-[#2D4A1F] transition-colors hover:bg-[#E8E0CE]"
                        >
                          {scene.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
            {activeScene && (
              <section className="rounded-xl border border-[rgba(40,35,26,0.07)] bg-[#FAF6EE] px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-medium text-[#2D4A1F]">{activeScene.title}</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-[#7A7060]">{activeScene.setup}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExitScene}
                    className="shrink-0 rounded-full border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] px-2.5 py-1 text-[10px] text-[#2D4A1F] transition-colors hover:bg-[#E8E0CE]"
                  >
                    {uiLanguage === "zh" ? "回到随便聊" : "Back to free chat"}
                  </button>
                </div>
              </section>
            )}
            {messages.length === 0 && isTyping && (
              <div className="flex justify-center pt-8">
                <p className="text-[11px] text-[#7A7060]/70">
                  {uiLanguage === "zh" ? "正在准备对话…" : "Getting ready…"}
                </p>
              </div>
            )}
            {messages.map((msg, index) => (
              <div key={msg.id} className="space-y-4">
                {shouldShowTimeDivider(messages[index - 1], msg) && (
                  <TimeDivider value={msg.createdAt} uiLanguage={uiLanguage} />
                )}
                <ChatBubble
                  messageId={msg.id}
                  sender={msg.sender}
                  text={msg.text}
                  npcId={npcId}
                  uiLanguage={uiLanguage}
                  userAudioBlob={msg.userAudioBlob}
                  userAudioUrl={msg.userAudioUrl}
                  npcAudioUrl={msg.npcAudioUrl}
                  isVoiceMessage={msg.sender === "assistant" || msg.type === "voice"}
                  onPlayNpcAudio={msg.sender === "assistant" ? () => { void fetchTtsUrl(msg.text).then((url) => { if (url) new Audio(url).play(); }); } : undefined}
                />
                {localChatMarkers
                  .filter((marker) => marker.type === "scene-exit" && marker.afterMessageId === msg.id)
                  .map((marker) => (
                    <div key={marker.id} className="px-2 pt-1">
                      <div className="flex items-center gap-3 text-[#7A7060]/70">
                        <div className="h-px flex-1 bg-[rgba(40,35,26,0.08)]" />
                        <div className="shrink-0 text-center">
                          <p className="text-[11px] font-medium text-[#7A7060]">
                            {uiLanguage === "zh" ? "回到随便聊" : "Back to free chat"}
                          </p>
                          <p className="mt-1 text-[10px] text-[#7A7060]/75">
                            {uiLanguage === "zh"
                              ? "小场景已结束，继续自由聊天。"
                              : "The small scenario has ended. Keep chatting freely."}
                          </p>
                        </div>
                        <div className="h-px flex-1 bg-[rgba(40,35,26,0.08)]" />
                      </div>
                    </div>
                  ))}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start items-center gap-2 text-xs text-[#7A7060] animate-pulse">
                <img src={NPC_AVATARS[npcId]} alt="" className="w-6 h-6 rounded-full object-cover" />
                <span className="bg-[#FAF6EE] border border-[rgba(40,35,26,0.06)] rounded-full px-3 py-1 text-[10px]">{copy.chat.typing}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入区域 */}
        <div className="border-t border-[rgba(40,35,26,0.08)] bg-[#F8F2E6]/96">
          {voiceHint && (
            <div className="max-w-5xl mx-auto px-4 pt-3 md:px-8">
              <p className="inline-flex rounded-full bg-[#E8E0CE]/70 px-3 py-1.5 text-[10px] text-[#7A7060]">
                {voiceHint}
              </p>
            </div>
          )}
          <div className="max-w-5xl mx-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-8 flex items-center gap-3 rounded-t-2xl">
            <button
              type="button"
              onClick={() => { setVoiceHint(null); setInputMode((prev) => (prev === "text" ? "voice" : "text")); }}
              disabled={isTyping}
              className="w-9 h-9 shrink-0 rounded-full border border-[rgba(40,35,26,0.08)] bg-[#EEE6D8] hover:bg-[#E0D6C5] hover:shadow-[0_3px_10px_rgba(40,35,26,0.08)] active:scale-[0.95] flex items-center justify-center text-sm text-[#28231A] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35"
              aria-label={inputMode === "text" ? copy.chat.switchToVoice : copy.chat.switchToText}
              title={inputMode === "text" ? copy.chat.voiceInput : copy.chat.textInput}
            >
              {inputMode === "text" ? <MicIcon size={17} /> : <KeyboardIcon size={17} />}
            </button>
            <div className="relative shrink-0" ref={inputActionsRef}>
              <button
                type="button"
                aria-label={copy.sidebar.moreActions}
                title={copy.sidebar.moreActions}
                onClick={() => setIsInputActionsOpen((prev) => !prev)}
                className={`w-9 h-9 rounded-full border border-[rgba(40,35,26,0.1)] bg-[#EEE6D8] text-[#2D4A1F] flex items-center justify-center text-lg leading-none transition-all duration-150 ${
                  isInputActionsOpen ? "bg-[#E3D9C7] shadow-[0_2px_8px_rgba(40,35,26,0.06)]" : "hover:bg-[#E3D9C7] hover:shadow-[0_3px_10px_rgba(40,35,26,0.08)] active:scale-[0.95]"
                }`}
              >
                +
              </button>
              {isInputActionsOpen && (
                <div className="absolute bottom-11 left-0 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] p-1.5 shadow-[0_6px_24px_rgba(40,35,26,0.15)]">
                  {!activeScene && availableScenes.length > 0 && !isScenePickerOpen && (
                    <button
                      type="button"
                      onClick={handleOpenScenePicker}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#F3EDE0]"
                    >
                      <span className="block text-[12px] font-medium text-[#2D4A1F]">
                        {uiLanguage === "zh" ? "练一个生活场景" : "Practice a life scene"}
                      </span>
                      <span className="block mt-0.5 text-[10px] text-[#7A7060]">
                        {uiLanguage === "zh" ? "用几句话处理一个简单的具体情景" : "Use a few lines for a simple real-life moment."}
                      </span>
                    </button>
                  )}
                  {!activeScene && availableScenes.length > 0 && isScenePickerOpen && (
                    <div className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/55 p-2.5">
                      <button
                        type="button"
                        onClick={handleBackFromScenePicker}
                        className="w-full rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-[#FAF6EE]"
                      >
                        <span className="block text-[11px] text-[#7A7060]">
                          {uiLanguage === "zh" ? "← 生活场景" : "← Life scenes"}
                        </span>
                      </button>
                      <div className="mt-2 space-y-1.5">
                        {availableScenes.map((scene) => (
                          <button
                            key={scene.id}
                            type="button"
                            onClick={() => handleStartScene(scene.id)}
                            className="w-full rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-3 py-2 text-left transition-colors hover:bg-[#E8E0CE]"
                          >
                            <span className="block text-[12px] font-medium text-[#2D4A1F]">
                              {getSceneDisplayTitle(scene)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {activeScene && (
                    <button
                      type="button"
                      onClick={handleExitScene}
                      className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#F3EDE0]"
                    >
                      <span className="block text-[12px] font-medium text-[#2D4A1F]">
                        {uiLanguage === "zh" ? "回到随便聊" : "Back to free chat"}
                      </span>
                      <span className="block mt-0.5 text-[10px] text-[#7A7060]">
                        {uiLanguage === "zh" ? "结束这个小场景，回到普通聊天" : "Leave the scene and return to free chat."}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsScenePickerOpen(false);
                      setIsTopicIdeasOpen((prev) => !prev);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#F3EDE0]"
                  >
                    <span className="block text-[12px] font-medium text-[#2D4A1F]">{topicIdeasTitle}</span>
                    <span className="block mt-0.5 text-[10px] text-[#7A7060]">{topicIdeasSubtitle}</span>
                  </button>
                  {isTopicIdeasOpen && (
                    <div className="mt-1 rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/55 p-2">
                      <div className="mb-2 px-1">
                        <span className="inline-flex rounded-full bg-[#FAF6EE] px-2 py-1 text-[10px] text-[#7A7060]">
                          {topicIdeasModeLabel}
                        </span>
                      </div>
                      {isTopicIdeasOpeningMode && (
                        <button
                          type="button"
                          onClick={() => handleUseStarterPrompt(statusAwarePrompt)}
                          className="w-full rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-2.5 py-2 text-left transition-colors hover:bg-[#E8E0CE]"
                        >
                          <span className="block text-[10px] text-[#7A7060]">{statusAwareTitle}</span>
                          <span className="mt-0.5 block text-[12px] leading-relaxed text-[#2D4A1F] break-words">{statusAwarePrompt}</span>
                        </button>
                      )}
                      {!isTopicIdeasOpeningMode && (
                        <div className="mb-2 flex items-center justify-between gap-2 px-1">
                          {isTopicIdeasLoading ? (
                            <p className="py-1 text-[11px] text-[#7A7060]">{topicIdeasLoadingLabel}</p>
                          ) : (
                            <p className="py-1 text-[10px] text-[#7A7060]">
                              {uiLanguage === "zh" ? "这几句更贴近当前对话。" : "These lines fit the current conversation."}
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={handleRefreshTopicIdeas}
                            disabled={isTopicIdeasLoading || isRefreshingTopicIdeas}
                            className="shrink-0 rounded-full border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-2.5 py-1 text-[10px] text-[#2D4A1F] transition-colors hover:bg-[#E8E0CE] disabled:cursor-not-allowed disabled:opacity-55"
                          >
                            {refreshTopicIdeasLabel}
                          </button>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {displayedTopicIdeas.map((prompt) => (
                          <button
                            key={`menu-${prompt}`}
                            type="button"
                            onClick={() => handleUseStarterPrompt(prompt)}
                            className="max-w-full rounded-full border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-2.5 py-1 text-left text-[11px] leading-relaxed text-[#2D4A1F] transition-colors hover:bg-[#E8E0CE]"
                          >
                            <span className="block break-words">{prompt}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!canCreateSummary || isSummaryGenerating) return;
                      void handleCreateSummary();
                      setIsScenePickerOpen(false);
                      setIsInputActionsOpen(false);
                    }}
                    aria-disabled={isSummaryGenerating || !canCreateSummary}
                    className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                      canCreateSummary && !isSummaryGenerating
                        ? "hover:bg-[#F3EDE0]"
                        : "opacity-70"
                    }`}
                  >
                    <span className="block text-[12px] font-medium text-[#2D4A1F]">
                      {isSummaryGenerating ? copy.sidebar.creatingReview : copy.sidebar.createReview}
                    </span>
                    <span className="block mt-0.5 text-[10px] text-[#7A7060]">
                      {canCreateSummary || isSummaryGenerating
                        ? copy.sidebar.reviewDescription
                        : reviewDisabledHint}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsScenePickerOpen(false);
                      setIsInputActionsOpen(false);
                      setIsResetConfirmOpen(true);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#F3EDE0]"
                  >
                    <span className="block text-[12px] font-medium text-[#9A5555]">
                      {uiLanguage === "zh" ? "重新开始" : "Start over"}
                    </span>
                    <span className="block mt-0.5 text-[10px] text-[#7A7060]">
                      {uiLanguage === "zh" ? "清空当前对话，重新开始聊天" : "Clear chat and start fresh"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {inputMode === "text" ? (
              <>
                <textarea
                  ref={textInputRef}
                  value={inputText}
                  onChange={(e) => { setVoiceHint(null); setInputText(e.target.value); }}
                  onKeyDown={handleInputKeyDown}
                  onCompositionStart={() => setIsInputComposing(true)}
                  onCompositionEnd={() => setIsInputComposing(false)}
                  placeholder={copy.chat.placeholder}
                  rows={1}
                  className="min-w-0 flex-1 resize-none bg-[#EEE6D8] text-[#28231A] border border-[rgba(40,35,26,0.1)] rounded-xl px-4 py-2.5 md:px-5 text-sm leading-relaxed outline-none focus:bg-[#F6F0E3] focus:border-[#C9A84C]/55 focus:ring-2 focus:ring-[#C9A84C]/15 placeholder:text-[#7A7060]/55 disabled:cursor-not-allowed disabled:opacity-60 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  disabled={isTyping}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isTyping || !inputText.trim()}
                  className="shrink-0 text-sm font-medium text-[#F3EDE0] px-4 py-2.5 md:px-5 rounded-xl bg-[#2D4A1F] hover:bg-[#2D4A1F]/85 hover:shadow-[0_4px_12px_rgba(45,74,31,0.3)] active:translate-y-0.5 active:shadow-[0_2px_6px_rgba(45,74,31,0.2)] transition-all duration-150 disabled:cursor-not-allowed disabled:bg-[#D8CFBC] disabled:text-[#7A7060]/70 disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35"
                >
                  {isTyping ? copy.chat.sending : copy.chat.send}
                </button>
              </>
            ) : (
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={isRecording ? stopRecording : undefined}
                onTouchStart={(e) => { e.preventDefault(); void startRecording(); }}
                onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                disabled={isTyping}
                aria-label={isRecording ? copy.chat.stopRecording : copy.chat.startRecording}
                title={isRecording ? copy.chat.stopRecording : copy.chat.startRecording}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-center select-none transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35 ${
                  isRecording ? "bg-[#2D4A1F] text-[#F3EDE0] scale-[0.98] shadow-[0_0_0_2px_rgba(201,168,76,0.18)]" : "bg-[#E8E0CE] text-[#28231A] hover:bg-[#D8CFBC] hover:shadow-[0_3px_10px_rgba(40,35,26,0.08)] active:bg-[#2D4A1F] active:text-[#F3EDE0] active:shadow-[0_4px_12px_rgba(45,74,31,0.3)]"
                }`}
              >
                <MicIcon size={15} />
                <span>{isRecording ? copy.chat.recordingRelease : copy.chat.holdToTalk}</span>
              </button>
            )}
          </div>
        </div>
      </main>
      <ChatToast toast={summaryToast} />
      {renderSummaryDetail()}
      {isSavedPanelOpen && (
        <>
          <div className="fixed right-5 top-5 z-[91] rounded-full border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/95 px-3 py-1 text-[10px] text-[#7A7060]">
            {savedPanelSummary}
          </div>
          <SavedItemsPanel
            copy={copy}
            items={savedItems}
            onDelete={handleDeleteSavedItem}
            onClose={() => setIsSavedPanelOpen(false)}
          />
        </>
      )}
      {isReviewPanelOpen && !selectedSummaryCard && (
        <div className="fixed right-5 top-5 z-[91] rounded-full border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/95 px-3 py-1 text-[10px] text-[#7A7060]">
          {reviewPanelSummary}
        </div>
      )}
      {isHelpOpen && (
        <div className="fixed inset-0 z-[95] flex items-end md:items-center md:justify-center">
          <button
            type="button"
            aria-label={copy.common.close}
            className="absolute inset-0 bg-[#28231A]/25"
            onClick={() => setIsHelpOpen(false)}
          />
          <section className="relative w-full md:w-[min(36rem,92vw)] max-h-[78vh] overflow-y-auto rounded-t-2xl md:rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-4 md:px-5 md:py-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-semibold text-[#2D4A1F]">{helpTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHelpOpen(false)}
                className="rounded-md px-2 py-1 text-[11px] text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
              >
                {copy.common.close}
              </button>
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/65 px-3 py-2.5">
                <p className="text-[12px] font-medium text-[#2D4A1F]">{quickGuideTitle}</p>
                <div className="mt-1.5 space-y-1">
                  {quickGuideItems.map((line) => (
                    <p key={line} className="text-[11px] leading-relaxed text-[#6B6254]">{line}</p>
                  ))}
                </div>
              </div>

              {!isStandaloneMode && (
                <div className="rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/65 px-3 py-2.5">
                  <p className="text-[12px] font-medium text-[#2D4A1F]">{installHelpTitle}</p>
                  <div className="mt-1.5 space-y-1">
                    {installHelpLines.map((line) => (
                      <p key={line} className="text-[11px] leading-relaxed text-[#6B6254]">{line}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-4">
          <div
            className="absolute inset-0 bg-[rgba(31,42,24,0.14)] backdrop-blur-[2px]"
            onClick={() => setIsResetConfirmOpen(false)}
          />
          <div className="relative z-10 w-full max-w-[24.5rem] rounded-2xl border border-[rgba(55,72,42,0.14)] bg-[#f7f1e6] px-5 py-5 md:px-6 md:py-6 shadow-[0_18px_50px_rgba(31,42,24,0.16)]">
            <div>
              <h3 className="text-[17px] font-medium text-[#2D4A1F] leading-snug">
                {uiLanguage === "zh" ? "重新开始这段对话？" : "Start this chat over?"}
              </h3>
              <p className="mt-2.5 text-[13px] text-[#6B6254] leading-relaxed">
                {uiLanguage === "zh"
                  ? `会清空当前与${NPC_LIST.find(n => n.id === npcId)?.name}的聊天和临时记忆，但不会删除收藏和回顾卡。`
                  : `This clears the current chat and temporary memory for ${NPC_LIST.find(n => n.id === npcId)?.name}, but keeps saved items and review cards.`}
              </p>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="inline-flex items-center rounded-lg border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0]/8 px-4 py-2 text-[13px] font-medium text-[#6B6254] hover:bg-[#F3EDE0] transition-colors"
              >
                {uiLanguage === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearNpcChatData(npcId);
                  setMessages([]);
                  setActiveSceneId(null);
                  setLocalChatMarkers([]);
                  setTopicIdeas(null);
                  setTopicIdeasForceRefreshKey(null);
                  topicIdeasCacheRef.current.clear();
                  setMemories([]);
                  setIsResetConfirmOpen(false);
                  generatedInitialWelcomeForNpcRef.current.delete(npcId);
                  void triggerInitialWelcome(npcId, []);
                }}
                className="inline-flex items-center rounded-lg bg-[#2D4A1F] px-4 py-2 text-[13px] font-medium text-[#FAF6EE] hover:bg-[#243D18] active:scale-[0.99] transition-all"
              >
                {uiLanguage === "zh" ? "重新开始" : "Start over"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
