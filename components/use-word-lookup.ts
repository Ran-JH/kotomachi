"use client";

import {
  useCallback,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from "react";
import type { NpcId } from "@/lib/npc";
import type { UiLanguage } from "@/lib/ui-language";

const LOOKUP_DISABLED_SELECTOR = [
  "button",
  "select",
  "input",
  "textarea",
  "a",
  "[role='button']",
  "[data-lookup-disabled='true']",
].join(", ");

export interface WordLookupState {
  selectedText: string;
  fullSentence: string;
  anchorRect: DOMRect;
  sourceMessageId?: string;
}

interface UseWordLookupSelectionOptions {
  rootRef: RefObject<HTMLElement | null>;
  npcId: NpcId;
  uiLanguage: UiLanguage;
  sourceText?: string;
  sourceMessageId?: string;
  textSelector?: string;
}

function toElement(target: EventTarget | null): Element | null {
  if (!target) return null;
  return target instanceof Element ? target : null;
}

function findSelectionElement(node: Node | null): Element | null {
  if (!node) return null;
  return node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as Element);
}

function isLookupDisabled(element: Element | null): boolean {
  return element?.closest(LOOKUP_DISABLED_SELECTOR) != null;
}

export function useWordLookupSelection(options: UseWordLookupSelectionOptions) {
  const [lookupState, setLookupState] = useState<WordLookupState | null>(null);

  const evaluateSelection = useCallback((eventTarget?: EventTarget | null) => {
    const rootElement = options.rootRef.current;
    if (!rootElement) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;

    const selectedText = selection.toString().trim();
    if (!selectedText || selectedText.length > 80) return;

    const range = selection.getRangeAt(0);
    const anchorNode = range.commonAncestorContainer;
    const anchorElement = findSelectionElement(anchorNode);
    const eventElement = toElement(eventTarget);
    const textSelector = options.textSelector ?? "[data-message-text='1']";
    const insideRoot = rootElement.contains(anchorNode);
    const insideMessageText = anchorElement?.closest(textSelector) != null;

    if (!insideRoot && !insideMessageText) return;

    // Filter obvious interactive controls so future reuse does not trigger lookup by accident.
    if (isLookupDisabled(eventElement) || isLookupDisabled(anchorElement)) return;

    const anchorRect = range.getBoundingClientRect();
    if (!anchorRect || (anchorRect.width === 0 && anchorRect.height === 0)) return;

    setLookupState({
      selectedText,
      fullSentence: options.sourceText?.trim() || selectedText,
      anchorRect,
      sourceMessageId: options.sourceMessageId,
    });
  }, [options]);

  const closeLookup = useCallback(() => {
    setLookupState(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const handleLookupMouseUp = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    evaluateSelection(event.target);
  }, [evaluateSelection]);

  const handleLookupDoubleClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    requestAnimationFrame(() => {
      evaluateSelection(event.target);
    });
  }, [evaluateSelection]);

  const handleLookupPointerUp = useCallback((event: ReactPointerEvent<HTMLElement> | ReactTouchEvent<HTMLElement>) => {
    window.setTimeout(() => {
      evaluateSelection(event.target);
    }, 0);
  }, [evaluateSelection]);

  return {
    lookupState,
    closeLookup,
    handleLookupMouseUp,
    handleLookupDoubleClick,
    handleLookupPointerUp,
  };
}
