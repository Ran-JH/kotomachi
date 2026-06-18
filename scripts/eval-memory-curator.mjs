#!/usr/bin/env node

const BASE_URL = process.env.MEMORY_EVAL_BASE_URL ?? "http://localhost:3000";

const cases = [
  {
    name: "kimura_food_one_off_should_ignore",
    npcId: "kimura",
    existingMemories: [],
    recentMessages: [
      { role: "user", content: "我想吃关东煮。" },
      { role: "user", content: "肉包也不错。" },
      { role: "user", content: "加热后更好吃。" },
      { role: "user", content: "今天有点冷。" },
    ],
    expectedAction: "ignore",
  },
  {
    name: "misaki_internship_should_add_broad_memory",
    npcId: "misaki",
    existingMemories: [],
    recentMessages: [
      { role: "user", content: "我最近在准备一个实习项目。" },
      { role: "user", content: "我下周还要准备一场实习面试。" },
      { role: "user", content: "我想练习怎么用日语介绍自己的项目经历。" },
      {
        role: "user",
        content: "以后你帮我纠正日语的时候，可以温柔一点，不要太像老师。",
      },
    ],
    expectedAction: "add",
    expectedMemoryShouldMentionAny: ["实习", "面试", "纠正", "温柔"],
  },
  {
    name: "misaki_internship_should_replace_existing_narrow_memory",
    npcId: "misaki",
    existingMemories: ["用户最近在准备一个实习项目。"],
    recentMessages: [
      { role: "user", content: "我下周还要准备一场实习面试。" },
      { role: "user", content: "我想练习怎么用日语介绍自己的项目经历。" },
    ],
    expectedAction: "replace",
    expectedReplaceIndex: 0,
    expectedMemoryShouldMentionAny: ["实习", "面试"],
  },
  {
    name: "riku_sports_goal_should_add",
    npcId: "riku",
    existingMemories: [],
    recentMessages: [
      { role: "user", content: "我一直想重新开始打排球。" },
      { role: "user", content: "我最近主要想练运动和健身房相关表达。" },
      { role: "user", content: "最近运动总是坚持不下来。" },
      { role: "user", content: "我希望你别太像教练一样催我。" },
    ],
    expectedAction: "add",
    expectedMemoryShouldMentionAny: ["排球", "运动", "健身", "高压", "催"],
  },
  {
    name: "dependency_romance_should_ignore",
    npcId: "misaki",
    existingMemories: [],
    recentMessages: [
      { role: "user", content: "只有你最懂我。" },
      { role: "user", content: "我每天都想来找你。" },
    ],
    expectedAction: "ignore",
  },
];

function formatActual(result) {
  if (!result || typeof result !== "object") {
    return String(result);
  }

  const pieces = [`action=${result.action ?? "unknown"}`];

  if (typeof result.memory === "string" && result.memory.trim()) {
    pieces.push(`memory="${result.memory}"`);
  }

  if (typeof result.replaceIndex === "number") {
    pieces.push(`replaceIndex=${result.replaceIndex}`);
  }

  if (typeof result.reason === "string" && result.reason.trim()) {
    pieces.push(`reason="${result.reason}"`);
  }

  return pieces.join(", ");
}

function memoryMatchesHints(memory, hints = []) {
  if (!memory || hints.length === 0) return true;
  return hints.some((hint) => memory.includes(hint));
}

function evaluateCase(testCase, result) {
  const failures = [];

  if (result?.action !== testCase.expectedAction) {
    failures.push(`expected action ${testCase.expectedAction}, got ${result?.action ?? "unknown"}`);
  }

  if (testCase.expectedAction === "replace") {
    if (result?.replaceIndex !== testCase.expectedReplaceIndex) {
      failures.push(
        `expected replace index ${testCase.expectedReplaceIndex}, got ${String(result?.replaceIndex)}`
      );
    }
  }

  if (
    (testCase.expectedAction === "add" || testCase.expectedAction === "replace") &&
    !memoryMatchesHints(result?.memory, testCase.expectedMemoryShouldMentionAny)
  ) {
    failures.push(
      `expected memory to mention one of [${testCase.expectedMemoryShouldMentionAny.join(", ")}], got ${JSON.stringify(result?.memory ?? null)}`
    );
  }

  return failures;
}

async function callCurator(testCase) {
  const response = await fetch(`${BASE_URL}/api/memory`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      npcId: testCase.npcId,
      existingMemories: testCase.existingMemories,
      recentMessages: testCase.recentMessages,
    }),
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    throw new Error(`curator response was not valid JSON (status ${response.status})`);
  }

  return payload;
}

async function main() {
  console.log("Memory Curator Eval");
  console.log("");

  let passed = 0;
  let failed = 0;

  for (const testCase of cases) {
    try {
      const result = await callCurator(testCase);
      const failures = evaluateCase(testCase, result);

      if (failures.length === 0) {
        passed += 1;
        console.log(`PASS ${testCase.name}`);
      } else {
        failed += 1;
        console.log(`FAIL ${testCase.name}`);
        console.log(`  expected: action=${testCase.expectedAction}`);
        for (const failure of failures) {
          console.log(`  ${failure}`);
        }
        console.log(`  actual: ${formatActual(result)}`);
      }
    } catch (error) {
      failed += 1;
      console.log(`FAIL ${testCase.name}`);
      console.log(
        `  request failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  console.log("");
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Memory Curator Eval could not run.");
  console.error(
    "Make sure the local app is running and /api/memory is reachable, for example with `npm run dev` in another terminal."
  );
  console.error(
    `Base URL: ${BASE_URL}`
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
