import { NextRequest, NextResponse } from "next/server";
import {
  isVolcSpeechConfigured,
  STT_ALLOWED_LANGUAGES,
  transcribeVolcFlash,
} from "@/lib/volcengine";

export const runtime = "nodejs";

const NO_SPEECH_MESSAGE = "声が聞こえませんでした。もう一度話すか、文字で入力してね。";

const MAX_AUDIO_BYTES = 10 * 1024 * 1024;
const AUDIO_TOO_LARGE_MESSAGE = "録音が少し長すぎるみたいです。短めに録り直してみてください。";

export async function POST(req: NextRequest) {
  try {
    if (!isVolcSpeechConfigured()) {
      return NextResponse.json(
        {
          error:
            "语音转文字需要火山引擎语音服务。请在 .env.local 配置 VOLCENGINE_SPEECH_APP_ID 与 VOLCENGINE_SPEECH_ACCESS_TOKEN",
        },
        { status: 503 }
      );
    }

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

    const mimeType = audio.type || "audio/webm";
    const buffer = Buffer.from(await audio.arrayBuffer());

    console.log("[api/stt] 收到语音", {
      mimeType,
      bytes: buffer.length,
      allowedLanguages: STT_ALLOWED_LANGUAGES,
      priority: process.env.VOLCENGINE_STT_LANGUAGES ?? "ja,en,zh (default)",
    });

    const text = await transcribeVolcFlash(buffer, mimeType);
    if (!text.trim()) {
      return NextResponse.json({
        text: "",
        code: "NO_SPEECH",
        message: NO_SPEECH_MESSAGE,
      });
    }

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "转写失败";
    console.error("[api/stt] 识别失败:", message);
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
