"use client";

import type { UiLanguage } from "@/lib/ui-language";

interface SakuResidentNoteProps {
  uiLanguage: UiLanguage;
}

const NOTE_COPY = {
  zh: {
    eyebrow: "街角备忘",
    title: "朔（さく）/ Saku",
    lines: [
      "常在夜里出没的神秘住民。身边常有一只叫 モク 的猫头鹰。",
      "听说他经常替人保管遗失物：纸条、奇怪的收据、未成句子的语言碎片。",
      "有时也会有人提起自己翻开的旧书，和那只收集亮闪闪小物件的小动物。",
      "保管那些没来得及说出口的话？谁也不知道他是怎么做到的。",
    ],
  },
  en: {
    eyebrow: "Street note",
    title: "Saku / 朔（さく）",
    lines: [
      "A mysterious resident who often goes out at night. An owl named Moku is usually nearby.",
      "People say he ends up holding on to stray things for others: notes, odd receipts, and half-formed scraps of language.",
      "Sometimes the stories around him also mention old books opening on their own and a small creature collecting shiny little objects.",
      "As for words that were never quite said aloud, no one seems to know how they end up with him.",
    ],
  },
} as const;

export function SakuResidentNote({ uiLanguage }: SakuResidentNoteProps) {
  const copy = NOTE_COPY[uiLanguage] ?? NOTE_COPY.zh;

  return (
    <section
      aria-label={copy.eyebrow}
      className="rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[linear-gradient(180deg,rgba(250,246,238,0.96)_0%,rgba(243,237,224,0.92)_100%)] px-4 py-3.5 shadow-[0_10px_30px_rgba(40,35,26,0.05)] backdrop-blur-sm md:px-5"
    >
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-medium tracking-[0.18em] text-[#7A7060]">
          {copy.eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="text-[15px] font-semibold text-[#2D4A1F] md:text-base">
            {copy.title}
          </h2>
          <div className="space-y-1.5 text-[12.5px] leading-6 text-[#4B4337] md:text-[13px]">
            {copy.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
