"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getFeaturedConversationScenes,
  type ConversationScene,
} from "@/lib/conversation-scenes";
import { getActiveHomeNpcIds } from "@/lib/home-scenes";
import { getNpcDisplayName, NPC_AVATARS, type NpcId } from "@/lib/npc";
import { getStatusAwareTopicIdea } from "@/lib/starter-prompts";
import { type UiLanguage } from "@/lib/ui-language";

const ALL_FEATURED_SCENES_COUNT = 999;

interface InspirationSectionProps {
  uiLanguage: UiLanguage;
}

function getSceneLabel(scene: ConversationScene, uiLanguage: UiLanguage): string {
  if (uiLanguage === "en") {
    return scene.shortLabelEn ?? scene.shortLabel ?? scene.titleEn ?? scene.title;
  }

  return scene.shortLabelZh ?? scene.shortLabel ?? scene.shortLabelEn ?? scene.titleZh ?? scene.title;
}

function getSceneTitle(scene: ConversationScene, uiLanguage: UiLanguage): string {
  if (uiLanguage === "en") {
    return scene.titleEn ?? scene.title;
  }

  return scene.titleZh ?? scene.title;
}

function getSceneMicroEpisode(scene: ConversationScene, uiLanguage: UiLanguage): string {
  if (uiLanguage === "en") {
    return scene.microEpisodeEn ?? scene.microEpisodeZh ?? "";
  }

  return scene.microEpisodeZh ?? scene.microEpisodeEn ?? "";
}

