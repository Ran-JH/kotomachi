"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveHomeNpcIds } from "@/lib/home-scenes";
import { getStatusAwareTopicIdea } from "@/lib/starter-prompts";
import { getNpcDisplayName, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { type UiLanguage } from "@/lib/ui-language";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  kimura: { name: "木村", kana: "きむら", place: "便利店" },
  misaki: { name: "美咲", kana: "みさき", place: "咖啡店" },
  taisho: { name: "大将", kana: "たいしょう", place: "居酒屋" },
};

interface InspirationSectionProps {
  uiLanguage: UiLanguage;
}

export function InspirationSection({ uiLanguage }: InspirationSectionProps) {
  const [ideas, setIdeas] = useState<Array<{ npcId: NpcId; idea: string }> | null>(null);

  useEffect(() => {
    const allNpcIds = getActiveHomeNpcIds();
    const daySeed = Math.floor(Date.now() / 86400000);
    
    let selectedNpcIds = allNpcIds;
    if (allNpcIds.length > 3) {
      const shuffled = [...allNpcIds].sort((a, b) => {
        const aSeed = daySeed + a.charCodeAt(0);
        const bSeed = daySeed + b.charCodeAt(0);
        return aSeed % 7 - bSeed % 7;
      });
      selectedNpcIds = shuffled.slice(0, 3);
    }
    
    const result = selectedNpcIds.map((npcId) => ({
      npcId,
      idea: getStatusAwareTopicIdea(npcId),
    }));
    
    setIdeas(result);
  }, []);

  if (!ideas || ideas.length === 0) {
    return null;
  }

  const isZh = uiLanguage === "zh";
  const heading = isZh ? "今日灵感" : "Today’s inspiration";
  const subtitle = isZh
    ? "不知道说什么时，可以从一句轻松的话题开始。"
    : "When you’re not sure what to say, start with a small prompt.";

  return (
    <section className="w-full max-w-[1120px] mx-auto px-4 md:px-5 py-4">
      {/* 标题 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm md:text-base font-medium text-[#2D4A1F]">
            {heading}
          </h3>
          <p className="text-[11px] text-[#7A7060] mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Inspiration cards */}
      <div className="flex flex-wrap gap-3">
        {ideas.map((item) => {
          const info = NPC_INFO[item.npcId];
          const avatar = NPC_AVATARS[item.npcId];
          const name = getNpcDisplayName(item.npcId);
          const ctaText = isZh ? `找${name}聊这个` : `Talk with ${name}`;
          return (
            <Link
              key={item.npcId}
              href={{ pathname: `/chat/${item.npcId}`, query: { starter: item.idea } }}
              className="flex flex-col gap-2 px-3 py-3 md:px-4 md:py-4 rounded-2xl border border-[rgba(40,35,26,0.06)] bg-white/40 hover:bg-white/60 hover:border-[rgba(45,74,31,0.18)] hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.995] transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 text-left w-full sm:w-auto sm:flex-1 sm:min-w-[220px] sm:max-w-[280px] md:gap-3"
            >
              {/* NPC Identity - Row 1 */}
              <div className="flex items-center gap-2 md:gap-3">
                <img
                  src={avatar}
                  alt={name}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-[rgba(40,35,26,0.08)]"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-[#28231A]">{name}</span>
                  <span className="text-[10px] text-[#7A7060] ml-2">{info.place}</span>
                </div>
              </div>

              {/* Inspiration Text - Row 2 */}
              <div className="min-h-0">
                <p className="text-sm text-[#28231A] leading-relaxed line-clamp-3">
                  {item.idea}
                </p>
              </div>

              {/* CTA - Row 3 */}
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
    </section>
  );
}
