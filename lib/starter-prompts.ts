import { getNpcState, getWorldContext, type NpcId } from "./npc";

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
  { text: "今日、面白いものを見かけました。", category: "open" },
  { text: "最近、よく考えることがあります。", category: "open" },
  { text: "日本語でどう言えばいいかわからないことがあります。", category: "learning" },
  { text: "今日は短い文から練習したいです。", category: "learning" },
  { text: "言いたいことはあるけど、日本語が出てきません。", category: "learning" },
  { text: "もっと自然な言い方を知りたいです。", category: "learning" },
];

const NPC_STARTER_PROMPTS: Record<NpcId, StarterPrompt[]> = {
  aoi: [
    { text: "最近ハマってるものってある？", category: "npc_flavor" },
    { text: "今日、放課後どうする？", category: "npc_flavor" },
    { text: "知らないジャンルだけど、ちょっと気になってるものがあるんだ。", category: "npc_flavor" },
    { text: "最近、みんな何にハマってる感じ？", category: "npc_flavor" },
    { text: "週末、どこか行く？", category: "npc_flavor" },
    { text: "今日はラウンジでちょっとだらっとしたい気分。", category: "npc_flavor" },
    { text: "最近おすすめされたもの、試してみるか迷ってる。", category: "npc_flavor" },
    { text: "正直あんまり詳しくないけど、聞いてみたい。", category: "npc_flavor" },
    { text: "その話、もうちょっと聞きたいかも。", category: "npc_flavor" },
  ],
  haruka: [
    { text: "日本の大学院って、最初はどんな感じですか。", category: "npc_flavor" },
    { text: "研究室に初めて行くとき、どんなあいさつをすれば自然ですか。", category: "npc_flavor" },
    { text: "ゼミの先輩に、最初どう話しかければいいですか。", category: "npc_flavor" },
    { text: "授業の日本語が速くて、あまり聞き取れません。", category: "npc_flavor" },
    { text: "この論文、ちょっと難しくて、どこから読めばいいかわかりません。", category: "npc_flavor" },
    { text: "発表が近くて、少し緊張しています。", category: "npc_flavor" },
    { text: "先輩に相談したいんですが、重くならない言い方をしたいです。", category: "npc_flavor" },
    { text: "大学の近くで、ひと息つける場所ってありますか。", category: "npc_flavor" },
  ],
  kimura: [
    { text: "今日、夜勤大変そうですね。", category: "npc_flavor" },
    { text: "最近よく売れてるものありますか？", category: "npc_flavor" },
    { text: "ちょっと疲れたので、甘いもの探してます。", category: "npc_flavor" },
    { text: "新商品でおすすめありますか？", category: "npc_flavor" },
    { text: "店の中、今はけっこう動いてますね。", category: "npc_flavor" },
    { text: "今日はさっと何か買って帰りたいです。", category: "npc_flavor" },
    { text: "こんな時間でも、お客さんけっこう来ますか？", category: "npc_flavor" },
    { text: "今日は何も作る気力がなくて、コンビニで済ませたいです。", category: "npc_flavor" },
  ],
  misaki: [
    { text: "カフェでぼーっとする時間が好きです。", category: "npc_flavor" },
    { text: "勉強の合間に少し休みたいです。", category: "npc_flavor" },
    { text: "最近、好きな飲み物が変わりました。", category: "npc_flavor" },
    { text: "静かな場所で話したい気分です。", category: "npc_flavor" },
    { text: "最近、読んでいるものがあります。", category: "npc_flavor" },
    { text: "午後、少しだけ息抜きしたいです。", category: "npc_flavor" },
    { text: "最近、リラックスする方法を探しています。", category: "npc_flavor" },
    { text: "天気がいいと、外に出たくなりますよね。", category: "npc_flavor" },
  ],
  taisho: [
    { text: "仕事や勉強のあとに食べたいものがあります。", category: "npc_flavor" },
    { text: "夜になると、少し話したくなります。", category: "npc_flavor" },
    { text: "最近、夜更かし気味です。", category: "npc_flavor" },
    { text: "今日はちょっと疲れたので、何か温かいものが食べたいです。", category: "npc_flavor" },
    { text: "最近、外食が適当になりがちです。", category: "npc_flavor" },
    { text: "仕事終わりに寄れる場所、ありますか？", category: "npc_flavor" },
    { text: "最近、お酒を飲む機会が減りました。", category: "npc_flavor" },
    { text: "こういう夜に合うもの、何かありますか？", category: "npc_flavor" },
  ],
  nana: [
    { text: "日本に来たばかりなんですけど。", category: "npc_flavor" },
    { text: "生活の小さなことでも、どう聞けばいいのか迷っています。", category: "npc_flavor" },
    { text: "部屋を借りるとき、最初に何を聞けばいいですか。", category: "npc_flavor" },
    { text: "役所でうまく説明できるか少し不安です。", category: "npc_flavor" },
    { text: "この費用は何のためのお金か聞きたいです。", category: "npc_flavor" },
    { text: "もう少しゆっくり説明してほしいです。", category: "npc_flavor" },
    { text: "部屋を借りるときの初期費用って、どういう意味ですか。", category: "npc_flavor" },
    { text: "ゴミの分別について聞きたいです。", category: "npc_flavor" },
    { text: "窓口で何を言われているのか、よくわからなかったです。", category: "npc_flavor" },
    { text: "何かを聞くとき、丁寧に言うにはどうすればいいですか。", category: "npc_flavor" },
  ],
  ren: [
    { text: "最近、行ってみたい場所があります。", category: "npc_flavor" },
    { text: "知らない街を歩くのが好きです。", category: "npc_flavor" },
    { text: "旅行の計画を立てるのが少し苦手です。", category: "npc_flavor" },
    { text: "一人旅に少し興味があります。", category: "npc_flavor" },
    { text: "好きな街の話をしたいです。", category: "npc_flavor" },
    { text: "言街のどんなところが好きですか？", category: "npc_flavor" },
    { text: "前に行った街の話をしたいです。", category: "npc_flavor" },
    { text: "静かで歩きやすい街が好きです。", category: "npc_flavor" },
  ],
  mao: [
    { text: "今日、バイトで少し緊張しました。", category: "npc_flavor" },
    { text: "先輩に確認したいことがあります。", category: "npc_flavor" },
    { text: "仕事の日本語って、まだ少し難しいです。", category: "npc_flavor" },
    { text: "ここまでできたんですが、一度見てもらえますか。", category: "npc_flavor" },
    { text: "すみません、もう少し時間がかかりそうです。", category: "npc_flavor" },
    { text: "お客様に聞かれたんですが、どう答えればいいですか。", category: "npc_flavor" },
    { text: "来週のシフトを少し相談してもいいですか。", category: "npc_flavor" },
    { text: "何か手伝えることはありますか。", category: "npc_flavor" },
    { text: "お先に失礼します。今日はありがとうございました。", category: "npc_flavor" },
    { text: "今日はちょっと疲れました。でも、少し慣れてきた気もします。", category: "npc_flavor" },
  ],
  riku: [
    { text: "最近、運動不足なんです。", category: "npc_flavor" },
    { text: "ジムに行きたいけど、なかなか続きません。", category: "npc_flavor" },
    { text: "今日は脚を少し鍛えました。", category: "npc_flavor" },
    { text: "筋肉痛がけっこうあります。", category: "npc_flavor" },
    { text: "前にやっていた運動をまた始めたいです。", category: "npc_flavor" },
    { text: "久しぶりに走りたいけど、少し不安です。", category: "npc_flavor" },
    { text: "ジムって、最初は何を話せばいいですか。", category: "npc_flavor" },
    { text: "今日はあまり動く気力がありません。", category: "npc_flavor" },
  ],
  saku: [
    { text: "ここ、見つけてよかったんですか。", category: "npc_flavor" },
    { text: "さっきのレシートを拾って、ここに来ました。", category: "npc_flavor" },
    { text: "モクに案内された気がします。", category: "npc_flavor" },
    { text: "見なかったことにしたほうがいいですか。", category: "npc_flavor" },
    { text: "朔さんは、どうして夜に出かけるんですか。", category: "npc_flavor" },
    { text: "この町には、少し奥のほうがあるんですか。", category: "npc_flavor" },
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

  // Saku 是隐藏住民，入口更适合保留“找到这里之后”的语气。
  if (npcId === "saku" && npcPool.length > 0) {
    const offsets = [0, 2, 4];
    const seen = new Set<string>();
    const result: string[] = [];

    for (const offset of offsets) {
      const prompt = npcPool[deterministicIndex(baseSeed, npcPool.length, offset)];
      if (prompt && !seen.has(prompt.text)) {
        seen.add(prompt.text);
        result.push(prompt.text);
      }
    }

    if (result.length < 3) {
      for (const prompt of npcPool) {
        if (!seen.has(prompt.text)) {
          seen.add(prompt.text);
          result.push(prompt.text);
        }
        if (result.length >= 3) break;
      }
    }

    return result.slice(0, 3);
  }

  const g1 = deterministicIndex(baseSeed, globalPool.length, 0);
  const g2 = deterministicIndex(baseSeed, globalPool.length, 7);
  const n1 = deterministicIndex(baseSeed, npcPool.length, 3);

  const picked: StarterPrompt[] = [globalPool[g1], globalPool[g2], npcPool[n1]];

  const seenCategories = new Set(picked.map((p) => p.category));
  if (seenCategories.size < 3 && globalPool.length > 2) {
    const missingCategories = (["daily", "mood", "open", "learning"] as const).filter(
      (category) => !seenCategories.has(category),
    );
    if (missingCategories.length > 0) {
      const category = missingCategories[baseSeed % missingCategories.length];
      const categoryPool = globalPool.filter((prompt) => prompt.category === category);
      if (categoryPool.length > 0) {
        picked[0] = categoryPool[deterministicIndex(baseSeed, categoryPool.length, 11)];
      }
    }
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const prompt of picked) {
    if (!seen.has(prompt.text)) {
      seen.add(prompt.text);
      result.push(prompt.text);
    }
  }

  if (result.length < 3) {
    const allPool = [...globalPool, ...npcPool].filter((prompt) => !seen.has(prompt.text));
    let extra = deterministicIndex(baseSeed, allPool.length, 13);
    while (result.length < 3 && allPool.length > 0) {
      result.push(allPool[extra % allPool.length].text);
      seen.add(allPool[extra % allPool.length].text);
      extra += 1;
    }
  }

  return result.slice(0, 3);
}

function pickBySeed(candidates: string[], seed: number): string {
  if (candidates.length === 0) return "今日はどんな気分ですか？";
  return candidates[Math.abs(seed) % candidates.length];
}

export function getStatusAwareTopicIdea(npcId: NpcId): string {
  const state = getNpcState(npcId);
  const world = getWorldContext();
  const signal = `${state.label} ${state.thought} ${world.reactions[npcId] ?? ""}`.toLowerCase();
  const seed = Math.floor(Date.now() / 86400000) + signal.length + npcId.charCodeAt(0);

  if (/(疲|眠|夜勤|しんど|だる|sleep|tired)/.test(signal)) {
    return pickBySeed(
      [
        "今日って、ちょっと大変でしたか？",
        "最近、ちゃんと休めていますか？",
        "今いちばん気を抜ける時間っていつですか？",
      ],
      seed,
    );
  }

  if (/(締め切り|警戒|テスト|レポート|exam|report|発表)/.test(signal)) {
    return pickBySeed(
      [
        "最近、いちばん気になっていることは何ですか？",
        "今いちばん集中していることって何ですか？",
        "今日の作業は、どのあたりが大変でしたか？",
      ],
      seed,
    );
  }

  if (/(雨|じめ|蒸し暑|秋|冷|coffee|カフェ|ビール|夜更かし)/.test(signal)) {
    return pickBySeed(
      [
        "今日って、どんな過ごし方が合いそうですか？",
        "最近、夜に落ち着く時間はありますか？",
        "この天気だと、どんな話をしたくなりますか？",
      ],
      seed,
    );
  }

  if (npcId === "saku") {
    return pickBySeed(
      [
        "今日は、うまく言えない気持ちや、少し不思議なことを話してみませんか。",
        "何か言い忘れている気がするなら、そのままの形でも大丈夫ですよ。",
        "夢のあとに残った感じや、まだ名前のない気分でも聞かせてください。",
      ],
      seed,
    );
  }

  if (npcId === "aoi") {
    return pickBySeed(
      [
        "最近ハマってるものって、何かありますか？",
        "ちょっと気になってるけど、まだ詳しくないことってありますか？",
        "放課後って、何してることが多いですか？",
      ],
      seed,
    );
  }

  if (npcId === "haruka") {
    return pickBySeed(
      [
        "研究室って、最初はどんなふうに話しかけると自然ですか？",
        "最近、授業とか研究室のことで少し気になってることがあります。",
        "発表とか文献のこと、ちょっと先輩に聞いてみたい気分です。",
      ],
      seed,
    );
  }

  if (npcId === "misaki") {
    return pickBySeed(
      [
        "今日は少し、ゆっくり話したい気分ですか？",
        "最近、落ち着く時間は取れていますか？",
        "今の気分に合う一杯って、どんな感じですか？",
      ],
      seed,
    );
  }

  if (npcId === "kimura") {
    return pickBySeed(
      [
        "今日って、どんな一日でしたか？",
        "最近、生活リズムは安定していますか？",
        "今いちばん気を抜ける時間っていつですか？",
      ],
      seed,
    );
  }

  if (npcId === "nana") {
    return pickBySeed(
      [
        "日本に来たばかりなんですけど。",
        "生活の小さなことでも、どう聞けばいいのか迷っています。",
        "部屋を借りるとき、最初に何を聞けばいいですか。",
      ],
      seed,
    );
  }

  if (npcId === "ren") {
    return pickBySeed(
      [
        "今日は少しどこかに出かけたい気分はありますか？",
        "夜の駅って、少し旅に出たくなる感じがしませんか？",
        "雨の日の街歩きって、好きですか？",
        "週末、近くでも少し出かけたい場所はありますか？",
      ],
      seed,
    );
  }

  if (npcId === "mao") {
    return pickBySeed(
      [
        "今日は、バイトや軽い仕事の場面で、確認したいことを一つだけ真央に聞いてみませんか。",
        "先輩に確認したいことがあります。",
        "仕事の場面で、少し言い方に迷うことはありますか？",
        "ここまで進んだことを、短く真央に話してみませんか。",
      ],
      seed,
    );
  }

  if (npcId === "riku") {
    return pickBySeed(
      [
        "最近、運動不足なんです。",
        "ジムに行きたいけど、なかなか続きません。",
        "今日は脚を少し鍛えました。",
        "前にやっていた運動をまた始めたいです。",
      ],
      seed,
    );
  }

  return pickBySeed(
    [
      "今日って、どんなことをひと息つきたい気分ですか？",
      "最近、夜の過ごし方で変わったことはありますか？",
      "今の気分をひとことで言うと、どんな感じですか？",
    ],
    seed,
  );
}
