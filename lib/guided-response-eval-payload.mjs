import { buildChatTurnContract } from "./chat-message-contract.ts";

/** 构造与真实浏览器首轮 Guided 请求相同的 completed history + current text。 */
export function buildGuidedResponseEvalPayload(scene) {
  const completedHistory = [
    {
      role: "assistant",
      content: scene.npcOpening,
      source: "scene",
    },
  ];

  return {
    ...buildChatTurnContract(completedHistory, scene.sampleUserLineJa),
    npcId: scene.npcId,
    memories: [],
    conversationCount: 1,
    lifeArc: "",
    lifeArcState: "",
    crossMentions: [],
    localDateContext: null,
    worldDescription: "",
    worldReaction: "",
    activeSceneId: scene.id,
  };
}
