import type {
  VoiceAdviceErrorResponse,
  VoiceAdviceUiLanguage,
} from "@/lib/voice-advice-types";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
]);

const VALID_NPC_IDS = new Set([
  "kimura",
  "misaki",
  "taisho",
  "haruka",
  "aoi",
  "nana",
]);

function toUiLanguage(value: FormDataEntryValue | null): VoiceAdviceUiLanguage {
  return value === "en" ? "en" : "zh";
}

function parseNpcId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  return VALID_NPC_IDS.has(value) ? value : null;
}

function errorResponse(
  status: number,
  code: VoiceAdviceErrorResponse["code"],
  message: string,
): Response {
  return Response.json({ error: message, code }, { status });
}

function isSupportedAudioType(type: string): boolean {
  const normalized = type.toLowerCase().trim();
  return ALLOWED_MIME_TYPES.has(normalized);
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioEntry = formData.get("audio");
    const transcriptEntry = formData.get("transcript");
    const npcIdEntry = formData.get("npcId");
    const uiLanguageEntry = formData.get("uiLanguage");

    const uiLanguage = toUiLanguage(uiLanguageEntry);
    const transcript =
      typeof transcriptEntry === "string" ? transcriptEntry.trim() : "";
    const npcId = parseNpcId(npcIdEntry);

    if (!audioEntry) {
      return errorResponse(
        400,
        "missing_audio",
        uiLanguage === "en"
          ? "Audio is required."
          : "请上传语音音频。",
      );
    }

    if (!(audioEntry instanceof Blob)) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en"
          ? "The uploaded audio is not supported."
          : "上传的音频格式不支持。",
      );
    }

    if (audioEntry.size <= 0 || !isSupportedAudioType(audioEntry.type || "")) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en"
          ? "The uploaded audio is not supported."
          : "上传的音频格式不支持。",
      );
    }

    void transcript;
    void npcId;

    return Response.json(
      {
        error:
          uiLanguage === "en"
            ? "Voice advice is not configured yet."
            : "语音建议暂时还没有接入音频分析能力。",
        code: "voice_advice_not_configured",
      } satisfies VoiceAdviceErrorResponse,
      { status: 501 },
    );
  } catch (error: unknown) {
    console.error("[api/voice-advice] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse(
      500,
      "voice_advice_failed",
      "Voice advice request failed.",
    );
  }
}
