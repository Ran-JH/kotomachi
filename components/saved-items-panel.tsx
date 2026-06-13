import { useEffect, useMemo, useRef, useState } from "react";
import {
  markSavedWordReviewed,
  updateSavedWordNote,
  type SavedExpression,
  type SavedItem,
  type SavedWord,
} from "@/lib/saved-items";
import type { NpcId } from "@/lib/npc";
import type { UiCopy } from "@/lib/ui-copy";
import { getNpcDisplayName, isNpcId } from "@/lib/npc";
import { TrashIcon } from "@/components/ui-icons";
import {
  SavedWordsFilterControls,
  type WordNpcFilter,
  type WordReviewFilter,
  type WordSort,
} from "@/components/saved-words-filter-controls";
import { SavedWordCompletionSummary } from "@/components/saved-word-completion-summary";

type FilterType = "all" | "expression" | "word";
type WordCardMode = "queue" | "detail";

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
  summary_upgrade: "ステップアップ",
};

const WORD_NPC_FILTER_IDS: NpcId[] = [
  "kimura",
  "misaki",
  "taisho",
  "haruka",
  "aoi",
  "nana",
  "ren",
];

function formatSavedTime(value: string, locale: "zh-CN" | "en-US"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value || "—";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatReviewDate(value: string, locale: "zh-CN" | "en-US"): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getWordReviewNpcLabel(npcId: string, isEn: boolean): string {
  if (isNpcId(npcId)) {
    if (isEn) {
      switch (npcId) {
        case "kimura":
          return "Kimura";
        case "misaki":
          return "Misaki";
        case "taisho":
          return "Taisho";
        case "haruka":
          return "Haruka";
        case "aoi":
          return "Aoi";
        case "nana":
          return "Nana";
        case "ren":
          return "Ren";
      }
    }

    return getNpcDisplayName(npcId);
  }

  return isEn ? "Kotomachi" : "言街";
}

function toTimestamp(value?: string): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

function compareByReviewNeed(a: SavedWord, b: SavedWord): number {
  const aHasReview = Boolean(a.lastReviewedAt);
  const bHasReview = Boolean(b.lastReviewedAt);

  if (aHasReview !== bHasReview) {
    return aHasReview ? 1 : -1;
  }

  if (!aHasReview && !bHasReview) {
    return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
  }

  const reviewDelta = toTimestamp(a.lastReviewedAt) - toTimestamp(b.lastReviewedAt);
  if (reviewDelta !== 0) {
    return reviewDelta;
  }

  return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
}

function buildReviewQueue(words: SavedWord[]): string[] {
  return words
    .slice()
    .sort(compareByReviewNeed)
    .map((item) => item.id);
}

function buildReviewSessionStartMeta(words: SavedWord[]): Record<string, { reviewCount: number }> {
  return words.reduce<Record<string, { reviewCount: number }>>((acc, item) => {
    acc[item.id] = {
      reviewCount: item.reviewCount ?? 0,
    };
    return acc;
  }, {});
}

function getWordReviewSummaryLabel(item: SavedWord, isEn: boolean): string {
  const count = item.reviewCount ?? 0;
  if (count <= 0) {
    return isEn ? "First review" : "第一次复习";
  }

  if (isEn) {
    return count === 1 ? "Reviewed 1 time" : `Reviewed ${count} times`;
  }

  return `已复习 ${count} 次`;
}

function getWordListReviewBadge(item: SavedWord, isEn: boolean): string {
  const count = item.reviewCount ?? 0;
  if (count <= 0) {
    return isEn ? "Not reviewed" : "未复习";
  }

  if (isEn) {
    return count === 1 ? "Reviewed 1 time" : `Reviewed ${count} times`;
  }

  return `已复习 ${count} 次`;
}

function getWordCardLabels(isEn: boolean) {
  return isEn
    ? {
        reviewTitle: "Word review",
        detailTitle: "Word card",
        backToSaved: "Back to saved items",
        reading: "Reading",
        meaning: "Meaning",
        detailedNote: "Detailed note",
        sentenceMeaning: "Meaning in this sentence",
        sourceSentence: "Source sentence",
        sourceSentenceFallback: "No source sentence yet",
        myNote: "My note",
        noNoteYet: "No note yet",
        addNote: "Add note",
        editNote: "Edit",
        saveNote: "Save",
        cancelEdit: "Cancel",
        notePlaceholder:
          "Write your own understanding, such as how this word feels in this sentence.",
        from: "From",
        saved: "Saved",
        lastReviewed: (value: string) => `Last reviewed: ${value}`,
        previous: "Previous",
        next: "Next",
        finishRound: "Finish round",
      }
    : {
        reviewTitle: "单词复习",
        detailTitle: "单词卡片",
        backToSaved: "返回收藏",
        reading: "读音",
        meaning: "释义",
        detailedNote: "详细解释",
        sentenceMeaning: "这句话里的意思",
        sourceSentence: "出处原句",
        sourceSentenceFallback: "暂无出处原句",
        myNote: "我的笔记",
        noNoteYet: "还没有笔记",
        addNote: "添加笔记",
        editNote: "编辑",
        saveNote: "保存",
        cancelEdit: "取消",
        notePlaceholder: "写一点你自己的理解，比如这个词在这句话里的感觉。",
        from: "来自",
        saved: "保存于",
        lastReviewed: (value: string) => `上次看过：${value}`,
        previous: "上一个",
        next: "下一个",
        finishRound: "完成本轮",
      };
}

function sortWordItems(words: SavedWord[], wordSort: WordSort): SavedWord[] {
  return words.slice().sort((a, b) => {
    const aCreatedAt = toTimestamp(a.createdAt);
    const bCreatedAt = toTimestamp(b.createdAt);
    const aReviewCount = a.reviewCount ?? 0;
    const bReviewCount = b.reviewCount ?? 0;

    switch (wordSort) {
      case "oldest":
        return aCreatedAt - bCreatedAt;
      case "reviewAsc":
        if (aReviewCount !== bReviewCount) {
          return aReviewCount - bReviewCount;
        }
        return bCreatedAt - aCreatedAt;
      case "reviewDesc":
        if (aReviewCount !== bReviewCount) {
          return bReviewCount - aReviewCount;
        }
        return bCreatedAt - aCreatedAt;
      case "newest":
      default:
        return bCreatedAt - aCreatedAt;
    }
  });
}

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
    <div className="relative rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-3.5">
      <button
        type="button"
        onClick={onDelete}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] text-[#7A7060]/40 transition-colors hover:bg-[#E8E0CE] hover:text-[#7A7060]"
        aria-label={copy.sidebar.savedDelete}
      >
        <TrashIcon size={10} />
        <span>{copy.sidebar.savedDelete}</span>
      </button>

      <p className="pr-14 text-[14px] font-semibold leading-[1.7] text-[#2D4A1F]">
        {item.suggestion}
      </p>

      {item.original && (
        <div className="mt-2.5 rounded-lg bg-[#F3EDE0] px-3 py-2">
          <span className="mb-0.5 block text-[8px] font-medium text-[#7A7060]/50">
            {copy.sidebar.savedOriginalLabel}
          </span>
          <p className="line-clamp-2 text-[10px] leading-relaxed text-[#7A7060]/75">
            {item.original}
          </p>
        </div>
      )}

      {item.note && (
        <div className="mt-2 rounded-lg bg-[#F3EDE0]/60 px-3 py-2">
          <span className="mb-0.5 block text-[8px] font-medium text-[#7A7060]/50">
            {copy.sidebar.savedNoteLabel}
          </span>
          <p className="line-clamp-2 text-[10px] leading-relaxed text-[#7A7060]/70">
            {item.note}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
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
  isEn,
  onDelete,
  onOpen,
}: {
  item: SavedWord;
  copy: UiCopy;
  isEn: boolean;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const reviewBadge = getWordListReviewBadge(item, isEn);
  const hasNote = Boolean(item.note?.trim());

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="relative cursor-pointer rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-3.5 transition-colors hover:bg-[#F7F1E6] focus:outline-none focus:ring-2 focus:ring-[#2D4A1F]/20"
      aria-label={isEn ? `Open word card for ${item.word}` : `打开 ${item.word} 的单词卡片`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] text-[#7A7060]/40 transition-colors hover:bg-[#E8E0CE] hover:text-[#7A7060]"
        aria-label={copy.sidebar.savedDelete}
      >
        <TrashIcon size={10} />
        <span>{copy.sidebar.savedDelete}</span>
      </button>

      <div className="pr-14">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <p className="text-[14px] font-semibold leading-relaxed text-[#2D4A1F]">
            {item.word}
          </p>
          {item.reading && (
            <p className="text-[10px] leading-relaxed text-[#7A7060]/65">
              {item.reading}
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="inline-flex items-center rounded-full bg-[#E8EFE4] px-2.5 py-0.5 text-[8px] font-medium text-[#2D4A1F]/80">
            {reviewBadge}
          </span>
          {hasNote && (
            <span className="inline-flex items-center rounded-full bg-[#F3EDE0] px-2.5 py-0.5 text-[8px] font-medium text-[#6D624F]">
              {isEn ? "Has note" : "有笔记"}
            </span>
          )}
        </div>
      </div>

      {item.meaning && (
        <p className="mt-2 text-[11px] leading-relaxed text-[#28231A]/85">
          {item.meaning}
        </p>
      )}

      {item.example && (
        <p className="mt-1.5 line-clamp-2 text-[9px] italic leading-relaxed text-[#7A7060]/55">
          {item.example}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
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

function WordReviewCard({
  item,
  mode,
  index,
  total,
  isEn,
  isLastItem,
  onBack,
  onPrevious,
  onNext,
  onSaveNote,
}: {
  item: SavedWord;
  mode: WordCardMode;
  index?: number;
  total?: number;
  isEn: boolean;
  isLastItem?: boolean;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSaveNote: (wordId: string, note: string) => void;
}) {
  const labels = getWordCardLabels(isEn);
  const hasPrevious = mode === "queue" ? (index ?? 0) > 0 : false;
  const locale = isEn ? "en-US" : "zh-CN";
  const npcLabel = getWordReviewNpcLabel(item.npcId, isEn);
  const nuanceExplanation = item.nuanceExplanation?.trim();
  const sentenceMeaning = item.sentenceMeaning?.trim();
  const sourceSentence = item.example?.trim();
  const note = item.note?.trim() ?? "";
  const hasDetailedNote = Boolean(nuanceExplanation || sentenceMeaning);
  const reviewSummary = getWordReviewSummaryLabel(item, isEn);
  const lastReviewedText = item.lastReviewedAt
    ? labels.lastReviewed(formatReviewDate(item.lastReviewedAt, locale))
    : null;
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(note);

  useEffect(() => {
    // 切换到另一张卡片，或外部保存后回写时，重置编辑器状态，避免串到别的词。
    setDraftNote(item.note ?? "");
    setIsEditingNote(false);
  }, [item.id, item.note]);

  const handleCancelNoteEdit = () => {
    setDraftNote(note);
    setIsEditingNote(false);
  };

  const handleSaveNote = () => {
    onSaveNote(item.id, draftNote);
    setDraftNote(draftNote.trim());
    setIsEditingNote(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
        >
          ← {labels.backToSaved}
        </button>

        <div className="ml-auto flex items-center gap-3 text-right">
          <h3 className="font-ui text-sm font-semibold text-[#2D4A1F]">
            {mode === "queue" ? labels.reviewTitle : labels.detailTitle}
          </h3>
          {mode === "queue" && typeof index === "number" && typeof total === "number" && (
            <span className="text-[11px] font-medium text-[#7A7060]">
              {index + 1} / {total}
            </span>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] p-4 sm:p-5">
        <div className="border-b border-[rgba(40,35,26,0.08)] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="font-ja break-words text-[24px] font-semibold leading-tight text-[#2D4A1F] sm:text-[28px]">
              {item.word}
            </p>
            <span className="inline-flex shrink-0 items-center rounded-full bg-[#2D4A1F]/10 px-3 py-1 text-[10px] font-medium text-[#2D4A1F]/80">
              {reviewSummary}
            </span>
          </div>
          {lastReviewedText && (
            <p className="mt-2 text-[11px] leading-relaxed text-[#7A7060]">
              {lastReviewedText}
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
              {labels.reading}
            </p>
            <p className="font-ja mt-1 break-words text-[14px] leading-relaxed text-[#28231A]">
              {item.reading?.trim() || "—"}
            </p>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
              {labels.meaning}
            </p>
            <p className="mt-1 break-words text-[14px] leading-relaxed text-[#28231A]">
              {item.meaning || "—"}
            </p>
          </div>

          {hasDetailedNote && (
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.detailedNote}
              </p>
              <div className="mt-1 rounded-xl bg-[#F3EDE0]/80 px-4 py-3">
                {nuanceExplanation && (
                  <p className="break-words text-[13px] leading-relaxed text-[#4A4438]">
                    {nuanceExplanation}
                  </p>
                )}
                {sentenceMeaning && (
                  <div
                    className={nuanceExplanation ? "mt-3 border-t border-[rgba(40,35,26,0.08)] pt-3" : ""}
                  >
                    <p className="text-[10px] font-medium text-[#7A7060]">
                      {labels.sentenceMeaning}
                    </p>
                    <p className="mt-1 break-words text-[12px] leading-relaxed text-[#4A4438]">
                      {sentenceMeaning}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
              {labels.sourceSentence}
            </p>
            <div className="mt-1 rounded-xl bg-[#F3EDE0] px-4 py-3">
              <p className="font-ja break-words text-[14px] leading-relaxed text-[#4A4438]">
                {sourceSentence || labels.sourceSentenceFallback}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
              {labels.myNote}
            </p>
            <div className="mt-1 rounded-xl bg-[#F7F2E8] px-4 py-3">
              {isEditingNote ? (
                <div className="space-y-3">
                  <textarea
                    value={draftNote}
                    onChange={(event) => setDraftNote(event.target.value)}
                    placeholder={labels.notePlaceholder}
                    rows={4}
                    className="min-h-[104px] w-full resize-y rounded-xl border border-[rgba(40,35,26,0.12)] bg-[#FAF6EE] px-3 py-2 text-[13px] leading-relaxed text-[#28231A] outline-none transition-colors placeholder:text-[#7A7060]/45 focus:border-[#2D4A1F]/25"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                    >
                      {labels.saveNote}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelNoteEdit}
                      className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                    >
                      {labels.cancelEdit}
                    </button>
                  </div>
                </div>
              ) : note ? (
                <div className="space-y-3">
                  <p className="break-words text-[13px] leading-relaxed text-[#4A4438]">
                    {note}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(true)}
                    className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-3.5 py-1.5 text-[10px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                  >
                    {labels.editNote}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] leading-relaxed text-[#7A7060]">
                    {labels.noNoteYet}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(true)}
                    className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-3.5 py-1.5 text-[10px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                  >
                    {labels.addNote}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.from}
              </p>
              <p className="mt-1 break-words text-[13px] leading-relaxed text-[#28231A]">
                {npcLabel}
              </p>
            </div>

            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.saved}
              </p>
              <p className="mt-1 break-words text-[13px] leading-relaxed text-[#28231A]">
                {formatSavedTime(item.createdAt, locale)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {mode === "queue" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {labels.previous}
          </button>
          <button
            type="button"
            onClick={onNext}
            className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
          >
            {isLastItem ? labels.finishRound : labels.next}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
          >
            {labels.backToSaved}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
          >
            {labels.backToSaved}
          </button>
        </div>
      )}
    </div>
  );
}

export function SavedItemsPanel({
  copy,
  items,
  onDelete,
  onClose,
}: SavedItemsPanelProps) {
  const isEn = copy.summary.title === "Review Card";
  const backToChatLabel = isEn ? "← Back to chat" : "← 返回聊天";
  const reviewEntryLabel = isEn ? "Review words" : "复习单词";
  const savedWordsEmptyLabel = isEn
    ? "No saved words yet. Select a word during chat and save it after looking it up."
    : "还没有保存的单词。聊天时划词查词后，可以把想复习的词保存下来。";
  const noFilteredWordsLabel = isEn
    ? "No words match these filters. Try another filter."
    : "没有符合条件的词。可以换一个筛选条件看看。";

  const [panelItems, setPanelItems] = useState<SavedItem[]>(items);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [isWordReviewMode, setIsWordReviewMode] = useState(false);
  const [reviewQueueIds, setReviewQueueIds] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState<string[]>([]);
  const [reviewSessionWords, setReviewSessionWords] = useState<SavedWord[]>([]);
  const [reviewSessionStartMeta, setReviewSessionStartMeta] = useState<
    Record<string, { reviewCount: number }>
  >({});
  const [wordReviewFilter, setWordReviewFilter] = useState<WordReviewFilter>("all");
  const [wordNpcFilter, setWordNpcFilter] = useState<WordNpcFilter>("all");
  const [wordSort, setWordSort] = useState<WordSort>("newest");
  const openingWordIdRef = useRef<string | null>(null);

  useEffect(() => {
    setPanelItems(items);
  }, [items]);

  useEffect(() => {
    if (!selectedWordId) {
      openingWordIdRef.current = null;
      return;
    }

    const stillExists = panelItems.some((item) => item.type === "word" && item.id === selectedWordId);
    if (!stillExists) {
      setSelectedWordId(null);
      openingWordIdRef.current = null;
    }
  }, [panelItems, selectedWordId]);

  const expressionCount = panelItems.filter((item) => item.type === "expression").length;
  const allWordItems = useMemo(
    () => panelItems.filter((item): item is SavedWord => item.type === "word"),
    [panelItems]
  );
  const wordCount = allWordItems.length;
  const totalCount = expressionCount + wordCount;

  const filteredWordItems = useMemo(() => {
    let nextWords = allWordItems.slice();

    if (wordReviewFilter === "unreviewed") {
      nextWords = nextWords.filter((item) => (item.reviewCount ?? 0) <= 0);
    } else if (wordReviewFilter === "reviewed") {
      nextWords = nextWords.filter((item) => (item.reviewCount ?? 0) > 0);
    } else if (wordReviewFilter === "withNotes") {
      nextWords = nextWords.filter((item) => Boolean(item.note?.trim()));
    }

    if (wordNpcFilter !== "all") {
      nextWords = nextWords.filter((item) => item.npcId === wordNpcFilter);
    }

    return sortWordItems(nextWords, wordSort);
  }, [allWordItems, wordNpcFilter, wordReviewFilter, wordSort]);

  const listItems = useMemo(() => {
    if (filter === "all") return panelItems;
    if (filter === "expression") return panelItems.filter((item) => item.type === "expression");
    return filteredWordItems;
  }, [filter, filteredWordItems, panelItems]);

  const selectedWord = useMemo(
    () => allWordItems.find((item) => item.id === selectedWordId) ?? null,
    [allWordItems, selectedWordId]
  );

  const reviewWords = isWordReviewMode ? reviewSessionWords : allWordItems;
  const reviewWordsById = useMemo(
    () => new Map(reviewWords.map((word) => [word.id, word])),
    [reviewWords]
  );

  const reviewCompletionSummary = useMemo(() => {
    let firstReviewCount = 0;
    let reviewedBeforeCount = 0;
    let withNotesCount = 0;

    for (const wordId of reviewedInSession) {
      const startMeta = reviewSessionStartMeta[wordId];
      const currentWord = reviewWordsById.get(wordId);

      if ((startMeta?.reviewCount ?? 0) <= 0) {
        firstReviewCount += 1;
      } else {
        reviewedBeforeCount += 1;
      }

      if (currentWord?.note?.trim()) {
        withNotesCount += 1;
      }
    }

    return {
      reviewedCount: reviewedInSession.length,
      firstReviewCount,
      reviewedBeforeCount,
      withNotesCount,
    };
  }, [reviewSessionStartMeta, reviewedInSession, reviewWordsById]);

  const safeReviewIndex =
    reviewQueueIds.length === 0 ? 0 : Math.min(reviewIndex, reviewQueueIds.length - 1);
  const currentReviewWord = reviewWordsById.get(reviewQueueIds[safeReviewIndex] ?? "") ?? null;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: copy.sidebar.savedAll, count: totalCount },
    { key: "expression", label: copy.sidebar.savedExpressions, count: expressionCount },
    { key: "word", label: copy.sidebar.savedWords, count: wordCount },
  ];

  const npcOptions = useMemo(
    () => [
      {
        value: "all" as const,
        label: isEn ? "All NPCs" : "全部 NPC",
      },
      ...WORD_NPC_FILTER_IDS.map((npcId) => ({
        value: npcId,
        label: getWordReviewNpcLabel(npcId, isEn),
      })),
    ],
    [isEn]
  );

  const resetReviewState = () => {
    setReviewQueueIds([]);
    setReviewIndex(0);
    setReviewComplete(false);
    setReviewedInSession([]);
    setReviewSessionWords([]);
    setReviewSessionStartMeta({});
  };

  const handleEnterWordReview = () => {
    if (allWordItems.length === 0) return;
    setSelectedWordId(null);
    openingWordIdRef.current = null;
    setReviewSessionWords(allWordItems);
    setReviewSessionStartMeta(buildReviewSessionStartMeta(allWordItems));
    setReviewQueueIds(buildReviewQueue(allWordItems));
    setReviewIndex(0);
    setReviewComplete(false);
    setReviewedInSession([]);
    setIsWordReviewMode(true);
  };

  const handleExitWordReview = () => {
    setIsWordReviewMode(false);
    resetReviewState();
  };

  const handleBackToSavedItems = () => {
    openingWordIdRef.current = null;
    setSelectedWordId(null);
  };

  const handleOpenWordCard = (wordId: string) => {
    if (openingWordIdRef.current === wordId && selectedWordId === wordId) {
      return;
    }

    openingWordIdRef.current = wordId;

    const updatedItems = markSavedWordReviewed(wordId);
    const updatedWords = updatedItems.filter((item): item is SavedWord => item.type === "word");

    setPanelItems(updatedItems);
    setSelectedWordId(wordId);
    setReviewSessionWords(updatedWords);
  };

  const handleSaveWordNote = (wordId: string, note: string) => {
    const updatedItems = updateSavedWordNote(wordId, note);
    const updatedWords = updatedItems.filter((item): item is SavedWord => item.type === "word");

    // 本地 panel 状态和 review/detail 视图都基于这份数据，这样保存后能立刻看到最新 badge 和 note。
    setPanelItems(updatedItems);
    setReviewSessionWords(updatedWords);
  };

  const markCurrentWordReviewed = (wordId: string): SavedWord[] => {
    if (reviewedInSession.includes(wordId)) {
      return reviewSessionWords;
    }

    const updatedItems = markSavedWordReviewed(wordId);
    const updatedWords = updatedItems.filter((item): item is SavedWord => item.type === "word");

    setPanelItems(updatedItems);
    setReviewSessionWords(updatedWords);
    setReviewedInSession((current) => [...current, wordId]);
    return updatedWords;
  };

  const handleAdvanceReview = () => {
    if (!currentReviewWord) return;

    const updatedWords = markCurrentWordReviewed(currentReviewWord.id);
    const isLastItem = safeReviewIndex >= reviewQueueIds.length - 1;

    if (isLastItem) {
      setReviewComplete(true);
      return;
    }

    if (updatedWords.length > 0) {
      setReviewSessionWords(updatedWords);
    }

    setReviewIndex((current) => Math.min(reviewQueueIds.length - 1, current + 1));
  };

  const handleRestartReview = () => {
    const nextWords = reviewSessionWords.length > 0 ? reviewSessionWords : allWordItems;
    if (nextWords.length === 0) {
      setReviewComplete(false);
      return;
    }

    setSelectedWordId(null);
    openingWordIdRef.current = null;
    setReviewSessionWords(nextWords);
    setReviewSessionStartMeta(buildReviewSessionStartMeta(nextWords));
    setReviewQueueIds(buildReviewQueue(nextWords));
    setReviewIndex(0);
    setReviewComplete(false);
    setReviewedInSession([]);
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label={copy.common.close}
        className="absolute inset-0 bg-[#28231A]/10"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-[rgba(40,35,26,0.08)] bg-[#F3EDE0] shadow-[-8px_0_30px_rgba(40,35,26,0.12)]">
        <header className="shrink-0 border-b border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-4 sm:px-6 sm:py-5">
          <div className="mb-1 flex items-center">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
            >
              {backToChatLabel}
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#7A7060] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
            aria-label={copy.common.close}
          >
            ✕
          </button>
          <h2 className="font-ui mt-1 text-sm font-semibold text-[#2D4A1F]">
            {copy.sidebar.savedTitle}
          </h2>
          {totalCount > 0 && (
            <p className="mt-1 text-[9px] text-[#7A7060]/55">
              {copy.sidebar.savedCount(totalCount)}
            </p>
          )}
        </header>

        {!isWordReviewMode && !selectedWord && (
          <div className="shrink-0 border-b border-[rgba(40,35,26,0.06)] bg-[#FAF6EE]/60 px-6 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {filters.map((filterItem) => (
                  <button
                    key={filterItem.key}
                    type="button"
                    onClick={() => setFilter(filterItem.key)}
                    className={`rounded-full px-3.5 py-1.5 text-[9px] font-medium transition-colors ${
                      filter === filterItem.key
                        ? "bg-[#2D4A1F] text-[#F3EDE0] shadow-sm"
                        : "bg-[#E8E0CE]/60 text-[#7A7060] hover:bg-[#E8E0CE]"
                    }`}
                  >
                    {filterItem.label}
                    {filterItem.count > 0 && (
                      <span
                        className={`ml-1 ${
                          filter === filterItem.key ? "opacity-70" : "opacity-50"
                        }`}
                      >
                        {filterItem.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {wordCount > 0 && (
                <button
                  type="button"
                  onClick={handleEnterWordReview}
                  className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-3.5 py-1.5 text-[9px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                >
                  {reviewEntryLabel}
                </button>
              )}
            </div>

            {filter === "word" && wordCount > 0 && (
              <SavedWordsFilterControls
                isEn={isEn}
                wordReviewFilter={wordReviewFilter}
                wordNpcFilter={wordNpcFilter}
                wordSort={wordSort}
                totalCount={wordCount}
                filteredCount={filteredWordItems.length}
                npcOptions={npcOptions}
                onWordReviewFilterChange={setWordReviewFilter}
                onWordNpcFilterChange={setWordNpcFilter}
                onWordSortChange={setWordSort}
              />
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {isWordReviewMode ? (
            reviewComplete ? (
              <SavedWordCompletionSummary
                isEn={isEn}
                totalReviewed={reviewCompletionSummary.reviewedCount}
                firstReviewCount={reviewCompletionSummary.firstReviewCount}
                reviewedBeforeCount={reviewCompletionSummary.reviewedBeforeCount}
                withNotesCount={reviewCompletionSummary.withNotesCount}
                onReviewAgain={handleRestartReview}
                onBackToSavedItems={handleExitWordReview}
              />
            ) : currentReviewWord ? (
              <WordReviewCard
                item={currentReviewWord}
                mode="queue"
                index={safeReviewIndex}
                total={reviewQueueIds.length}
                isEn={isEn}
                isLastItem={safeReviewIndex >= reviewQueueIds.length - 1}
                onBack={handleExitWordReview}
                onPrevious={() => setReviewIndex((current) => Math.max(0, current - 1))}
                onNext={handleAdvanceReview}
                onSaveNote={handleSaveWordNote}
              />
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={handleExitWordReview}
                  className="inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                >
                  ← {isEn ? "Back to saved items" : "返回收藏"}
                </button>
                <p className="rounded-xl bg-[#FAF6EE] px-4 py-4 text-[12px] leading-relaxed text-[#7A7060]">
                  {savedWordsEmptyLabel}
                </p>
              </div>
            )
          ) : selectedWord ? (
            <WordReviewCard
              item={selectedWord}
              mode="detail"
              isEn={isEn}
              onBack={handleBackToSavedItems}
              onSaveNote={handleSaveWordNote}
            />
          ) : filter === "word" ? (
            wordCount === 0 ? (
              <p className="py-12 text-center text-[10px] leading-relaxed text-[#7A7060]/50">
                {savedWordsEmptyLabel}
              </p>
            ) : listItems.length === 0 ? (
              <p className="py-12 text-center text-[10px] leading-relaxed text-[#7A7060]/50">
                {noFilteredWordsLabel}
              </p>
            ) : (
              <div className="space-y-3.5">
                {listItems.map((item) => {
                  if (item.type !== "word") return null;

                  return (
                    <WordCard
                      key={item.id}
                      item={item}
                      copy={copy}
                      isEn={isEn}
                      onDelete={() => onDelete(item.id)}
                      onOpen={() => handleOpenWordCard(item.id)}
                    />
                  );
                })}
              </div>
            )
          ) : listItems.length === 0 ? (
            <p className="py-12 text-center text-[10px] leading-relaxed text-[#7A7060]/50">
              {copy.sidebar.savedEmpty}
            </p>
          ) : (
            <div className="space-y-3.5">
              {listItems.map((item) => {
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
                      isEn={isEn}
                      onDelete={() => onDelete(item.id)}
                      onOpen={() => handleOpenWordCard(item.id)}
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
