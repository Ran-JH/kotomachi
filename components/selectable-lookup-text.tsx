"use client";

import { useRef, type HTMLAttributes, type ReactNode } from "react";
import { WordPopover } from "@/components/word-popover";
import { useWordLookupSelection } from "@/components/use-word-lookup";
import type { NpcId } from "@/lib/npc";
import type { UiLanguage } from "@/lib/ui-language";

interface SelectableLookupTextProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  npcId: NpcId;
  uiLanguage: UiLanguage;
  sourceText: string;
  onPlayAudio?: (word: string) => void;
}

export function SelectableLookupText({
  children,
  npcId,
  uiLanguage,
  sourceText,
  onPlayAudio,
  className,
  ...rest
}: SelectableLookupTextProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const {
    lookupState,
    closeLookup,
    handleLookupMouseUp,
    handleLookupDoubleClick,
    handleLookupPointerUp,
  } = useWordLookupSelection({
    rootRef,
    npcId,
    uiLanguage,
    sourceText,
  });

  return (
    <>
      <div
        {...rest}
        ref={rootRef}
        className={className}
        onMouseUp={handleLookupMouseUp}
        onPointerUp={handleLookupPointerUp}
        onTouchEnd={handleLookupPointerUp}
        onDoubleClick={handleLookupDoubleClick}
      >
        {children}
      </div>

      {lookupState && (
        <WordPopover
          npcId={npcId}
          selectedText={lookupState.selectedText}
          fullSentence={lookupState.fullSentence}
          anchorRect={lookupState.anchorRect}
          uiLanguage={uiLanguage}
          onPlayAudio={onPlayAudio}
          onClose={closeLookup}
        />
      )}
    </>
  );
}
