export interface TranscribeInput {
  readonly audio: ArrayBuffer;
  readonly mimeType: string;
  /** Sample rate (Hz). Required for raw PCM (lpcm); ignored for containers (ogg/webm). */
  readonly sampleRate?: number;
}

/**
 * Speech-to-text boundary. Kept separate from LLM parsing (the AiGateway port is
 * intentionally given an already-produced transcript). Implementations:
 * StubSpeechToText (dev) and WhisperSpeechToText (same data-residency scope as
 * the compliant LLM provider).
 */
export interface SpeechToText {
  transcribe(input: TranscribeInput): Promise<{ transcript: string }>;
}

export class SpeechToTextError extends Error {
  constructor(
    message: string,
    override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "SpeechToTextError";
  }
}
