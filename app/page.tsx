"use client";

import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { ContinueSection } from "@/components/home/continue-section";
import { InspirationSection } from "@/components/home/inspiration-section";
import { SceneEntrySection } from "@/components/home/scene-entry-section";
import { getTimeOfDay, getWorldContext } from "@/lib/npc";
import { loadUiLanguage, saveUiLanguage, type UiLanguage } from "@/lib/ui-language";

const TIME_LABELS: Record<string, string> = {
  朝: "朝の街",
  昼: "昼の街",
  夕: "夕の街",
  夜: "夜の街",
};

/** 时段对应的页面底色：保留原先低压力暖色基调。 */
const TIME_BG: Record<string, string> = {
  朝: "linear-gradient(180deg, #F5E4CE 0%, #F3EDE0 50%)",
  昼: "#F3EDE0",
  夕: "linear-gradient(180deg, #EEDDC8 0%, #F3EDE0 45%)",
  夜: "linear-gradient(180deg, #DDD6C8 0%, #E8E1D4 60%)",
};

export default function Home() {
  const timeOfDay = getTimeOfDay();
  const worldContext = getWorldContext();
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh");

  useEffect(() => {
    setUiLanguage(loadUiLanguage());
  }, []);

  const handleLanguageChange = (language: UiLanguage) => {
    setUiLanguage(language);
    saveUiLanguage(language);
  };

  const timeLabel = TIME_LABELS[timeOfDay] ?? "街の時間";
  const background = TIME_BG[timeOfDay] ?? "#F3EDE0";
  const ambientText =
    worldContext.ambientTexts[new Date().getDate() % worldContext.ambientTexts.length];

  return (
    <main
      className="min-h-[100dvh] relative overflow-x-hidden pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-colors duration-1000"
      style={{ background }}
    >
      {/* Top landing canvas:
          hero is a scene background layer.
          Brand + language toggle + atmosphere + scene entry stay in one visual block. */}
      <section className="w-full px-0 md:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-6">
        <div className="w-full max-w-[1320px] mx-auto">
          <div className="relative overflow-hidden md:rounded-[24px]">
            <img
              src="/home/home-hero-rainy-street.png"
              alt="A quiet rainy Japanese street with a cafe, convenience store, and izakaya"
              className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F3EDE0]/90 via-[#F3EDE0]/52 to-[#F3EDE0]/84" />

            <div className="relative z-10 min-h-[220px] sm:min-h-[270px] md:min-h-[350px] lg:min-h-[410px] px-4 sm:px-6 md:px-8 py-4 md:py-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 md:gap-6">
                <div className="min-w-0 pr-1 rounded-2xl px-2.5 py-1.5 md:px-3 md:py-2 bg-[#F6F0E3]/78 backdrop-blur-[1.5px] border border-[rgba(40,35,26,0.08)]">
                  <h1 className="font-brand text-[24px] sm:text-[30px] md:text-[34px] font-light tracking-[0.14em] md:tracking-[0.22em] text-[#211B14] leading-tight break-words">
                    言街 Kotomachi
                  </h1>
                  <p className="text-[11px] md:text-[12px] text-[#6D6151] mt-1.5 tracking-wider">
                    {timeLabel} · {worldContext.atmosphere}
                  </p>
                </div>
                <LanguageToggle
                  language={uiLanguage}
                  onChange={handleLanguageChange}
                  className="relative z-20 shrink-0 mt-0.5 rounded-full bg-[#F6F0E3]/82 backdrop-blur-[1.5px] border border-[rgba(40,35,26,0.09)] p-0.5"
                />
              </div>

              <div className="mt-auto pt-6 md:pt-10">
                <p className="font-brand text-[12px] md:text-[13px] text-[#6F6557]/80 tracking-[0.14em] md:tracking-[0.18em] font-light">
                  {ambientText}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 md:mt-4 relative z-20">
            <SceneEntrySection uiLanguage={uiLanguage} />
          </div>
        </div>
      </section>

      <ContinueSection uiLanguage={uiLanguage} />
      <InspirationSection uiLanguage={uiLanguage} />

      <div className="w-full h-6 md:h-10" />
    </main>
  );
}
