"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentChats, type RecentChat } from "@/lib/home-continue";
import { type UiLanguage } from "@/lib/ui-language";
import type { NpcId } from "@/lib/npc";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  haruka: { name: "遥", kana: "はるか", place: "研究室" },
  kimura: { name: "木村", kana: "きむら", place: "コンビニ" },
  misaki: { name: "美咲", kana: "みさき", place: "カフェ" },
  taisho: { name: "大将", kana: "たいしょう", place: "居酒屋" },
};

interface ContinueSectionProps {
  uiLanguage: UiLanguage;
}

export function ContinueSection({ uiLanguage }: ContinueSectionProps) {
  const [recentChats, setRecentChats] = useState<RecentChat[] | null>(null);

  useEffect(() => {
    setRecentChats(getRecentChats(2));
  }, []);

  if (!recentChats || recentChats.length === 0) {
    return null;
  }

  const isZh = uiLanguage === "zh";
  const heading = isZh ? "继续上次聊天" : "Continue where you left off";

  const formatRelativeTime = (timestamp: number, lang: UiLanguage): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return lang === "zh" ? "刚刚" : "Just now";
    if (hours < 24) return lang === "zh" ? "今天" : "Today";
    if (hours < 48) return lang === "zh" ? "昨天" : "Yesterday";
    if (days < 7) return lang === "zh" ? `${days}天前` : `${days} days ago`;

    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <section className="w-full max-w-[1120px] mx-auto px-4 md:px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm md:text-base font-medium text-[#2D4A1F]">{heading}</h3>
        </div>
      </div>

      <div className="space-y-3">
        {recentChats.map((chat) => {
          const info = NPC_INFO[chat.npcId];
          return (
            <Link
              key={chat.npcId}
              href={`/chat/${chat.npcId}`}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-[rgba(40,35,26,0.06)] bg-white/40 hover:bg-white/60 hover:border-[rgba(45,74,31,0.18)] hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 text-left"
            >
              <img
                src={chat.avatar}
                alt={info.name}
                className="w-10 h-10 rounded-full object-cover border border-[rgba(40,35,26,0.08)]"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#28231A]">{info.name}</span>
                  <span className="text-[10px] text-[#7A7060]">{info.place}</span>
                </div>

                <p className="text-xs text-[#7A7060] truncate">{chat.lastMessagePreview}</p>
              </div>

              <span className="text-[10px] text-[#9A9080] shrink-0">
                {formatRelativeTime(chat.lastChatTime, uiLanguage)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
