import type { SessionSummaryCard } from "@/lib/session-summary";
import type { UiCopy } from "@/lib/ui-copy";

function formatSummaryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}

interface ChatSummaryListProps {
  copy: UiCopy;
  cards: SessionSummaryCard[];
  canCreateSummary: boolean;
  isSummaryGenerating: boolean;
  closeOnOpen?: boolean;
  onCreateSummary: () => void;
  onOpenSummaryCard: (card: SessionSummaryCard, closeDrawer?: boolean) => void;
}

export function ChatSummaryList({
  copy,
  cards,
  canCreateSummary,
  isSummaryGenerating,
  closeOnOpen = false,
  onCreateSummary,
  onOpenSummaryCard,
}: ChatSummaryListProps) {
  const recentCards = cards.slice(0, 5);

  return (
    <section className="border-t border-[rgba(255,255,255,0.06)] px-4 py-3">
      <div className="mb-2">
        <h2 className="text-[11px] font-semibold tracking-wide text-[#D4C8A8]">{copy.sidebar.reviewTitle}</h2>
        <p className="mt-0.5 text-[8px] text-[#D4C8A8]/45">{copy.sidebar.reviewSubtitle}</p>
      </div>
      <p className="mb-2 text-[9px] leading-relaxed text-[#D4C8A8]/45">
        {copy.sidebar.reviewDescription}
      </p>
      <button
        type="button"
        disabled={isSummaryGenerating}
        aria-disabled={!canCreateSummary}
        onClick={onCreateSummary}
        className={`w-full rounded-lg px-3 py-2 text-[10px] font-medium transition-colors disabled:cursor-not-allowed ${
          canCreateSummary
            ? "bg-[#C9A84C]/90 text-[#1E2A16] hover:bg-[#C9A84C]"
            : "bg-[rgba(255,255,255,0.05)] text-[#D4C8A8]/45 hover:bg-[rgba(255,255,255,0.08)]"
        }`}
      >
        {isSummaryGenerating ? copy.sidebar.creatingReview : copy.sidebar.createReview}
      </button>
      <div className="mt-3 space-y-1.5">
        {recentCards.length > 0 ? (
          recentCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => onOpenSummaryCard(card, closeOnOpen)}
              className="w-full rounded-lg border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-left transition-colors hover:bg-[rgba(255,255,255,0.07)]"
            >
              <span className="block truncate text-[10px] text-[#D4C8A8]">{card.title}</span>
              <span className="mt-0.5 block text-[8px] text-[#D4C8A8]/40">{formatSummaryDate(card.createdAt)}</span>
            </button>
          ))
        ) : (
          <p className="text-[8px] leading-relaxed text-[#D4C8A8]/35">
            {copy.sidebar.emptyReview}
          </p>
        )}
      </div>
    </section>
  );
}
