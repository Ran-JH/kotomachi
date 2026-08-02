import { Communicate } from "edge-tts-universal";
import type { NpcId } from "@/lib/npc";

type EdgeTtsRequestOptions = {
  signal?: AbortSignal;
  connectionTimeoutMs?: number;
};

function createAbortError(): Error {
  const error = new Error("Edge TTS request was aborted");
  error.name = "AbortError";
  return error;
}

export async function synthesizeEdgeTts(
  text: string,
  npcId: NpcId,
  options: EdgeTtsRequestOptions = {},
): Promise<Buffer> {
  let voiceName = "ja-JP-NanamiNeural";
  let rate = "+0%";

  if (npcId === "kimura") {
    voiceName = "ja-JP-KeitaNeural";
    rate = "+8%";
  } else if (npcId === "riku") {
    voiceName = "ja-JP-KeitaNeural";
    rate = "+4%";
  } else if (npcId === "ren") {
    voiceName = "ja-JP-KeitaNeural";
    rate = "+2%";
  } else if (npcId === "taisho") {
    voiceName = "ja-JP-NaokiNeural";
  }

  if (options.signal?.aborted) throw createAbortError();

  const communicate = new Communicate(text, {
    voice: voiceName,
    rate,
    // 依赖本身使用 WebSocket；这里同时限制连接阶段，整次 attempt 的预算由 route 控制。
    connectionTimeout: options.connectionTimeoutMs,
  });
  const iterator = communicate.stream();
  const buffers: Buffer[] = [];
  let rejectAbort: (reason?: unknown) => void = () => undefined;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAbort = reject;
  });
  const abortStream = () => {
    const error = createAbortError();
    // 关闭 async iterator，让库停止继续消费 WebSocket 数据。
    void iterator.return?.(undefined).catch(() => undefined);
    rejectAbort(error);
  };

  if (options.signal?.aborted) {
    abortStream();
  } else {
    options.signal?.addEventListener("abort", abortStream, { once: true });
  }

  try {
    while (true) {
      const next = await Promise.race([iterator.next(), aborted]);
      if (next.done) break;
      if (next.value.type === "audio" && next.value.data) {
        buffers.push(Buffer.from(next.value.data));
      }
    }
    return Buffer.concat(buffers);
  } finally {
    options.signal?.removeEventListener("abort", abortStream);
    if (options.signal?.aborted) {
      void iterator.return?.(undefined).catch(() => undefined);
    }
  }
}
