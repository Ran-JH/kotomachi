/**
 * 音频请求的分层预算：浏览器预算略长于服务端，给服务端返回明确错误留出余量。
 * TTS 的两个 provider 仍按原顺序串行尝试，因此 route 最坏约为 20 秒。
 */
export const TTS_PROVIDER_TIMEOUT_MS = 10_000;
export const TTS_CLIENT_TIMEOUT_MS = 25_000;
export const STT_PROVIDER_TIMEOUT_MS = 30_000;
export const STT_CLIENT_TIMEOUT_MS = 35_000;

export class AudioRequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Audio request timed out after ${timeoutMs}ms`);
    this.name = "AudioRequestTimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object"
    && error !== null
    && "name" in error
    && error.name === "AbortError"
  );
}

function createAbortError(): Error {
  const error = new Error("Audio request was aborted");
  error.name = "AbortError";
  return error;
}

/**
 * 给任意异步音频操作提供一个真正会触发 AbortSignal 的时间预算。
 * 外部 signal（例如页面卸载）与内部 timeout 分开判定，调用方可给出不同日志/UI。
 */
export async function runWithTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  externalSignal?: AbortSignal | null,
): Promise<T> {
  const controller = new AbortController();
  const timeoutError = new AudioRequestTimeoutError(timeoutMs);
  let rejectCancellation: (reason?: unknown) => void = () => undefined;

  const cancellation = new Promise<never>((_resolve, reject) => {
    rejectCancellation = reject;
  });

  const abortFromCaller = () => {
    if (controller.signal.aborted) return;
    const reason = externalSignal?.reason instanceof Error
      ? externalSignal.reason
      : createAbortError();
    // 先固定分类，再广播 abort；避免底层 AbortError 抢先掩盖主动取消原因。
    rejectCancellation(reason);
    controller.abort(reason);
  };

  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  const timeoutId = setTimeout(() => {
    if (controller.signal.aborted) return;
    // 先 reject timeout，再 abort 底层 fetch / stream，确保错误不会被误判为主动取消。
    rejectCancellation(timeoutError);
    controller.abort(timeoutError);
  }, timeoutMs);

  try {
    return await Promise.race([operation(controller.signal), cancellation]);
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromCaller);
  }
}

