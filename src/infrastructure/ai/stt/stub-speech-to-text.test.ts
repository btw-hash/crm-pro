import { describe, expect, it } from "vitest";
import { StubSpeechToText } from "./stub-speech-to-text";

describe("StubSpeechToText", () => {
  it("returns a deterministic demo transcript", async () => {
    const { transcript } = await new StubSpeechToText().transcribe({
      audio: new ArrayBuffer(0),
      mimeType: "audio/ogg",
    });
    expect(transcript).toContain("Sweet World Confections");
    expect(transcript).toContain("Coverlux Cover");
  });
});
