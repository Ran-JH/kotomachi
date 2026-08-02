import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
import { synthesizeEdgeTts } from "@/lib/edge-tts";
import { isNpcId } from "@/lib/npc";
import {
  AudioRequestTimeoutError,
  isAbortError,
  runWithTimeout,
  TTS_PROVIDER_TIMEOUT_MS,
} from "@/lib/audio-request-timeout";
import {
  isVolcSpeechConfigured,
  synthesizeVolcTts,
} from "@/lib/volcengine";
import { normalizeTextForTts } from "@/lib/tts-text";

type RequestOutcome = "success" | "timeout" | "failure" | "aborted";

function getRequestOutcome(
  error: unknown,
  requestSignal: AbortSignal,
): Exclude<RequestOutcome, "success"> {
  if (
    error instanceof AudioRequestTimeoutError
    || (error instanceof Error && /timeout|timed out/i.test(error.message))
  ) {
    return "timeout";
  }
  if (requestSignal.aborted || isAbortError(error)) return "aborted";
  return "failure";
}

function logProviderOutcome({
  provider,
  outcome,
  startedAt,
  npcId,
  error,
}: {
  provider: "volc" | "edge";
  outcome: RequestOutcome;
  startedAt: number;
  npcId: string;
  error?: unknown;
}) {
  const metadata = {
    feature: "tts",
    provider,
    stage: "provider-attempt",
    outcome,
    timeoutMs: TTS_PROVIDER_TIMEOUT_MS,
    elapsedMs: Date.now() - startedAt,
    npcId,
    errorName: error instanceof Error ? error.name : undefined,
  };
  if (outcome === "success") {
    console.log("[api/tts] provider 完成", metadata);
  } else {
    console.warn("[api/tts] provider 未完成", metadata);
  }
}

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  try {
    const { text, npcId } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "合成文本不能为空" }, { status: 400 });
    }

    const safeNpcId = isNpcId(npcId) ? npcId : "misaki";
    const ttsText = normalizeTextForTts(text, { npcId: safeNpcId });
    if (!ttsText) {
      return NextResponse.json(
        { error: "没有可朗读的文本" },
        { status: 400 },
      );
    }

    const provider = (process.env.TTS_PROVIDER ?? "auto").toLowerCase();
    const volcConfigured = isVolcSpeechConfigured();
    let audio: Buffer | null = null;
    let source = "edge";

    const tryVolc =
      provider === "volcano" || (provider === "auto" && volcConfigured);

    if (tryVolc && volcConfigured) {
      const attemptStartedAt = Date.now();
      try {
        audio = await runWithTimeout(
          (signal) => synthesizeVolcTts(ttsText, safeNpcId, signal),
          TTS_PROVIDER_TIMEOUT_MS,
          req.signal,
        );
        source = "volcano";
        logProviderOutcome({
          provider: "volc",
          outcome: "success",
          startedAt: attemptStartedAt,
          npcId: safeNpcId,
        });
      } catch (volcError) {
        const outcome = getRequestOutcome(volcError, req.signal);
        logProviderOutcome({
          provider: "volc",
          outcome,
          startedAt: attemptStartedAt,
          npcId: safeNpcId,
          error: volcError,
        });

        // 页面主动取消时不再启动 fallback；provider timeout 则保留原有 auto fallback。
        if (outcome === "aborted" || provider === "volcano") {
          throw volcError;
        }
      }
    } else if (tryVolc && !volcConfigured) {
      console.warn("[api/tts] 火山 TTS 未配置", {
        feature: "tts",
        provider: "volc",
        stage: "configuration",
        outcome: "failure",
        npcId: safeNpcId,
      });
    }

    if (!audio) {
      const attemptStartedAt = Date.now();
      try {
        audio = await runWithTimeout(
          (signal) => synthesizeEdgeTts(ttsText, safeNpcId, {
            signal,
            connectionTimeoutMs: TTS_PROVIDER_TIMEOUT_MS,
          }),
          TTS_PROVIDER_TIMEOUT_MS,
          req.signal,
        );
        source = "edge";
        logProviderOutcome({
          provider: "edge",
          outcome: "success",
          startedAt: attemptStartedAt,
          npcId: safeNpcId,
        });
      } catch (edgeError) {
        logProviderOutcome({
          provider: "edge",
          outcome: getRequestOutcome(edgeError, req.signal),
          startedAt: attemptStartedAt,
          npcId: safeNpcId,
          error: edgeError,
        });
        throw edgeError;
      }
    }

    const responseBody = audio.buffer.slice(
      audio.byteOffset,
      audio.byteOffset + audio.byteLength,
    ) as ArrayBuffer;

    return new NextResponse(responseBody, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-TTS-Provider": source,
      },
    });
  } catch (error: unknown) {
    const outcome = getRequestOutcome(error, req.signal);
    const status = outcome === "timeout" ? 504 : outcome === "aborted" ? 499 : 500;

    console.error("[api/tts] route 未完成", {
      feature: "tts",
      provider: "route",
      stage: "route-response",
      outcome,
      elapsedMs: Date.now() - startedAt,
      httpStatus: status,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    if (outcome === "timeout") {
      return NextResponse.json(
        {
          error: "语音生成超时，请稍后重试",
          code: "timeout",
          retryable: true,
        },
        { status },
      );
    }
    if (outcome === "aborted") {
      return NextResponse.json(
        {
          error: "语音请求已取消",
          code: "aborted",
          retryable: true,
        },
        { status },
      );
    }

    const message = error instanceof Error ? error.message : "语音合成失败";
    return NextResponse.json({ error: message }, { status });
  }
}
