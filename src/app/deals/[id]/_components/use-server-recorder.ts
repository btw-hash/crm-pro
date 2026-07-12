"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { downsample, floatToPcm16, mergeFloat32 } from "./pcm-utils";

// Whisper (16-bit PCM input) supports 8000/16000/48000 Hz; 16 kHz is a size/quality compromise.
const TARGET_RATE = 16_000;

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function micErrorMessage(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : "Error";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return (
      "No microphone found. This PC may not have one (a desktop without a mic) — " +
      "try a laptop/phone instead, or type the report in manually."
    );
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return (
      "The microphone is unavailable to the system: it's in use by another app or blocked " +
      "in Windows. Close apps using the microphone and check Settings → Privacy → Microphone."
    );
  }
  return (
    `Microphone access denied (${name}). Allow it (icon in the address bar) and ` +
    "check Windows Settings → Privacy → Microphone."
  );
}

/**
 * Voice recording and transcription via the SERVER-SIDE Whisper (compliant data
 * residency): audio goes to our backend (`/api/act-drafts/transcribe`), not to
 * Google's servers (as the browser Web Speech API would) — this is required by our
 * data-residency policy for real PII (see ADR-0007). Capture goes through Web Audio
 * (raw PCM 16 kHz mono), then POSTed as `audio/lpcm`.
 */
export function useServerRecorder(onTranscript: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodeRef = useRef<ScriptProcessorNode | null>(null);
  const chunksRef = useRef<Float32Array[]>([]);
  const inputRateRef = useRef(TARGET_RATE);
  // Synchronous flag against double start(): recording is state and goes stale in
  // the closure, while getUserMedia is async (the race window = time to grant access).
  const startingRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const teardown = useCallback(() => {
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    void ctxRef.current?.close().catch(() => undefined);
    ctxRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    startingRef.current = false;
  }, []);

  // Release the mic/context if the component was unmounted while recording
  // (router navigation away from the deal page): otherwise the mic stays on. teardown
  // is idempotent and stable (useCallback []), so the effect never re-runs.
  useEffect(() => teardown, [teardown]);

  const start = useCallback(async () => {
    // Re-entry guard: already recording or starting up (waiting on getUserMedia).
    if (ctxRef.current || startingRef.current) return;
    startingRef.current = true;
    setError(null);
    const Ctor = getAudioContextCtor();
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setError("Recording is unavailable in this browser — type the report in manually.");
      startingRef.current = false;
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      setError(micErrorMessage(cause));
      startingRef.current = false;
      return;
    }
    streamRef.current = stream;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    inputRateRef.current = ctx.sampleRate;
    chunksRef.current = [];

    const source = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    node.onaudioprocess = (event) => {
      // Copy: getChannelData returns a reused buffer.
      chunksRef.current.push(new Float32Array(event.inputBuffer.getChannelData(0)));
    };
    // Mute the output (gain=0), otherwise ScriptProcessor sends the mic to the speakers (feedback).
    const mute = ctx.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(ctx.destination);
    nodeRef.current = node;
    setRecording(true);
  }, []);

  const stop = useCallback(async () => {
    setRecording(false);
    // No active context → recording never started (or was already stopped): nothing to transcribe.
    if (!ctxRef.current) return;

    const inputRate = inputRateRef.current;
    const chunks = chunksRef.current;
    chunksRef.current = [];
    teardown();

    const merged = mergeFloat32(chunks);
    if (merged.length === 0) {
      setError("Empty recording — please try again.");
      return;
    }
    const pcm = floatToPcm16(downsample(merged, inputRate, TARGET_RATE));

    setBusy(true);
    try {
      const form = new FormData();
      form.append("audio", new Blob([pcm], { type: "audio/lpcm" }), "speech.pcm");
      form.append("sampleRate", String(TARGET_RATE));
      const response = await fetch("/api/act-drafts/transcribe", { method: "POST", body: form });
      const data = (await response.json().catch(() => ({}))) as {
        transcript?: string;
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "Could not transcribe the audio.");
        return;
      }
      const text = (data.transcript ?? "").trim();
      if (text) {
        onTranscriptRef.current(text);
      } else {
        setError("Speech not recognized — speak closer to the microphone and try again.");
      }
    } catch {
      setError("Network error during transcription. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }, [teardown]);

  return { recording, busy, error, start, stop };
}
