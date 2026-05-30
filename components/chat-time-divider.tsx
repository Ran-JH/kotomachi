import type { UiLanguage } from "@/lib/ui-language";

export interface TimeDividerMessage {
  createdAt?: string;
}

export const MESSAGE_TIME_DIVIDER_GAP_MS = 15 * 60 * 1000;

function parseMessageTime(value?: string): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

export function shouldShowTimeDivider(
  previousMessage: TimeDividerMessage | undefined,
  message: TimeDividerMessage,
): boolean {
  const currentTime = parseMessageTime(message.createdAt);
  if (currentTime === null) return false;

  const previousTime = parseMessageTime(previousMessage?.createdAt);
  if (previousTime === null) return true;

  return currentTime - previousTime >= MESSAGE_TIME_DIVIDER_GAP_MS;
}

function formatMessageDividerTime(value: string | undefined, uiLanguage: UiLanguage): string {
  const time = parseMessageTime(value);
  if (time === null) return "";

  const date = new Date(time);
  const now = new Date();
  const locale = uiLanguage === "en" ? "en-US" : "zh-CN";
  const sameDay = date.toDateString() === now.toDateString();

  if (sameDay) {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  return new Intl.DateTimeFormat(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function TimeDivider({ value, uiLanguage }: { value?: string; uiLanguage: UiLanguage }) {
  const label = formatMessageDividerTime(value, uiLanguage);
  if (!label) return null;

  return (
    <div className="flex justify-center py-1">
      <span className="font-ui rounded-full bg-[#E8E0CE]/70 px-3 py-1 text-[10px] text-[#7A7060] shadow-[0_1px_2px_rgba(40,35,26,0.04)]">
        {label}
      </span>
    </div>
  );
}
