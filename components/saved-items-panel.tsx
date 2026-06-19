import { useEffect, useMemo, useRef, useState } from "react";
import {
  markSavedExpressionReviewed,
  markSavedWordReviewed,
  updateSavedExpressionUserNote,
  updateSavedWordMastered,
  updateSavedWordNote,
  type SavedExpression,
  type SavedItem,
  type SavedWord,
} from "@/lib/saved-items";
import { normalizeRevisionNotes, normalizeStructureNote } from "@/lib/feedback-types";
import { getNpcDisplayName, isNpcId, type NpcId } from "@/lib/npc";
import type { UiCopy } from "@/lib/ui-copy";
import type { UiLanguage } from "@/lib/ui-language";
import { SelectableLookupText } from "@/components/selectable-lookup-text";
import { TrashIcon } from "@/components/ui-icons";
import {
  type WordNpcFilter,
  type WordReviewFilter,
  type WordSort,
} from "@/components/saved-words-filter-controls";
import { SavedWordCompletionSummary } from "@/components/saved-word-completion-summary";

type FilterType = "all" | "expression" | "word";
type ExpressionReviewFilter = "all" | "unreviewed" | "reviewed" | "withUserNote" | "withStructure";
type ExpressionNpcFilter = WordNpcFilter;
type ExpressionSort = "newest" | "oldest" | "reviewAsc" | "reviewDesc";
type WordCardMode = "queue" | "detail";
type ReviewSessionLimit = 5 | 10 | "all";
type SavedPanelIntent = {
  type: "default" | "wordReview";
  token: number;
};

interface SavedItemsPanelProps {
  copy: UiCopy;
  items: SavedItem[];
  onDelete: (id: string) => void;
  onClose: () => void;
  savedPanelIntent?: SavedPanelIntent | null;
}

const LEVEL_LABELS: Record<string, string> = {
  casual: "カジュアル",
  neutral: "ていねい",
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
  "riku",
  "ren",
];

function toTimestamp(value?: string): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

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
    return value || "—";
  }

  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getSavedWordReadings(item: SavedWord): string[] {
  const source =
    item.readings?.length
      ? item.readings
      : item.reading
        ? [item.reading]
        : [];

  return Array.from(
    new Set(
      source
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(Boolean),
    ),
  ).slice(0, 3);
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
        case "riku":
          return "Riku";
        case "ren":
          return "Ren";
      }
    }

    return getNpcDisplayName(npcId);
  }

  return isEn ? "Kotomachi" : "言街";
}

function compareByReviewNeed(a: SavedWord, b: SavedWord): number {
  const aCount = a.reviewCount ?? 0;
  const bCount = b.reviewCount ?? 0;

  if (aCount === 0 && bCount > 0) return -1;
  if (aCount > 0 && bCount === 0) return 1;
  if (aCount !== bCount) return aCount - bCount;

  const reviewDelta = toTimestamp(a.lastReviewedAt) - toTimestamp(b.lastReviewedAt);
  if (reviewDelta !== 0) return reviewDelta;

  return toTimestamp(b.createdAt) - toTimestamp(a.createdAt);
}

