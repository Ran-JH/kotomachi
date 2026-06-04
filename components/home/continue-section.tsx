"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentChats, type RecentChat } from "@/lib/home-continue";
import { type UiLanguage } from "@/lib/ui-language";
import type { NpcId } from "@/lib/npc";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  aoi: { name: "葵", kana: "あおい", place: "学生ラウンジ" },
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

  if (!recentChats || recentChats.length === 0) return null;

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
    <section className="mx-auto w-full max-w-[1120px] px-4 py-4 md:px-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[#2D4A1F] md:text-base">{heading}</h3>
        </div>
      </div>

      <div className="space-y-3">
        {recentChats.map((chat) => {
          const info = NPC_INFO[chat.npcId];
          return (
            <Link
              key={chat.npcId}
              href={`/chat/${chat.npcId}`}
              className="flex w-full items-center gap-3 rounded-xl border border-[rgba(40,35,26,0.06)] bg-white/40 p-3 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(45,74,31,0.18)] hover:bg-white/60 hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 active:translate-y-0 active:scale-[0.995]"
            >
              <img
                src={chat.avatar}
                alt={info.name}
                className="h-10 w-10 rounded-full border border-[rgba(40,35,26,0.08)] object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium text-[#28231A]">{info.name}</span>
                  <span className="text-[10px] text-[#7A7060]">{info.place}</span>
                </div>

                <p className="truncate text-xs text-[#7A7060]">{chat.lastMessagePreview}</p>
              </div>

              <span className="shrink-0 text-[10px] text-[#9A9080]">
                {formatRelativeTime(chat.lastChatTime, uiLanguage)}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
