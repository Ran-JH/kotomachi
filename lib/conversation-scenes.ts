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
};

export const CONVERSATION_SCENES = {
  kimura_bento_checkout: {
    id: "kimura_bento_checkout",
    npcId: "kimura",
    title: "买便当结账",
    shortLabel: "买便当结账",
    setup: "用户拿着便当来到便利店收银台，准备完成一个很短的结账对话。",
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
      "不要把 Kimura 写成收银机器",
    ],
    fallbackUserLines: [
      "はい、お願いします。",
      "温めなくても大丈夫です。",
      "袋もお願いします。",
      "カードで払えますか。",
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
