import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  appendCurrentUserOnce,
  isFirstGuidedUserTurn,
} from "../lib/chat-message-contract.ts";
import {
  MAX_CHAT_HISTORY_MESSAGE_LENGTH,
  MAX_CHAT_HISTORY_MESSAGES,
  MAX_CHAT_HISTORY_TOTAL_LENGTH,
  MAX_CHAT_TEXT_LENGTH,
  parseChatRequestBody,
  parseChatRequestJson,
} from "../lib/chat-request-parser.ts";
import { getConversationScene } from "../lib/conversation-scenes.ts";
import { ALL_NPC_IDS } from "../lib/npc.ts";

const results = [];
const invalidRequests = [];

const runtime = {
  isNpcId(value) {
    return ALL_NPC_IDS.includes(value);
  },
  getSceneNpcId(sceneId) {
    return getConversationScene(sceneId)?.npcId ?? null;
  },
};

function runCase(name, check) {
  check();
  results.push(name + ": PASS");
}

async function runAsyncCase(name, check) {
  await check();
  results.push(name + ": PASS");
}

function validBody(overrides = {}) {
  return {
    text: "こんにちは",
    npcId: "misaki",
    history: [],
    ...overrides,
  };
}

function expectOk(body) {
  const result = parseChatRequestBody(body, runtime);
  assert.equal(result.ok, true, result.ok ? undefined : result.error.reason);
  return result.data;
}

function expectError(body, code) {
  const result = parseChatRequestBody(body, runtime);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, code);
  invalidRequests.push({ json: async () => body });
  return result.error;
}

function errorContract(error) {
  const isTooLarge = error.code === "request_too_large";
  return {
    status: isTooLarge ? 413 : 400,
    body: {
      error: isTooLarge ? "Chat request is too large" : "Invalid chat request",
      code: error.code,
      retryable: false,
    },
  };
}

let providerCalls = 0;
async function simulateRoute(request) {
  const parsed = await parseChatRequestJson(request, runtime);
  if (!parsed.ok) return errorContract(parsed.error);
  providerCalls += 1;
  return { status: 200, body: { text: "mock assistant" } };
}

runCase("Case A - normal Free Chat", () => {
  const parsed = expectOk(validBody({ text: " こんにちは ", activeSceneId: null }));
  assert.equal(parsed.text, " こんにちは ");
  assert.deepEqual(parsed.history, []);
  assert.equal("activeSceneId" in parsed, false);
});

runCase("Case B - normal continued chat", () => {
  const history = [
    { role: "user", content: "user 1", createdAt: "ignored" },
    { role: "assistant", content: "assistant 1", source: "welcome" },
    { role: "user", content: "user 2" },
    { role: "assistant", content: "assistant 2" },
  ];
  const parsed = expectOk(validBody({ history }));
  assert.deepEqual(
    parsed.history.map(({ role, content }) => ({ role, content })),
    history.map(({ role, content }) => ({ role, content })),
  );
  assert.equal("createdAt" in parsed.history[0], false);
});

runCase("Case C - Guided first turn", () => {
  const sceneId = "kimura_bento_checkout";
  const scene = getConversationScene(sceneId);
  assert.ok(scene);
  const parsed = expectOk(validBody({
    npcId: scene.npcId,
    activeSceneId: sceneId,
    history: [{ role: "assistant", content: scene.npcOpening, source: "scene" }],
  }));
  assert.equal(parsed.activeSceneId, sceneId);
  assert.equal(isFirstGuidedUserTurn(parsed.history, scene.npcOpening), true);
});

runCase("Case D - legal duplicate text", () => {
  const repeated = "同じ文";
  const parsed = expectOk(validBody({
    text: repeated,
    history: [
      { role: "user", content: repeated },
      { role: "assistant", content: "はい" },
    ],
  }));
  const messages = appendCurrentUserOnce(parsed.history, parsed.text);
  assert.equal(
    messages.filter((message) => message.role === "user" && message.content === repeated).length,
    2,
  );
});

runCase("Case E - invalid top-level values", () => {
  for (const value of [null, [], "text", 1]) {
    expectError(value, "invalid_request");
  }
});

await runAsyncCase("Case F - malformed JSON", async () => {
  const request = {
    json: async () => {
      throw new SyntaxError("malformed JSON fixture");
    },
  };
  const response = await simulateRoute(request);
  assert.deepEqual(response, {
    status: 400,
    body: {
      error: "Invalid chat request",
      code: "invalid_request",
      retryable: false,
    },
  });
  invalidRequests.push(request);
});

