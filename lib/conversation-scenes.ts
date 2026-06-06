import type { NpcId } from "./npc";

type ConversationSceneConfig = {
  id: string;
  npcId: NpcId;
  title: string;
  shortLabel: string;
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
    shortLabel: "便当结账",
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
    shortLabel: "找商品",
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
    shortLabel: "点关东煮",
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
