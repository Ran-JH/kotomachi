import type { NpcId } from "./npc";

type PromptCategory = "daily" | "mood" | "open" | "learning" | "npc_flavor";

interface StarterPrompt {
  text: string;
  category: PromptCategory;
}

const GLOBAL_STARTER_PROMPTS: StarterPrompt[] = [
  { text: "今日は少しだけ話したいです。", category: "daily" },
  { text: "最近、生活リズムが少し崩れています。", category: "daily" },
  { text: "今日は何を話せばいいか迷っています。", category: "daily" },
  { text: "最近、ちょっと考えすぎてしまいます。", category: "mood" },
  { text: "今日は少し疲れているけど、話したい気分です。", category: "mood" },
  { text: "最近、うまく言葉が出てこないです。", category: "mood" },
  { text: "今日はのんびり過ごしたい気分です。", category: "mood" },
  { text: "最近、小さいことで嬉しくなります。", category: "mood" },
  { text: "最近、ちょっと気になっていることがあります。", category: "open" },
  { text: "今日は小さい出来事について話したいです。", category: "open" },
  { text: "最近、習慣にしたいことがあります。", category: "open" },
  { text: "最近、新しいことを始めました。", category: "open" },
  { text: "今日、面白いものを見つけました。", category: "open" },
  { text: "最近、よく考えることがあります。", category: "open" },
  { text: "日本語でどう言えばいいか分からないことがあります。", category: "learning" },
  { text: "今日は短い文から練習したいです。", category: "learning" },
  { text: "言いたいことはあるけど、日本語が出てきません。", category: "learning" },
  { text: "もっと自然な言い方を知りたいです。", category: "learning" },
];

const NPC_STARTER_PROMPTS: Record<NpcId, StarterPrompt[]> = {
  kimura: [
    { text: "コンビニでつい買ってしまうものがあります。", category: "npc_flavor" },
    { text: "夜、何か食べたくなりませんか？", category: "npc_flavor" },
    { text: "最近、新しいお菓子を見つけました。", category: "npc_flavor" },
    { text: "深夜に起きていること、ありますか？", category: "npc_flavor" },
    { text: "最近、生活用品で買い足したいものがあります。", category: "npc_flavor" },
    { text: "朝と夜、どっちが好きですか？", category: "npc_flavor" },
    { text: "最近、ちょっと節約したい気分です。", category: "npc_flavor" },
    { text: "一人の時間、何して過ごしますか？", category: "npc_flavor" },
  ],
  misaki: [
    { text: "カフェでぼーっとする時間が好きです。", category: "npc_flavor" },
    { text: "勉強の合間に少し休みたいです。", category: "npc_flavor" },
    { text: "最近、好きな飲み物が変わりました。", category: "npc_flavor" },
    { text: "静かな場所で過ごしたい気分です。", category: "npc_flavor" },
    { text: "最近、読んでいるものがあります。", category: "npc_flavor" },
    { text: "午後、少しだけ息抜きしたいです。", category: "npc_flavor" },
    { text: "最近、リラックスする方法を探しています。", category: "npc_flavor" },
    { text: "天気がいいと、外に出たくなりますね。", category: "npc_flavor" },
  ],
  taisho: [
    { text: "仕事や勉強のあとに食べたいものがあります。", category: "npc_flavor" },
    { text: "夜になると、少し話したくなります。", category: "npc_flavor" },
    { text: "最近、夜更かしがちです。", category: "npc_flavor" },
    { text: "今日、頑張ったことを話したいです。", category: "npc_flavor" },
    { text: "最近、夕食が適当になりがちです。", category: "npc_flavor" },
    { text: "仕事終わりに寄れる場所、ありますか？", category: "npc_flavor" },
    { text: "最近、お酒を飲む機会が減りました。", category: "npc_flavor" },
    { text: "一日の終わりに、どうやってリセットしますか？", category: "npc_flavor" },
  ],
};

function deterministicIndex(seed: number, len: number, offset: number): number {
  if (len <= 0) return 0;
  return ((seed + offset) % len + len) % len;
}

export function pickStarterPrompts(npcId: NpcId, userMessageCount: number): string[] {
  const daySeed = Math.floor(Date.now() / 86400000);
  const baseSeed = daySeed + userMessageCount + npcId.charCodeAt(0);

  const globalPool = GLOBAL_STARTER_PROMPTS;
  const npcPool = NPC_STARTER_PROMPTS[npcId] ?? [];

  const g1 = deterministicIndex(baseSeed, globalPool.length, 0);
  const g2 = deterministicIndex(baseSeed, globalPool.length, 7);
  const n1 = deterministicIndex(baseSeed, npcPool.length, 3);

  const picked: StarterPrompt[] = [globalPool[g1], globalPool[g2], npcPool[n1]];

  const seenCategories = new Set(picked.map((p) => p.category));
  if (seenCategories.size < 3 && globalPool.length > 2) {
    const missingCategories: PromptCategory[] = ["daily", "mood", "open", "learning"].filter(
      (c) => !seenCategories.has(c)
    );
    if (missingCategories.length > 0) {
      const cat = missingCategories[baseSeed % missingCategories.length];
      const catPool = globalPool.filter((p) => p.category === cat);
      if (catPool.length > 0) {
        picked[0] = catPool[deterministicIndex(baseSeed, catPool.length, 11)];
      }
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of picked) {
    if (!seen.has(p.text)) {
      seen.add(p.text);
      result.push(p.text);
    }
  }

  if (result.length < 3) {
    const allPool = [...globalPool, ...npcPool].filter((p) => !seen.has(p.text));
    let extra = deterministicIndex(baseSeed, allPool.length, 13);
    while (result.length < 3 && allPool.length > 0) {
      result.push(allPool[extra % allPool.length].text);
      seen.add(allPool[extra % allPool.length].text);
      extra++;
    }
  }

  return result.slice(0, 3);
}
