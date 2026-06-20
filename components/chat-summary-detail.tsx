import type { SessionSummaryCard } from "@/lib/session-summary";
import type { UiCopy } from "@/lib/ui-copy";
import type { UiLanguage } from "@/lib/ui-language";
import { SelectableLookupText } from "@/components/selectable-lookup-text";

function formatSummaryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}

type SummaryAssetChipKind = "expression" | "word" | "rewrite" | "topic";

type SummaryAssetChip = {
  kind: SummaryAssetChipKind;
  label: string;
};

function getCardAssetChips(card: SessionSummaryCard, isEn: boolean): SummaryAssetChip[] {
  const chips: SummaryAssetChip[] = [];

  // 这里直接复用现有 summary card 数据，不新增任何字段。
  if (card.reusableExpressions.length > 0) {
    chips.push({
      kind: "expression",
      label: isEn
        ? `${card.reusableExpressions.length} expression${
            card.reusableExpressions.length > 1 ? "s" : ""
          }`
        : `${card.reusableExpressions.length} 个表达`,
    });
  }

  if (card.reviewWords.length > 0) {
    chips.push({
      kind: "word",
      label: isEn
        ? `${card.reviewWords.length} word${card.reviewWords.length > 1 ? "s" : ""}`
        : `${card.reviewWords.length} 个词语`,
    });
  }

  if (card.expressionUpgrades.length > 0) {
    chips.push({
      kind: "rewrite",
      label: isEn
        ? `${card.expressionUpgrades.length} rewrite${
            card.expressionUpgrades.length > 1 ? "s" : ""
          }`
        : `${card.expressionUpgrades.length} 个改写`,
    });
  }

  if (card.nextTalkPrompt.trim()) {
    chips.push({ kind: "topic", label: isEn ? "Next topic" : "下次话题" });
  }

  return chips;
}

function getUpgradeSourceLabel(source: string, copy: UiCopy): string {
  if (source === "expression_hint") return copy.summary.fromHint;
  if (source === "non_japanese_span") return copy.summary.fromGap;
  return copy.summary.fromConversation;
}

function getAssetChipClassName(kind: SummaryAssetChipKind): string {
  if (kind === "expression") {
    return "border border-[#D7E2CF] bg-[#E8EFE4] text-[#2D4A1F]/82";
  }

  if (kind === "rewrite") {
    return "border border-[#E7D7A9] bg-[#C9A84C]/12 text-[#8B7430]/82";
  }

  if (kind === "topic") {
    return "border border-[rgba(122,112,96,0.12)] bg-[#F3EDE0] text-[#6D624F]";
  }

  return "border border-[rgba(122,112,96,0.12)] bg-[#E8E0CE]/72 text-[#6D624F]";
}

