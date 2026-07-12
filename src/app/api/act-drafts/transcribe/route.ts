import { getContainer } from "@/infrastructure/composition-root";
import { validateAudioUpload } from "./validate";

/**
 * POST /api/act-drafts/transcribe — accepts audio (multipart/form-data, `audio` field),
 * validates MIME type/size and returns { transcript }. STT is separate from the LLM: this
 * route does NOT call parseVoiceToActDraft. Errors are logged; the response body always
 * includes a message.
 */
export async function POST(request: Request): Promise<Response> {
  const container = getContainer();

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected multipart/form-data with an `audio` field." },
      { status: 400 },
    );
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return Response.json({ error: "The audio field is required (a file)." }, { status: 400 });
  }

  const invalid = validateAudioUpload(audio.type, audio.size);
  if (invalid) {
    return Response.json({ error: invalid.error }, { status: invalid.status });
  }

  // sampleRate is needed for raw PCM (lpcm); for container formats (ogg/webm) it's optional.
  const sampleRateRaw = form.get("sampleRate");
  let sampleRate: number | undefined;
  if (typeof sampleRateRaw === "string" && sampleRateRaw.trim() !== "") {
    sampleRate = Number(sampleRateRaw);
    if (!Number.isFinite(sampleRate)) {
      return Response.json({ error: "The sampleRate field must be a number." }, { status: 400 });
    }
  }

  try {
    const buffer = await audio.arrayBuffer();
    const { transcript } = await container.stt.transcribe({
      audio: buffer,
      mimeType: audio.type,
      sampleRate,
    });
    return Response.json({ transcript });
  } catch (cause) {
    container.logger.error("transcribe.failed", {
      message: cause instanceof Error ? cause.message : "unknown",
    });
    return Response.json({ error: "Could not transcribe the audio." }, { status: 502 });
  }
}
