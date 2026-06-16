"use client";

import { useEffect, useState } from "react";
import { AMBIENT_WHISPERS } from "@/lib/ambient-whispers";
import { type UiLanguage } from "@/lib/ui-language";

type AmbientWhisperStripProps = {
  uiLanguage: UiLanguage;
};

export function AmbientWhisperStrip({
  uiLanguage,
}: AmbientWhisperStripProps) {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const initialIndex = Math.floor(Math.random() * AMBIENT_WHISPERS.length);
    setIndex(initialIndex);

    // Keep the strip alive without making it feel like a banner carousel.
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current === null) {
          return initialIndex;
        }

        return (current + 1) % AMBIENT_WHISPERS.length;
      });
    }, 12000);

    return () => window.clearInterval(timer);
  }, []);

  if (index === null) {
    return null;
  }

  const whisper = AMBIENT_WHISPERS[index];
  const prefix =
    uiLanguage === "zh" ? "言街小语：" : "Kotomachi whisper:";
  const text = uiLanguage === "zh" ? whisper.zh : whisper.en;

  return (
    <div className="mx-auto mt-3 md:mt-4 w-full max-w-[1320px] px-4 md:px-6 lg:px-8">
      <div className="rounded-full bg-[#F6F0E3]/72 px-4 py-2 text-[12px] md:text-[13px] text-[#6C655A] shadow-[0_8px_24px_rgba(34,28,23,0.04)] ring-1 ring-[rgba(58,52,43,0.07)] backdrop-blur-[1px]">
        <span className="font-medium text-[#5A6A59]">{prefix}</span>{" "}
        <span>{text}</span>
      </div>
    </div>
  );
}
