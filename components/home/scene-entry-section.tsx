"use client";

import Link from "next/link";
import { getNpcHomeCardLine, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { getActiveHomeScenes, type HomeScene } from "@/lib/home-scenes";
import { type UiLanguage } from "@/lib/ui-language";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  kimura: { name: "木村", kana: "きむら", place: "便利店" },
  misaki: { name: "美咲", kana: "みさき", place: "咖啡店" },
  taisho: { name: "大将", kana: "たいしょう", place: "居酒屋" },
};

interface SceneEntrySectionProps {
  uiLanguage: UiLanguage;
}

export function SceneEntrySection({ uiLanguage }: SceneEntrySectionProps) {
  const activeScenes = getActiveHomeScenes();

  const isZh = uiLanguage === "zh";

  const heading = isZh ? "今天想去哪儿聊？" : "Where do you want to stop by today?";
  const npcActionLabel = isZh ? "去聊天" : "Start chat";

  return (
    <section className="w-full max-w-[1120px] mx-auto px-4 md:px-5 py-2 md:py-4">
      {/* 标题 */}
      <div className="text-left mb-4 md:mb-5 px-1">
        <h2 className="text-[18px] md:text-[21px] font-medium text-[#2D4A1F] tracking-wide">
          {heading}
        </h2>
      </div>

      {/* 场景卡片 */}
      <div className="space-y-4 md:space-y-5">
        {activeScenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            uiLanguage={uiLanguage}
            npcActionLabel={npcActionLabel}
          />
        ))}
      </div>
    </section>
  );
}

interface SceneCardProps {
  scene: HomeScene;
  uiLanguage: UiLanguage;
  npcActionLabel: string;
}

function SceneCard({ scene, uiLanguage, npcActionLabel }: SceneCardProps) {
  const isZh = uiLanguage === "zh";
  const title = isZh ? scene.title.zh : scene.title.en;
  const subtitle = isZh ? scene.subtitle.zh : scene.subtitle.en;

  return (
    <div className="bg-[#FAF6EE]/70 border border-[rgba(40,35,26,0.06)] rounded-2xl px-4 py-4 md:px-5 md:py-5 shadow-[0_2px_10px_rgba(40,35,26,0.04)]">
      {/* 场景标题 */}
      <div className="mb-3 md:mb-4">
        <h3 className="text-sm md:text-base font-medium text-[#2D4A1F]">
          {title}
        </h3>
        <p className="text-[11px] text-[#7A7060] mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* NPC 卡片网格 */}
      <div className="-mx-1 px-1 overflow-x-auto pb-1">
        <div className="flex gap-3 md:gap-4 min-w-max pr-1">
          {scene.npcIds.map((npcId) => (
            <NpcMiniCard
              key={npcId}
              npcId={npcId}
              actionLabel={npcActionLabel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface NpcMiniCardProps {
  npcId: NpcId;
  actionLabel: string;
}

function NpcMiniCard({ npcId, actionLabel }: NpcMiniCardProps) {
  const info = NPC_INFO[npcId];
  const avatar = NPC_AVATARS[npcId];
  const homeCardLine = getNpcHomeCardLine(npcId);

  return (
    <Link
      href={`/chat/${npcId}`}
      className="group w-[190px] sm:w-[210px] md:w-[230px] lg:w-[240px] aspect-[1/1.02] shrink-0 flex flex-col items-center text-center p-3.5 md:p-4 rounded-2xl border border-[rgba(40,35,26,0.08)] bg-white/48 hover:bg-white/68 hover:border-[rgba(45,74,31,0.22)] hover:shadow-[0_6px_18px_rgba(40,35,26,0.08)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99] transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40"
    >
      {/* 头像 */}
      <img
        src={avatar}
        alt={info.name}
        className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover border border-[rgba(40,35,26,0.06)] mb-2.5 group-hover:border-[rgba(40,35,26,0.14)] transition-colors"
      />

      {/* 姓名 */}
      <span className="text-[12px] font-medium text-[#28231A] mb-0.5">
        {info.name}
      </span>

      {/* 假名和地点 */}
      <span className="text-[11px] text-[#7A7060] mb-2">
        {info.kana} · {info.place}
      </span>

      {/* 今日近况 */}
      <div className="flex-1 w-full flex items-center justify-center px-1 mb-2.5">
        <span className="text-xs text-[#6B8F5E] leading-relaxed line-clamp-2">
          「{homeCardLine}」
        </span>
      </div>

      {/* 操作按钮 */}
      <span className="inline-flex items-center rounded-full bg-[#E8E0CE]/60 px-2.5 py-0.5 text-[10px] font-medium text-[#2D4A1F] group-hover:bg-[#D8CFBB]/80 transition-colors">
        {actionLabel}
      </span>
    </Link>
  );
}
