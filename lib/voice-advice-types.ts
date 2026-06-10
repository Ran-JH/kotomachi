export type VoiceAdviceUiLanguage = "zh" | "en";

export type VoiceAdviceResponse = {
  summary: string;
  clarity: string;
  paceOrPause: string;
  oneThingToTry: string;
  retryLine?: string;
};

export type VoiceAdviceErrorCode =
  | "voice_advice_not_configured"
  | "missing_audio"
  | "invalid_audio"
  | "invalid_request"
  | "voice_advice_failed";

export type VoiceAdviceErrorResponse = {
  error: string;
  code: VoiceAdviceErrorCode;
};