runCase("Case G - forbidden roles", () => {
  for (const role of ["system", "tool", "function", "owner"]) {
    expectError(validBody({ history: [{ role, content: "blocked" }] }), "invalid_request");
  }
});

runCase("Case H - invalid history content", () => {
  for (const content of [null, 1, [], {}]) {
    expectError(
      validBody({ history: [{ role: "user", content }] }),
      "invalid_request",
    );
  }
});

runCase("Case I - empty text", () => {
  for (const text of ["", "   ", "\n\n"]) {
    expectError(validBody({ text }), "invalid_request");
  }
});

runCase("Case J - oversized text", () => {
  expectError(
    validBody({ text: "x".repeat(MAX_CHAT_TEXT_LENGTH + 1) }),
    "request_too_large",
  );
});

runCase("Case K - too many history messages", () => {
  expectError(
    validBody({
      history: Array.from(
        { length: MAX_CHAT_HISTORY_MESSAGES + 1 },
        () => ({ role: "user", content: "x" }),
      ),
    }),
    "request_too_large",
  );
});

runCase("Case L - oversized history item", () => {
  expectError(
    validBody({
      history: [{
        role: "assistant",
        content: "x".repeat(MAX_CHAT_HISTORY_MESSAGE_LENGTH + 1),
      }],
    }),
    "request_too_large",
  );
});

runCase("Case M - oversized total history content", () => {
  const itemLength = Math.floor(MAX_CHAT_HISTORY_TOTAL_LENGTH / 6) + 1;
  assert.ok(itemLength <= MAX_CHAT_HISTORY_MESSAGE_LENGTH);
  expectError(
    validBody({
      history: Array.from(
        { length: 6 },
        (_, index) => ({
          role: index % 2 === 0 ? "user" : "assistant",
          content: "x".repeat(itemLength),
        }),
      ),
    }),
    "request_too_large",
  );
});

runCase("Case N - npcId, uiLanguage, and scene validation", () => {
  expectError(validBody({ npcId: "missing-npc" }), "invalid_request");
  expectError(validBody({ uiLanguage: "ja" }), "invalid_request");
  expectError(validBody({ activeSceneId: "missing-scene" }), "invalid_request");
  expectError(
    validBody({ npcId: "misaki", activeSceneId: "kimura_bento_checkout" }),
    "invalid_request",
  );
  assert.equal(expectOk({ text: "default", history: [] }).npcId, "misaki");
  assert.equal(expectOk(validBody({ uiLanguage: "zh" })).uiLanguage, "zh");
  assert.equal(expectOk(validBody({ uiLanguage: "en" })).uiLanguage, "en");
});

runCase("Case O - unknown fields are not propagated", () => {
  const parsed = expectOk(validBody({
    unknownTopLevel: { arbitrary: ["data"] },
    localDateContext: {
      year: 2026,
      month: 8,
      day: 2,
      dayOfWeek: 0,
      isWeekend: true,
      timeOfDay: "afternoon",
      seasonalHintsJa: ["not propagated"],
    },
    history: [{
      role: "assistant",
      content: "opening",
      source: "scene",
      createdAt: "2026-08-02T00:00:00.000Z",
      arbitrary: { nested: true },
    }],
  }));
  assert.equal("unknownTopLevel" in parsed, false);
  assert.deepEqual(Object.keys(parsed.history[0]), ["role", "content", "source"]);
  assert.equal("seasonalHintsJa" in parsed.localDateContext, false);
});

await runAsyncCase("Case P - provider safety", async () => {
  providerCalls = 0;
  for (const request of invalidRequests) {
    const response = await simulateRoute(request);
    assert.ok(response.status === 400 || response.status === 413);
  }
  assert.equal(providerCalls, 0);

  const routeSource = readFileSync(resolve("app", "api", "chat", "route.ts"), "utf8");
  const parseIndex = routeSource.indexOf("await parseChatRequestJson");
  const sceneIndex = routeSource.indexOf("const localDateContext = resolveLocalDateContext");
  const providerIndex = routeSource.indexOf("await createChatCompletion");
  assert.ok(parseIndex >= 0 && parseIndex < sceneIndex && sceneIndex < providerIndex);
  assert.match(routeSource, /code: error\.code,/);
  assert.match(routeSource, /retryable: false,/);
  assert.match(routeSource, /status: isTooLarge \? 413 : 400/);
});

console.log(results.join("\n"));
