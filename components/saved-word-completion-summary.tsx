interface SavedWordCompletionSummaryProps {
  isEn: boolean;
  totalReviewed: number;
  firstReviewCount: number;
  reviewedBeforeCount: number;
  withNotesCount: number;
  onReviewAgain: () => void;
  onBackToSavedItems: () => void;
}

export function SavedWordCompletionSummary({
  isEn,
  totalReviewed,
  firstReviewCount,
  reviewedBeforeCount,
  withNotesCount,
  onReviewAgain,
  onBackToSavedItems,
}: SavedWordCompletionSummaryProps) {
  const title = isEn ? "Round complete" : "这轮看完了";
  const description = isEn
    ? `You reviewed ${totalReviewed} saved words.`
    : `刚刚复习了 ${totalReviewed} 个保存过的词。`;
  const labels = isEn
    ? {
        firstReview: "First review",
        reviewedBefore: "Reviewed before",
        withNotes: "With notes",
        reviewAgain: "Review again",
        backToSaved: "Back to saved items",
      }
    : {
        firstReview: "第一次复习",
        reviewedBefore: "再次复习",
        withNotes: "有笔记",
        reviewAgain: "再看一轮",
        backToSaved: "返回收藏",
      };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-5">
        <h3 className="font-ui text-sm font-semibold text-[#2D4A1F]">{title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#4A4438]">{description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full bg-[#F3EDE0] px-3 py-1 text-[11px] font-medium text-[#4A4438]">
            {labels.firstReview}：{firstReviewCount}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#F3EDE0] px-3 py-1 text-[11px] font-medium text-[#4A4438]">
            {labels.reviewedBefore}：{reviewedBeforeCount}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#F3EDE0] px-3 py-1 text-[11px] font-medium text-[#4A4438]">
            {labels.withNotes}：{withNotesCount}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReviewAgain}
          className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
        >
          {labels.reviewAgain}
        </button>
        <button
          type="button"
          onClick={onBackToSavedItems}
          className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
        >
          {labels.backToSaved}
        </button>
      </div>
    </div>
  );
}
