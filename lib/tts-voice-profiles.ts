import type { NpcId } from "@/lib/npc";

export const TTS_VOICE_PROFILE_VERSION = "v1-2026-06-21";

export type TtsVoiceProfile = {
  profileName: string;
  voiceType: string;
  speedRatio: number;
  pitchRatio: number;
  volumeRatio: number;
  language?: "ja";
};

// 421: default natural female
const FEMALE_NATURAL_VOICE = "BV421_streaming";
// 520: energetic young female, for Aoi
const FEMALE_ENERGETIC_VOICE = "BV520_streaming";
// 521: rejected, too anime-like / too affected
// 700: clear/formal female
const FEMALE_CLEAR_FORMAL_VOICE = "BV700_streaming";
// 522: older/stable female backup
// 524: younger active male
const MALE_YOUNG_ACTIVE_VOICE = "BV524_streaming";
// 702: mature stable male
const MALE_MATURE_STABLE_VOICE = "BV702_streaming";

const NPC_VOICE_PROFILES: Record<NpcId, TtsVoiceProfile> = {
  misaki: {
    profileName: "soft-calm",
    voiceType: FEMALE_NATURAL_VOICE,
    speedRatio: 0.95,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  aoi: {
    profileName: "bright-friendly",
    voiceType: FEMALE_NATURAL_VOICE,
    speedRatio: 1.05,
    pitchRatio: 1.02,
    volumeRatio: 1.01,
    language: "ja",
  },
  haruka: {
    profileName: "clear-light-formal",
    voiceType: FEMALE_CLEAR_FORMAL_VOICE,
    speedRatio: 0.99,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  mao: {
    profileName: "steady-workday",
    voiceType: FEMALE_NATURAL_VOICE,
    speedRatio: 0.99,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  nana: {
    profileName: "gentle-daily",
    voiceType: FEMALE_NATURAL_VOICE,
    speedRatio: 0.99,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  kimura: {
    profileName: "easygoing-coworker",
    voiceType: MALE_YOUNG_ACTIVE_VOICE,
    speedRatio: 1.03,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  taisho: {
    profileName: "steady-grounded",
    voiceType: MALE_MATURE_STABLE_VOICE,
    speedRatio: 0.94,
    pitchRatio: 0.99,
    volumeRatio: 1.0,
    language: "ja",
  },
  ren: {
    profileName: "balanced-natural",
    voiceType: MALE_MATURE_STABLE_VOICE,
    speedRatio: 0.97,
    pitchRatio: 0.99,
    volumeRatio: 1.0,
    language: "ja",
  },
  riku: {
    profileName: "active-natural",
    voiceType: MALE_YOUNG_ACTIVE_VOICE,
    speedRatio: 1.04,
    pitchRatio: 1.0,
    volumeRatio: 1.0,
    language: "ja",
  },
  saku: {
    profileName: "quiet-night",
    voiceType: MALE_MATURE_STABLE_VOICE,
    speedRatio: 0.9,
    pitchRatio: 0.98,
    volumeRatio: 1.0,
    language: "ja",
  },
};

export function getNpcVoiceProfile(npcId: NpcId): TtsVoiceProfile {
  return NPC_VOICE_PROFILES[npcId] ?? NPC_VOICE_PROFILES.misaki;
}
