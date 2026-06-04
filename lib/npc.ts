export type NpcId = "aoi" | "haruka" | "kimura" | "misaki" | "taisho";

export const NPC_NAMES: Record<NpcId, string> = {
  aoi: "葵 🎧",
  haruka: "遥 🎓",
  kimura: "木村 🏪",
  misaki: "美咲 ☕",
  taisho: "大将 🍺",
};

export const NPC_DISPLAY_NAMES: Record<NpcId, string> = {
  aoi: "葵",
  haruka: "遥",
  kimura: "木村",
  misaki: "美咲",
  taisho: "大将",
};

export function getNpcDisplayName(npcId: NpcId): string {
  return NPC_DISPLAY_NAMES[npcId];
}

export const NPC_AVATARS: Record<NpcId, string> = {
  aoi: "/avatars/aoi_avatar.png",
  haruka: "/avatars/haruka_avatar.png",
  kimura: "/avatars/kimura_avatar.png",
  misaki: "/avatars/misaki_avatar.png",
  taisho: "/avatars/taisho_avatar.png",
};

interface ArcState {
  label: string;
  thoughts: string[];
}

interface LifeArc {
  id: string;
  description: string;
  states: ArcState[];
  crossMentions?: string[];
}

interface ArcRecord {
  arcId: string;
  dayIndex: number;
  startDate: string;
}

