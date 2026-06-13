import type { NpcId } from "@/lib/npc";

export type WordReviewFilter = "all" | "unreviewed" | "reviewed" | "withNotes" | "mastered";
export type WordNpcFilter = NpcId | "all";
export type WordSort = "newest" | "oldest" | "reviewAsc" | "reviewDesc";

interface SavedWordsFilterControlsProps {
  isEn: boolean;
  wordReviewFilter: WordReviewFilter;
  wordNpcFilter: WordNpcFilter;
  wordSort: WordSort;
  totalCount: number;
  filteredCount: number;
  npcOptions: Array<{ value: WordNpcFilter; label: string }>;
  onWordReviewFilterChange: (value: WordReviewFilter) => void;
  onWordNpcFilterChange: (value: WordNpcFilter) => void;
  onWordSortChange: (value: WordSort) => void;
}

const REVIEW_FILTERS: WordReviewFilter[] = [
  "all",
  "unreviewed",
  "reviewed",
  "withNotes",
  "mastered",
];

export function SavedWordsFilterControls({
  isEn,
  wordReviewFilter,
  wordNpcFilter,
  wordSort,
  totalCount,
  filteredCount,
  npcOptions,
  onWordReviewFilterChange,
  onWordNpcFilterChange,
  onWordSortChange,
}: SavedWordsFilterControlsProps) {
  const reviewFilterLabels: Record<WordReviewFilter, string> = isEn
    ? {
        all: "All",
        unreviewed: "Not reviewed",
        reviewed: "Reviewed",
        withNotes: "With notes",
        mastered: "Mastered",
      }
    : {
        all: "全部",
        unreviewed: "未复习",
        reviewed: "已复习",
        withNotes: "有笔记",
        mastered: "已掌握",
      };

  const wordCountLabel = isEn
    ? `Showing ${filteredCount} of ${totalCount} words`
    : `显示 ${filteredCount} / ${totalCount} 个词`;

  const sortLabel = isEn ? "Sort" : "排序";
  const npcLabel = "NPC";

  const wordSortLabels: Record<WordSort, string> = isEn
    ? {
        newest: "Newest saved",
        oldest: "Oldest saved",
        reviewAsc: "Fewest reviews",
        reviewDesc: "Most reviews",
      }
    : {
        newest: "最近保存",
        oldest: "最早保存",
        reviewAsc: "复习次数少到多",
        reviewDesc: "复习次数多到少",
      };

  return (
    <div className="mt-3 space-y-3">
      <p className="text-[10px] text-[#7A7060]">{wordCountLabel}</p>

      <div className="flex flex-wrap gap-2">
        {REVIEW_FILTERS.map((reviewFilterItem) => (
          <button
            key={reviewFilterItem}
            type="button"
            onClick={() => onWordReviewFilterChange(reviewFilterItem)}
            className={`rounded-full px-3 py-1.5 text-[9px] font-medium transition-colors ${
              wordReviewFilter === reviewFilterItem
                ? "bg-[#2D4A1F] text-[#F3EDE0] shadow-sm"
                : "bg-[#E8E0CE]/60 text-[#7A7060] hover:bg-[#E8E0CE]"
            }`}
          >
            {reviewFilterLabels[reviewFilterItem]}
          </button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[10px] text-[#7A7060]">
          <span>{npcLabel}</span>
          <select
            value={wordNpcFilter}
            onChange={(event) => onWordNpcFilterChange(event.target.value as WordNpcFilter)}
            className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-3 py-2 text-[11px] text-[#4A4438] outline-none transition-colors focus:border-[#2D4A1F]/20"
          >
            {npcOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-[10px] text-[#7A7060]">
          <span>{sortLabel}</span>
          <select
            value={wordSort}
            onChange={(event) => onWordSortChange(event.target.value as WordSort)}
            className="rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-3 py-2 text-[11px] text-[#4A4438] outline-none transition-colors focus:border-[#2D4A1F]/20"
          >
            <option value="newest">{wordSortLabels.newest}</option>
            <option value="oldest">{wordSortLabels.oldest}</option>
            <option value="reviewAsc">{wordSortLabels.reviewAsc}</option>
            <option value="reviewDesc">{wordSortLabels.reviewDesc}</option>
          </select>
        </label>
      </div>
    </div>
  );
}
