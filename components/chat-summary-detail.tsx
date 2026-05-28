import type { SessionSummaryCard } from "@/lib/session-summary";
import type { UiCopy } from "@/lib/ui-copy";

function formatSummaryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }).format(date);
}

function getUpgradeSourceLabel(source: string, copy: UiCopy): string {
  if (source === "expression_hint") return copy.summary.fromHint;
  if (source === "non_japanese_span") return copy.summary.fromGap;
  return copy.summary.fromConversation;
}

function getWordSourceLabel(source: string, copy: UiCopy): string {
  return source === "looked_up" ? copy.summary.lookedUp : copy.summary.fromConversation;
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
  onOpenCard,
  onClose,
  onDelete,
  onBackToList,
}: ChatSummaryDetailProps) {
  if (!isOpen) return null;
  const isEn = copy.summary.title === "Review Card";
  const backToListLabel = isEn ? "Back to list" : "返回列表";
  const emptyPanelText = isEn
    ? "No review cards yet. Chat a little, then create one from the “+” menu."
    : "暂无回顾卡片。聊一会儿后，可以从输入框旁的“+”生成。";

  const renderList = (
    <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
      {cards.length === 0 ? (
        <p className="rounded-xl border border-[rgba(40,35,26,0.07)] bg-[#FAF6EE] px-4 py-3.5 text-[13px] leading-relaxed text-[#6B6254]">
          {emptyPanelText}
        </p>
      ) : (
        <div className="space-y-2.5">
          {cards.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenCard(item)}
              className="w-full rounded-xl border border-[rgba(40,35,26,0.07)] bg-[#FAF6EE] px-4 py-3 text-left transition-colors hover:bg-[#F3EDE0]"
            >
              <p className="text-[10px] text-[#7A7060]">{formatSummaryDate(item.createdAt)}</p>
              <p className="mt-1 text-[14px] leading-relaxed text-[#28231A]">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-[#6B6254]">{item.topicSummary}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 flex justify-end">
      <button
        type="button"
        aria-label={copy.summary.close}
        className="absolute inset-0 bg-[#28231A]/10"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-[#F3EDE0] border-l border-[rgba(40,35,26,0.08)] shadow-[-8px_0_30px_rgba(40,35,26,0.12)]">
        <header className="shrink-0 border-b border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-5 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-xs text-[#7A7060] hover:bg-[#E8E0CE] hover:text-[#28231A] transition-colors"
            aria-label={copy.common.close}
          >
            ×
          </button>
          {card ? (
            <>
              <button
                type="button"
                onClick={onBackToList}
                className="mb-2 text-[11px] text-[#7A7060] hover:text-[#28231A] transition-colors"
              >
                {backToListLabel}
              </button>
              <p className="font-ui text-[10px] text-[#7A7060]">{formatSummaryDate(card.createdAt)} · {copy.summary.title} / {copy.summary.subtitle}</p>
              <h2 className="font-ui mt-1.5 pr-8 text-base font-semibold leading-snug text-[#28231A]">{card.title}</h2>
            </>
          ) : (
            <>
              <p className="font-ui text-[10px] text-[#7A7060]">{copy.summary.title} / {copy.summary.subtitle}</p>
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
                <p className="font-ja mt-2 text-[14px] leading-relaxed text-[#4A4438]">{card.topicSummary}</p>
              </section>

              {card.reusableExpressions.length > 0 && (
                <section>
                  <SectionTitle jp={copy.summary.reusableJp} zh={copy.summary.reusable} />
                  <div className="mt-3 space-y-2.5">
                    {card.reusableExpressions.map((item, index) => (
                      <div key={`${item.expression}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3">
                        <p className="font-ja text-sm font-medium leading-[1.8] text-[#28231A]">{item.expression}</p>
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
                            <p className="font-ui mt-1 text-[13px] leading-relaxed text-[#4A4438]">{item.original}</p>
                          </div>
                          <div className="rounded-md bg-[#F3EDE0]/75 border-l-2 border-[#C9A84C]/55 px-2.5 py-2.5">
                            <p className="font-ui text-[11px] font-semibold text-[#7A7060]">{copy.summary.suggestion}</p>
                            <p className="font-ja mt-1 text-[16px] font-medium leading-[1.85] text-[#2D4A1F]">{item.suggestion}</p>
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
                    {card.reviewWords.map((item, index) => (
                      <div key={`${item.word}-${index}`} className="rounded-xl bg-[#FAF6EE] border border-[rgba(40,35,26,0.07)] px-4 py-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-ja text-[15px] font-medium text-[#28231A]">{item.word}</p>
                          <span className="font-ui shrink-0 rounded-full bg-[#E8E0CE] px-2 py-0.5 text-[10px] text-[#6B6254]">{getWordSourceLabel(item.source, copy)}</span>
                        </div>
                        {item.reading && (
                          <p className="mt-1.5 text-[11px] text-[#7A7060]">
                            <span className="font-ui font-medium">{copy.summary.readingLabel}</span>
                            <span className="font-ja ml-1">{item.reading}</span>
                          </p>
                        )}
                        <p className="mt-1.5 text-[12px] leading-relaxed text-[#4A4438]">
                          <span className="font-ui font-medium text-[#7A7060]">{copy.summary.meaningLabel}</span>
                          <span className="font-ui ml-1">{item.meaning}</span>
                        </p>
                        {item.example && (
                          <p className="mt-1.5 text-[12px] leading-relaxed text-[#6B6254]">
                            <span className="font-ui font-medium text-[#7A7060]">{copy.summary.exampleLabel}</span>
                            <span className="font-ja ml-1">{item.example}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {card.nextTalkPrompt && (
                <section className="rounded-xl bg-[#E8E0CE]/58 border border-[rgba(40,35,26,0.06)] px-4 py-4">
                  <SectionTitle jp={copy.summary.nextTopicJp} zh={copy.summary.nextTopic} />
                  <p className="font-ja mt-2 text-[14px] leading-relaxed text-[#4A4438]">{card.nextTalkPrompt}</p>
                </section>
              )}
            </div>

            <footer className="shrink-0 border-t border-[rgba(40,35,26,0.08)] bg-[#FAF6EE] px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={() => onDelete(card.id)}
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
