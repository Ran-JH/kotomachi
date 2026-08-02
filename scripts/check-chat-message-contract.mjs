import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  appendCurrentUserOnce,
  buildChatTurnContract,
  isFirstGuidedUserTurn,
  toCompletedChatHistory,
} from "../lib/chat-message-contract.ts";
import { buildGuidedResponseEvalPayload } from "../lib/guided-response-eval-payload.mjs";

const results = [];

function runCase(name, check) {
  check();
  results.push(`${name}: PASS`);
}

function countExactUser(messages, text) {
  return messages.filter(
    (message) => message.role === "user" && message.content === text,
  ).length;
}

const sceneOpening = "いらっしゃいませ。今日は何にしますか？";
const sceneUser1 = "ホットコーヒーを一つお願いします。";

runCase("Case A - Free Chat 第一条", () => {
  const messages = appendCurrentUserOnce([], "こんにちは");
  assert.deepEqual(messages, [{ role: "user", content: "こんにちは" }]);
});

runCase("Case B - 普通连续聊天", () => {
  const history = [
    { role: "user", content: "user A" },
    { role: "assistant", content: "assistant A" },
    { role: "user", content: "user B" },
    { role: "assistant", content: "assistant B" },
  ];
  const messages = appendCurrentUserOnce(history, "user C");
  assert.deepEqual(messages, [...history, { role: "user", content: "user C" }]);
  assert.equal(countExactUser(messages, "user C"), 1);
});

runCase("Case C - 合法重复文本", () => {
  const messages = appendCurrentUserOnce(
    [
      { role: "user", content: "そうですね" },
      { role: "assistant", content: "うん。" },
    ],
    "そうですね",
  );
  assert.equal(countExactUser(messages, "そうですね"), 2);
  assert.equal(messages.length, 3);
});

runCase("Case D - Guided 第一轮", () => {
  const history = [
    { role: "assistant", content: sceneOpening, source: "scene" },
  ];
  const messages = appendCurrentUserOnce(history, sceneUser1);
  assert.equal(countExactUser(messages, sceneUser1), 1);
  assert.equal(isFirstGuidedUserTurn(history, sceneOpening), true);
});

runCase("Case E - Guided 第二轮", () => {
  const history = [
    { role: "assistant", content: sceneOpening, source: "scene" },
    { role: "user", content: sceneUser1 },
    { role: "assistant", content: "はい、どうぞ。" },
  ];
  assert.equal(isFirstGuidedUserTurn(history, sceneOpening), false);
  assert.equal(countExactUser(appendCurrentUserOnce(history, "砂糖もお願いします。"), "砂糖もお願いします。"), 1);
});

runCase("Case F - 旧聊天后启动 Guided", () => {
  const history = [
    { role: "user", content: "前の話" },
    { role: "assistant", content: "前の返事" },
    { role: "assistant", content: sceneOpening, source: "scene" },
  ];
  assert.ok(history.length > 1);
  assert.equal(isFirstGuidedUserTurn(history, sceneOpening), true);
});

runCase("Case G - Revisit Welcome 后发送", () => {
  const history = [
    { role: "assistant", content: "また来てくれたんですね。", source: "welcome" },
  ];
  const messages = appendCurrentUserOnce(history, "ただいま。");
  assert.equal(countExactUser(messages, "ただいま。"), 1);
  assert.equal(messages[0].content, history[0].content);
});

runCase("Case H - optimistic UI 与 API history 分离", () => {
  const priorUi = [
    { id: "opening", sender: "assistant", text: sceneOpening, source: "scene" },
  ];
  const currentUi = { id: "current", sender: "user", text: sceneUser1 };
  const completedHistory = toCompletedChatHistory(priorUi);
  const optimisticUi = [...priorUi, currentUi];
  const request = buildChatTurnContract(completedHistory, currentUi.text);

  assert.equal(optimisticUi.filter((message) => message.id === "current").length, 1);
  assert.equal(request.history.some((message) => message.role === "user"), false);
  assert.equal(countExactUser(appendCurrentUserOnce(request.history, request.text), sceneUser1), 1);
});

runCase("Case I - 失败路径不创建 assistant fallback", () => {
  const optimisticUi = [
    { id: "current", sender: "user", text: "失敗テスト" },
  ];
  const failedTurn = {
    userMessageId: "current",
    userText: "失敗テスト",
    errorCategory: "network",
  };
  assert.equal(optimisticUi.filter((message) => message.sender === "user").length, 1);
  assert.equal(optimisticUi.filter((message) => message.sender === "assistant").length, 0);
  assert.equal(failedTurn.userMessageId, optimisticUi[0].id);

  const pageSource = readFileSync(
    resolve("app", "chat", "[npcId]", "page.tsx"),
    "utf8",
  );
  assert.equal((pageSource.match(/\.\.\.prev, userMsg/g) ?? []).length, 1);
  assert.match(pageSource, /type FailedChatTurn = PendingChatTurn/);
  assert.doesNotMatch(pageSource, /sender: "assistant", text: "ごめん、ちょっと通信が不安定みたい/);
});

runCase("Production / Eval payload parity", () => {
  const scene = {
    id: "fixture_scene",
    npcId: "misaki",
    npcOpening: sceneOpening,
    sampleUserLineJa: sceneUser1,
  };
  const browserHistory = toCompletedChatHistory([
    { sender: "assistant", text: sceneOpening, source: "scene" },
  ]);
  const browserTurn = buildChatTurnContract(browserHistory, sceneUser1);
  const evalPayload = buildGuidedResponseEvalPayload(scene);

  assert.deepEqual(
    { history: evalPayload.history, text: evalPayload.text },
    browserTurn,
  );
  assert.equal(isFirstGuidedUserTurn(evalPayload.history, sceneOpening), true);
  assert.equal(countExactUser(appendCurrentUserOnce(evalPayload.history, evalPayload.text), sceneUser1), 1);
});

console.log(results.join("\n"));
