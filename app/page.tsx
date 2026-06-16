"use client";

import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { AmbientWhisperStrip } from "@/components/home/ambient-whisper-strip";
import { ContinueSection } from "@/components/home/continue-section";
import { InspirationSection } from "@/components/home/inspiration-section";
import { RumorEntry } from "@/components/home/rumor-entry";
import { SceneEntrySection } from "@/components/home/scene-entry-section";
import { getLocalDateAtmosphereLabelJa, getLocalDateContext, getTimeOfDay, getWorldContext } from "@/lib/npc";
import { loadUiLanguage, saveUiLanguage, type UiLanguage } from "@/lib/ui-language";

const TIME_BG: Record<string, string> = {
  朝: "linear-gradient(180deg, #F5E4CE 0%, #F3EDE0 50%)",
  昼: "#F3EDE0",
  夕: "linear-gradient(180deg, #EEDDC8 0%, #F3EDE0 45%)",
  夜: "linear-gradient(180deg, #DDD6C8 0%, #E8E1D4 60%)",
};

export default function Home() {
  const localDateContext = getLocalDateContext();
  const timeOfDay = getTimeOfDay(localDateContext);
  const worldContext = getWorldContext(localDateContext);
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh");

  useEffect(() => {
    setUiLanguage(loadUiLanguage());
  }, []);

  const handleLanguageChange = (language: UiLanguage) => {
    setUiLanguage(language);
    saveUiLanguage(language);
  };

  const timeLabel = getLocalDateAtmosphereLabelJa(localDateContext);
  const background = TIME_BG[timeOfDay] ?? "#F3EDE0";
  const localDayNumber = Number(localDateContext.localDateKey.slice(-2)) || new Date().getDate();
  const ambientText =
    worldContext.ambientTexts[localDayNumber % worldContext.ambientTexts.length];

  return (
    <main
      className="min-h-[100dvh] relative overflow-x-hidden pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-colors duration-1000"
      style={{ background }}
    >
      <section className="w-full px-0 md:px-4 pt-[max(0.75rem,env(safe-area-inset-top))] md:pt-6">
        <div className="mx-auto w-full max-w-[1320px]">
          <div className="relative overflow-hidden md:rounded-[24px]">
            <img
              src="/home/home-hero-rainy-street.png"
              alt="A quiet rainy Japanese street with a cafe, convenience store, and izakaya"
              className="absolute inset-0 h-full w-full object-cover pointer-events-none select-none"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#F3EDE0]/90 via-[#F3EDE0]/52 to-[#F3EDE0]/84" />

            <div className="relative z-10 min-h-[220px] sm:min-h-[270px] md:min-h-[350px] lg:min-h-[410px] px-4 sm:px-6 md:px-8 py-4 md:py-6 flex flex-col">
              <div className="flex items-start justify-between gap-3 md:gap-6">
                <div className="min-w-0 max-w-[calc(100%-3.5rem)] md:max-w-[640px] pr-1 rounded-2xl px-2.5 py-1.5 md:px-3 md:py-2 bg-[#F6F0E3]/78 backdrop-blur-[1.5px] border border-[rgba(40,35,26,0.08)]">
                  <h1 className="font-brand text-[24px] sm:text-[30px] md:text-[34px] font-light tracking-[0.14em] md:tracking-[0.22em] text-[#211B14] leading-tight break-words">
                    言街 Kotomachi
                  </h1>
                  <p className="text-[11px] md:text-[12px] text-[#6D6151] mt-1.5 tracking-wider whitespace-nowrap overflow-hidden text-ellipsis">
                    {timeLabel} · {ambientText}
                  </p>
                </div>
                <LanguageToggle
                  language={uiLanguage}
                  onChange={handleLanguageChange}
                  className="relative z-20 shrink-0 mt-0.5 rounded-full bg-[#F6F0E3]/82 backdrop-blur-[1.5px] border border-[rgba(40,35,26,0.09)] p-0.5"
                />
              </div>

              <RumorEntry uiLanguage={uiLanguage} />
            </div>
          </div>
        </div>
      </section>

      <AmbientWhisperStrip uiLanguage={uiLanguage} />

      <section className="w-full px-4 md:px-4 pt-3 md:pt-4">
        <div className="mx-auto w-full max-w-[1320px] relative z-20">
          <SceneEntrySection uiLanguage={uiLanguage} />
        </div>
      </section>

      <InspirationSection uiLanguage={uiLanguage} />
      <ContinueSection uiLanguage={uiLanguage} />

      <div className="w-full h-6 md:h-10" />
    </main>
  );
}
