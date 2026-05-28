import { useState } from "react";
import type { SavedExpression, SavedItem, SavedWord } from "@/lib/saved-items";
import type { UiCopy } from "@/lib/ui-copy";
import { TrashIcon } from "@/components/ui-icons";

type FilterType = "all" | "expression" | "word";

interface SavedItemsPanelProps {
  copy: UiCopy;
  items: SavedItem[];
  onDelete: (id: string) => void;
  onClose: () => void;
}

const LEVEL_LABELS: Record<string, string> = {
  casual: "カジュアル",
  neutral: "ふつう",
  polite: "フォーマル",
  summary_upgrade: "アップグレード",
};

function ExpressionCard({
  item,
  copy,
  onDelete,
}: {
  item: SavedExpression;
  copy: UiCopy;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-3.5 relative">
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] text-[#7A7060]/40 hover:bg-[#E8E0CE] hover:text-[#7A7060] transition-colors"
        aria-label={copy.sidebar.savedDelete}
      >
        <TrashIcon size={10} />
        <span>{copy.sidebar.savedDelete}</span>
      </button>

      <p className="text-[14px] text-[#2D4A1F] font-semibold leading-[1.7] pr-14">
        {item.suggestion}
      </p>

      {item.original && (
        <div className="mt-2.5 rounded-lg bg-[#F3EDE0] px-3 py-2">
          <span className="block text-[8px] font-medium text-[#7A7060]/50 mb-0.5">{copy.sidebar.savedOriginalLabel}</span>
          <p className="text-[10px] text-[#7A7060]/75 leading-relaxed line-clamp-2">
            {item.original}
          </p>
        </div>
      )}

      {item.note && (
        <div className="mt-2 rounded-lg bg-[#F3EDE0]/60 px-3 py-2">
          <span className="block text-[8px] font-medium text-[#7A7060]/50 mb-0.5">{copy.sidebar.savedNoteLabel}</span>
          <p className="text-[10px] text-[#7A7060]/70 leading-relaxed line-clamp-2">
            {item.note}
          </p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className="inline-block rounded-full bg-[#2D4A1F]/10 px-2.5 py-0.5 text-[8px] font-medium text-[#2D4A1F]/70">
          {copy.sidebar.savedExpressionBadge}
        </span>
        <span className="inline-block rounded-full bg-[#C9A84C]/12 px-2.5 py-0.5 text-[8px] font-medium text-[#8B7430]/75">
          {LEVEL_LABELS[item.level] ?? item.level}
        </span>
        {item.source === "feedback" && (
          <span className="inline-block rounded-full bg-[#7A7060]/8 px-2.5 py-0.5 text-[8px] font-medium text-[#7A7060]/55">
            {copy.sidebar.savedBadgeFeedback}
          </span>
        )}
        {item.source === "summary_card" && (
          <span className="inline-block rounded-full bg-[#7A7060]/8 px-2.5 py-0.5 text-[8px] font-medium text-[#7A7060]/55">
            {copy.sidebar.savedBadgeSummary}
          </span>
        )}
      </div>
    </div>
  );
}

function WordCard({
  item,
  copy,
  onDelete,
}: {
  item: SavedWord;
  copy: UiCopy;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-3.5 relative">
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] text-[#7A7060]/40 hover:bg-[#E8E0CE] hover:text-[#7A7060] transition-colors"
        aria-label={copy.sidebar.savedDelete}
      >
        <TrashIcon size={10} />
        <span>{copy.sidebar.savedDelete}</span>
      </button>

      <div className="flex items-baseline gap-2.5 pr-14">
        <p className="text-[14px] text-[#2D4A1F] font-semibold leading-relaxed">
          {item.word}
        </p>
        {item.reading && (
          <p className="text-[10px] text-[#7A7060]/65 leading-relaxed">
            {item.reading}
          </p>
        )}
      </div>

      {item.meaning && (
        <p className="mt-2 text-[11px] text-[#28231A]/85 leading-relaxed">
          {item.meaning}
        </p>
      )}

      {item.example && (
        <p className="mt-1.5 text-[9px] text-[#7A7060]/55 leading-relaxed italic line-clamp-2">
          {item.example}
        </p>
      )}

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        <span className="inline-block rounded-full bg-[#2D4A1F]/10 px-2.5 py-0.5 text-[8px] font-medium text-[#2D4A1F]/70">
          {copy.sidebar.savedWordBadge}
        </span>
        {item.source === "lookup" && (
          <span className="inline-block rounded-full bg-[#7A7060]/8 px-2.5 py-0.5 text-[8px] font-medium text-[#7A7060]/55">
            {copy.sidebar.savedBadgeLookup}
          </span>
        )}
        {item.source === "summary_card" && (
          <span className="inline-block rounded-full bg-[#7A7060]/8 px-2.5 py-0.5 text-[8px] font-medium text-[#7A7060]/55">
            {copy.sidebar.savedBadgeSummary}
          </span>
        )}
      </div>
    </div>
  );
}

export function SavedItemsPanel({
  copy,
  items,
  onDelete,
  onClose,
}: SavedItemsPanelProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered =
    filter === "all"
      ? items
      : items.filter((i) => i.type === filter);

  const expressionCount = items.filter((i) => i.type === "expression").length;
  const wordCount = items.filter((i) => i.type === "word").length;
  const totalCount = expressionCount + wordCount;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: copy.sidebar.savedAll, count: totalCount },
    { key: "expression", label: copy.sidebar.savedExpressions, count: expressionCount },
    { key: "word", label: copy.sidebar.savedWords, count: wordCount },
  ];

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label={copy.common.close}
        className="absolute inset-0 bg-[#28231A]/10"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-[#F3EDE0] border-l border-[rgba(40,35,26,0.08)] shadow-[-8px_0_30px_rgba(40,35,26,0.12)]">
        <header className="shrink-0 border-b border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
            aria-label={copy.common.close}
          >
            ✕
          </button>
          <h2 className="font-ui text-sm font-semibold text-[#2D4A1F]">
            {copy.sidebar.savedTitle}
          </h2>
          {totalCount > 0 && (
            <p className="mt-1 text-[9px] text-[#7A7060]/55">
              {copy.sidebar.savedCount(totalCount)}
            </p>
          )}
        </header>

        <div className="shrink-0 border-b border-[rgba(40,35,26,0.06)] bg-[#FAF6EE]/60 px-6 py-2.5 flex gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-[9px] font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#2D4A1F] text-[#F3EDE0] shadow-sm"
                  : "bg-[#E8E0CE]/60 text-[#7A7060] hover:bg-[#E8E0CE]"
              }`}
            >
              {f.label}
              {f.count > 0 && (
                <span className={`ml-1 ${filter === f.key ? "opacity-70" : "opacity-50"}`}>
                  {f.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {filtered.length === 0 ? (
            <p className="text-[10px] text-[#7A7060]/50 text-center py-12 leading-relaxed">
              {copy.sidebar.savedEmpty}
            </p>
          ) : (
            <div className="space-y-3.5">
              {filtered.map((item) => {
                if (item.type === "expression") {
                  return (
                    <ExpressionCard
                      key={item.id}
                      item={item}
                      copy={copy}
                      onDelete={() => onDelete(item.id)}
                    />
                  );
                }
                if (item.type === "word") {
                  return (
                    <WordCard
                      key={item.id}
                      item={item}
                      copy={copy}
                      onDelete={() => onDelete(item.id)}
                    />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
