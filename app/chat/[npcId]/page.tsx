"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import { ChatSummaryDetail } from "@/components/chat-summary-detail";
import { ChatToast } from "@/components/chat-toast";
import { TimeDivider, shouldShowTimeDivider } from "@/components/chat-time-divider";
import { LanguageToggle } from "@/components/language-toggle";
import { SavedItemsPanel } from "@/components/saved-items-panel";
import { KeyboardIcon, MenuIcon, MicIcon } from "@/components/ui-icons";
import { detectNonJapaneseSpans } from "@/lib/non-japanese-spans";
import { getUiCopy } from "@/lib/ui-copy";
import { loadUiLanguage, saveUiLanguage, type UiLanguage } from "@/lib/ui-language";
import {
  getLocalNPCMemories,
  getConversationCount,
  loadChatHistory,
  saveChatHistory,
  saveLastChatTime,
  saveLocalNPCFacts,
  saveLocalNPCMemory,
  incrementConversationCount,
  type StoredMessage,
} from "@/lib/memory";
import { isNpcId, NPC_AVATARS, getNpcState, getWorldContext, type NpcId } from "@/lib/npc";
import {
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
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  npcAudioUrl?: string | null;
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

function loadRevisitWelcomeMarker(npcId: NpcId): { userMessageCount: number; sourceFingerprint: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(getRevisitWelcomeMarkerKey(npcId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{ userMessageCount: number; sourceFingerprint: string }>;
    if (
      typeof parsed.userMessageCount === "number" &&
      typeof parsed.sourceFingerprint === "string"
    ) {
      return {
        userMessageCount: parsed.userMessageCount,
        sourceFingerprint: parsed.sourceFingerprint,
      };
    }
  } catch {
    return null;
  }
  return null;
}

function saveRevisitWelcomeMarker(
  npcId: NpcId,
  marker: { userMessageCount: number; sourceFingerprint: string },
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getRevisitWelcomeMarkerKey(npcId), JSON.stringify(marker));
  } catch {
    // LocalStorage 写入失败不应该影响聊天主流程。
  }
}

const NPC_LIST: { id: NpcId; name: string; subname: string; location: string }[] = [
  { id: "kimura", name: "木村", subname: "きむら", location: "コンビニ" },
  { id: "misaki", name: "美咲", subname: "みさき", location: "カフェ" },
  { id: "taisho", name: "大将", subname: "たいしょう", location: "居酒屋" },
];

