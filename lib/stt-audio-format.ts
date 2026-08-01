export type SupportedSttProviderFormat =
  | { readonly format: "ogg"; readonly codec: "opus" }
  | { readonly format: "wav" }
  | { readonly format: "mp3" };

type AudioMimeDefinition = {
  extension: string;
  providerFormat: SupportedSttProviderFormat | null;
  supportedCodecs?: readonly string[];
};

const AUDIO_MIME_DEFINITIONS: Readonly<Record<string, AudioMimeDefinition>> = {
  "audio/ogg": {
    extension: "ogg",
    providerFormat: { format: "ogg", codec: "opus" },
    supportedCodecs: ["opus"],
  },
  "audio/wav": { extension: "wav", providerFormat: { format: "wav" } },
  "audio/x-wav": { extension: "wav", providerFormat: { format: "wav" } },
  "audio/mpeg": { extension: "mp3", providerFormat: { format: "mp3" } },
  "audio/mp3": { extension: "mp3", providerFormat: { format: "mp3" } },
  // 当前仓库无法证明 provider 接受 WebM 或 MP4 容器；只保留正确扩展名，不放行。
  "audio/webm": { extension: "webm", providerFormat: null },
  "audio/mp4": { extension: "mp4", providerFormat: null },
  "audio/m4a": { extension: "m4a", providerFormat: null },
  "audio/x-m4a": { extension: "m4a", providerFormat: null },
};

export type SttAudioFormatErrorCode =
  | "UNSUPPORTED_AUDIO_FORMAT"
  | "AUDIO_FORMAT_MISMATCH";

export class SttAudioFormatError extends Error {
  readonly name = "SttAudioFormatError";
  readonly code: SttAudioFormatErrorCode;
  readonly normalizedMimeType: string;

  constructor(
    code: SttAudioFormatErrorCode,
    message: string,
    normalizedMimeType: string,
  ) {
    super(message);
    this.code = code;
    this.normalizedMimeType = normalizedMimeType;
  }
}

export function normalizeAudioMimeType(value: string | null | undefined): string {
  return (value ?? "").split(";", 1)[0].trim().toLowerCase();
}

function normalizeAudioCodec(value: string | null | undefined): string {
  const match = (value ?? "").match(/(?:^|;)\s*codecs?\s*=\s*"?([^";,\s]+)"?/i);
  return match?.[1]?.trim().toLowerCase() ?? "";
}

function getFileExtension(fileName: string | null | undefined): string {
  const match = (fileName ?? "").trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function getAudioFileExtensionForMimeType(
  mimeType: string | null | undefined,
): string | null {
  const definition = AUDIO_MIME_DEFINITIONS[normalizeAudioMimeType(mimeType)];
  return definition?.extension ?? null;
}
export type ResolvedSttAudioFormat = {
  mimeType: string;
  extension: string;
  providerFormat: SupportedSttProviderFormat;
  resolutionSource: "mime" | "extension";
};


export function resolveSttAudioFormat(
  file: { type?: string | null; name?: string | null },
): ResolvedSttAudioFormat {
  const rawMimeType = file.type ?? "";
  const normalizedMimeType = normalizeAudioMimeType(rawMimeType);
  const fileExtension = getFileExtension(file.name);

  if (normalizedMimeType) {
    const definition = AUDIO_MIME_DEFINITIONS[normalizedMimeType];
    if (!definition) {
      throw new SttAudioFormatError(
        "UNSUPPORTED_AUDIO_FORMAT",
        "不支持这种录音格式，请重新录制或改用文字输入。",
        normalizedMimeType,
      );
    }

    if (fileExtension && fileExtension !== definition.extension) {
      throw new SttAudioFormatError(
        "AUDIO_FORMAT_MISMATCH",
        "录音文件的 MIME 与扩展名不一致，请重新录制。",
        normalizedMimeType,
      );
    }

    const codec = normalizeAudioCodec(rawMimeType);
    if (codec && definition.supportedCodecs && !definition.supportedCodecs.includes(codec)) {
      throw new SttAudioFormatError(
        "UNSUPPORTED_AUDIO_FORMAT",
        "不支持这种录音编码，请重新录制或改用文字输入。",
        normalizedMimeType,
      );
    }

    if (!definition.providerFormat) {
      throw new SttAudioFormatError(
        "UNSUPPORTED_AUDIO_FORMAT",
        "当前语音识别服务暂不支持这种录音格式，请改用文字输入。",
        normalizedMimeType,
      );
    }

    return {
      mimeType: normalizedMimeType,
      extension: definition.extension,
      providerFormat: definition.providerFormat,
      resolutionSource: "mime",
    };
  }

  const extensionEntry = Object.entries(AUDIO_MIME_DEFINITIONS).find(
    ([, definition]) => (
      definition.extension === fileExtension
      && definition.providerFormat
      && !definition.supportedCodecs
    ),
  );
  if (!extensionEntry) {
    throw new SttAudioFormatError(
      "UNSUPPORTED_AUDIO_FORMAT",
      "无法确认录音格式，请重新录制或改用文字输入。",
      "",
    );
  }

  const [fallbackMimeType, definition] = extensionEntry;
  return {
    mimeType: fallbackMimeType,
    extension: definition.extension,
    providerFormat: definition.providerFormat!,
    resolutionSource: "extension",
  };
}
