"use client";

import Link from "next/link";
import { getNpcHomeCardLine, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { getActiveHomeScenes, type HomeScene } from "@/lib/home-scenes";
import { type UiLanguage } from "@/lib/ui-language";

const NPC_INFO: Record<NpcId, { name: string; kana: string; place: string }> = {
  aoi: { name: "葵", kana: "あおい", place: "学生ラウンジ" },
  haruka: { name: "遥", kana: "はるか", place: "研究室" },
  kimura: { name: "木村", kana: "きむら", place: "コンビニ" },
  misaki: { name: "美咲", kana: "みさき", place: "カフェ" },
  taisho: { name: "大将", kana: "たいしょう", place: "居酒屋" },
  nana: { name: "七海", kana: "ななみ", place: "まちの生活サポートラウンジ" },
  ren: { name: "蓮", kana: "れん", place: "言街駅前" },
  mao: { name: "真央", kana: "まお", place: "コミュニティスペース" },
  saku: { name: "朔", kana: "さく", place: "夜の路地" },
};

// 这里展示的是“说话感觉 / 关系距离”，不是功能标签。
const NPC_TONE_LABELS: Record<NpcId, { zh: string; en: string }> = {
  aoi: { zh: "平语 / タメ口", en: "Informal / Tameguchi" },
  haruka: { zh: "轻丁宁", en: "Gentle polite Japanese" },
  kimura: { zh: "随意口语", en: "Casual" },
  misaki: { zh: "轻丁宁", en: "Gentle polite" },
  taisho: { zh: "熟客口语", en: "Regular-customer casual" },
  nana: { zh: "轻丁宁", en: "Light polite" },
  ren: { zh: "普通自然", en: "Natural" },
  mao: { zh: "軽丁寧", en: "Light workplace polite" },
  saku: { zh: "柔和 / 少し文学的", en: "Soft / slightly literary" },
};

// 首页卡片需要更短、更稳定的短句，避免个别 NPC 文案在小卡上显得拥挤。
const NPC_HOME_CARD_OVERRIDES: Partial<Record<NpcId, { ja: string; en?: string }>> = {
  nana: {
    ja: "困ったときに、言街ラウンジで相談できる人。",
  },
  ren: {
    ja: "旅の途中で、言街にしばらく住んでいる人。",
  },
  mao: {
    ja: "バイトや軽い仕事の場面で、確認やお願いをしやすい人。",
  },
};

interface SceneEntrySectionProps {
  uiLanguage: UiLanguage;
}

export function SceneEntrySection({ uiLanguage }: SceneEntrySectionProps) {
  const activeScenes = getActiveHomeScenes();
  const dailyScene = activeScenes.find((scene) => scene.id === "daily");
  const studyScene = activeScenes.find((scene) => scene.id === "study_abroad");
  const workScene = activeScenes.find((scene) => scene.id === "work");
  const isZh = uiLanguage === "zh";
  const heading = isZh ? "今天想去哪儿聊？" : "Where do you want to stop by today?";
  const npcActionLabel = isZh ? "去聊天" : "Start chat";

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 py-2 md:px-5 md:py-4">
      <div className="mb-3 px-1 text-left md:mb-5">
        <h2 className="text-[18px] font-medium tracking-wide text-[#2D4A1F] md:text-[21px]">
          {heading}
        </h2>
      </div>

      <div className="w-full max-w-full min-w-0 space-y-3 md:space-y-5">
        {dailyScene ? (
          <SceneCard scene={dailyScene} uiLanguage={uiLanguage} npcActionLabel={npcActionLabel} />
        ) : null}

        <div className="grid w-full max-w-full min-w-0 gap-3 md:grid-cols-2 md:gap-5">
          {studyScene ? (
            <SceneCard scene={studyScene} uiLanguage={uiLanguage} npcActionLabel={npcActionLabel} />
          ) : null}
          {workScene ? (
            <SceneCard scene={workScene} uiLanguage={uiLanguage} npcActionLabel={npcActionLabel} />
          ) : null}
        </div>
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
    <div className="w-full max-w-full min-w-0 overflow-hidden rounded-[22px] border border-[rgba(40,35,26,0.06)] bg-[#FAF6EE]/70 px-3.5 py-3.5 shadow-[0_2px_10px_rgba(40,35,26,0.04)] md:rounded-2xl md:px-5 md:py-5">
      <div className="mb-2.5 md:mb-4">
        <h3 className="text-sm font-medium text-[#2D4A1F] md:text-base">{title}</h3>
        <p className="mt-0.5 text-[11px] leading-relaxed text-[#7A7060]">{subtitle}</p>
      </div>

      <div className="-mx-1 min-w-0 max-w-full overflow-x-auto overflow-y-hidden px-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max min-w-full snap-x snap-mandatory items-start gap-2.5 pr-2 md:gap-4 md:pr-1">
          {scene.npcIds.map((npcId) => (
            <NpcMiniCard
              key={npcId}
              npcId={npcId}
              actionLabel={npcActionLabel}
              uiLanguage={uiLanguage}
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
  uiLanguage: UiLanguage;
}

function NpcMiniCard({ npcId, actionLabel, uiLanguage }: NpcMiniCardProps) {
  const info = NPC_INFO[npcId];
  const avatar = NPC_AVATARS[npcId];
  const homeCardOverride = NPC_HOME_CARD_OVERRIDES[npcId];
  const homeCardLine =
    uiLanguage === "en" && homeCardOverride?.en
      ? homeCardOverride.en
      : homeCardOverride?.ja ?? getNpcHomeCardLine(npcId, uiLanguage === "en" ? "en" : "ja");
  const toneLabel = uiLanguage === "zh" ? NPC_TONE_LABELS[npcId].zh : NPC_TONE_LABELS[npcId].en;
  const metaLine = `${info.kana} · ${info.place} · ${toneLabel}`;

  return (
    <Link
      href={`/chat/${npcId}`}
      className="group flex w-[clamp(9.5rem,44vw,12rem)] max-w-[calc(100vw-6rem)] shrink-0 snap-start flex-col items-center rounded-[20px] border border-[rgba(40,35,26,0.08)] bg-white/48 px-3 py-3 text-center transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(45,74,31,0.22)] hover:bg-white/68 hover:shadow-[0_6px_18px_rgba(40,35,26,0.08)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 active:translate-y-0 active:scale-[0.99] md:w-[260px] md:max-w-[78vw] md:rounded-2xl md:p-4 lg:w-[240px] xl:w-[235px] xl:max-w-none"
    >
      <img
        src={avatar}
        alt={info.name}
        className="mb-2 h-10 w-10 rounded-full border border-[rgba(40,35,26,0.06)] object-cover transition-colors group-hover:border-[rgba(40,35,26,0.14)] md:mb-2.5 md:h-14 md:w-14"
      />

      <span className="mb-0.5 text-[11px] font-medium text-[#28231A] md:text-[12px]">{info.name}</span>
      <span className="text-[10px] leading-4 text-[#7A7060] md:text-[11px] md:leading-relaxed">{metaLine}</span>

      <div className="mt-1 flex min-h-[2.5rem] w-full items-start px-0.5 md:min-h-[2.9rem] md:px-1">
        <span className="line-clamp-2 text-[10px] leading-[1.15rem] text-[#6B8F5E] md:text-[11px] md:leading-5">
          {homeCardLine}
        </span>
      </div>

      <span className="mt-2.5 inline-flex items-center rounded-full bg-[#E8E0CE]/60 px-2 py-0.5 text-[9px] font-medium text-[#2D4A1F] transition-colors group-hover:bg-[#D8CFBB]/80 md:mt-3 md:px-2.5 md:text-[10px]">
        {actionLabel}
      </span>
    </Link>
  );
}