import { pickStarterPrompts } from "@/lib/starter-prompts";

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
  const [isTopicIdeasOpen, setIsTopicIdeasOpen] = useState(false);
  const [isOnboardingHintDismissed, setIsOnboardingHintDismissed] = useState(false);
  const copy = getUiCopy(uiLanguage);
  const reviewEntrySubtitle = uiLanguage === "zh" ? "聊天复习卡片" : "Chat review cards";
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
    if (!isInputActionsOpen) setIsTopicIdeasOpen(false);
  }, [isInputActionsOpen]);
  useEffect(() => { setIsSidebarOpen(false); }, [npcId]);
  useEffect(() => {
    setUiLanguage(loadUiLanguage());
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      setIsOnboardingHintDismissed(localStorage.getItem(ONBOARDING_HINT_DISMISSED_KEY) === "1");
    } catch {
      setIsOnboardingHintDismissed(false);
    }
  }, []);

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

  const getWelcomeRequest = (
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
    const worldContext = getWorldContext();
    const request = fetch("/api/welcome", {
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
  };

  const triggerInitialWelcome = async (
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
      };
      saveChatHistory(targetNpcId, [
        { role: "assistant", content: welcomeText, createdAt: welcomeMsg.createdAt },
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
  };

  const triggerRevisitWelcome = async (
    targetNpcId: NpcId,
    existingFacts: string[],
    restoredHistory: StoredMessage[],
    wasSeenThisSession: boolean,
  ) => {
    if (wasSeenThisSession) return;

    const lastMessage = restoredHistory[restoredHistory.length - 1];
    if (!lastMessage || lastMessage.role !== "assistant") return;

    const userMessageCount = countUserMessages(restoredHistory);
    if (userMessageCount === 0) return;

    const sourceFingerprint = createWelcomeSourceFingerprint(targetNpcId, restoredHistory);
    if (generatedRevisitWelcomeSourcesRef.current.has(sourceFingerprint)) return;

    const marker = loadRevisitWelcomeMarker(targetNpcId);
    if (
      marker &&
      (marker.sourceFingerprint === sourceFingerprint ||
        userMessageCount <= marker.userMessageCount)
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
      if (currentHistory[currentHistory.length - 1]?.role !== "assistant") return;

      const welcomeMsg: ChatMessage = {
        id: `welcome-revisit-${targetNpcId}-${Date.now()}`,
        sender: "assistant",
        text: welcomeText,
        type: "text",
        createdAt: new Date().toISOString(),
      };

      saveChatHistory(targetNpcId, [
        ...currentHistory,
        { role: "assistant", content: welcomeText, createdAt: welcomeMsg.createdAt },
      ]);
      saveRevisitWelcomeMarker(targetNpcId, { userMessageCount, sourceFingerprint });

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
  };

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
      }));
      setMessages(restored);
      void triggerRevisitWelcome(npcId, storedMemories, history, wasSeenThisSession);
      return;
    }

    setMessages([]);
    void triggerInitialWelcome(npcId, storedMemories);
  }, [npcId]);

  const fetchTtsUrl = useCallback(async (text: string): Promise<string | null> => {
    const cacheKey = `${npcId}:${text}`;
    const cached = npcAudioCacheRef.current.get(cacheKey);
    if (cached) return cached;
    try {
      const res = await fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, npcId }) });
      if (!res.ok) return null;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      npcAudioCacheRef.current.set(cacheKey, url);
      return url;
    } catch { return null; }
  }, [npcId]);

  const extractMemory = async (userText: string) => {
    try {
      const res = await fetch("/api/memory", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userText }) });
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
    const historyForApi: StoredMessage[] = messages.filter((m) => m.sender === "user" || m.sender === "assistant").map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text, createdAt: m.createdAt }));
    historyForApi.push({ role: "user", content: userText, createdAt: userCreatedAt });
    const npcState = getNpcState(npcId);
    const worldContext = getWorldContext();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: userText, npcId, history: historyForApi.slice(-10), memories, conversationCount: getConversationCount(npcId), lifeArc: npcState.arcDescription, lifeArcState: npcState.label, crossMentions: npcState.crossMentions, worldDescription: worldContext.description, worldReaction: worldContext.reactions[npcId] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? copy.common.genericError);
      const useVoice = true;
      let npcAudioUrl: string | null = null;
      if (useVoice) npcAudioUrl = await fetchTtsUrl(data.text);
      const assistantMsg: ChatMessage = { id: `assistant-${Date.now()}`, sender: "assistant", text: data.text, type: useVoice ? "voice" : "text", createdAt: new Date().toISOString(), npcAudioUrl };
      setMessages((prev) => { const next = [...prev, assistantMsg]; saveChatHistory(npcId, next.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text, createdAt: m.createdAt }))); return next; });
      saveLastChatTime(npcId);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "网络错误");
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, sender: "assistant", text: "ごめん、ちょっと通信が不安定みたい…もう一度送ってくれる？😅", type: "text" }]);
    } finally { setIsTyping(false); }
  };

  const handleSend = () => { setVoiceHint(null); void sendToNpc(inputText); };
  const handleUseStarterPrompt = (prompt: string) => {
    setVoiceHint(null);
    setInputMode("text");
    setInputText((prev) => (prev.trim() ? `${prev}\n${prompt}` : prompt));
    setIsInputActionsOpen(false);
    setIsTopicIdeasOpen(false);
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
          const sttRes = await fetch("/api/stt", { method: "POST", body: formData });
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

  const currentNpc = NPC_LIST.find((npc) => npc.id === npcId) ?? NPC_LIST[1];
  const userMessageCount = messages.filter((message) => message.sender === "user").length;
  const showStarterPrompts = userMessageCount === 0;
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
  const topicIdeasTitle = uiLanguage === "zh" ? "找话题" : "Topic ideas";
  const topicIdeasSubtitle = uiLanguage === "zh"
    ? "不知道说什么时，可以从这里开始"
    : "Pick a low-pressure prompt to keep talking";
  const visibleStarterPrompts = pickStarterPrompts(npcId, userMessageCount);
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
      const res = await fetch("/api/session-summary", {
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
            {copy.sidebar.backToMap}
          </Link>

          <section className="space-y-1.5 pt-2.5">
            <h2 className="px-3 text-[11px] font-semibold tracking-[0.14em] uppercase text-[#D4C8A8]/58">
              {copy.sidebar.residents}
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
              <span className="mt-0.5 text-[10px] leading-relaxed text-[#D4C8A8]/55 block">{copy.sidebar.savedSubtitle}</span>
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
    <div className="flex h-screen overflow-hidden bg-[#F3EDE0]">
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
      <main className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-4 md:px-8 bg-[#FAF6EE] border-b border-[rgba(40,35,26,0.08)]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={copy.sidebar.openMenu}
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8E0CE] text-sm text-[#28231A] transition-colors hover:bg-[#D8CFBC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35 md:hidden"
            >
              <MenuIcon size={17} />
            </button>
            <img src={NPC_AVATARS[npcId]} alt={currentNpc.name} className="w-9 h-9 rounded-full object-cover" />
            <div className="min-w-0">
              <span className="font-medium text-sm text-[#28231A] block truncate">{currentNpc.name}</span>
              <span className="text-[9px] text-[#7A7060] block truncate">
                {currentNpc.subname}・{currentNpc.location}
              </span>
            </div>
          </div>
        </div>

        {apiError && (
          <div className="mx-4 mt-3 px-4 py-2 md:mx-8 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">{apiError}</div>
        )}

        {/* 聊天消息区域 — max-w-4xl 居中 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 pt-6 pb-8 md:px-8 md:pb-10 space-y-4">
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
              </section>
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
        <div className="border-t border-[rgba(40,35,26,0.08)] bg-[#FAF6EE]/95">
          {voiceHint && (
            <div className="max-w-4xl mx-auto px-4 pt-3 md:px-8">
              <p className="inline-flex rounded-full bg-[#E8E0CE]/70 px-3 py-1.5 text-[10px] text-[#7A7060]">
                {voiceHint}
              </p>
            </div>
          )}
          <div className="max-w-4xl mx-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setVoiceHint(null); setInputMode((prev) => (prev === "text" ? "voice" : "text")); }}
              disabled={isTyping}
              className="w-9 h-9 shrink-0 rounded-full bg-[#E8E0CE] hover:bg-[#D8CFBC] flex items-center justify-center text-sm text-[#28231A] transition-colors disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35"
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
                className={`w-9 h-9 rounded-full border border-[rgba(40,35,26,0.1)] bg-[#EDE7D8] text-[#2D4A1F] flex items-center justify-center text-lg leading-none transition-colors ${
                  isInputActionsOpen ? "bg-[#E8E0CE]" : "hover:bg-[#E8E0CE]"
                }`}
              >
                +
              </button>
              {isInputActionsOpen && (
                <div className="absolute bottom-11 left-0 z-30 w-56 rounded-xl border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] p-1.5 shadow-[0_6px_24px_rgba(40,35,26,0.15)]">
                  <button
                    type="button"
                    onClick={() => setIsTopicIdeasOpen((prev) => !prev)}
                    className="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[#F3EDE0]"
                  >
                    <span className="block text-[12px] font-medium text-[#2D4A1F]">{topicIdeasTitle}</span>
                    <span className="block mt-0.5 text-[10px] text-[#7A7060]">{topicIdeasSubtitle}</span>
                  </button>
                  {isTopicIdeasOpen && (
                    <div className="mt-1 rounded-lg border border-[rgba(40,35,26,0.08)] bg-[#F3EDE0]/55 p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {visibleStarterPrompts.map((prompt) => (
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
                </div>
              )}
            </div>

            {inputMode === "text" ? (
              <>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => { setVoiceHint(null); setInputText(e.target.value); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={copy.chat.placeholder}
                  className="min-w-0 flex-1 bg-[#EDE7D8] text-[#28231A] border border-[rgba(40,35,26,0.08)] rounded-xl px-4 py-2.5 md:px-5 text-sm outline-none focus:bg-[#F3EDE0] focus:border-[#C9A84C]/55 focus:ring-2 focus:ring-[#C9A84C]/15 placeholder:text-[#7A7060]/50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  disabled={isTyping}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isTyping || !inputText.trim()}
                  className="shrink-0 text-sm font-medium text-[#F3EDE0] px-4 py-2.5 md:px-5 rounded-xl bg-[#2D4A1F] hover:bg-[#2D4A1F]/85 transition-colors disabled:cursor-not-allowed disabled:bg-[#D8CFBC] disabled:text-[#7A7060]/70 disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35"
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
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-center select-none transition-all disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35 ${
                  isRecording ? "bg-[#2D4A1F] text-[#F3EDE0] scale-[0.98] shadow-[0_0_0_2px_rgba(201,168,76,0.18)]" : "bg-[#E8E0CE] text-[#28231A] hover:bg-[#D8CFBC] active:bg-[#2D4A1F] active:text-[#F3EDE0]"
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
        <SavedItemsPanel
          copy={copy}
          items={savedItems}
          onDelete={handleDeleteSavedItem}
          onClose={() => setIsSavedPanelOpen(false)}
        />
      )}
    </div>
  );
}
