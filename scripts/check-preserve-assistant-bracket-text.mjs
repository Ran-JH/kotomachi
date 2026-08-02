import assert from "node:assert/strict";

import { sanitizeAssistantSceneText } from "../lib/assistant-scene-text.ts";

const results = [];

function runCase(name, input, expected) {
  assert.equal(sanitizeAssistantSceneText(input), expected);
  results.push(`${name}: PASS`);
}

runCase(
  "Case A - 日语解释括号",
  "JLPT（日本語能力試験）の勉強をしてるの？",
  "JLPT（日本語能力試験）の勉強をしてるの？",
);

runCase(
  "Case B - 自然语气括号",
  "それはちょっと難しいかも（笑）。",
  "それはちょっと難しいかも（笑）。",
);

runCase(
  "Case C - 信息性括号",
  "料金は500円（税込）です。",
  "料金は500円（税込）です。",
);

runCase(
  "Case D - 方括号正文",
  "[AI]という表記を見たよ。",
  "[AI]という表記を見たよ。",
);

runCase(
  "Case E - 普通无括号回复",
  "今日はいい天気だね。",
  "今日はいい天気だね。",
);

runCase(
  "Case F - 多行括号不跨行误删",
  "一段目です（補足\n二段目です）。",
  "一段目です（補足\n二段目です）。",
);

runCase(
  "Case G - 只有括号内容",
  "（そうなんだ）",
  "（そうなんだ）",
);

// 当前没有结构化动作标签，不能稳定区分动作与正文；按安全契约原样保留。
runCase(
  "Case H - 模糊动作标记优先保留",
  "（微笑む）\n[笑う]\n【うなずく】\n*少し考える*",
  "（微笑む）\n[笑う]\n【うなずく】\n*少し考える*",
);

runCase(
  "Case I - 维持首尾 trim 和内部换行",
  "  一行目。\n\n二行目。  ",
  "一行目。\n\n二行目。",
);

console.log(results.join("\n"));
