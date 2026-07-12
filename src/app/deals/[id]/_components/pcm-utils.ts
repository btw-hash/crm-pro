// Pure functions for preparing audio for server-side STT (lpcm format):
// the browser writes Float32 at the AudioContext sample rate (usually 48 kHz) → we
// downsample to 16 kHz and encode as 16-bit signed PCM little-endian. No dependencies; covered by tests.

/** Merges Float32 chunks into one contiguous array. */
export function mergeFloat32(chunks: readonly Float32Array[]): Float32Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Downsamples by averaging samples (a budget anti-aliasing approach). */
export function downsample(
  input: Float32Array,
  inputRate: number,
  targetRate: number,
): Float32Array {
  if (targetRate >= inputRate) {
    return input;
  }
  const ratio = inputRate / targetRate;
  const outLength = Math.floor(input.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(Math.floor((i + 1) * ratio), input.length);
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j += 1) {
      sum += input[j] ?? 0;
      count += 1;
    }
    out[i] = count > 0 ? sum / count : 0;
  }
  return out;
}

/** Float32 [-1, 1] → 16-bit signed PCM little-endian (clipped outside the range). */
export function floatToPcm16(input: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, input[i] ?? 0));
    view.setInt16(i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return buffer;
}
