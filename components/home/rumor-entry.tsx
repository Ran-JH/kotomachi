"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { isRumorHour } from "@/lib/rumor-gate";
import { type UiLanguage } from "@/lib/ui-language";

type RumorEntryProps = {
  uiLanguage: UiLanguage;
};

const RUMOR_COPY: Record<
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

const RECEIPT_COPY: Record<
  UiLanguage,
  {
    label: string;
    line: string;
    cta: string;
    close: string;
  }
> = {
  zh: {
    label: "一张收据掉了出来。",
    line: "「まだ言ってない。」",
    cta: "拾起来 →",
    close: "先放回去",
  },
  en: {
    label: "A receipt slipped out.",
    line: '"I haven\'t said it yet."',
    cta: "Pick it up →",
    close: "Leave it there",
  },
};

export function RumorEntry({ uiLanguage }: RumorEntryProps) {
  const [mounted, setMounted] = useState(false);
  const [isNightRumorVisible, setIsNightRumorVisible] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    setMounted(true);

    const params = new URLSearchParams(window.location.search);
    const forceShowRumor = params.get("showRumor") === "1";
    const forceShowReceipt = params.get("showReceipt") === "1";
    const hour = new Date().getHours();

    setIsNightRumorVisible(forceShowRumor || isRumorHour(hour));
    setShowReceipt(forceShowReceipt);
  }, []);

  if (!mounted) {
    return null;
  }

  const rumorCopy = RUMOR_COPY[uiLanguage];
  const receiptCopy = RECEIPT_COPY[uiLanguage];
  const showHotspot = !isNightRumorVisible && !showReceipt;

  const handleHotspotClick = () => {
    setTapCount((current) => {
      const next = current + 1;

      if (next >= 3) {
        setShowReceipt(true);
        return 0;
      }

      return next;
    });
  };

  return (
    <>
      {showHotspot ? (
        <button
          type="button"
          onClick={handleHotspotClick}
          aria-label="Hidden vending machine hotspot"
          className="absolute bottom-[18%] right-[31.2%] z-20 h-[58px] w-[34px] cursor-pointer rounded-md bg-transparent opacity-0 sm:bottom-[19%] sm:right-[30.2%] sm:h-[72px] sm:w-[38px] md:bottom-[18.5%] md:right-[28.7%] md:h-[104px] md:w-[46px] lg:bottom-[18.5%] lg:right-[28.8%] lg:h-[116px] lg:w-[48px]"
        />
      ) : null}

      {isNightRumorVisible && !showReceipt ? (
        <Link
          href="/chat/saku"
          className="group absolute bottom-4 right-4 z-20 block w-[208px] rounded-2xl border border-[rgba(47,56,51,0.18)] bg-[rgba(244,240,231,0.84)] px-3 py-2 text-left shadow-[0_10px_30px_rgba(34,28,23,0.08)] backdrop-blur-sm transition hover:border-[rgba(47,56,51,0.32)] hover:bg-[rgba(244,240,231,0.94)] md:bottom-[18%] md:right-[24.5%] md:w-[220px]"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6E766C]">
            {rumorCopy.label}
          </p>
          <p className="mt-1 text-[13px] text-[#2D241D]">{rumorCopy.line}</p>
          <p className="mt-1.5 text-[12px] text-[#556153] transition group-hover:text-[#394537]">
            {rumorCopy.cta}
          </p>
        </Link>
      ) : null}

      {showReceipt ? (
        <div className="absolute bottom-5 right-3 z-30 w-[min(196px,calc(100%-1.5rem))] rotate-[-3deg] rounded-[3px] border border-[rgba(118,102,78,0.28)] bg-[#F7F1E4] px-3 py-3 text-left shadow-[0_18px_38px_rgba(34,28,23,0.22)] before:pointer-events-none before:absolute before:inset-x-2 before:top-2 before:h-px before:bg-[rgba(125,110,90,0.18)] after:pointer-events-none after:absolute after:inset-x-2 after:bottom-2 after:h-px after:bg-[rgba(125,110,90,0.12)] md:bottom-[14%] md:right-[22.8%] md:w-[208px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 top-[-6px] h-[8px] bg-[#F7F1E4] [clip-path:polygon(0_100%,6%_0,12%_100%,18%_0,24%_100%,30%_0,36%_100%,42%_0,48%_100%,54%_0,60%_100%,66%_0,72%_100%,78%_0,84%_100%,90%_0,96%_100%,100%_0,100%_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2 bottom-[-6px] h-[8px] bg-[#F7F1E4] [clip-path:polygon(0_0,4%_100%,10%_0,16%_100%,22%_0,28%_100%,34%_0,40%_100%,46%_0,52%_100%,58%_0,64%_100%,70%_0,76%_100%,82%_0,88%_100%,94%_0,100%_100%,100%_0)]"
          />
          <div className="pointer-events-none absolute inset-y-0 left-[10px] w-px bg-[rgba(140,124,101,0.08)]" />
          <div className="pointer-events-none absolute inset-y-0 right-[10px] w-px bg-[rgba(140,124,101,0.05)]" />
          <p className="text-[10px] tracking-[0.22em] text-[#8A7860]">
            自販機レシート
          </p>
          <p className="mt-2 text-[11px] leading-5 tracking-[0.04em] text-[#7D6E5A]">
            {receiptCopy.label}
          </p>
          <p className="mt-2 border-y border-dashed border-[rgba(92,79,58,0.26)] py-2 text-[15px] leading-6 text-[#2D241D]">
            {receiptCopy.line}
          </p>
          <div className="mt-2 border-b border-dashed border-[rgba(92,79,58,0.18)] pb-2 text-[10px] tracking-[0.14em] text-[#8B7A65]">
            KOTOMACHI 03:17 PM
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setShowReceipt(false);
                setTapCount(0);
              }}
              className="text-[11px] text-[#7B705F] transition hover:text-[#544938]"
            >
              {receiptCopy.close}
            </button>
            <Link
              href="/chat/saku"
              className="text-[12px] font-medium text-[#4D5D4A] transition hover:text-[#32422F]"
            >
              {receiptCopy.cta}
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
