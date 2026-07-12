import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeechToTextError } from "@/application/ports/speech-to-text";
import { WhisperSpeechToText } from "./whisper-speech-to-text";

const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
const config = { apiKey: "k", baseUrl: "https://api.openai.com/v1", language: "en" };

function mockFetch(payload: { ok: boolean; status?: number; body: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: payload.ok,
    status: payload.status ?? 200,
    json: async () => payload.body,
    text: async () => JSON.stringify(payload.body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("WhisperSpeechToText", () => {
  it("sends the audio as multipart form data and returns the transcript", async () => {
    const fetchMock = mockFetch({ ok: true, body: { text: "recognized text" } });
    const stt = new WhisperSpeechToText(config, logger);

    const { transcript } = await stt.transcribe({
      audio: new ArrayBuffer(4),
      mimeType: "audio/ogg;codecs=opus",
    });

    expect(transcript).toBe("recognized text");
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [url, init] = call;
    expect(url).toBe("https://api.openai.com/v1/audio/transcriptions");
    expect(init.headers.authorization).toBe("Bearer k");
    const form = init.body as FormData;
    expect(form.get("model")).toBe("whisper-1");
    expect(form.get("language")).toBe("en");
    expect(form.get("file")).toBeInstanceOf(Blob);
  });

  it("non-2xx -> SpeechToTextError, only the status is logged", async () => {
    mockFetch({ ok: false, status: 401, body: { error: "x" } });
    const stt = new WhisperSpeechToText(config, logger);

    await expect(
      stt.transcribe({ audio: new ArrayBuffer(2), mimeType: "audio/ogg" }),
    ).rejects.toBeInstanceOf(SpeechToTextError);
    expect(logger.warn).toHaveBeenCalledWith("stt.request_failed", { status: 401 });
  });

  it("network failure -> SpeechToTextError", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);
    const stt = new WhisperSpeechToText(config, logger);

    await expect(
      stt.transcribe({ audio: new ArrayBuffer(2), mimeType: "audio/ogg" }),
    ).rejects.toBeInstanceOf(SpeechToTextError);
  });

  it("unexpected response shape -> SpeechToTextError", async () => {
    mockFetch({ ok: true, body: {} });
    const stt = new WhisperSpeechToText(config, logger);

    await expect(
      stt.transcribe({ audio: new ArrayBuffer(2), mimeType: "audio/ogg" }),
    ).rejects.toBeInstanceOf(SpeechToTextError);
  });
});
