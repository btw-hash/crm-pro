import {
  type SpeechToText,
  SpeechToTextError,
  type TranscribeInput,
} from "@/application/ports/speech-to-text";
import type { Logger } from "@/infrastructure/logging/logger";

export interface WhisperConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly language: string; // e.g. "en"
}

/**
 * OpenAI Whisper speech-to-text adapter (`/v1/audio/transcriptions`, model
 * "whisper-1") via multipart form upload. Same data-residency scope as the OpenAI LLM
 * adapter -- suitable only for code/anonymized/synthetic data (see DATA_POLICY). The
 * key is server-only; only the response status is logged, never the audio or transcript.
 */
export class WhisperSpeechToText implements SpeechToText {
  constructor(
    private readonly config: WhisperConfig,
    private readonly logger: Logger,
  ) {}

  async transcribe({ audio, mimeType }: TranscribeInput): Promise<{ transcript: string }> {
    const form = new FormData();
    form.append("model", "whisper-1");
    form.append("language", this.config.language);
    form.append("file", new Blob([audio], { type: mimeType }), `audio.${extensionFor(mimeType)}`);

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.config.apiKey}` },
        body: form,
      });
    } catch (cause) {
      throw new SpeechToTextError("Network unavailable while calling Whisper", cause);
    }
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      this.logger.warn("stt.request_failed", { status: response.status });
      throw new SpeechToTextError(
        `Whisper returned an error ${response.status}: ${detail.slice(0, 200)}`,
      );
    }
    const data: unknown = await response.json();
    return { transcript: extractText(data) };
  }
}

/** Best-effort file extension from the MIME type -- Whisper infers the codec from content. */
function extensionFor(mimeType: string): string {
  const m = mimeType.toLowerCase();
  if (m.includes("webm")) return "webm";
  if (m.includes("ogg") || m.includes("opus")) return "ogg";
  if (m.includes("wav")) return "wav";
  if (m.includes("mp3") || m.includes("mpeg")) return "mp3";
  return "wav";
}

/** Whisper response: { text: "transcribed text" }. */
function extractText(data: unknown): string {
  if (
    typeof data === "object" &&
    data !== null &&
    typeof (data as { text?: unknown }).text === "string"
  ) {
    return (data as { text: string }).text.trim();
  }
  throw new SpeechToTextError("Unexpected Whisper response format");
}
