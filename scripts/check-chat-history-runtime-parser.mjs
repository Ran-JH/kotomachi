import assert from "node:assert/strict";

import {
  loadStoredChatHistory,
  parseStoredChatHistory,
  parseStoredChatHistoryJson,
} from "../lib/chat-history-runtime-parser.ts";

const results = [];
const historyKey = (npcId) => `kotomachi_history_${npcId}`;

function runCase(name, check) {
  check();
  results.push(`${name}: PASS`);
}

runCase("Case A - current schema", () => {
  const history = [
    { role: "user", content: "current user", createdAt: "2026-08-02T01:00:00.000Z" },
    { role: "assistant", content: "current assistant", createdAt: "2026-08-02T01:00:01.000Z", source: "welcome" },
  ];
  assert.deepEqual(parseStoredChatHistory(history), history);
});

runCase("Case B - legacy optional fields omitted", () => {
  const legacy = [
    { role: "user", content: "old user" },
    { role: "assistant", content: "old assistant" },
    { role: "user", content: "" },
  ];
  assert.deepEqual(parseStoredChatHistory(legacy), legacy);
});

runCase("Case C - mixed array", () => {
  assert.deepEqual(
    parseStoredChatHistory([
      { role: "user", content: "valid user" },
      null,
      42,
      { unexpected: true },
      { role: "assistant", content: "valid assistant" },
    ]),
    [
      { role: "user", content: "valid user" },
      { role: "assistant", content: "valid assistant" },
    ],
  );
});

runCase("Case D - invalid roles", () => {
  assert.deepEqual(
    parseStoredChatHistory([
      { role: "system", content: "system" },
      { role: "tool", content: "tool" },
      { role: "function", content: "function" },
      { role: "unknown", content: "unknown" },
    ]),
    [],
  );
});

runCase("Case E - invalid content", () => {
  assert.deepEqual(
    parseStoredChatHistory([
      { role: "user", content: null },
      { role: "user", content: 1 },
      { role: "assistant", content: { text: "object" } },
      { role: "assistant", content: ["array"] },
    ]),
    [],
  );
});

runCase("Case F - invalid optional metadata", () => {
  assert.deepEqual(
    parseStoredChatHistory([
      { role: "user", content: "keep 1", createdAt: "not-a-date", source: "unknown" },
      { role: "assistant", content: "keep 2", createdAt: 123, source: "scene" },
      { role: "assistant", content: "keep 3", createdAt: "2026-08-02T01:00:00.000Z", source: null },
    ]),
    [
      { role: "user", content: "keep 1" },
      { role: "assistant", content: "keep 2", source: "scene" },
      { role: "assistant", content: "keep 3", createdAt: "2026-08-02T01:00:00.000Z" },
    ],
  );
});

runCase("Case G - non-array JSON", () => {
  for (const value of [{}, "text", 123]) {
    assert.deepEqual(parseStoredChatHistoryJson(JSON.stringify(value)), []);
  }
});

runCase("Case H - malformed JSON", () => {
  assert.doesNotThrow(() => parseStoredChatHistoryJson("[{broken"));
  assert.deepEqual(parseStoredChatHistoryJson("[{broken"), []);
});

runCase("Case I - extra fields are removed", () => {
  const customPrototype = { inherited: "do not keep" };
  const input = Object.assign(Object.create(customPrototype), {
    role: "user",
    content: "keep",
    id: "extra-id",
    payload: { large: true },
    method() {},
  });
  assert.deepEqual(parseStoredChatHistory([input]), [{ role: "user", content: "keep" }]);
});

runCase("Case J - duplicate messages are preserved", () => {
  const duplicate = { role: "user", content: "same" };
  assert.deepEqual(parseStoredChatHistory([duplicate, duplicate]), [duplicate, duplicate]);
});

runCase("Case K - NPC keys stay isolated", () => {
  const values = new Map([
    [historyKey("misaki"), JSON.stringify([{ role: "user", content: "misaki only" }])],
    [historyKey("haruto"), JSON.stringify([{ role: "assistant", content: "haruto only" }])],
  ]);
  const storage = { getItem: (key) => values.get(key) ?? null };

  assert.deepEqual(loadStoredChatHistory(storage, historyKey("misaki")), [{ role: "user", content: "misaki only" }]);
  assert.deepEqual(loadStoredChatHistory(storage, historyKey("haruto")), [{ role: "assistant", content: "haruto only" }]);
});

runCase("Case L - reads never rewrite raw storage", () => {
  let writeCount = 0;
  const storage = {
    getItem: () => JSON.stringify([
      { role: "user", content: "valid" },
      null,
    ]),
    setItem: () => { writeCount += 1; },
    removeItem: () => { writeCount += 1; },
  };

  assert.deepEqual(loadStoredChatHistory(storage, historyKey("misaki")), [{ role: "user", content: "valid" }]);
  assert.equal(writeCount, 0);
});

console.log(results.join("\n"));
