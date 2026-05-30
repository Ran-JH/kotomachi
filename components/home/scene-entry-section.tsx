"use client";

import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const activeScenes = getActiveHomeScenes();

  const isZh = uiLanguage === "zh";

  const heading = isZh ? "今天想去哪儿聊？" : "Where do you want to stop by today?";
  const npcActionLabel = isZh ? "去聊天" : "Start chat";

  const openChat = (npcId: NpcId) => {
    router.push(`/chat/${npcId}`);
  };

  return (
    <section className="w-full max-w-[700px] mx-auto px-4 py-2 md:py-4">
      {/* 标题 */}
      <div className="text-center mb-4 md:mb-5">
        <h2 className="text-[17px] md:text-lg font-medium text-[#2D4A1F] tracking-wide">
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
            onNpcClick={openChat}
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
  onNpcClick: (npcId: NpcId) => void;
}

function SceneCard({ scene, uiLanguage, npcActionLabel, onNpcClick }: SceneCardProps) {
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {scene.npcIds.map((npcId) => (
          <NpcMiniCard
            key={npcId}
            npcId={npcId}
            actionLabel={npcActionLabel}
            onClick={() => onNpcClick(npcId)}
          />
        ))}
      </div>
    </div>
  );
}

interface NpcMiniCardProps {
  npcId: NpcId;
  actionLabel: string;
  onClick: () => void;
}

function NpcMiniCard({ npcId, actionLabel, onClick }: NpcMiniCardProps) {
  const info = NPC_INFO[npcId];
  const avatar = NPC_AVATARS[npcId];
  const homeCardLine = getNpcHomeCardLine(npcId);

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-center text-center p-3 md:p-3.5 rounded-xl border border-[rgba(40,35,26,0.06)] bg-white/40 hover:bg-white/60 hover:border-[rgba(40,35,26,0.12)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40"
    >
      {/* 头像 */}
      <img
        src={avatar}
        alt={info.name}
        className="w-11 h-11 rounded-full object-cover border border-[rgba(40,35,26,0.06)] mb-2 group-hover:border-[rgba(40,35,26,0.14)] transition-colors"
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
      <div className="h-[3rem] w-full flex items-center justify-center px-1 mb-2">
        <span className="text-xs text-[#6B8F5E] leading-relaxed line-clamp-2">
          「{homeCardLine}」
        </span>
      </div>

      {/* 操作按钮 */}
      <span className="inline-flex items-center rounded-full bg-[#E8E0CE]/60 px-2.5 py-0.5 text-[10px] font-medium text-[#2D4A1F] group-hover:bg-[#D8CFBB]/80 transition-colors">
        {actionLabel}
      </span>
    </button>
  );
}
