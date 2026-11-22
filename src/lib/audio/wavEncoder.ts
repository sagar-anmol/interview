/**
 * Browser-side WAV encoding. Accepts Float32 PCM frames (mono) at any
 * sample rate and produces a compact 16kHz mono 16-bit WAV blob suitable
 * for Groq Whisper.
 */

export const TARGET_SAMPLE_RATE = 16_000;

export function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number = TARGET_SAMPLE_RATE,
): Float32Array {
  if (fromRate === toRate) return input;
  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const src = i * ratio;
    const i0 = Math.floor(src);
    const i1 = Math.min(input.length - 1, i0 + 1);
    const frac = src - i0;
    output[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return output;
}

function mergeFrames(frames: Float32Array[]): Float32Array {
  let total = 0;
  for (const f of frames) total += f.length;
  const merged = new Float32Array(total);
  let offset = 0;
  for (const f of frames) {
    merged.set(f, offset);
    offset += f.length;
  }
  return merged;
}

export function encodeWav(
  frames: Float32Array[],
  sampleRate: number = TARGET_SAMPLE_RATE,
): Blob {
  const merged = resampleLinear(mergeFrames(frames), sampleRate, TARGET_SAMPLE_RATE);
  const numSamples = merged.length;
  const bytesPerSample = 2;
  const dataSize = numSamples * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, TARGET_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_SAMPLE_RATE * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, merged[i]));
    view.setInt16(
      offset,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function floatFramesToWavBlob(
  frames: Float32Array[],
  sourceSampleRate: number,
): Blob {
  return encodeWav(frames, sourceSampleRate);
}
