export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // ~25 MB

// Only formats the synchronous STT provider supports: opus (ogg/webm) and raw
// PCM (lpcm — from browser recording via Web Audio). wav/mp3 are not supported
// (the whitelist must match the adapter, or we'd get a 502 instead of a 415).
export const ALLOWED_AUDIO_TYPES = new Set([
  "audio/ogg",
  "audio/webm",
  "audio/lpcm",
  "audio/l16",
  "audio/pcm",
]);

export interface AudioUploadError {
  readonly status: number;
  readonly error: string;
}

/** Validates uploaded audio by MIME type and size. null — everything is fine. */
export function validateAudioUpload(mimeType: string, size: number): AudioUploadError | null {
  const base = (mimeType.split(";")[0] ?? "").trim().toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(base)) {
    return { status: 415, error: `Unsupported audio type: ${mimeType || "not specified"}.` };
  }
  if (size > MAX_AUDIO_BYTES) {
    return { status: 413, error: `Audio exceeds the ${MAX_AUDIO_BYTES}-byte limit.` };
  }
  return null;
}
