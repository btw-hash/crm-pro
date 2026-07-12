import type { SpeechToText, TranscribeInput } from "@/application/ports/speech-to-text";

// Deterministic transcript for dev data — STT without a real service or network.
const SAMPLE_TRANSCRIPT =
  "For Sweet World Confections we baked a batch of croissants on the Miwe rotary oven. Used " +
  "Carat Cover glaze, dosage 12 percent, baked at 180 degrees for 15 minutes. The glaze " +
  "didn't run, the technologist is satisfied.";

/** Speech-recognition stub: always returns a fixed demo transcript. */
export class StubSpeechToText implements SpeechToText {
  async transcribe(_input: TranscribeInput): Promise<{ transcript: string }> {
    return { transcript: SAMPLE_TRANSCRIPT };
  }
}
