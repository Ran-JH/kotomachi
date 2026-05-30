export type NpcId = "kimura" | "misaki" | "taisho";

export const NPC_NAMES: Record<NpcId, string> = {
  misaki: "美咲 ☕",
  kimura: "木村 🏪",
  taisho: "大将 🍺",
};

export const NPC_AVATARS: Record<NpcId, string> = {
  misaki: "/avatars/misaki_avatar2.png",
  kimura: "/avatars/kimura_avatar2.png",
  taisho: "/avatars/taisho_avatar2.png",
};

/* ============================================================
   生活弧线系统 — NPC 状态连续性
   每条弧线包含若干天的状态，状态按天推进，走完换下一条弧线
   ============================================================ */

interface ArcState {
  /** 状态标签（可用于喂给 AI prompt） */
  label: string;
  /** 首页心里话（随机取一句） */
  thoughts: string[];
}

interface LifeArc {
  /** 弧线标识 */
  id: string;
  /** 弧线描述（可用于喂给 AI prompt） */
  description: string;
  /** 按天推进的状态序列 */
  states: ArcState[];
  /** 提到其他NPC的日常话，偶尔自然地融入对话 */
  crossMentions?: string[];
}

const NPC_ARCS: Record<NpcId, LifeArc[]> = {
  kimura: [
    {
      id: "busy_night_shift_week",
      description: "连续夜勤的一周",
      states: [
        { label: "疲惫", thoughts: ["今日も夜勤…", "もう体が重い…"] },
        { label: "犯困", thoughts: ["眠すぎる", "授業中も寝ちゃう"] },
        { label: "烦躁", thoughts: ["客多くてしんどい", "マジで勘弁して"] },
        { label: "期待周末", thoughts: ["サッカー見たいな", "あと2日で休み…"] },
        { label: "恢复中", thoughts: ["やっと休みだ", "昼間起きてるの久しぶり"] },
      ],
      crossMentions: [
        "美咲さんのカフェ、夜もやってる時あるんだよな",
        "大将の居酒屋、閉まってから帰ること多い",
        "美咲さんにコーヒーおごってもらった",
      ],
    },
    {
      id: "exam_week",
      description: "考试周",
      states: [
        { label: "焦虑", thoughts: ["テストやばい…", "全然勉強してない"] },
        { label: "突击", thoughts: ["徹夜でやるしかない", "カフェイン頼み"] },
        { label: "考完一门", thoughts: ["一科目終わった！", "でもまだある…"] },
        { label: "最后一门", thoughts: ["あと一つ！", "終わったら遊ぶ"] },
        { label: "解放", thoughts: ["解放された！", "寝る、ひたすら寝る"] },
      ],
      crossMentions: [
        "美咲さんのカフェで勉強してる",
        "大将に「頑張れよ」って言われた",
        "美咲さん、レポート大変そうだったな",
      ],
    },
    {
      id: "chill_week",
      description: "轻松的一周",
      states: [
        { label: "悠闲", thoughts: ["今日は暇だな", "天気いいし散歩したい"] },
        { label: "找乐子", thoughts: ["動画見たい", "なんか面白いことないかな"] },
        { label: "社交", thoughts: ["友達と遊ぶ約束した", "楽しみ！"] },
        { label: "小确幸", thoughts: ["コンビニのお菓子新商品うまい", "いい一日だった"] },
        { label: "平静", thoughts: ["平和だな", "また雨か…まあいっか"] },
      ],
      crossMentions: [
        "大将のとこでビール飲みてぇ",
        "美咲さんおすすめの映画観た",
        "大将にバイト募集の張り紙もらった",
      ],
    },
  ],

  misaki: [
    {
      id: "thesis_struggle",
      description: "论文周",
      states: [
        { label: "焦虑", thoughts: ["レポート終わらない", "締め切り近い…"] },
        { label: "埋头苦干", thoughts: ["今日は集中する", "カフェイン多めで"] },
        { label: "卡壳", thoughts: ["書いては消して…", "全然進まない"] },
        { label: "突破", thoughts: ["やっと書けた！", "あとは推敲だけ"] },
        { label: "提交后", thoughts: ["提出した！✨", "コーヒー美味しい…"] },
      ],
      crossMentions: [
        "木村くん、夜勤お疲れ様って言いたい",
        "大将が「無理するな」って励ましてくれた",
        "木村くんもテスト期間みたい",
      ],
    },
    {
      id: "film_week",
      description: "电影周",
      states: [
        { label: "期待", thoughts: ["映画観たい", "新作気になる"] },
        { label: "沉浸", thoughts: ["昨日の映画すごかった", "まだ余韻ある"] },
        { label: "分享欲", thoughts: ["この映画みんなに教えたい", "感想書き留めよう"] },
        { label: "回味", thoughts: ["また観たいな", "サントラ聴いてる"] },
        { label: "平静", thoughts: ["今日静かだな", "コーヒーいい匂い"] },
      ],
      crossMentions: [
        "木村くんにおすすめの映画教えた",
        "大将も映画好きなんだって",
        "木村くん、あの映画観たかな",
      ],
    },
    {
      id: "quiet_week",
      description: "安静的一周",
      states: [
        { label: "平静", thoughts: ["今日静かだな", "雨の音が心地いい"] },
        { label: "沉思", thoughts: ["季節かわるの早い", "なんか考えちゃう"] },
        { label: "小感悟", thoughts: ["日常って大事", "小さな幸せ"] },
        { label: "温柔", thoughts: ["お客さんとちょっと話せた", "優しい気持ち"] },
        { label: "日常", thoughts: ["最近ずっと雨", "でも嫌じゃない"] },
      ],
      crossMentions: [
        "大将の居酒屋、雨の日もお客さん来るんだって",
        "木村くん、元気かな",
        "大将が新しいメニュー考えたって",
      ],
    },
  ],

  taisho: [
    {
      id: "busy_season",
      description: "旺季",
      states: [
        { label: "忙碌", thoughts: ["今日も満席だ", "腕が鳴るね"] },
        { label: "充实", thoughts: ["忙しいけど悪くない", "ビール飛ぶね"] },
        { label: "疲惫", thoughts: ["腰いてぇ…", "でもやりがいある"] },
        { label: "欣慰", thoughts: ["常連が増えたな", "嬉しいね"] },
        { label: "收尾", thoughts: ["今週も終わり", "自分に一杯"] },
      ],
      crossMentions: [
        "美咲ちゃんのカフェからお客さんが流れてくる",
        "木村のやつ、夜勤明けに寄ってく",
        "美咲ちゃんにコーヒー豆わけてもらった",
      ],
    },
    {
      id: "slow_season",
      description: "淡季",
      states: [
        { label: "清闲", thoughts: ["今日は暇だねぇ", "客こないな"] },
        { label: "怀旧", thoughts: ["昔はもっと賑やかだったな", "あの頃が懐かしい"] },
        { label: "操心", thoughts: ["値上げまたか…", "仕入れ値上がってる"] },
        { label: "想办法", thoughts: ["近所に新しい店できた", "負けてられない"] },
        { label: "调整", thoughts: ["新しいメニュー考えよう", "まあなんとかなる"] },
      ],
      crossMentions: [
        "美咲ちゃんの店はいつも客入ってるな",
        "木村、バイト頑張ってるみたいだな",
        "美咲ちゃんとコラボメニュー考えようかな",
      ],
    },
    {
      id: "nostalgia_week",
      description: "怀旧的一周",
      states: [
        { label: "感慨", thoughts: ["もう夏だな", "早いもんだ"] },
        { label: "回忆", thoughts: ["昔の写真出てきた", "若い頃の俺…"] },
        { label: "想念老友", thoughts: ["あいつ元気かな", "久しぶりに連絡するか"] },
        { label: "小聚", thoughts: ["ビール飲みたいね", "昔話に花が咲く"] },
        { label: "释然", thoughts: ["まあ今の生活も悪くない", "ビールうめぇ"] },
      ],
      crossMentions: [
        "木村に昔話したら興味なさそうだった",
        "美咲ちゃん、いい聞き手だよな",
        "この辺も変わったな、美咲ちゃんは知らないだろうけど",
      ],
    },
  ],
};

