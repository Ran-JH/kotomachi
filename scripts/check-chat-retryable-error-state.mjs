import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  buildChatTurnContract,
  isFirstGuidedUserTurn,
  toCompletedChatHistory,
} from "../lib/chat-message-contract.ts";
import {
  classifyChatRequestError,
  isCurrentChatRequest,
  readChatAssistantText,
} from "../lib/chat-retryable-error.ts";

const results = [];

async function runCase(name, check) {
  await check();
  results.push(`${name}: PASS`);
}

function response({ ok = true, status = 200, data = { text: "本当の返事" }, jsonError } = {}) {
  return {
    ok,
    status,
    json: async () => {
      if (jsonError) throw jsonError;
      return data;
    },
  };
}

function deferred() {
  let resolvePromise;
  let rejectPromise;
  const promise = new Promise((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });
  return { promise, resolve: resolvePromise, reject: rejectPromise };
}

class ChatHarness {
  constructor({ npcId = "misaki", messages = [], plans = [] } = {}) {
    this.activeNpcId = npcId;
    this.messages = messages.map((message) => ({ ...message }));
    this.storedMessages = messages.map((message) => ({ ...message }));
    this.plans = [...plans];
    this.requests = [];
    this.failedTurn = null;
    this.conversationCount = 0;
    this.ttsCount = 0;
    this.memoryCount = 0;
    this.requestVersion = 0;
    this.generation = 0;
    this.nextId = 1;
    this.mounted = true;
  }

  queue(...plans) {
    this.plans.push(...plans);
  }

  async send(text, { activeSceneId = null } = {}) {
    this.failedTurn = null;
    const completedHistory = toCompletedChatHistory(this.messages);
    const userMessage = {
      id: `user-${this.nextId++}`,
      sender: "user",
      text,
      type: "text",
    };
    this.messages.push(userMessage);
    this.conversationCount += 1;

    const requestBody = {
      ...buildChatTurnContract(completedHistory, text),
      npcId: this.activeNpcId,
      activeSceneId,
    };
    const turn = {
      userMessageId: userMessage.id,
      userText: text,
      completedHistory,
      activeSceneId,
      targetNpcId: this.activeNpcId,
      requestVersion: this.requestVersion,
      requestBody,
    };
    await this.requestAssistant(turn);
  }

  async retry() {
    const turn = this.failedTurn;
    if (!turn) return;
    this.failedTurn = null;
    await this.requestAssistant(turn);
  }

  async requestAssistant(turn) {
    const requestGeneration = ++this.generation;
    const plan = this.plans.shift();
    assert.ok(plan, "mock fetch plan is required");
    this.requests.push(JSON.parse(JSON.stringify(turn.requestBody)));

    const requestIsCurrent = () => isCurrentChatRequest({
      isMounted: this.mounted,
      activeNpcId: this.activeNpcId,
      targetNpcId: turn.targetNpcId,
      currentRequestVersion: this.requestVersion,
      requestVersion: turn.requestVersion,
      currentGeneration: this.generation,
      requestGeneration,
    });

    try {
      const res = await plan(turn.requestBody);
      const text = await readChatAssistantText(res);
      if (!requestIsCurrent()) return;

      this.messages.push({
        id: `assistant-${this.nextId++}`,
        sender: "assistant",
        text,
        type: "voice",
      });
      this.storedMessages = this.messages.map((message) => ({ ...message }));
      this.failedTurn = null;
      this.ttsCount += 1;
      this.memoryCount += 1;
    } catch (error) {
      if (!requestIsCurrent()) return;
      this.failedTurn = {
        ...turn,
        errorCategory: classifyChatRequestError(error, false),
      };
    }
  }

  restart() {
    this.requestVersion += 1;
    this.generation += 1;
    this.failedTurn = null;
    this.messages = [];
  }

  switchNpc(npcId) {
    this.generation += 1;
    this.activeNpcId = npcId;
    this.failedTurn = null;
    this.messages = [];
  }
}

const success = async () => response();
const networkFailure = async () => { throw new TypeError("Failed to fetch"); };

await runCase("Case A - 正常成功", async () => {
  const harness = new ChatHarness({ plans: [success] });
  await harness.send("こんにちは");
  assert.equal(harness.messages.filter((message) => message.sender === "user").length, 1);
  assert.equal(harness.messages.filter((message) => message.sender === "assistant").length, 1);
  assert.equal(harness.failedTurn, null);
  assert.equal(harness.conversationCount, 1);
  assert.equal(harness.ttsCount, 1);
});

await runCase("Case B - 第一次请求失败", async () => {
  const harness = new ChatHarness({ plans: [networkFailure] });
  await harness.send("失敗テスト");
  assert.equal(harness.messages.filter((message) => message.sender === "user").length, 1);
  assert.equal(harness.messages.filter((message) => message.sender === "assistant").length, 0);
  assert.ok(harness.failedTurn);
  assert.equal(harness.ttsCount, 0);
  assert.equal(harness.memoryCount, 0);
  assert.equal(harness.conversationCount, 1);
});

await runCase("Case C - 重试成功", async () => {
  const harness = new ChatHarness({ plans: [networkFailure, success] });
  await harness.send("もう一度");
  await harness.retry();
  assert.equal(harness.messages.filter((message) => message.sender === "user").length, 1);
  assert.equal(harness.messages.filter((message) => message.sender === "assistant").length, 1);
  assert.equal(harness.failedTurn, null);
  assert.equal(harness.conversationCount, 1);
  assert.equal(harness.ttsCount, 1);
  assert.equal(harness.storedMessages.filter((message) => message.sender === "user").length, 1);
});

