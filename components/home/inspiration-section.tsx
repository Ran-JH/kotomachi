"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getActiveHomeNpcIds } from "@/lib/home-scenes";
import { getStatusAwareTopicIdea } from "@/lib/starter-prompts";
import { getNpcDisplayName, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { type UiLanguage } from "@/lib/ui-language";

const NPC_PLACES: Record<string, { zh: string; en: string }> = {
  kimura: { zh: "便利店", en: "convenience store" },
  misaki: { zh: "咖啡店", en: "cafe" },
  taisho: { zh: "居酒屋", en: "izakaya" },
};

interface InspirationSectionProps {
  uiLanguage: UiLanguage;
}

export function InspirationSection({ uiLanguage }: InspirationSectionProps) {
  const router = useRouter();
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

  const openChat = (npcId: NpcId) => {
    router.push(`/chat/${npcId}`);
  };

  const getActionText = (npcId: NpcId) => {
    const name = getNpcDisplayName(npcId);
    return isZh ? `去找${name}` : `Talk with ${name}`;
  };

  const getIcon = (index: number) => {
    const icons = ["☕", "🍃", "✨", "🌙", "🌸"];
    return icons[index % icons.length];
  };

  return (
    <section className="w-full max-w-[700px] mx-auto px-4 py-4">
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

      {/* Inspiration chips */}
      <div className="flex flex-wrap gap-2">
        {ideas.map((item, index) => (
          <button
            key={item.npcId}
            type="button"
            onClick={() => openChat(item.npcId)}
            className="flex items-center gap-2 px-3 py-2 rounded-full border border-[rgba(40,35,26,0.06)] bg-white/40 hover:bg-white/60 hover:border-[rgba(40,35,26,0.12)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 text-left shrink-0"
          >
            {/* Icon */}
            <span className="text-sm">{getIcon(index)}</span>

            {/* Idea text */}
            <span className="text-xs text-[#28231A] max-w-[140px] md:max-w-[180px] truncate">
              {item.idea}
            </span>

            {/* CTA */}
            <span className="text-[10px] text-[#6B8F5E] font-medium">
              {getActionText(item.npcId)}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
