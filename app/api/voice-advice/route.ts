import { createRequire } from "node:module";
import type {
  VoiceAdviceErrorResponse,
  VoiceAdviceResponse,
  VoiceAdviceUiLanguage,
} from "@/lib/voice-advice-types";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);

const ALLOWED_WAV_MIME_TYPES = new Set([
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
]);

const VALID_NPC_IDS = new Set([
  "kimura",
  "misaki",
  "taisho",
  "haruka",
  "aoi",
  "nana",
]);

let cachedSpeechSdk: any | null = null;

function toUiLanguage(value: FormDataEntryValue | null): VoiceAdviceUiLanguage {
  return value === "en" ? "en" : "zh";
}

function parseNpcId(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  return VALID_NPC_IDS.has(value) ? value : null;
}

function normalizeMimeType(type: string): string {
  return type.toLowerCase().split(";")[0]?.trim() ?? "";
}

function errorResponse(
  status: number,
  code: VoiceAdviceErrorResponse["code"],
  message: string,
): Response {
  return Response.json({ error: message, code }, { status });
}

function isSupportedAudioType(type: string): boolean {
  return ALLOWED_WAV_MIME_TYPES.has(normalizeMimeType(type));
}

function buildNotConfiguredResponse(uiLanguage: VoiceAdviceUiLanguage): Response {
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
}

function isVoiceAdviceEnabled(): boolean {
  return process.env.VOICE_ADVICE_ENABLED === "true";
}

function isAzureProviderSelected(): boolean {
  return (process.env.VOICE_ADVICE_PROVIDER ?? "").trim().toLowerCase() === "azure";
}

function hasAzureConfig(): boolean {
  return Boolean(process.env.AZURE_SPEECH_KEY?.trim() && process.env.AZURE_SPEECH_REGION?.trim());
}

function loadAzureSpeechSdk(): any {
  if (cachedSpeechSdk) return cachedSpeechSdk;

  const globalWindow = globalThis as typeof globalThis & {
    window?: { SpeechSDK?: any };
  };

  if (!globalWindow.window) {
    globalWindow.window = globalThis as any;
  }

  require("microsoft-cognitiveservices-speech-sdk/distrib/browser/microsoft.cognitiveservices.speech.sdk.bundle.js");

  const sdk = globalWindow.window?.SpeechSDK;
  if (!sdk) {
    throw new Error("azure_speech_sdk_unavailable");
  }

  cachedSpeechSdk = sdk;
  return sdk;
}

type AzureAssessmentWord = {
  Word?: string;
  Syllables?: Array<{
    Syllable?: string;
    PronunciationAssessment?: {
      AccuracyScore?: number;
    };
  }>;
  PronunciationAssessment?: {
    AccuracyScore?: number;
    ErrorType?: string;
  };
};

