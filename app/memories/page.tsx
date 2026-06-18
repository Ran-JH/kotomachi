"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { NpcMemoryCenter } from "@/components/npc-memory-center";
import { loadUiLanguage, type UiLanguage } from "@/lib/ui-language";

export default function MemoriesPage() {
  const router = useRouter();
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("zh");

  useEffect(() => {
    setUiLanguage(loadUiLanguage());
  }, []);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/");
  };

  const backLabel =
    uiLanguage === "zh" ? "返回上一页" : "Back to previous page";

  return (
    <main className="min-h-[100dvh] bg-[linear-gradient(180deg,#F5E4CE_0%,#F3EDE0_48%,#EFE7D7_100%)] pb-10">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 pt-5 md:px-6 md:pt-6">
        <button
          type="button"
          onClick={handleBack}
          className="rounded-full border border-[rgba(40,35,26,0.08)] bg-[#F6F0E3]/88 px-3 py-1.5 text-[12px] text-[#6B6254] transition-colors hover:bg-[#E8E0CE]"
        >
          {backLabel}
        </button>
      </div>

      <NpcMemoryCenter uiLanguage={uiLanguage} />
    </main>
  );
}
