import type { NpcId } from "@/lib/npc";

export const TTS_VOICE_PROFILE_VERSION = "v0-2026-06-21";

export type TtsVoiceProfile = {
  profileName: string;
  voiceType: string;
  speedRatio: number;
  pitchRatio: number;
  volumeRatio: number;
  language?: "ja";
};

const FEMALE_CLASSIC_VOICE = "BV421_streaming";
const MALE_CLASSIC_VOICE = "BV524_streaming";

const NPC_VOICE_PROFILES: Record<NpcId, TtsVoiceProfile> = {
  misaki: {
    profileName: "soft-calm",
    voiceType: FEMALE_CLASSIC_VOICE,
    speedRatio: 0.94,
    pitchRatio: 1.03,
    volumeRatio: 0.99,
    language: "ja",
  },
  aoi: {
    profileName: "bright-friendly",
    voiceType: FEMALE_CLASSIC_VOICE,
    speedRatio: 1.05,
    pitchRatio: 1.05,
    volumeRatio: 1.0,
    language: "ja",
  },
  haruka: {
    profileName: "clear-light-formal",
    voiceType: FEMALE_CLASSIC_VOICE,
    speedRatio: 0.99,
    pitchRatio: 0.99,
    volumeRatio: 1.0,
    language: "ja",
  },
  mao: {
    profileName: "steady-workday",
    voiceType: FEMALE_CLASSIC_VOICE,
    speedRatio: 0.98,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  nana: {
    profileName: "gentle-daily",
    voiceType: FEMALE_CLASSIC_VOICE,
    speedRatio: 0.99,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  kimura: {
    profileName: "easygoing-coworker",
    voiceType: MALE_CLASSIC_VOICE,
    speedRatio: 1.06,
    pitchRatio: 0.99,
    volumeRatio: 1.0,
    language: "ja",
  },
  taisho: {
    profileName: "steady-grounded",
    voiceType: MALE_CLASSIC_VOICE,
    speedRatio: 0.93,
    pitchRatio: 0.93,
    volumeRatio: 1.01,
    language: "ja",
  },
  ren: {
    profileName: "balanced-natural",
    voiceType: MALE_CLASSIC_VOICE,
    speedRatio: 1.0,
    pitchRatio: 0.99,
    volumeRatio: 1.0,
    language: "ja",
  },
  riku: {
    profileName: "active-natural",
    voiceType: MALE_CLASSIC_VOICE,
    speedRatio: 1.04,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  saku: {
    profileName: "quiet-night",
    voiceType: MALE_CLASSIC_VOICE,
    speedRatio: 0.92,
    pitchRatio: 0.95,
    volumeRatio: 0.99,
    language: "ja",
  },
};

export function getNpcVoiceProfile(npcId: NpcId): TtsVoiceProfile {
  return NPC_VOICE_PROFILES[npcId] ?? NPC_VOICE_PROFILES.misaki;
}
