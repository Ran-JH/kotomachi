export type UiLanguage = "zh" | "en";

export const DEFAULT_UI_LANGUAGE: UiLanguage = "zh";
export const UI_LANGUAGE_STORAGE_KEY = "kotomachi.uiLanguage.v1";

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "zh" || value === "en";
}

/**
 * The root document language follows the UI, not NPC conversation content.
 * Unknown values fall back to the default Chinese UI instead of creating another language state.
 */
export function getDocumentLanguage(language: unknown): string {
  return language === "en" ? "en" : "zh-CN";
}

function syncDocumentLanguage(language: unknown): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = getDocumentLanguage(language);
}

export function loadUiLanguage(): UiLanguage {
  if (typeof window === "undefined") return DEFAULT_UI_LANGUAGE;
  try {
    const value = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    const language = isUiLanguage(value) ? value : DEFAULT_UI_LANGUAGE;
    syncDocumentLanguage(language);
    return language;
  } catch {
    syncDocumentLanguage(DEFAULT_UI_LANGUAGE);
    return DEFAULT_UI_LANGUAGE;
  }
}

export function saveUiLanguage(language: UiLanguage): void {
  // Keep the accessibility language current even when LocalStorage is unavailable.
  syncDocumentLanguage(language);
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // UI language is a preference only; storage failure should not break the app.
  }
}
