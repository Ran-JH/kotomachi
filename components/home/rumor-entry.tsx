"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isRumorHour } from "@/lib/rumor-gate";
import { type UiLanguage } from "@/lib/ui-language";

type RumorEntryProps = {
  uiLanguage: UiLanguage;
};

const COPY: Record<
  UiLanguage,
  { label: string; line: string; cta: string }
> = {
  zh: {
    label: "街角传闻",
    line: "听说，モク 醒着。",
    cta: "去看看 →",
  },
  en: {
    label: "Night rumor",
    line: "Moku seems to be awake.",
    cta: "Take a look →",
  },
};

export function RumorEntry({ uiLanguage }: RumorEntryProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const forceShow = params.get("showRumor") === "1";
    const hour = new Date().getHours();

    setVisible(forceShow || isRumorHour(hour));
  }, []);

  if (!mounted || !visible) {
    return null;
  }

  const copy = COPY[uiLanguage];

  return (
    <Link
      href="/chat/saku"
      className="group mt-3 block rounded-2xl border border-[rgba(47,56,51,0.18)] bg-[rgba(244,240,231,0.84)] px-3 py-2 text-left shadow-[0_10px_30px_rgba(34,28,23,0.08)] backdrop-blur-sm transition hover:border-[rgba(47,56,51,0.32)] hover:bg-[rgba(244,240,231,0.94)] md:absolute md:bottom-4 md:right-4 md:z-20 md:mt-0 md:w-[220px]"
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-[#6E766C]">
        {copy.label}
      </p>
      <p className="mt-1 text-[13px] text-[#2D241D]">{copy.line}</p>
      <p className="mt-1.5 text-[12px] text-[#556153] transition group-hover:text-[#394537]">
        {copy.cta}
      </p>
    </Link>
  );
}
