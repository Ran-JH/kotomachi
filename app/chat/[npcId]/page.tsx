"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChatBubble } from "@/components/chat-bubble";
import {
  getLocalNPCMemories,
  getLastChatTime,
  getConversationCount,
  loadChatHistory,
  saveChatHistory,
  saveLastChatTime,
  saveLocalNPCFacts,
  saveLocalNPCMemory,
  incrementConversationCount,
  type StoredMessage,
} from "@/lib/memory";
import { isNpcId, NPC_NAMES, NPC_AVATARS, getNpcState, getWorldContext, type NpcId } from "@/lib/npc";

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

const GREETINGS: Record<NpcId, string> = {
  misaki: "こんにちは！初めまして、美咲です😊 コーヒー好きですか？",
  kimura: "よ！初めまして、木村っていうの。よろしくな！✌️",
  taisho: "おう、初めまして！まあ座りな、何飲む？🍺",
};

const NPC_LIST: { id: NpcId; name: string; subname: string; location: string }[] = [
  { id: "kimura", name: "木村", subname: "きむら", location: "コンビニ" },
  { id: "misaki", name: "美咲", subname: "みさき", location: "カフェ" },
  { id: "taisho", name: "大将", subname: "たいしょう", location: "居酒屋" },
];

function getInteractionStage(messageCount: number): number {
  if (messageCount >= 12) return 2;
  if (messageCount >= 5) return 1;
  return 0;
}