const NPC_ARCS: Record<NpcId, LifeArc[]> = {
  aoi: [
    {
      id: "new_faces_week",
      description: "新学期で顔見知りが少し増えている週",
      states: [
        {
          label: "そわそわ",
          thoughts: ["新しい人が多いと、ちょっと空気が変わるよね。", "今週は話しかける回数が少し多いかも。"],
        },
        {
          label: "にぎやか",
          thoughts: ["人が多いと、それだけでちょっと元気出る。", "放課後のスペース、今日はいつもより賑やか。"],
        },
        {
          label: "ちょい疲れ",
          thoughts: ["楽しいけど、ちょっと人酔いしたかも。", "今日はひとりで落ち着く時間もほしいな。"],
        },
        {
          label: "いい感じ",
          thoughts: ["今週の空気、なんだかちょうどいいかも。", "ちょっとした雑談が増えると、気分も軽い。"],
        },
      ],
      crossMentions: [
        "遥さん、研究室のほうも新学期で少し忙しそうだった。",
        "美咲さんの店、授業終わりの学生が増えてた気がする。",
        "木村くんのコンビニ、放課後に寄る人がいつもより多かったよ。",
      ],
    },
    {
      id: "hobby_binge_week",
      description: "最近ハマっているものに気持ちが寄っている週",
      states: [
        {
          label: "夢中",
          thoughts: ["今ちょっと、好きなものの話ならいくらでもできそう。", "気になるものがあると、つい調べすぎちゃう。"],
        },
        {
          label: "共有したい",
          thoughts: ["これ、誰かにすすめたくなるんだよね。", "好きって言えるものがあると、気分いいな。"],
        },
        {
          label: "軽く空回り",
          thoughts: ["ちょっと一人で盛り上がりすぎたかも。", "相手が知らなくても、うまく話せたらいいんだけど。"],
        },
        {
          label: "落ち着き",
          thoughts: ["熱が少し落ち着いて、今はゆっくり話せそう。", "好きなものの話って、気軽にできるのがいいよね。"],
        },
      ],
      crossMentions: [
        "美咲さんも最近、店で流す音楽を少し変えたって言ってた。",
        "大将のところ、夜にふらっと寄ると妙に落ち着くんだよね。",
        "木村くん、また新しいお菓子見つけたらしいよ。",
      ],
    },
    {
      id: "low_energy_week",
      description: "ちょっとだけ気力が落ちている週",
      states: [
        {
          label: "だるめ",
          thoughts: ["なんか今日は、無理してテンション上げたくないな。", "軽く話せるくらいがちょうどいい日ってあるよね。"],
        },
        {
          label: "共感モード",
          thoughts: ["今日は、頑張りすぎてない人と話したいかも。", "大したことなくても、聞いてもらえると助かる。"],
        },
        {
          label: "ちょい回復",
          thoughts: ["少し話すだけでも、気分って変わるね。", "やっと頭がほどけてきた感じ。"],
        },
        {
          label: "ふつう",
          thoughts: ["ようやく普通のリズムに戻ったかも。", "今日は軽い話なら普通にできそう。"],
        },
      ],
      crossMentions: [
        "遥さんも今週はちょっと忙しそうだったけど、落ち着いてたな。",
        "美咲さんの店でぼーっとするの、たぶん今ちょうどよさそう。",
        "大将のところでだらっと話すのも悪くないかも。",
      ],
    },
  ],
  haruka: [
    {
      id: "presentation_prep_week",
      description: "发表示前で少し気を張っている週",
      states: [
        {
          label: "準備中",
          thoughts: ["発表の流れ、もう一回だけ確認しておこうかな。", "スライド、あと少しだけ直したいかも。"],
        },
        {
          label: "少し緊張",
          thoughts: ["人前で話すの、やっぱり少し緊張しますね。", "質問されたらどう返すか、まだ少し不安です。"],
        },
        {
          label: "収束中",
          thoughts: ["とりあえず形になってきました。", "今日は早めに切り上げたい気分です。"],
        },
        {
          label: "ひと息",
          thoughts: ["発表が終わったら、甘いものでも食べたいですね。", "ちょっと区切りがつくと、少し安心します。"],
        },
      ],
      crossMentions: [
        "美咲さんの店、発表前に静かで落ち着くんですよ。",
        "木村くん、夜まで働いてて大変そうでした。",
        "大将のところで少しだけ気分転換したくなる日もあります。",
      ],
    },
    {
      id: "paper_reading_week",
      description: "文献を読んで頭を整理している週",
      states: [
        {
          label: "読み中",
          thoughts: ["読みたい論文はあるのに、時間が足りないですね。", "今日は文献を開いたまま固まっていました。"],
        },
        {
          label: "少し理解",
          thoughts: ["やっと言いたいことが少し見えてきました。", "難しいけど、分かるとちょっと面白いです。"],
        },
        {
          label: "脳みそ満杯",
          thoughts: ["今日はもう頭がいっぱいです。", "一回コーヒーでも飲んで切り替えたいです。"],
        },
        {
          label: "整理段階",
          thoughts: ["読むだけじゃなくて、ちゃんとまとめないとですね。", "メモだけはきちんと残しておきたいです。"],
        },
      ],
      crossMentions: [
        "美咲さんのコーヒー、文献を読む日に助かります。",
        "木村くんが新しい飲み物すすめてくれました。",
        "大将のところ、夜に少しだけ寄ると気が抜けるんですよ。",
      ],
    },
    {
      id: "new_semester_week",
      description: "新学期で研究室まわりが少しにぎやかな週",
      states: [
        {
          label: "やや忙しい",
          thoughts: ["新しい人が入ると、ちょっと空気が変わりますね。", "今週は説明することが多めです。"],
        },
        {
          label: "先輩モード",
          thoughts: ["最初って、何を聞けばいいか分からないですよね。", "気になることがあれば、遠慮なく聞いてほしいです。"],
        },
        {
          label: "少しにぎやか",
          thoughts: ["キャンパスが少しにぎやかですね。", "新学期の感じ、まだ少しそわそわします。"],
        },
        {
          label: "落ち着き",
          thoughts: ["やっと今週の流れが見えてきました。", "今日は少し普通に話せそうです。"],
        },
      ],
      crossMentions: [
        "美咲さんの店、新学期になると学生さんが増えますよね。",
        "木村くんのコンビニ、放課後はかなり混んでました。",
        "大将のところも、金曜は少しにぎやかそうでした。",
      ],
    },
  ],
  kimura: [
    {
      id: "busy_night_shift_week",
      description: "夜勤続きで少し疲れがたまっている週",
      states: [
        { label: "疲れ気味", thoughts: ["今日も夜勤。", "もう体が重い…"] },
        { label: "眠い", thoughts: ["眠すぎる。", "授業中も寝そうになった。"] },
        { label: "ばたばた", thoughts: ["客多くてしんどい。", "レジがずっと忙しかった。"] },
        { label: "週末待ち", thoughts: ["あと2日で休み。", "休みになったら寝たい。"] },
        { label: "回復中", thoughts: ["やっと少し休めた。", "昼間起きてるの久しぶり。"] },
      ],
      crossMentions: [
        "美咲さんのカフェ、夜もやってる時があるみたい。",
        "大将の店、閉まってから寄ること多い。",
        "美咲さんにコーヒーおごってもらった。",
      ],
    },
    {
      id: "exam_week",
      description: "テストやレポートが気になる週",
      states: [
        { label: "焦り", thoughts: ["テストやばい…", "全然勉強してない。"] },
        { label: "徹夜気味", thoughts: ["また夜ふかしした。", "カフェイン頼り。"] },
        { label: "ひと段落", thoughts: ["一科目終わった。", "でもまだある…"] },
        { label: "最後のひと踏ん張り", thoughts: ["あと一個。", "終わったらだらっとしたい。"] },
        { label: "解放感", thoughts: ["終わった…！", "寝る。ひたすら寝る。"] },
      ],
      crossMentions: [
        "美咲さんのカフェで勉強してる。",
        "大将に『無理すんな』って言われた。",
        "遥さんもレポート大変そうだった。",
      ],
    },
    {
      id: "chill_week",
      description: "比較的ゆるく過ごせる週",
      states: [
        { label: "のんびり", thoughts: ["今日は平和だな。", "天気いいし散歩したい。"] },
        { label: "娯楽モード", thoughts: ["動画見たい。", "なんか面白いことないかな。"] },
        { label: "人と話したい", thoughts: ["友だちと話す気分。", "軽く寄り道したい。"] },
        { label: "小さな満足", thoughts: ["コンビニの新作、意外とうまい。", "今日は悪くない。"] },
        { label: "静か", thoughts: ["静かな一日も悪くない。", "また雨か…まあいいか。"] },
      ],
      crossMentions: [
        "大将のところでビール飲んでた。",
        "美咲さん、おすすめの映画あるって。",
        "葵の話、なんかテンポよくて助かる時ある。",
      ],
    },
  ],
  misaki: [
    {
      id: "thesis_struggle",
      description: "論文やレポートで少し気が張っている週",
      states: [
        { label: "焦り", thoughts: ["レポート終わるかな。", "締め切り近いですね。"] },
        { label: "集中中", thoughts: ["今日は集中する日。", "カフェイン多めで。"] },
        { label: "行き詰まり", thoughts: ["書いては消して、の繰り返しです。", "全然進まない…。"] },
        { label: "突破口", thoughts: ["やっと少し見えてきました。", "あと少しで形になりそう。"] },
        { label: "提出後", thoughts: ["提出した…！", "コーヒーがいつもよりおいしいです。"] },
      ],
      crossMentions: [
        "木村くん、夜勤お疲れ様って言いたくなります。",
        "大将が『無理しすぎるな』って励ましてくれたんです。",
        "遥さんもレポート大変そうでした。",
      ],
    },
    {
      id: "film_week",
      description: "映画や本の余韻を引きずっている週",
      states: [
        { label: "期待", thoughts: ["新作映画、見たいんですよね。", "気になる本もいくつかあります。"] },
        { label: "余韻", thoughts: ["昨日の映画、まだ頭に残ってます。", "こういう余韻って嫌いじゃないです。"] },
        { label: "共有したい", thoughts: ["誰かに感想を話したくなります。", "好きなものの話ってつい長くなります。"] },
        { label: "静かな回味", thoughts: ["また見返したいです。", "音楽だけでも思い出します。"] },
        { label: "落ち着き", thoughts: ["今日は少し静かに過ごしたい気分です。", "コーヒーの香りだけで十分な日もあります。"] },
      ],
      crossMentions: [
        "木村くんにおすすめの映画を聞きました。",
        "大将も意外と映画好きなんですよ。",
        "葵ならこういう話、けっこう拾ってくれそうです。",
      ],
    },
    {
      id: "quiet_week",
      description: "少し静かな日々を楽しんでいる週",
      states: [
        { label: "平静", thoughts: ["今日は静かだな。", "雨の音が心地いいです。"] },
        { label: "考えごと", thoughts: ["季節が変わるのって、少し不思議です。", "なんとなく考え込む日もあります。"] },
        { label: "小さな感謝", thoughts: ["日常って大事ですね。", "小さい幸せに気づける日でした。"] },
        { label: "やわらかい気分", thoughts: ["お客さんと少し話せてよかったです。", "今日はやさしい気分です。"] },
        { label: "ふつう", thoughts: ["最近ずっと雨ですね。", "でも、こういう静けさも嫌いじゃないです。"] },
      ],
      crossMentions: [
        "大将の居酒屋、雨の日でもお客さん来るみたいですね。",
        "木村くん、元気かな。",
        "遥さんが新しいコーヒー豆を気にしてくれていました。",
      ],
    },
  ],
  taisho: [
    {
      id: "busy_season",
      description: "店がよく回っていて忙しい週",
      states: [
        { label: "忙しい", thoughts: ["今日も満席だ。", "腰が鳴るな。"] },
        { label: "充実", thoughts: ["忙しいけど悪くない。", "ビールがうまそうな日だ。"] },
        { label: "疲れ", thoughts: ["ちょっと肩が重いな。", "でも手は止まらん。"] },
        { label: "嬉しい", thoughts: ["常連が来るとやっぱり安心するな。", "にぎやかな夜は嫌いじゃない。"] },
        { label: "収束", thoughts: ["今夜も終わった。", "自分にも一杯やりたいな。"] },
      ],
      crossMentions: [
        "美咲の店から流れてくる客もいるんだよな。",
        "木村のやつ、夜勤明けに寄ってくことあるぞ。",
        "遥もたまに研究の帰りで顔出すんだ。",
      ],
    },
    {
      id: "slow_season",
      description: "少し静かで様子見の週",
      states: [
        { label: "暇め", thoughts: ["今日は静かだな。", "客来ない日もある。"] },
        { label: "懐かしい気分", thoughts: ["昔はもっと賑やかだったな。", "あの頃の話、たまに思い出す。"] },
        { label: "やりくり", thoughts: ["仕入れ値も上がってるしな。", "無駄なく回さないと。"] },
        { label: "工夫中", thoughts: ["新しい小皿でも考えるか。", "季節も少し変わってきたな。"] },
        { label: "落ち着き", thoughts: ["こういう夜も悪くない。", "静かな時間にしかできないこともある。"] },
      ],
      crossMentions: [
        "美咲の店は相変わらず落ち着いてるみたいだ。",
        "木村、また夜食探してるらしいな。",
        "葵みたいな若いやつの話を聞くと店の空気も変わる。 ",
      ],
    },
    {
      id: "nostalgia_week",
      description: "少し昔を思い出しやすい週",
      states: [
        { label: "感慨", thoughts: ["もう夏か。", "時間って早いもんだな。"] },
        { label: "回想", thoughts: ["昔の写真でも出てきた。", "若い頃の話って急に思い出すんだよ。"] },
        { label: "人恋しい", thoughts: ["誰かとだらっと話したい夜だ。", "こういう日は店がちょうどいい。"] },
        { label: "小さな集まり気分", thoughts: ["ビール飲みながら昔話でもしたいな。", "静かに話せる客がいると助かる。"] },
        { label: "釈然", thoughts: ["まあ今の生活も悪くない。", "結局、今夜も一日だ。"] },
      ],
      crossMentions: [
        "木村に昔話したら、案外ちゃんと聞いてたぞ。",
        "美咲は聞き上手だからな。",
        "遥や葵みたいな若い連中を見ると、街もまだ元気だと思う。",
      ],
    },
  ],
};

