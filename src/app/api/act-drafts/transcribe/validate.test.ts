import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES, validateAudioUpload } from "./validate";

describe("validateAudioUpload", () => {
  it("allows a supported type within the limit", () => {
    expect(validateAudioUpload("audio/ogg;codecs=opus", 1000)).toBeNull();
    expect(validateAudioUpload("audio/webm", 1000)).toBeNull();
    expect(validateAudioUpload("audio/lpcm", 1000)).toBeNull();
  });

  it("rejects an unsupported type (415)", () => {
    expect(validateAudioUpload("application/json", 10)?.status).toBe(415);
    expect(validateAudioUpload("", 10)?.status).toBe(415);
  });

  it("rejects oversized uploads (413)", () => {
    expect(validateAudioUpload("audio/webm", MAX_AUDIO_BYTES + 1)?.status).toBe(413);
  });
});
