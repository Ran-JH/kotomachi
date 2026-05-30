import type { NpcId } from "./npc";

export type HomeSceneId = "daily" | "study_abroad" | "work";

export type LocalizedText = {
  zh: string;
  en: string;
};

export type HomeSceneStatus = "active" | "coming_soon";

export type HomeScene = {
  id: HomeSceneId;
  title: LocalizedText;
  subtitle: LocalizedText;
  npcIds: NpcId[];
  status: HomeSceneStatus;
};

export const HOME_SCENES: HomeScene[] = [
  {
    id: "daily",
    title: {
      zh: "日常生活",
      en: "Daily Life",
    },
    subtitle: {
      zh: "在熟悉的小店里，和街上的住人聊两句。",
      en: "Chat with neighbors in familiar everyday places.",
    },
    npcIds: ["kimura", "misaki", "taisho"],
    status: "active",
  },
];

export function getActiveHomeScenes(): HomeScene[] {
  return HOME_SCENES.filter((scene) => scene.status === "active");
}