await runCase("Case D - 连续两次失败", async () => {
  const harness = new ChatHarness({ plans: [networkFailure, networkFailure] });
  await harness.send("二回失敗");
  const originalUserMessageId = harness.failedTurn.userMessageId;
  await harness.retry();
  assert.equal(harness.messages.length, 1);
  assert.equal(harness.failedTurn.userMessageId, originalUserMessageId);
  assert.equal(harness.conversationCount, 1);
  assert.equal(harness.ttsCount, 0);
  assert.equal(harness.memoryCount, 0);
});

await runCase("Case E - Guided 第一轮失败后重试", async () => {
  const sceneOpening = "いらっしゃいませ。今日は何にしますか？";
  const opening = { id: "scene", sender: "assistant", text: sceneOpening, type: "text", source: "scene" };
  const harness = new ChatHarness({ messages: [opening], plans: [networkFailure, success] });
  await harness.send("コーヒーをお願いします", { activeSceneId: "fixture_scene" });
  await harness.retry();
  assert.equal(harness.requests.length, 2);
  for (const request of harness.requests) {
    assert.deepEqual(request.history, [{ role: "assistant", content: sceneOpening, source: "scene" }]);
    assert.equal(request.text, "コーヒーをお願いします");
    assert.equal(isFirstGuidedUserTurn(request.history, sceneOpening), true);
  }
});

await runCase("Case F - 普通连续聊天失败后重试", async () => {
  const prior = [
    { id: "u1", sender: "user", text: "同じ文", type: "text" },
    { id: "a1", sender: "assistant", text: "前の返事", type: "text" },
  ];
  const harness = new ChatHarness({ messages: prior, plans: [networkFailure, success] });
  await harness.send("同じ文");
  await harness.retry();
  assert.deepEqual(harness.requests[0].history, harness.requests[1].history);
  assert.deepEqual(harness.requests[0].history.map((message) => message.content), ["同じ文", "前の返事"]);
  assert.equal(harness.requests[0].text, "同じ文");
});

await runCase("Case G - restart", async () => {
  const pending = deferred();
  const harness = new ChatHarness({ plans: [async () => pending.promise] });
  const request = harness.send("遅い返事");
  harness.restart();
  pending.resolve(response());
  await request;
  assert.equal(harness.failedTurn, null);
  assert.equal(harness.messages.length, 0);
  assert.equal(harness.ttsCount, 0);
  assert.equal(harness.memoryCount, 0);
});

await runCase("Case H - 切换 NPC", async () => {
  const pending = deferred();
  const harness = new ChatHarness({ plans: [async () => pending.promise] });
  const request = harness.send("旧 NPC");
  harness.switchNpc("aoi");
  pending.resolve(response());
  await request;
  assert.equal(harness.activeNpcId, "aoi");
  assert.equal(harness.failedTurn, null);
  assert.equal(harness.messages.length, 0);
  assert.equal(harness.ttsCount, 0);
});

await runCase("Case I - 发送新消息", async () => {
  const harness = new ChatHarness({ plans: [networkFailure, success] });
  await harness.send("旧失败");
  const oldRequest = harness.failedTurn.requestBody;
  await harness.send("新消息");
  assert.equal(harness.failedTurn, null);
  assert.equal(harness.requests.length, 2);
  assert.notDeepEqual(harness.requests[1], oldRequest);
  assert.deepEqual(harness.requests[1].history.map((message) => message.content), ["旧失败"]);
  assert.equal(harness.requests[1].text, "新消息");
});

await runCase("Case J - 刷新", async () => {
  const opening = { id: "opening", sender: "assistant", text: "おかえり", type: "text", source: "welcome" };
  const harness = new ChatHarness({ messages: [opening], plans: [networkFailure] });
  await harness.send("保存されない失敗");
  assert.equal(harness.storedMessages.length, 1);
  const refreshed = new ChatHarness({ messages: harness.storedMessages });
  assert.equal(refreshed.failedTurn, null);
  assert.deepEqual(refreshed.messages, [opening]);
});

await runCase("错误类型统一分类", async () => {
  const timeoutError = Object.assign(new Error("timeout"), { name: "TimeoutError" });
  assert.equal(classifyChatRequestError(timeoutError, false), "timeout");
  assert.equal(classifyChatRequestError(new Error("anything"), true), "timeout");

  for (const status of [500, 502, 504]) {
    await assert.rejects(
      () => readChatAssistantText(response({ ok: false, status, data: { error: "hidden" } })),
      (error) => error.category === "server",
    );
  }

  await assert.rejects(
    () => readChatAssistantText(response({ jsonError: new SyntaxError("bad json") })),
    (error) => error.category === "invalid_response",
  );
  for (const data of [{}, { text: "" }, { text: "   " }, { text: 123 }]) {
    await assert.rejects(
      () => readChatAssistantText(response({ data })),
      (error) => error.category === "invalid_response",
    );
  }
});

await runCase("生产源码边界", async () => {
  const pageSource = readFileSync(resolve("app", "chat", "[npcId]", "page.tsx"), "utf8");
  const copySource = readFileSync(resolve("lib", "ui-copy.ts"), "utf8");
  assert.equal((pageSource.match(/incrementConversationCount\(/g) ?? []).length, 1);
  assert.equal((pageSource.match(/\.\.\.prev, userMsg/g) ?? []).length, 1);
  assert.doesNotMatch(pageSource, /sender: "assistant", text: "ごめん、ちょっと通信が不安定みたい/);
  assert.match(pageSource, /failedChatTurn\?\.userMessageId === msg\.id/);
  assert.match(pageSource, /void requestAssistantReply\(failedTurn\)/);
  assert.match(pageSource, /check triggered after assistant success/);
  assert.match(copySource, /通信暂时不稳定。请重试这条消息。/);
  assert.match(copySource, /The connection was interrupted\. Try sending this message again\./);
});

console.log(results.join("\n"));
