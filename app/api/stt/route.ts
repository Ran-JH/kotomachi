import { NextRequest, NextResponse } from "next/server";
import {
  AudioRequestTimeoutError,
  isAbortError,
  runWithTimeout,
  STT_PROVIDER_TIMEOUT_MS,
} from "@/lib/audio-request-timeout";
import {
  isVolcSpeechConfigured,
  transcribeVolcFlash,
} from "@/lib/volcengine";
import {
  resolveSttAudioFormat,
  SttAudioFormatError,
  type ResolvedSttAudioFormat,
} from "@/lib/stt-audio-format";

export const runtime = "nodejs";

const NO_SPEECH_MESSAGE = "声が聞こえませんでした。もう一度話すか、文字で入力してね。";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TOO_LARGE_MESSAGE = "録音が少し長すぎるみたいです。短めに録り直してみてください。";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const formData = await req.formData();
    const audio = formData.get("audio");

    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: "未收到音频" }, { status: 400 });
    }

    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        {
          error: AUDIO_TOO_LARGE_MESSAGE,
          code: "AUDIO_TOO_LARGE",
          message: AUDIO_TOO_LARGE_MESSAGE,
        },
        { status: 413 },
      );
    }

    let audioFormat: ResolvedSttAudioFormat;
    try {
      audioFormat = resolveSttAudioFormat(
        audio as Blob & { name?: string },
      );
    } catch (error) {
      if (!(error instanceof SttAudioFormatError)) throw error;

      console.warn("[api/stt] 音频格式拒绝", {
        feature: "stt",
        provider: "route",
        stage: "format-validation",
        outcome: "failure",
        httpStatus: 415,
        errorCategory: error.code,
      });
      return NextResponse.json(
        { error: error.message, code: error.code, message: error.message },
        { status: 415 },
      );
    }

    if (!isVolcSpeechConfigured()) {
      return NextResponse.json(
        {
          error:
            "语音转文字需要火山引擎语音服务。请在 .env.local 配置 VOLCENGINE_SPEECH_APP_ID 与 VOLCENGINE_SPEECH_ACCESS_TOKEN",
        },
        { status: 503 },
      );
    }

    const buffer = Buffer.from(await audio.arrayBuffer());

    console.log("[api/stt] 音频校验通过", {
      feature: "stt",
      provider: "route",
      stage: "format-validation",
      outcome: "success",
    });

    // 30 秒覆盖整条火山 STT（包括既有语言尝试），而不是给每个语言各 30 秒。
    const text = await runWithTimeout(
      (signal) => transcribeVolcFlash(
        buffer,
        audioFormat.providerFormat,
        audioFormat.mimeType,
        signal,
      ),
      STT_PROVIDER_TIMEOUT_MS,
      req.signal,
    );
    if (!text.trim()) {
      return NextResponse.json({
        text: "",
        code: "NO_SPEECH",
        message: NO_SPEECH_MESSAGE,
      });
    }

    return NextResponse.json({ text });
  } catch (error: unknown) {
    if (error instanceof AudioRequestTimeoutError) {
      console.warn("[api/stt] provider timeout", {
        feature: "stt",
        provider: "volc",
        stage: "provider-attempt",
        outcome: "timeout",
        timeoutMs: STT_PROVIDER_TIMEOUT_MS,
        elapsedMs: Date.now() - startedAt,
        httpStatus: 504,
        errorName: error.name,
      });
      return NextResponse.json(
        {
          error: "语音识别超时，请稍后重试",
          code: "timeout",
          retryable: true,
        },
        { status: 504 },
      );
    }

    if (req.signal.aborted || isAbortError(error)) {
      console.warn("[api/stt] request aborted", {
        feature: "stt",
        provider: "volc",
        stage: "provider-attempt",
        outcome: "aborted",
        timeoutMs: STT_PROVIDER_TIMEOUT_MS,
        elapsedMs: Date.now() - startedAt,
        httpStatus: 499,
        errorName: error instanceof Error ? error.name : "AbortError",
      });
      return NextResponse.json(
        {
          error: "语音识别请求已取消",
          code: "aborted",
          retryable: true,
        },
        { status: 499 },
      );
    }

    const message = error instanceof Error ? error.message : "转写失败";
    console.error("[api/stt] 识别失败", {
      feature: "stt",
      provider: "volc",
      stage: "provider-attempt",
      outcome: "failure",
      timeoutMs: STT_PROVIDER_TIMEOUT_MS,
      elapsedMs: Date.now() - startedAt,
      httpStatus: 500,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    if (message.includes("未识别到语音") || message.includes("无有效文本")) {
      return NextResponse.json({
        text: "",
        code: "NO_SPEECH",
        message: NO_SPEECH_MESSAGE,
      });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
