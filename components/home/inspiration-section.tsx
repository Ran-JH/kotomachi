"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveHomeNpcIds } from "@/lib/home-scenes";
import { getStatusAwareTopicIdea } from "@/lib/starter-prompts";
import { getNpcDisplayName, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { type UiLanguage } from "@/lib/ui-language";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  haruka: { name: "遥", kana: "はるか", place: "研究室" },
  kimura: { name: "木村", kana: "きむら", place: "コンビニ" },
  misaki: { name: "美咲", kana: "みさき", place: "カフェ" },
  taisho: { name: "大将", kana: "たいしょう", place: "居酒屋" },
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

  if (!ideas || ideas.length === 0) {
    return null;
  }

  const isZh = uiLanguage === "zh";
  const heading = isZh ? "今日灵感" : "Today's inspiration";
  const subtitle = isZh
    ? "不知道说什么时，可以从这里的话题开始。"
    : "When you're not sure what to say, start with a small prompt.";

  return (
    <section className="w-full max-w-[1120px] mx-auto px-4 md:px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm md:text-base font-medium text-[#2D4A1F]">{heading}</h3>
          <p className="text-[11px] text-[#7A7060] mt-0.5">{subtitle}</p>
        </div>
      </div>

      <div className="-mx-1 px-1 overflow-x-auto pb-1">
        <div className="flex gap-3 md:gap-4 min-w-max pr-1">
          {ideas.map((item) => {
            const info = NPC_INFO[item.npcId];
            const avatar = NPC_AVATARS[item.npcId];
            const name = getNpcDisplayName(item.npcId);
            const ctaText = isZh ? `和${name}聊这个` : `Talk with ${name}`;

            return (
              <Link
                key={item.npcId}
                href={{ pathname: `/chat/${item.npcId}`, query: { starter: item.idea } }}
                className="w-[260px] sm:w-[280px] md:w-[300px] shrink-0 flex flex-col gap-2 px-3 py-3 md:px-4 md:py-4 rounded-2xl border border-[rgba(40,35,26,0.06)] bg-white/40 hover:bg-white/60 hover:border-[rgba(45,74,31,0.18)] hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 text-left md:gap-3"
              >
                <div className="flex items-center gap-2 md:gap-3">
                  <img
                    src={avatar}
                    alt={name}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-[rgba(40,35,26,0.08)]"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-[#28231A]">{info.name}</span>
                    <span className="text-[10px] text-[#7A7060] ml-2">{info.place}</span>
                  </div>
                </div>

                <div className="min-h-0 flex-1">
                  <p className="text-sm text-[#28231A] leading-relaxed line-clamp-3">{item.idea}</p>
                </div>

                <div className="flex justify-end pt-1">
                  <span className="text-[10px] text-[#6B8F5E] font-medium flex items-center gap-0.5">
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