type AzureAssessmentDetail = {
  PronunciationAssessment?: {
    AccuracyScore?: number;
    FluencyScore?: number;
    CompletenessScore?: number;
    PronScore?: number;
    ProsodyScore?: number;
  };
  NBest?: Array<{
    Words?: AzureAssessmentWord[];
    PronunciationAssessment?: {
      AccuracyScore?: number;
      FluencyScore?: number;
      CompletenessScore?: number;
      PronScore?: number;
      ProsodyScore?: number;
    };
  }>;
};

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function averageScore(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function countWordSignals(detail: AzureAssessmentDetail | null | undefined): {
  totalWords: number;
  issueWords: number;
  syllableSignals: number;
} {
  const words = detail?.NBest?.[0]?.Words ?? [];
  let issueWords = 0;
  let syllableSignals = 0;

  for (const word of words) {
    if (word?.PronunciationAssessment?.ErrorType && word.PronunciationAssessment.ErrorType !== "None") {
      issueWords += 1;
    }
    const syllables = word?.Syllables ?? [];
    for (const syllable of syllables) {
      if (toNumber(syllable?.PronunciationAssessment?.AccuracyScore) !== null) {
        syllableSignals += 1;
      }
    }
  }

  return {
    totalWords: words.length,
    issueWords,
    syllableSignals,
  };
}

function buildAzureAssessmentSummary(detail: AzureAssessmentDetail | null | undefined) {
  const pa = detail?.PronunciationAssessment ?? detail?.NBest?.[0]?.PronunciationAssessment;
  const accuracy = toNumber(pa?.AccuracyScore);
  const fluency = toNumber(pa?.FluencyScore);
  const completeness = toNumber(pa?.CompletenessScore);
  const pron = toNumber(pa?.PronScore);
  const prosody = toNumber(pa?.ProsodyScore);
  const wordSignals = countWordSignals(detail);

  return {
    accuracy,
    fluency,
    completeness,
    pron,
    prosody,
    wordSignals,
    overall: averageScore([accuracy, fluency, completeness, pron, prosody]),
  };
}

function adviceText(
  uiLanguage: VoiceAdviceUiLanguage,
  zh: string,
  en: string,
): string {
  return uiLanguage === "en" ? en : zh;
}

function mapAssessmentToAdvice(
  uiLanguage: VoiceAdviceUiLanguage,
  transcript: string,
  detail: AzureAssessmentDetail | null | undefined,
): VoiceAdviceResponse {
  const summary = buildAzureAssessmentSummary(detail);
  const lowConfidence =
    summary.overall === null ||
    (summary.accuracy !== null && summary.accuracy < 70) ||
    (summary.completeness !== null && summary.completeness < 70);
  const mediumConfidence =
    !lowConfidence &&
    ((summary.overall !== null && summary.overall < 82) ||
      (summary.fluency !== null && summary.fluency < 78) ||
      summary.wordSignals.issueWords > 0);
  const strongFluencySignal = summary.fluency !== null && summary.fluency < 72;
  const strongCompletenessSignal = summary.completeness !== null && summary.completeness < 72;
  const strongProsodySignal = summary.prosody !== null && summary.prosody < 72;

  const summaryText = lowConfidence
    ? adviceText(
        uiLanguage,
        "整体来看，系统对这句的稳定听清度还不算高，但这不一定代表发音本身有问题，也可能和录音或识别有关。",
        "Overall, the system did not recognize this line very consistently, but that does not necessarily mean the pronunciation itself was wrong; it may also be affected by recording quality or recognition.",
      )
    : mediumConfidence
      ? adviceText(
          uiLanguage,
          "整体能跟上意思，但有几处听感还可以再稳一点。",
          "The meaning came through overall, but a few parts could sound a bit steadier.",
        )
      : adviceText(
          uiLanguage,
          "整体听感比较稳定，继续保持这个节奏就很好。",
          "Overall, the speaking sounded fairly steady. Keeping this rhythm would work well.",
        );

  const clarityText = lowConfidence
    ? adviceText(
        uiLanguage,
        "系统可能没有稳定听清这里，不一定是发音问题，也可能和录音或识别有关。",
        "The system may not have recognized this part consistently; it may also be affected by recording quality or recognition.",
      )
    : summary.wordSignals.issueWords > 0
      ? adviceText(
          uiLanguage,
          "有些词的边界或结尾可能不够稳定，可以再说得稍微清楚一点。",
          "Some word boundaries or endings may not have been stable, so you could make them a little clearer next time.",
        )
      : adviceText(
          uiLanguage,
          "整体清楚度不错，主要是保持现在的节奏。",
          "Clarity is mostly good overall; the main thing is to keep this pace.",
        );

  const paceText = strongFluencySignal
    ? adviceText(
        uiLanguage,
        "语速偏快一点，句子中间可以留一个小停顿。",
        "The pace sounds a little fast; try leaving a small pause in the middle of the sentence.",
      )
    : strongProsodySignal
      ? adviceText(
          uiLanguage,
          "句尾可以再稳一点，说完整会更清楚。",
          "The sentence ending could be steadier; finishing it a bit more clearly would help.",
        )
      : strongCompletenessSignal
        ? adviceText(
            uiLanguage,
            "这句可以再说完整一点，尤其是句尾。",
            "You could say this line a bit more completely, especially the ending.",
          )
        : adviceText(
            uiLanguage,
            "节奏整体比较平稳，继续保持这个停顿感就好。",
            "The rhythm feels fairly steady overall, so keeping this pause pattern would be fine.",
          );

  const tryText =
    lowConfidence || mediumConfidence
      ? adviceText(
          uiLanguage,
          "下次可以稍微放慢一点，把句尾说完整。",
          "Next time, try slowing down a little and finishing the sentence ending more clearly.",
        )
      : adviceText(
          uiLanguage,
          "再说一遍时，保持现在这个节奏就可以。",
          "When you try again, you can keep this same pace.",
        );

  const retryLine = transcript.trim()
    ? adviceText(
        uiLanguage,
        "如果要再说一遍，可以先稳住节奏，再把句尾收完整。",
        "If you try again, keep the pace steady first and then finish the sentence ending clearly.",
      )
    : undefined;

  return {
    summary: summaryText,
    clarity: clarityText,
    paceOrPause: paceText,
    oneThingToTry: tryText,
    ...(retryLine ? { retryLine } : {}),
  };
}

async function recognizeWithAzureAssessment(
  audio: File,
  transcript: string,
  uiLanguage: VoiceAdviceUiLanguage,
): Promise<VoiceAdviceResponse> {
  const sdk = loadAzureSpeechSdk();
  const speechKey = process.env.AZURE_SPEECH_KEY?.trim() ?? "";
  const speechRegion = process.env.AZURE_SPEECH_REGION?.trim() ?? "";

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechRecognitionLanguage = "ja-JP";
  speechConfig.outputFormat = sdk.OutputFormat.Detailed;

  const audioConfig = sdk.AudioConfig.fromWavFileInput(audio, audio.name || "voice-advice.wav");
  const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);

  const assessmentConfig = new sdk.PronunciationAssessmentConfig(
    transcript,
    sdk.PronunciationAssessmentGradingSystem.HundredMark,
    sdk.PronunciationAssessmentGranularity.Phoneme,
    true,
  );
  assessmentConfig.enableProsodyAssessment = true;
  assessmentConfig.nbestPhonemeCount = 1;
  assessmentConfig.applyTo(recognizer);

  try {
    const result = await new Promise<any>((resolve, reject) => {
      recognizer.recognizeOnceAsync(resolve, reject);
    });

    if (result.reason !== sdk.ResultReason.RecognizedSpeech) {
      throw new Error("azure_recognition_failed");
    }

    const assessment = sdk.PronunciationAssessmentResult.fromResult(result);
    const detail = assessment.detailResult as AzureAssessmentDetail | null | undefined;

    return mapAssessmentToAdvice(uiLanguage, transcript, detail);
  } finally {
    try {
      recognizer.close();
    } catch {
      // no-op
    }
  }
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

    if (audioEntry.size <= 0) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en"
          ? "The uploaded audio is empty."
          : "上传的音频是空的。",
      );
    }

    const mimeType = normalizeMimeType(audioEntry.type || "");
    if (!isSupportedAudioType(audioEntry.type || "")) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en"
          ? `The current Azure spike only accepts WAV/PCM audio. ${mimeType || "webm/opus"} needs transcoding or a recorder format change.`
          : `当前 Azure spike 只支持 WAV/PCM 音频。${mimeType || "webm/opus"} 需要后续转码或改录音格式。`,
      );
    }

    if (!transcript) {
      return errorResponse(
        400,
        "invalid_request",
        uiLanguage === "en"
          ? "Reference transcript is required for pronunciation assessment."
          : "发音评估需要提供 reference transcript。",
      );
    }

    void npcId;

    if (!isVoiceAdviceEnabled() || !isAzureProviderSelected() || !hasAzureConfig()) {
      return buildNotConfiguredResponse(uiLanguage);
    }

    try {
      const mappedAdvice = await recognizeWithAzureAssessment(audioEntry as File, transcript, uiLanguage);
      return Response.json(mappedAdvice satisfies VoiceAdviceResponse);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown";
      if (message === "azure_speech_sdk_unavailable") {
        return buildNotConfiguredResponse(uiLanguage);
      }

      console.error("[api/voice-advice] azure assessment failed", {
        message,
      });
      return errorResponse(
        500,
        "voice_advice_failed",
        uiLanguage === "en"
          ? "Voice advice assessment failed."
          : "语音建议评估失败。",
      );
    }
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
