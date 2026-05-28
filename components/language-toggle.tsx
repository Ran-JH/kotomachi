"use client";

import type { UiLanguage } from "@/lib/ui-language";
import { getUiCopy } from "@/lib/ui-copy";

interface LanguageToggleProps {
  language: UiLanguage;
  onChange: (language: UiLanguage) => void;
  className?: string;
  variant?: "light" | "dark";
}

export function LanguageToggle({
  language,
  onChange,
  className = "",
  variant = "light",
}: LanguageToggleProps) {
  const copy = getUiCopy(language).languageToggle;
  const isDark = variant === "dark";

  return (
    <div
      className={`font-ui inline-flex rounded-full border p-0.5 text-[10px] shadow-sm ${
        isDark
          ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[#D4C8A8]/65"
          : "border-[rgba(40,35,26,0.1)] bg-[#FAF6EE]/75 text-[#7A7060]"
      } ${className}`}
      role="group"
      aria-label={copy.ariaLabel}
    >
      {(["zh", "en"] as const).map((option) => {
        const active = language === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`rounded-full px-2.5 py-1 transition-colors ${
              active
                ? isDark
                  ? "bg-[#C9A84C] text-[#1E2A16]"
                  : "bg-[#2D4A1F] text-[#F3EDE0]"
                : isDark
                  ? "hover:bg-[rgba(255,255,255,0.07)] hover:text-[#D4C8A8]"
                  : "hover:bg-[#E8E0CE] hover:text-[#28231A]"
            }`}
          >
            {option === "zh" ? copy.zh : copy.en}
          </button>
        );
      })}
    </div>
  );
}
