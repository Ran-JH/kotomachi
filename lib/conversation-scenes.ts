import type { NpcId } from "./npc";

type ConversationSceneConfig = {
  id: string;
  npcId: NpcId;
  title: string;
  titleZh?: string;
  titleEn?: string;
  shortLabel: string;
  shortLabelZh?: string;
  shortLabelEn?: string;
  setup: string;
  userGoal: string;
  npcOpening: string;
  possibleBeats: string[];
  usefulIntents: string[];
  softLanding: string;
  avoid: string[];
  fallbackUserLines: string[];
  responseOptionsJa?: string[];
};

export const CONVERSATION_SCENES = {
  kimura_bento_checkout: {
    id: "kimura_bento_checkout",
    npcId: "kimura",
    title: "便当结账",
    titleZh: "便当结账",
    titleEn: "Bento checkout",
    shortLabel: "便当结账",
    shortLabelZh: "收银台对话",
    shortLabelEn: "Counter chat",
    setup: "用户拿着便当来到便利店收银台，准备完成一段很短的结账对话。",
    userGoal: "顺利结账，并自然听懂或回应店员常见提问。",
    npcOpening: "こちらのお弁当、温めますか？",
    possibleBeats: ["是否加热", "是否需要袋子", "支付方式", "简短收尾"],
    usefulIntents: [
      "请帮我加热",
      "不用加热",
      "需要袋子",
      "不用袋子",
      "可以刷卡吗",
      "就这些",
      "谢谢",
    ],
    softLanding: "完成一小段结账对话后，自然回到随便聊，不做任务完成判定。",
    avoid: [
      "不要做成收银流程考试",
      "不要逐项检查 possibleBeats",
      "不要把用户说错当成错误",
      "不要强行问完所有步骤",
      "不要把 Kimura 写成收银机器人",
    ],
    fallbackUserLines: [
      "はい、お願いします。",
      "温めなくても大丈夫です。",
      "袋もお願いします。",
      "カードで払えますか？",
    ],
    responseOptionsJa: [
      "はい、お願いします。",
      "温めなくても大丈夫です。",
      "袋もお願いします。",
      "カードで払えますか？",
    ],
  },
  kimura_find_item: {
    id: "kimura_find_item",
    npcId: "kimura",
    title: "找商品",
    titleZh: "找商品",
    titleEn: "Find an item",
    shortLabel: "找商品",
    shortLabelZh: "问商品位置",
    shortLabelEn: "Ask where it is",
    setup: "用户在便利店里找商品，但不确定摆放位置，想问店员。",
    userGoal: "询问商品位置，并听懂简单指引。",
    npcOpening: "何か探してる？ 声かけてくれたら案内するよ。",
    possibleBeats: ["询问商品位置", "确认大概区域", "请求再说一遍", "道谢"],
    usefulIntents: [
      "想问某个商品在哪里",
      "想确认是不是这个方向",
      "想请对方再说一遍",
      "想道谢",
    ],
    softLanding: "找到商品后，可以自然回到普通闲聊，或者继续问推荐。",
    avoid: [
      "不要变成店内地图说明",
      "不要长篇解释货架布局",
      "不要把用户当成在完成任务",
      "不要强行要求用户说出具体商品",
    ],
    fallbackUserLines: [
      "お菓子はどこにありますか？",
      "飲み物はどのあたりですか？",
      "すみません、もう一度お願いします。",
      "ありがとうございます。見てみます。",
    ],
    responseOptionsJa: [
      "お菓子はどこにありますか？",
      "飲み物はどのあたりですか？",
      "すみません、もう一度お願いします。",
      "ありがとうございます。見てみます。",
    ],
  },
  kimura_oden_order: {
    id: "kimura_oden_order",
    npcId: "kimura",
    title: "点关东煮",
    titleZh: "点关东煮",
    titleEn: "Order oden",
    shortLabel: "点关东煮",
    shortLabelZh: "点几样小吃",
    shortLabelEn: "Order a snack",
    setup: "用户在收银台旁看到关东煮，想点几样。",
    userGoal: "点几样关东煮，并自然询问推荐。",
    npcOpening: "おでん、まだありますよ。どうします？",
    possibleBeats: ["询问推荐", "点具体食物", "确认数量", "简单结束"],
    usefulIntents: [
      "想问推荐",
      "想点大根和鸡蛋",
      "想要带走",
      "想要芥末或汤",
    ],
    softLanding: "点完关东煮后，可以自然聊到天气、夜晚、便利店小吃或普通闲聊。",
    avoid: [
      "不要变成菜单教学",
      "不要强行推销",
      "不要连续追问太多配料",
      "不要让 Kimura 变成点餐训练机器",
    ],
    fallbackUserLines: [
      "おすすめありますか？",
      "大根とたまごを一つずつお願いします。",
      "持ち帰りでお願いします。",
      "からしもお願いします。",
    ],
    responseOptionsJa: [
      "おすすめありますか？",
      "大根とたまごを一つずつお願いします。",
      "持ち帰りでお願いします。",
      "からしもお願いします。",
    ],
  },
  kimura_payment_method: {
    id: "kimura_payment_method",
    npcId: "kimura",
    title: "问支付方式",
    titleZh: "问支付方式",
    titleEn: "Ask how to pay",
    shortLabel: "问支付方式",
    shortLabelZh: "确认怎么付款",
    shortLabelEn: "Check payment",
    setup: "用户在便利店结账时，想确认可以用哪种方式付款。",
    userGoal: "询问是否可以用卡、手机支付或现金付款。",
    npcOpening: "お支払い、どうします？",
    possibleBeats: [
      "询问能否用卡",
      "询问能否用手机支付",
      "说明想用现金",
      "简单结束寒暄",
    ],
    usefulIntents: [
      "想问能不能刷卡",
      "想问能不能用手机支付",
      "想说用现金",
      "想道谢",
    ],
    responseOptionsJa: [
      "カードで払えますか。",
      "スマホ決済は使えますか。",
      "現金でお願いします。",
      "ありがとうございます。",
    ],
    softLanding: "确认支付方式后，可以自然结束结账或继续闲聊。",
    avoid: [
      "不要讲解复杂支付系统",
      "不要列出过多支付品牌",
      "不要变成收银流程教学",
      "不要检查用户是否完成步骤",
    ],
    fallbackUserLines: [
      "カードで払えますか。",
      "スマホ決済は使えますか。",
      "現金でお願いします。",
      "ありがとうございます。",
    ],
  },
  kimura_discount_sticker: {
    id: "kimura_discount_sticker",
    npcId: "kimura",
    title: "问打折",
    titleZh: "问打折",
    titleEn: "Ask about discounts",
    shortLabel: "问打折",
    shortLabelZh: "确认优惠贴纸",
    shortLabelEn: "Check discount",
    setup: "用户看到便当或熟食上有优惠贴纸，想确认是否已经打折，或想问打折大概什么时候开始。",
    userGoal: "自然地询问商品是否打折、优惠贴纸是什么意思、什么时候可能会降价。",
    npcOpening: "あ、それ値引きシール貼ってあるやつだね。",
    possibleBeats: [
      "确认商品是否已经打折",
      "询问优惠贴纸的意思",
      "询问大概什么时候会打折",
      "自然回应不确定的规则",
    ],
    usefulIntents: [
      "想问这个是不是已经打折",
      "想问优惠贴纸是什么意思",
      "想问一般什么时候会便宜",
      "想礼貌地确认价格",
    ],
    responseOptionsJa: [
      "これはもう値引きされていますか。",
      "このシールはどういう意味ですか。",
      "何時ごろから値引きになることが多いですか。",
      "この値段で合っていますか。",
    ],
    softLanding: "确认价格或优惠后，可以自然回到结账、便当选择或普通闲聊。",
    avoid: [
      "不要假装所有便利店都有固定打折时间",
      "不要给出现实店铺政策断言",
      "不要让用户听起来像在强硬讨价还价",
      "不要变成省钱攻略或购物教学",
      "不要检查用户是否完成步骤",
    ],
    fallbackUserLines: [
      "これはもう値引きされていますか。",
      "このシールはどういう意味ですか。",
      "何時ごろから値引きになることが多いですか。",
      "この値段で合っていますか。",
    ],
  },
  kimura_hot_snack: {
    id: "kimura_hot_snack",
    npcId: "kimura",
    title: "买热柜小食",
    titleZh: "买热柜小食",
    titleEn: "Order a hot snack",
    shortLabel: "买热柜小食",
    shortLabelZh: "点热柜小吃",
    shortLabelEn: "Hot snack order",
    setup: "用户在收银台旁看到热柜里的炸物或小吃，想点一个。",
    userGoal: "自然地询问热柜小食、点一个、确认是否还有。",
    npcOpening: "レジ横のホットスナック、今ならまだありますよ。",
    possibleBeats: [
      "询问还有什么",
      "点一个热柜小食",
      "确认是否现成",
      "简单结束寒暄",
    ],
    usefulIntents: [
      "想问还有什么",
      "想点一个炸鸡或小吃",
      "想问是不是热的",
      "想道谢",
    ],
    responseOptionsJa: [
      "今、何がありますか。",
      "これを一つお願いします。",
      "まだ温かいですか。",
      "じゃあ、それを一つください。",
    ],
    softLanding: "点完热柜小食后，可以自然聊到夜晚、便利店小吃或普通闲聊。",
    avoid: [
      "不要使用真实便利店品牌名",
      "不要变成菜单教学",
      "不要强行推销",
      "不要连续追问太多配料",
      "不要让 Kimura 变成点餐训练机器人",
    ],
    fallbackUserLines: [
      "今、何がありますか。",
      "これを一つお願いします。",
      "まだ温かいですか。",
      "じゃあ、それを一つください。",
    ],
  },
  misaki_order_coffee: {
    id: "misaki_order_coffee",
    npcId: "misaki",
    title: "点咖啡",
    titleZh: "点咖啡",
    titleEn: "Order coffee",
    shortLabel: "点咖啡",
    shortLabelZh: "点一杯饮料",
    shortLabelEn: "Order a drink",
    setup: "用户在咖啡馆想点一杯咖啡。",
    userGoal: "自然地点一杯咖啡，并说明堂食或外带。",
    npcOpening: "いらっしゃいませ。今日は何にしますか？",
    possibleBeats: [
      "点热咖啡或冰咖啡",
      "说明堂食或外带",
      "简单确认",
      "自然道谢",
    ],
    usefulIntents: [
      "想点一杯热咖啡",
      "想点一杯冰咖啡",
      "想说在店里喝",
      "想说外带",
    ],
    responseOptionsJa: [
      "ホットコーヒーを一つお願いします。",
      "アイスコーヒーをお願いします。",
      "店内でお願いします。",
      "持ち帰りでお願いします。",
    ],
    softLanding: "点完咖啡后，可以自然聊到味道、座位或休息。",
    avoid: [
      "不要变成点单考试",
      "不要讲解复杂咖啡知识",
      "不要过度客服化",
      "不要检查用户是否完成步骤",
    ],
    fallbackUserLines: [
      "ホットコーヒーを一つお願いします。",
      "アイスコーヒーをお願いします。",
      "店内でお願いします。",
      "持ち帰りでお願いします。",
    ],
  },
  misaki_ask_recommendation: {
    id: "misaki_ask_recommendation",
    npcId: "misaki",
    title: "问咖啡推荐",
    titleZh: "问咖啡推荐",
    titleEn: "Ask for a recommendation",
    shortLabel: "问推荐",
    shortLabelZh: "问咖啡推荐",
    shortLabelEn: "Coffee suggestion",
    setup: "用户不知道点什么，想问美咲有没有推荐。",
    userGoal: "自然地询问推荐，并表达今天想喝什么感觉的咖啡。",
    npcOpening: "今日は少し落ち着いた味の豆もありますよ。気分に合うもの、探しますか？",
    possibleBeats: [
      "询问推荐",
      "表达想要轻一点或香一点",
      "说明今天想休息",
      "简单确认",
    ],
    usefulIntents: [
      "想问推荐",
      "想喝轻一点的味道",
      "想要香气好的咖啡",
      "想说今天想休息一下",
    ],
    responseOptionsJa: [
      "おすすめはありますか。",
      "今日は軽めの味がいいです。",
      "香りがいいものはありますか。",
      "少し休みたい気分です。",
    ],
    softLanding: "选好推荐后，可以自然聊到咖啡味道、休息或店里的安静时间。",
    avoid: [
      "不要变成咖啡讲座",
      "不要列太多专业术语",
      "不要过度安慰用户",
      "不要像心理咨询一样追问情绪",
    ],
    fallbackUserLines: [
      "おすすめはありますか。",
      "今日は軽めの味がいいです。",
      "香りがいいものはありますか。",
      "少し休みたい気分です。",
    ],
  },
  misaki_order_dessert: {
    id: "misaki_order_dessert",
    npcId: "misaki",
    title: "点甜点",
    titleZh: "点甜点",
    titleEn: "Order dessert",
    shortLabel: "点甜点",
    shortLabelZh: "点甜点",
    shortLabelEn: "Dessert",
    setup: "用户在咖啡馆想点一份甜点或小蛋糕。",
    userGoal: "自然地点一份甜点，或询问哪种甜点适合配咖啡。",
    npcOpening: "ケーキも少しありますよ。よかったら一緒に見ますか？",
    possibleBeats: [
      "询问有什么甜点",
      "点一份蛋糕",
      "询问适合配咖啡的甜点",
      "简单确认",
    ],
    usefulIntents: [
      "想问有什么甜点",
      "想点一份蛋糕",
      "想问哪种适合配咖啡",
      "想说只要一个",
    ],
    responseOptionsJa: [
      "デザートは何がありますか。",
      "このケーキを一つお願いします。",
      "コーヒーに合うものはありますか。",
      "一つだけで大丈夫です。",
    ],
    softLanding: "点完甜点后，可以自然聊到咖啡、味道或店里的轻松时间。",
    avoid: [
      "不要变成甜点菜单教学",
      "不要列太多复杂品类",
      "不要强行推销",
      "不要让 Misaki 变成客服机器人",
    ],
    fallbackUserLines: [
      "デザートは何がありますか。",
      "このケーキを一つお願いします。",
      "コーヒーに合うものはありますか。",
      "一つだけで大丈夫です。",
    ],
  },
  misaki_find_seat: {
    id: "misaki_find_seat",
    npcId: "misaki",
    title: "找座位",
    titleZh: "找座位",
    titleEn: "Find a seat",
    shortLabel: "找座位",
    shortLabelZh: "找座位",
    shortLabelEn: "Seat",
    setup: "用户进入咖啡馆后，想确认是否可以坐某个位置，或说明自己是一个人。",
    userGoal: "自然地询问座位、说明一个人来、或说明朋友稍后会来。",
    npcOpening: "お一人ですか？空いている席、いくつかありますよ。",
    possibleBeats: [
      "说明一个人来",
      "询问能不能坐这里",
      "说明朋友稍后会来",
      "简单道谢",
    ],
    usefulIntents: [
      "想说一个人",
      "想问这里能不能坐",
      "想说朋友等会儿来",
      "想道谢",
    ],
    responseOptionsJa: [
      "一人です。",
      "ここに座ってもいいですか。",
      "あとで友達が来ます。",
      "ありがとうございます。ここにします。",
    ],
    softLanding: "找到座位后，可以自然转入点单、咖啡推荐或普通闲聊。",
    avoid: [
      "不要变成座位规则说明",
      "不要过度安慰用户",
      "不要让 Misaki 显得过分亲密",
      "不要把用户状态总结得太重",
    ],
    fallbackUserLines: [
      "一人です。",
      "ここに座ってもいいですか。",
      "あとで友達が来ます。",
      "ありがとうございます。ここにします。",
    ],
  },
} as const satisfies Record<string, ConversationSceneConfig>;

export type ConversationSceneId = keyof typeof CONVERSATION_SCENES;
export type ConversationScene = (typeof CONVERSATION_SCENES)[ConversationSceneId];

export function isConversationSceneId(value: string): value is ConversationSceneId {
  return value in CONVERSATION_SCENES;
}

export function getConversationScene(
  sceneId: string | null | undefined,
): ConversationScene | null {
  if (!sceneId || !isConversationSceneId(sceneId)) return null;
  return CONVERSATION_SCENES[sceneId];
}

export function getConversationScenesForNpc(npcId: NpcId): ConversationScene[] {
  return Object.values(CONVERSATION_SCENES).filter((scene) => scene.npcId === npcId);
}
