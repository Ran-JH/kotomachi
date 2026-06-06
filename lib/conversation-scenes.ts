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
