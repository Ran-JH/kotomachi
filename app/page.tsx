"use client";

import { useEffect, useState } from "react";
import { LanguageToggle } from "@/components/language-toggle";
import { ContinueSection } from "@/components/home/continue-section";
import { InspirationSection } from "@/components/home/inspiration-section";
import { SceneEntrySection } from "@/components/home/scene-entry-section";
import { getTimeOfDay, getWorldContext } from "@/lib/npc";
import { getUiCopy } from "@/lib/ui-copy";
import { loadUiLanguage, saveUiLanguage, type UiLanguage } from "@/lib/ui-language";

const TIME_LABELS: Record<string, string> = {
  朝: "朝の街",
  昼: "昼の街",
  夕: "夕の街",
  夜: "夜の街",
};

/** 时段对应的背景渐变 — 在米白基础上微调，体现天色变化 */
const TIME_BG: Record<string, string> = {
  朝: "linear-gradient(180deg, #F5E4CE 0%, #F3EDE0 50%)",   // 晨光暖橘
  昼: "#F3EDE0",                                                // 正午明亮米白
  夕: "linear-gradient(180deg, #EEDDC8 0%, #F3EDE0 45%)",    // 夕照琥珀
  夜: "linear-gradient(180deg, #DDD6C8 0%, #E8E1D4 60%)",    // 夜幕沉暖
};

export default function Home() {
  const timeOfDay = getTimeOfDay();
  const worldContext = getWorldContext();
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh");
  const copy = getUiCopy(uiLanguage);

  useEffect(() => {
    setUiLanguage(loadUiLanguage());
  }, []);

  const handleLanguageChange = (language: UiLanguage) => {
    setUiLanguage(language);
    saveUiLanguage(language);
  };

  return (
    <main
      className="min-h-[100dvh] flex flex-col relative overflow-x-hidden transition-colors duration-1000 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      style={{ background: TIME_BG[timeOfDay] }}
    >
      {/* ====== 顶部品牌区 ====== */}
      <header className="w-full max-w-[2529px] mx-auto pt-[max(1rem,env(safe-area-inset-top))] md:pt-8">
        <div className="flex items-start justify-between gap-3 md:gap-6">
          <div className="min-w-0 pr-1">
            <h1 className="font-brand text-[24px] sm:text-[30px] md:text-2xl font-light tracking-[0.14em] md:tracking-[0.3em] text-[#28231A] leading-tight break-words">
              言街 Kotomachi
            </h1>
            <p className="text-[11px] md:text-[10px] text-[#7A7060]/60 mt-1.5 tracking-wider">
              {TIME_LABELS[timeOfDay]} · {worldContext.atmosphere}
            </p>
          </div>
          <LanguageToggle
            language={uiLanguage}
            onChange={handleLanguageChange}
            className="relative z-30 shrink-0 mt-0.5"
          />
        </div>
      </header>

      {/* ====== 首页 hero banner ====== */}
      <section className="relative w-full py-2 md:py-4 px-2 md:px-4">
        <div className="relative w-full max-w-[1200px] mx-auto rounded-3xl overflow-hidden border border-[rgba(40,35,26,0.08)] shadow-[0_8px_32px_rgba(40,35,26,0.08),0_2px_8px_rgba(40,35,26,0.04)] bg-[#FAF6EE]/50">
          <img
            src="/home/home-hero-rainy-street.png"
            alt="A quiet rainy Japanese street with a cafe, convenience store, and izakaya"
            className="w-full h-auto max-h-[32vh] md:max-h-[36vh] lg:max-h-[40vh] object-contain"
          />
        </div>
      </section>

      {/* ====== 环境氛围短句 ====== */}
      <div className="w-full text-center pt-2 pb-2">
        <p className="font-brand text-[12px] md:text-[13px] text-[#7A7060]/60 tracking-[0.18em] font-light">
          {worldContext.ambientTexts[new Date().getDate() % worldContext.ambientTexts.length]}
        </p>
      </div>

      {/* ====== Scene Entry Section ====== */}
      <SceneEntrySection uiLanguage={uiLanguage} />

      {/* ====== Continue Section ====== */}
      <ContinueSection uiLanguage={uiLanguage} />

      {/* ====== Inspiration Section ====== */}
      <InspirationSection uiLanguage={uiLanguage} />

      {/* ====== 底部留白 ====== */}
      <div className="w-full h-6 md:h-10" />
    </main>
  );
}
