import { randomUUID } from "crypto";
import { AudioRequestTimeoutError } from "@/lib/audio-request-timeout";
import type { NpcId } from "@/lib/npc";
import type { SupportedSttProviderFormat } from "@/lib/stt-audio-format";
import { getNpcVoiceProfile } from "@/lib/tts-voice-profiles";

const TTS_URL = "https://openspeech.bytedance.com/api/v1/tts";
const ASR_FLASH_URL =
  "https://openspeech.bytedance.com/api/v3/auc/bigmodel/recognize/flash";

export function isVolcSpeechConfigured(): boolean {
  const appId = process.env.VOLCENGINE_SPEECH_APP_ID;
  const token = process.env.VOLCENGINE_SPEECH_ACCESS_TOKEN;
  const apiKey = process.env.VOLCENGINE_SPEECH_API_KEY;
  return Boolean((appId && token) || apiKey);
}

function getSpeechCredentials(): { appId: string; token: string } {
  const appId = process.env.VOLCENGINE_SPEECH_APP_ID ?? "";
  const token =
    process.env.VOLCENGINE_SPEECH_ACCESS_TOKEN ??
    process.env.VOLCENGINE_SPEECH_API_KEY ??
    "";
  if (!token) {
    throw new Error(
      "请配置 VOLCENGINE_SPEECH_ACCESS_TOKEN（或 VOLCENGINE_SPEECH_API_KEY）"
    );
  }
  if (!appId && !process.env.VOLCENGINE_SPEECH_API_KEY) {
    throw new Error(
      "火山 TTS 需要 VOLCENGINE_SPEECH_APP_ID + VOLCENGINE_SPEECH_ACCESS_TOKEN"
    );
  }
  return { appId: appId || token.slice(0, 8), token };
}

function getAsrHeaders(requestId: string): Record<string, string> {
  const apiKey = process.env.VOLCENGINE_SPEECH_API_KEY;
  if (apiKey && !process.env.VOLCENGINE_SPEECH_APP_ID) {
    return {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey,
      "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
      "X-Api-Request-Id": requestId,
      "X-Api-Sequence": "-1",
    };
  }
  const { appId, token } = getSpeechCredentials();
  return {
    "Content-Type": "application/json",
    "X-Api-App-Key": appId,
    "X-Api-Access-Key": token,
    "X-Api-Resource-Id": "volc.bigasr.auc_turbo",
    "X-Api-Request-Id": requestId,
    "X-Api-Sequence": "-1",
  };
}

/** 火山 TTS 业务错误，携带 code / 原始响应供上层打印 */
export class VolcTtsError extends Error {
  constructor(
    message: string,
    public readonly details: {
      httpStatus: number;
      code?: number;
      volcMessage?: string;
      reqid: string;
      voiceType: string;
      rawBody?: unknown;
    }
  ) {
    super(message);
    this.name = "VolcTtsError";
  }
}

