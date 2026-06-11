import { createRequire } from "node:module";
import type {
  VoiceAdviceErrorResponse,
  VoiceAdviceResponse,
  VoiceAdviceUiLanguage,
} from "@/lib/voice-advice-types";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const ALLOWED_WAV_MIME_TYPES = new Set(["audio/wav", "audio/wave", "audio/x-wav"]);
const VALID_NPC_IDS = new Set(["kimura", "misaki", "taisho", "haruka", "aoi", "nana"]);

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

function isVoiceAdviceConfigured(): boolean {
  return isVoiceAdviceEnabled() && isAzureProviderSelected() && hasAzureConfig();
}

function loadAzureSpeechSdk(): any {
  if (cachedSpeechSdk) return cachedSpeechSdk;
  const sdk = require("microsoft-cognitiveservices-speech-sdk/distrib/lib/microsoft.cognitiveservices.speech.sdk.js");
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
    for (const syllable of word?.Syllables ?? []) {
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

function isVoiceAdviceDebugEnabled(): boolean {
  return process.env.VOICE_ADVICE_DEBUG === "true";
}

function normalizeTranscriptText(transcript: string): string {
  return transcript.trim().replace(/\s+/g, " ");
}

function trimTranscriptPhrase(phrase: string): string {
  return phrase.trim().replace(/^[、，,。！？!?]+|[、，,。！？!?]+$/g, "").trim();
}

function splitTranscriptSegments(transcript: string): string[] {
  const normalized = normalizeTranscriptText(transcript);
  if (!normalized) return [];

  return normalized
    .split(/[、，,。！？!?]+/)
    .map(trimTranscriptPhrase)
    .filter((segment) => segment.length > 0);
}

function summarizeTranscript(transcript: string): string {
  const normalized = normalizeTranscriptText(transcript);
  if (!normalized) return "「」";
  if (normalized.length <= 28) return `「${normalized}」`;
  return `「${normalized.slice(0, 28)}…」`;
}

type MentionableSegments = {
  weakWords: string[];
  openingPhrase?: string;
  endingPhrase?: string;
  pauseHintPhrase?: string;
  questionPhrase?: string;
  hasWords: boolean;
  wordCount: number;
};

function scoreAzureWord(word: AzureAssessmentWord): number | null {
  const accuracy = toNumber(word.PronunciationAssessment?.AccuracyScore);
  const syllableScores = (word.Syllables ?? [])
    .map((syllable) => toNumber(syllable.PronunciationAssessment?.AccuracyScore))
    .filter((value): value is number => value !== null);
  const syllableAverage = averageScore(syllableScores);
  const errorType = word.PronunciationAssessment?.ErrorType?.trim();

  if (errorType && errorType !== "None") return 0;
  if (accuracy === null && syllableAverage === null) return null;
  return Math.min(accuracy ?? 100, syllableAverage ?? accuracy ?? 100);
}

function pickMentionableSegments(
  transcript: string,
  detail: AzureAssessmentDetail | null | undefined,
): MentionableSegments {
  const words = detail?.NBest?.[0]?.Words ?? [];
  const segments = splitTranscriptSegments(transcript);
  const transcriptText = normalizeTranscriptText(transcript);

  const weakWords = words
    .map((word, index) => ({
      index,
      text: trimTranscriptPhrase(word.Word ?? ""),
      score: scoreAzureWord(word),
    }))
    .filter((item) => item.text && item.score !== null && item.score < 72)
    .sort((a, b) => a.score! - b.score! || a.index - b.index)
    .map((item) => item.text)
    .filter((text, index, list) => list.indexOf(text) === index)
    .slice(0, 2);

  if (weakWords.length === 0) {
    if (segments.length >= 2) {
      weakWords.push(segments[0], segments[1]);
    } else if (segments.length === 1) {
      weakWords.push(segments[0]);
    }
  }

  const openingPhrase = segments[0];
  const endingPhrase = segments.length > 1 ? segments[segments.length - 1] : undefined;
  const pauseHintPhrase = segments.find((segment) => segment.length >= 2) ?? openingPhrase;
  const questionPhrase = /[?？]/.test(transcriptText) ? (endingPhrase ?? openingPhrase) : undefined;

  return {
    weakWords,
    openingPhrase,
    endingPhrase,
    pauseHintPhrase,
    questionPhrase,
    hasWords: words.length > 0,
    wordCount: words.length,
  };
}

function logAzureAssessmentDebug(params: {
  result: any;
  detail: AzureAssessmentDetail | null | undefined;
  segments: MentionableSegments;
}): void {
  if (!isVoiceAdviceDebugEnabled()) return;

  const { result, detail, segments } = params;
  const pa = detail?.PronunciationAssessment ?? detail?.NBest?.[0]?.PronunciationAssessment;
  const words = detail?.NBest?.[0]?.Words ?? [];
  const recognizedText =
    typeof result?.text === "string" && result.text.trim()
      ? result.text.trim().slice(0, 120)
      : undefined;

  console.log("[api/voice-advice] azure debug", {
    aggregate: {
      accuracy: toNumber(pa?.AccuracyScore),
      fluency: toNumber(pa?.FluencyScore),
      completeness: toNumber(pa?.CompletenessScore),
      pron: toNumber(pa?.PronScore),
      prosody: toNumber(pa?.ProsodyScore),
    },
    recognition: {
      reason: result?.reason,
      recognizedText,
      duration: toNumber(result?.duration),
      offset: toNumber(result?.offset),
    },
    wordCount: words.length,
    words: words.slice(0, 20).map((word) => ({
      word: word?.Word,
      accuracy: toNumber(word?.PronunciationAssessment?.AccuracyScore),
      errorType: word?.PronunciationAssessment?.ErrorType,
      syllableCount: Array.isArray(word?.Syllables) ? word.Syllables.length : 0,
    })),
    picked: {
      weakWords: segments.weakWords,
      openingPhrase: segments.openingPhrase,
      endingPhrase: segments.endingPhrase,
      pauseHintPhrase: segments.pauseHintPhrase,
      questionPhrase: segments.questionPhrase,
    },
  });
}

function adviceText(uiLanguage: VoiceAdviceUiLanguage, zh: string, en: string): string {
  return uiLanguage === "en" ? en : zh;
}

function mapAssessmentToAdvice(
  uiLanguage: VoiceAdviceUiLanguage,
  transcript: string,
  detail: AzureAssessmentDetail | null | undefined,
): VoiceAdviceResponse {
  const summary = buildAzureAssessmentSummary(detail);
  const segments = pickMentionableSegments(transcript, detail);
  const transcriptRef = summarizeTranscript(transcript);
  const focusPhrase =
    segments.weakWords[0] ?? segments.questionPhrase ?? segments.endingPhrase ?? segments.openingPhrase;
  const secondFocus =
    segments.weakWords[1] ?? segments.endingPhrase ?? segments.questionPhrase ?? segments.openingPhrase;
  const pauseBefore = segments.pauseHintPhrase ?? segments.openingPhrase;
  const pauseAfter = segments.questionPhrase ?? segments.endingPhrase ?? secondFocus;
  const lowConfidence =
    summary.overall === null ||
    (summary.accuracy !== null && summary.accuracy < 70) ||
    (summary.completeness !== null && summary.completeness < 70);

  const summaryText = adviceText(
    uiLanguage,
    lowConfidence
      ? `这句${transcriptRef}整体能听出意思，但系统对「${focusPhrase ?? "这段"}」附近没听得很稳。`
      : `这句${transcriptRef}整体能听出意思，但${focusPhrase ? `「${focusPhrase}」附近` : "有几处"}还可以再说稳一点。`,
    lowConfidence
      ? `Your sentence ${transcriptRef} is understandable, but the system was not very stable around ${focusPhrase ? `「${focusPhrase}」` : "this part"}.`
      : `Your sentence ${transcriptRef} is understandable, but ${focusPhrase ? `「${focusPhrase}」附近` : "a few phrases"} could be clearer.`,
  );

  const clarityText = adviceText(
    uiLanguage,
    segments.weakWords.length >= 2
      ? `「${segments.weakWords[0]}」和「${segments.weakWords[1]}」附近可能说得有点快，听起来容易连在一起。`
      : segments.weakWords.length === 1
        ? lowConfidence
          ? `系统对「${segments.weakWords[0]}」附近没抓太稳，这个词可能被前后词带过去了。`
          : `「${segments.weakWords[0]}」附近可能有点轻，听起来容易被前后词带过去。`
        : segments.questionPhrase
          ? `「${segments.questionPhrase}」的最后可以再说清楚一点，让疑问语气更明显。`
          : segments.endingPhrase
            ? `「${segments.endingPhrase}」这段可以再收完整一点。`
            : `这句里有一两处衔接可以再放稳一点。`,
    segments.weakWords.length >= 2
      ? `「${segments.weakWords[0]}」 and 「${segments.weakWords[1]}」 may have been a bit fast, so they can blur together.`
      : segments.weakWords.length === 1
        ? lowConfidence
          ? `The system did not catch 「${segments.weakWords[0]}」 very cleanly, so it may have been carried by the surrounding words.`
          : `「${segments.weakWords[0]}」 may have sounded a little light and got carried by the surrounding words.`
        : segments.questionPhrase
          ? `The end of 「${segments.questionPhrase}」 could be a bit clearer so the question sounds more obvious.`
          : segments.endingPhrase
            ? `「${segments.endingPhrase}」 could be finished a little more cleanly.`
            : `There are one or two places where the linkage could be a bit steadier.`,
  );

  const paceText = adviceText(
    uiLanguage,
    pauseBefore && pauseAfter
      ? `可以在「${pauseBefore}」后面停半拍，再接「${pauseAfter}」。`
      : segments.endingPhrase
        ? `可以在「${segments.endingPhrase}」后面稍微停一下，再说后半句。`
        : `这句中间可以留一个更明确的停顿，再接后半句。`,
    pauseBefore && pauseAfter
      ? `You can leave a half-beat after 「${pauseBefore}」 before moving into 「${pauseAfter}」.`
      : segments.endingPhrase
        ? `You can pause briefly after 「${segments.endingPhrase}」 before moving on to the rest.`
        : `You can leave a clearer pause in the middle before continuing.`,
  );

  const oneThingToTry = adviceText(
    uiLanguage,
    segments.weakWords[0]
      ? `下次重点放慢「${segments.weakWords[0]}」附近，不要让它被前后词带过去。`
      : segments.questionPhrase
        ? `下次先把「${segments.questionPhrase}」的疑问尾音说清楚一点。`
        : segments.endingPhrase
          ? `下次先把「${segments.endingPhrase}」句尾说完整，再接后面的语气。`
          : `下次先把这句分成两拍，再慢一点说。`,
    segments.weakWords[0]
      ? `Next time, slow down around 「${segments.weakWords[0]}」 so it does not get carried by the surrounding words.`
      : segments.questionPhrase
        ? `Next time, make the question ending of 「${segments.questionPhrase}」 a bit clearer.`
        : segments.endingPhrase
          ? `Next time, finish the ending of 「${segments.endingPhrase}」 more clearly before moving on.`
          : `Next time, try splitting the line into two beats and saying it a little more slowly.`,
  );

  const retryLine = transcript.trim()
    ? adviceText(
        uiLanguage,
        segments.pauseHintPhrase && segments.endingPhrase
          ? `再录一遍时，可以把这句分成两拍：「${segments.pauseHintPhrase}」/「${segments.endingPhrase}」。`
          : focusPhrase
            ? `再试一次时，重点听听「${focusPhrase}」是不是被前后词带得太快。`
            : `再录一遍时，可以先稳住节奏，再把句尾收完整。`,
        segments.pauseHintPhrase && segments.endingPhrase
          ? `When you record again, try splitting it into two beats: 「${segments.pauseHintPhrase}」 / 「${segments.endingPhrase}」.`
          : focusPhrase
            ? `When you try again, listen for whether 「${focusPhrase}」 gets carried too quickly by the surrounding words.`
            : `When you record again, keep the pace steady first and then finish the ending cleanly.`,
      )
    : undefined;

  return {
    summary: summaryText,
    clarity: clarityText,
    paceOrPause: paceText,
    oneThingToTry,
    ...(retryLine ? { retryLine } : {}),
  };
}

async function recognizeWithAzureAssessment(
  audio: Buffer,
  transcript: string,
  uiLanguage: VoiceAdviceUiLanguage,
): Promise<VoiceAdviceResponse> {
  const sdk = loadAzureSpeechSdk();
  const speechKey = process.env.AZURE_SPEECH_KEY?.trim() ?? "";
  const speechRegion = process.env.AZURE_SPEECH_REGION?.trim() ?? "";

  const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
  speechConfig.speechRecognitionLanguage = "ja-JP";
  speechConfig.outputFormat = sdk.OutputFormat.Detailed;

  const audioConfig = sdk.AudioConfig.fromWavFileInput(audio, "voice-advice.wav");
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
    const segments = pickMentionableSegments(transcript, detail);
    logAzureAssessmentDebug({
      result,
      detail,
      segments,
    });

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
    if (!isVoiceAdviceConfigured()) {
      return buildNotConfiguredResponse("zh");
    }

    const formData = await req.formData();
    const audioEntry = formData.get("audio");
    const transcriptEntry = formData.get("transcript");
    const npcIdEntry = formData.get("npcId");
    const uiLanguageEntry = formData.get("uiLanguage");

    const uiLanguage = toUiLanguage(uiLanguageEntry);
    const transcript = typeof transcriptEntry === "string" ? transcriptEntry.trim() : "";
    const npcId = parseNpcId(npcIdEntry);

    if (!audioEntry) {
      return errorResponse(
        400,
        "missing_audio",
        uiLanguage === "en" ? "Audio is required." : "请上传语音音频。",
      );
    }

    if (!(audioEntry instanceof Blob)) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en" ? "The uploaded audio is not supported." : "上传的音频格式不受支持。",
      );
    }

    if (audioEntry.size <= 0) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en" ? "The uploaded audio is empty." : "上传的音频是空的。",
      );
    }

    const mimeType = normalizeMimeType(audioEntry.type || "");
    if (!isSupportedAudioType(audioEntry.type || "")) {
      return errorResponse(
        400,
        "invalid_audio",
        uiLanguage === "en"
          ? `The current Azure spike only accepts WAV/PCM audio. ${mimeType || "webm/opus"} needs transcoding or a recorder format change.`
          : `当前 Azure spike 只支持 WAV/PCM 音频。${mimeType || "webm/opus"} 需要后续转码或调整录音格式。`,
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

    try {
      const audioBuffer = Buffer.from(await audioEntry.arrayBuffer());
      const mappedAdvice = await recognizeWithAzureAssessment(audioBuffer, transcript, uiLanguage);
      return Response.json(mappedAdvice satisfies VoiceAdviceResponse);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "unknown";
      console.error("[api/voice-advice] azure assessment failed", { message });
      return errorResponse(
        500,
        "voice_advice_failed",
        uiLanguage === "en" ? "Voice advice assessment failed." : "语音建议评估失败。",
      );
    }
  } catch (error: unknown) {
    console.error("[api/voice-advice] failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return errorResponse(500, "voice_advice_failed", "Voice advice request failed.");
  }
}