function formatTimeDiff(lastTime: number): string | null {
  const diffMs = Date.now() - lastTime;
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours <= 6) return null;
  if (diffHours < 24) return `${Math.round(diffHours)}時間前`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}日前`;
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const npcAudioCacheRef = useRef<Map<string, string>>(new Map());
  const userAudioUrlsRef = useRef<string[]>([]);
  const welcomeTriggeredRef = useRef(false);
  const voiceHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); };
  useEffect(() => { scrollToBottom(); }, [messages, isTyping]);
  useEffect(() => { return () => { userAudioUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }; }, []);
  useEffect(() => {
    return () => {
      if (voiceHintTimerRef.current) clearTimeout(voiceHintTimerRef.current);
    };
  }, []);
  useEffect(() => { setIsSidebarOpen(false); }, [npcId]);

  const showVoiceHint = (message: string) => {
    setVoiceHint(message);
    if (voiceHintTimerRef.current) clearTimeout(voiceHintTimerRef.current);
    voiceHintTimerRef.current = setTimeout(() => setVoiceHint(null), 4000);
  };

  useEffect(() => {
    welcomeTriggeredRef.current = false;
    const storedMemories = getLocalNPCMemories(npcId);
    setMemories(storedMemories);
    const history = loadChatHistory(npcId);
    const lastTime = getLastChatTime(npcId);

    if (history.length > 0) {
      const restored: ChatMessage[] = history.map((m, i) => ({
        id: `stored-${i}`, sender: m.role === "user" ? "user" : "assistant",
        text: m.content, type: "text" as const,
      }));
      setMessages(restored);
      if (lastTime) {
        const timeDiffText = formatTimeDiff(lastTime);
        if (timeDiffText && !welcomeTriggeredRef.current) {
          welcomeTriggeredRef.current = true;
          void triggerColdStartWelcome(npcId, history, storedMemories, timeDiffText);
        }
      }
    } else {
      const count = getConversationCount(npcId);
      let greeting = GREETINGS[npcId];
      if (count > 15) {
        const casualGreetings: Record<NpcId, string> = { misaki: "あ、また来たね😊", kimura: "お、また来た！", taisho: "おう、また来たか！" };
        greeting = casualGreetings[npcId];
      } else if (count > 5) {
        const warmGreetings: Record<NpcId, string> = { misaki: "こんにちは！今日はどうしたの？😊", kimura: "いらっしゃい！元気だった？", taisho: "よお！今日はどうだい？🍺" };
        greeting = warmGreetings[npcId];
      }
      if (storedMemories.length > 0) {
        const fact = storedMemories[storedMemories.length - 1];
        greeting = `あ、そういえば…${fact} のこと、覚えてるよ😊\n${greeting}`;
      }
      setMessages([{ id: "greeting", sender: "assistant", text: greeting, type: "text" }]);
    }
  }, [npcId]);

  const triggerColdStartWelcome = async (npcId: NpcId, history: StoredMessage[], existingFacts: string[], timeDiffText: string) => {
    setIsTyping(true);
    try {
      const npcState = getNpcState(npcId);
      const worldContext = getWorldContext();
      const res = await fetch("/api/welcome", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ npcId, history, existingFacts, timeDiffText, lifeArc: npcState.arcDescription, lifeArcState: npcState.label, crossMentions: npcState.crossMentions, worldDescription: worldContext.description, worldReaction: worldContext.reactions[npcId] }) });
      const data = await res.json();
      if (data.welcomeMessage) {
        const welcomeMsg: ChatMessage = { id: `welcome-${Date.now()}`, sender: "assistant", text: data.welcomeMessage, type: "text" };
        setMessages((prev) => { const next = [...prev, welcomeMsg]; saveChatHistory(npcId, next.map((m) => ({ role: m.sender === "user" ? "user" : "assistant", content: m.text }))); return next; });
      }
      if (data.extractedFacts) { saveLocalNPCFacts(npcId, data.extractedFacts); setMemories(data.extractedFacts); }
      saveLastChatTime(npcId);
    } catch { /* 静默 */ } finally { setIsTyping(false); }
  };

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
              showVoiceHint(sttData.message ?? "声が聞こえませんでした。もう一度話すか、文字で入力してね。");
            } else {
              setApiError("音声の認識に失敗しました。文字入力で続けることもできます。");
            }
            setIsTyping(false);
            return;
          }
          if (sttData.code === "NO_SPEECH" || !sttData.text?.trim()) {
            showVoiceHint(sttData.message ?? "声が聞こえませんでした。もう一度話すか、文字で入力してね。");
            setIsTyping(false);
            return;
          }
          await sendToNpc(sttData.text, blob);
        } catch {
          setApiError("音声の認識に失敗しました。文字入力で続けることもできます。");
          setIsTyping(false);
        }
      };
      recorder.start(); setIsRecording(true);
    } catch { setApiError("マイクにアクセスできませんでした。ブラウザの録音権限を確認してください。"); }
  };

  const stopRecording = () => { if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop(); setIsRecording(false); };

  const stage = getInteractionStage(messages.length);
  const renderSidebarContent = (closeOnNavigate = false) => {
    const handleNavigate = closeOnNavigate ? () => setIsSidebarOpen(false) : undefined;

    return (
      <>
        {/* 品牌标题 */}
        <div className="px-5 pt-6 pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <Link href="/" className="group" onClick={handleNavigate}>
            <h1 className="text-base font-light tracking-widest text-[#D4C8A8] group-hover:text-[#C9A84C] transition-colors font-serif">
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
                    ? "bg-[#253318] border-l-2 border-[#C9A84C]"
                    : "border-l-2 border-transparent hover:bg-[#253318]/50 hover:border-[rgba(255,255,255,0.06)]"
                }`}
              >
                <img src={NPC_AVATARS[npc.id]} alt={npc.name} className="w-9 h-9 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs block truncate ${isActive ? "text-[#C9A84C] font-medium" : "text-[#D4C8A8]"}`}>{npc.name}</span>
                  <span className="text-[8px] text-[#D4C8A8]/40 block truncate">{npc.subname} · {npc.location}</span>
                </div>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#C9A84C]" />}
              </Link>
            );
          })}
        </nav>

        {/* 底部返回 */}
        <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
          <Link
            href="/"
            onClick={handleNavigate}
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] text-[10px] text-[#D4C8A8]/50 hover:text-[#D4C8A8]/80 transition-colors"
          >
            ← 地図に戻る
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
        aria-label="NPC メニューを閉じる"
        aria-hidden={!isSidebarOpen}
        tabIndex={isSidebarOpen ? 0 : -1}
        onClick={() => setIsSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity md:hidden ${
          isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        aria-label="NPC navigation"
        aria-hidden={!isSidebarOpen}
        className={`fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-xs flex-col bg-[#1E2A16] text-[#D4C8A8] shadow-2xl transition-transform duration-300 ease-out md:hidden ${
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
              aria-label="NPC メニューを開く"
              onClick={() => setIsSidebarOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8E0CE] text-sm text-[#28231A] transition-colors hover:bg-[#D8CFBC] md:hidden"
            >
              ☰
            </button>
            <img src={NPC_AVATARS[npcId]} alt={NPC_NAMES[npcId]} className="w-9 h-9 rounded-full object-cover" />
            <div className="min-w-0">
              <span className="font-medium text-sm text-[#28231A] block truncate">{NPC_NAMES[npcId]}</span>
              <span className="text-[9px] text-[#7A7060]">
                常時オンライン · {stage === 0 ? "文字モード" : stage === 1 ? "音声返信" : "音声会話"}
              </span>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>

        {apiError && (
          <div className="mx-4 mt-3 px-4 py-2 md:mx-8 bg-red-50 border border-red-200 rounded-lg text-[10px] text-red-700">{apiError}</div>
        )}

        {/* 聊天消息区域 — max-w-4xl 居中 */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 md:px-8 space-y-4">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
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
                <span className="bg-[#FAF6EE] border border-[rgba(40,35,26,0.06)] rounded-full px-3 py-1 text-[10px]">入力中...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 底部输入区域 */}
        <div className="border-t border-[rgba(40,35,26,0.08)] bg-[#FAF6EE]">
          {voiceHint && (
            <div className="max-w-4xl mx-auto px-4 pt-3 md:px-8">
              <p className="inline-flex rounded-full bg-[#E8E0CE]/70 px-3 py-1.5 text-[10px] text-[#7A7060]">
                {voiceHint}
              </p>
            </div>
          )}
          <div className="max-w-4xl mx-auto px-4 py-3 md:px-8 flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setVoiceHint(null); setInputMode((prev) => (prev === "text" ? "voice" : "text")); }}
              className="w-9 h-9 shrink-0 rounded-full bg-[#E8E0CE] hover:bg-[#D8CFBC] flex items-center justify-center text-sm transition-colors"
              title={inputMode === "text" ? "语音输入" : "文字输入"}
            >
              {inputMode === "text" ? "🎙️" : "⌨️"}
            </button>

            {inputMode === "text" ? (
              <>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => { setVoiceHint(null); setInputText(e.target.value); }}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="メッセージを入力…"
                  className="min-w-0 flex-1 bg-[#EDE7D8] text-[#28231A] border border-[rgba(40,35,26,0.08)] rounded-xl px-4 py-2.5 md:px-5 text-sm outline-none focus:border-[rgba(40,35,26,0.2)] placeholder:text-[#7A7060]/50 transition-colors"
                  disabled={isTyping}
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={isTyping || !inputText.trim()}
                  className="shrink-0 text-sm font-medium text-[#F3EDE0] px-4 py-2.5 md:px-5 rounded-xl bg-[#2D4A1F] hover:bg-[#2D4A1F]/85 transition-colors disabled:opacity-30"
                >
                  送信
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
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-center select-none transition-all ${
                  isRecording ? "bg-[#2D4A1F] text-[#F3EDE0] scale-[0.98]" : "bg-[#E8E0CE] text-[#28231A] active:bg-[#2D4A1F] active:text-[#F3EDE0]"
                }`}
              >
                {isRecording ? "話しています… 離して送信" : "長押しして話す"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
