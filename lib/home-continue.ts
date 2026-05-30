import { getLastChatTime, loadChatHistory } from "@/lib/memory";
import { NPC_AVATARS } from "@/lib/npc";
import type { NpcId } from "@/lib/npc";
import { getActiveHomeNpcIds } from "@/lib/home-scenes";

export interface RecentChat {
  npcId: NpcId;
  lastChatTime: number;
  messageCount: number;
  lastMessagePreview: string;
  avatar: string;
}

export function getRecentChats(limit = 2): RecentChat[] {
  return getActiveHomeNpcIds()
    .map((npcId) => {
      const history = loadChatHistory(npcId);
      const lastTime = getLastChatTime(npcId);
      const lastMessage = [...history]
        .reverse()
        .find((message) => typeof message.content === "string" && message.content.trim().length > 0);

      return {
        npcId,
        lastChatTime: lastTime ?? 0,
        messageCount: history.length,
        lastMessagePreview: lastMessage?.content.trim() ?? "",
        avatar: NPC_AVATARS[npcId],
      };
    })
    .filter((chat) => chat.lastChatTime > 0 && chat.messageCount > 0)
    .sort((a, b) => b.lastChatTime - a.lastChatTime)
    .slice(0, limit);
}
