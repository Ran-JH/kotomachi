"use client";

import { useMemo, useState } from "react";
import { loadUiLanguage } from "@/lib/ui-language";

const ALPHA_ACCESS_STORAGE_KEY = "kotomachi_alpha_access_granted_v1";

type Props = {
  children: React.ReactNode;
};

export function AlphaAccessGate({ children }: Props) {
  const accessCode = process.env.NEXT_PUBLIC_ALPHA_ACCESS_CODE?.trim() ?? "";
  const gateEnabled = accessCode.length > 0;

  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [granted, setGranted] = useState(() => {
    if (!gateEnabled || typeof window === "undefined") return true;
    try {
      return localStorage.getItem(ALPHA_ACCESS_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const uiLanguage = useMemo(() => loadUiLanguage(), []);
  const copy = uiLanguage === "en"
    ? {
        title: "Enter test code",
        placeholder: "Test code",
        button: "Enter",
        error: "Code is incorrect. Try again.",
      }
    : {
        title: "\u8f93\u5165\u6d4b\u8bd5\u7801",
        placeholder: "\u6d4b\u8bd5\u7801",
        button: "\u8fdb\u5165",
        error: "\u6d4b\u8bd5\u7801\u4e0d\u6b63\u786e\uff0c\u8bf7\u91cd\u8bd5\u3002",
      };

  if (!gateEnabled || granted) return <>{children}</>;

  const handleEnter = () => {
    if (inputCode.trim() !== accessCode) {
      setError(copy.error);
      return;
    }
    try {
      localStorage.setItem(ALPHA_ACCESS_STORAGE_KEY, "1");
    } catch {
      // localStorage unavailable: allow current session only.
    }
    setGranted(true);
  };

  return (
    <main className="min-h-screen bg-[#F3EDE0] text-[#2D4A1F] flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] p-5 shadow-[0_10px_30px_rgba(40,35,26,0.1)]">
        <p className="text-sm font-medium">{copy.title}</p>
        <div className="mt-3 flex gap-2">
          <input
            type="password"
            value={inputCode}
            onChange={(event) => {
              setInputCode(event.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              handleEnter();
            }}
            placeholder={copy.placeholder}
            className="min-w-0 flex-1 rounded-xl border border-[rgba(40,35,26,0.12)] bg-[#EDE7D8] px-3 py-2 text-sm outline-none focus:border-[#C9A84C]/60 focus:ring-2 focus:ring-[#C9A84C]/20"
          />
          <button
            type="button"
            onClick={handleEnter}
            className="shrink-0 rounded-xl bg-[#2D4A1F] px-3 py-2 text-sm font-medium text-[#F3EDE0]"
          >
            {copy.button}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-[#7A7060]">{error}</p> : null}
      </div>
    </main>
  );
}
