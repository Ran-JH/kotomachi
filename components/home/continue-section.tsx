"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getRecentChats, type RecentChat } from "@/lib/home-continue";
import { type UiLanguage } from "@/lib/ui-language";
import type { NpcId } from "@/lib/npc";

const NPC_INFO: Record<NpcId, { name: string; place: string }> = {
  aoi: { name: "葵", place: "学生ラウンジ" },
  haruka: { name: "遥", place: "研究室" },
  kimura: { name: "木村", place: "コンビニ" },
  misaki: { name: "美咲", place: "カフェ" },
  taisho: { name: "大将", place: "居酒屋" },
  nana: { name: "七海", place: "まちの生活サポートラウンジ" },
};

interface ContinueSectionProps {
  uiLanguage: UiLanguage;
}

function formatRelativeTime(timestamp: number, lang: UiLanguage): string {
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
}

export function ContinueSection({ uiLanguage }: ContinueSectionProps) {
  const [recentChats, setRecentChats] = useState<RecentChat[] | null>(null);

  useEffect(() => {
    setRecentChats(getRecentChats(2));
  }, []);

  const visibleChats = recentChats?.slice(0, 1) ?? [];

  if (visibleChats.length === 0) return null;

  const isZh = uiLanguage === "zh";
  const heading = isZh ? "刚才聊到这里" : "Pick up where you left off";
  const subtitle = isZh
    ? "想接着说也可以。"
    : "Continue a recent chat if you feel like it.";
  const ctaLabel = isZh ? "继续" : "Continue";

  return (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-3 md:px-5">
      <div className="mb-2.5">
        <h3 className="text-sm font-medium text-[#2D4A1F] md:text-base">{heading}</h3>
        <p className="mt-0.5 text-[11px] text-[#7A7060]">{subtitle}</p>
      </div>

      <div className="space-y-2">
        {visibleChats.map((chat) => {
          const info = NPC_INFO[chat.npcId];

          return (
            <Link
              key={chat.npcId}
              href={`/chat/${chat.npcId}`}
              className="flex w-full items-center gap-3 rounded-xl border border-[rgba(40,35,26,0.05)] bg-white/25 px-3 py-2.5 text-left transition-all duration-150 ease-out hover:border-[rgba(45,74,31,0.12)] hover:bg-white/35 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/30 active:scale-[0.995]"
            >
              <img
                src={chat.avatar}
                alt={info.name}
                className="h-9 w-9 rounded-full border border-[rgba(40,35,26,0.08)] object-cover"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-[#7A7060]">
                  <span className="font-medium text-[#28231A]">{info.name}</span>
                  <span>·</span>
                  <span className="truncate">{info.place}</span>
                </div>
                <p className="mt-0.5 truncate text-sm text-[#5F564A]">{chat.lastMessagePreview}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-[10px] text-[#9A9080]">
                  {formatRelativeTime(chat.lastChatTime, uiLanguage)}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#6B8F5E]">
                  {ctaLabel} -&gt;
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
