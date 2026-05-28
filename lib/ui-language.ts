export type UiLanguage = "zh" | "en";

export const DEFAULT_UI_LANGUAGE: UiLanguage = "zh";
export const UI_LANGUAGE_STORAGE_KEY = "kotomachi.uiLanguage.v1";

export function isUiLanguage(value: unknown): value is UiLanguage {
  return value === "zh" || value === "en";
}

export function loadUiLanguage(): UiLanguage {
  if (typeof window === "undefined") return DEFAULT_UI_LANGUAGE;
  try {
    const value = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
    return isUiLanguage(value) ? value : DEFAULT_UI_LANGUAGE;
  } catch {
    return DEFAULT_UI_LANGUAGE;
  }
}

export function saveUiLanguage(language: UiLanguage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, language);
  } catch {
    // UI language is a preference only; storage failure should not break the app.
  }
}