function loadArcOffset(npcId: NpcId): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(`kotomachi_arc_${npcId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as Partial<ArcRecord>;
    return typeof parsed.dayIndex === "number" ? parsed.dayIndex : 0;
  } catch {
    return 0;
  }
}

export function getNpcState(
  npcId: NpcId,
): { label: string; thought: string; arcDescription: string; crossMentions: string[] } {
  const epoch = new Date("2024-01-01T00:00:00");
  const today = new Date();
  const daysSinceEpoch = Math.floor((today.getTime() - epoch.getTime()) / (1000 * 60 * 60 * 24));
  const offset = loadArcOffset(npcId);
  const effectiveDays = daysSinceEpoch + offset;

  const arcs = NPC_ARCS[npcId];
  const totalDaysPerCycle = arcs.reduce((sum, arc) => sum + arc.states.length, 0);
  let cycleDay = ((effectiveDays % totalDaysPerCycle) + totalDaysPerCycle) % totalDaysPerCycle;

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
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const thoughtIndex = dateSeed % state.thoughts.length;

  return {
    label: state.label,
    thought: state.thoughts[thoughtIndex],
    arcDescription: currentArc.description,
    crossMentions: currentArc.crossMentions ?? [],
  };
}

export function getTimeOfDay(): "朝" | "昼" | "夕" | "夜" {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return "朝";
  if (hour >= 11 && hour < 17) return "昼";
  if (hour >= 17 && hour < 21) return "夕";
  return "夜";
}

interface WorldState {
  id: string;
  description: string;
  atmosphere: string;
  ambientTexts: string[];
  reactions: Record<NpcId, string>;
}

const WORLD_STATES: WorldState[] = [
  {
    id: "rainy_day",
    description: "今日は雨が降っている。",
    atmosphere: "雨の降る日",
    ambientTexts: ["小雨の夜。", "遠くで傘を閉じる音がした。", "雨の匂いが少し濃い。"],
    reactions: {
      aoi: "雨の日って、学生ラウンジでだらっと話したくなるんだよね。",
      haruka: "雨の日は研究室も少し静かで、集中しやすいですね。",
      misaki: "雨の日は店の空気が少しやわらかくなる気がします。",
      kimura: "雨の日の通勤、ほんとにちょっと面倒なんだよね。",
      taisho: "雨の日は客足ゆっくりだけど、そのぶん話せる夜でもあるな。",
    },
  },
  {
    id: "hot_summer",
    description: "蒸し暑い日が続いている。",
    atmosphere: "蒸し暑い日",
    ambientTexts: ["空気がむっとしている。", "遠くで蝉が鳴いている。", "冷たい飲み物がほしくなる。"],
    reactions: {
      aoi: "この暑さだと、外より中でだらっとしたくなるかも。",
      haruka: "この暑さだと、研究室まで歩くだけで少し疲れますね。",
      misaki: "今日は冷たい一杯のほうが合いそうですね。",
      kimura: "暑すぎて、コンビニの冷ケースの前から動きたくない。",
      taisho: "こういう日は、冷えたビールがいちばんだろ。",
    },
  },
  {
    id: "quiet_weekday",
    description: "少し静かな平日。",
    atmosphere: "静かな平日",
    ambientTexts: ["駅前がいつもより静か。", "遠くで電車の音だけがする。", "空気が少し平たい。"],
    reactions: {
      aoi: "こういう静かな日って、だらっと話すにはちょうどいいね。",
      haruka: "こんな静かな日は、文献を読むにはちょうどいいです。",
      misaki: "店も少し静かで、コーヒーの香りがよく残ります。",
      kimura: "今日は変に暇で、逆にぼーっとする。",
      taisho: "こういう日は仕込みを丁寧にやるに限るな。",
    },
  },
  {
    id: "weekend_night",
    description: "週末の夜で少しにぎやか。",
    atmosphere: "にぎやかな週末",
    ambientTexts: ["遠くで笑い声がした。", "夜風に食べ物の匂いが混じっている。", "駅前がいつもより明るい。"],
    reactions: {
      aoi: "週末の夜って、なんとなく誰かと話したくならない？",
      haruka: "週末でも、少しだけ研究室に寄る日もあるんです。",
      misaki: "週末の夜は、少しだけ人の流れが変わりますね。",
      kimura: "週末の夜は、コンビニもなんだかんだ忙しい。",
      taisho: "週末はやっぱり夜が本番だな。",
    },
  },
  {
    id: "chilly_autumn",
    description: "少しひんやりした秋の日。",
    atmosphere: "秋の気配",
    ambientTexts: ["風が少し冷たい。", "落ち葉が端にたまっている。", "空が高く見える。"],
    reactions: {
      aoi: "秋って、なんか話しやすい空気になる気がする。",
      haruka: "秋になると、キャンパスを歩くだけでも少し落ち着きますね。",
      misaki: "こういう日は、熱いコーヒーがしっくりきます。",
      kimura: "やっと暑くなくなって助かる。",
      taisho: "秋は熱燗の話をしたくなるな。",
    },
  },
  {
    id: "humid_rainy",
    description: "じめっとした梅雨の空気。",
    atmosphere: "じめじめした日",
    ambientTexts: ["空気が重い。", "髪が少しまとまりにくい。", "街全体がゆっくりしている。"],
    reactions: {
      aoi: "このじめっとした感じ、妙にだるくならない？",
      haruka: "梅雨の時期って、なんとなく肩も重くなりますよね。",
      misaki: "こういう日は、静かに過ごしたくなります。",
      kimura: "服が乾かないのが一番しんどい。",
      taisho: "梅雨どきは、店の灯りがちょっとありがたいんだよな。",
    },
  },
];

export function getWorldContext(): WorldState {
  const now = new Date();
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return WORLD_STATES[seed % WORLD_STATES.length];
}

export function isNpcId(id: string): id is NpcId {
  return id === "aoi" || id === "haruka" || id === "kimura" || id === "misaki" || id === "taisho";
}

const HOME_CARD_LINES: Record<NpcId, string[]> = {
  aoi: [
    "最近ハマってるものの話って、つい長くなるんだよね。",
    "放課後って、ちょっとだらっと話せる時間があると助かる。",
    "知らないジャンルでも、話を聞くのはけっこう好きかも。",
    "おすすめって、軽く聞ける相手がいるとちょうどいいよね。",
    "今日はちょっとゆるい話をしたい気分かも。",
    "気になるけど詳しくない、みたいな話もわりと好き。",
    "最近、友だちっぽく自然に話せる相手って大事だなって思う。",
    "放課後の共有スペースって、なんとなく話しやすい空気があるよね。",
  ],
  haruka: [
    "研究室の空気って、慣れるまで少し緊張しますよね。",
    "発表前って、ちょっとした雑談でも助かる気がします。",
    "文献を読んでいると、急に眠くなる日もあります。",
    "最初の相談って、何から話せばいいか迷いますよね。",
    "キャンパスのカフェ、考えごとを整理するのにちょうどいいです。",
    "研究の話じゃなくても、気楽に話して大丈夫ですよ。",
    "授業と研究室のこと、言い方を一緒に考えるのも好きです。",
    "留学前って、細かいことでも不安になりやすいですよね。",
  ],
  kimura: [
    "最近新しいお菓子入ったんだけど、試してみる？",
    "雨の日って、コンビニの明かりが少し落ち着くんだよね。",
    "今日は店が静かで、少しぼんやりしてます。",
    "夜勤明けでちょっと眠い…でも元気はあるよ。",
    "コンビニの定番って、意外と飽きないんだよね。",
    "お客さんの話を聞くの、けっこう好きなんだよ。",
    "今日は特別忙しくないから、ゆっくり話せるよ。",
    "天気悪い日は、温かいコーヒーが妙に合う。",
  ],
  misaki: [
    "今日のエスプレッソ、抽出時間ちょうどいい感じです。",
    "雨の日は、深煎りの香りがよく似合いますね。",
    "少し静かな時間に、ゆっくり話せるのが好きです。",
    "新しい豆を入れたので、香りだけでも試してみますか。",
    "窓の外を見ながら、ぼんやりするのも悪くないですね。",
    "コーヒー豆の産地の話、ちょっとだけなら話せますよ。",
    "今日は手作りのクッキーもあります。",
    "ていねいな時間って、たまに必要ですよね。",
  ],
  taisho: [
    "晩酌のお供に、何か軽くつまむか？",
    "雨宿りがてら、ちょっと話していきゃいい。",
    "今夜はしっかりうまいもん用意してるぞ。",
    "新しい小鉢、試してみるか？",
    "常連が来ると、やっぱり空気がやわらぐな。",
    "だらっと飲みながら話す夜も悪くないだろ。",
    "この天気だと、店のあったかさが分かるよな。",
    "昨日の続きでも、今日の話でもかまわんよ。",
  ],
};

export function getNpcHomeCardLine(npcId: NpcId): string {
  const today = new Date();
  const dateSeed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const lines = HOME_CARD_LINES[npcId];
  const index = dateSeed % lines.length;
  return lines[index];
}
