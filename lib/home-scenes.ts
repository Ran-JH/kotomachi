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
  {
    id: "study_abroad",
    title: {
      zh: "留学与校园",
      en: "Study Abroad & Campus",
    },
    subtitle: {
      zh: "在研究室、图书馆和校园角落里，练习留学生活里的日语。",
      en: "Practice campus and graduate-school Japanese in a low-pressure way.",
    },
    npcIds: ["haruka"],
    status: "active",
  },
];

export function getActiveHomeScenes(): HomeScene[] {
  return HOME_SCENES.filter((scene) => scene.status === "active");
}

export function getActiveHomeNpcIds(): NpcId[] {
  const seen = new Set<NpcId>();
  const result: NpcId[] = [];

  for (const scene of getActiveHomeScenes()) {
    for (const npcId of scene.npcIds) {
      if (!seen.has(npcId)) {
        seen.add(npcId);
        result.push(npcId);
      }
    }
  }

  return result;
}
