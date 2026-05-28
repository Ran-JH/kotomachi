"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import { KeyboardIcon, MenuIcon, MicIcon } from "@/components/ui-icons";
import { detectNonJapaneseSpans } from "@/lib/non-japanese-spans";
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

function formatSummaryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}

function getUpgradeSourceLabel(source: string): string {
  if (source === "expression_hint") return "来自表达提示";
  if (source === "non_japanese_span") return "来自输入缺口";
  return "来自对话";
}

function getWordSourceLabel(source: string): string {
  return source === "looked_up" ? "查过的词" : "来自对话";
}

function SectionTitle({ jp, zh }: { jp: string; zh: string }) {
  return (
    <h3 className="font-ui flex items-baseline gap-2 text-sm font-semibold text-[#2D4A1F]">
      <span>{zh}</span>
      <span className="text-[10px] font-normal text-[#7A7060]">{jp}</span>
    </h3>
  );
}

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
  const [selectedSummaryCard, setSelectedSummaryCard] = useState<SessionSummaryCard | null>(null);
  const [isSummaryGenerating, setIsSummaryGenerating] = useState(false);
  const [summaryToast, setSummaryToast] = useState<{ message: string; tone: "info" | "success" | "error" } | null>(null);

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
  useEffect(() => { setIsSidebarOpen(false); }, [npcId]);

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
      };
      saveChatHistory(targetNpcId, [{ role: "assistant", content: welcomeText }]);
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
      };

      saveChatHistory(targetNpcId, [
        ...currentHistory,
        { role: "assistant", content: welcomeText },
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
    setSelectedSummaryCard(null);
    setSummaryToast(null);
    const storedMemories = getLocalNPCMemories(npcId);
    setMemories(storedMemories);
    const history = loadChatHistory(npcId);

    if (history.length > 0) {
      const restored: ChatMessage[] = history.map((m, i) => ({
        id: `stored-${i}`, sender: m.role === "user" ? "user" : "assistant",
        text: m.content, type: "text" as const,
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
    const userAudioUrl = userAudioBlob ? URL.createObjectURL(userAudioBlob) : null;
    if (userAudioUrl) userAudioUrlsRef.current.push(userAudioUrl);
    const userMsg: ChatMessage = { id: `user-${Date.now()}`, sender: "user", text: userText, type: userAudioBlob ? "voice" : "text", userAudioBlob: userAudioBlob ?? null, userAudioUrl };
    setMessages((prev) => [...prev, userMsg]);
    setInputText(""); setIsTyping(true);
    void extractMemory(userText); incrementConversationCount(npcId);
    const historyForApi: StoredMessage[] = messages.filter((m) => m.sender === "user" || m.sender === "assistant").map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }));
    historyForApi.push({ role: "user", content: userText });
    const npcState = getNpcState(npcId);
    const worldContext = getWorldContext();
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: userText, npcId, history: historyForApi.slice(-10), memories, conversationCount: getConversationCount(npcId), lifeArc: npcState.arcDescription, lifeArcState: npcState.label, crossMentions: npcState.crossMentions, worldDescription: worldContext.description, worldReaction: worldContext.reactions[npcId] }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "对话失败");
      const useVoice = true;
      let npcAudioUrl: string | null = null;
      if (useVoice) npcAudioUrl = await fetchTtsUrl(data.text);
      const assistantMsg: ChatMessage = { id: `assistant-${Date.now()}`, sender: "assistant", text: data.text, type: useVoice ? "voice" : "text", npcAudioUrl };
      setMessages((prev) => { const next = [...prev, assistantMsg]; saveChatHistory(npcId, next.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }))); return next; });
      saveLastChatTime(npcId);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "网络错误");
      setMessages((prev) => [...prev, { id: `err-${Date.now()}`, sender: "assistant", text: "ごめん、ちょっと通信が不安定みたい…もう一度送ってくれる？😅", type: "text" }]);
    } finally { setIsTyping(false); }
  };

  const handleSend = () => { setVoiceHint(null); void sendToNpc(inputText); };

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
              showVoiceHint("没听清，可以再说一次，或直接输入文字。");
            } else {
              setApiError("语音识别失败，可以继续用文字输入。");
            }
            setIsTyping(false);
            return;
          }
          if (sttData.code === "NO_SPEECH" || !sttData.text?.trim()) {
            showVoiceHint("没听清，可以再说一次，或直接输入文字。");
            setIsTyping(false);
            return;
          }
          await sendToNpc(sttData.text, blob);
        } catch {
          setApiError("语音识别失败，可以继续用文字输入。");
          setIsTyping(false);
        }
      };
      recorder.start(); setIsRecording(true);
    } catch { setApiError("无法访问麦克风，请在浏览器里允许录音权限。"); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop(); setIsRecording(false); };

  const currentNpc = NPC_LIST.find((npc) => npc.id === npcId) ?? NPC_LIST[1];
  const userMessageCount = messages.filter((message) => message.sender === "user").length;
  const recentSummaryMessages = useMemo<SessionSummaryMessage[]>(() => {
    return messages
      .filter((message) => message.sender === "user" || message.sender === "assistant")
      .slice(-16)
      .map((message) => ({
        id: message.id,
        role: message.sender,
        content: message.text,
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
    setSelectedSummaryCard(card);
    if (closeDrawer) setIsSidebarOpen(false);
  };

  const handleDeleteSummaryCard = (cardId: string) => {
    deleteSummaryCard(cardId);
    setSummaryCards(loadSummaryCards(npcId));
    setSelectedSummaryCard(null);
    showSummaryToast("回顾卡片已删除。", "success");
  };

  const buildSummaryCard = (
    apiCard: SessionSummaryApiCard,
    sourceInfo: ReturnType<typeof createSummarySourceInfo>,
  ): SessionSummaryCard => ({
    schemaVersion: 1,
    id: createSummaryId("summary"),
    createdAt: new Date().toISOString(),
    npcId,
    ...sourceInfo,
    sourceUserMessageCount: userMessageCount,
    title: apiCard.title,
    topicSummary: apiCard.topicSummary,
    reusableExpressions: apiCard.reusableExpressions ?? [],
    expressionUpgrades: apiCard.expressionUpgrades ?? [],
    reviewWords: apiCard.reviewWords ?? [],
    nextTalkPrompt: apiCard.nextTalkPrompt,
  });

  const handleCreateSummary = async () => {
    if (existingSourceCard) {
      setSelectedSummaryCard(existingSourceCard);
      showSummaryToast("这段对话已经生成过回顾卡片，已为你打开。");
      setIsSidebarOpen(false);
      return;
    }

    if (!canCreateSummary) {
      showSummaryToast("再聊几句后，就可以生成回顾卡片了。");
      return;
    }

    const duplicateCard = findSummaryCardByFingerprint(npcId, currentSummarySource.sourceFingerprint);
    if (duplicateCard) {
      setSelectedSummaryCard(duplicateCard);
      showSummaryToast("这段对话已经生成过回顾卡片，已为你打开。");
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
          messages: recentSummaryMessages,
          recentLookups: loadRecentLookups(npcId, 5),
          recentExpressionHints: loadRecentExpressionHints(npcId, 5),
          nonJapaneseSpans: detectNonJapaneseSpans(userMessages),
        }),
      });
      const data = (await res.json()) as { card?: SessionSummaryApiCard; error?: string };
      if (!res.ok || !data.card) {
        throw new Error(data.error ?? "回顾卡片生成失败，请稍后再试。");
      }
      const card = buildSummaryCard(data.card, currentSummarySource);
      saveSummaryCard(card);
      setSummaryCards(loadSummaryCards(npcId));
      setSelectedSummaryCard(card);
      setIsSidebarOpen(false);
    } catch {
      showSummaryToast("回顾卡片生成失败，请稍后再试。", "error");
    } finally {
      setIsSummaryGenerating(false);
    }
  };

  const renderSummaryDetail = () => {
    if (!selectedSummaryCard) return null;
    const card = selectedSummaryCard;

    return (
      <div className="fixed inset-0 z-30 flex justify-end">
        <button
          type="button"
          aria-label="关闭回顾卡片"
          className="absolute inset-0 bg-[#28231A]/10"
          onClick={() => setSelectedSummaryCard(null)}
        />
        <aside className="relative flex h-full w-full max-w-lg flex-col bg-[#F3EDE0] border-l border-[rgba(40,35,26,0.08)] shadow-[-8px_0_30px_rgba(40,35,26,0.12)]">
          <header className="shrink-0 border-b border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-5 sm:px-6">
            <button
              type="button"
              onClick={() => setSelectedSummaryCard(null)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
              aria-label="关闭"
            >
              ✕
            </button>
            <p className="font-ui text-[10px] text-[#7A7060]">{formatSummaryDate(card.createdAt)} · 回顾卡片 / ふりかえり</p>
            <h2 className="font-ui mt-1.5 pr-8 text-base font-semibold leading-snug text-[#28231A]">{card.title}</h2>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-[#28231A] sm:px-6">
            <section>
              <SectionTitle jp="今日の話" zh="今天聊了什么" />
              <p className="font-ja mt-2 text-sm leading-relaxed text-[#4A4438]">{card.topicSummary}</p>
            </section>

            {card.reusableExpressions.length > 0 && (
              <section>
                <SectionTitle jp="そのまま使える表現" zh="可直接复用的表达" />
                <div className="mt-3 space-y-2.5">
                  {card.reusableExpressions.map((item, index) => (
                    <div key={`${item.expression}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3">
                      <p className="font-ja text-sm font-medium leading-[1.8] text-[#28231A]">{item.expression}</p>
                      {item.note && <p className="font-ui mt-1.5 text-[11px] leading-relaxed text-[#6B6254]">{item.note}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {card.expressionUpgrades.length > 0 && (
              <section>
                <SectionTitle jp="次はこう言える" zh="下次可以这样说" />
                <div className="mt-3 space-y-3">
                  {card.expressionUpgrades.map((item, index) => (
                    <div key={`${item.original}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3">
                      <p className="font-ui text-[10px] text-[#7A7060]">{getUpgradeSourceLabel(item.source)}</p>
                      <div className="mt-2.5 space-y-3">
                        <div>
                          <p className="font-ui text-[11px] font-semibold text-[#7A7060]">原表达</p>
                          <p className="font-ui mt-1 text-sm leading-relaxed text-[#4A4438]">{item.original}</p>
                        </div>
                        <div>
                          <p className="font-ui text-[11px] font-semibold text-[#7A7060]">可以这样说</p>
                          <p className="font-ja mt-1 text-[15px] font-medium leading-[1.85] text-[#2D4A1F]">{item.suggestion}</p>
                        </div>
                        {item.note && (
                          <div>
                            <p className="font-ui text-[11px] font-semibold text-[#7A7060]">学习点</p>
                            <p className="font-ui mt-1 text-[12px] leading-relaxed text-[#6B6254]">{item.note}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {card.reviewWords.length > 0 && (
              <section>
                <SectionTitle jp="今日のことば" zh="今日词语" />
                <div className="mt-3 space-y-2.5">
                  {card.reviewWords.map((item, index) => (
                    <div key={`${item.word}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-ja text-sm font-medium text-[#28231A]">{item.word}</p>
                        <span className="font-ui shrink-0 rounded-full bg-[#E8E0CE] px-2 py-0.5 text-[10px] text-[#6B6254]">{getWordSourceLabel(item.source)}</span>
                      </div>
                      {item.reading && <p className="font-ja mt-1 text-[11px] text-[#7A7060]">{item.reading}</p>}
                      <p className="font-ui mt-1.5 text-[12px] leading-relaxed text-[#4A4438]">{item.meaning}</p>
                      {item.example && <p className="font-ja mt-1.5 text-[12px] leading-relaxed text-[#6B6254]">{item.example}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {card.nextTalkPrompt && (
              <section className="rounded-xl bg-[#E8E0CE]/65 px-4 py-4">
                <SectionTitle jp="次に話してみること" zh="下次可以聊" />
                <p className="font-ja mt-2 text-sm leading-relaxed text-[#4A4438]">{card.nextTalkPrompt}</p>
              </section>
            )}
          </div>

          <footer className="shrink-0 border-t border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
            <button
              type="button"
              onClick={() => handleDeleteSummaryCard(card.id)}
              className="font-ui text-[11px] text-[#7A7060] hover:text-[#9A4A3A] transition-colors"
            >
              删除这张卡片
            </button>
          </footer>
        </aside>
      </div>
    );
  };

  const renderSidebarContent = (closeOnNavigate = false) => {
    const handleNavigate = closeOnNavigate ? () => setIsSidebarOpen(false) : undefined;

    return (
      <>
        {/* 品牌标题 */}
        <div className="px-5 pt-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <Link href="/" className="group" onClick={handleNavigate}>
            <h1 className="font-brand text-base font-light tracking-widest text-[#D4C8A8] group-hover:text-[#C9A84C] transition-colors">
              言街 Kotomachi
            </h1>
          </Link>
        </div>

        {/* NPC 列表 */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          {NPC_LIST.map((npc) => {
            const isActive = npc.id === npcId;
            return (
              <Link
                key={npc.id}
                href={`/chat/${npc.id}`}
                onClick={handleNavigate}
                className={`flex items-center gap-3 px-5 py-3 transition-all duration-200 ${
                  isActive
                    ? "bg-[#253318] border-l-2 border-[#C9A84C] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    : "border-l-2 border-transparent hover:bg-[#253318]/45 hover:border-[rgba(255,255,255,0.08)]"
                }`}
              >
                <img
                  src={NPC_AVATARS[npc.id]}
                  alt={npc.name}
                  className={`w-9 h-9 rounded-full object-cover transition-shadow ${
                    isActive ? "ring-1 ring-[#C9A84C]/55" : "ring-1 ring-transparent"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs block truncate ${isActive ? "text-[#C9A84C] font-medium" : "text-[#D4C8A8]"}`}>{npc.name}</span>
                  <span className="text-[8px] text-[#D4C8A8]/40 block truncate">{npc.subname}・{npc.location}</span>
                </div>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />}
              </Link>
            );
          })}
        </nav>

        <section className="border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
          <div className="mb-2">
            <h2 className="text-[11px] font-semibold tracking-wide text-[#D4C8A8]">回顾卡片</h2>
            <p className="mt-0.5 text-[8px] text-[#D4C8A8]/45">ふりかえり</p>
          </div>
          <p className="mb-2 text-[9px] leading-relaxed text-[#D4C8A8]/45">
            把这段聊天整理成复习卡片。
          </p>
          <button
            type="button"
            disabled={isSummaryGenerating}
            aria-disabled={!canCreateSummary}
            onClick={handleCreateSummary}
            className={`w-full rounded-lg px-3 py-2 text-[10px] font-medium transition-colors disabled:cursor-not-allowed ${
              canCreateSummary
                ? "bg-[#C9A84C]/90 text-[#1E2A16] hover:bg-[#C9A84C]"
                : "bg-[rgba(255,255,255,0.05)] text-[#D4C8A8]/45 hover:bg-[rgba(255,255,255,0.08)]"
            }`}
          >
            {isSummaryGenerating ? "生成中…" : "生成本次回顾"}
          </button>
          <div className="mt-3 space-y-1.5">
            {summaryCards.slice(0, 5).length > 0 ? (
              summaryCards.slice(0, 5).map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleOpenSummaryCard(card, closeOnNavigate)}
                  className="w-full rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.07)]"
                >
                  <span className="block truncate text-[10px] text-[#D4C8A8]">{card.title}</span>
                  <span className="mt-0.5 block text-[8px] text-[#D4C8A8]/40">{formatSummaryDate(card.createdAt)}</span>
                </button>
              ))
            ) : (
              <p className="text-[8px] leading-relaxed text-[#D4C8A8]/35">
                聊天后，回顾卡片会保存在这里。
              </p>
            )}
          </div>
        </section>

        {/* 底部返回 */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <Link
            href="/"
            onClick={handleNavigate}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[10px] text-[#D4C8A8]/55 hover:text-[#D4C8A8]/85 transition-colors"
          >
            <span>返回地图</span>
            <span className="text-[8px] text-[#D4C8A8]/35">地図に戻る</span>
          </Link>
        </div>
      </>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#F3EDE0]">
      {/* ====== 移动端 NPC drawer ====== */}
      <button
        type="button"
        aria-label="关闭住人菜单"
        aria-hidden={!isSidebarOpen}
        tabIndex={isSidebarOpen ? 0 : -1}
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-[#28231A]/25 transition-opacity duration-200 md:hidden ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        aria-label="住人导航"
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
              aria-label="打开住人菜单"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8E0CE] text-sm text-[#28231A] transition-colors hover:bg-[#D8CFBC] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35 md:hidden"
            >
              <MenuIcon size={17} />
            </button>
            <img src={NPC_AVATARS[npcId]} alt={currentNpc.name} className="w-9 h-9 rounded-full object-cover" />
            <div className="min-w-0">
              <span className="font-medium text-sm text-[#28231A] block truncate">{currentNpc.name}</span>
              <span className="text-[9px] text-[#7A7060] block truncate">
                {currentNpc.subname}・{currentNpc.location} · 文字模式
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
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                messageId={msg.id}
                sender={msg.sender}
                text={msg.text}
                npcId={npcId}
                userAudioBlob={msg.userAudioBlob}
                userAudioUrl={msg.userAudioUrl}
                npcAudioUrl={msg.npcAudioUrl}
                isVoiceMessage={msg.sender === "assistant" || msg.type === "voice"}
                onPlayNpcAudio={msg.sender === "assistant" ? () => { void fetchTtsUrl(msg.text).then((url) => { if (url) new Audio(url).play(); }); } : undefined}
              />
            ))}
            {isTyping && (
              <div className="flex justify-start items-center gap-2 text-xs text-[#7A7060] animate-pulse">
                <img src={NPC_AVATARS[npcId]} alt="" className="w-6 h-6 rounded-full object-cover" />
                <span className="bg-[#FAF6EE] border border-[rgba(40,35,26,0.06)] rounded-full px-3 py-1 text-[10px]">正在回复…</span>
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
              aria-label={inputMode === "text" ? "切换到语音输入" : "切换到文字输入"}
              title={inputMode === "text" ? "语音输入" : "文字输入"}
            >
              {inputMode === "text" ? <MicIcon size={17} /> : <KeyboardIcon size={17} />}
            </button>

            {inputMode === "text" ? (
              <>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => { setVoiceHint(null); setInputText(e.target.value); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="输入消息，日中英都可以…"
                  className="min-w-0 flex-1 bg-[#EDE7D8] text-[#28231A] border border-[rgba(40,35,26,0.08)] rounded-xl px-4 py-2.5 md:px-5 text-sm outline-none focus:bg-[#F3EDE0] focus:border-[#C9A84C]/55 focus:ring-2 focus:ring-[#C9A84C]/15 placeholder:text-[#7A7060]/50 disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
                  disabled={isTyping}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isTyping || !inputText.trim()}
                  className="shrink-0 text-sm font-medium text-[#F3EDE0] px-4 py-2.5 md:px-5 rounded-xl bg-[#2D4A1F] hover:bg-[#2D4A1F]/85 transition-colors disabled:cursor-not-allowed disabled:bg-[#D8CFBC] disabled:text-[#7A7060]/70 disabled:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35"
                >
                  {isTyping ? "发送中…" : "发送"}
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
                aria-label={isRecording ? "停止录音" : "开始录音"}
                title={isRecording ? "停止录音" : "开始录音"}
                className={`flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-center select-none transition-all disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/35 ${
                  isRecording ? "bg-[#2D4A1F] text-[#F3EDE0] scale-[0.98] shadow-[0_0_0_2px_rgba(201,168,76,0.18)]" : "bg-[#E8E0CE] text-[#28231A] hover:bg-[#D8CFBC] active:bg-[#2D4A1F] active:text-[#F3EDE0]"
                }`}
              >
                <MicIcon size={15} />
                <span>{isRecording ? "录音中…松开发送" : "长按说话"}</span>
              </button>
            )}
          </div>
        </div>
      </main>
      {summaryToast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-4 right-4 top-4 z-[70] mx-auto max-w-sm rounded-xl border px-4 py-3 text-sm leading-relaxed shadow-[0_10px_30px_rgba(40,35,26,0.14)] md:left-auto md:right-5 md:mx-0 ${
            summaryToast.tone === "error"
              ? "border-[#B86B5E]/25 bg-[#FAF6EE] text-[#7A3E35]"
              : "border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] text-[#2D4A1F]"
          }`}
        >
          {summaryToast.message}
        </div>
      )}
      {renderSummaryDetail()}
    </div>
  );
}