export async function synthesizeVolcTts(
  text: string,
  npcId: NpcId,
  signal?: AbortSignal,
): Promise<Buffer> {
  const startedAt = Date.now();
  const { appId, token } = getSpeechCredentials();
  const {
    voiceType,
    speedRatio,
    pitchRatio,
    volumeRatio,
    language = "ja",
  } = getNpcVoiceProfile(npcId);
  const reqid = randomUUID();
  const cluster = process.env.VOLCENGINE_SPEECH_CLUSTER ?? "volcano_tts";

  const body = {
    app: {
      appid: appId,
      token,
      cluster,
    },
    user: { uid: "kotomachi_user" },
    audio: {
      voice_type: voiceType,
      encoding: "mp3",
      speed_ratio: speedRatio,
      volume_ratio: volumeRatio,
      pitch_ratio: pitchRatio,
      language,
    },
    request: {
      reqid,
      text,
      text_type: "plain",
      operation: "query",
    },
  };

  console.log("[Volc TTS] 发起请求", {
    feature: "tts",
    provider: "volc",
    stage: "provider-fetch",
    npcId,
  });

  let res: Response;
  let rawText: string;

  try {
    res = await fetch(TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer;${token}`,
      },
      body: JSON.stringify(body),
      signal,
    });
    rawText = await res.text();
  } catch (networkErr) {
    const outcome = signal?.reason instanceof AudioRequestTimeoutError
      ? "timeout"
      : signal?.aborted
        ? "aborted"
        : "failure";
    console.error("[Volc TTS] 请求未完成", {
      feature: "tts",
      provider: "volc",
      stage: "provider-fetch",
      outcome,
      elapsedMs: Date.now() - startedAt,
      errorName: networkErr instanceof Error ? networkErr.name : "UnknownError",
    });
    throw networkErr;
  }

  let data: {
    code?: number;
    message?: string;
    data?: string;
    operation?: string;
    reqid?: string;
    sequence?: number;
  };

  try {
    data = JSON.parse(rawText) as typeof data;
  } catch (parseErr) {
    console.error("[Volc TTS] 响应解析失败", {
      feature: "tts",
      provider: "volc",
      stage: "parse-response",
      outcome: "failure",
      httpStatus: res.status,
      elapsedMs: Date.now() - startedAt,
      errorName: parseErr instanceof Error ? parseErr.name : "UnknownError",
    });
    throw new VolcTtsError(`火山 TTS 返回非 JSON (HTTP ${res.status})`, {
      httpStatus: res.status,
      reqid,
      voiceType,
      rawBody: rawText.slice(0, 500),
    });
  }

  const success = res.ok && data.code === 3000 && Boolean(data.data);

  if (!success) {
    const errMsg =
      data.message ??
      `火山 TTS 业务失败 code=${data.code ?? "未知"} HTTP=${res.status}`;

    console.error("[Volc TTS] provider 拒绝请求", {
      feature: "tts",
      provider: "volc",
      stage: "provider-response",
      outcome: "failure",
      httpStatus: res.status,
      elapsedMs: Date.now() - startedAt,
    });

    throw new VolcTtsError(errMsg, {
      httpStatus: res.status,
      code: data.code,
      volcMessage: data.message,
      reqid: data.reqid ?? reqid,
      voiceType,
      rawBody: data,
    });
  }

  console.log("[Volc TTS] 合成成功", {
    feature: "tts",
    provider: "volc",
    stage: "provider-response",
    outcome: "success",
    httpStatus: res.status,
    elapsedMs: Date.now() - startedAt,
  });

  return Buffer.from(data.data!, "base64");
}

/** 允许的 STT 语种（短码）及火山 API 对应值，按优先级：日 → 英 → 中 */
export const STT_ALLOWED_LANGUAGES = ["ja", "en", "zh"] as const;

const STT_VOLC_LANGUAGE_MAP: Record<
  (typeof STT_ALLOWED_LANGUAGES)[number],
  string
> = {
  ja: "ja-JP",
  en: "en-US",
  zh: "zh-CN",
};

function getSttLanguagePriority(): (typeof STT_ALLOWED_LANGUAGES)[number][] {
  const fromEnv = process.env.VOLCENGINE_STT_LANGUAGES?.trim();
  if (!fromEnv) return [...STT_ALLOWED_LANGUAGES];

  const parsed = fromEnv
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is (typeof STT_ALLOWED_LANGUAGES)[number] =>
      STT_ALLOWED_LANGUAGES.includes(s as (typeof STT_ALLOWED_LANGUAGES)[number])
    );

  return parsed.length > 0 ? parsed : [...STT_ALLOWED_LANGUAGES];
}


/**
 * STT 后处理边界：保留 provider 返回的文字内容和拉丁字符大小写。
 * 首尾空白已在解析 provider response 时清理；这里不猜测或修复专有名词大小写。
 */
function postProcessSttText(text: string): string {
  return text;
}

async function transcribeVolcFlashOnce(
  audioBytes: Buffer,
  audioFormat: SupportedSttProviderFormat,
  langShort: (typeof STT_ALLOWED_LANGUAGES)[number],
  signal?: AbortSignal,
): Promise<{ text: string; volcLanguage: string } | null> {
  const { appId } = getSpeechCredentials();
  const requestId = randomUUID();
  const base64 = audioBytes.toString("base64");
  const volcLanguage = STT_VOLC_LANGUAGE_MAP[langShort];

  const body = {
    user: { uid: appId },
    audio: {
      data: base64,
      language: volcLanguage,
      format: audioFormat.format,
      ...("codec" in audioFormat ? { codec: audioFormat.codec } : {}),
      rate: 16000,
      bits: 16,
      channel: 1,
    },
    request: {
      model_name: "bigmodel",
      enable_itn: true,
      enable_punc: true,
    },
  };

  console.log("[Volc STT] 单次识别", {
    feature: "stt",
    provider: "volc",
    stage: "provider-fetch",
  });

  const res = await fetch(ASR_FLASH_URL, {
    method: "POST",
    headers: getAsrHeaders(requestId),
    body: JSON.stringify(body),
    signal,
  });

  const statusCode = res.headers.get("X-Api-Status-Code");
  const payload = (await res.json()) as {
    result?: { text?: string };
    message?: string;
  };

  if (statusCode !== "20000000") {
    console.warn("[Volc STT] provider 未返回有效结果", {
      feature: "stt",
      provider: "volc",
      stage: "provider-response",
      outcome: "failure",
      httpStatus: res.status,
      errorCategory: "provider-status",
    });
    return null;
  }

  const text = payload.result?.text?.trim();
  if (!text) {
    console.warn("[Volc STT] provider 返回空结果", {
      feature: "stt",
      provider: "volc",
      stage: "provider-response",
      outcome: "failure",
      httpStatus: res.status,
      errorCategory: "empty-result",
    });
    return null;
  }

  return { text, volcLanguage };
}

/**
 * 按 ja → en → zh 依次锁定语种识别，避免自动检测误判为西/葡语等
 */
export async function transcribeVolcFlash(
  audioBytes: Buffer,
  audioFormat: SupportedSttProviderFormat,
  mimeType?: string,
  signal?: AbortSignal,
): Promise<string> {
  const priority = getSttLanguagePriority();
  const errors: string[] = [];


  for (const langShort of priority) {
    try {
      const result = await transcribeVolcFlashOnce(
        audioBytes,
        audioFormat,
        langShort,
        signal,
      );
      if (result?.text) {
        console.log("[Volc STT] 识别成功", {
          feature: "stt",
          provider: "volc",
          stage: "provider-response",
          outcome: "success",
        });
        return postProcessSttText(result.text);
      }
      errors.push(`${langShort}: 无有效文本`);
    } catch (err) {
      // timeout / 页面取消必须立即终止整条 STT，不可被当成“换一种语言再试”。
      if (signal?.aborted) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${langShort}: ${msg}`);
      console.warn("[Volc STT] 单次识别异常", {
        feature: "stt",
        provider: "volc",
        stage: "provider-response",
        outcome: "failure",
        errorName: err instanceof Error ? err.name : "UnknownError",
      });
    }
  }

  const hint = mimeType?.includes("webm")
    ? " 建议用 Chrome 录音，或改用文字输入。"
    : "";
  throw new Error(
    `未识别到语音（已尝试: ${priority.join(" → ")}）。${errors.join("; ")}${hint}`
  );
}