function buildReviewQueue(words: SavedWord[], limit?: number): string[] {
  return words
    .slice()
    .sort(compareByReviewNeed)
    .slice(0, limit ?? words.length)
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

function sortExpressionItems(
  expressions: SavedExpression[],
  expressionSort: ExpressionSort
): SavedExpression[] {
  return expressions.slice().sort((a, b) => {
    const aCreatedAt = toTimestamp(a.createdAt);
    const bCreatedAt = toTimestamp(b.createdAt);
    const aReviewCount = a.reviewCount ?? 0;
    const bReviewCount = b.reviewCount ?? 0;

    switch (expressionSort) {
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

function hasStructureContent(item: SavedExpression): boolean {
  const structureNote = normalizeStructureNote(item.structureNote);
  return Boolean(
    structureNote?.pattern?.trim() ||
      structureNote?.explanation?.trim() ||
      structureNote?.examples?.some((example) => example.trim()),
  );
}

function getExpressionListReviewBadge(item: SavedExpression, isEn: boolean): string {
  const count = item.reviewCount ?? 0;
  if (count <= 0) {
    return isEn ? "Not reviewed" : "未复习";
  }

  if (isEn) {
    return count === 1 ? "Reviewed 1 time" : `Reviewed ${count} times`;
  }

  return `已复习 ${count} 次`;
}

function getExpressionReviewSummaryLabel(item: SavedExpression, isEn: boolean): string {
  return getExpressionListReviewBadge(item, isEn);
}

function getExpressionDetailLabels(isEn: boolean) {
  return isEn
    ? {
        detailTitle: "Expression card",
        backToSaved: "Back to saved items",
        original: "Original",
        suggestion: "Suggested expression",
        level: "Style",
        usage: "Best for",
        analysis: "Why this works",
        sharedChanges: "Things to fix first",
        revisionChanges: "Register-specific changes",
        structure: "Reusable pattern",
        structureBadge: "Structure note",
        originalPart: "Original part",
        revisedPart: "Improved",
        why: "Why this works",
        example: "Example",
        myNote: "My note",
        noNoteYet: "No note yet",
        saveNote: "Save",
        cancelEdit: "Reset",
        from: "From",
        saved: "Saved",
        lastReviewed: (value: string) => `Last reviewed: ${value}`,
        notePlaceholder: "Add a note about usage, tone, or context",
      }
    : {
        detailTitle: "收藏详情",
        backToSaved: "返回",
        original: "原句",
        suggestion: "建议表达",
        level: "档位",
        usage: "使用场景",
        analysis: "说明",
        sharedChanges: "需要先调整的地方",
        revisionChanges: "这一档的表达差异",
        structure: "表达结构",
        structureBadge: "表达结构",
        originalPart: "原句部分",
        revisedPart: "修改后",
        why: "为什么这样改",
        example: "例句",
        myNote: "我的笔记",
        noNoteYet: "还没有笔记",
        saveNote: "保存",
        cancelEdit: "取消",
        from: "收藏自",
        saved: "收藏时间",
        lastReviewed: (value: string) => `上次看过：${value}`,
        notePlaceholder: "写点备注...",
      };
}

function getExpressionLearningLabels(isEn: boolean) {
  return isEn
    ? {
        structureBadge: "Structure note",
        structure: "Reusable pattern",
        sharedChanges: "Things to fix first",
        revisionChanges: "Register-specific changes",
        usage: "Best for",
        originalPart: "Original part",
        revisedPart: "Improved",
        why: "Why this works",
        example: "Example",
      }
    : {
        structureBadge: "表达结构",
        structure: "表达结构",
        sharedChanges: "需要先调整的地方",
        revisionChanges: "这一档的表达差异",
        usage: "使用场景",
        originalPart: "原句部分",
        revisedPart: "修改后",
        why: "为什么这样改",
        example: "例句",
      };
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
        from: "From",
        saved: "Saved",
        lastReviewed: (value: string) => `Last reviewed: ${value}`,
        previous: "Previous",
        next: "Next",
        finishRound: "Finish round",
        markMastered: "Mark as mastered",
        mastered: "Mastered",
        undoMastered: "Undo",
        notePlaceholder:
          "Write your own understanding, such as how this word feels in this sentence.",
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
        from: "来自",
        saved: "保存于",
        lastReviewed: (value: string) => `上次看过：${value}`,
        previous: "上一个",
        next: "下一个",
        finishRound: "完成本轮",
        markMastered: "标记为已掌握",
        mastered: "已掌握",
        undoMastered: "撤销",
        notePlaceholder: "写一点你自己的理解，比如这个词在这句话里的感觉。",
      };
}

function hasActiveTextSelection(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.getSelection()?.toString().trim());
}

function renderSavedRevisionNoteCard(
  item: SavedExpression,
  note: NonNullable<ReturnType<typeof normalizeRevisionNotes>>[number],
  index: number,
  keyPrefix: string,
  uiLanguage: UiLanguage,
  labels: ReturnType<typeof getExpressionLearningLabels>
) {
  return (
    <div
      key={`${item.id}-${keyPrefix}-${index}`}
      className="rounded-xl bg-[#FAF6EE] px-3 py-2.5"
    >
      {note.originalPart && (
        <p className="break-words text-[11px] leading-relaxed text-[#4A4438] [overflow-wrap:anywhere]">
          <span className="font-medium text-[#7A7060]">{labels.originalPart}: </span>
          {note.originalPart}
        </p>
      )}
      {note.revisedPart && (
        <SelectableLookupText
          npcId={item.npcId}
          uiLanguage={uiLanguage}
          sourceText={note.revisedPart}
          className={note.originalPart ? "mt-1 block" : "block"}
        >
          <p className="break-words text-[11px] leading-relaxed text-[#4A4438] [overflow-wrap:anywhere]">
            <span className="font-medium text-[#7A7060]">{labels.revisedPart}: </span>
            {note.revisedPart}
          </p>
        </SelectableLookupText>
      )}
      <p className="mt-1 break-words text-[11px] leading-relaxed text-[#4A4438] [overflow-wrap:anywhere]">
        <span className="font-medium text-[#7A7060]">{labels.why}: </span>
        {note.explanation}
      </p>
    </div>
  );
}

function ExpressionCard({
  item,
  copy,
  isEn,
  uiLanguage,
  onDelete,
  onOpen,
}: {
  item: SavedExpression;
  copy: UiCopy;
  isEn: boolean;
  uiLanguage: UiLanguage;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const learningLabels = getExpressionLearningLabels(isEn);
  const structureNote = normalizeStructureNote(item.structureNote);
  const structureTitle = isEn ? "Structure" : "表达结构";
  const structureBadge = isEn ? "Structure note" : "有结构说明";
  const structureExampleLabel = isEn ? "Example" : "例";
  const reviewBadge = getExpressionListReviewBadge(item, isEn);
  const showSourceBadge = item.source && item.source !== "feedback";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (hasActiveTextSelection()) return;
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="relative cursor-pointer rounded-xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-4 py-3.5 transition-colors hover:bg-[#F7F1E6] focus:outline-none focus:ring-2 focus:ring-[#2D4A1F]/20"
      aria-label={isEn ? `Open expression card for ${item.suggestion}` : `打开 ${item.suggestion} 的表达卡片`}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        data-lookup-disabled="true"
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] text-[#7A7060]/40 transition-colors hover:bg-[#E8E0CE] hover:text-[#7A7060]"
        aria-label={copy.sidebar.savedDelete}
      >
        <TrashIcon size={10} />
        <span>{copy.sidebar.savedDelete}</span>
      </button>

      <SelectableLookupText
        npcId={item.npcId}
        uiLanguage={uiLanguage}
        sourceText={item.suggestion}
        className="pr-14"
      >
        <p className="text-[14px] font-semibold leading-[1.7] text-[#2D4A1F]">
          {item.suggestion}
        </p>
      </SelectableLookupText>

      {item.original && (
        <div className="mt-2.5 rounded-lg bg-[#F3EDE0] px-3 py-2">
          <span className="mb-0.5 block text-[8px] font-medium text-[#7A7060]/50">
            {copy.sidebar.savedOriginalLabel}
          </span>
          <SelectableLookupText
            npcId={item.npcId}
            uiLanguage={uiLanguage}
            sourceText={item.original}
          >
            <p className="line-clamp-2 text-[10px] leading-relaxed text-[#4A4438]/90">
              {item.original}
            </p>
          </SelectableLookupText>
        </div>
      )}

      {item.note && (
        <div className="mt-2 rounded-lg bg-[#F3EDE0]/60 px-3 py-2">
          <span className="mb-0.5 block text-[8px] font-medium text-[#7A7060]/50">
            {copy.sidebar.savedNoteLabel}
          </span>
          <p className="line-clamp-2 text-[10px] leading-relaxed text-[#4A4438]/88">
            {item.note}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center rounded-full bg-[#E8EFE4] px-2.5 py-0.5 text-[8px] font-medium text-[#2D4A1F]/80">
          {reviewBadge}
        </span>
        <span className="inline-block rounded-full bg-[#2D4A1F]/10 px-2.5 py-0.5 text-[8px] font-medium text-[#2D4A1F]/70">
          {copy.sidebar.savedExpressionBadge}
        </span>
        <span className="inline-block rounded-full bg-[#C9A84C]/12 px-2.5 py-0.5 text-[8px] font-medium text-[#8B7430]/75">
          {item.levelLabel ?? LEVEL_LABELS[item.level] ?? item.level}
        </span>
        {showSourceBadge && item.source === "summary_card" && (
          <span className="inline-block rounded-full bg-[#7A7060]/8 px-2.5 py-0.5 text-[8px] font-medium text-[#7A7060]/55">
            {copy.sidebar.savedBadgeSummary}
          </span>
        )}
        {structureNote && (
          <span className="inline-block rounded-full bg-[#E8E0CE]/65 px-2.5 py-0.5 text-[8px] font-medium text-[#6D624F]">
            {learningLabels.structureBadge}
          </span>
        )}
      </div>
    </div>
  );
}

function ExpressionDetailCard({
  item,
  isEn,
  uiLanguage,
  onBack,
  onSaveNote,
}: {
  item: SavedExpression;
  isEn: boolean;
  uiLanguage: UiLanguage;
  onBack: () => void;
  onSaveNote: (expressionId: string, note: string) => void;
}) {
  const labels = getExpressionDetailLabels(isEn);
  const learningLabels = getExpressionLearningLabels(isEn);
  const locale = isEn ? "en-US" : "zh-CN";
  const structureNote = normalizeStructureNote(item.structureNote);
  const sharedRevisionNotes = normalizeRevisionNotes(item.sharedRevisionNotes);
  const revisionNotes = normalizeRevisionNotes(item.revisionNotes);
  const userNote = item.userNote?.trim() ?? "";
  const reviewSummary = getExpressionReviewSummaryLabel(item, isEn);
  const lastReviewedText = item.lastReviewedAt
    ? labels.lastReviewed(formatReviewDate(item.lastReviewedAt, locale))
    : null;
  const npcLabel = getWordReviewNpcLabel(item.npcId, isEn);
  const [draftNote, setDraftNote] = useState(userNote);

  useEffect(() => {
    // 切换表达详情时重置输入框，避免把上一张卡片的草稿带过来。
    setDraftNote(item.userNote ?? "");
  }, [item.id, item.userNote]);

  const handleSaveNote = () => {
    onSaveNote(item.id, draftNote);
    setDraftNote(draftNote.trim());
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

        <h3 className="ml-auto text-right font-ui text-sm font-semibold text-[#2D4A1F]">
          {labels.detailTitle}
        </h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] p-4 sm:p-5">
        <div className="border-b border-[rgba(40,35,26,0.08)] pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.suggestion}
              </p>
              <SelectableLookupText
                npcId={item.npcId}
                uiLanguage={uiLanguage}
                sourceText={item.suggestion}
              >
                <p className="font-ja break-words text-[22px] font-semibold leading-tight text-[#2D4A1F] sm:text-[26px]">
                  {item.suggestion}
                </p>
              </SelectableLookupText>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <span className="inline-flex items-center rounded-full bg-[#E8EFE4] px-3 py-1 text-[10px] font-medium text-[#2D4A1F]/80">
                {reviewSummary}
              </span>
              <span className="inline-flex items-center rounded-full bg-[#C9A84C]/12 px-3 py-1 text-[10px] font-medium text-[#8B7430]/80">
                {item.levelLabel ?? LEVEL_LABELS[item.level] ?? item.level}
              </span>
              {hasStructureContent(item) && (
                <span className="inline-flex items-center rounded-full bg-[#E8E0CE] px-3 py-1 text-[10px] font-medium text-[#6D624F]">
                  {labels.structureBadge}
                </span>
              )}
            </div>
          </div>

          {lastReviewedText && (
            <p className="mt-3 text-[11px] leading-relaxed text-[#7A7060]">{lastReviewedText}</p>
          )}
        </div>

        <div className="mt-4 space-y-4">
          <div className="rounded-2xl bg-[#F3EDE0] p-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
              {labels.original}
            </p>
            <SelectableLookupText
              npcId={item.npcId}
              uiLanguage={uiLanguage}
              sourceText={item.original}
            >
              <p className="mt-1 text-[13px] leading-relaxed text-[#3B352C]">{item.original}</p>
            </SelectableLookupText>
          </div>

          {item.usage && (
            <div className="rounded-2xl bg-[#F7F2E8] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {learningLabels.usage}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#3B352C]">{item.usage}</p>
            </div>
          )}

          {item.note && (
            <div className="rounded-2xl bg-[#F7F2E8] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.analysis}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#3B352C]">{item.note}</p>
            </div>
          )}

          {sharedRevisionNotes?.length ? (
            <div className="rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FCF8F0] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {learningLabels.sharedChanges}
              </p>
              <div className="mt-2 space-y-2">
                {sharedRevisionNotes.map((note, index) =>
                  renderSavedRevisionNoteCard(item, note, index, "shared", uiLanguage, learningLabels)
                )}
              </div>
            </div>
          ) : null}

          {revisionNotes?.length ? (
            <div className="rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FCF8F0] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {learningLabels.revisionChanges}
              </p>
              <div className="mt-2 space-y-2">
                {revisionNotes.map((note, index) =>
                  renderSavedRevisionNoteCard(item, note, index, "level", uiLanguage, learningLabels)
                )}
              </div>
            </div>
          ) : null}

          {structureNote && (
            <div className="rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FCF8F0] p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {learningLabels.structure}
              </p>
              {structureNote.pattern && (
                <SelectableLookupText
                  npcId={item.npcId}
                  uiLanguage={uiLanguage}
                  sourceText={structureNote.pattern}
                >
                  <p className="mt-1 font-ja break-words text-[13px] font-medium leading-relaxed text-[#2D4A1F] [overflow-wrap:anywhere]">
                    {structureNote.pattern}
                  </p>
                </SelectableLookupText>
              )}
              {structureNote.explanation && (
                <p className="mt-2 text-[12px] leading-relaxed text-[#4A4438]/88 [overflow-wrap:anywhere]">
                  {structureNote.explanation}
                </p>
              )}
              {structureNote.examples?.map((example, index) => (
                <SelectableLookupText
                  key={`${item.id}-detail-structure-example-${index}`}
                  npcId={item.npcId}
                  uiLanguage={uiLanguage}
                  sourceText={example}
                >
                  <p className="mt-2 text-[11px] leading-relaxed text-[#7A7060] [overflow-wrap:anywhere]">
                    {learningLabels.example}: {example}
                  </p>
                </SelectableLookupText>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#F7F2E8] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.myNote}
              </p>
              {!userNote && (
                <span className="text-[10px] text-[#7A7060]/80">{labels.noNoteYet}</span>
              )}
            </div>
            <textarea
              value={draftNote}
              onChange={(event) => setDraftNote(event.target.value)}
              rows={4}
              placeholder={labels.notePlaceholder}
              data-lookup-disabled="true"
              className="mt-3 w-full rounded-xl border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-3 py-2.5 text-[12px] leading-relaxed text-[#3B352C] outline-none transition focus:border-[#2D4A1F]/30 focus:ring-2 focus:ring-[#2D4A1F]/10"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveNote}
                data-lookup-disabled="true"
                className="rounded-full bg-[#2D4A1F] px-4 py-2 text-[11px] font-medium text-[#F3EDE0] transition-colors hover:bg-[#243A19]"
              >
                {labels.saveNote}
              </button>
              <button
                type="button"
                onClick={() => setDraftNote(userNote)}
                data-lookup-disabled="true"
                className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
              >
                {labels.cancelEdit}
              </button>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl bg-[#F3EDE0] p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.level}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4A4438]">
                {LEVEL_LABELS[item.level] ?? item.level}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.from}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4A4438]">{npcLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.saved}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4A4438]">
                {formatSavedTime(item.createdAt, locale)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {isEn ? "Source type" : "来源类型"}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4A4438]">
                {item.source === "summary_card"
                  ? (isEn ? "Summary card" : "总结卡片")
                  : (isEn ? "Expression hint" : "表达提示")}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
        >
          {labels.backToSaved}
        </button>
      </div>
    </div>
  );
}

function WordCard({
  item,
  copy,
  isEn,
  uiLanguage,
  onDelete,
  onOpen,
}: {
  item: SavedWord;
  copy: UiCopy;
  isEn: boolean;
  uiLanguage: UiLanguage;
  onDelete: () => void;
  onOpen: () => void;
}) {
  const reviewBadge = getWordListReviewBadge(item, isEn);
  const hasNote = Boolean(item.note?.trim());
  const isMastered = Boolean(item.masteredAt);
  const readings = getSavedWordReadings(item);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (hasActiveTextSelection()) return;
        onOpen();
      }}
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
        data-lookup-disabled="true"
        className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[8px] text-[#7A7060]/40 transition-colors hover:bg-[#E8E0CE] hover:text-[#7A7060]"
        aria-label={copy.sidebar.savedDelete}
      >
        <TrashIcon size={10} />
        <span>{copy.sidebar.savedDelete}</span>
      </button>

      <div className="pr-14">
        <SelectableLookupText
          npcId={item.npcId}
          uiLanguage={uiLanguage}
          sourceText={item.example || item.word}
        >
          <div className="flex flex-wrap items-baseline gap-2.5">
            <p className="text-[14px] font-semibold leading-relaxed text-[#2D4A1F]">
              {item.word}
            </p>
            {readings.length > 0 && (
              <p className="text-[10px] leading-relaxed text-[#5E5648]/88">{readings.join(" / ")}</p>
            )}
          </div>
        </SelectableLookupText>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 pr-2">
          <span className="inline-flex items-center rounded-full bg-[#E8EFE4] px-2.5 py-0.5 text-[8px] font-medium text-[#2D4A1F]/80">
            {reviewBadge}
          </span>
          {hasNote && (
            <span className="inline-flex items-center rounded-full bg-[#F3EDE0] px-2.5 py-0.5 text-[8px] font-medium text-[#6D624F]">
              {isEn ? "Has note" : "有笔记"}
            </span>
          )}
          {isMastered && (
            <span className="inline-flex items-center rounded-full bg-[#E8E0CE] px-2.5 py-0.5 text-[8px] font-medium text-[#6D624F]">
              {isEn ? "Mastered" : "已掌握"}
            </span>
          )}
        </div>
      </div>

      {item.meaning && (
        <p className="mt-2 text-[11px] leading-relaxed text-[#3B352C]">{item.meaning}</p>
      )}

      {item.example && (
        <SelectableLookupText
          npcId={item.npcId}
          uiLanguage={uiLanguage}
          sourceText={item.example}
          className="mt-1.5"
        >
          <p className="line-clamp-2 text-[9px] italic leading-relaxed text-[#6B6254]/82">
            {item.example}
          </p>
        </SelectableLookupText>
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
  onToggleMastered,
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
  onToggleMastered: (wordId: string, mastered: boolean) => void;
}) {
  const labels = getWordCardLabels(isEn);
  const hasPrevious = mode === "queue" ? (index ?? 0) > 0 : false;
  const locale = isEn ? "en-US" : "zh-CN";
  const npcLabel = getWordReviewNpcLabel(item.npcId, isEn);
  const nuanceExplanation = item.nuanceExplanation?.trim();
  const sentenceMeaning = item.sentenceMeaning?.trim();
  const sourceSentence = item.example?.trim();
  const note = item.note?.trim() ?? "";
  const readings = getSavedWordReadings(item);
  const hasDetailedNote = Boolean(nuanceExplanation || sentenceMeaning);
  const reviewSummary = getWordReviewSummaryLabel(item, isEn);
  const lastReviewedText = item.lastReviewedAt
    ? labels.lastReviewed(formatReviewDate(item.lastReviewedAt, locale))
    : null;
  const isMastered = Boolean(item.masteredAt);
  const masteredActionLabel = isMastered
    ? (isEn ? "Undo mastered" : "撤销已掌握")
    : labels.markMastered;
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [draftNote, setDraftNote] = useState(note);

  useEffect(() => {
    // 切到另一张词卡，或外部保存后回写时，重置编辑状态，避免把草稿串到别的词。
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

  const handleToggleMastered = () => {
    onToggleMastered(item.id, !isMastered);
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
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              <span className="inline-flex items-center rounded-full bg-[#2D4A1F]/10 px-3 py-1 text-[10px] font-medium text-[#2D4A1F]/80">
                {reviewSummary}
              </span>
              <button
                type="button"
                onClick={handleToggleMastered}
                className={`rounded-full border px-3 py-1 text-[10px] font-medium transition-colors ${
                  isMastered
                    ? "border-[#D6C9AE] bg-[#E8E0CE] text-[#6D624F] hover:bg-[#E2D8C2] hover:text-[#5A5144]"
                    : "border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] text-[#4A4438] hover:bg-[#E8E0CE] hover:text-[#28231A]"
                }`}
              >
                {masteredActionLabel}
              </button>
            </div>
          </div>
          {lastReviewedText && (
            <p className="mt-2 text-[11px] leading-relaxed text-[#7A7060]">{lastReviewedText}</p>
          )}
        </div>

        <div className="mt-4 grid gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
              {labels.reading}
            </p>
            <p className="font-ja mt-1 break-words text-[14px] leading-relaxed text-[#28231A]">
              {readings.join(" / ") || "—"}
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
                    className={
                      nuanceExplanation ? "mt-3 border-t border-[rgba(40,35,26,0.08)] pt-3" : ""
                    }
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
                  <p className="break-words text-[13px] leading-relaxed text-[#4A4438]">{note}</p>
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
                  <p className="text-[12px] leading-relaxed text-[#7A7060]">{labels.noNoteYet}</p>
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
              <p className="mt-1 text-[13px] leading-relaxed text-[#4A4438]">{npcLabel}</p>
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#7A7060]">
                {labels.saved}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#4A4438]">
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
            className="rounded-full border border-[rgba(40,35,26,0.1)] bg-[#F3EDE0] px-4 py-2 text-[11px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A] disabled:cursor-not-allowed disabled:opacity-45"
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
  savedPanelIntent,
}: SavedItemsPanelProps) {
  const isEn = copy.summary.title === "Review Card";
  const lookupUiLanguage: UiLanguage = isEn ? "en" : "zh";
  const reviewFiveLabel = isEn ? "Review 5" : "看 5 个";
  const reviewTenLabel = isEn ? "Review 10" : "看 10 个";
  const backToChatLabel = isEn ? "← Back to chat" : "← 返回聊天";
  const reviewEntryLabel = isEn ? "Review words" : "复习单词";
  const savedWordsEmptyLabel = isEn
    ? "No saved words yet. Select a word during chat and save it after looking it up."
    : "还没有保存的单词。聊天时划词查词后，可以把想复习的词保存下来。";
  const noFilteredWordsLabel = isEn
    ? "No words match these filters. Try another filter."
    : "没有符合条件的词。可以换一个筛选条件看看。";
  const noFilteredExpressionsLabel = isEn
    ? "No saved expressions match this filter yet."
    : "这里暂时没有符合条件的表达。";
  const expressionCountLabel = (shownCount: number, totalExpressionCount: number) =>
    isEn
      ? `Showing ${shownCount} / ${totalExpressionCount} expressions`
      : `显示 ${shownCount} / ${totalExpressionCount} 个表达`;
  const wordCountLabel = (shownCount: number, totalWordCount: number) =>
    isEn
      ? `Showing ${shownCount} / ${totalWordCount} words`
      : `显示 ${shownCount} / ${totalWordCount} 个词语`;
  const npcFilterLabel = isEn ? "Person in town" : "街区里的人";
  const sortLabel = isEn ? "Sort" : "排序";
  const savedFilterCountClass = "text-[9px] text-[#7A7060]/70";
  const savedFilterChipRowClass = "flex flex-wrap gap-2";
  const savedFilterChipClass =
    "whitespace-nowrap rounded-full px-3 py-1 text-[9px] font-medium transition-colors";
  const savedFilterGridClass = "grid gap-2 sm:grid-cols-2";
  const savedFilterLabelClass = "flex min-w-0 flex-col gap-1 text-[9px] font-medium text-[#7A7060]";
  const savedFilterSelectClass =
    "w-full rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-3 py-1.5 text-[10px] text-[#4A4438] outline-none transition focus:border-[#2D4A1F]/30 focus:ring-2 focus:ring-[#2D4A1F]/10";
  const allMasteredWordsLabel = isEn
    ? "All saved words are marked as mastered. You can view them with the Mastered filter or undo the tag to review them again."
    : "这些词都已经标记为已掌握。可以在「已掌握」筛选里查看，也可以撤销后再复习。";

  const [panelItems, setPanelItems] = useState<SavedItem[]>(items);
  const [filter, setFilter] = useState<FilterType>("all");
  const [expressionReviewFilter, setExpressionReviewFilter] =
    useState<ExpressionReviewFilter>("all");
  const [expressionNpcFilter, setExpressionNpcFilter] = useState<ExpressionNpcFilter>("all");
  const [expressionSort, setExpressionSort] = useState<ExpressionSort>("newest");
  const [selectedExpressionId, setSelectedExpressionId] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [isWordReviewMode, setIsWordReviewMode] = useState(false);
  const [reviewQueueIds, setReviewQueueIds] = useState<string[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewComplete, setReviewComplete] = useState(false);
  const [reviewedInSession, setReviewedInSession] = useState<string[]>([]);
  const [reviewSessionWords, setReviewSessionWords] = useState<SavedWord[]>([]);
  const [reviewSessionLimit, setReviewSessionLimit] = useState<ReviewSessionLimit>(10);
  const [reviewSessionAvailableCount, setReviewSessionAvailableCount] = useState(0);
  const [reviewSessionStartMeta, setReviewSessionStartMeta] = useState<
    Record<string, { reviewCount: number }>
  >({});
  const [isReviewEntryOpen, setIsReviewEntryOpen] = useState(false);
  const [wordReviewFilter, setWordReviewFilter] = useState<WordReviewFilter>("all");
  const [wordNpcFilter, setWordNpcFilter] = useState<WordNpcFilter>("all");
  const [wordSort, setWordSort] = useState<WordSort>("newest");
  const openingExpressionIdRef = useRef<string | null>(null);
  const openingWordIdRef = useRef<string | null>(null);
  const reviewEntryRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setPanelItems(items);
  }, [items]);

  useEffect(() => {
    if (!selectedExpressionId) {
      openingExpressionIdRef.current = null;
      return;
    }

    const stillExists = panelItems.some(
      (item) => item.type === "expression" && item.id === selectedExpressionId
    );
    if (!stillExists) {
      setSelectedExpressionId(null);
      openingExpressionIdRef.current = null;
    }
  }, [panelItems, selectedExpressionId]);

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

  useEffect(() => {
    if (filter !== "word") {
      setIsReviewEntryOpen(false);
    }
  }, [filter]);

  useEffect(() => {
    if (!isReviewEntryOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (reviewEntryRef.current?.contains(target)) {
        return;
      }

      setIsReviewEntryOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isReviewEntryOpen]);

  const allExpressionItems = useMemo(
    () => panelItems.filter((item): item is SavedExpression => item.type === "expression"),
    [panelItems]
  );
  const allWordItems = useMemo(
    () => panelItems.filter((item): item is SavedWord => item.type === "word"),
    [panelItems]
  );
  const expressionCount = allExpressionItems.length;
  const reviewableWords = useMemo(
    () => allWordItems.filter((item) => !item.masteredAt),
    [allWordItems]
  );
  const wordCount = allWordItems.length;
  const reviewableWordCount = reviewableWords.length;
  const isReviewUnavailable = wordCount > 0 && reviewableWordCount === 0;
  const reviewableCountLabel = isEn
    ? `${reviewableWordCount} to review`
    : `待复习 ${reviewableWordCount}`;
  const reviewAllCountLabel = isEn
    ? `All to review · ${reviewableWordCount}`
    : `全部待复习 ${reviewableWordCount} 个`;
  const masteredHintLabel = isEn
    ? `${wordCount - reviewableWordCount} mastered words will not appear by default`
    : `已掌握 ${wordCount - reviewableWordCount} 个，不会默认进入复习`;
  const totalCount = expressionCount + wordCount;
  const savedPanelIntentToken = savedPanelIntent?.token ?? null;
  const savedPanelIntentType = savedPanelIntent?.type ?? null;

  const filteredWordItems = useMemo(() => {
    let nextWords = allWordItems.slice();

    if (wordReviewFilter === "unreviewed") {
      nextWords = nextWords.filter((item) => !item.masteredAt && (item.reviewCount ?? 0) <= 0);
    } else if (wordReviewFilter === "reviewed") {
      nextWords = nextWords.filter((item) => !item.masteredAt && (item.reviewCount ?? 0) > 0);
    } else if (wordReviewFilter === "withNotes") {
      nextWords = nextWords.filter((item) => Boolean(item.note?.trim()));
    } else if (wordReviewFilter === "mastered") {
      nextWords = nextWords.filter((item) => Boolean(item.masteredAt));
    }

    if (wordNpcFilter !== "all") {
      nextWords = nextWords.filter((item) => item.npcId === wordNpcFilter);
    }

    return sortWordItems(nextWords, wordSort);
  }, [allWordItems, wordNpcFilter, wordReviewFilter, wordSort]);

  const filteredExpressionItems = useMemo(() => {
    let nextExpressions = allExpressionItems.slice();

    if (expressionReviewFilter === "unreviewed") {
      nextExpressions = nextExpressions.filter((item) => (item.reviewCount ?? 0) <= 0);
    } else if (expressionReviewFilter === "reviewed") {
      nextExpressions = nextExpressions.filter((item) => (item.reviewCount ?? 0) > 0);
    } else if (expressionReviewFilter === "withUserNote") {
      nextExpressions = nextExpressions.filter((item) => Boolean(item.userNote?.trim()));
    } else if (expressionReviewFilter === "withStructure") {
      nextExpressions = nextExpressions.filter((item) => hasStructureContent(item));
    }

    if (expressionNpcFilter !== "all") {
      nextExpressions = nextExpressions.filter((item) => item.npcId === expressionNpcFilter);
    }

    return sortExpressionItems(nextExpressions, expressionSort);
  }, [allExpressionItems, expressionNpcFilter, expressionReviewFilter, expressionSort]);

  const listItems = useMemo(() => {
    if (filter === "all") return panelItems;
    if (filter === "expression") return filteredExpressionItems;
    return filteredWordItems;
  }, [filter, filteredExpressionItems, filteredWordItems, panelItems]);

  const selectedExpression = useMemo(
    () => allExpressionItems.find((item) => item.id === selectedExpressionId) ?? null,
    [allExpressionItems, selectedExpressionId]
  );

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
      remainingCount: Math.max(0, reviewSessionAvailableCount - reviewQueueIds.length),
    };
  }, [reviewQueueIds.length, reviewSessionAvailableCount, reviewSessionStartMeta, reviewedInSession, reviewWordsById]);

  const safeReviewIndex =
    reviewQueueIds.length === 0 ? 0 : Math.min(reviewIndex, reviewQueueIds.length - 1);
  const currentReviewWord = reviewWordsById.get(reviewQueueIds[safeReviewIndex] ?? "") ?? null;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: copy.sidebar.savedAll, count: totalCount },
    { key: "expression", label: copy.sidebar.savedExpressions, count: expressionCount },
    { key: "word", label: copy.sidebar.savedWords, count: wordCount },
  ];
  const wordFilters: { key: WordReviewFilter; label: string }[] = [
    { key: "all", label: isEn ? "All" : "全部" },
    { key: "unreviewed", label: isEn ? "Unreviewed" : "未复习" },
    { key: "reviewed", label: isEn ? "Reviewed" : "已复习" },
    { key: "withNotes", label: isEn ? "With notes" : "有笔记" },
    { key: "mastered", label: isEn ? "Mastered" : "已掌握" },
  ];
  const expressionFilters: { key: ExpressionReviewFilter; label: string }[] = [
    { key: "all", label: isEn ? "All" : "全部" },
    { key: "unreviewed", label: isEn ? "Unreviewed" : "未复习" },
    { key: "reviewed", label: isEn ? "Reviewed" : "已复习" },
    { key: "withUserNote", label: isEn ? "With notes" : "有笔记" },
    { key: "withStructure", label: isEn ? "With structure" : "有结构说明" },
  ];
  const expressionSortOptions: { value: ExpressionSort; label: string }[] = [
    { value: "newest", label: isEn ? "Newest saved" : "最近保存" },
    { value: "oldest", label: isEn ? "Oldest saved" : "最早保存" },
    { value: "reviewAsc", label: isEn ? "Fewest reviews" : "复习次数少到多" },
    { value: "reviewDesc", label: isEn ? "Most reviews" : "复习次数多到少" },
  ];
  const wordSortOptions: { value: WordSort; label: string }[] = [
    { value: "newest", label: isEn ? "Newest saved" : "最近保存" },
    { value: "oldest", label: isEn ? "Oldest saved" : "最早保存" },
    { value: "reviewAsc", label: isEn ? "Fewest reviews" : "复习次数少到多" },
    { value: "reviewDesc", label: isEn ? "Most reviews" : "复习次数多到少" },
  ];

  const npcOptions = useMemo(
    () => [
      {
        value: "all" as const,
        label: isEn ? "Across town" : "整个街区",
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
    setReviewSessionAvailableCount(0);
    setReviewSessionStartMeta({});
  };

  useEffect(() => {
    if (!savedPanelIntentToken) {
      return;
    }

    openingExpressionIdRef.current = null;
    setSelectedExpressionId(null);
    openingWordIdRef.current = null;
    setSelectedWordId(null);
    setIsWordReviewMode(false);
    resetReviewState();

    if (savedPanelIntentType === "wordReview") {
      setFilter("word");
      setIsReviewEntryOpen(wordCount > 0);
      return;
    }

    setFilter("all");
    setIsReviewEntryOpen(false);
  }, [savedPanelIntentToken, savedPanelIntentType, wordCount]);

  const handleEnterWordReview = (limit: ReviewSessionLimit) => {
    if (reviewableWords.length === 0) return;

    // Smart review should look at the full saved-word pool, not the currently filtered list.
    const queueSize =
      limit === "all" ? reviewableWords.length : Math.min(limit, reviewableWords.length);
    const nextQueueIds = buildReviewQueue(reviewableWords, queueSize);
    const nextSessionWords = nextQueueIds
      .map((wordId) => reviewableWords.find((item) => item.id === wordId) ?? null)
      .filter((item): item is SavedWord => item !== null);

    setSelectedWordId(null);
    openingWordIdRef.current = null;
    setReviewSessionLimit(limit);
    // Keep the session's total pool stable so the completion summary can say how many are left.
    setReviewSessionAvailableCount(reviewableWords.length);
    setReviewSessionWords(nextSessionWords);
    setReviewSessionStartMeta(buildReviewSessionStartMeta(nextSessionWords));
    setReviewQueueIds(nextQueueIds);
    setReviewIndex(0);
    setReviewComplete(false);
    setReviewedInSession([]);
    setIsWordReviewMode(true);
    setIsReviewEntryOpen(false);
  };

  const handleExitWordReview = () => {
    setIsWordReviewMode(false);
    setIsReviewEntryOpen(false);
    resetReviewState();
  };

  const handleBackToSavedItems = () => {
    openingExpressionIdRef.current = null;
    setSelectedExpressionId(null);
    openingWordIdRef.current = null;
    setSelectedWordId(null);
    setIsReviewEntryOpen(false);
  };

  const handleOpenExpressionCard = (expressionId: string) => {
    // Treat one list-open action as a single review so fast double clicks do not double count.
    if (openingExpressionIdRef.current === expressionId || selectedExpressionId === expressionId) {
      return;
    }

    openingExpressionIdRef.current = expressionId;

    const updatedItems = markSavedExpressionReviewed(expressionId);

    setPanelItems(updatedItems);
    setSelectedWordId(null);
    openingWordIdRef.current = null;
    setSelectedExpressionId(expressionId);
    setIsReviewEntryOpen(false);
  };

  const handleOpenWordCard = (wordId: string) => {
    // Treat one list-open action as a single review so fast double clicks do not double count.
    if (openingWordIdRef.current === wordId || selectedWordId === wordId) {
      return;
    }

    openingWordIdRef.current = wordId;

    const updatedItems = markSavedWordReviewed(wordId);
    const updatedWords = updatedItems.filter((item): item is SavedWord => item.type === "word");

    setPanelItems(updatedItems);
    setSelectedExpressionId(null);
    openingExpressionIdRef.current = null;
    setSelectedWordId(wordId);
    setReviewSessionWords(updatedWords);
    setIsReviewEntryOpen(false);
  };

  const handleSaveExpressionNote = (expressionId: string, note: string) => {
    const updatedItems = updateSavedExpressionUserNote(expressionId, note);

    // 表达详情和列表都基于 panelItems，保存后这里统一回写。
    setPanelItems(updatedItems);
  };

  const handleSaveWordNote = (wordId: string, note: string) => {
    const updatedItems = updateSavedWordNote(wordId, note);
    const updatedWords = updatedItems.filter((item): item is SavedWord => item.type === "word");

    // 本地 panel 状态和 review/detail 视图都基于这份数据，这样保存后能立刻看到最新 badge 和 note。
    setPanelItems(updatedItems);
    setReviewSessionWords(updatedWords);
  };

  const handleToggleWordMastered = (wordId: string, mastered: boolean) => {
    const updatedItems = updateSavedWordMastered(wordId, mastered);
    const updatedWords = updatedItems.filter((item): item is SavedWord => item.type === "word");

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
    if (reviewableWords.length === 0) {
      setReviewComplete(false);
      return;
    }

    handleEnterWordReview(reviewSessionLimit);
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
            ×
          </button>

          <h2 className="font-ui mt-1 text-sm font-semibold text-[#2D4A1F]">
            {copy.sidebar.savedTitle}
          </h2>
          {totalCount > 0 && (
            <p className="mt-1 text-[9px] text-[#7A7060]/55">{copy.sidebar.savedCount(totalCount)}</p>
          )}
        </header>

        {!isWordReviewMode && !selectedWord && !selectedExpression && (
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
                        className={`ml-1 ${filter === filterItem.key ? "opacity-70" : "opacity-50"}`}
                      >
                        {filterItem.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {wordCount > 0 && (
                <div ref={reviewEntryRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsReviewEntryOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-full border border-[rgba(40,35,26,0.1)] bg-[#FAF6EE] px-3.5 py-1.5 text-[9px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                    aria-expanded={isReviewEntryOpen}
                    aria-haspopup="dialog"
                  >
                    <span>{reviewEntryLabel}</span>
                    <span className="inline-flex items-center rounded-full bg-[#E8EFE4] px-2 py-0.5 text-[8px] font-medium text-[#2D4A1F]/80">
                      {reviewableCountLabel}
                    </span>
                  </button>

                  {isReviewEntryOpen && (
                    <div className="absolute right-0 top-full z-30 mt-3 w-[min(20rem,calc(100vw-3rem))] max-w-[calc(100vw-2.5rem)] rounded-2xl border border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] p-3 shadow-[0_8px_24px_rgba(40,35,26,0.08)] sm:w-[min(20rem,calc(100vw-5rem))] sm:max-w-[calc(100vw-5rem)]">
                      {isReviewUnavailable ? (
                        <p className="text-[10px] leading-relaxed text-[#7A7060]">
                          {allMasteredWordsLabel}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => handleEnterWordReview(5)}
                            className="flex w-full items-center justify-between rounded-xl bg-[#F7F2E8] px-3 py-2 text-left text-[10px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                          >
                            <span>{reviewFiveLabel}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEnterWordReview(10)}
                            className="flex w-full items-center justify-between rounded-xl bg-[#F7F2E8] px-3 py-2 text-left text-[10px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                          >
                            <span>{reviewTenLabel}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEnterWordReview("all")}
                            className="flex w-full items-center justify-between rounded-xl bg-[#F7F2E8] px-3 py-2 text-left text-[10px] font-medium text-[#4A4438] transition-colors hover:bg-[#E8E0CE] hover:text-[#28231A]"
                          >
                            <span>{reviewAllCountLabel}</span>
                          </button>
                          {wordCount > reviewableWordCount && (
                            <p className="pt-1 text-[9px] leading-relaxed text-[#7A7060]">
                              {masteredHintLabel}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {filter === "word" && wordCount > 0 && (
              <div className="mt-2 space-y-2.5">
                <p className={savedFilterCountClass}>
                  {wordCountLabel(filteredWordItems.length, wordCount)}
                </p>

                <div className={savedFilterChipRowClass}>
                  {wordFilters.map((filterItem) => (
                    <button
                      key={filterItem.key}
                      type="button"
                      onClick={() => setWordReviewFilter(filterItem.key)}
                      className={`${savedFilterChipClass} ${
                        wordReviewFilter === filterItem.key
                          ? "bg-[#2D4A1F] text-[#F3EDE0] shadow-sm"
                          : "bg-[#E8E0CE]/60 text-[#7A7060] hover:bg-[#E8E0CE]"
                      }`}
                    >
                      {filterItem.label}
                    </button>
                  ))}
                </div>

                <div className={savedFilterGridClass}>
                  <label className={savedFilterLabelClass}>
                    <span>{npcFilterLabel}</span>
                    <select
                      value={wordNpcFilter}
                      onChange={(event) => setWordNpcFilter(event.target.value as WordNpcFilter)}
                      className={savedFilterSelectClass}
                    >
                      {npcOptions.map((option) => (
                        <option key={`word-npc-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={savedFilterLabelClass}>
                    <span>{sortLabel}</span>
                    <select
                      value={wordSort}
                      onChange={(event) => setWordSort(event.target.value as WordSort)}
                      className={savedFilterSelectClass}
                    >
                      {wordSortOptions.map((option) => (
                        <option key={`word-sort-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            )}

            {filter === "expression" && (
              <div className="mt-2 space-y-2.5">
                <p className={savedFilterCountClass}>
                  {expressionCountLabel(filteredExpressionItems.length, expressionCount)}
                </p>

                <div className={savedFilterChipRowClass}>
                  {expressionFilters.map((filterItem) => (
                    <button
                      key={filterItem.key}
                      type="button"
                      onClick={() => setExpressionReviewFilter(filterItem.key)}
                      className={`${savedFilterChipClass} ${
                        expressionReviewFilter === filterItem.key
                          ? "bg-[#2D4A1F] text-[#F3EDE0] shadow-sm"
                          : "bg-[#E8E0CE]/60 text-[#7A7060] hover:bg-[#E8E0CE]"
                      }`}
                    >
                      {filterItem.label}
                    </button>
                  ))}
                </div>

                <div className={savedFilterGridClass}>
                  <label className={savedFilterLabelClass}>
                    <span>{npcFilterLabel}</span>
                    <select
                      value={expressionNpcFilter}
                      onChange={(event) =>
                        setExpressionNpcFilter(event.target.value as ExpressionNpcFilter)
                      }
                      className={savedFilterSelectClass}
                    >
                      {npcOptions.map((option) => (
                        <option key={`expression-npc-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={savedFilterLabelClass}>
                    <span>{sortLabel}</span>
                    <select
                      value={expressionSort}
                      onChange={(event) =>
                        setExpressionSort(event.target.value as ExpressionSort)
                      }
                      className={savedFilterSelectClass}
                    >
                      {expressionSortOptions.map((option) => (
                        <option key={`expression-sort-${option.value}`} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

              </div>
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
                remainingCount={reviewCompletionSummary.remainingCount}
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
                onToggleMastered={handleToggleWordMastered}
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
                  {reviewableWordCount === 0 ? allMasteredWordsLabel : savedWordsEmptyLabel}
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
              onToggleMastered={handleToggleWordMastered}
            />
          ) : selectedExpression ? (
            <ExpressionDetailCard
              item={selectedExpression}
              isEn={isEn}
              uiLanguage={lookupUiLanguage}
              onBack={handleBackToSavedItems}
              onSaveNote={handleSaveExpressionNote}
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
                      uiLanguage={lookupUiLanguage}
                      onDelete={() => onDelete(item.id)}
                      onOpen={() => handleOpenWordCard(item.id)}
                    />
                  );
                })}
              </div>
            )
          ) : filter === "expression" ? (
            listItems.length === 0 ? (
              <p className="py-12 text-center text-[10px] leading-relaxed text-[#7A7060]/50">
                {noFilteredExpressionsLabel}
              </p>
            ) : (
              <div className="space-y-3.5">
                {listItems.map((item) => {
                  if (item.type !== "expression") return null;

                  return (
                    <ExpressionCard
                      key={item.id}
                      item={item}
                      copy={copy}
                      isEn={isEn}
                      uiLanguage={lookupUiLanguage}
                      onDelete={() => onDelete(item.id)}
                      onOpen={() => handleOpenExpressionCard(item.id)}
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
                      isEn={isEn}
                      uiLanguage={lookupUiLanguage}
                      onDelete={() => onDelete(item.id)}
                      onOpen={() => handleOpenExpressionCard(item.id)}
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
                      uiLanguage={lookupUiLanguage}
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
