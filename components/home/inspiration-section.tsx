"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveHomeNpcIds } from "@/lib/home-scenes";
import { getStatusAwareTopicIdea } from "@/lib/starter-prompts";
import { getNpcDisplayName, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { type UiLanguage } from "@/lib/ui-language";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  aoi: { name: "葵", kana: "あおい", place: "学生ラウンジ" },
  haruka: { name: "遥", kana: "はるか", place: "研究室" },
  kimura: { name: "木村", kana: "きむら", place: "コンビニ" },
  misaki: { name: "美咲", kana: "みさき", place: "カフェ" },
  taisho: { name: "大将", kana: "たいしょう", place: "居酒屋" },
  nana: { name: "七海", kana: "ななみ", place: "まちの生活サポートラウンジ" },
};

interface InspirationSectionProps {
  uiLanguage: UiLanguage;
}

export function InspirationSection({ uiLanguage }: InspirationSectionProps) {
  const [ideas, setIdeas] = useState<Array<{ npcId: NpcId; idea: string }> | null>(null);

  useEffect(() => {
    const allNpcIds = getActiveHomeNpcIds();
    setIdeas(
      allNpcIds.map((npcId) => ({
        npcId,
        idea: getStatusAwareTopicIdea(npcId),
      })),
    );
  }, []);

  if (!ideas || ideas.length === 0) return null;

  const isZh = uiLanguage === "zh";
  const heading = isZh ? "今日灵感" : "Today's inspiration";
  const subtitle = isZh
    ? "不知道说什么时，可以从这里的话题开始。"
    : "When you're not sure what to say, start with a small prompt.";

  return (
    <section className="mx-auto w-full max-w-[1120px] px-4 py-4 md:px-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-[#2D4A1F] md:text-base">{heading}</h3>
          <p className="mt-0.5 text-[11px] text-[#7A7060]">{subtitle}</p>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max gap-3 pr-1 md:gap-4">
          {ideas.map((item) => {
            const info = NPC_INFO[item.npcId];
            const avatar = NPC_AVATARS[item.npcId];
            const name = getNpcDisplayName(item.npcId);
            const ctaText = isZh ? `和${name}聊这个` : `Talk with ${name}`;

            return (
              <Link
                key={item.npcId}
                href={{ pathname: `/chat/${item.npcId}`, query: { starter: item.idea } }}
                className="flex w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-[rgba(40,35,26,0.06)] bg-white/40 px-3 py-3 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(45,74,31,0.18)] hover:bg-white/60 hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 active:translate-y-0 active:scale-[0.995] sm:w-[280px] md:w-[300px] md:gap-3 md:px-4 md:py-4"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <img
                    src={avatar}
                    alt={name}
                    className="h-8 w-8 rounded-full border border-[rgba(40,35,26,0.08)] object-cover md:h-10 md:w-10"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-medium text-[#28231A]">{info.name}</span>
                    <span className="ml-2 text-[10px] text-[#7A7060]">{info.place}</span>
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  <p className="line-clamp-3 text-sm leading-relaxed text-[#28231A]">{item.idea}</p>
                </div>

                <div className="flex justify-end pt-1">
                  <span className="flex items-center gap-0.5 text-[10px] font-medium text-[#6B8F5E]">
                    {ctaText}
                    <span className="text-[11px]">→</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
