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
  const surfaceClass = isDark
    ? "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)]"
    : "border-[rgba(40,35,26,0.09)] bg-[#F6F0E3]/82 backdrop-blur-[1.5px]";

  return (
    <div
      className={`font-ui relative inline-flex h-7 w-[4.75rem] text-[10px] md:h-auto md:w-auto md:rounded-full md:border md:p-0.5 md:shadow-sm ${
        isDark
          ? "text-[#D4C8A8]/65 md:border-[rgba(255,255,255,0.08)] md:bg-[rgba(255,255,255,0.04)]"
          : "text-[#7A7060] md:border-[rgba(40,35,26,0.09)] md:bg-[#F6F0E3]/82 md:backdrop-blur-[1.5px]"
      } ${className}`}
      role="group"
      aria-label={copy.ariaLabel}
    >
      {/* Mobile targets are 44px; the inner tray keeps the compact visual size. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 rounded-full border shadow-sm md:hidden ${surfaceClass}`}
      />
      <div className="absolute -inset-x-1.5 -inset-y-2 flex md:static">
      {(["zh", "en"] as const).map((option) => {
        const active = language === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            data-mobile-hit-target="language-option"
            className={`group relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-colors md:h-auto md:w-auto md:px-2.5 md:py-1 ${
              active
                ? isDark
                  ? "text-[#1E2A16] md:bg-[#C9A84C]"
                  : "text-[#F3EDE0] md:bg-[#2D4A1F]"
                : isDark
                  ? "hover:text-[#D4C8A8] md:hover:bg-[rgba(255,255,255,0.07)]"
                  : "hover:text-[#28231A] md:hover:bg-[#E8E0CE]"
            }`}
          >
            <span
              className={`rounded-full px-2.5 py-1 transition-colors md:bg-transparent md:p-0 md:group-hover:bg-transparent ${
                active
                  ? isDark
                    ? "bg-[#C9A84C]"
                    : "bg-[#2D4A1F]"
                  : isDark
                    ? "group-hover:bg-[rgba(255,255,255,0.07)]"
                    : "group-hover:bg-[#E8E0CE]"
              }`}
            >
              {option === "zh" ? copy.zh : copy.en}
            </span>
          </button>
        );
      })}
      </div>
    </div>
  );
}