function SummaryAssetChipRow({
  chips,
  size = "list",
}: {
  chips: SummaryAssetChip[];
  size?: "list" | "detail";
}) {
  if (chips.length === 0) return null;

  const itemClass =
    size === "detail"
      ? "px-2.5 py-1 text-[10px] font-medium"
      : "px-2.5 py-1 text-[10px] font-medium";

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={`${chip.kind}-${chip.label}`}
          className={`inline-flex items-center rounded-full ${itemClass} ${getAssetChipClassName(chip.kind)}`}
        >
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function getWordSourceLabel(source: string, copy: UiCopy): string {
  return source === "looked_up" ? copy.summary.lookedUp : copy.summary.fromConversation;
}

function getReviewWordLabels(copy: UiCopy, isEn: boolean) {
  return {
    sentenceMeaning: isEn ? "In context" : "句中意思",
    basicMeaning: isEn ? "Meaning" : "意思",
  };
}

function normalizeReviewWordText(value: string | undefined): string {
  return value?.trim() ?? "";
}

function shouldShowLearningNote(note: string | undefined): boolean {
  const text = note?.trim() ?? "";
  if (!text || text.length < 18) return false;
  const genericPatterns = [
    "英语残句不要直译",
    "整理成自然日语",
    "保留这条表达",
    "方便下次复用",
    "下次可以直接使用",
    "这是更自然的说法",
    "可以帮助你学习",
  ];
  return !genericPatterns.some((pattern) => text.includes(pattern));
}

function SectionTitle({ jp, zh }: { jp: string; zh: string }) {
  return (
    <h3 className="font-ui flex items-baseline gap-2 text-sm font-semibold text-[#2D4A1F]">
      <span>{zh}</span>
      <span className="text-[10px] font-normal text-[#7A7060]">{jp}</span>
    </h3>
  );
}

interface ChatSummaryDetailProps {
  cards: SessionSummaryCard[];
  card: SessionSummaryCard | null;
  copy: UiCopy;
  isOpen: boolean;
  getNpcName: (npcId: SessionSummaryCard["npcId"]) => string;
  onOpenCard: (card: SessionSummaryCard) => void;
  onClose: () => void;
  onDelete: (cardId: string) => void;
  onBackToList: () => void;
}

export function ChatSummaryDetail({
  cards,
  card,
  copy,
  isOpen,
  getNpcName,
  onOpenCard,
  onClose,
  onDelete,
  onBackToList,
}: ChatSummaryDetailProps) {
  if (!isOpen) return null;
  const isEn = copy.summary.title === "Review Card";
  const lookupUiLanguage: UiLanguage = isEn ? "en" : "zh";
  const backToListLabel = isEn ? "← Back to list" : "← 返回列表";
  const backToChatLabel = isEn ? "← Back to chat" : "← 返回聊天";
  const emptyPanelText = isEn
    ? "After chatting for a while, use “+” to create a review card from recent chat."
    : "聊一会儿后，可以从「+」生成回顾卡，把最近聊天整理成学习内容。";

  const renderList = (
    <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
      {cards.length === 0 ? (
        <p className="rounded-xl border border-[rgba(40,35,26,0.07)] bg-[#FAF6EE] px-4 py-3.5 text-[13px] leading-relaxed text-[#6B6254]">
          {emptyPanelText}
        </p>
      ) : (
        <div className="space-y-2.5">
          {cards.map((item) => {
            const assetChips = getCardAssetChips(item, isEn);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenCard(item)}
                className="w-full rounded-xl border border-[rgba(40,35,26,0.07)] bg-[#FAF6EE] px-4 py-3 text-left transition-colors hover:bg-[#F3EDE0]"
              >
                <p className="text-[10px] text-[#7A7060]">
                  {getNpcName(item.npcId)} · {formatSummaryDate(item.createdAt)}
                </p>
                <p className="mt-1 text-[14px] leading-relaxed text-[#28231A]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6B6254]">
                  {item.topicSummary}
                </p>
                <div className="mt-2">
                  <SummaryAssetChipRow chips={assetChips} />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label={copy.summary.close}
        data-lookup-disabled="true"
        className="absolute inset-0 bg-[#28231A]/10"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-[#F3EDE0] border-l border-[rgba(40,35,26,0.08)] shadow-[-8px_0_30px_rgba(40,35,26,0.12)]">
        <header className="shrink-0 border-b border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-4 sm:px-6 sm:py-5">
          <div className="mb-1 flex items-center pr-8">
            {card ? (
              <button
                type="button"
                onClick={onBackToList}
                data-lookup-disabled="true"
                className="inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-[#4A4438] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
              >
                {backToListLabel}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                data-lookup-disabled="true"
                className="inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-[#4A4438] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
              >
                {backToChatLabel}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            data-lookup-disabled="true"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
            aria-label={copy.common.close}
          >
            ×
          </button>
          {card ? (
            <>
              <p className="font-ui text-[10px] text-[#7A7060]">{getNpcName(card.npcId)} · {formatSummaryDate(card.createdAt)} · {copy.summary.title} / {copy.summary.subtitle}</p>
              <h2 className="font-ui mt-1.5 pr-8 text-base font-semibold leading-snug text-[#28231A]">{card.title}</h2>
              <div className="mt-2 pr-8">
                <SummaryAssetChipRow
                  chips={getCardAssetChips(card, isEn)}
                  size="detail"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="font-ui mt-1.5 pr-8 text-base font-semibold leading-snug text-[#28231A]">{copy.sidebar.reviewTitle}</h2>
            </>
          )}
        </header>

        {!card && renderList}

        {card && (
          <>
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 text-[#28231A] sm:px-6">
              <section className="rounded-xl bg-[#FAF6EE]/85 border border-[rgba(40,35,26,0.06)] px-4 py-3.5">
                <SectionTitle jp={copy.summary.topicJp} zh={copy.summary.topic} />
                <SelectableLookupText
                  npcId={card.npcId}
                  uiLanguage={lookupUiLanguage}
                  sourceText={card.topicSummary}
                  className="mt-2"
                >
                  <p className="font-ja text-[14px] leading-relaxed text-[#4A4438]">{card.topicSummary}</p>
                </SelectableLookupText>
              </section>

              {card.reusableExpressions.length > 0 && (
                <section>
                  <SectionTitle jp={copy.summary.reusableJp} zh={copy.summary.reusable} />
                  <div className="mt-3 space-y-2.5">
                    {card.reusableExpressions.map((item, index) => (
                      <div key={`${item.expression}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3">
                        <SelectableLookupText
                          npcId={card.npcId}
                          uiLanguage={lookupUiLanguage}
                          sourceText={item.expression}
                        >
                          <p className="font-ja text-sm font-medium leading-[1.8] text-[#28231A]">{item.expression}</p>
                        </SelectableLookupText>
                        {item.note && <p className="font-ui mt-1.5 text-[11px] leading-relaxed text-[#6B6254]">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {card.expressionUpgrades.length > 0 && (
                <section>
                  <SectionTitle jp={copy.summary.upgradeJp} zh={copy.summary.upgrade} />
                  <div className="mt-3 space-y-3">
                    {card.expressionUpgrades.map((item, index) => (
                      <div key={`${item.original}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3.5">
                        <p className="font-ui inline-flex rounded-full bg-[#E8E0CE] px-2 py-0.5 text-[10px] text-[#6B6254]">
                          {getUpgradeSourceLabel(item.source, copy)}
                        </p>
                        <div className="mt-2.5 space-y-3">
                          <div className="rounded-md bg-[#F3EDE0]/55 px-2.5 py-2">
                            <p className="font-ui text-[11px] font-semibold text-[#7A7060]">{copy.summary.original}</p>
                            <SelectableLookupText
                              npcId={card.npcId}
                              uiLanguage={lookupUiLanguage}
                              sourceText={item.original}
                              className="mt-1"
                            >
                              <p className="font-ui text-[13px] leading-relaxed text-[#4A4438]">{item.original}</p>
                            </SelectableLookupText>
                          </div>
                          <div className="rounded-md bg-[#F3EDE0]/75 border-l-2 border-[#C9A84C]/55 px-2.5 py-2.5">
                            <p className="font-ui text-[11px] font-semibold text-[#7A7060]">{copy.summary.suggestion}</p>
                            <SelectableLookupText
                              npcId={card.npcId}
                              uiLanguage={lookupUiLanguage}
                              sourceText={item.suggestion}
                              className="mt-1"
                            >
                              <p className="font-ja text-[16px] font-medium leading-[1.85] text-[#2D4A1F]">{item.suggestion}</p>
                            </SelectableLookupText>
                          </div>
                          {shouldShowLearningNote(item.note) && (
                            <div className="rounded-md bg-[#F3EDE0]/55 px-2.5 py-2">
                              <p className="font-ui text-[11px] font-semibold text-[#7A7060]">{copy.summary.note}</p>
                              <p className="font-ui mt-1 text-[12px] leading-relaxed text-[#6B6254]">{item.note}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {card.reviewWords.length > 0 && (
                <section>
                  <SectionTitle jp={copy.summary.wordsJp} zh={copy.summary.words} />
                  <div className="mt-3 space-y-2.5">
                    {card.reviewWords.map((item, index) => {
                      const labels = getReviewWordLabels(copy, isEn);
                      const sourceText =
                        normalizeReviewWordText(item.sourceSentence) ||
                        normalizeReviewWordText(item.example) ||
                        item.word;
                      const sentenceMeaning = normalizeReviewWordText(item.sentenceMeaning);
                      const basicMeaning =
                        normalizeReviewWordText(item.basicMeaning) ||
                        normalizeReviewWordText(item.meaning);
                      const showSentenceMeaning =
                        Boolean(sentenceMeaning) &&
                        sentenceMeaning !== basicMeaning;
                      const showBasicMeaning = Boolean(basicMeaning);

                      return (
                        <div key={`${item.word}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3.5">
                          <div className="flex items-baseline justify-between gap-2">
                            <SelectableLookupText
                              npcId={card.npcId}
                              uiLanguage={lookupUiLanguage}
                              sourceText={sourceText}
                              className="min-w-0"
                            >
                              <p className="font-ja text-[15px] font-medium text-[#28231A]">{item.word}</p>
                            </SelectableLookupText>
                            <span className="font-ui shrink-0 rounded-full bg-[#E8E0CE] px-2 py-0.5 text-[10px] text-[#6B6254]">{getWordSourceLabel(item.source, copy)}</span>
                          </div>
                          {item.reading && (
                            <SelectableLookupText
                              npcId={card.npcId}
                              uiLanguage={lookupUiLanguage}
                              sourceText={sourceText}
                              className="mt-1.5"
                            >
                              <p className="text-[11px] text-[#7A7060]">
                                <span className="font-ui font-medium">{copy.summary.readingLabel}</span>
                                <span className="font-ja ml-1">{item.reading}</span>
                              </p>
                            </SelectableLookupText>
                          )}
                          {showSentenceMeaning && (
                            <p className="mt-1.5 text-[12px] leading-relaxed text-[#4A4438]">
                              <span className="font-ui font-medium text-[#7A7060]">{labels.sentenceMeaning}</span>
                              <span className="font-ui ml-1">{sentenceMeaning}</span>
                            </p>
                          )}
                          {showBasicMeaning && (
                            <p className="mt-1.5 text-[12px] leading-relaxed text-[#4A4438]">
                              <span className="font-ui font-medium text-[#7A7060]">{labels.basicMeaning}</span>
                              <span className="font-ui ml-1">{basicMeaning}</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {card.nextTalkPrompt && (
                <section className="rounded-xl bg-[#E8E0CE]/58 border border-[rgba(40,35,26,0.06)] px-4 py-4">
                  <SectionTitle jp={copy.summary.nextTopicJp} zh={copy.summary.nextTopic} />
                  <SelectableLookupText
                    npcId={card.npcId}
                    uiLanguage={lookupUiLanguage}
                    sourceText={card.nextTalkPrompt}
                    className="mt-2"
                  >
                    <p className="font-ja text-[14px] leading-relaxed text-[#4A4438]">{card.nextTalkPrompt}</p>
                  </SelectableLookupText>
                </section>
              )}
            </div>

            <footer className="shrink-0 border-t border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                data-lookup-disabled="true"
                className="font-ui rounded-md px-2 py-1 text-[11px] text-[#7A7060] hover:bg-[#E8E0CE]/70 hover:text-[#8A5A45] transition-colors"
              >
                {copy.summary.delete}
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
