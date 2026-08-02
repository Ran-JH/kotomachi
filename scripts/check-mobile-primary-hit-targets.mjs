import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const homeSource = readFileSync(resolve("app", "page.tsx"), "utf8");
const chatSource = readFileSync(resolve("app", "chat", "[npcId]", "page.tsx"), "utf8");
const languageSource = readFileSync(resolve("components", "language-toggle.tsx"), "utf8");
const results = [];

function runCase(name, check) {
  check();
  results.push(name + ": PASS");
}

function getTargetButton(source, id) {
  const marker = 'data-mobile-hit-target="' + id + '"';
  const markerIndex = source.indexOf(marker);
  assert.notEqual(markerIndex, -1, "Missing target marker: " + id);

  const start = source.lastIndexOf("<button", markerIndex);
  const end = source.indexOf("</button>", markerIndex);
  assert.notEqual(start, -1, "Missing button start: " + id);
  assert.notEqual(end, -1, "Missing button end: " + id);
  return source.slice(start, end + "</button>".length);
}

const targets = [
  { id: "language-option", source: languageSource, size: /h-11 w-11/ },
  { id: "chat-mobile-menu", source: chatSource, size: /h-11 w-11/ },
  { id: "chat-input-mode", source: chatSource, size: /h-11 w-11/ },
  { id: "chat-more-actions", source: chatSource, size: /h-11 w-11/ },
  { id: "chat-send", source: chatSource, size: /min-h-11 min-w-11/ },
  { id: "chat-hold-to-talk", source: chatSource, size: /min-h-11 min-w-11/ },
];

runCase("Case A - mobile targets are at least 44 by 44 CSS px", () => {
  for (const target of targets) {
    assert.match(getTargetButton(target.source, target.id), target.size, target.id);
  }
});

runCase("Case B - icon visuals remain below 44px", () => {
  const iconTargets = [
    getTargetButton(chatSource, "chat-mobile-menu"),
    getTargetButton(chatSource, "chat-input-mode"),
    getTargetButton(chatSource, "chat-more-actions"),
    getTargetButton(chatSource, "chat-hold-to-talk"),
  ].join("\n");

  assert.doesNotMatch(iconTargets, /(?:MenuIcon|MicIcon|KeyboardIcon)[^>]*size=\{44\}/);
  assert.match(iconTargets, /MenuIcon size=\{17\}/);
  assert.match(iconTargets, /MicIcon size=\{17\}/);
  assert.match(iconTargets, /KeyboardIcon size=\{17\}/);
  assert.match(iconTargets, /MicIcon size=\{15\}/);
  assert.match(getTargetButton(chatSource, "chat-input-mode"), /h-9 w-9/);
  assert.match(getTargetButton(chatSource, "chat-more-actions"), /h-9 w-9/);
});

runCase("Case C - desktop sizing remains explicit", () => {
  assert.match(getTargetButton(languageSource, "language-option"), /md:h-auto md:w-auto/);
  assert.match(getTargetButton(chatSource, "chat-mobile-menu"), /md:hidden/);
  assert.match(getTargetButton(chatSource, "chat-input-mode"), /md:m-0 md:h-9 md:w-9/);
  assert.match(getTargetButton(chatSource, "chat-more-actions"), /md:m-0 md:h-9 md:w-9/);
  assert.match(getTargetButton(chatSource, "chat-send"), /md:my-0 md:min-h-0 md:min-w-0/);
  assert.match(getTargetButton(chatSource, "chat-hold-to-talk"), /md:my-0 md:min-h-0 md:min-w-0/);
});

runCase("Case D - touched controls have accessible names", () => {
  assert.match(getTargetButton(languageSource, "language-option"), /copy\.zh|copy\.en/);
  assert.match(getTargetButton(chatSource, "chat-mobile-menu"), /aria-label=\{copy\.sidebar\.openMenu\}/);
  assert.match(getTargetButton(chatSource, "chat-input-mode"), /aria-label=\{inputMode === "text"/);
  assert.match(getTargetButton(chatSource, "chat-more-actions"), /aria-label=\{copy\.sidebar\.moreActions\}/);
  assert.match(getTargetButton(chatSource, "chat-send"), /copy\.chat\.sending|copy\.chat\.send/);
  assert.match(getTargetButton(chatSource, "chat-hold-to-talk"), /aria-label=\{isRecording \? copy\.chat\.stopRecording/);
});

runCase("Case E - targets keep native button semantics", () => {
  for (const target of targets) {
    const button = getTargetButton(target.source, target.id);
    assert.match(button, /^<button/);
    assert.match(button, /type="button"/);
  }
});

runCase("Case F - recording event bindings are unchanged", () => {
  const recordingButton = getTargetButton(chatSource, "chat-hold-to-talk");
  assert.match(recordingButton, /onMouseDown=\{startRecording\}/);
  assert.match(recordingButton, /onMouseUp=\{stopRecording\}/);
  assert.match(recordingButton, /onMouseLeave=\{isRecording \? stopRecording : undefined\}/);
  assert.match(recordingButton, /onTouchStart=\{\(e\) => \{ e\.preventDefault\(\); void startRecording\(\); \}\}/);
  assert.match(recordingButton, /onTouchEnd=\{\(e\) => \{ e\.preventDefault\(\); stopRecording\(\); \}\}/);
  assert.match(recordingButton, /onTouchCancel=\{\(e\) => \{ e\.preventDefault\(\); stopRecording\(\); \}\}/);
});

runCase("Case G - mobile plus-menu overlay and scene panel remain intact", () => {
  assert.match(chatSource, /\{isInputActionsOpen && \(\s*<>/);
  assert.match(chatSource, /className="fixed inset-0 z-40 bg-\[rgba\(31,42,24,0\.08\)\] backdrop-blur-\[1px\] sm:hidden"/);
  assert.match(chatSource, /setIsInputActionsOpen\(false\);\s*setIsScenePickerOpen\(false\);\s*setIsTopicIdeasOpen\(false\);/);
  assert.match(chatSource, /fixed inset-x-3 bottom-\[calc\(env\(safe-area-inset-bottom\)\+5\.5rem\)\] z-50/);
  assert.match(chatSource, /!activeScene && availableScenes\.length > 0 && isScenePickerOpen/);
});

assert.match(homeSource, /<LanguageToggle[\s\S]*className="relative z-20 shrink-0 mt-0\.5"/);

console.log(results.join("\n"));