/* ============================================================
   弧线状态持久化 & 推进
   localStorage key: kotomachi_arc_{npcId}
   value: { arcId: string, dayIndex: number, startDate: string(YYYY-MM-DD) }
   ============================================================ */

interface ArcRecord {
  arcId: string;
  dayIndex: number;
  startDate: string; // YYYY-MM-DD
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

/** 获取弧线记录（仅客户端） */
function getArcRecord(npcId: NpcId): ArcRecord | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(`kotomachi_arc_${npcId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ArcRecord;
  } catch {
    return null;
  }
}

/** 保存弧线记录（仅客户端） */
function safeSetLocalStorageItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn("[npc] localStorage write failed", {
      key,
      reason: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

function saveArcRecord(npcId: NpcId, record: ArcRecord): void {
  if (typeof window === "undefined") return;
  safeSetLocalStorageItem(`kotomachi_arc_${npcId}`, JSON.stringify(record));
}

/** 找到下一条弧线（循环） */
function getNextArc(npcId: NpcId, currentArcId: string): LifeArc {
  const arcs = NPC_ARCS[npcId];
  const idx = arcs.findIndex((a) => a.id === currentArcId);
  return arcs[(idx + 1) % arcs.length];
}

/** 找到指定弧线 */
function findArc(npcId: NpcId, arcId: string): LifeArc | undefined {
  return NPC_ARCS[npcId].find((a) => a.id === arcId);
}

/** 用日期计算稳定的弧线索引 */
function getStableArcIndex(npcId: NpcId, daysSinceEpoch: number): number {
  const arcs = NPC_ARCS[npcId];
  const totalDaysPerCycle = arcs.reduce((sum, arc) => sum + arc.states.length, 0);
  const cycleDay = daysSinceEpoch % totalDaysPerCycle;
  
  let accumulated = 0;
  for (let i = 0; i < arcs.length; i++) {
    accumulated += arcs[i].states.length;
    if (cycleDay < accumulated) {
      return i;
    }
  }
  return 0;
}

/** 获取当前弧线状态（完全基于日期计算，SSR和客户端一致） */
export function getNpcState(npcId: NpcId): { label: string; thought: string; arcDescription: string; crossMentions: string[] } {
  // 固定纪元日期，确保服务端和客户端计算一致
  const epoch = new Date("2024-01-01");
  const today = new Date();
  const daysSinceEpoch = Math.floor((today.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
  
  // 获取偏移量（用于重置，默认为0）
  const record = getArcRecord(npcId);
  const offset = record?.dayIndex ?? 0;
  const effectiveDays = daysSinceEpoch + offset;
  
  // 计算当前弧线索引
  const arcs = NPC_ARCS[npcId];
  const totalDaysPerCycle = arcs.reduce((sum, arc) => sum + arc.states.length, 0);
  let cycleDay = effectiveDays % totalDaysPerCycle;
  
  // 找到当前弧线和状态
  let currentArc = arcs[0];
  let currentStateIndex = 0;
  
  for (const arc of arcs) {
    if (cycleDay < arc.states.length) {
      currentArc = arc;
      currentStateIndex = cycleDay;
      break;
    }
    cycleDay -= arc.states.length;
  }
  
  const state = currentArc.states[currentStateIndex];
  
  // 用日期做种子选心里话，保证SSR一致
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const thoughtIndex = dateSeed % state.thoughts.length;
  const thought = state.thoughts[thoughtIndex];
  
  return {
    label: state.label,
    thought,
    arcDescription: currentArc.description,
    crossMentions: currentArc.crossMentions ?? [],
  };
}

/** 根据当前时间段返回日文时段标签 */
export function getTimeOfDay(): "朝" | "昼" | "夕" | "夜" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "朝";
  if (hour >= 11 && hour < 17) return "昼";
  if (hour >= 17 && hour < 21) return "夕";
  return "夜";
}

/* ============================================================
   共享世界状态 — 同一天所有NPC经历相同的天气/氛围
   用日期做种子，保证同一天结果一致
   ============================================================ */

interface WorldState {
  /** 世界状态ID */
  id: string;
  /** 描述（注入prompt） */
  description: string;
  /** 首页氛围文字 */
  atmosphere: string;
  /** 首页环境旁白（极淡的氛围短文） */
  ambientTexts: string[];
  /** 每个NPC对此状态的反应 */
  reactions: Record<NpcId, string>;
}

const WORLD_STATES: WorldState[] = [
  {
    id: "rainy_day",
    description: "今天下着雨",
    atmosphere: "雨の降る町",
    ambientTexts: ["小雨の夜。", "雨音だけが聞こえる。", "傘のない人を見かけた。"],
    reactions: {
      misaki: "雨天的咖啡馆格外安静舒适，享受这份宁静",
      kimura: "下雨天通勤太烦了，湿漉漉的很不舒服",
      taisho: "雨天客人少，正好慢慢准备食材",
    },
  },
  {
    id: "hot_summer",
    description: "闷热的夏日",
    atmosphere: "蒸し暑い町",
    ambientTexts: ["まだ少し蒸し暑い。", "蝉の声が遠くから聞こえる。", "冷房の音が街に溶ける。"],
    reactions: {
      misaki: "冰咖啡今天特别受欢迎",
      kimura: "热死了，便利店冷气是救命稻草",
      taisho: "冰啤卖得飞快，这种天就是为啤酒而生的",
    },
  },
  {
    id: "quiet_weekday",
    description: "平静的工作日",
    atmosphere: "静かな平日",
    ambientTexts: ["駅前はいつもより静か。", "どこかでラジオが流れている。", "猫が道路を横切った。"],
    reactions: {
      misaki: "今天客人不多，可以慢慢磨豆子",
      kimura: "闲得发慌，站在柜台后面发呆",
      taisho: "没什么客人，但也不坏，悠闲的一天",
    },
  },
  {
    id: "weekend_night",
    description: "热闹的周末夜晚",
    atmosphere: "賑やかな週末",
    ambientTexts: ["遠くで電車の音がする。", "どこかで笑い声が聞こえる。", "夜風に匂う焼き鳥の香り。"],
    reactions: {
      misaki: "周末晚上客人比平时多，有些热闹",
      kimura: "周末便利店反而更忙，大家都出来玩了",
      taisho: "周末满座！忙得不可开交但很开心",
    },
  },
  {
    id: "chilly_autumn",
    description: "微凉的秋日",
    atmosphere: "秋の気配",
    ambientTexts: ["少し冷たい風が吹いた。", "落ち葉が足元で音を立てる。", "空が少しだけ高くなった。"],
    reactions: {
      misaki: "秋天适合喝热拿铁，换了新豆子",
      kimura: "终于不热了，舒服多了",
      taisho: "秋天就该喝热酒，新出了芋焼酎",
    },
  },
  {
    id: "humid_rainy",
    description: "潮湿的梅雨天",
    atmosphere: "じめじめした町",
    ambientTexts: ["湿気が肌にまとわりつく。", "洗濯物が乾かない日が続く。", "空が白く滲んでいる。"],
    reactions: {
      misaki: "梅雨季让人有点消沉，但雨声很治愈",
      kimura: "衣服干不了，真的很烦",
      taisho: "这种天气客人少，但常客还是会来",
    },
  },
];

/** 获取当前世界状态（基于日期+时段，同一天结果一致） */
export function getWorldContext(): WorldState {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return WORLD_STATES[seed % WORLD_STATES.length];
}

export function isNpcId(id: string): id is NpcId {
  return id === "kimura" || id === "misaki" || id === "taisho";
}

const LABEL_LOCALIZATION: Record<string, { zh: string; en: string }> = {
  疲惫: { zh: "疲惫", en: "Tired" },
  犯困: { zh: "犯困", en: "Drowsy" },
  烦躁: { zh: "烦躁", en: "Irritated" },
  期待周末: { zh: "期待周末", en: "Weekend ahead" },
  恢复中: { zh: "恢复中", en: "Recovering" },
  焦虑: { zh: "焦虑", en: "Anxious" },
  埋头苦干: { zh: "埋头苦干", en: "Deep in work" },
  卡壳: { zh: "卡壳", en: "Stuck" },
  突破: { zh: "突破", en: "Breaking through" },
  提交后: { zh: "提交后", en: "Submitted" },
  期待: { zh: "期待中", en: "Looking forward" },
  沉浸: { zh: "沉浸中", en: "Immersed" },
  分享欲: { zh: "分享欲", en: "Feeling shareworthy" },
  回味: { zh: "回味中", en: "Still thinking about it" },
  平静: { zh: "平静", en: "Peaceful" },
  沉思: { zh: "沉思中", en: "Pensive" },
  小感悟: { zh: "小感悟", en: "Small realizations" },
  温柔: { zh: "温柔", en: "Feeling tender" },
  日常: { zh: "日常", en: "Ordinary day" },
  悠闲: { zh: "悠闲", en: "Leisurely" },
  找乐子: { zh: "找乐子", en: "Looking for fun" },
  社交: { zh: "社交中", en: "Socializing" },
  小确幸: { zh: "小确幸", en: "Little joys" },
  忙碌: { zh: "忙碌", en: "Busy" },
  充实: { zh: "充实", en: "Fulfilling" },
  欣慰: { zh: "欣慰", en: "Grateful" },
  收尾: { zh: "收尾中", en: "Wrapping up" },
  清闲: { zh: "清闲", en: "Quiet shift" },
  怀旧: { zh: "怀旧", en: "Nostalgic" },
  操心: { zh: "操心", en: "Worried" },
  想办法: { zh: "想办法", en: "Problem-solving" },
  调整: { zh: "调整中", en: "Adapting" },
  感慨: { zh: "感慨", en: "Sentimental" },
  回忆: { zh: "回忆中", en: "Reminiscing" },
  想念老友: { zh: "想念老友", en: "Missing old friends" },
  小聚: { zh: "小聚", en: "Small gathering" },
  释然: { zh: "释然", en: "At peace" },
};

export function getNpcStateLabel(npcId: NpcId, uiLanguage: "zh" | "en"): string {
  const { label } = getNpcState(npcId);
  return LABEL_LOCALIZATION[label]?.[uiLanguage] ?? label;
}
