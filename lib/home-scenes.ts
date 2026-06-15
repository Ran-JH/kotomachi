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
      zh: "在熟悉的小店和街角，和街区里的人聊两句。",
      en: "Drop into familiar shops and corners for a short chat.",
    },
    npcIds: ["kimura", "misaki", "taisho", "nana", "ren"],
    status: "active",
  },
  {
    id: "study_abroad",
    title: {
      zh: "校园生活",
      en: "Campus Life",
    },
    subtitle: {
      zh: "沿着言街走到校园边，在研究室、学生休息区和放课后空间里练习日语。",
      en: "Follow Kotomachi toward campus and practice Japanese in labs, student lounges, and after-school spaces.",
    },
    npcIds: ["haruka", "aoi"],
    status: "active",
  },
  {
    id: "work",
    title: {
      zh: "工作和兼职",
      en: "Work and Part-time",
    },
    subtitle: {
      zh: "来到言街的另一端，看看工作场景的正式表达。",
      en: "Walk to the other end of Kotomachi, and see relatively formal expressions in work scenarios.",
    },
    npcIds: ["mao"],
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
