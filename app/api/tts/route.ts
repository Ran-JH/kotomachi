import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
import { synthesizeEdgeTts } from "@/lib/edge-tts";
import { isNpcId } from "@/lib/npc";
import {
  isVolcSpeechConfigured,
  synthesizeVolcTts,
  VolcTtsError,
} from "@/lib/volcengine";
import { normalizeTextForTts } from "@/lib/tts-text";

function logVolcError(label: string, err: unknown) {
  if (err instanceof VolcTtsError) {
    console.error(`[api/tts] ${label} — VolcTtsError:`, {
      message: err.message,
      httpStatus: err.details.httpStatus,
      volcCode: err.details.code,
      volcMessage: err.details.volcMessage,
      reqid: err.details.reqid,
      voiceType: err.details.voiceType,
    });
    return;
  }
  if (err instanceof Error) {
    console.error(`[api/tts] ${label} — Error:`, {
      name: err.name,
      message: err.message,
    });
    return;
  }
  console.error(`[api/tts] ${label} — unknown:`, {
    message: String(err),
  });
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
        { status: 400 }
      );
    }

    const provider = (process.env.TTS_PROVIDER ?? "auto").toLowerCase();
    const volcConfigured = isVolcSpeechConfigured();

    console.log("[api/tts] 收到请求", {
      npcId: safeNpcId,
      provider,
      volcConfigured,
      textLength: text.length,
      normalizedTextLength: ttsText.length,
    });

    let audio: Buffer | null = null;
    let source = "edge";

    const tryVolc =
      provider === "volcano" || (provider === "auto" && volcConfigured);

    if (tryVolc && volcConfigured) {
      try {
        console.log("[api/tts] 尝试火山 TTS...");
        audio = await synthesizeVolcTts(ttsText, safeNpcId);
        source = "volcano";
        console.log("[api/tts] 火山 TTS 成功", {
          bytes: audio.length,
          elapsedMs: Date.now() - startedAt,
        });
      } catch (volcError) {
        logVolcError("火山 TTS 失败", volcError);

        if (provider === "volcano") {
          throw volcError;
        }
        console.warn(
          "[api/tts] TTS_PROVIDER=auto，火山失败后回退 Edge-TTS..."
        );
      }
    } else if (tryVolc && !volcConfigured) {
      console.warn(
        "[api/tts] 想走火山但未配置 VOLCENGINE_SPEECH_APP_ID + ACCESS_TOKEN"
      );
    }

    if (!audio) {
      try {
        console.log("[api/tts] 尝试 Edge-TTS...");
        audio = await synthesizeEdgeTts(ttsText, safeNpcId);
        source = "edge";
        console.log("[api/tts] Edge-TTS 成功", {
          bytes: audio.length,
          elapsedMs: Date.now() - startedAt,
        });
      } catch (edgeError) {
        logVolcError("Edge-TTS 也失败", edgeError);
        throw edgeError;
      }
    }

    const responseBody = audio.buffer.slice(
      audio.byteOffset,
      audio.byteOffset + audio.byteLength
    ) as ArrayBuffer;

    return new NextResponse(responseBody, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
        "X-TTS-Provider": source,
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "语音合成失败";

    console.error("[api/tts] 最终 500 错误", {
      message,
      elapsedMs: Date.now() - startedAt,
    });
    logVolcError("最终 catch", error);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