export function InspirationSection({ uiLanguage }: InspirationSectionProps) {
  const [ideas, setIdeas] = useState<Array<{ npcId: NpcId; idea: string }>>([]);
  const [featuredScenes, setFeaturedScenes] = useState<ConversationScene[]>([]);
  const [featuredSceneIndex, setFeaturedSceneIndex] = useState(0);

  useEffect(() => {
    const allNpcIds = getActiveHomeNpcIds();

    setIdeas(
      allNpcIds.map((npcId) => ({
        npcId,
        idea: getStatusAwareTopicIdea(npcId),
      })),
    );
    // 首页只展示 1 个 scene，但“换一个”应该能在整套街角对话场景里轮换，
    // 这里直接取全量可用 scene，避免只在少数候选里打转。
    setFeaturedScenes(getFeaturedConversationScenes(ALL_FEATURED_SCENES_COUNT));
    setFeaturedSceneIndex(0);
  }, []);

  const featuredScene = featuredScenes[featuredSceneIndex] ?? null;

  if (!featuredScene && ideas.length === 0) return null;

  const isZh = uiLanguage === "zh";
  const sceneTitle = isZh ? "今日街角小事" : "Tiny scene for today";
  const sceneSubtitle = isZh
    ? "进入一个街角对话场景，先说一句就好。"
    : "Step into a tiny conversation scene and say just one line.";
  const sceneCta = isZh ? "进入这个小场景" : "Enter this scene";
  const sceneBadge = isZh ? "街角对话场景" : "Conversation scene";
  const changeSceneLabel = isZh ? "换一个" : "Another one";
  const starterTitle = isZh ? "随便聊一句" : "Free chat starter";
  const starterSubtitle = isZh
    ? "没有固定场景，只是找个人轻轻开个话头。"
    : "No fixed scene - just bring one line into a casual chat.";
  const canChangeFeaturedScene = featuredScenes.length > 1;

  const handleChangeFeaturedScene = () => {
    if (!canChangeFeaturedScene) return;
    setFeaturedSceneIndex((current) => (current + 1) % featuredScenes.length);
  };

  return (
    <section className="mx-auto w-full max-w-[1320px] px-4 py-4 md:px-5">
      {featuredScene && (
        <div className="mb-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-medium text-[#2D4A1F] md:text-base">{sceneTitle}</h3>
              <p className="mt-0.5 text-[11px] text-[#7A7060]">{sceneSubtitle}</p>
            </div>
            <button
              type="button"
              onClick={handleChangeFeaturedScene}
              disabled={!canChangeFeaturedScene}
              className="shrink-0 rounded-full border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-3 py-1 text-[11px] text-[#2D4A1F] transition-colors hover:bg-[#E8E0CE] disabled:cursor-default disabled:opacity-45"
            >
              {changeSceneLabel}
            </button>
          </div>

          <Link
            href={{ pathname: `/chat/${featuredScene.npcId}`, query: { scene: featuredScene.id } }}
            className="flex rounded-2xl border border-[rgba(40,35,26,0.06)] bg-white/40 px-4 py-3.5 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(45,74,31,0.18)] hover:bg-white/60 hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 active:translate-y-0 active:scale-[0.995] md:px-5 md:py-4"
          >
            <div className="flex w-full flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src={NPC_AVATARS[featuredScene.npcId]}
                    alt={getNpcDisplayName(featuredScene.npcId)}
                    className="h-10 w-10 rounded-full border border-[rgba(40,35,26,0.08)] object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-[#28231A]">
                      {getNpcDisplayName(featuredScene.npcId)}
                      <span className="mx-1 text-[#7A7060]">·</span>
                      <span className="text-[#7A7060]">{getSceneLabel(featuredScene, uiLanguage)}</span>
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-[#2D4A1F]">
                      {getSceneTitle(featuredScene, uiLanguage)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-[#FAF6EE] px-2.5 py-1 text-[10px] text-[#7A7060]">
                  {sceneBadge}
                </span>
              </div>

              <div className="space-y-2">
                <p className="line-clamp-2 text-sm leading-relaxed text-[#28231A]">
                  {getSceneMicroEpisode(featuredScene, uiLanguage)}
                </p>
                {featuredScene.sampleUserLineJa && (
                  <p className="line-clamp-2 rounded-xl bg-[#FAF6EE] px-3 py-2 text-sm leading-relaxed text-[#2D4A1F]">
                    「{featuredScene.sampleUserLineJa}」
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-0.5">
                <span className="flex items-center gap-1 text-[11px] font-medium text-[#6B8F5E]">
                  {sceneCta}
                  <span className="text-[12px]">-&gt;</span>
                </span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {ideas.length > 0 && (
        <div>
          <div className="mb-3">
            <h3 className="text-sm font-medium text-[#2D4A1F] md:text-base">{starterTitle}</h3>
            <p className="mt-0.5 text-[11px] text-[#7A7060]">{starterSubtitle}</p>
          </div>

          <div className="-mx-1 overflow-x-auto px-1 pb-1">
            <div className="flex min-w-max gap-3 pr-1 md:gap-4">
              {ideas.map((item) => {
                const name = getNpcDisplayName(item.npcId);
                const ctaText = isZh ? "带这句话去聊天" : "Start with this line";

                return (
                  <Link
                    key={item.npcId}
                    href={{ pathname: `/chat/${item.npcId}`, query: { starter: item.idea } }}
                    className="flex w-[260px] shrink-0 flex-col gap-2 rounded-2xl border border-[rgba(40,35,26,0.06)] bg-white/40 px-3 py-3 text-left transition-all duration-150 ease-out hover:-translate-y-0.5 hover:border-[rgba(45,74,31,0.18)] hover:bg-white/60 hover:shadow-[0_4px_14px_rgba(40,35,26,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A84C]/40 active:translate-y-0 active:scale-[0.995] sm:w-[280px] md:w-[300px] md:gap-3 md:px-4 md:py-4"
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <img
                        src={NPC_AVATARS[item.npcId]}
                        alt={name}
                        className="h-8 w-8 rounded-full border border-[rgba(40,35,26,0.08)] object-cover md:h-10 md:w-10"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium text-[#28231A]">{name}</span>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1">
                      <p className="line-clamp-3 text-sm leading-relaxed text-[#28231A]">
                        {item.idea}
                      </p>
                    </div>

                    <div className="flex justify-end pt-1">
                      <span className="flex items-center gap-1 text-[10px] font-medium text-[#6B8F5E]">
                        {ctaText}
                        <span className="text-[11px]">-&gt;</span>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
