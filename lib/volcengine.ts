import { randomUUID } from "crypto";
import type { NpcId } from "@/lib/npc";

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

function getNpcVoiceConfig(npcId: NpcId): {
  voiceType: string;
  speedRatio: number;
  pitchRatio: number;
} {
  const defaults: Record<
    NpcId,
    { voiceType: string; speedRatio: number; pitchRatio: number }
  > = {
    aoi: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_AOI ?? "BV421_streaming",
      speedRatio: 1.02,
      pitchRatio: 1.04,
    },
    haruka: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_HARUKA ?? "BV421_streaming",
      speedRatio: 0.9,
      pitchRatio: 0.92,
    },
    misaki: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_MISAKI ?? "BV421_streaming",
      speedRatio: 0.98,
      pitchRatio: 1.08,
    },
    kimura: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_KIMURA ?? "BV524_streaming",
      speedRatio: 1.12,
      pitchRatio: 1.0,
    },
    ren: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_KIMURA ?? "BV524_streaming",
      speedRatio: 1.0,
      pitchRatio: 1.0,
    },
    taisho: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_TAISHO ?? "BV524_streaming",
      speedRatio: 0.9,
      pitchRatio: 0.92,
    },
    nana: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_NANA ?? "BV421_streaming",
      speedRatio: 0.98,
      pitchRatio: 1.0,
    },
    mao: {
      voiceType: process.env.VOLCENGINE_TTS_VOICE_MAO ?? "BV421_streaming",
      speedRatio: 0.98,
      pitchRatio: 1.02,
    },
  };
  return defaults[npcId] ?? defaults.misaki;
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
  npcId: NpcId
): Promise<Buffer> {
  const { appId, token } = getSpeechCredentials();
  const { voiceType, speedRatio, pitchRatio } = getNpcVoiceConfig(npcId);
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
      volume_ratio: 1.0,
      pitch_ratio: pitchRatio,
      language: "ja",
    },
    request: {
      reqid,
      text,
      text_type: "plain",
      operation: "query",
    },
  };

  console.log("[Volc TTS] 发起请求", {
    url: TTS_URL,
    reqid,
    npcId,
    voiceType,
    cluster,
    appId,
    textLength: text.length,
    tokenPrefix: token.slice(0, 6) + "***",
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
    });
    rawText = await res.text();
  } catch (networkErr) {
    console.error("[Volc TTS] fetch 网络异常（无法连接火山）:", networkErr);
    if (networkErr instanceof Error) {
      console.error("[Volc TTS] 网络错误 message:", networkErr.message);
      console.error("[Volc TTS] 网络错误 stack:", networkErr.stack);
    }
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
    console.error("[Volc TTS] 响应不是合法 JSON", {
      httpStatus: res.status,
      httpStatusText: res.statusText,
      rawTextPreview: rawText.slice(0, 500),
      parseErr,
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

    console.error("[Volc TTS] 火山拒绝请求 — 详细信息:", {
      httpStatus: res.status,
      httpStatusText: res.statusText,
      volcCode: data.code,
      volcMessage: data.message,
      volcReqid: data.reqid ?? reqid,
      volcOperation: data.operation,
      voiceType,
      cluster,
      appId,
      hint:
        data.message?.includes("grant not found") ||
        data.message?.includes("authenticate") ||
        res.status === 401
          ? "鉴权失败：请到「豆包语音」控制台复制 AppID+AccessToken（不是火山方舟 Ark Key）"
          : data.code === 3001
            ? "参数无效：检查 appid/token/voice_type/cluster 是否与控制台一致"
            : data.message?.includes("access denied") ||
                data.message?.includes("resource")
              ? "未开通音色：控制台对 BV702/BV524 等音色下单（0元）"
              : "见上方 volcMessage",
    });
    console.error("[Volc TTS] 完整响应 body:", JSON.stringify(data, null, 2));

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
    reqid: data.reqid ?? reqid,
    audioBase64Length: data.data?.length ?? 0,
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

function getAsrAudioFormat(mimeType?: string): {
  format: string;
  codec?: string;
} {
  if (!mimeType) return { format: "ogg", codec: "opus" };
  if (mimeType.includes("ogg")) return { format: "ogg", codec: "opus" };
  if (mimeType.includes("wav")) return { format: "wav" };
  if (mimeType.includes("mpeg") || mimeType.includes("mp3"))
    return { format: "mp3" };
  if (mimeType.includes("mp4") || mimeType.includes("m4a"))
    return { format: "mp3" };
  // webm 浏览器录音：按 ogg_opus 提交（与前端优先 ogg 录制一致）
  if (mimeType.includes("webm")) return { format: "ogg", codec: "opus" };
  return { format: "ogg", codec: "opus" };
}

/**
 * STT 后处理：修复大小写混用问题
 * 日语对话中的英语单词统一为小写，但句首单词保留大写
 */
function postProcessSttText(text: string): string {
  // 先全部转小写
  const lower = text.replace(/[a-zA-Z]+/g, (match) => match.toLowerCase());
  // 句首单词首字母大写（匹配段落开头或句号/问号/叹号后的位置）
  return lower.replace(/(^|[。！？\.\!\?]\s*)([a-z])/g, (match, prefix, letter) => prefix + letter.toUpperCase());
}

async function transcribeVolcFlashOnce(
  audioBytes: Buffer,
  mimeType: string | undefined,
  langShort: (typeof STT_ALLOWED_LANGUAGES)[number]
): Promise<{ text: string; volcLanguage: string } | null> {
  const { appId } = getSpeechCredentials();
  const requestId = randomUUID();
  const base64 = audioBytes.toString("base64");
  const volcLanguage = STT_VOLC_LANGUAGE_MAP[langShort];
  const audioFormat = getAsrAudioFormat(mimeType);

  const body = {
    user: { uid: appId },
    audio: {
      data: base64,
      language: volcLanguage,
      format: audioFormat.format,
      ...(audioFormat.codec ? { codec: audioFormat.codec } : {}),
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
    langShort,
    volcLanguage,
    format: audioFormat,
    bytes: audioBytes.length,
    requestId,
  });

  const res = await fetch(ASR_FLASH_URL, {
    method: "POST",
    headers: getAsrHeaders(requestId),
    body: JSON.stringify(body),
  });

  const statusCode = res.headers.get("X-Api-Status-Code");
  const statusMessage = res.headers.get("X-Api-Message");
  const payload = (await res.json()) as {
    result?: { text?: string };
    message?: string;
  };

  if (statusCode !== "20000000") {
    console.warn("[Volc STT] 语种未命中", {
      langShort,
      volcLanguage,
      statusCode,
      statusMessage,
      payloadMessage: payload.message,
    });
    return null;
  }

  const text = payload.result?.text?.trim();
  if (!text) {
    console.warn("[Volc STT] 语种返回空文本", { langShort, volcLanguage });
    return null;
  }

  return { text, volcLanguage };
}

/**
 * 按 ja → en → zh 依次锁定语种识别，避免自动检测误判为西/葡语等
 */
export async function transcribeVolcFlash(
  audioBytes: Buffer,
  mimeType?: string
): Promise<string> {
  const priority = getSttLanguagePriority();
  const errors: string[] = [];

  console.log("[Volc STT] 开始多语种识别", {
    allowed: STT_ALLOWED_LANGUAGES,
    priority,
    mimeType,
  });

  for (const langShort of priority) {
    try {
      const result = await transcribeVolcFlashOnce(
        audioBytes,
        mimeType,
        langShort
      );
      if (result?.text) {
        console.log("[Volc STT] 识别成功", {
          langShort,
          volcLanguage: result.volcLanguage,
          textPreview: result.text.slice(0, 50),
        });
        return postProcessSttText(result.text);
      }
      errors.push(`${langShort}: 无有效文本`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${langShort}: ${msg}`);
      console.warn("[Volc STT] 单次识别异常", { langShort, msg });
    }
  }

  const hint = mimeType?.includes("webm")
    ? " 建议用 Chrome 录音，或改用文字输入。"
    : "";
  throw new Error(
    `未识别到语音（已尝试: ${priority.join(" → ")}）。${errors.join("; ")}${hint}`
  );
}
